'use client';

import * as React from 'react';
import Image from 'next/image';
import { MessageSquareText } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { FolhaInferior } from '@/components/ui/folha-inferior';
import { AreaTexto } from '@/components/ui/campo';
import { AssinaturaCardapp } from '@/components/marca';
import { FotoPrato } from '@/components/prato-visual';
import { formatarKz, numeroMesa } from '@/lib/format';
import { buildWhatsAppUrl, descreverOpcoes } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { categoriaActiva } from '@/lib/cardapio';
import { categoriasDeAgora, descreverMenu, horaCurta, menusDeAgora } from '@/lib/horarios';
import {
  contarLinha,
  descontoEmPercentagem,
  precoDeMontra,
  promocaoActiva,
  temEscolhasObrigatorias,
} from '@/lib/precos';
import { clienteNavegador } from '@/lib/supabase/cliente';
import type { CategoriaComPratos, MenuHorario, Prato, Restaurante } from '@/lib/tipos';
import { useCarrinho, type Escolha, type LinhaCarrinho } from './carrinho';
import { ASSINATURA, DA_DIREITA, MOLA, ProvedorDeMovimento, SUBIR, UMA_VEZ, cascata } from './movimento';
import { ChamarDaMesa } from './chamar-da-mesa';
import { useIdioma } from './idioma';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { corQueSeLe } from '@/lib/cores';

/**
 * Um relógio de minuto a minuto, a começar na hora do servidor.
 *
 * Serve os horários e as promoções: o almoço fecha às 15:00 e a
 * promoção acaba à meia-noite, e o cardápio aberto na mesa tem de dar por
 * isso sem o cliente recarregar. Começa na hora do servidor para o
 * primeiro desenho ser igual nos dois lados.
 */
/**
 * A hora, de minuto a minuto, começada no browser.
 *
 * Já veio do servidor, para o primeiro desenho bater certo com o do
 * browser. Deixou de poder vir: a página é servida da borda, feita há
 * talvez meia hora, e a hora de lá seria a de quando foi feita — um
 * horário de almoço podia aparecer fechado à uma da tarde.
 *
 * O primeiro desenho usa o zero, que não acende horário nenhum nem
 * promoção nenhuma, e o efeito que corre logo a seguir põe a hora certa.
 * O servidor e o browser desenham a mesma coisa, que é o que a
 * hidratação exige.
 */
/** O número da mesa que o QR trouxe no endereço. */
function useMesaDoEndereco(inicial: number | null) {
  const [mesa, setMesa] = React.useState<number | null>(inicial);

  React.useEffect(() => {
    const bruto = new URLSearchParams(window.location.search).get('mesa');
    if (!bruto) return;
    const n = Number.parseInt(bruto, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 999) setMesa(n);
  }, []);

  return mesa;
}

function useRelogio() {
  const [agora, setAgora] = React.useState(0);
  React.useEffect(() => {
    setAgora(Date.now());
    const relogio = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(relogio);
  }, []);
  return agora;
}

/**
 * O esgotado ao vivo: o cardápio ouve os pratos da casa.
 *
 * Quando a cozinha carrega em "Esgotou", o prato muda no telemóvel de
 * quem está à mesa, sem recarregar — antes de o cliente o escolher e o
 * pedido voltar recusado. Só no Plano Sala.
 */
