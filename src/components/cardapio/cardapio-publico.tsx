'use client';

import * as React from 'react';
import Image from 'next/image';
import { Botao } from '@/components/ui/botao';
import { FolhaInferior } from '@/components/ui/folha-inferior';
import { AreaTexto } from '@/components/ui/campo';
import { AssinaturaCardapp } from '@/components/marca';
import { FotoPrato } from '@/components/prato-visual';
import { formatarKz, numeroMesa } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import type { CategoriaComPratos, Prato, Restaurante } from '@/lib/tipos';
import { useCarrinho, type LinhaCarrinho } from './carrinho';

export function CardapioPublico({
  restaurante,
  categorias,
  mesa,
  tableId,
  marcaVisivel,
}: {
  restaurante: Restaurante;
  categorias: CategoriaComPratos[];
  mesa: number | null;
  tableId: string | null;
  marcaVisivel: boolean;
}) {
  const carrinho = useCarrinho();
  const [pratoAberto, setPratoAberto] = React.useState<Prato | null>(null);
  const [resumoAberto, setResumoAberto] = React.useState(false);
  const [aEnviar, setAEnviar] = React.useState(false);
  const [activa, setActiva] = React.useState(categorias[0]?.id ?? '');

  const seccoes = React.useRef<Record<string, HTMLElement | null>>({});
  const pilulas = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const todos = React.useMemo(() => categorias.flatMap((c) => c.itens), [categorias]);
  const capa = todos.find((i) => i.foto_url)?.foto_url ?? null;
  const destaques = React.useMemo(
    () => todos.filter((i) => i.disponivel && i.foto_url).slice(0, 6),
    [todos],
  );

  /* Barra de categorias: segue a secção que está a ser lida. */
  React.useEffect(() => {
    const nos = categorias
      .map((c) => seccoes.current[c.id])
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nos.length || typeof IntersectionObserver === 'undefined') return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel?.target instanceof HTMLElement) {
          const id = visivel.target.dataset.categoria;
          if (id) setActiva(id);
        }
      },
      { rootMargin: '-120px 0px -62% 0px', threshold: 0 },
    );

    nos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [categorias]);

  React.useEffect(() => {
    pilulas.current[activa]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activa]);

  function irPara(id: string) {
    const no = seccoes.current[id];
    if (!no) return;
    window.scrollTo({ top: no.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  async function enviarPedido() {
    if (!carrinho.linhas.length || aEnviar) return;
    setAEnviar(true);

    const itens = carrinho.linhas.map(({ nome, qtd, preco, obs }) => ({ nome, qtd, preco, obs }));
    const pedido = { restaurante: restaurante.nome, mesa, itens, total: carrinho.total };
    const url = buildWhatsAppUrl(restaurante.whatsapp, pedido);

    // Gravamos sem esperar pela resposta: o que interessa ao cliente é
    // chegar ao WhatsApp. Se a gravação falhar, o pedido segue na mesma.
    try {
      fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          slug: restaurante.slug,
          table_id: tableId,
          itens,
          total: carrinho.total,
        }),
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

  const temCarrinho = carrinho.quantidadeTotal > 0;
  const cor = restaurante.cor_marca || '#D9B36B';

  return (
    <div className="min-h-dvh bg-grafite">
      {/* ---------------------------------------------------------- */}
      {/* Herói                                                        */}
      {/* ---------------------------------------------------------- */}
      <header className="relative isolate">
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[300px]">
          {capa ? (
            <Image
              src={capa}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              aria-hidden
            />
          ) : (
            <div className="absolute inset-0 bg-grafite-alto" />
          )}
          <div className="veu-foto absolute inset-0" />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-9">
          <div className="mx-auto flex max-w-[600px] items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="etiqueta" style={{ color: cor }}>
                Cardápio
              </p>
              <h1 className="ouro-display mt-2 font-display text-[34px] leading-[1.04] tracking-[-0.02em] sm:text-[40px]">
                {restaurante.nome}
              </h1>
            </div>

            {mesa != null ? (
              <span
                className="etiqueta shrink-0 rounded-full px-3.5 py-2 text-grafite"
                style={{ backgroundColor: cor }}
              >
                Mesa {numeroMesa(mesa)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Folha do cardápio                                            */}
      {/* ---------------------------------------------------------- */}
      <div
        data-superficie="clara"
        className="relative z-10 -mt-5 min-h-[70dvh] rounded-t-folha pb-40"
      >
        <div className="sticky top-0 z-30 rounded-t-folha bg-creme-folha/95 backdrop-blur-md">
          <div className="flex justify-center pt-3">
            <span className="block h-[4px] w-[38px] rounded-full bg-grafite/10" />
          </div>
          <div
            className="barra-esconde mx-auto flex max-w-[600px] gap-2 overflow-x-auto px-5 py-3"
            role="tablist"
            aria-label="Categorias"
          >
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
                    'shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-sans text-[13px] font-semibold transition-colors duration-200',
                    activaAgora
                      ? 'bg-grafite-carta text-creme'
                      : 'border border-linha-escura text-tenue-escuro hover:border-grafite/22',
                  )}
                >
                  {categoria.nome}
                </button>
              );
            })}
          </div>
          <div className="mx-auto h-px max-w-[600px] bg-linha-escura" />
        </div>

        {/* fila de destaques, no registo dos cartões da referência */}
        {destaques.length >= 3 ? (
          <section className="pt-7">
            <div className="mx-auto max-w-[600px] px-5">
              <h2 className="font-sans text-[19px] font-extrabold tracking-[-0.02em] text-grafite">
                Mais pedidos
              </h2>
            </div>
            <div className="barra-esconde mt-4 flex gap-3 overflow-x-auto px-5 pb-1 [scroll-padding-left:20px] [scroll-snap-type:x_mandatory] sm:mx-auto sm:max-w-[600px]">
              {destaques.map((prato) => (
                <CartaoDestaque
                  key={prato.id}
                  prato={prato}
                  aoAbrir={() => setPratoAberto(prato)}
                />
              ))}
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
              <h2 className="font-sans text-[19px] font-extrabold tracking-[-0.02em] text-grafite">
                {categoria.nome}
              </h2>

              <ul className="mt-4 flex flex-col">
                {categoria.itens.map((prato) => (
                  <li key={prato.id}>
                    <LinhaPrato
                      prato={prato}
                      quantidade={carrinho.quantidadeDoPrato(prato.id)}
                      aoAbrir={() => prato.disponivel && setPratoAberto(prato)}
                      aoAdicionar={() => carrinho.adicionar(prato, 1)}
                    />
                  </li>
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
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8',
          'bg-gradient-to-t from-grafite via-grafite/92 to-transparent',
          'transition-[opacity,transform] duration-[240ms] ease-out',
          temCarrinho ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <div className="mx-auto flex max-w-[600px] items-center gap-2.5">
          <button
            type="button"
            onClick={() => setResumoAberto(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-linha bg-grafite-alto py-2.5 pl-2.5 pr-4 text-left transition-colors duration-200 hover:border-creme/22"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ouro font-sans text-[14px] font-bold text-grafite">
              {carrinho.quantidadeTotal}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[10.5px] uppercase tracking-[0.14em] text-tenue">
                Ver pedido
              </span>
              <span className="block truncate font-sans text-[16px] font-bold text-creme">
                {formatarKz(carrinho.total)}
              </span>
            </span>
          </button>

          <Botao variante="verde" tamanho="lg" onClick={enviarPedido} disabled={aEnviar} className="shrink-0">
            {aEnviar ? 'A abrir…' : 'Enviar pedido'}
          </Botao>
        </div>
      </div>

      <FolhaPrato
        prato={pratoAberto}
        aoFechar={() => setPratoAberto(null)}
        aoConfirmar={(prato, qtd, obs) => {
          carrinho.adicionar(prato, qtd, obs);
          setPratoAberto(null);
        }}
      />

      <FolhaInferior
        aberta={resumoAberto}
        aoFechar={() => setResumoAberto(false)}
        titulo="Resumo do pedido"
      >
        <div className="flex min-h-0 flex-col overflow-y-auto px-5 pb-6 pt-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[26px]">O seu pedido</h2>
            {mesa != null ? (
              <span className="etiqueta text-tenue-escuro">Mesa {numeroMesa(mesa)}</span>
            ) : null}
          </div>

          <ul className="mt-5 flex flex-col divide-y divide-linha-escura">
            {carrinho.linhas.map((linha) => (
              <LinhaResumo
                key={linha.id}
                linha={linha}
                aoAlterar={(d) => carrinho.alterarQuantidade(linha.id, d)}
              />
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-linha-escura pt-5">
            <span className="etiqueta text-tenue-escuro">Total</span>
            <span className="font-sans text-[24px] font-extrabold tracking-[-0.02em]">
              {formatarKz(carrinho.total)}
            </span>
          </div>

          <p className="mt-3 font-sans text-[13px] text-tenue-escuro">
            O pedido segue para o WhatsApp do restaurante. O pagamento é feito na mesa.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Botao variante="verde" tamanho="lg" largo onClick={enviarPedido} disabled={aEnviar}>
              {aEnviar ? 'A abrir o WhatsApp…' : 'Enviar pedido pelo WhatsApp'}
            </Botao>
            <Botao variante="discreto-escuro" tamanho="md" largo onClick={() => setResumoAberto(false)}>
              Continuar a escolher
            </Botao>
          </div>
        </div>
      </FolhaInferior>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CartaoDestaque({ prato, aoAbrir }: { prato: Prato; aoAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="w-[168px] shrink-0 overflow-hidden rounded-cartao bg-grafite-carta text-left shadow-cartao [scroll-snap-align:start] transition-transform duration-200 ease-calmo active:scale-[0.98]"
    >
      <span className="relative block aspect-[4/3] w-full">
        <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="256px" />
      </span>
      <span className="block px-3.5 pb-3.5 pt-3">
        <span className="block truncate font-display text-[15px] leading-tight text-creme">
          {prato.nome}
        </span>
        {prato.descricao ? (
          <span className="mt-0.5 block truncate font-sans text-[11.5px] text-tenue">
            {prato.descricao}
          </span>
        ) : null}
        <span className="mt-2 block font-sans text-[16px] font-extrabold tracking-[-0.02em] text-creme">
          {formatarKz(prato.preco)}
        </span>
      </span>
    </button>
  );
}

function LinhaPrato({
  prato,
  quantidade,
  aoAbrir,
  aoAdicionar,
}: {
  prato: Prato;
  quantidade: number;
  aoAbrir: () => void;
  aoAdicionar: () => void;
}) {
  const esgotado = !prato.disponivel;

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
        aria-label={prato.nome}
        className="relative block h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[16px] bg-grafite/5"
      >
        <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="128px" />
      </button>

      <button type="button" onClick={aoAbrir} disabled={esgotado} className="min-w-0 flex-1 text-left">
        <p className="font-display text-[17px] leading-snug text-grafite">{prato.nome}</p>
        {prato.descricao ? (
          <p className="mt-1 line-clamp-2 font-sans text-[13px] leading-[1.45] text-tenue-escuro">
            {prato.descricao}
          </p>
        ) : null}
        <p className="mt-1.5 font-sans text-[15.5px] font-extrabold tracking-[-0.02em] text-grafite">
          {formatarKz(prato.preco)}
          {esgotado ? (
            <span className="ml-2 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-tenue-escuro">
              esgotado
            </span>
          ) : null}
        </p>
      </button>

      {!esgotado ? (
        <button
          type="button"
          onClick={aoAdicionar}
          aria-label={`Adicionar ${prato.nome}`}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grafite-carta text-creme transition-transform duration-200 ease-calmo active:scale-95"
        >
          <span className="text-[19px] leading-none">+</span>
          {quantidade > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-ouro px-1 font-sans text-[10px] font-bold text-grafite">
              {quantidade}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

function LinhaResumo({
  linha,
  aoAlterar,
}: {
  linha: LinhaCarrinho;
  aoAlterar: (delta: number) => void;
}) {
  return (
    <li className="flex items-start gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[16px] leading-snug">{linha.nome}</p>
        {linha.obs ? (
          <p className="mt-0.5 font-sans text-[12.5px] text-tenue-escuro">↳ {linha.obs}</p>
        ) : null}
        <p className="mt-1 font-sans text-[13px] text-tenue-escuro">{formatarKz(linha.preco)} cada</p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <SeletorQuantidade valor={linha.qtd} aoAlterar={aoAlterar} rotulo={linha.nome} compacto />
        <span className="w-[86px] text-right font-sans text-[15px] font-extrabold">
          {formatarKz(linha.preco * linha.qtd)}
        </span>
      </div>
    </li>
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
  const tamanho = compacto ? 'h-7 w-7 text-[15px]' : 'h-11 w-11 text-[19px]';
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aoAlterar(-1)}
        aria-label={`Menos um ${rotulo}`}
        className={cn(
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-grafite/28',
          tamanho,
        )}
      >
        −
      </button>
      <span
        className={cn(
          'text-center font-sans font-bold tabular-nums',
          compacto ? 'w-6 text-[14px]' : 'w-9 text-[17px]',
        )}
      >
        {valor}
      </span>
      <button
        type="button"
        onClick={() => aoAlterar(1)}
        aria-label={`Mais um ${rotulo}`}
        className={cn(
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-grafite/28',
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
  aoFechar,
  aoConfirmar,
}: {
  prato: Prato | null;
  aoFechar: () => void;
  aoConfirmar: (prato: Prato, qtd: number, obs: string) => void;
}) {
  const [qtd, setQtd] = React.useState(1);
  const [obs, setObs] = React.useState('');

  React.useEffect(() => {
    if (prato) {
      setQtd(1);
      setObs('');
    }
  }, [prato]);

  if (!prato) return null;

  return (
    <FolhaInferior aberta={Boolean(prato)} aoFechar={aoFechar} titulo={prato.nome}>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <div className="relative mx-4 mt-2 aspect-[16/10] overflow-hidden rounded-cartao bg-grafite/5">
          <FotoPrato
            nome={prato.nome}
            url={prato.foto_url}
            tamanhos="(max-width: 600px) 92vw, 540px"
          />
        </div>

        <div className="px-5 pb-6 pt-5">
          <h2 className="font-display text-[27px] leading-tight">{prato.nome}</h2>
          {prato.descricao ? (
            <p className="mt-2 font-sans text-[15px] leading-[1.55] text-tenue-escuro">
              {prato.descricao}
            </p>
          ) : null}
          <p className="mt-4 font-sans text-[21px] font-extrabold tracking-[-0.02em]">
            {formatarKz(prato.preco)}
          </p>

          <div className="mt-6">
            <label htmlFor="obs-prato" className="etiqueta mb-2 block text-tenue-escuro">
              Alguma observação?
            </label>
            <AreaTexto
              id="obs-prato"
              claro
              rows={2}
              maxLength={140}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="sem cebola, bem passado, para partilhar…"
            />
          </div>

          <div className="mt-6 flex items-center gap-4">
            <SeletorQuantidade
              valor={qtd}
              aoAlterar={(d) => setQtd((q) => Math.min(30, Math.max(1, q + d)))}
              rotulo={prato.nome}
            />
            <Botao
              variante="grafite"
              tamanho="lg"
              className="flex-1"
              onClick={() => aoConfirmar(prato, qtd, obs)}
            >
              Juntar · {formatarKz(prato.preco * qtd)}
            </Botao>
          </div>
        </div>
      </div>
    </FolhaInferior>
  );
}
