'use client';

import * as React from 'react';
import Link from 'next/link';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import {
  ESTADOS,
  EXPLICACAO_CLIENTE,
  ROTULO_CLIENTE,
  ROTULO_CURTO,
  eEstadoFinal,
  estadoValido,
  progresso,
} from '@/lib/pedidos';
import { cn } from '@/lib/utils';
import type { PedidoPublico } from '@/lib/tipos';

/** De quanto em quanto tempo se volta a perguntar. */
const INTERVALO = 6000;

/**
 * O ecrã onde o cliente segue o pedido.
 *
 * Pergunta de seis em seis segundos, e não por Realtime, por uma razão
 * de segurança: o Realtime do Supabase entrega as linhas que as
 * políticas deixam ler, e para o cliente as poder receber seria preciso
 * uma política de leitura pública sobre `orders` — que deixaria qualquer
 * pessoa listar os pedidos todos da casa. Uma pergunta de seis em seis
 * segundos a uma função que devolve uma linha só é mais lenta no papel e
 * indistinguível na mesa, porque um estado muda de dois em dois minutos,
 * não de dois em dois segundos.
 *
 * Pára quando o pedido chega ao fim e suspende quando o separador sai da
 * frente: quem está à mesa não tem de gastar bateria nem dados a
 * perguntar por uma coisa que não está a ver.
 */
export function Acompanhar({ inicial }: { inicial: PedidoPublico }) {
  const [pedido, setPedido] = React.useState(inicial);
  const acabou = eEstadoFinal(pedido.estado);

  React.useEffect(() => {
    if (acabou) return;

    const supabase = clienteNavegador();
    if (!supabase) return;

    let vivo = true;

    async function perguntar() {
      if (document.hidden) return;

      const { data } = await supabase!.rpc('pedido_publico', { pid: inicial.id });
      const linha = Array.isArray(data) ? data[0] : data;
      if (!vivo || !linha) return;

      const novo = linha as PedidoPublico;
      if (!estadoValido(novo.estado)) return;

      setPedido((antes) => (novo.estado === antes.estado ? antes : { ...antes, ...novo }));
    }

    const relogio = setInterval(perguntar, INTERVALO);
    // Volta a olhar assim que o separador regressa à frente.
    document.addEventListener('visibilitychange', perguntar);

    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', perguntar);
    };
  }, [inicial.id, acabou]);

  const cancelado = pedido.estado === 'cancelado';
  const avanco = progresso(pedido.estado);

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-10 md:py-14">
      <header className="text-center">
        <span className="etiqueta text-ouro-fundo">{pedido.restaurante}</span>
        <h1 className="mt-4 text-balance font-display text-[34px] leading-[1.1] text-creme md:text-[42px]">
          {ROTULO_CLIENTE[pedido.estado]}
        </h1>
        <p className="mt-3 text-pretty font-sans text-[15px] leading-[1.6] text-tenue">
          {EXPLICACAO_CLIENTE[pedido.estado]}
        </p>
        {pedido.mesa != null ? (
          <p className="mt-2 font-sans text-[14px] text-tenue">Mesa {pedido.mesa}</p>
        ) : null}
      </header>

      {/* ---------------------------------------------------------- */}
      {/* O percurso                                                   */}
      {/* ---------------------------------------------------------- */}
      {cancelado ? null : (
        <div className="mt-10" aria-hidden>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-ouro transition-[width] duration-700 ease-calmo"
              style={{ width: `${Math.round(avanco * 100)}%` }}
            />
          </div>

          <ol className="mt-4 flex justify-between">
            {ESTADOS.map((estado) => {
              const feito = progresso(estado) <= avanco;
              return (
                <li
                  key={estado}
                  className={cn(
                    'font-sans text-[11px] transition-colors duration-500 ease-calmo',
                    feito ? 'text-creme' : 'text-tenue/50',
                  )}
                >
                  {ROTULO_CURTO[estado]}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Para quem lê com leitor de ecrã, o percurso desenhado acima não
          diz nada. Esta linha diz. */}
      <p className="sr-only" aria-live="polite">
        {ROTULO_CLIENTE[pedido.estado]}. {EXPLICACAO_CLIENTE[pedido.estado]}
      </p>

      {/* ---------------------------------------------------------- */}
      {/* O que foi pedido                                             */}
      {/* ---------------------------------------------------------- */}
      <section className="vidro mt-10 rounded-cartao p-6">
        <h2 className="etiqueta text-tenue">O seu pedido</h2>

        <ul className="mt-5 flex flex-col gap-4">
          {pedido.itens.map((item, i) => (
            <li key={`${item.nome}-${i}`} className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block font-display text-[16px] leading-snug text-creme">
                  {item.qtd}x {item.nome}
                </span>
                {item.obs ? (
                  <span className="mt-0.5 block font-sans text-[13px] leading-snug text-tenue">
                    {item.obs}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-sans text-[14px] text-tenue">
                {formatarKz(item.preco * item.qtd)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-linha pt-5">
          <span className="font-sans text-[14px] text-tenue">Total</span>
          <span className="font-display text-[22px] text-ouro">{formatarKz(pedido.total)}</span>
        </div>
      </section>

      <p className="mt-8 text-center text-pretty font-sans text-[13px] leading-[1.6] text-tenue">
        {acabou
          ? 'Este pedido está fechado.'
          : 'Esta página actualiza-se sozinha. Pode deixá-la aberta.'}
      </p>

      <div className="mt-6 text-center">
        <Link
          href={`/${pedido.restaurante_slug}${pedido.mesa != null ? `?mesa=${pedido.mesa}` : ''}`}
          className="font-sans text-[14px] text-creme underline underline-offset-4"
        >
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
