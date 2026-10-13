'use client';

import * as React from 'react';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { Campo, Erro } from '@/components/ui/campo';
import { qrDataUrl, urlDaMesa } from '@/lib/qr';
import { nomeDaMesa, numeroMesa } from '@/lib/format';
import { LIMITES_PLANO, type Mesa, type Restaurante } from '@/lib/tipos';
import { apagarMesa, definirTotalDeMesas, renomearMesa } from '@/app/painel/mesas/accoes';
import { cn } from '@/lib/utils';

/**
 * As mesas da casa e os cartões que vão para cima delas.
 *
 * TRÊS COISAS QUE MUDARAM, E PORQUÊ:
 *
 * 1. PERGUNTA-SE QUANTAS MESAS A CASA TEM, e não quantas juntar. É a
 *    pergunta que o dono sabe responder sem fazer contas; "juntar 6"
 *    obrigava-o a saber quantas já lá estavam.
 *
 * 2. ESCOLHE-SE QUAIS OS CARTÕES A IMPRIMIR. Imprimir as trinta mesas
 *    porque se partiu o cartão da nove é papel deitado fora — e numa
 *    casa que imprime em loja, é uma viagem.
 *
 * 3. CADA MESA PODE TER NOME. "Esplanada 1" diz mais do que "Mesa 12"
 *    a quem está a servir.
 */
