'use client';

import * as React from 'react';
import { COR_ESTADO, COR_SERIE, type TomDeEstado } from '@/lib/cores';
import { formatarKz } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Os gráficos do painel de administração.
 *
 * Tudo SVG escrito à mão, sem biblioteca. Não é teimosia: são duas
 * formas — uma linha e umas barras — e uma biblioteca de gráficos custa
 * mais a carregar do que o painel inteiro pesa hoje.
 *
 * A PALETA FOI VALIDADA, NÃO ESCOLHIDA A OLHO. Os degraus vêm do sistema
 * de visualização, medidos contra o fundo escuro: banda de luminosidade,
 * chroma mínimo, separação para daltonismo e contraste, tudo passa. A
 * ordem também conta — o vermelho e o verde ficavam adjacentes e o par
 * caía para 6.5 de separação, por isso o azul foi metido entre eles.
 *
 * Ficam de fora gráficos de dispersão com estas quatro cores: em todos
 * os pares (e não só nos adjacentes) o vermelho e o dourado não se
 * distinguem o suficiente.
 */

const TINTA = 'rgba(250,247,242,0.55)';
const GRELHA = 'rgba(250,247,242,0.10)';

/* ------------------------------------------------------------------ */
/* Número em destaque                                                  */
/* ------------------------------------------------------------------ */

/**
 * Um número sozinho não é um gráfico, e não deve fingir que é.
 * Quando a pergunta é "quantos?", a resposta é o número, grande.
 */
