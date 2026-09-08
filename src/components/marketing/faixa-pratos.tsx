import { cn } from '@/lib/utils';

/**
 * Faixa de nomes de pratos a correr devagar, como a lousa de um bar.
 * A lista é escrita duas vezes: quando a primeira cópia sai do ecrã, a
 * animação volta a zero e a segunda está exactamente no mesmo sítio, o
 * que dá a volta contínua sem salto.
 */

const PRATOS = [
  'Muamba de Galinha',
  'Calulu de Peixe',
  'Funge de Bombó',
  'Mufete',
  'Moamba de Ginguba',
  'Kitaba',
  'Cocada Amarela',
  'Sumo de Múcua',
  'Espetada de Vaca',
  'Garoupa Grelhada',
  'Rissóis de Camarão',
  'Cuca 33cl',
];

export function FaixaPratos({ className }: { className?: string }) {
  const lista = [...PRATOS, ...PRATOS];

  return (
    <div
      className={cn('relative overflow-hidden border-y border-linha py-5', className)}
      aria-hidden
    >
      {/* esbatido nas pontas, para a faixa não bater nas margens */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-grafite to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-grafite to-transparent" />

      <div className="faixa-correr flex w-max items-center gap-8">
        {lista.map((prato, i) => (
          <span key={`${prato}-${i}`} className="flex items-center gap-8">
            <span className="whitespace-nowrap font-display text-[26px] italic text-creme/70">
              {prato}
            </span>
            <span className="block h-[5px] w-[5px] shrink-0 rounded-full bg-ouro/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