export function GestorMesas({
  restaurante,
  mesasIniciais,
  base,
  demonstracao,
}: {
  restaurante: Restaurante;
  mesasIniciais: Mesa[];
  base: string;
  demonstracao: boolean;
}) {
  const [mesas, setMesas] = React.useState(mesasIniciais);
  const [total, setTotal] = React.useState(String(mesasIniciais.length));
  const [aGuardarTotal, setAGuardarTotal] = React.useState(false);
  const [aGerar, setAGerar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sinal, sinalizar] = useSinalDeBotao();

  /** As mesas que vão no PDF. Vazio é tratado como "todas". */
  const [escolhidas, setEscolhidas] = React.useState<Set<string>>(new Set());

  const limite = LIMITES_PLANO[restaurante.plano].mesas;

  const paraImprimir = escolhidas.size
    ? mesas.filter((m) => escolhidas.has(m.id))
    : mesas;

  function alternar(id: string) {
    setEscolhidas((antes) => {
      const nova = new Set(antes);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  async function guardarTotal() {
    setErro(null);
    const n = Math.max(0, Math.min(200, Number.parseInt(total, 10) || 0));
    setTotal(String(n));

    if (n === mesas.length) return;
    if (n > limite) {
      setErro(`O plano actual permite ${limite} ${limite === 1 ? 'mesa' : 'mesas'}.`);
      return;
    }

    setAGuardarTotal(true);
    try {
      const resultado = await definirTotalDeMesas(n);

      if (resultado.mesas) {
        setMesas(resultado.mesas.sort((a, b) => a.numero - b.numero));
      } else if (resultado.demonstracao) {
        // Demonstração: as mesas existem só no ecrã.
        setMesas((m) =>
          n <= m.length
            ? m.slice(0, n)
            : [
                ...m,
                ...Array.from({ length: n - m.length }, (_, i) => ({
                  id: `demo-${m.length + i + 1}`,
                  restaurant_id: restaurante.id,
                  numero: m.length + i + 1,
                  qr_token: `demo${m.length + i + 1}`,
                  nome: null,
                })),
              ],
        );
      }

      if (resultado.erro) setErro(resultado.erro);
      else sinalizar('sucesso');
    } finally {
      setAGuardarTotal(false);
    }
  }

  async function remover(id: string) {
    const mesa = mesas.find((m) => m.id === id);
    setMesas((m) => m.filter((x) => x.id !== id));
    setTotal((t) => String(Math.max(0, Number.parseInt(t, 10) - 1)));

    const resultado = await apagarMesa(id);
    if (resultado.erro && mesa) {
      // A base recusou — a mesa tem pedidos. Volta para a lista.
      setMesas((m) => [...m, mesa].sort((a, b) => a.numero - b.numero));
      setTotal((t) => String(Number.parseInt(t, 10) + 1));
      setErro(`A ${nomeDaMesa(mesa)} já tem pedidos e por isso não se apaga.`);
    }
  }

  function mudarNome(id: string, nome: string) {
    setMesas((m) => m.map((x) => (x.id === id ? { ...x, nome } : x)));
  }

  async function gravarNome(id: string, nome: string) {
    const resultado = await renomearMesa(id, nome);
    if (resultado.erro) setErro(resultado.erro);
  }

  async function descarregar() {
    if (!paraImprimir.length) return;
    setAGerar(true);
    setErro(null);
    try {
      // O jsPDF só entra no telemóvel de quem carrega no botão.
      const { gerarCartoesPdf } = await import('@/lib/cartoes-pdf');
      const blob = await gerarCartoesPdf(restaurante, paraImprimir, base);
      const url = URL.createObjectURL(blob);
      const ligacao = document.createElement('a');
      ligacao.href = url;
      ligacao.download = `cartoes-${restaurante.slug}.pdf`;
      document.body.appendChild(ligacao);
      ligacao.click();
      ligacao.remove();
      URL.revokeObjectURL(url);
      sinalizar('sucesso');
    } catch {
      setErro('Não foi possível gerar o PDF.');
      sinalizar('erro');
    } finally {
      setAGerar(false);
    }
  }

  return (
    <div>
      {/* ---------------------------------------------------------- */}
      {/* Quantas mesas tem a casa                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="superficie mt-8 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-cartao p-5">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-sm font-semibold text-creme">
            Quantas mesas tem a casa?
          </span>
          <span className="flex items-center gap-2">
            <Campo
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/\D/g, '').slice(0, 3))}
              onKeyDown={(e) => e.key === 'Enter' && guardarTotal()}
              className="w-[90px] text-center"
            />
            <Botao
              variante="laranja"
              tamanho="md"
              onClick={guardarTotal}
              aCarregar={aGuardarTotal}
              disabled={Number.parseInt(total, 10) === mesas.length}
            >
              Guardar
            </Botao>
          </span>
        </label>

        <p className="max-w-[42ch] font-sans text-xs leading-normal text-tenue">
          A casa tem <span className="font-semibold text-creme">{mesas.length}</span>{' '}
          {mesas.length === 1 ? 'mesa' : 'mesas'}. Acrescentar dá-lhes números a seguir aos que já
          existem; tirar começa pelas últimas, para os cartões já colados continuarem certos.
          {Number.isFinite(limite) ? ` O plano actual vai até ${limite}.` : ''}
        </p>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Os cartões                                                   */}
      {/* ---------------------------------------------------------- */}
      {mesas.length ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Botao
            variante="laranja"
            tamanho="md"
            onClick={descarregar}
            aCarregar={aGerar}
            estado={sinal}
            disabled={!paraImprimir.length}
          >
            Descarregar {paraImprimir.length} {paraImprimir.length === 1 ? 'cartão' : 'cartões'}
          </Botao>

          <span className="font-sans text-xs text-tenue">
            {escolhidas.size ? (
              <>
                {escolhidas.size} {escolhidas.size === 1 ? 'escolhida' : 'escolhidas'} ·{' '}
                <button
                  type="button"
                  onClick={() => setEscolhidas(new Set())}
                  className="underline underline-offset-4 hover:text-creme"
                >
                  imprimir todas
                </button>
              </>
            ) : (
              <>
                Vão todas. Toque numa mesa para escolher só algumas — ou{' '}
                <button
                  type="button"
                  onClick={() => setEscolhidas(new Set(mesas.map((m) => m.id)))}
                  className="underline underline-offset-4 hover:text-creme"
                >
                  escolher uma a uma
                </button>
                .
              </>
            )}
          </span>
        </div>
      ) : null}

      {demonstracao ? (
        <p className="mt-4 font-sans text-xs text-tenue">
          Estes QR apontam para <span className="text-creme">{base}</span> — mude o endereço em
          NEXT_PUBLIC_SITE_URL antes de imprimir a sério.
        </p>
      ) : null}
      {erro ? <Erro>{erro}</Erro> : null}

      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {mesas.map((mesa) => (
          <CartaoMesaQr
            key={mesa.id}
            mesa={mesa}
            slug={restaurante.slug}
            base={base}
            escolhida={escolhidas.has(mesa.id)}
            algumaEscolhida={escolhidas.size > 0}
            aoEscolher={() => alternar(mesa.id)}
            aoMudarNome={(nome) => mudarNome(mesa.id, nome)}
            aoGravarNome={(nome) => gravarNome(mesa.id, nome)}
            aoRemover={() => remover(mesa.id)}
          />
        ))}
      </div>

      {!mesas.length ? (
        <p className="superficie mt-10 rounded-cartao px-6 py-12 text-center font-sans text-sm text-tenue">
          Ainda não há mesas. Diga quantas tem a casa e imprima os cartões.
        </p>
      ) : null}
    </div>
  );
}

/** As acções pequenas no pé de cada cartão de mesa. */
const accaoDoCartao = cn(
  'rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold text-tenue',
  'transition-colors duration-200 hover:bg-black/[0.06] hover:text-creme',
  'disabled:pointer-events-none disabled:opacity-50',
);

function CartaoMesaQr({
  mesa,
  slug,
  base,
  escolhida,
  algumaEscolhida,
  aoEscolher,
  aoMudarNome,
  aoGravarNome,
  aoRemover,
}: {
  mesa: Mesa;
  slug: string;
  base: string;
  escolhida: boolean;
  algumaEscolhida: boolean;
  aoEscolher: () => void;
  aoMudarNome: (nome: string) => void;
  aoGravarNome: (nome: string) => void;
  aoRemover: () => void;
}) {
  const [qr, setQr] = React.useState<string | null>(null);
  const [aGuardar, setAGuardar] = React.useState(false);
  const url = urlDaMesa(slug, mesa.numero, base);

  React.useEffect(() => {
    let vivo = true;
    qrDataUrl(url, 320).then((d) => {
      if (vivo) setQr(d);
    });
    return () => {
      vivo = false;
    };
  }, [url]);

  /**
   * Guarda o código desta mesa, sozinho.
   *
   * O PDF com seis cartões por página serve para mobilar a sala. Não
   * serve para quando se parte um cartão, entra uma mesa nova na
   * esplanada, ou se quer mandar o código de uma mesa pelo WhatsApp.
   *
   * Sai em 1024 px, e não nos 320 que se vêem no ecrã: este ficheiro
   * tanto pode ir para um autocolante como para um cartaz, e um QR
   * esticado a partir de uma imagem pequena deixa de ler.
   */
  async function guardarCodigo() {
    if (aGuardar) return;
    setAGuardar(true);

    try {
      const grande = await qrDataUrl(url, 1024);
      const ligacao = document.createElement('a');
      ligacao.href = grande;
      ligacao.download = `${nomeDaMesa(mesa).toLowerCase().replace(/\s+/g, '-')}-${slug}.png`;
      document.body.appendChild(ligacao);
      ligacao.click();
      ligacao.remove();
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div
      className={cn(
        'superficie-leve group relative flex flex-col items-center rounded-cartao p-4 transition-shadow',
        escolhida && 'ring-2 ring-laranja',
      )}
    >
      <button
        type="button"
        onClick={aoRemover}
        aria-label={`Apagar ${nomeDaMesa(mesa)}`}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-tenue opacity-0 transition-opacity duration-200 hover:bg-black/[0.07] hover:text-creme focus-visible:opacity-100 group-hover:opacity-100"
      >
        ×
      </button>

      {/*
        O código inteiro é o botão de escolher: numa grelha de trinta
        mesas, acertar numa caixinha de quinze pixéis com o polegar é
        pedir muito.
      */}
      <button
        type="button"
        onClick={aoEscolher}
        aria-pressed={escolhida}
        aria-label={`${escolhida ? 'Tirar' : 'Juntar'} ${nomeDaMesa(mesa)} dos cartões a imprimir`}
        className="flex aspect-square w-full items-center justify-center rounded-campo bg-white p-3"
      >
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR da ${nomeDaMesa(mesa)}`} className="h-full w-full" />
        ) : (
          <span className="h-full w-full animate-pulse rounded bg-creme/10" />
        )}
      </button>

      {algumaEscolhida ? (
        <span
          aria-hidden
          className={cn(
            'absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold',
            escolhida
              ? 'border-transparent bg-laranja text-creme'
              : 'border-creme/25 bg-white text-transparent',
          )}
        >
          ✓
        </span>
      ) : null}

      {/*
        O nome é editável no sítio onde se lê. Guarda-se ao sair do
        campo: um botão por mesa, numa grelha de trinta, era um ecrã de
        botões.
      */}
      <input
        value={mesa.nome ?? ''}
        onChange={(e) => aoMudarNome(e.target.value.slice(0, 24))}
        onBlur={(e) => aoGravarNome(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={`Mesa ${numeroMesa(mesa.numero)}`}
        aria-label={`Nome da mesa ${mesa.numero}`}
        maxLength={24}
        /* O marcador não é um aviso de campo vazio: é o nome que a mesa
           tem enquanto a casa não lhe der outro, e é o que vai impresso
           no cartão. A 40 % lia-se como texto desligado. */
        className="mt-3 w-full rounded-campo border border-transparent bg-transparent px-2 py-1 text-center font-display text-base text-creme outline-none transition-colors hover:border-linha focus:border-laranja/60 focus:bg-black/[0.03] placeholder:text-creme/70"
      />

      {/* Duas acções pequenas, em pastilha e sem sublinhado: sublinhado é
          para texto corrido, e doze pares de palavras sublinhadas numa
          grelha de mesas faziam a página parecer um índice. */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={guardarCodigo}
          disabled={aGuardar || !qr}
          className={accaoDoCartao}
        >
          {aGuardar ? 'A guardar…' : 'Guardar PNG'}
        </button>

        <a href={url} target="_blank" rel="noreferrer" className={accaoDoCartao}>
          Abrir ↗
        </a>
      </div>
    </div>
  );
}
