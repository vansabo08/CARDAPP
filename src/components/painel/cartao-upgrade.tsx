import { Check, Lock } from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { PLANOS } from '@/config/planos';
import { formatarKz } from '@/lib/format';
import { APRESENTACAO, ligacaoParaAbrir, type Funcionalidade } from '@/lib/funcionalidades';
import { cn } from '@/lib/utils';

/**
 * O que aparece no lugar de uma funcionalidade do Plano Sala, a quem
 * está no Mesa.
 *
 * Nunca um ecrã vazio nem um erro: um ecrã vazio lê-se como avaria, e
 * quem acha que o produto está avariado não compra o plano de cima.
 * Aqui diz-se o que é, o que mais vem junto, e onde se compra — e nada
 * do que a casa já tem deixa de funcionar.
 *
 * Os três "também vem" mudam conforme o que se está a ver, para não
 * repetir a coisa que o título já disse.
 */

const DESTAQUES_DO_SALA: readonly Funcionalidade[] = [
  'chamar_empregado',
  'salao',
  'equipa',
  'relatorios',
  'opcoes',
  'promocoes',
];

export function CartaoUpgrade({
  funcionalidade,
  className,
  compacto = false,
}: {
  funcionalidade: Funcionalidade;
  className?: string;
  /** Numa linha, para dentro de outras páginas. */
  compacto?: boolean;
}) {
  const { nome, frase } = APRESENTACAO[funcionalidade];
  const tambem = DESTAQUES_DO_SALA.filter((f) => f !== funcionalidade).slice(0, 3);
  const ligacao = ligacaoParaAbrir(funcionalidade);

  if (compacto) {
    return (
      <div
        className={cn(
          'superficie flex flex-wrap items-center gap-4 rounded-cartao px-5 py-4',
          className,
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-laranja/15 text-laranja">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-creme">{nome}</p>
          <p className="mt-0.5 font-sans text-xs leading-normal text-tenue">
            Disponível no Plano Sala. {frase}
          </p>
        </div>
        <Botao asChild variante="laranja" tamanho="md">
          <a href={ligacao} target="_blank" rel="noreferrer">
            Passar para o Sala
          </a>
        </Botao>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`upgrade-${funcionalidade}`}
      className={cn('superficie relative overflow-hidden rounded-cartao', className)}
    >
      {/* Um brilho quente no canto: o único enfeite, e é o do plano de cima. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-laranja/10 blur-3xl"
      />

      <div className="relative px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-laranja/15 text-laranja">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <span className="rounded-full border border-laranja/40 px-3 py-1 font-sans text-xs font-semibold text-laranja">
            Disponível no Plano Sala
          </span>
        </div>

        <h2
          id={`upgrade-${funcionalidade}`}
          className="mt-6 max-w-[20ch] font-display text-3xl leading-tight text-creme"
        >
          {nome}
        </h2>
        <p className="mt-3 max-w-[48ch] font-sans text-base leading-relaxed text-tenue">{frase}</p>

        <ul className="mt-7 flex flex-col gap-3">
          {tambem.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-laranja" aria-hidden />
              <span className="font-sans text-sm leading-normal text-creme/85">
                <span className="font-semibold text-creme">{APRESENTACAO[f].nome}.</span>{' '}
                {APRESENTACAO[f].frase}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Botao asChild variante="laranja" tamanho="lg">
            <a href={ligacao} target="_blank" rel="noreferrer">
              Passar para o Sala
            </a>
          </Botao>
          <p className="font-sans text-sm text-tenue">
            {formatarKz(PLANOS.sala.preco)} por {PLANOS.sala.dias} dias. O que já tem continua
            igual.
          </p>
        </div>
      </div>
    </section>
  );
}
