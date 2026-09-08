import Link from 'next/link';
import type { Metadata } from 'next';
import { Botao } from '@/components/ui/botao';
import { CabecalhoPagina } from '@/components/painel/navegacao';
import { obterPedidosDeHoje, obterRestauranteDoDono } from '@/lib/dados';
import { formatarKz, numeroMesa } from '@/lib/format';
import { resumoDoDia } from '@/lib/resumo';
import { LIMITES_PLANO, NOME_PLANO, type Pedido } from '@/lib/tipos';

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
          <Botao asChild variante="ouro" tamanho="lg">
            <Link href="/comecar">Configurar o restaurante</Link>
          </Botao>
        </div>
      </div>
    );
  }

  const podeVerEstatisticas = LIMITES_PLANO[restaurante.plano].estatisticas;
  const pedidos = podeVerEstatisticas ? await obterPedidosDeHoje(restaurante.id) : [];

  return (
    <div>
      <CabecalhoPagina
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
      <div className="vidro mt-10 rounded-cartao px-7 py-14 text-center">
        <p className="font-display text-[22px] text-creme">Ainda não entrou nenhum pedido hoje.</p>
        <p className="mx-auto mt-3 max-w-[42ch] font-sans text-[15px] leading-[1.6] text-tenue">
          Assim que alguém ler o QR de uma mesa e enviar o pedido, ele aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Pedidos" valor={String(pedidos.length)} />
        <Numero rotulo="Valor" valor={formatarKz(totalValor)} />
        <Numero rotulo="Itens" valor={String(totalItens)} />
        <Numero rotulo="Média por pedido" valor={formatarKz(media)} />
      </div>

      <section className="mt-12">
        <h2 className="font-display text-[22px] text-creme">Os cinco mais pedidos</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {top.map((prato, i) => (
            <li key={prato.nome} className="flex items-center gap-4">
              <span className="w-5 shrink-0 font-sans text-[13px] tabular-nums text-tenue">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate font-display text-[16px] text-creme">{prato.nome}</span>
                  <span className="shrink-0 font-sans text-[13px] text-tenue">
                    {prato.qtd}× · {formatarKz(prato.valor)}
                  </span>
                </div>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-ouro"
                    style={{ width: `${Math.max(6, (prato.qtd / maiorQtd) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[22px] text-creme">Últimos pedidos</h2>
        <ul className="mt-5 divide-y divide-linha border-y border-linha">
          {pedidos.slice(0, 10).map((pedido) => (
            <li key={pedido.id} className="flex items-start gap-4 py-4">
              <span className="etiqueta w-[68px] shrink-0 pt-1 text-tenue">
                {pedido.mesa != null ? `Mesa ${numeroMesa(pedido.mesa)}` : 'Balcão'}
              </span>
              <p className="min-w-0 flex-1 font-sans text-[14px] leading-[1.55] text-creme/85">
                {pedido.itens.map((i) => `${i.qtd}× ${i.nome}`).join(' · ')}
              </p>
              <span className="shrink-0 font-sans text-[14px] font-bold text-creme">
                {formatarKz(pedido.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="vidro-leve rounded-cartao px-5 py-6">
      <p className="etiqueta text-tenue">{rotulo}</p>
      <p className="mt-2.5 font-sans text-[24px] font-bold tracking-[-0.02em] text-creme">{valor}</p>
    </div>
  );
}

function Bloqueio({ plano }: { plano: 'balcao' | 'mesa' | 'sala' }) {
  return (
    <div className="vidro mt-10 overflow-hidden rounded-cartao">
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
          <p className="etiqueta text-ouro">Plano Sala</p>
          <h2 className="mx-auto mt-4 max-w-[22ch] font-display text-[26px] leading-[1.15] text-creme">
            As estatísticas fazem parte do plano Sala.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] font-sans text-[15px] leading-[1.6] text-tenue">
            Pedidos do dia, pratos mais escolhidos e valor por mesa. Está no plano{' '}
            {NOME_PLANO[plano]} — o cardápio e as mesas continuam a funcionar na mesma.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Botao asChild variante="ouro" tamanho="md">
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
