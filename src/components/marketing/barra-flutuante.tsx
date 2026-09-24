'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logotipo } from '@/components/logotipo';
import { cn } from '@/lib/utils';

/**
 * A barra da página inicial: uma pastilha que flutua sobre a página.
 *
 * NÃO É UMA BARRA COLADA AO TOPO. Fica a pairar, com ar por baixo e uma
 * sombra que a levanta do fundo, e move-se com a página — desce alguns
 * pixels e encolhe um bocadinho à medida que se rola, e a sombra cresce
 * com ela. É o paralaxe: ao contrário de uma barra fixa, esta responde a
 * quem rola.
 *
 * QUATRO ENTRADAS, E MAIS NADA. Funcionalidades, Preços, FAQ e Entrar.
 * A ordem é a de quem chega pela primeira vez: ver o que faz, quanto
 * custa, tirar a dúvida, entrar. Cabem as quatro num telemóvel de 360 px,
 * por isso não há menu de hambúrguer: no telemóvel vê-se o mesmo que no
 * computador, só mais apertado.
 *
 * A entrada da secção em que se está acende-se, com um traço laranja por
 * baixo — a pastilha diz sempre em que parte da página se está.
 */

type Item = { id: string; rotulo: string; href: string };

const ITENS: Item[] = [
  { id: 'como-funciona', rotulo: 'Funcionalidades', href: '#como-funciona' },
  { id: 'precos', rotulo: 'Preços', href: '#precos' },
  { id: 'perguntas', rotulo: 'FAQ', href: '#perguntas' },
];

/** Onde a página tem de estar para a barra assentar por completo. */
const CURSO = 140;

export function BarraFlutuante() {
  const [andamento, setAndamento] = React.useState(0);
  const [activo, setActivo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const paradoQuieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pedido = 0;

    function medir() {
      pedido = 0;

      // Quanto já se rolou, de 0 a 1 — é isto que move a barra.
      setAndamento(paradoQuieto ? 1 : Math.min(window.scrollY / CURSO, 1));

      /*
       * Em que secção estamos. A linha de referência é um terço do ecrã
       * a contar de cima: uma secção conta a partir do momento em que a
       * sua primeira linha passa por ali, e não quando enche o ecrã.
       */
      const linha = window.innerHeight * 0.34;
      let actual: string | null = null;
      for (const item of ITENS) {
        const no = document.getElementById(item.id);
        if (no && no.getBoundingClientRect().top <= linha) actual = item.id;
      }
      setActivo(actual);
    }

    function aoRolar() {
      if (pedido) return;
      pedido = requestAnimationFrame(medir);
    }

    medir();
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  const a = andamento;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 sm:px-5">
      <nav
        aria-label="Navegação principal"
        className="pointer-events-auto mt-3 flex items-center rounded-full border border-black/[0.09] bg-grafite-carta/95 pl-3 pr-1.5 sm:mt-4 sm:pl-4 sm:pr-2"
        style={{
          /* Só transformações e sombra: nada que obrigue a página a
             recalcular o desenho enquanto se rola. */
          transform: `translateY(${a * 5}px) scale(${1 - a * 0.035})`,
          boxShadow: `0 ${8 + a * 12}px ${26 + a * 22}px -${18 - a * 4}px rgba(23,22,27,${0.16 + a * 0.12})`,
        }}
      >
        <Link
          href="/"
          aria-label="CardApp, início"
          className="mr-1 hidden shrink-0 items-center rounded-full p-1.5 transition-opacity duration-200 hover:opacity-75 sm:inline-flex"
        >
          <Logotipo tamanho={24} />
        </Link>

        <ul className="flex items-center">
          {ITENS.map((item) => {
            const aqui = activo === item.id;
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-current={aqui ? 'true' : undefined}
                  className={cn(
                    'relative flex h-11 items-center px-2.5 font-sans text-[12px] font-semibold tracking-[0.01em] transition-colors duration-200 sm:h-12 sm:px-4 sm:text-sm',
                    aqui ? 'text-laranja' : 'text-creme/70 hover:text-creme',
                  )}
                >
                  {item.rotulo}
                  {/*
                    O traço da referência: assenta na aresta de baixo da
                    pastilha e cresce do meio para fora.
                  */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-laranja transition-transform duration-300 ease-calmo',
                      aqui ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <Link
          href="/entrar"
          className="ml-1 flex h-9 shrink-0 items-center rounded-full bg-laranja px-3.5 font-sans text-[12px] font-bold text-creme transition-colors duration-200 hover:bg-laranja-claro sm:h-10 sm:px-5 sm:text-sm"
        >
          Entrar
        </Link>
      </nav>
    </div>
  );
}
