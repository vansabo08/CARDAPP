'use server';

import { revalidatePath } from 'next/cache';
import { COMPROVATIVO, DIAS_PROVISORIOS } from '@/config/pagamento';
import { clienteAdministrador } from '@/lib/supabase/administrador';
import { utilizadorActual } from '@/lib/supabase/servidor';
import { PRECO_PLANO } from '@/lib/planos';
import type { Plano } from '@/lib/tipos';

/**
 * A casa transferiu, fotografou o comprovativo, e sobe-o aqui.
 *
 * Esta acção corre com a chave de serviço porque tem de escrever numa
 * tabela onde o browser não pode escrever. Isso obriga-a a fazer à mão
 * tudo o que a RLS faria por ela — a começar por confirmar que a casa é
 * mesmo de quem está a pedir. Sem essa confirmação, qualquer pessoa com
 * sessão iniciada abria o painel de qualquer outra.
 */

type Resultado = { ok: boolean; erro?: string };

const DIA = 86_400_000;

export async function enviarComprovativo(dados: FormData): Promise<Resultado> {
  const utilizador = await utilizadorActual();
  if (!utilizador) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const supabase = clienteAdministrador();
  if (!supabase) return { ok: false, erro: 'Configuração em falta. Fale connosco.' };

  const ficheiro = dados.get('comprovativo');
  if (!(ficheiro instanceof File) || !ficheiro.size) {
    return { ok: false, erro: 'Escolha o ficheiro do comprovativo.' };
  }

  if (!COMPROVATIVO.tipos.includes(ficheiro.type as (typeof COMPROVATIVO.tipos)[number])) {
    return { ok: false, erro: 'Aceita-se uma foto (JPG, PNG, WebP) ou um PDF.' };
  }

  if (ficheiro.size > COMPROVATIVO.tamanhoMaximo) {
    return { ok: false, erro: 'O ficheiro é maior do que 6 MB.' };
  }

  /* ---------------------------------------------------------------- */
  /* De quem é esta casa                                               */
  /* ---------------------------------------------------------------- */
  const { data: casaBruta } = await supabase
    .from('restaurants')
    .select('id, plano, acesso_expira_em, slug')
    .eq('owner_id', utilizador.id)
    .maybeSingle();

  const casa = casaBruta as
    | { id: string; plano: Plano; acesso_expira_em: string | null; slug: string }
    | null;

  if (!casa) return { ok: false, erro: 'Não encontrámos a sua casa.' };

  /*
   * Um comprovativo à espera de cada vez.
   *
   * Sem isto, subir o mesmo ficheiro cinco vezes dava quinze dias
   * provisórios — e o acesso provisório é justamente a parte que se dá
   * sem ninguém ter confirmado nada.
   */
  const { data: pendentes } = await supabase
    .from('comprovativos')
    .select('id')
    .eq('restaurant_id', casa.id)
    .eq('estado', 'a_espera')
    .limit(1);

  if ((pendentes ?? []).length) {
    return {
      ok: false,
      erro: 'Já temos um comprovativo seu à espera de confirmação. Damos notícias em breve.',
    };
  }

  /* ---------------------------------------------------------------- */
  /* A impressão digital do ficheiro                                   */
  /* ---------------------------------------------------------------- */
  /*
   * A fraude mais fácil não é forjar um comprovativo: é voltar a subir o
   * do mês passado, que é verdadeiro. O mesmo ficheiro dá sempre a mesma
   * impressão, e a base de dados recusa a segunda.
   */
  const bytes = new Uint8Array(await ficheiro.arrayBuffer());
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  const impressao = [...new Uint8Array(resumo)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: repetido } = await supabase
    .from('comprovativos')
    .select('id, restaurant_id')
    .eq('impressao', impressao)
    .maybeSingle();

  if (repetido) {
    return {
      ok: false,
      erro: 'Este comprovativo já foi usado antes. Envie o da transferência desta vez.',
    };
  }

  /* ---------------------------------------------------------------- */
  /* Guardar o ficheiro                                                */
  /* ---------------------------------------------------------------- */
  const extensao = ficheiro.type === 'application/pdf' ? 'pdf' : ficheiro.type.split('/')[1];
  const caminho = `${casa.id}/${Date.now()}-${impressao.slice(0, 12)}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(COMPROVATIVO.balde)
    .upload(caminho, bytes, { contentType: ficheiro.type, upsert: false });

  if (erroUpload) return { ok: false, erro: 'Não foi possível guardar o ficheiro. Tente outra vez.' };

  /* ---------------------------------------------------------------- */
  /* O registo, e só depois o acesso                                   */
  /* ---------------------------------------------------------------- */
  /*
   * Guarda-se a data que a conta tinha ANTES da cortesia. Sem ela,
   * aprovar somava os 30 dias por cima dos 3 provisórios e dava 33 por
   * um pagamento de 30 — um erro que ninguém notaria e que se repetia
   * todos os meses.
   */
  const { error: erroRegisto } = await supabase.from('comprovativos').insert({
    restaurant_id: casa.id,
    plano: casa.plano,
    valor: PRECO_PLANO[casa.plano],
    caminho,
    impressao,
    expirava_em: casa.acesso_expira_em,
  });

  if (erroRegisto) {
    // Sem registo não se abre nada: o ficheiro fica órfão no balde, que
    // é chato, e abrir a porta sem rasto do porquê seria pior.
    return { ok: false, erro: 'Não foi possível registar o comprovativo. Tente outra vez.' };
  }

  /*
   * A porta reabre já, provisória.
   *
   * A partir de hoje, e não da data antiga: se a conta expirou há duas
   * semanas, somar três dias a essa data deixava-a fechada à mesma, e a
   * casa tinha acabado de pagar.
   *
   * Mas nunca para trás. Quem paga adiantado, com cinco dias ainda por
   * gastar, não pode acabar com três — a cortesia é um chão, não um
   * tecto.
   */
  const tinha = casa.acesso_expira_em ? new Date(casa.acesso_expira_em).getTime() : 0;
  const cortesia = Date.now() + DIAS_PROVISORIOS * DIA;
  const provisoria = new Date(Math.max(tinha, cortesia)).toISOString();

  await supabase.from('restaurants').update({ acesso_expira_em: provisoria }).eq('id', casa.id);

  revalidatePath('/painel');
  revalidatePath(`/${casa.slug}`);

  return { ok: true };
}
