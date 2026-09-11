'use client';

import * as React from 'react';
import { Bell, BellOff, Volume2 } from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { clienteNavegador } from '@/lib/supabase/cliente';
import { formatarKz } from '@/lib/format';
import {
  ROTULO_PAINEL,
  avancosPossiveis,
  eEstadoFinal,
  hAQuantoTempo,
} from '@/lib/pedidos';
import {
  desbloquearSom,
  lembrarSom,
  ligarSomAoPrimeiroGesto,
  pedirAvisos,
  somSuportado,
  tocarSino,
} from '@/lib/som';
import { cn } from '@/lib/utils';
import { confirmarPedido, mudarEstado } from '@/app/painel/pedidos/accoes';
import { avisarQueFoiVisto } from '@/lib/sinal-do-pedido';
import type { EstadoPedido, Pedido } from '@/lib/tipos';

/** Cor de cada estado na lista. O novo salta à vista; o resto acalma. */
const TOM: Record<EstadoPedido, string> = {
  novo: 'border-ouro/45 bg-ouro/[0.07]',
  preparar: 'border-linha bg-white/[0.03]',
  pronto: 'border-verde/40 bg-verde/[0.06]',
  caminho: 'border-linha bg-white/[0.03]',
  entregue: 'border-linha bg-transparent',
  cancelado: 'border-linha bg-transparent',
};