function useEsgotadoAoVivo(categorias: CategoriaComPratos[], ligado: boolean) {
  const [disponivel, setDisponivel] = React.useState<Record<string, boolean>>({});
  const ids = React.useMemo(() => categorias.map((c) => c.id).sort().join(','), [categorias]);

  React.useEffect(() => {
    if (!ligado || !ids) return;
    const supabase = clienteNavegador();
    if (!supabase) return;

    const canal = supabase
      .channel(`cardapio-${ids.slice(0, 36)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `category_id=in.(${ids})` },
        (evento) => {
          const novo = evento.new as { id?: string; disponivel?: boolean };
          if (typeof novo.id === 'string' && typeof novo.disponivel === 'boolean') {
            setDisponivel((d) => ({ ...d, [novo.id!]: novo.disponivel! }));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [ids, ligado]);

  return disponivel;
}

type Props = {
  restaurante: Restaurante;
  categorias: CategoriaComPratos[];
  menus?: MenuHorario[];
  mesa: number | null;
  tableId: string | null;
  marcaVisivel: boolean;
};

/**
 * O cardápio em duas línguas é do Plano Sala. No Mesa o provedor fica
 * desligado: o cardápio é português, sem selector e sem ler preferências.
 */
export function CardapioPublico(props: Props) {
  return (
    <>
      <Cardapio {...props} />
    </>
  );
}

function Cardapio({
  restaurante,
  categorias: categoriasDoServidor,
  menus = [],
  mesa: mesaDoServidor,
  tableId,
  marcaVisivel,
}: Props) {
  const router = useRouter();
  const { t } = useIdioma();
  /*
   * A MESA VEM DO ENDEREÇO, E É LIDA AQUI.
   *
   * Ler `?mesa=` no servidor tornava a página dinâmica: cada leitura de
   * QR pagava a renderização inteira, três segundos até ao primeiro
   * byte. Lida no browser, a página é a mesma para toda a gente e pode
   * ficar guardada na borda; o número entra logo a seguir, e o que
   * muda com ele é um distintivo e o campo do pedido.
   */
  const mesa = useMesaDoEndereco(mesaDoServidor);
  const carrinho = useCarrinho();
  const agora = useRelogio();
  const aoVivo = temFuncionalidade(restaurante, 'esgotado_ao_vivo');
  const comHorarios = temFuncionalidade(restaurante, 'menus_horario');
  const disponivelAoVivo = useEsgotadoAoVivo(categoriasDoServidor, aoVivo);

  /*
   * O que o cliente vê agora: os horários que estão a servir, e o
   * esgotado como está neste minuto. No Plano Sala a casa pode esconder o
   * esgotado em vez de o mostrar riscado.
   */
  const categorias = React.useMemo(() => {
    const esconder = aoVivo && restaurante.esgotado_modo === 'esconder';
    const aServir = comHorarios ? categoriasDeAgora(categoriasDoServidor, menus, agora) : categoriasDoServidor;
    return aServir
      .map((c) => ({
        ...c,
        itens: c.itens
          .map((i) => (i.id in disponivelAoVivo ? { ...i, disponivel: disponivelAoVivo[i.id] } : i))
          .filter((i) => !esconder || i.disponivel),
      }))
      .filter((c) => c.itens.length > 0);
  }, [categoriasDoServidor, menus, agora, disponivelAoVivo, aoVivo, comHorarios, restaurante.esgotado_modo]);

  const menusAServir = comHorarios ? menusDeAgora(menus, agora) : [];
  const [pratoAberto, setPratoAberto] = React.useState<Prato | null>(null);
  const [resumoAberto, setResumoAberto] = React.useState(false);
  const [falhou, setFalhou] = React.useState<string | null>(null);
  const [observacao, setObservacao] = React.useState('');
  const [sinal, sinalizar] = useSinalDeBotao();

  // Quem manda é a casa, nas definições. O cliente não escolhe a via:
  // vê um botão só, e é o da casa. Uma base antiga, sem a coluna, cai em
  // 'whatsapp' — que é como isto sempre funcionou.
  const peloApp = (restaurante.modo_pedido ?? 'whatsapp') === 'app';
  const [aEnviar, setAEnviar] = React.useState(false);
  const [activa, setActiva] = React.useState(categorias[0]?.id ?? '');

  const seccoes = React.useRef<Record<string, HTMLElement | null>>({});
  const pilulas = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const barra = React.useRef<HTMLDivElement>(null);
  const saltoEmCurso = React.useRef(false);
  const fimDoSalto = React.useRef<number | undefined>(undefined);

  const todos = React.useMemo(() => categorias.flatMap((c) => c.itens), [categorias]);
  // Do servidor, e não só dos que se vêem agora: um prato no carrinho
  // continua a ter nome mesmo que a categoria dele tenha saído de horário.
  const pratosPorId = React.useMemo(
    () => new Map(categoriasDoServidor.flatMap((c) => c.itens).map((p) => [p.id, p])),
    [categoriasDoServidor],
  );
  // A capa escolhida manda; sem ela, a primeira fotografia de prato
  // ainda é melhor do que um rectângulo vazio.
  const capa = restaurante.capa_url ?? todos.find((i) => i.foto_url)?.foto_url ?? null;
  const destaques = React.useMemo(
    () => todos.filter((i) => i.disponivel && i.foto_url).slice(0, 6),
    [todos],
  );

  /*
   * Barra de categorias.
   *
   * A versão anterior usava IntersectionObserver com uma faixa alta do
   * ecrã e escolhia a primeira secção a intersectá-la — com secções de
   * alturas diferentes, mostrava "Grelhados" enquanto se lia "Pratos
   * Principais".
   *
   * Agora a conta é directa: a categoria activa é a última cujo topo já
   * passou por baixo da barra fixa. Não tem casos limite, acompanha o
   * scroll suave enquanto ele decorre, e custa uma leitura por frame,
   * só enquanto o dedo está a deslizar.
   */
  React.useEffect(() => {
    let pedido = 0;

    function medir() {
      pedido = 0;
      if (saltoEmCurso.current) return;

      const limite = (barra.current?.offsetHeight ?? 96) + 12;
      const noFim = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

      const topos = categorias
        .map((categoria) => {
          const no = seccoes.current[categoria.id];
          return no ? { id: categoria.id, topo: no.getBoundingClientRect().top } : null;
        })
        .filter((t): t is { id: string; topo: number } => t !== null);

      const escolhida = categoriaActiva(topos, limite, noFim);
      setActiva((anterior) => (anterior === escolhida ? anterior : escolhida));
    }

    function aoDeslizar() {
      if (pedido) return;
      pedido = requestAnimationFrame(medir);
    }

    medir();
    window.addEventListener('scroll', aoDeslizar, { passive: true });
    window.addEventListener('resize', aoDeslizar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoDeslizar);
      window.removeEventListener('resize', aoDeslizar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [categorias]);

  /* A pastilha activa desliza para dentro do campo de visão. */
  React.useEffect(() => {
    const pilula = pilulas.current[activa];
    const carril = pilula?.parentElement;
    if (!pilula || !carril) return;

    const alvo = pilula.offsetLeft - (carril.clientWidth - pilula.offsetWidth) / 2;
    carril.scrollTo({
      left: Math.max(0, alvo),
      behavior: saltoEmCurso.current ? 'auto' : 'smooth',
    });
  }, [activa]);

  /*
   * Onde fica a pastilha: por cima do botao activo, com a largura dele.
   *
   * Mede-se de novo quando o carril muda de tamanho e quando as letras
   * da web chegam — ate la os botoes tem a largura da letra de sistema,
   * e a pastilha ficava curta.
   */
  const [indicador, setIndicador] = React.useState({ x: 0, y: 0, w: 0, h: 0 });
  React.useEffect(() => {
    const pilula = pilulas.current[activa];
    const carril = pilula?.parentElement;
    if (!pilula || !carril) return;

    function medirPastilha() {
      const p = pilulas.current[activa];
      if (!p) return;
      setIndicador({ x: p.offsetLeft, y: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight });
    }

    medirPastilha();
    const observador = new ResizeObserver(medirPastilha);
    observador.observe(carril);
    void document.fonts?.ready.then(medirPastilha);
    return () => observador.disconnect();
  }, [activa]);

  function irPara(id: string) {
    const no = seccoes.current[id];
    if (!no) return;

    // Enquanto o scroll suave corre, o observador dispara em cascata:
    // fixamos a categoria escolhida para a barra não piscar pelo
    // caminho todo até lá.
    setActiva(id);
    saltoEmCurso.current = true;
    window.clearTimeout(fimDoSalto.current);
    fimDoSalto.current = window.setTimeout(() => {
      saltoEmCurso.current = false;
    }, 700);

    const altura = barra.current?.offsetHeight ?? 96;
    window.scrollTo({
      top: no.getBoundingClientRect().top + window.scrollY - altura - 4,
      behavior: 'smooth',
    });
  }

  function corpoDoPedido() {
    // A mensagem de WhatsApp leva os nomes e os preços; o servidor recebe
    // o prato e as opções escolhidas, e faz a conta ele mesmo.
    const itens = carrinho.linhas.map(({ nome, qtd, preco, obs, opcoes }) => ({ nome, qtd, preco, obs, opcoes }));
    const paraOServidor = carrinho.linhas.map(({ itemId, nome, qtd, preco, obs, opcaoIds }) => ({
      item_id: itemId,
      nome,
      qtd,
      preco,
      obs,
      opcao_ids: opcaoIds,
    }));
    return {
      itens,
      json: JSON.stringify({
        slug: restaurante.slug,
        table_id: tableId,
        mesa,
        itens: paraOServidor,
        observacao: observacao.trim() || null,
        // Só muda a língua das respostas de erro; o pedido vai em português.
              }),
    };
  }

  /**
   * O caminho de sempre: grava-se sem esperar e abre-se o WhatsApp.
   *
   * A gravação vai sem `await` de propósito. O que interessa ao cliente
   * é chegar à conversa; se a gravação falhar, o pedido segue na mesma e
   * a casa recebe-o pelo WhatsApp, que é a fonte da verdade neste modo.
   */
  async function enviarPeloWhatsApp() {
    if (!carrinho.linhas.length || aEnviar) return;
    setAEnviar(true);
    setFalhou(null);

    const { itens, json } = corpoDoPedido();
    const url = buildWhatsAppUrl(restaurante.whatsapp, {
      restaurante: restaurante.nome,
      mesa,
      itens,
      total: carrinho.total,
      observacao: observacao.trim() || null,
    });

    try {
      fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: json,
      }).catch(() => {});
    } catch {
      /* sem rede: seguimos para o WhatsApp na mesma */
    }

    // Uma âncora clicada conta como navegação iniciada pelo utilizador —
    // o Safari do iPhone bloqueia window.open nestas circunstâncias.
    const ligacao = document.createElement('a');
    ligacao.href = url;
    ligacao.rel = 'noreferrer';
    document.body.appendChild(ligacao);
    ligacao.click();
    ligacao.remove();
  }

  /**
   * O caminho novo: o pedido fica no CardApp e o cliente segue o estado.
   *
   * Aqui espera-se pela resposta, ao contrário do WhatsApp. Neste modo
   * não há segunda via: se a gravação falhar e seguíssemos em frente, o
   * cliente ficava a olhar para um ecrã de acompanhamento de um pedido
   * que a cozinha nunca viu. Mais vale dizer que falhou e deixar o
   * carrinho intacto para tentar outra vez.
   */
  async function enviarPelaAplicacao() {
    if (!carrinho.linhas.length || aEnviar) return;
    setAEnviar(true);
    setFalhou(null);

    try {
      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpoDoPedido().json,
      });

      const dados = (await resposta.json()) as { id?: string; demonstracao?: boolean; erro?: string };

      if (!resposta.ok || !dados.id) {
        // O cardápio de exemplo não grava nada, e não tem para onde ir.
        // Um prato que esgotou entretanto diz-se pelo nome — o servidor
        // sabe qual foi, e o cliente precisa de saber o que tirar.
        setFalhou(
          dados.demonstracao
            ? t('exemplo')
            : dados.erro && resposta.status === 409
              ? dados.erro
              : t('falhouEnvio'),
        );
        sinalizar('erro');
        setAEnviar(false);
        return;
      }

      carrinho.limpar();
      router.push(`/pedido/${dados.id}`);
    } catch {
      setFalhou(t('falhouEnvio'));
      sinalizar('erro');
      setAEnviar(false);
    }
  }

  const temCarrinho = carrinho.quantidadeTotal > 0;
  // Chamar da mesa só faz sentido sabendo que mesa é — e só no Plano Sala.
  const podeChamar = mesa != null && temFuncionalidade(restaurante, 'chamar_empregado');
  /*
   * A cor da casa, escurecida até se ler sobre a folha branca. Muitas
   * casas escolhem dourados e areias — bonitos no escuro, invisíveis no
   * claro. O tom mantém-se; só fecha o suficiente para se ler.
   */
  const cor = corQueSeLe(restaurante.cor_marca || '#D9B36B');
  const pratoDoDia = temFuncionalidade(restaurante, 'promocoes')
    ? todos.find((i) => i.prato_do_dia && i.disponivel)
    : undefined;

  return (
    <ProvedorDeMovimento>
    <div className="min-h-dvh bg-grafite">
      {/* ---------------------------------------------------------- */}
      {/* Herói                                                        */}
      {/* ---------------------------------------------------------- */}
      <header className="relative isolate">
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[300px]">
          {capa ? (
            // A capa chega um pouco perto e assenta. Um segundo e pouco,
            // porque e ambiente: nada espera por ela.
            <m.div
              className="absolute inset-0"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.4, ease: ASSINATURA }}
            >
            <Image
              src={capa}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              aria-hidden
            />
            </m.div>
          ) : (
            <div className="absolute inset-0 bg-grafite-alto" />
          )}
          <div className="veu-foto absolute inset-0" />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-9">
          <m.div
            className="mx-auto flex max-w-[600px] items-end gap-3"
            initial="escondido"
            animate="visivel"
            variants={cascata(0.08, 0.15)}
          >
            <m.div variants={SUBIR} className="min-w-0 flex-1">
              <p className="etiqueta" style={{ color: cor }}>
                {t('cardapio')}
              </p>
              {/*
                O nome da casa vai na cor da casa, e não no laranja do
                CardApp. Este ecrã é o cardápio de um restaurante: a
                etiqueta e o distintivo da mesa já usavam a cor dele, e o
                nome ficava da nossa — três cores em quatro centímetros.
              */}
              <h1
                style={{ color: cor }}
                /*
                   NÃO VAI NA ASSINATURA. A letra manuscrita ficava bem
                   em "Tia Bela" e ilegível em "FRANGO ASSADO": os nomes
                   das casas vêm em maiúsculas com frequência, e uma
                   manuscrita em maiúsculas não se lê. A assinatura fica
                   para o que é nosso e escrevemos nós.
                */
                className="mt-2 font-display text-3xl font-semibold leading-none tracking-[-0.02em] sm:text-4xl"
              >
                {restaurante.nome}
              </h1>
            </m.div>

            {mesa != null ? (
              <m.span
                variants={SUBIR}
                /* Letra branca: o fundo é a cor da casa, que é sempre um
                   tom cheio — a tinta escura desaparecia nas escuras. */
                className="etiqueta shrink-0 rounded-full px-3.5 py-2 text-white"
                style={{ backgroundColor: cor }}
              >
                {t('mesa', { n: numeroMesa(mesa) })}
              </m.span>
            ) : null}
          </m.div>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Folha do cardápio                                            */}
      {/* ---------------------------------------------------------- */}
      <div
        data-superficie="clara"
        className="relative z-10 -mt-5 min-h-[70dvh] rounded-t-folha pb-40"
      >
        <div
          ref={barra}
          className="superficie-clara sticky top-0 z-30 rounded-t-folha"
        >
          <div className="flex justify-center pt-3">
            <span className="block h-[4px] w-[38px] rounded-full bg-creme/10" />
          </div>
          <div
            className="barra-esconde relative mx-auto flex max-w-[600px] gap-2 overflow-x-auto px-5 py-3"
            role="tablist"
            aria-label={t('categorias')}
          >
            {/*
              A pastilha escura e uma so, e desliza de categoria em categoria.
              Antes cada botao acendia o seu fundo e apagava o do vizinho no
              mesmo instante: a categoria mudava, mas nada se mexia. Assim o
              olho segue o movimento ate onde se esta.
            */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 rounded-full bg-creme transition-[transform,width,height] duration-300 ease-assinatura motion-reduce:transition-none"
              style={{
                width: indicador.w,
                height: indicador.h,
                transform: `translate(${indicador.x}px, ${indicador.y}px)`,
                opacity: indicador.w ? 1 : 0,
              }}
            />
            {categorias.map((categoria) => {
              const activaAgora = categoria.id === activa;
              return (
                <button
                  key={categoria.id}
                  ref={(n) => {
                    pilulas.current[categoria.id] = n;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={activaAgora}
                  onClick={() => irPara(categoria.id)}
                  className={cn(
                    'relative z-10 flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 font-sans text-sm font-semibold transition-colors duration-200',
                    activaAgora
                      ? cn(
                          // Letra clara: a pastilha por baixo é tinta cheia.
                          'border-transparent text-grafite',
                          // Ate a pastilha ser medida, o botao pinta o proprio fundo.
                          !indicador.w && 'bg-creme',
                        )
                      : 'border-creme/15 text-tenue-escuro hover:border-creme/35 hover:text-creme',
                  )}
                >
                  {categoria.nome}
                </button>
              );
            })}
          </div>
          <div className="mx-auto h-px max-w-[600px] bg-linha-escura" />
        </div>

        {/* O que a cozinha está a servir agora, e até quando. */}
        {menusAServir.length ? (
          <p className="mx-auto mt-5 flex max-w-[600px] flex-wrap items-center gap-2 px-5 font-sans text-xs text-tenue-escuro">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verde/60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-verde" />
            </span>
            {t('aServir')}{' '}
            {menusAServir.map((m) => (
              <span key={m.id} className="font-semibold text-creme">
                {t('ateAs', { menu: m.nome, hora: horaCurta(m.hora_fim) })}
              </span>
            ))}
          </p>
        ) : null}

        {categorias.length === 0 ? (
          <ForaDeHoras menus={menus} />
        ) : null}

        {pratoDoDia ? (
          <PratoDoDia
            prato={pratoDoDia}
            agora={agora}
            cor={cor}
            aoAbrir={() => setPratoAberto(pratoDoDia)}
          />
        ) : null}

        {/* fila de destaques, no registo dos cartões da referência */}
        {destaques.length >= 3 ? (
          <section className="pt-7">
            <div className="mx-auto max-w-[600px] px-5">
              <h2 className="font-sans text-lg font-extrabold tracking-[-0.02em] text-creme">
                {t('maisPedidos')}
              </h2>
            </div>
            <div className="relative mt-4">
              <m.div
                className="barra-esconde flex gap-3 overflow-x-auto px-5 pb-1 [scroll-padding-left:20px] [scroll-snap-type:x_mandatory] sm:mx-auto sm:max-w-[600px]"
                initial="escondido"
                whileInView="visivel"
                viewport={UMA_VEZ}
                variants={cascata(0.07)}
              >
                {destaques.map((prato) => (
                  <CartaoDestaque
                    key={prato.id}
                    prato={prato}
                    agora={agora}
                    aoAbrir={() => setPratoAberto(prato)}
                  />
                ))}
              </m.div>

              {/* diz ao polegar que há mais fila do lado de lá */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white via-white/70 to-transparent"
              />
            </div>
          </section>
        ) : null}

        {/* lista por categoria */}
        <div className="mx-auto max-w-[600px] px-5">
          {categorias.map((categoria) => (
            <section
              key={categoria.id}
              data-categoria={categoria.id}
              ref={(n) => {
                seccoes.current[categoria.id] = n;
              }}
              className="scroll-mt-28 pt-9"
            >
              <h2 className="font-sans text-lg font-extrabold tracking-[-0.02em] text-creme">
                {categoria.nome}
              </h2>

              <ul className="mt-4 flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8">
                {categoria.itens.map((prato, i) => (
                  <m.li
                    key={prato.id}
                    initial="escondido"
                    whileInView="visivel"
                    viewport={UMA_VEZ}
                    variants={SUBIR}
                    // Os primeiros de cada categoria em cascata; dai para
                    // baixo cada um entra quando o dedo o traz.
                    transition={{ delay: Math.min(i, 4) * 0.05 }}
                  >
                    <LinhaPrato
                      prato={prato}
                      agora={agora}
                      quantidade={carrinho.quantidadeDoPrato(prato.id)}
                      aoAbrir={() => prato.disponivel && setPratoAberto(prato)}
                      // Um prato com tamanho por escolher não vai direto
                      // para o carrinho: o "+" abre a folha das opções.
                      aoAdicionar={() =>
                        temEscolhasObrigatorias(prato) ? setPratoAberto(prato) : carrinho.adicionar(prato, 1)
                      }
                    />
                  </m.li>
                ))}
              </ul>
            </section>
          ))}

          {marcaVisivel ? (
            <div className="mt-14 flex justify-center border-t border-linha-escura pt-8">
              <AssinaturaCardapp claro />
            </div>
          ) : (
            <div className="h-10" />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Carrinho flutuante                                           */}
      {/* ---------------------------------------------------------- */}
      <AnimatePresence>
        {temCarrinho ? (
          <m.div
            key="carrinho"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={MOLA}
            className={cn(
              'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8',
              'bg-gradient-to-t from-grafite via-creme/90 to-transparent',
            )}
          >
            <div className="mx-auto flex max-w-[600px] items-center gap-2.5">
              <button
                type="button"
                onClick={() => setResumoAberto(true)}
                className="superficie flex min-w-0 flex-1 items-center gap-3 rounded-full py-2.5 pl-2.5 pr-4 text-left transition-colors duration-200 hover:border-creme/25"
              >
                <span
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-laranja font-sans text-sm font-bold tabular-nums text-creme"
                  aria-label={t('noPedido', { n: carrinho.quantidadeTotal })}
                >
                  <AnimatePresence initial={false}>
                    <m.span
                      key={carrinho.quantidadeTotal}
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ y: -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      transition={{ duration: 0.22, ease: ASSINATURA }}
                    >
                      {carrinho.quantidadeTotal}
                    </m.span>
                  </AnimatePresence>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-xs uppercase tracking-[0.14em] text-tenue">
                    {t('verPedido')}
                  </span>
                  <span className="block truncate font-sans text-base font-bold text-creme">
                    {formatarKz(carrinho.total)}
                  </span>
                </span>
              </button>

              {/* Na barra cabe um botão só: leva ao caminho que a casa prefere. */}
              <Botao
                variante="verde"
                tamanho="lg"
                onClick={peloApp ? enviarPelaAplicacao : enviarPeloWhatsApp}
                aCarregar={aEnviar}
                estado={sinal}
                className="shrink-0"
              >
                {t('enviarPedido')}
              </Botao>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      {podeChamar ? (
        <ChamarDaMesa slug={restaurante.slug} mesa={mesa!} comCarrinho={temCarrinho} />
      ) : null}

      <FolhaPrato
        // A versão do prato que o cliente vê agora — com o esgotado ao vivo.
        prato={pratoAberto ? (todos.find((p) => p.id === pratoAberto.id) ?? pratoAberto) : null}
        agora={agora}
        aoFechar={() => setPratoAberto(null)}
        aoConfirmar={(prato, qtd, obs, escolha) => {
          carrinho.adicionar(prato, qtd, obs, escolha);
          setPratoAberto(null);
        }}
      />

      <FolhaInferior
        aberta={resumoAberto}
        aoFechar={() => setResumoAberto(false)}
        titulo={t('resumo')}
      >
        <div className="flex min-h-0 flex-col overflow-y-auto px-5 pb-6 pt-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">{t('oSeuPedido')}</h2>
            {mesa != null ? (
              <span className="etiqueta text-tenue-escuro">{t('mesa', { n: numeroMesa(mesa) })}</span>
            ) : null}
          </div>

          <ul className="mt-5 flex flex-col divide-y divide-linha-escura">
            <AnimatePresence initial={false}>
              {carrinho.linhas.map((linha) => (
                <LinhaResumo
                  key={linha.id}
                  linha={linha}
                  mostrada={mostrarLinha(linha)}
                  aoAlterar={(d) => carrinho.alterarQuantidade(linha.id, d)}
                />
              ))}
            </AnimatePresence>
          </ul>

          {/*
            Observação do pedido inteiro, e não de um prato.

            Já havia a de cada prato — "sem cebola" naquele prato. Esta é
            para o que não pertence a nenhum: alergias, talheres a mais,
            "somos seis mas queremos servir em dois tempos". Sem sítio
            para o escrever, isso era dito em voz alta a quem passasse —
            ou não era dito de todo.
          */}
          {/*
            O campo levava o tema escuro dentro de uma folha branca: letra
            branca em fundo branco. O cliente escrevia e nao via nada.
          */}
          <div className="mt-6 rounded-cartao border border-laranja/25 bg-laranja/5 p-4">
            <label
              htmlFor="obs-pedido"
              className="mb-1 flex items-center gap-2 font-sans text-sm font-semibold text-creme"
            >
              <MessageSquareText className="h-4 w-4 shrink-0 text-laranja-escuro" aria-hidden />
              {t('obsCozinha')}
              <span className="font-normal text-tenue-escuro">· {t('opcional')}</span>
            </label>
            <p className="mb-3 font-sans text-xs leading-normal text-tenue-escuro">
              {t('obsCozinhaAjuda')}
            </p>
            <AreaTexto
              id="obs-pedido"
              claro
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 200))}
              placeholder={t('obsCozinhaExemplo')}
              rows={3}
            />
            {observacao.length > 150 ? (
              <p className="mt-1 text-right font-sans text-xs text-tenue-escuro">
                {t('caracteres', { n: 200 - observacao.length })}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-linha-escura pt-5">
            <span className="etiqueta text-tenue-escuro">{t('total')}</span>
            <span className="font-sans text-2xl font-extrabold tracking-[-0.02em]">
              {formatarKz(carrinho.total)}
            </span>
          </div>

          <p className="mt-3 font-sans text-xs text-tenue-escuro">
            {peloApp ? t('segueApp') : t('segueWhatsApp')}
          </p>

          {falhou ? (
            <p role="alert" className="mt-3 font-sans text-xs text-[#b4402f]">
              {falhou}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            <Botao
              variante="verde"
              tamanho="lg"
              largo
              onClick={peloApp ? enviarPelaAplicacao : enviarPeloWhatsApp}
              aCarregar={aEnviar}
              estado={sinal}
            >
              {peloApp ? t('enviarPedido') : t('enviarWhatsApp')}
            </Botao>
            <Botao variante="discreto-escuro" tamanho="md" largo onClick={() => setResumoAberto(false)}>
              {t('continuar')}
            </Botao>
          </div>
        </div>
      </FolhaInferior>
    </div>
    </ProvedorDeMovimento>
  );
}

/* ------------------------------------------------------------------ */

/**
 * O preço de um prato como o cliente o lê.
 *
 * Em promoção: o preço novo forte, o de antes riscado ao lado e o selo
 * do desconto — as três coisas que fazem uma promoção ler-se de relance.
 * Com tamanhos: "desde" o mais barato, para ninguém achar que o Grande
 * custa o mesmo que o Pequeno.
 */
function Preco({
  prato,
  agora,
  escuro = false,
  className,
}: {
  prato: Prato;
  agora: number;
  /** Sobre fundo escuro (os cartões de destaque). */
  escuro?: boolean;
  className?: string;
}) {
  const { t } = useIdioma();
  const montra = precoDeMontra(prato, agora);
  const desconto = montra.antes != null ? descontoEmPercentagem(prato) : 0;

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-sans font-extrabold tracking-[-0.02em]', escuro ? 'text-creme' : 'text-creme')}>
        {montra.desde ? <span className="mr-1 text-xs font-semibold opacity-70">{t('desde')}</span> : null}
        {formatarKz(montra.agora)}
      </span>
      {montra.antes != null ? (
        <>
          <s className={cn('font-sans text-xs', escuro ? 'text-tenue' : 'text-tenue-escuro')}>
            <span className="sr-only">{t('antes')} </span>
            {formatarKz(montra.antes)}
          </s>
          {desconto > 0 ? (
            <span className="rounded-full bg-laranja px-1.5 py-0.5 font-sans text-xs font-extrabold text-creme">
              -{desconto}%
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

/** O prato do dia, grande, logo por baixo das categorias. */
function PratoDoDia({
  prato,
  agora,
  cor,
  aoAbrir,
}: {
  prato: Prato;
  agora: number;
  cor: string;
  aoAbrir: () => void;
}) {
  const { t } = useIdioma();
  const nome = prato.nome;
  const descricao = prato.descricao;
  return (
    <section className="mx-auto max-w-[600px] px-5 pt-6" aria-labelledby="prato-do-dia">
      <m.button
        type="button"
        onClick={aoAbrir}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: ASSINATURA, delay: 0.1 }}
        whileTap={{ scale: 0.985 }}
        className="relative block w-full overflow-hidden rounded-cartao bg-grafite-carta text-left shadow-cartao"
      >
        {/*
          A fotografia em cima e o texto por baixo, e não por cima dela: com
          uma descrição de duas linhas o texto ficava mais alto do que a foto
          e tapava-a toda — um prato do dia sem prato à vista.
        */}
        <span className="relative block aspect-[16/10] w-full">
          <FotoPrato nome={nome} url={prato.foto_url} tamanhos="(max-width: 600px) 92vw, 560px" />
          <span
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-xs font-bold text-creme shadow-elevacao-2"
            style={{ backgroundColor: cor }}
          >
            ★ {t('pratoDoDia')}
          </span>
        </span>
        <span className="block p-5">
          <span id="prato-do-dia" className="block font-display text-2xl leading-tight text-creme">
            {nome}
          </span>
          {descricao ? (
            <span className="mt-1 line-clamp-1 block font-sans text-sm text-creme/75">{descricao}</span>
          ) : null}
          <Preco prato={prato} agora={agora} escuro className="mt-2 text-lg" />
        </span>
      </m.button>
    </section>
  );
}

/**
 * Nenhum horário a servir e nenhuma categoria sem horário: a cozinha está
 * fechada. Em vez de um cardápio vazio — que parece avaria —, diz-se
 * quando abre.
 */
function ForaDeHoras({ menus }: { menus: MenuHorario[] }) {
  const { t } = useIdioma();
  return (
    <div className="mx-auto max-w-[600px] px-5 pt-10 text-center">
      <p className="font-display text-2xl text-creme">{t('foraDeHorasTitulo')}</p>
      <p className="mx-auto mt-2 max-w-[36ch] font-sans text-sm leading-normal text-tenue-escuro">
        {t('foraDeHorasTexto')}
      </p>
      <ul className="mt-5 flex flex-col gap-2">
        {menus.map((m) => (
          <li key={m.id} className="rounded-cartao bg-creme/[0.04] px-4 py-3 font-sans text-sm text-creme">
            {descreverMenu({ ...m, nome: m.nome })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoDestaque({ prato, agora, aoAbrir }: { prato: Prato; agora: number; aoAbrir: () => void }) {
  const emPromocao = promocaoActiva(prato, agora);
  const nome = prato.nome;
  const descricao = prato.descricao;
  return (
    <m.button
      type="button"
      onClick={aoAbrir}
      variants={DA_DIREITA}
      whileTap={{ scale: 0.97 }}
      className="w-[168px] shrink-0 overflow-hidden rounded-cartao bg-grafite-carta text-left shadow-cartao [scroll-snap-align:start]"
    >
      <span className="relative block aspect-[4/3] w-full">
        <FotoPrato nome={nome} url={prato.foto_url} tamanhos="256px" />
        {emPromocao ? (
          <span className="absolute left-2 top-2 rounded-full bg-laranja px-2 py-0.5 font-sans text-xs font-extrabold text-creme">
            -{descontoEmPercentagem(prato)}%
          </span>
        ) : null}
      </span>
      <span className="block px-3.5 pb-3.5 pt-3">
        <span className="line-clamp-2 min-h-[2.4em] font-display text-sm leading-none text-creme">
          {nome}
        </span>
        {descricao ? (
          <span className="mt-1 line-clamp-1 font-sans text-xs text-tenue">
            {descricao}
          </span>
        ) : null}
        <span className="mt-2 block text-base">
          <Preco prato={prato} agora={agora} escuro />
        </span>
      </span>
    </m.button>
  );
}

function LinhaPrato({
  prato,
  agora,
  quantidade,
  aoAbrir,
  aoAdicionar,
}: {
  prato: Prato;
  agora: number;
  quantidade: number;
  aoAbrir: () => void;
  aoAdicionar: () => void;
}) {
  const { t } = useIdioma();
  const esgotado = !prato.disponivel;
  const nome = prato.nome;
  const descricao = prato.descricao;

  return (
    <div
      className={cn(
        'flex items-center gap-4 border-b border-linha-escura py-3.5',
        esgotado && 'opacity-45',
      )}
    >
      <button
        type="button"
        onClick={aoAbrir}
        disabled={esgotado}
        aria-label={nome}
        className="relative block h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[16px] bg-creme/5"
      >
        <FotoPrato nome={nome} url={prato.foto_url} tamanhos="128px" />
      </button>

      <button type="button" onClick={aoAbrir} disabled={esgotado} className="min-w-0 flex-1 text-left">
        <p className="font-display text-base leading-snug text-creme">{nome}</p>
        {descricao ? (
          <p className="mt-1 line-clamp-2 font-sans text-xs leading-snug text-tenue-escuro">
            {descricao}
          </p>
        ) : null}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <Preco prato={prato} agora={agora} />
          {esgotado ? (
            <span className="ml-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-tenue-escuro">
              {t('esgotado')}
            </span>
          ) : null}
        </p>
      </button>

      {!esgotado ? (
        <m.button
          type="button"
          onClick={aoAdicionar}
          aria-label={t('adicionar', { nome })}
          whileTap={{ scale: 0.86 }}
          transition={MOLA}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grafite-carta text-creme"
        >
          <span className="text-xl leading-none">+</span>
          {quantidade > 0 ? (
            <span
              key={quantidade}
              className="animate-marca absolute -right-1.5 -top-1.5 flex h-[24px] min-w-[24px] items-center justify-center rounded-full bg-laranja px-1.5 font-sans text-xs font-extrabold tabular-nums text-creme ring-2 ring-white"
            >
              {quantidade}
            </span>
          ) : null}
        </m.button>
      ) : null}
    </div>
  );
}

/**
 * A linha do carrinho, como se mostra.
 *
 * O nome guardado na linha é o que vai para a cozinha, e é esse que se
 * mostra. Um prato que já não esteja no cardápio fica com o nome que
 * tinha quando foi pedido.
 */
function mostrarLinha(linha: LinhaCarrinho) {
  return { nome: linha.nome, opcoes: descreverOpcoes(linha) };
}

function LinhaResumo({
  linha,
  mostrada,
  aoAlterar,
}: {
  linha: LinhaCarrinho;
  mostrada: { nome: string; opcoes: string[] };
  aoAlterar: (delta: number) => void;
}) {
  const { t } = useIdioma();
  return (
    <m.li
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.22, ease: ASSINATURA }}
      className="flex items-start gap-3 overflow-hidden py-3.5"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-snug">{mostrada.nome}</p>
        {mostrada.opcoes.map((texto) => (
          <p key={texto} className="mt-0.5 font-sans text-xs text-tenue-escuro">
            {texto}
          </p>
        ))}
        {linha.obs ? (
          <p className="mt-0.5 font-sans text-xs text-tenue-escuro">↳ {linha.obs}</p>
        ) : null}
        <p className="mt-1 font-sans text-xs text-tenue-escuro">{t('cada', { preco: formatarKz(linha.preco) })}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <SeletorQuantidade valor={linha.qtd} aoAlterar={aoAlterar} rotulo={mostrada.nome} compacto />
        <span className="w-[86px] text-right font-sans text-sm font-extrabold">
          {formatarKz(linha.preco * linha.qtd)}
        </span>
      </div>
    </m.li>
  );
}

export function SeletorQuantidade({
  valor,
  aoAlterar,
  rotulo,
  compacto = false,
}: {
  valor: number;
  aoAlterar: (delta: number) => void;
  rotulo: string;
  compacto?: boolean;
}) {
  // O compacto desenha 28 px, mas o alvo tem 44: o pseudo-elemento alarga
  // a zona de toque sem alargar o botao. Um dedo nao acerta em 28.
  const { t } = useIdioma();
  const tamanho = compacto
    ? "relative h-7 w-7 text-sm after:absolute after:-inset-2 after:content-['']"
    : 'h-11 w-11 text-lg';
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aoAlterar(-1)}
        aria-label={t('menosUm', { nome: rotulo })}
        className={cn(
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-creme/30',
          tamanho,
        )}
      >
        −
      </button>
      <span
        className={cn(
          'text-center font-sans font-bold tabular-nums',
          compacto ? 'w-6 text-sm' : 'w-9 text-base',
        )}
      >
        {valor}
      </span>
      <button
        type="button"
        onClick={() => aoAlterar(1)}
        aria-label={t('maisUm', { nome: rotulo })}
        className={cn(
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-creme/30',
          tamanho,
        )}
      >
        +
      </button>
    </div>
  );
}

function FolhaPrato({
  prato,
  agora,
  aoFechar,
  aoConfirmar,
}: {
  prato: Prato | null;
  agora: number;
  aoFechar: () => void;
  aoConfirmar: (prato: Prato, qtd: number, obs: string, escolha: Escolha) => void;
}) {
  const { t } = useIdioma();
  const [qtd, setQtd] = React.useState(1);
  const [obs, setObs] = React.useState('');
  const [escolhidas, setEscolhidas] = React.useState<string[]>([]);
  const [tentou, setTentou] = React.useState(false);

  // Prato novo, folha limpa. Pelo id, e não pelo objecto: o objecto muda
  // de minuto a minuto (o relógio das promoções), e a escolha do cliente
  // não pode desaparecer a meio.
  React.useEffect(() => {
    if (!prato) return;
    setQtd(1);
    setObs('');
    setTentou(false);
    // O tamanho já vem escolhido quando só há um disponível.
    const variante = prato.grupos?.find((g) => g.tipo === 'variante');
    const disponiveis = variante?.opcoes.filter((o) => o.disponivel) ?? [];
    setEscolhidas(disponiveis.length === 1 ? [disponiveis[0].id] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prato?.id]);

  if (!prato) return null;

  const conta = contarLinha(prato, escolhidas, agora);
  const grupos = [...(prato.grupos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const esgotado = !prato.disponivel;
  const nome = prato.nome;
  const descricao = prato.descricao;

  /** O erro da escolha, na língua do cliente. */
  function erroDaEscolha() {
    if (conta.ok) return null;
    const grupo = conta.grupo ? conta.grupo.nome.toLowerCase() : '';
    switch (conta.codigo) {
      case 'escolha':
        return t('erroEscolha', { grupo });
      case 'minimo':
        return t('erroMinimo', { grupo, n: conta.n ?? 1 });
      case 'maximo':
        return t('erroMaximo', { grupo, n: conta.n ?? 1 });
      case 'opcao_esgotada':
        return t('erroOpcaoEsgotada', { grupo });
      default:
        return t('erroOpcao');
    }
  }

  function alternar(grupoId: string, opcaoId: string) {
    const grupo = grupos.find((g) => g.id === grupoId);
    if (!grupo) return;
    const doGrupo = new Set(grupo.opcoes.map((o) => o.id));

    setEscolhidas((actuais) => {
      if (grupo.maximo === 1) {
        // Escolha única: trocar é tirar a outra deste grupo.
        const fora = actuais.filter((id) => !doGrupo.has(id));
        return actuais.includes(opcaoId) && grupo.minimo === 0 ? fora : [...fora, opcaoId];
      }
      if (actuais.includes(opcaoId)) return actuais.filter((id) => id !== opcaoId);
      const noGrupo = actuais.filter((id) => doGrupo.has(id)).length;
      if (noGrupo >= grupo.maximo) return actuais;
      return [...actuais, opcaoId];
    });
  }

  function confirmar() {
    if (!prato) return;
    if (!conta.ok) {
      setTentou(true);
      return;
    }
    aoConfirmar(prato, qtd, obs, { opcaoIds: escolhidas, unitario: conta.unitario, opcoes: conta.opcoes });
  }

  return (
    <FolhaInferior aberta={Boolean(prato)} aoFechar={aoFechar} titulo={nome}>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <div className="relative mx-4 mt-2 aspect-[16/10] shrink-0 overflow-hidden rounded-cartao bg-creme/5">
          <FotoPrato
            nome={nome}
            url={prato.foto_url}
            tamanhos="(max-width: 600px) 92vw, 540px"
          />
        </div>

        <div className="px-5 pb-6 pt-5">
          <h2 className="font-display text-2xl leading-tight">{nome}</h2>
          {descricao ? (
            <p className="mt-2 font-sans text-sm leading-normal text-tenue-escuro">
              {descricao}
            </p>
          ) : null}
          <p className="mt-3 text-xl">
            <Preco prato={prato} agora={agora} />
          </p>

          {grupos.map((grupo) => {
            const noGrupo = escolhidas.filter((id) => grupo.opcoes.some((o) => o.id === id)).length;
            const emFalta = tentou && noGrupo < grupo.minimo;
            const unico = grupo.maximo === 1;
            const legenda = grupo.minimo > 0
              ? unico
                ? t('obrigatorio')
                : grupo.maximo > grupo.minimo
                  ? t('escolhaNaM', { min: grupo.minimo, max: grupo.maximo })
                  : t('escolhaN', { min: grupo.minimo })
              : unico
                ? t('opcionalTitulo')
                : t('ateN', { max: grupo.maximo });

            return (
              <fieldset key={grupo.id} className="mt-6">
                <legend className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-sans text-sm font-semibold text-creme">{grupo.nome}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-sans text-xs font-semibold',
                      emFalta ? 'bg-[#b4402f] text-white' : 'bg-creme/[0.06] text-tenue-escuro',
                    )}
                  >
                    {legenda}
                  </span>
                </legend>

                <div className="mt-2.5 flex flex-col gap-2">
                  {[...grupo.opcoes].sort((a, b) => a.ordem - b.ordem).map((opcao) => {
                    const marcada = escolhidas.includes(opcao.id);
                    const cheio = !unico && !marcada && noGrupo >= grupo.maximo;
                    const indisponivel = !opcao.disponivel;
                    return (
                      <label
                        key={opcao.id}
                        className={cn(
                          'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-campo border px-3.5 py-2.5 transition-colors duration-200',
                          marcada ? 'border-grafite bg-creme/[0.04]' : 'border-creme/15 hover:border-creme/35',
                          (indisponivel || cheio) && 'cursor-not-allowed opacity-45',
                          'focus-within:ring-2 focus-within:ring-laranja/40',
                        )}
                      >
                        <input
                          type={unico ? 'radio' : 'checkbox'}
                          name={`grupo-${grupo.id}`}
                          checked={marcada}
                          disabled={indisponivel || cheio}
                          onChange={() => alternar(grupo.id, opcao.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors duration-150',
                            unico ? 'rounded-full' : 'rounded-[6px]',
                            marcada ? 'border-grafite bg-grafite' : 'border-creme/30 bg-white',
                          )}
                        >
                          {marcada ? (
                            unico ? (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            ) : (
                              <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
                                <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 font-sans text-sm text-creme">
                          {opcao.nome}
                          {indisponivel ? <span className="ml-2 text-xs text-tenue-escuro">{t('esgotado')}</span> : null}
                        </span>
                        <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-tenue-escuro">
                          {grupo.tipo === 'variante'
                            ? formatarKz(opcao.preco)
                            : opcao.preco > 0
                              ? `+${formatarKz(opcao.preco)}`
                              : t('gratis')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div className="mt-6">
            <label
              htmlFor="obs-prato"
              className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-creme"
            >
              <MessageSquareText className="h-4 w-4 shrink-0 text-laranja-escuro" aria-hidden />
              {t('obsPrato')}
              <span className="font-normal text-tenue-escuro">· {t('opcional')}</span>
            </label>
            <AreaTexto
              id="obs-prato"
              claro
              rows={2}
              maxLength={140}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder={t('obsPratoExemplo')}
            />
          </div>

          {tentou && !conta.ok ? (
            <p role="alert" className="mt-4 font-sans text-sm font-semibold text-[#b4402f]">
              {erroDaEscolha()}
            </p>
          ) : null}
        </div>
      </div>

      {/*
        O botão fica preso ao fundo da folha, e o preço dentro dele muda à
        medida que se escolhe. Com opções, a folha fica comprida; o botão
        não pode fugir para baixo do ecrã.
      */}
      <div className="flex shrink-0 items-center gap-4 border-t border-linha-escura bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <SeletorQuantidade
          valor={qtd}
          aoAlterar={(d) => setQtd((q) => Math.min(30, Math.max(1, q + d)))}
          rotulo={nome}
        />
        <Botao
          variante="grafite"
          tamanho="lg"
          className="flex-1"
          disabled={esgotado}
          onClick={confirmar}
          aria-live="polite"
        >
          {esgotado ? (
            t('esgotadoBotao')
          ) : (
            <>
              {t('juntar')} ·{' '}
              <AnimatePresence initial={false} mode="wait">
                <m.span
                  key={conta.ok ? conta.unitario * qtd : 'x'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block tabular-nums"
                >
                  {conta.ok ? formatarKz(conta.unitario * qtd) : formatarKz(precoDeMontra(prato, agora).agora * qtd)}
                </m.span>
              </AnimatePresence>
            </>
          )}
        </Botao>
      </div>
    </FolhaInferior>
  );
}
