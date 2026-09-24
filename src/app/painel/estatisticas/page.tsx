import Link from 'next/link';
import type { Metadata } from 'next';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { CartaoUpgrade } from '@/components/painel/cartao-upgrade';
import {
  AreaDoTempo,
  BarrasAoAlto,
  BarrasDeitadas,
  Cartao,
  CartaoNumero,
} from '@/components/painel/graficos-da-casa';
import { obterPedidosEntre, obterRestauranteDoDono } from '@/lib/dados';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { formatarKz } from '@/lib/format';
import { COR_GRAFICO } from '@/lib/cores';
import {
  CONTRA,
  NOME_PERIODO,
  PERIODOS,
  ePeriodo,
  estatisticas,
  janelaDoPeriodo,
  type Periodo,
} from '@/lib/estatisticas';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Estatísticas' };

export const dynamic = 'force-dynamic';

/**
 * A dashboard da casa: o dia, a semana, o mês e o ano.
 *
 * O período escolhe-se por ligação (`?periodo=semana`), e não por um
 * botão de JavaScript. Assim cada vista tem o seu endereço — o dono põe
 * "os últimos 30 dias" nos favoritos, ou manda-o ao contabilista — e a
 * página continua a ser desenhada no servidor, sem descarregar código
 * para o telemóvel do balcão.
 *
 * É do Plano Sala. Quem está no Mesa vê o cartão de upgrade no lugar dos
 * números, e a base de dados não é sequer consultada.
 */
