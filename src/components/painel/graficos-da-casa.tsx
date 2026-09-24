import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { COR_GRAFICO } from '@/lib/cores';
import { formatarKz } from '@/lib/format';
import type { Barra } from '@/lib/estatisticas';
import { cn } from '@/lib/utils';

/**
 * Os gráficos da dashboard da casa.
 *
 * SVG escrito à mão, sem biblioteca — são três formas (uma área, barras
 * ao alto e barras deitadas) e qualquer biblioteca de gráficos pesa mais
 * do que o painel inteiro. Nada disto é cliente: o servidor já tem as
 * contas feitas, manda HTML, e o telemóvel do balcão não descarrega
 * JavaScript nenhum para ver números.
 *
 * UMA COR POR CARTÃO. O verde é a receita, o azul são os pedidos, o
 * laranja é o movimento; o vermelho só aparece quando um número desceu,
 * e nunca sozinho — vai sempre com a seta para baixo ao lado. A razão
 * está em `lib/cores`: medidas umas contra as outras, estas cores
 * confundem-se, e por isso nunca partilham a mesma figura.
 *
 * O que se passa ao passar o rato é o `<title>` do próprio SVG: é o
 * balão do browser, funciona sem uma linha de script e um leitor de ecrã
 * lê-o.
 */

/* ------------------------------------------------------------------ */
/* O cartão                                                            */
/* ------------------------------------------------------------------ */

export function Cartao({
  titulo,
  acima,
  children,
  className,
}: {
  titulo: string;
  acima?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('superficie rounded-cartao p-5 md:p-6', className)}>
      {acima ? <p className="etiqueta text-[11px] text-creme/35">{acima}</p> : null}
      <h2 className="mt-0.5 font-sans text-sm font-semibold text-creme">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * De quanto subiu ou desceu.
 *
 * Verde a subir, vermelho a descer, e a seta a dizer o mesmo — quem não
 * distingue as duas cores lê a seta. Sem termo de comparação não se
 * inventa percentagem nenhuma: diz-se que não há.
 */
export function Variacao({ valor, contra }: { valor: number | null; contra: string }) {
  if (valor === null) {
    return (
      <span className="inline-flex items-center gap-1 font-sans text-xs text-tenue">
        <Minus className="h-3 w-3" aria-hidden />
        sem termo de comparação
      </span>
    );
  }

  const subiu = valor >= 0;
  const Seta = subiu ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 font-sans text-xs font-semibold"
      style={{ color: subiu ? COR_GRAFICO.receita : COR_GRAFICO.descida }}
    >
      <Seta className="h-3.5 w-3.5" aria-hidden />
      {subiu ? '+' : ''}
      {valor}%
      <span className="font-normal text-tenue">{contra}</span>
    </span>
  );
}

