import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { NOME_PLANO, type Restaurante } from '@/lib/tipos';
import { PRECO_PLANO, avisoDoTeste, diasDeTesteQueFaltam, estadoAssinatura } from '@/lib/planos';
import { formatarKz } from '@/lib/format';

/**
 * O estado da conta, no topo do painel.
 *
 * Quem pagou não vê nada: um aviso permanente sobre uma coisa resolvida
 * deixa de se ler ao fim de dois dias, e depois já não se lê quando
 * passa a ser importante.
 *
 * Quem está a experimentar vê a contagem, e ela muda de tom nos últimos
 * três dias. Quem já passou do prazo vê que passou — e vê também o que
 * continua a funcionar, porque a informação que falta numa barra destas
 * é sempre a mesma: "e agora, o que é que se perde?".
 */
export function AvisoDoPlano({ restaurante }: { restaurante: Restaurante }) {
  const estado = estadoAssinatura(restaurante);
  if (estado === 'activo') return null;

  const dias = diasDeTesteQueFaltam(restaurante);
  const expirado = estado === 'expirado';
  const apertado = dias <= 3;

  return (
    <div
      className={`border-b ${
        expirado
          ? 'border-ouro/30 bg-ouro/[0.07]'
          : apertado
            ? 'border-ouro/20 bg-ouro/[0.04]'
            : 'border-linha bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10">
        <div className="min-w-0">
          <p
            className={`font-sans text-sm font-semibold ${
              expirado || apertado ? 'text-ouro' : 'text-creme'
            }`}
          >
            {expirado ? 'O período de experiência terminou.' : avisoDoTeste(dias)}
          </p>
          <p className="mt-0.5 text-pretty font-sans text-xs leading-normal text-tenue">
            {expirado ? (
              <>
                O cardápio das suas mesas continua a funcionar e os pedidos continuam a entrar.
                Para manter o painel, o plano {NOME_PLANO[restaurante.plano]} custa{' '}
                {formatarKz(PRECO_PLANO[restaurante.plano])} por mês.
              </>
            ) : (
              <>
                Está tudo aberto até lá. Depois, o plano {NOME_PLANO[restaurante.plano]} custa{' '}
                {formatarKz(PRECO_PLANO[restaurante.plano])} por mês.
              </>
            )}
          </p>
        </div>

        <Botao asChild variante={expirado ? 'ouro' : 'contorno'} tamanho="sm">
          <Link href="/painel/definicoes#plano">
            {expirado ? 'Tratar do pagamento' : 'Ver planos'}
          </Link>
        </Botao>
      </div>
    </div>
  );
}
