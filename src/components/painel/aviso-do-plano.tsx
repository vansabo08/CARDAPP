import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { formatarKz } from '@/lib/format';
import { PLANOS, avisoDoPrazo, diasAteExpirar, estadoDaConta } from '@/lib/planos';
import type { Restaurante } from '@/lib/tipos';

/**
 * O estado da conta, no topo do painel.
 *
 * Quem tem tempo não vê nada. Um aviso permanente sobre uma coisa que
 * ainda falta um mês deixa de se ler ao fim de dois dias — e depois já
 * não se lê quando passa a ser urgente.
 *
 * Aparece a partir dos sete dias e vai apertando o tom. Traz sempre o
 * preço e o botão de pagar: um aviso que diz "está a acabar" sem dizer
 * quanto custa nem por onde se paga obriga a ir procurar, e quem tem um
 * restaurante para gerir não vai procurar.
 */
export function AvisoDoPlano({
  restaurante,
  aEsperarConfirmacao = false,
}: {
  restaurante: Restaurante;
  aEsperarConfirmacao?: boolean;
}) {
  const estado = estadoDaConta(restaurante.acesso_expira_em);

  /*
   * Quem já subiu o comprovativo não leva "está a acabar".
   *
   * Durante os dias provisórios a conta está tecnicamente a expirar, e
   * sem isto o painel dizia a quem acabou de pagar que tinha de pagar —
   * a pior mensagem possível para quem já pagou, e a que gera o recado
   * a perguntar se o dinheiro chegou.
   */
  if (aEsperarConfirmacao) {
    return (
      <div className="border-b border-linha bg-transparent">
        <div className="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10">
          <div className="min-w-0">
            <p className="font-sans text-sm font-semibold text-creme">
              Comprovativo recebido. Estamos a confirmar no banco.
            </p>
            <p className="mt-0.5 text-pretty font-sans text-xs leading-normal text-tenue">
              O painel fica aberto enquanto isso. Assim que a transferência for confirmada, passa ao
              mês completo — não é preciso fazer mais nada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (estado === 'activa') return null;

  const dias = diasAteExpirar(restaurante.acesso_expira_em);
  const plano = PLANOS[restaurante.plano];
  const urgente = estado === 'cortesia' || estado === 'expirada' || dias <= 3;

  return (
    <div
      className={`border-b ${
        urgente ? 'border-ouro/30 bg-ouro/[0.07]' : 'border-linha bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-10">
        <div className="min-w-0">
          <p className={`font-sans text-sm font-semibold ${urgente ? 'text-ouro' : 'text-creme'}`}>
            {avisoDoPrazo(estado, dias)}
          </p>
          <p className="mt-0.5 text-pretty font-sans text-xs leading-normal text-tenue">
            {estado === 'cortesia' ? (
              <>
                O cardápio das suas mesas ainda está a servir, mas sai do ar dentro de dias. O plano{' '}
                {plano.nome} custa {formatarKz(plano.preco)} e dá mais {plano.dias} dias.
              </>
            ) : (
              <>
                O plano {plano.nome} custa {formatarKz(plano.preco)} e acrescenta {plano.dias} dias
                aos que ainda tem — quem paga adiantado não perde nenhum.
              </>
            )}
          </p>
        </div>

        <Botao asChild variante={urgente ? 'ouro' : 'contorno'} tamanho="sm">
          <Link href="/painel/pagar">Renovar por {formatarKz(plano.preco)}</Link>
        </Botao>
      </div>
    </div>
  );
}