export function CartaoNumero({
  rotulo,
  valor,
  variacao,
  contra,
  cor,
}: {
  rotulo: string;
  valor: string;
  variacao: number | null;
  contra: string;
  cor: string;
}) {
  return (
    <div className="superficie relative overflow-hidden rounded-cartao p-5">
      {/* A cor do cartão numa barra fina, e não no número: um número
          colorido lê-se pior, e aqui a cor é só para arrumar o olho. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: cor }} />
      <p className="font-sans text-xs font-semibold text-tenue">{rotulo}</p>
      <p className="mt-2 font-display text-[26px] leading-none tracking-tight text-creme md:text-3xl">
        {valor}
      </p>
      <p className="mt-2.5">
        <Variacao valor={variacao} contra={contra} />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A área do tempo                                                     */
/* ------------------------------------------------------------------ */

const L = 720;
const A = 220;
const MARGEM = { cima: 14, baixo: 26, lado: 6 };

/**
 * Curva suave que não inventa valores.
 *
 * É uma cúbica monótona: passa exactamente por cada ponto e nunca sobe
 * entre dois pontos que descem. As curvas suaves à toa fazem isso — e
 * num gráfico de dinheiro desenham um pico que nunca existiu.
 */
function caminhoSuave(pontos: { x: number; y: number }[]) {
  if (pontos.length < 2) return '';
  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[Math.max(0, i - 1)];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[Math.min(pontos.length - 1, i + 2)];
    const monotona = (a: number, b: number, c: number) => ((b - a) * (c - b) <= 0 ? 0 : (c - a) / 6);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + monotona(p0.y, p1.y, p2.y) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - monotona(p1.y, p2.y, p3.y) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaDoTempo({
  dados,
  cor = COR_GRAFICO.receita,
  id,
}: {
  dados: Barra[];
  cor?: string;
  /** Precisa de ser único na página: o gradiente é referido por ele. */
  id: string;
}) {
  if (dados.length < 2) return <Vazio />;

  const maior = Math.max(...dados.map((d) => d.valor), 1);
  const largura = L - MARGEM.lado * 2;
  const altura = A - MARGEM.cima - MARGEM.baixo;
  const passo = largura / (dados.length - 1);

  const pontos = dados.map((d, i) => ({
    x: MARGEM.lado + i * passo,
    y: MARGEM.cima + altura - (d.valor / maior) * altura,
  }));

  const linha = caminhoSuave(pontos);
  const area = `${linha} L ${pontos[pontos.length - 1].x} ${MARGEM.cima + altura} L ${pontos[0].x} ${
    MARGEM.cima + altura
  } Z`;

  const alto = dados.reduce((m, d, i) => (d.valor > dados[m].valor ? i : m), 0);
  // Num mês não cabem trinta rótulos: mostram-se uns quantos.
  const saltoRotulo = Math.max(1, Math.ceil(dados.length / 7));

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className="h-[200px] w-full md:h-[236px]"
      role="img"
      aria-label={`Evolução: ${dados.map((d) => `${d.rotulo} ${Math.round(d.valor)}`).join(', ')}`}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Três linhas de grelha, muito apagadas: dão altura sem gritar. */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={MARGEM.lado}
          x2={L - MARGEM.lado}
          y1={MARGEM.cima + altura * f}
          y2={MARGEM.cima + altura * f}
          stroke="rgba(23,22,27,0.08)"
          strokeWidth={1}
        />
      ))}

      <path d={area} fill={`url(#grad-${id})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* O ponto mais alto marcado — é a pergunta que se faz primeiro. */}
      <circle cx={pontos[alto].x} cy={pontos[alto].y} r={4.5} fill={cor} />
      <circle cx={pontos[alto].x} cy={pontos[alto].y} r={8} fill={cor} opacity={0.22} />

      {dados.map((d, i) =>
        i % saltoRotulo === 0 || i === dados.length - 1 ? (
          <text
            key={d.rotulo + i}
            x={pontos[i].x}
            y={A - 8}
            textAnchor={i === 0 ? 'start' : i === dados.length - 1 ? 'end' : 'middle'}
            className="fill-creme/40 font-sans text-[11px]"
          >
            {d.rotulo}
          </text>
        ) : null,
      )}

      {/* Zonas invisíveis, uma por ponto, só para o balão do browser. */}
      {dados.map((d, i) => (
        <rect key={`z${i}`} x={pontos[i].x - passo / 2} y={0} width={passo} height={A} fill="transparent">
          <title>{`${d.rotulo}: ${formatarKz(Math.round(d.valor))}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Barras ao alto — as horas do dia                                    */
/* ------------------------------------------------------------------ */

export function BarrasAoAlto({ dados, cor = COR_GRAFICO.movimento }: { dados: Barra[]; cor?: string }) {
  if (!dados.length) return <Vazio />;
  const maior = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <div className="flex h-[168px] items-end gap-1.5">
      {dados.map((d) => (
        <div key={d.rotulo} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-[4px] transition-opacity duration-200 hover:opacity-80"
            style={{
              height: `${Math.max(2, (d.valor / maior) * 132)}px`,
              backgroundColor: cor,
              // A hora de mais movimento cheia; as outras esbatidas.
              opacity: d.destaque ? 1 : 0.42,
            }}
            title={`${d.rotulo}: ${formatarKz(Math.round(d.valor))}`}
          />
          <span className="truncate font-sans text-[10px] text-creme/40">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barras deitadas — os pratos                                         */
/* ------------------------------------------------------------------ */

export function BarrasDeitadas({
  dados,
  cor = COR_GRAFICO.pedidos,
}: {
  dados: { nome: string; qtd: number; valor: number }[];
  cor?: string;
}) {
  if (!dados.length) return <Vazio />;
  const maior = Math.max(...dados.map((d) => d.qtd), 1);

  return (
    <ul className="flex flex-col gap-3.5">
      {dados.map((d) => (
        <li key={d.nome}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-sans text-sm text-creme">{d.nome}</span>
            <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-creme">
              {d.qtd}
              <span className="ml-1.5 font-normal text-tenue">{formatarKz(Math.round(d.valor))}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.05]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (d.qtd / maior) * 100)}%`, backgroundColor: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Vazio() {
  return (
    <p className="py-10 text-center font-sans text-sm text-tenue">
      Ainda não há pedidos suficientes para desenhar isto.
    </p>
  );
}
