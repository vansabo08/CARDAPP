import { Marca } from '@/components/marca';

/**
 * O cardápio de uma casa cujo acesso terminou.
 *
 * Só aparece depois da cortesia — passados os primeiros dias, o cardápio
 * continua a servir de propósito, porque um QR morto numa mesa castiga
 * quem está a jantar e não quem se esqueceu de pagar.
 *
 * O que se diz aqui é dito para o cliente que leu o QR, não para o dono:
 * ele não tem culpa nem pode resolver nada, e não precisa de saber que
 * isto é uma questão de pagamento. Precisa de saber que o cardápio não
 * está e que pode pedir na mesma, falando com alguém.
 *
 * Sem o nome do restaurante e sem `noindex` isto ficaria a apanhar
 * pesquisas pelo nome da casa com uma página a dizer que ela não serve.
 */
export function ForaDoAr() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="px-5 py-6 md:px-8">
        <Marca />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[420px] text-center">
          <h1 className="text-balance font-display text-3xl leading-tight text-creme md:text-4xl">
            Este cardápio não está disponível.
          </h1>

          <p className="mt-5 text-pretty font-sans text-base leading-relaxed text-tenue">
            Peça o menu a quem o está a atender — a casa continua a servir na mesma.
          </p>

          <p className="mt-8 font-sans text-xs text-tenue">
            Se este cardápio é seu,{' '}
            <a href="/painel" className="text-ouro underline underline-offset-4">
              entre no painel
            </a>{' '}
            para o repor.
          </p>
        </div>
      </main>
    </div>
  );
}