export default async function PaginaEstatisticas({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const [restaurante, procura] = await Promise.all([obterRestauranteDoDono(), searchParams]);
  const periodo: Periodo = ePeriodo(procura.periodo) ? procura.periodo : 'dia';

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Estatísticas"
          descricao="Ainda não há restaurante ligado a esta conta."
        />
      </div>
    );
  }

  if (!temFuncionalidade(restaurante, 'estatisticas')) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Estatísticas"
          descricao="Os números da casa — quanto entrou, o que mais sai e a que horas enche."
        />
        <CartaoUpgrade funcionalidade="estatisticas" className="mt-8" />
      </div>
    );
  }

  const agora = new Date();
  const { anterior } = janelaDoPeriodo(periodo, agora);
  // Desde o início da janela de comparação: dá para as duas contas.
  const pedidos = await obterPedidosEntre(restaurante.id, anterior.inicio, new Date(agora.getTime() + 60_000));
  const n = estatisticas(periodo, pedidos, agora);
  const contra = CONTRA[periodo];

  return (
    <div>
      <CabecalhoPagina
        titulo="Estatísticas"
        descricao={`Tudo o que passou pelas mesas do ${restaurante.nome}, e como se compara com antes.`}
      />

      {/* --------------------------------------------------------- */}
      {/* O período                                                   */}
      {/* --------------------------------------------------------- */}
      <nav aria-label="Período" className="mt-7 flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={p === 'dia' ? '/painel/estatisticas' : `/painel/estatisticas?periodo=${p}`}
            aria-current={p === periodo ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center rounded-full px-4 font-sans text-sm font-semibold transition-colors duration-200',
              p === periodo
                ? 'bg-laranja text-creme'
                : 'border border-black/10 text-tenue hover:border-black/25 hover:text-creme',
            )}
          >
            {NOME_PERIODO[p]}
          </Link>
        ))}
      </nav>

      {/* --------------------------------------------------------- */}
      {/* Os quatro números                                           */}
      {/* --------------------------------------------------------- */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          rotulo="Entrou"
          valor={formatarKz(Math.round(n.receita))}
          variacao={n.variacao.receita}
          contra={contra}
          cor={COR_GRAFICO.receita}
        />
        <CartaoNumero
          rotulo="Pedidos"
          valor={String(n.pedidos)}
          variacao={n.variacao.pedidos}
          contra={contra}
          cor={COR_GRAFICO.pedidos}
        />
        <CartaoNumero
          rotulo="Pratos servidos"
          valor={String(n.itens)}
          variacao={n.variacao.itens}
          contra={contra}
          cor={COR_GRAFICO.movimento}
        />
        <CartaoNumero
          rotulo="Média por pedido"
          valor={formatarKz(n.medio)}
          variacao={n.variacao.medio}
          contra={contra}
          cor={COR_GRAFICO.receita}
        />
      </div>

      {/* --------------------------------------------------------- */}
      {/* Os gráficos                                                 */}
      {/* --------------------------------------------------------- */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Cartao
          acima={NOME_PERIODO[periodo]}
          titulo={periodo === 'dia' ? 'O dinheiro, hora a hora' : 'O dinheiro, ao longo do tempo'}
        >
          <AreaDoTempo dados={n.serie} id={`receita-${periodo}`} cor={COR_GRAFICO.receita} />
        </Cartao>

        <Cartao acima="Movimento" titulo="A que horas a casa enche">
          <BarrasAoAlto dados={n.porHora} cor={COR_GRAFICO.movimento} />
          {n.melhorMesa ? (
            <p className="mt-5 border-t border-linha pt-4 font-sans text-sm text-tenue">
              A mesa que mais pediu foi a{' '}
              <span className="font-semibold text-creme">{n.melhorMesa.mesa}</span>, com{' '}
              <span className="font-semibold text-creme">
                {formatarKz(Math.round(n.melhorMesa.total))}
              </span>
              .
            </p>
          ) : null}
        </Cartao>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Cartao acima="Cardápio" titulo="O que mais sai">
          <BarrasDeitadas dados={n.top} cor={COR_GRAFICO.pedidos} />
        </Cartao>

        <Cartao acima="Em duas linhas" titulo="O que estes números dizem">
          <Leitura n={n} />
        </Cartao>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Os números ditos por palavras.
 *
 * Um gráfico mostra; uma frase conclui. Quem abre isto entre dois
 * serviços não tem tempo de interpretar barras — tem tempo de ler uma
 * linha que diz o que mudou e o que fazer com isso.
 */
function Leitura({ n }: { n: ReturnType<typeof estatisticas> }) {
  if (!n.pedidos) {
    return (
      <p className="font-sans text-sm leading-relaxed text-tenue">
        Ainda não entrou nenhum pedido neste período. Assim que entrarem, é aqui que se vê quanto
        renderam, a que horas chegaram e que pratos saíram mais.
      </p>
    );
  }

  const melhorHora = n.porHora.find((h) => h.destaque);
  const campeao = n.top[0];
  const subiu = n.variacao.receita;

  return (
    <ul className="flex flex-col gap-3 font-sans text-sm leading-relaxed text-tenue">
      <li>
        Entraram <span className="font-semibold text-creme">{formatarKz(Math.round(n.receita))}</span>{' '}
        em <span className="font-semibold text-creme">{n.pedidos}</span>{' '}
        {n.pedidos === 1 ? 'pedido' : 'pedidos'}, a{' '}
        <span className="font-semibold text-creme">{formatarKz(n.medio)}</span> cada.
      </li>
      {subiu !== null ? (
        <li>
          A receita {subiu >= 0 ? 'subiu' : 'desceu'}{' '}
          <span className="font-semibold text-creme">{Math.abs(subiu)}%</span> {CONTRA[n.periodo]}.
        </li>
      ) : null}
      {melhorHora ? (
        <li>
          A hora de mais movimento foi a das{' '}
          <span className="font-semibold text-creme">{melhorHora.rotulo}</span> — é aí que a casa
          precisa de mais gente na sala.
        </li>
      ) : null}
      {campeao ? (
        <li>
          O prato que mais saiu foi o{' '}
          <span className="font-semibold text-creme">{campeao.nome}</span>, com{' '}
          <span className="font-semibold text-creme">{campeao.qtd}</span>{' '}
          {campeao.qtd === 1 ? 'unidade' : 'unidades'}.
        </li>
      ) : null}
    </ul>
  );
}
