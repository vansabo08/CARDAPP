'use client';

import * as React from 'react';
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

  /* Barra de categorias: segue a seccao que esta a ser lida. */
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
      { rootMargin: '-124px 0px -62% 0px', threshold: 0 },
    );

    nos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [categorias]);

  /* A pilula activa acompanha a leitura sem obrigar a arrastar. */
  React.useEffect(() => {
    pilulas.current[activa]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activa]);

  function irPara(id: string) {
    const no = seccoes.current[id];
    if (!no) return;
    const topo = no.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({ top: topo, behavior: 'smooth' });
  }

  async function enviarPedido() {
    if (!carrinho.linhas.length || aEnviar) return;
    setAEnviar(true);

    const itens = carrinho.linhas.map(({ nome, qtd, preco, obs }) => ({ nome, qtd, preco, obs }));
    const pedido = { restaurante: restaurante.nome, mesa, itens, total: carrinho.total };
    const url = buildWhatsAppUrl(restaurante.whatsapp, pedido);

    // Gravamos sem esperar pela resposta: o que interessa ao cliente e
    // chegar ao WhatsApp. Se a gravacao falhar, o pedido segue na mesma.
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

  return (
    <div className="min-h-dvh bg-grafite">
      {/* ---------------------------------------------------------- */}
      {/* Cabeçalho                                                    */}
      {/* ---------------------------------------------------------- */}
      <header className="px-5 pb-9 pt-7">
        <div className="mx-auto flex max-w-[560px] items-center gap-3">
          <Logotipo restaurante={restaurante} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[20px] leading-tight text-creme">
              {restaurante.nome}
            </h1>
            <p className="font-sans text-[12.5px] text-tenue">Cardápio</p>
          </div>
          {mesa != null ? (
            <span
              className="etiqueta shrink-0 rounded-full px-3 py-1.5 text-grafite"
              style={{ backgroundColor: restaurante.cor_marca || '#C9A227' }}
            >
              Mesa {numeroMesa(mesa)}
            </span>
          ) : null}
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Folha do cardápio                                            */}
      {/* ---------------------------------------------------------- */}
      <div
        data-superficie="clara"
        className="min-h-[70dvh] rounded-t-[20px] bg-creme pb-40 text-grafite"
      >
        {/* barra de categorias */}
        <div className="sticky top-0 z-30 -mt-px rounded-t-[20px] bg-creme/95 backdrop-blur-sm">
          <div
            className="barra-esconde mx-auto flex max-w-[560px] gap-2 overflow-x-auto px-5 py-3.5"
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
                    'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-[13px] font-semibold transition-colors duration-200',
                    activaAgora
                      ? 'bg-grafite text-creme'
                      : 'border border-linha-escura text-tenue-escuro hover:border-grafite/25',
                  )}
                >
                  {categoria.nome}
                </button>
              );
            })}
          </div>
          <div className="mx-auto h-px max-w-[560px] bg-linha-escura" />
        </div>

        {/* lista */}
        <div className="mx-auto max-w-[560px] px-5">
          {categorias.map((categoria) => (
            <section
              key={categoria.id}
              data-categoria={categoria.id}
              ref={(n) => {
                seccoes.current[categoria.id] = n;
              }}
              className="scroll-mt-28 pt-9"
            >
              <h2 className="font-display text-[24px] leading-none text-grafite">{categoria.nome}</h2>

              <ul className="mt-5 flex flex-col">
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
          'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3',
          'bg-gradient-to-t from-grafite via-grafite/95 to-transparent',
          'transition-[opacity,transform] duration-[240ms] ease-out',
          temCarrinho ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <div className="mx-auto flex max-w-[560px] items-center gap-3">
          <button
            type="button"
            onClick={() => setResumoAberto(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-linha bg-grafite-alto px-4 py-3 text-left transition-colors duration-200 hover:border-creme/25"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ouro font-sans text-[13px] font-bold text-grafite">
              {carrinho.quantidadeTotal}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[11px] text-tenue">Ver pedido</span>
              <span className="block truncate font-sans text-[16px] font-bold text-creme">
                {formatarKz(carrinho.total)}
              </span>
            </span>
          </button>

          <Botao
            variante="verde"
            tamanho="lg"
            onClick={enviarPedido}
            disabled={aEnviar}
            className="shrink-0"
          >
            {aEnviar ? 'A abrir…' : 'Enviar pedido'}
          </Botao>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Folha do prato                                               */}
      {/* ---------------------------------------------------------- */}
      <FolhaPrato
        prato={pratoAberto}
        aoFechar={() => setPratoAberto(null)}
        aoConfirmar={(prato, qtd, obs) => {
          carrinho.adicionar(prato, qtd, obs);
          setPratoAberto(null);
        }}
      />

      {/* ---------------------------------------------------------- */}
      {/* Folha do resumo                                              */}
      {/* ---------------------------------------------------------- */}
      <FolhaInferior
        aberta={resumoAberto}
        aoFechar={() => setResumoAberto(false)}
        titulo="Resumo do pedido"
      >
        <div className="flex min-h-0 flex-col overflow-y-auto px-5 pb-6 pt-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[24px]">O seu pedido</h2>
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
            <span className="font-sans text-[22px] font-bold">{formatarKz(carrinho.total)}</span>
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

function Logotipo({ restaurante }: { restaurante: Restaurante }) {
  const iniciais = restaurante.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  if (restaurante.logo_url) {
    return (
      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full border border-linha">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={restaurante.logo_url}
          alt={restaurante.nome}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-linha font-display text-[15px]"
      style={{ color: restaurante.cor_marca || '#C9A227' }}
    >
      {iniciais}
    </span>
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
        'flex items-start gap-4 border-b border-linha-escura py-4',
        esgotado && 'opacity-45',
      )}
    >
      <button
        type="button"
        onClick={aoAbrir}
        disabled={esgotado}
        aria-label={prato.nome}
        className="relative block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[12px] bg-grafite/5"
      >
        <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="76px" />
      </button>

      <button
        type="button"
        onClick={aoAbrir}
        disabled={esgotado}
        className="min-w-0 flex-1 text-left"
      >
        <p className="font-display text-[17px] leading-snug text-grafite">{prato.nome}</p>
        {prato.descricao ? (
          <p className="mt-1 font-sans text-[13.5px] leading-[1.45] text-tenue-escuro">
            {prato.descricao}
          </p>
        ) : null}
        <p className="mt-2 font-sans text-[15px] font-bold text-grafite">
          {formatarKz(prato.preco)}
          {esgotado ? (
            <span className="ml-2 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-tenue-escuro">
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
          className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grafite text-creme transition-transform duration-200 ease-calmo active:scale-95"
        >
          <span className="text-[18px] leading-none">+</span>
          {quantidade > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ouro px-1 font-sans text-[10px] font-bold text-grafite">
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
        <p className="mt-1 font-sans text-[13px] text-tenue-escuro">
          {formatarKz(linha.preco)} cada
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <SeletorQuantidade
          valor={linha.qtd}
          aoAlterar={aoAlterar}
          rotulo={linha.nome}
          compacto
        />
        <span className="w-[86px] text-right font-sans text-[15px] font-bold">
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
  const tamanho = compacto ? 'h-7 w-7 text-[15px]' : 'h-10 w-10 text-[19px]';
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aoAlterar(-1)}
        aria-label={`Menos um ${rotulo}`}
        className={cn(
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-grafite/30',
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
          'flex items-center justify-center rounded-full border border-linha-escura leading-none transition-colors duration-200 hover:border-grafite/30',
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
        <div className="relative mx-5 mt-2 aspect-[16/10] overflow-hidden rounded-[12px] bg-grafite/5">
          <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="(max-width: 560px) 92vw, 520px" />
        </div>

        <div className="px-5 pb-6 pt-5">
          <h2 className="font-display text-[26px] leading-tight">{prato.nome}</h2>
          {prato.descricao ? (
            <p className="mt-2 font-sans text-[15px] leading-[1.55] text-tenue-escuro">
              {prato.descricao}
            </p>
          ) : null}
          <p className="mt-4 font-sans text-[20px] font-bold">{formatarKz(prato.preco)}</p>

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
