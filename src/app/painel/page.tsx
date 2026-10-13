import Link from 'next/link';
import type { Metadata } from 'next';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { obterPedidosDeHoje, obterRestauranteDoDono } from '@/lib/dados';
import { formatarKz, numeroMesa } from '@/lib/format';
import { resumoDoDia } from '@/lib/resumo';
import { NOME_PLANO, type Pedido, type Plano } from '@/lib/tipos';
import { temFuncionalidade } from '@/lib/funcionalidades';

export const metadata: Metadata = { title: 'Resumo' };

export const dynamic = 'force-dynamic';

export default async function PaginaResumo() {
  const restaurante = await obterRestauranteDoDono();

  if (!restaurante) {
    return (
      <div>
        <CabecalhoPagina
          titulo="Vamos começar."
          descricao="Ainda não há restaurante ligado a esta conta. São quatro passos e não demora."
        />
        <div className="mt-8">
          <Botao asChild variante="laranja" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  const podeVerEstatisticas = temFuncionalidade(restaurante, 'estatisticas');
  const pedidos = podeVerEstatisticas ? await obterPedidosDeHoje(restaurante.id) : [];

  return (
    <div>
      <CabecalhoPagina
        etiqueta="Resumo"
        titulo="Hoje"
        descricao={`O que já passou pelas mesas do ${restaurante.nome} desde a meia-noite.`}
        accao={
          <Botao asChild variante="contorno" tamanho="md">
            <a href={`/${restaurante.slug}`} target="_blank" rel="noreferrer">
              Ver o cardápio ↗
            </a>
          </Botao>
        }
      />

      {podeVerEstatisticas ? <Estatisticas pedidos={pedidos} /> : <Bloqueio plano={restaurante.plano} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Estatisticas({ pedidos }: { pedidos: Pedido[] }) {
  // As mesmas contas que vão no email da manhã, para os dois nunca
  // discordarem um do outro.
  const { total: totalValor, itens: totalItens, media, top } = resumoDoDia(pedidos);
  const maiorQtd = top[0]?.qtd ?? 1;

  if (!pedidos.length) {
    return (
      <div className="superficie mt-10 rounded-cartao px-7 py-14 text-center">
        <p className="font-display text-xl text-creme">Ainda não entrou nenhum pedido hoje.</p>
        <p className="mx-auto mt-3 max-w-[42ch] font-sans text-sm leading-normal text-tenue">
          Assim que alguém ler o QR de uma mesa e enviar o pedido, ele aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-11 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Pedidos" valor={String(pedidos.length)} />
        <Numero rotulo="Valor" valor={formatarKz(totalValor)} destaque />
        <Numero rotulo="Itens" valor={String(totalItens)} />
        <Numero rotulo="Média por pedido" valor={formatarKz(media)} />
      </div>

      <Seccao titulo="Os cinco mais pedidos" nota="Pela quantidade que saiu da cozinha">
        <ul className="flex flex-col gap-5">
          {top.map((prato, i) => (
            <li key={prato.nome} className="flex items-center gap-4">
              {/* O lugar na lista num disco, e não um algarismo solto:
                  solto lia-se como parte do nome do prato. */}
              <span className="numerais flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.045] font-sans text-[11px] font-semibold text-tenue">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate font-display text-[0.95rem] text-creme">
                    {prato.nome}
                  </span>
                  <span className="numerais shrink-0 font-sans text-xs text-tenue">
                    {prato.qtd}× · {formatarKz(prato.valor)}
                  </span>
                </div>
                <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    className="h-full rounded-full bg-laranja"
                    style={{ width: `${Math.max(6, (prato.qtd / maiorQtd) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Seccao>

      <Seccao titulo="Últimos pedidos" nota="Os dez mais recentes">
        <ul className="superficie divide-y divide-linha overflow-hidden rounded-cartao">
          {pedidos.slice(0, 10).map((pedido) => (
            <li key={pedido.id} className="flex items-start gap-4 px-5 py-4">
              <span className="numerais w-[66px] shrink-0 pt-px font-sans text-[13px] font-semibold text-creme/75">
                {pedido.mesa != null ? `Mesa ${numeroMesa(pedido.mesa)}` : 'Balcão'}
              </span>
              <p className="min-w-0 flex-1 font-sans text-sm leading-normal text-creme/85">
                {pedido.itens.map((i) => `${i.qtd}× ${i.nome}`).join(' · ')}
              </p>
              <span className="numerais shrink-0 font-sans text-sm font-bold text-creme">
                {formatarKz(pedido.total)}
              </span>
            </li>
          ))}
        </ul>
      </Seccao>
    </>
  );
}

/**
 * Um bloco do resumo.
 *
 * O título leva uma nota ao lado a dizer de que é a lista. Antes cada
 * secção era só um `h2` e o leitor tinha de descobrir pelo conteúdo se
 * estava a ver o dia, a semana ou tudo.
 */
function Seccao({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      {/* Em coluna no telemóvel: lado a lado, o título ficava espremido
          contra a nota e partia-se a meio da palavra. */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="font-display text-lg tracking-[-0.02em] text-creme">{titulo}</h2>
        {nota ? <span className="font-sans text-xs text-tenue">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Um número do dia.
 *
 * O NÚMERO É DE TINTA, E NÃO DE MARCA. Esteve em amarelo escuro, os
 * quatro iguais, e quatro números todos da mesma cor forte não têm
 * hierarquia nenhuma — o olho não sabe por onde começar, e o amarelo
 * escurecido até dar contraste sobre branco já nem parece a marca.
 * Assim o valor lê-se primeiro por ser grande, e a marca fica para o
 * ponto do cartão que interessa: o dinheiro do dia.
 */
function Numero({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`${destaque ? 'superficie-alta' : 'superficie'} rounded-cartao px-5 py-[1.15rem]`}
    >
      <p className="flex items-center gap-1.5 font-sans text-xs font-semibold text-tenue">
        {destaque ? (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-laranja" />
        ) : null}
        {rotulo}
      </p>
      {/* No telemóvel são dois cartões por linha, e dentro de cada um
          sobram cento e tal pixéis: a 1.7rem, "121.300 Kz" partia-se em
          duas linhas e o cartão crescia só nesse. Cresce com o ecrã. */}
      <p className="numerais mt-3 font-display text-[1.3rem] leading-none text-creme sm:text-[1.6rem] md:text-[2rem]">
        {valor}
      </p>
    </div>
  );
}

function Bloqueio({ plano }: { plano: Plano }) {
  return (
    <div className="superficie mt-10 overflow-hidden rounded-cartao">
      <div className="relative px-7 py-14 text-center">
        {/* Silhueta do que existe do outro lado, esbatida de propósito. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
          <div className="flex w-full max-w-[420px] flex-col gap-4 px-8">
            {[100, 74, 88, 52, 66].map((largura, i) => (
              <div key={i} className="h-[10px] rounded-full bg-creme" style={{ width: `${largura}%` }} />
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="etiqueta text-laranja">Plano Sala</p>
          <h2 className="mx-auto mt-4 max-w-[22ch] font-display text-2xl leading-none text-creme">
            As estatísticas fazem parte do plano Sala.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] font-sans text-sm leading-normal text-tenue">
            Pedidos do dia, pratos mais escolhidos e valor por mesa. Está no plano{' '}
            {NOME_PLANO[plano]} — o cardápio e as mesas continuam a funcionar na mesma.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Botao asChild variante="laranja" tamanho="md">
              <Link href="/painel/definicoes#plano">Ver planos</Link>
            </Botao>
            <Botao asChild variante="contorno" tamanho="md">
              <Link href="/painel/cardapio">Ir para o cardápio</Link>
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