export function PedidosAoVivo({
  restauranteId,
  mesas,
  iniciais,
}: {
  restauranteId: string;
  /** table_id → número da mesa, para o Realtime não ter de perguntar. */
  mesas: Record<string, number>;
  iniciais: Pedido[];
}) {
  const [pedidos, setPedidos] = React.useState(iniciais);
  const [ligado, setLigado] = React.useState(false);
  const [somLigado, setSomLigado] = React.useState(false);

  // O relógio dos "há 5 minutos" não se actualiza sozinho.
  const [, forcarRelogio] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const t = setInterval(forcarRelogio, 30000);
    return () => clearInterval(t);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Tempo real                                                        */
  /* ---------------------------------------------------------------- */
  React.useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;

    function comMesa(linha: Pedido): Pedido {
      return { ...linha, mesa: linha.table_id ? (mesas[linha.table_id] ?? null) : null };
    }

    const canal = supabase
      .channel(`pedidos-${restauranteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        (evento) => {
          const novo = comMesa(evento.new as Pedido);
          let repetido = false;

          setPedidos((antes) => {
            // O Realtime pode repetir um evento; o pedido não pode
            // aparecer duas vezes na lista da cozinha.
            if (antes.some((p) => p.id === novo.id)) {
              repetido = true;
              return antes;
            }
            return [novo, ...antes];
          });

          // Quem toca é o SinoDePedidos, no layout do painel: toca em
          // qualquer página e não só nesta. Se tocasse aqui também, a
          // casa ouvia duas vezes por pedido.
          void repetido;
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        (evento) => {
          const mudado = comMesa(evento.new as Pedido);
          setPedidos((antes) => antes.map((p) => (p.id === mudado.id ? { ...p, ...mudado } : p)));
        },
      )
      .subscribe((estado) => setLigado(estado === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(canal);
    };
  }, [restauranteId, mesas]);

  /* ---------------------------------------------------------------- */
  /* Som                                                               */
  /* ---------------------------------------------------------------- */

  /**
   * O som liga-se sozinho, sem ninguém ter de o pedir duas vezes.
   *
   * Quem escolheu receber pedidos dentro da aplicação já disse que quer
   * ser avisado; obrigá-lo a carregar noutro botão aqui era pedir a
   * mesma coisa outra vez. O que os browsers exigem é um gesto — não uma
   * decisão — por isso serve qualquer toque nesta página, e o primeiro
   * chega em segundos. O botão continua lá para quem chegar antes disso.
   */
  React.useEffect(() => {
    // Arma sempre, e não só quando já ficou lembrado de outra visita: a
    // versão anterior exigia que a casa tivesse carregado no botão em
    // algum momento, e quem nunca o fez ficava em silêncio para sempre.
    return ligarSomAoPrimeiroGesto((ligado) => {
      setSomLigado(ligado);
      if (ligado) lembrarSom(true);
    });
  }, []);

  async function ligarSom() {
    // Tem de correr dentro do clique: é a regra dos browsers. A permissão
    // dos avisos vai no mesmo gesto, para não haver duas perguntas.
    const pronto = await desbloquearSom();
    setSomLigado(pronto);
    lembrarSom(pronto);
    if (pronto) {
      void tocarSino();
      void pedirAvisos();
    }
  }

  /** Prova de vida: a casa carrega e ouve, em vez de esperar por um pedido. */
  async function testarSom() {
    const ouviu = await tocarSino();
    if (!ouviu) {
      const pronto = await desbloquearSom();
      setSomLigado(pronto);
      if (pronto) void tocarSino();
    }
  }

  const porEstado = React.useMemo(() => {
    const abertos = pedidos.filter((p) => !eEstadoFinal(p.estado));
    const fechados = pedidos.filter((p) => eEstadoFinal(p.estado));
    return { abertos, fechados };
  }, [pedidos]);

  return (
    <div>
      {/* ------------------------------------------------------------ */}
      {/* Barra de estado                                               */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-xs',
            ligado ? 'border-verde/40 text-verde' : 'border-linha text-tenue',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              ligado ? 'animate-pulse bg-verde' : 'bg-tenue',
            )}
          />
          {ligado ? 'A receber em tempo real' : 'A ligar…'}
        </span>

        {somSuportado() ? (
          somLigado ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-verde/40 px-3.5 py-1.5 font-sans text-xs text-verde">
              <Bell className="h-3.5 w-3.5" />
              O som está ligado
            </span>
          ) : (
            <button
              type="button"
              onClick={ligarSom}
              className="inline-flex items-center gap-2 rounded-full border border-ouro/50 bg-ouro/[0.08] px-3.5 py-1.5 font-sans text-xs font-semibold text-ouro transition-colors duration-200 hover:bg-ouro/[0.14]"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Ligar o som dos pedidos
            </button>
          )
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-linha px-3.5 py-1.5 font-sans text-xs text-tenue">
            <BellOff className="h-3.5 w-3.5" />
            Este aparelho não toca som
          </span>
        )}
        <button
          type="button"
          onClick={testarSom}
          className="inline-flex items-center gap-2 rounded-full border border-linha px-3.5 py-1.5 font-sans text-xs text-tenue transition-colors duration-rapida ease-assinatura hover:text-creme"
        >
          Tocar para testar
        </button>
      </div>

      {!somLigado && somSuportado() ? (
        <p className="mt-3 max-w-[60ch] font-sans text-xs leading-normal text-tenue">
          O browser só deixa tocar som depois de alguém carregar uma vez. Ligue aqui no início do
          serviço e o aparelho avisa sempre que cair um pedido.
        </p>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* A fila                                                        */}
      {/* ------------------------------------------------------------ */}
      {porEstado.abertos.length === 0 && porEstado.fechados.length === 0 ? (
        <div className="vidro mt-10 rounded-cartao px-7 py-14 text-center">
          <p className="font-display text-xl text-creme">Nenhum pedido por agora.</p>
          <p className="mx-auto mt-3 max-w-[42ch] font-sans text-sm leading-normal text-tenue">
            Deixe este ecrã aberto. Assim que alguém enviar um pedido, ele cai aqui e o aparelho
            toca.
          </p>
        </div>
      ) : null}

      {porEstado.abertos.length ? (
        <ul className="mt-8 flex flex-col gap-4">
          {porEstado.abertos.map((pedido) => (
            <CartaoPedido key={pedido.id} pedido={pedido} aoMudar={setPedidos} />
          ))}
        </ul>
      ) : null}

      {porEstado.fechados.length ? (
        <details className="mt-10 border-t border-linha pt-6">
          <summary className="cursor-pointer font-sans text-sm text-tenue transition-colors hover:text-creme">
            Fechados hoje ({porEstado.fechados.length})
          </summary>
          <ul className="mt-5 flex flex-col gap-3 opacity-60">
            {porEstado.fechados.map((pedido) => (
              <CartaoPedido key={pedido.id} pedido={pedido} aoMudar={setPedidos} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CartaoPedido({
  pedido,
  aoMudar,
}: {
  pedido: Pedido;
  aoMudar: React.Dispatch<React.SetStateAction<Pedido[]>>;
}) {
  const [aGuardar, setAGuardar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function avancar(para: EstadoPedido) {
    if (aGuardar) return;
    setAGuardar(true);
    setErro(null);

    const anterior = pedido.estado;

    // Muda já no ecrã: quem está na cozinha carrega e vira costas.
    aoMudar((antes) =>
      antes.map((p) => (p.id === pedido.id ? { ...p, estado: para } : p)),
    );

    // Quem move um pedido viu-o. O sino tem de saber já, e não quando o
    // Realtime lho disser — que pode ser nunca.
    avisarQueFoiVisto(pedido.id);

    const resultado = await mudarEstado(pedido.id, para);

    if (!resultado.ok) {
      // Falhou: repõe o que estava, senão o ecrã mente à cozinha.
      aoMudar((antes) =>
        antes.map((p) => (p.id === pedido.id ? { ...p, estado: anterior } : p)),
      );
      setErro(resultado.erro ?? 'Não foi possível mudar o estado.');
    }

    setAGuardar(false);
  }

  const avancos = avancosPossiveis(pedido.estado);

  // Só se confirma o que ainda ninguém viu, e só o que está por atender.
  const porConfirmar = !pedido.confirmado_em && pedido.estado === 'novo';

  async function confirmar() {
    if (aGuardar) return;
    setAGuardar(true);
    setErro(null);

    /*
     * Cala-se já — e agora de verdade.
     *
     * O comentário que aqui estava dizia o mesmo, mas o código só
     * actualizava a lista. O sino é outro componente, e continuava a tocar
     * até o Realtime lhe trazer a alteração; se ela se perdesse, tocava
     * para sempre, com o botão já escondido. Quem carregou em "Recebido"
     * ouvia o alarme a insistir e concluía que o botão não funcionava.
     */
    const agora = new Date().toISOString();
    aoMudar((antes) =>
      antes.map((p) => (p.id === pedido.id ? { ...p, confirmado_em: agora } : p)),
    );
    avisarQueFoiVisto(pedido.id);

    const resultado = await confirmarPedido(pedido.id);

    if (!resultado.ok) {
      aoMudar((antes) =>
        antes.map((p) => (p.id === pedido.id ? { ...p, confirmado_em: null } : p)),
      );
      setErro(resultado.erro ?? 'Não foi possível confirmar.');
    }

    setAGuardar(false);
  }

  return (
    <li className={cn('rounded-cartao border p-5 transition-colors duration-500 ease-calmo', TOM[pedido.estado])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl leading-tight text-creme">
            {pedido.mesa != null ? `Mesa ${pedido.mesa}` : 'Sem mesa'}
          </p>
          <p className="mt-1 font-sans text-xs text-tenue">
            {hAQuantoTempo(pedido.created_at)} · {ROTULO_PAINEL[pedido.estado]}
          </p>
        </div>
        <p className="font-display text-xl text-ouro">{formatarKz(pedido.total)}</p>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 border-t border-linha pt-4">
        {pedido.itens.map((item, i) => (
          <li key={`${item.nome}-${i}`} className="font-sans text-sm leading-snug text-creme/90">
            {item.qtd}x {item.nome}
            {item.obs ? <span className="text-tenue"> — {item.obs}</span> : null}
          </li>
        ))}
      </ul>

      {/*
        A observação do pedido inteiro, destacada.

        Vai numa caixa própria e não misturada com os pratos: é aqui que
        aparece uma alergia, e uma alergia perdida no meio de uma lista é
        uma alergia que não foi lida.
      */}
      {pedido.observacao ? (
        <p className="mt-4 rounded-campo border border-ouro/40 bg-ouro/[0.06] px-3.5 py-2.5 font-sans text-sm leading-snug text-creme">
          <span className="etiqueta mr-2 text-ouro">Nota</span>
          {pedido.observacao}
        </p>
      ) : null}

      {erro ? (
        <p role="alert" className="mt-4 font-sans text-xs text-[#e0655a]">
          {erro}
        </p>
      ) : null}

      {/*
        "Recebido" só aparece enquanto ninguém confirmou, e é o primeiro
        botão: numa cozinha, ver e decidir são dois momentos. Primeiro
        alguém confirma que o pedido chegou — e o alarme cala-se —, e só
        depois é que se vê se dá para começar já.
      */}
      {porConfirmar ? (
        <div className="mt-5">
          <Botao variante="ouro" tamanho="md" largo onClick={confirmar} disabled={aGuardar}>
            Recebido — calar o alarme
          </Botao>
        </div>
      ) : null}

      {avancos.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {/* O passo seguinte fica em destaque; os outros ficam à mão de
              quem serve à mesa e salta o "a caminho". */}
          <Botao
            variante="ouro"
            tamanho="sm"
            onClick={() => avancar(avancos[0])}
            disabled={aGuardar}
          >
            {ROTULO_PAINEL[avancos[0]]}
          </Botao>

          {avancos.slice(1).map((estado) => (
            <Botao
              key={estado}
              variante="contorno"
              tamanho="sm"
              onClick={() => avancar(estado)}
              disabled={aGuardar}
            >
              {ROTULO_PAINEL[estado]}
            </Botao>
          ))}

          <Botao
            variante="discreto"
            tamanho="sm"
            onClick={() => avancar('cancelado')}
            disabled={aGuardar}
          >
            Cancelar
          </Botao>
        </div>
      ) : null}
    </li>
  );
}