export function Numero({
  rotulo,
  valor,
  nota,
  tom,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: TomDeEstado;
}) {
  return (
    <div className="vidro rounded-cartao p-5">
      <p className="etiqueta text-tenue">{rotulo}</p>
      <p
        className="mt-2 font-display text-3xl leading-none text-creme"
        style={tom ? { color: COR_ESTADO[tom] } : undefined}
      >
        {valor}
      </p>
      {nota ? <p className="mt-1.5 font-sans text-xs text-tenue">{nota}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha ao longo do tempo                                             */
/* ------------------------------------------------------------------ */

export type Ponto = { dia: string; total: number; valor: number };

/**
 * Pedidos por dia.
 *
 * Uma série só, por isso não leva legenda — o título já diz o que é.
 * Leva mira e balão ao passar o rato, porque um gráfico em HTML que não
 * responde ao cursor desperdiça o que tem de melhor.
 */
export function LinhaDoTempo({ pontos }: { pontos: Ponto[] }) {
  const [activo, setActivo] = React.useState<number | null>(null);

  if (pontos.length < 2) {
    return <Vazio texto="Ainda não há dias que cheguem para desenhar uma linha." />;
  }

  const L = 640;
  const A = 180;

  /*
   * A goteira da esquerda é para os números do eixo.
   *
   * Sem eles a grelha eram três traços mudos: via-se a forma e não se
   * sabia se o pico era vinte pedidos ou duzentos, que é metade do que
   * um gráfico destes tem para dizer.
   */
  const MARGEM = { cima: 12, baixo: 22, esquerda: 34, direita: 8 };

  const maximo = Math.max(1, ...pontos.map((p) => p.total));
  const largura = (L - MARGEM.esquerda - MARGEM.direita) / (pontos.length - 1);
  const alturaUtil = A - MARGEM.cima - MARGEM.baixo;

  const x = (i: number) => MARGEM.esquerda + i * largura;
  const y = (v: number) => MARGEM.cima + alturaUtil * (1 - v / maximo);

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.total)}`).join(' ');
  const area = `${caminho} L ${x(pontos.length - 1)} ${A - MARGEM.baixo} L ${x(0)} ${A - MARGEM.baixo} Z`;

  const ponto = activo != null ? pontos[activo] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="w-full"
        role="img"
        aria-label={`Pedidos por dia nos últimos ${pontos.length} dias`}
        onMouseLeave={() => setActivo(null)}
      >
        {/* Grelha recessiva: três traços, e não uma gaiola. */}
        {[0, 1].map((f) => (
          <g key={f}>
            <line
              x1={MARGEM.esquerda}
              x2={L - MARGEM.direita}
              y1={y(maximo * f)}
              y2={y(maximo * f)}
              stroke={GRELHA}
              strokeWidth={1}
            />
            <text
              x={MARGEM.esquerda - 8}
              y={y(maximo * f)}
              fill={TINTA}
              fontSize={11}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {Math.round(maximo * f)}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="sombra-linha" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR_SERIE} stopOpacity="0.22" />
            <stop offset="100%" stopColor={COR_SERIE} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#sombra-linha)" />
        <path d={caminho} fill="none" stroke={COR_SERIE} strokeWidth={2} strokeLinejoin="round" />

        {/* A mira. */}
        {activo != null ? (
          <>
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEM.cima}
              y2={A - MARGEM.baixo}
              stroke={TINTA}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(activo)}
              cy={y(pontos[activo].total)}
              r={5}
              fill={COR_SERIE}
              stroke="#0b0b0b"
              strokeWidth={2}
            />
          </>
        ) : null}

        {/* Alvos de rato maiores do que as marcas, como manda. */}
        {pontos.map((_, i) => (
          <rect
            key={i}
            x={x(i) - largura / 2}
            y={0}
            width={largura}
            height={A}
            fill="transparent"
            onMouseEnter={() => setActivo(i)}
          />
        ))}

        {/* Só as pontas levam data: uma etiqueta por dia seria ilegível. */}
        <text x={MARGEM.esquerda} y={A - 6} fill={TINTA} fontSize={11}>
          {diaCurto(pontos[0].dia)}
        </text>
        <text x={L - MARGEM.direita} y={A - 6} fill={TINTA} fontSize={11} textAnchor="end">
          {diaCurto(pontos[pontos.length - 1].dia)}
        </text>
      </svg>

      <p className="mt-2 min-h-[20px] font-sans text-xs text-tenue">
        {ponto ? (
          <>
            <span className="text-creme">{diaLongo(ponto.dia)}</span> · {ponto.total}{' '}
            {ponto.total === 1 ? 'pedido' : 'pedidos'} · {formatarKz(ponto.valor)}
          </>
        ) : (
          'Passe o rato para ver cada dia.'
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barras                                                              */
/* ------------------------------------------------------------------ */

export type Barra = { rotulo: string; valor: number; cor?: string; nota?: string };

/**
 * Barras deitadas, porque os rótulos são nomes e nomes lêem-se na
 * horizontal. As pontas dos dados são arredondadas e ancoradas à linha
 * de base, e cada barra leva o seu número ao lado — não é preciso ir ao
 * eixo adivinhar.
 */
export function Barras({ dados, sufixo }: { dados: Barra[]; sufixo?: string }) {
  if (!dados.length) return <Vazio texto="Ainda não há nada para comparar." />;

  const maximo = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <ul className="flex flex-col gap-3">
      {dados.map((d) => (
        <li key={d.rotulo}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-sans text-sm text-creme">{d.rotulo}</span>
            <span className="shrink-0 font-sans text-sm tabular-nums text-tenue">
              {d.valor}
              {sufixo ? ` ${sufixo}` : ''}
              {d.nota ? <span className="ml-2 text-tenue">{d.nota}</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-creme/[0.07]">
            <div
              className="h-full rounded-full transition-[width] duration-lenta ease-assinatura"
              style={{
                width: `${Math.max(2, (d.valor / maximo) * 100)}%`,
                backgroundColor: d.cor ?? COR_SERIE,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-cartao border border-linha px-5 py-8 text-center font-sans text-sm text-tenue">
      {texto}
    </p>
  );
}

export function Cartao({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('vidro rounded-cartao p-6', className)}>
      <h2 className="font-display text-xl text-creme">{titulo}</h2>
      {descricao ? (
        <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">{descricao}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function diaCurto(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

function diaLongo(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${iso}T12:00:00Z`));
}
