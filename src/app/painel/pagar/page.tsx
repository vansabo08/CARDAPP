import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PagarEProvar } from '@/components/painel/pagar-e-provar';
import { obterRestauranteDoDono } from '@/lib/dados';
import { formatarKz } from '@/lib/format';
import { PLANOS, diasAteExpirar, estadoDaConta } from '@/lib/planos';

export const metadata: Metadata = { title: 'Pagar o plano' };
export const dynamic = 'force-dynamic';

/**
 * Pagar sem esperar que a porta feche.
 *
 * O mesmo ecrã que aparece atrás da porta fechada, mas alcançável a
 * qualquer momento. Quem quer pagar com uma semana de antecedência não
 * tem de esperar que lhe fechem o painel para poder fazê-lo — e os dias
 * que ainda tem não se perdem, somam-se.
 */
export default async function PaginaPagar() {
  const restaurante = await obterRestauranteDoDono();
  if (!restaurante) redirect('/comecar');

  const plano = PLANOS[restaurante.plano];
  const estado = estadoDaConta(restaurante.acesso_expira_em);
  const dias = diasAteExpirar(restaurante.acesso_expira_em);

  return (
    <div className="mx-auto max-w-[620px]">
      <h1 className="font-display text-3xl leading-tight text-creme md:text-4xl">
        Pagar o plano {plano.nome}
      </h1>

      <p className="mt-3 max-w-[52ch] text-pretty font-sans text-base leading-relaxed text-tenue">
        {estado === 'expirada' || estado === 'cortesia' ? (
          <>
            O prazo acabou. {formatarKz(plano.preco)} dão mais {plano.dias} dias ao{' '}
            {restaurante.nome}.
          </>
        ) : (
          <>
            Faltam {dias} {dias === 1 ? 'dia' : 'dias'}. {formatarKz(plano.preco)} acrescentam{' '}
            {plano.dias} dias aos que ainda tem — quem paga adiantado não perde nenhum.
          </>
        )}
      </p>

      <div className="vidro mt-7 rounded-folha p-6 md:p-8">
        <PagarEProvar restaurante={restaurante} />
      </div>
    </div>
  );
}
