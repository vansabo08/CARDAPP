import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { Marca } from '@/components/marca';
import { FundoVivo } from '@/components/marketing/fundo-vivo';

export default function NaoEncontrado() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <FundoVivo />
      <header className="px-5 py-6 md:px-8">
        <Marca />
      </header>
      <main className="flex flex-1 items-center px-5">
        <div className="mx-auto w-full max-w-[460px] animate-subir">
          <p className="etiqueta text-ouro">404</p>
          <h1 className="mt-4 font-display text-[34px] leading-tight text-creme">
            Este cardápio não existe.
          </h1>
          <p className="mt-3 font-sans text-[15px] leading-[1.6] text-tenue">
            O endereço pode ter mudado, ou o restaurante já não está activo. Confirme o QR da mesa
            com quem o serve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Botao asChild variante="ouro" tamanho="md">
              <Link href="/">Voltar ao início</Link>
            </Botao>
            <Botao asChild variante="contorno" tamanho="md">
              <Link href="/tia-bela">Ver um cardápio de exemplo</Link>
            </Botao>
          </div>
        </div>
      </main>
    </div>
  );
}
