'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { limiteDeMembros } from '@/config/planos';
import { emModoDemonstracao, obterPapelNoPainel, obterRestauranteDoDono } from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { PAPEIS_DE_MEMBRO, podeGerirEquipa, type PapelDeMembro } from '@/lib/papeis';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import { SITE_URL } from '@/lib/supabase/config';
import { utilizadorActual } from '@/lib/supabase/servidor';

/**
 * Convidar, mudar de papel e tirar da equipa.
 *
 * Correm com a chave de serviço, por duas razões: convidar é falar com o
 * sistema de contas do Supabase, que só aceita a chave de serviço; e a
 * tabela da equipa não tem política de escrita de propósito — ninguém
 * escreve nela do browser.
 *
 * Por isso a permissão é verificada AQUI, antes de qualquer escrita: o
 * plano tem de ser Sala, e quem pede tem de ser dono ou gerente. A chave
 * de serviço passa por cima de tudo; o que a trava é esta função.
 */

export type Resultado = { ok: true; aviso: string } | { ok: false; erro: string };

const PAPEL = z.enum(PAPEIS_DE_MEMBRO as [PapelDeMembro, ...PapelDeMembro[]], {
  error: 'Escolha o papel desta pessoa.',
});

const CONVITE = z.object({
  email: z
    .string({ error: 'Escreva o email.' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Esse email não parece estar certo.' })),
  nome: z
    .string()
    .trim()
    .max(60, { error: 'O nome é demasiado comprido.' })
    .optional()
    .transform((v) => v || null),
  papel: PAPEL,
});

const ID = z.uuid({ error: 'Membro desconhecido.' });

/** Tudo o que as três acções verificam antes de tocar em alguma coisa. */
async function autorizar(): Promise<
  | { ok: true; restauranteId: string; plano: 'mesa' | 'sala'; quem: string }
  | { ok: false; erro: string }
> {
  if (emModoDemonstracao()) {
    return { ok: false, erro: 'Na demonstração não se convida ninguém — nada é gravado.' };
  }

  const [utilizador, restaurante, papel] = await Promise.all([
    utilizadorActual(),
    obterRestauranteDoDono(),
    obterPapelNoPainel(),
  ]);

  if (!utilizador) return { ok: false, erro: 'A sessão terminou. Volte a entrar.' };
  if (!restaurante) return { ok: false, erro: 'Não encontrámos a sua casa.' };

  if (!temFuncionalidade(restaurante, 'equipa')) {
    return { ok: false, erro: 'A equipa faz parte do Plano Sala.' };
  }
  if (!podeGerirEquipa(papel)) {
    return { ok: false, erro: 'Só o dono e o gerente mexem na equipa.' };
  }

  return { ok: true, restauranteId: restaurante.id, plano: restaurante.plano, quem: utilizador.id };
}

function primeiroErro(erro: z.ZodError) {
  return erro.issues[0]?.message ?? 'Os dados não estão certos.';
}

export async function convidarMembro(entrada: unknown): Promise<Resultado> {
  const dados = CONVITE.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };
  const { email, nome, papel } = dados.data;

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const servico = clienteAdministrador();
  if (!servico) {
    return { ok: false, erro: 'O servidor não tem a chave de serviço do Supabase configurada.' };
  }

  const [{ data: casa }, { count }, { data: jaNaEquipa }] = await Promise.all([
    servico.from('restaurants').select('owner_id').eq('id', acesso.restauranteId).single(),
    servico
      .from('membros')
      .select('id', { count: 'exact', head: true })
      .eq('restaurante_id', acesso.restauranteId),
    servico
      .from('membros')
      .select('id')
      .eq('restaurante_id', acesso.restauranteId)
      .eq('email', email)
      .maybeSingle(),
  ]);

  if (jaNaEquipa) return { ok: false, erro: 'Essa pessoa já está na equipa.' };

  const limite = limiteDeMembros(acesso.plano);
  if ((count ?? 0) >= limite) {
    return {
      ok: false,
      erro: `A equipa já tem os ${limite} lugares do plano ocupados. Tire alguém antes de convidar.`,
    };
  }

  /*
   * O convite cria a conta e manda o email. Se a pessoa já tiver conta,
   * o Supabase recusa — e aí liga-se a conta que ela já tem.
   */
  let userId: string | null = null;
  let jaTinhaConta = false;

  const { data: convite, error: erroConvite } = await servico.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/convite`,
    data: nome ? { nome } : undefined,
  });

  if (convite?.user) {
    userId = convite.user.id;
  } else {
    const comRpc = servico as unknown as {
      rpc: (n: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    const { data: existente } = await comRpc.rpc('utilizador_por_email', { e: email });
    if (typeof existente === 'string') {
      userId = existente;
      jaTinhaConta = true;
    } else {
      console.error('[equipa] convite recusado', erroConvite?.message);
      return {
        ok: false,
        erro: 'Não foi possível enviar o convite agora. Tente outra vez daqui a um minuto.',
      };
    }
  }

  if (userId === casa?.owner_id) {
    return { ok: false, erro: 'Esse é o email do dono da casa — o dono já tem acesso a tudo.' };
  }

  const { error: erroGravar } = await servico.from('membros').insert({
    restaurante_id: acesso.restauranteId,
    user_id: userId,
    email,
    nome,
    papel,
    convidado_por: acesso.quem,
    // Quem já tinha conta entra logo; não há convite a aceitar.
    aceite_em: jaTinhaConta ? new Date().toISOString() : null,
  });

  if (erroGravar) {
    // 23505: alguém convidou a mesma pessoa ao mesmo tempo.
    if (erroGravar.code === '23505') return { ok: false, erro: 'Essa pessoa já está na equipa.' };
    console.error('[equipa] gravar membro', erroGravar.message);
    return { ok: false, erro: 'Não foi possível guardar. Tente outra vez.' };
  }

  revalidatePath('/painel/equipa');
  return {
    ok: true,
    aviso: jaTinhaConta
      ? `${email} já tinha conta no CardApp: pode entrar já, com a palavra-passe que usa.`
      : `Convite enviado para ${email}. A pessoa escolhe a palavra-passe no link do email.`,
  };
}

export async function mudarPapel(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ id: ID, papel: PAPEL }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const servico = clienteAdministrador();
  if (!servico) return { ok: false, erro: 'O servidor não tem a chave de serviço configurada.' };

  const { error } = await servico
    .from('membros')
    .update({ papel: dados.data.papel })
    .eq('id', dados.data.id)
    // A casa entra no filtro: um id de outra casa não muda nada.
    .eq('restaurante_id', acesso.restauranteId);

  if (error) return { ok: false, erro: 'Não foi possível mudar o papel. Tente outra vez.' };

  revalidatePath('/painel/equipa');
  return { ok: true, aviso: 'Papel mudado. Vale a partir da próxima página que a pessoa abrir.' };
}

export async function tirarDaEquipa(entrada: unknown): Promise<Resultado> {
  const dados = z.object({ id: ID }).safeParse(entrada);
  if (!dados.success) return { ok: false, erro: primeiroErro(dados.error) };

  const acesso = await autorizar();
  if (!acesso.ok) return acesso;

  const servico = clienteAdministrador();
  if (!servico) return { ok: false, erro: 'O servidor não tem a chave de serviço configurada.' };

  // Só a ligação à casa sai. A conta da pessoa fica — pode trabalhar
  // noutra casa, ou ter a sua.
  const { error } = await servico
    .from('membros')
    .delete()
    .eq('id', dados.data.id)
    .eq('restaurante_id', acesso.restauranteId);

  if (error) return { ok: false, erro: 'Não foi possível tirar da equipa. Tente outra vez.' };

  revalidatePath('/painel/equipa');
  return { ok: true, aviso: 'Saiu da equipa. Perde o acesso na próxima página que abrir.' };
}
