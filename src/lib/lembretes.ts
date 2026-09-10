import 'server-only';
import { clienteAdministrador } from './supabase/administrador';
import { enderecoDePagarAbsoluto } from '@/config/pagamento';
import { formatarKz } from './format';
import {
  ASSUNTO_LEMBRETE,
  PLANOS,
  lembreteDevido,
  linkDePagamento,
  type Plano,
  type TipoLembrete,
} from './planos';

/**
 * Os avisos de renovação.
 *
 * A Kursinha só vende pagamento único: não há débito automático nem
 * aviso de renovação do lado dela. Se o Cardapp não lembrar, ninguém
 * lembra, e a casa descobre que o prazo acabou quando um cliente lhe
 * disser que o QR não abre. É o pior sítio possível para descobrir.
 */

export type CasaParaAvisar = {
  id: string;
  nome: string;
  slug: string;
  plano: Plano;
  whatsapp: string;
  email: string | null;
  acessoExpiraEm: string;
  tipo: TipoLembrete;
};

/* ------------------------------------------------------------------ */
/* Quem precisa de ser avisado hoje                                    */
/* ------------------------------------------------------------------ */

export async function casasParaAvisar(agora = new Date()): Promise<CasaParaAvisar[]> {
  const supabase = clienteAdministrador();
  if (!supabase) return [];

  const { data } = await supabase.rpc('contas_com_email');
  const linhas = (data ?? []) as {
    id: string;
    nome: string;
    slug: string;
    plano: Plano;
    whatsapp: string;
    email: string | null;
    acesso_expira_em: string | null;
  }[];

  const devidas: CasaParaAvisar[] = [];

  for (const linha of linhas) {
    const tipo = lembreteDevido(linha.acesso_expira_em, agora);
    if (!tipo || !linha.acesso_expira_em) continue;

    devidas.push({
      id: linha.id,
      nome: linha.nome,
      slug: linha.slug,
      plano: linha.plano,
      whatsapp: linha.whatsapp,
      email: linha.email,
      acessoExpiraEm: linha.acesso_expira_em,
      tipo,
    });
  }

  return devidas;
}

/* ------------------------------------------------------------------ */
/* O que se diz                                                        */
/* ------------------------------------------------------------------ */

export function textoDoLembrete(casa: CasaParaAvisar) {
  const plano = PLANOS[casa.plano];
  /*
   * O lembrete leva a pessoa ao painel, e não a uma plataforma de fora.
   * É lá que estão as credenciais, e é lá que ela sobe o comprovativo —
   * mandá-la para outro sítio era pedir-lhe que fizesse dois caminhos.
   */
  const link = enderecoDePagarAbsoluto();
  const preco = formatarKz(plano.preco);

  const abertura: Record<TipoLembrete, string> = {
    faltam_7: `Faltam sete dias para o Cardapp do ${casa.nome} chegar ao fim.`,
    faltam_3: `Faltam três dias para o Cardapp do ${casa.nome} chegar ao fim.`,
    falta_1: `Amanhã acaba o Cardapp do ${casa.nome}.`,
    expira_hoje: `Hoje acaba o Cardapp do ${casa.nome}.`,
    fim_cortesia: `O cardápio do ${casa.nome} saiu do ar.`,
  };

  const meio =
    casa.tipo === 'fim_cortesia'
      ? 'Quem ler o QR nas mesas já não vê o menu. Assim que renovar, volta no momento.'
      : `Enquanto não renovar, o cardápio das mesas continua a servir. Depois disso sai do ar, e o QR das mesas deixa de abrir.`;

  const fecho = `O plano ${plano.nome} custa ${preco} e acrescenta ${plano.dias} dias aos que ainda tiver — quem paga adiantado não perde nenhum.`;

  return {
    assunto: ASSUNTO_LEMBRETE[casa.tipo],
    corpo: `${abertura[casa.tipo]}\n\n${meio}\n\n${fecho}\n\nRenovar: ${link}`,
    link,
    preco,
  };
}

/**
 * O mesmo recado, pronto a mandar por WhatsApp.
 *
 * Enquanto a Resend não estiver ligada, é assim que a casa é avisada: o
 * cron regista quem precisa e deixa o endereço feito, para se carregar e
 * mandar. Feio, mas funciona hoje — e um aviso feito à mão vale mais do
 * que um aviso automático que não existe.
 */
export function linkDeWhatsApp(casa: CasaParaAvisar) {
  const { corpo } = textoDoLembrete(casa);
  const numero = casa.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(corpo)}`;
}

/* ------------------------------------------------------------------ */
/* Enviar                                                              */
/* ------------------------------------------------------------------ */

export type ResultadoDoEnvio = { canal: 'email' | 'registado'; erro?: string };

/**
 * Manda por email se houver Resend; senão fica só registado.
 *
 * "Registado" não é falhar: a marca fica na tabela e o painel de
 * administração passa a mostrar quem precisa de ser avisado, com o link
 * de WhatsApp feito. O que não pode acontecer é o cron dar o aviso por
 * enviado quando não saiu de lado nenhum.
 */
export async function enviarLembrete(casa: CasaParaAvisar): Promise<ResultadoDoEnvio> {
  const chave = process.env.RESEND_API_KEY?.trim();
  const remetente = process.env.RESEND_REMETENTE?.trim();

  if (!chave || !remetente || !casa.email) {
    return { canal: 'registado' };
  }

  const { assunto, corpo } = textoDoLembrete(casa);

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: casa.email,
        subject: assunto,
        text: corpo,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      return { canal: 'registado', erro: `Resend ${resposta.status}: ${detalhe.slice(0, 200)}` };
    }

    return { canal: 'email' };
  } catch (e) {
    return { canal: 'registado', erro: e instanceof Error ? e.message : 'Falha ao enviar.' };
  }
}

/* ------------------------------------------------------------------ */
/* Marcar como avisado                                                 */
/* ------------------------------------------------------------------ */

/**
 * Reclama o aviso antes de o mandar.
 *
 * Devolve `false` se já tinha sido dado neste ciclo — e é isso que
 * impede o cron de repetir o mesmo aviso todas as manhãs enquanto a
 * casa não paga. Um aviso repetido deixa de se ler, e a seguir deixa de
 * se ler o que importa.
 *
 * A chave inclui a data de expiração em vigor: quando a casa paga e a
 * data anda para a frente, começa um ciclo novo e os avisos voltam a
 * poder sair no momento certo.
 */
export async function reclamarLembrete(casa: CasaParaAvisar): Promise<boolean> {
  const supabase = clienteAdministrador();
  if (!supabase) return false;

  const { error } = await supabase.from('lembretes_enviados').insert({
    restaurante_id: casa.id,
    tipo: casa.tipo,
    ciclo_expira_em: casa.acessoExpiraEm,
  });

  // 23505 = unique_violation: já foi dado neste ciclo.
  return !error;
}

/** Anota por onde saiu, depois de sair. */
export async function anotarCanal(casa: CasaParaAvisar, resultado: ResultadoDoEnvio) {
  const supabase = clienteAdministrador();
  if (!supabase) return;

  await supabase
    .from('lembretes_enviados')
    .update({ canal: resultado.erro ? `${resultado.canal} (${resultado.erro})` : resultado.canal })
    .eq('restaurante_id', casa.id)
    .eq('tipo', casa.tipo)
    .eq('ciclo_expira_em', casa.acessoExpiraEm);
}
