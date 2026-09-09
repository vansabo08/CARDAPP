import Link from 'next/link';
import Image from 'next/image';
import { Botao } from '@/components/ui/botao';
import { Revelar } from '@/components/ui/revelar';
import { Marca } from '@/components/marca';
import { Telemovel } from '@/components/marketing/telemovel';
import { CartaoMesa, EcraCardapio, EcraWhatsApp } from '@/components/marketing/mockups';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { FaixaPratos } from '@/components/marketing/faixa-pratos';
import { FraseRevelada } from '@/components/marketing/frase-revelada';
import { Prova } from '@/components/marketing/prova';
import { Perguntas } from '@/components/marketing/perguntas';
import { Precos } from '@/components/marketing/precos';

const PASSOS = [
  {
    numero: '01',
    titulo: 'O cliente lê o QR da mesa',
    texto:
      'Cada mesa tem o seu cartão. A câmara do telemóvel chega — não é preciso instalar nada nem criar conta.',
  },
  {
    numero: '02',
    titulo: 'Vê o cardápio e escolhe',
    texto:
      'Fotografias, descrições e preços em Kwanzas. Marca a quantidade, escreve “sem cebola” e o carrinho vai somando.',
  },
  {
    numero: '03',
    titulo: 'O pedido chega ao WhatsApp',
    texto:
      'Uma mensagem já formatada, com mesa, itens, observações e total. A cozinha lê e começa a trabalhar.',
  },
];

export default function PaginaInicial() {
  return (
    <div className="relative min-h-dvh">
      <FundoVivo />

      {/*
        Para quem navega por teclado: primeira paragem do tabulador, e
        invisível até lá. Sem isto, chegar ao conteúdo obriga a passar por
        toda a navegação em cada página.
      */}
      <a
        href="#conteudo"
        className="sr-only rounded-campo bg-ouro px-4 py-2 font-sans text-sm font-semibold text-grafite focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[60]"
      >
        Saltar para o conteúdo
      </a>

      {/* ---------------------------------------------------------- */}
      {/* Navegação                                                    */}
      {/* ---------------------------------------------------------- */}
      <header className="vidro sticky top-0 z-50 rounded-none border-x-0 border-t-0 shadow-[inset_0_1px_0_0_rgba(250,247,242,0.11)]">
        <nav className="mx-auto flex h-[68px] max-w-conteudo items-center justify-between px-5 md:px-8">
          <Marca />
          <div className="hidden items-center gap-9 md:flex">
            <a href="#como-funciona" className="font-sans text-sm text-tenue transition-colors hover:text-creme">
              Como funciona
            </a>
            <a href="#precos" className="font-sans text-sm text-tenue transition-colors hover:text-creme">
              Preços
            </a>
            <a href="#perguntas" className="font-sans text-sm text-tenue transition-colors hover:text-creme">
              Perguntas
            </a>
            <Link href="/tia-bela?mesa=7" className="font-sans text-sm text-tenue transition-colors hover:text-creme">
              Ver um cardápio
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Botao asChild variante="discreto" tamanho="sm" className="hidden sm:inline-flex">
              <Link href="/entrar">Entrar</Link>
            </Botao>
            <Botao asChild variante="ouro" tamanho="sm">
              <Link href="/criar-conta">Criar cardápio</Link>
            </Botao>
          </div>
        </nav>
      </header>

      <main id="conteudo">
      {/* ---------------------------------------------------------- */}
      {/* Herói                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* ------------------------------------------------------------
            Fotografia de sala por trás de tudo. Fica muito escurecida de
            propósito: é atmosfera, não assunto — o assunto é o título e
            o telemóvel. Dois véus, um a fechar o lado do texto e outro a
            derreter a base na página, para não haver costura visível.
            ------------------------------------------------------------ */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src="/pratos/ambiente.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={55}
            /* Desfocada como numa objectiva aberta: separa o fundo do
               telemóvel, que é o que tem de estar nítido. */
            className="scale-105 object-cover object-center opacity-[0.32] blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-grafite via-grafite/92 to-grafite/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-grafite/80 via-transparent to-grafite" />
          {/* mancha escura por trás do aparelho, para ele destacar */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(46% 58% at 74% 52%, rgba(15,14,13,0.66) 0%, transparent 72%)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-conteudo px-5 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_460px]">
            <div>
              <Revelar>
                <span className="etiqueta text-ouro-fundo">Premium · Angola · Kwanza</span>
              </Revelar>

              {/*
                Escala do Tailwind, sem valores arbitrários. O `text-6xl`
                já traz a entrelinha 1, que é a que um display quer — por
                isso não se lhe põe `leading` à mão. O `tracking-tight`
                é da escala e a Playfair, com o contraste que tem,
                precisa dele nos tamanhos grandes.
              */}
              <Revelar atraso={60}>
                <h1 className="mt-6 max-w-[12ch] text-balance font-display text-4xl tracking-tight text-creme md:text-6xl">
                  O cardápio que cabe numa <span className="ouro-display">mesa.</span>
                </h1>
              </Revelar>

              <Revelar atraso={120}>
                <p className="mt-8 max-w-[44ch] font-sans text-lg leading-relaxed text-tenue">
                  O cliente lê o QR da mesa, escolhe o que quer e o pedido chega ao WhatsApp do
                  restaurante já escrito — sem aplicações, sem login, sem papel.
                </p>
              </Revelar>

              <Revelar atraso={180}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Botao asChild variante="ouro" tamanho="lg">
                    <Link href="/criar-conta">Criar cardápio grátis</Link>
                  </Botao>
                  <Botao asChild variante="contorno" tamanho="lg">
                    <Link href="/tia-bela?mesa=7">Ver um cardápio a sério</Link>
                  </Botao>
                </div>
              </Revelar>

              <Revelar atraso={240}>
                <p className="mt-7 font-sans text-sm text-tenue">
                  Grátis para uma mesa e quinze pratos. Sem cartão de crédito.
                </p>
              </Revelar>
            </div>

            <Revelar atraso={140} className="flex justify-center lg:justify-end">
              <div className="transition-transform duration-500 ease-calmo hover:-translate-y-2 hover:rotate-[-1.2deg]">
                <Telemovel largura={330}>
                  <EcraCardapio />
                </Telemovel>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Números                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="border-y border-linha">
        <div className="mx-auto grid max-w-conteudo grid-cols-1 divide-y divide-linha px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:px-8">
          {[
            ['Menos de 30 s', 'do scan ao pedido enviado'],
            ['Zero', 'cliques de login para o cliente'],
            ['Kz', 'preços sempre em Kwanzas'],
          ].map(([grande, pequeno], i) => (
            <Revelar key={grande} atraso={i * 60} className="px-0 py-10 sm:px-9">
              <p className="font-display text-3xl leading-none text-creme">{grande}</p>
              <p className="mt-2.5 font-sans text-sm text-tenue">{pequeno}</p>
            </Revelar>
          ))}
        </div>
      </section>

      <FaixaPratos />

      {/* ---------------------------------------------------------- */}
      {/* Como funciona                                                */}
      {/* ---------------------------------------------------------- */}
      <section id="como-funciona" className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-32">
        <Revelar>
          <span className="etiqueta text-ouro-fundo">Como funciona</span>
          <h2 className="mt-5 max-w-[16ch] text-balance font-display text-4xl leading-none text-creme md:text-5xl">
            Três passos. Nenhum deles é instalar uma aplicação.
          </h2>
        </Revelar>

        <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-7">
          <Revelar className="flex flex-col">
            <PassoCabecalho {...PASSOS[0]} />
            <div className="relative mt-9 flex flex-1 items-center justify-center overflow-hidden rounded-cartao">
              <Image
                src="/pratos/sala.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
                aria-hidden
              />
              <div className="absolute inset-0 bg-grafite/62" />
              <div className="relative px-6 py-14">
                <CartaoMesa numero={7} />
              </div>
            </div>
          </Revelar>

          <Revelar atraso={80} className="flex flex-col">
            <PassoCabecalho {...PASSOS[1]} />
            <div className="vidro mt-9 flex flex-1 items-center justify-center rounded-cartao px-6 py-11 transition-colors duration-300 hover:border-ouro/30">
              <Telemovel largura={216} sombra={false}>
                <EcraCardapio />
              </Telemovel>
            </div>
          </Revelar>

          <Revelar atraso={160} className="flex flex-col">
            <PassoCabecalho {...PASSOS[2]} />
            <div className="vidro mt-9 flex flex-1 items-center justify-center rounded-cartao px-6 py-11 transition-colors duration-300 hover:border-ouro/30">
              <Telemovel largura={216} sombra={false}>
                <EcraWhatsApp />
              </Telemovel>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* A frase                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="border-t border-linha">
        <div className="mx-auto max-w-conteudo px-5 py-28 md:px-8 md:py-36">
          <FraseRevelada
            texto="O cliente lê, escolhe e envia. A cozinha começa a trabalhar antes de alguém se levantar da mesa."
            className="mx-auto max-w-[680px] font-display text-4xl leading-none tracking-[-0.015em] md:text-5xl"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* A mensagem                                                   */}
      {/* ---------------------------------------------------------- */}
      <section className="vidro border-x-0 border-y/55 backdrop-blur-md">
        <div className="mx-auto grid max-w-conteudo items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8 md:py-28">
          <Revelar>
            <span className="etiqueta text-ouro-fundo">A mensagem</span>
            <h2 className="mt-5 max-w-[18ch] text-balance font-display text-3xl leading-none text-creme md:text-4xl">
              Escrita para ser lida na cozinha, não por um computador.
            </h2>
            <p className="mt-6 max-w-[44ch] font-sans text-base leading-relaxed text-tenue">
              Mesa, quantidades, observações e total alinhado. Chega ao mesmo WhatsApp que o
              restaurante já usa todos os dias — nada de painel novo para aprender.
            </p>
          </Revelar>

          <Revelar atraso={80}>
            <div className="vidro-leve overflow-x-auto rounded-cartao p-6">
              <pre className="whitespace-pre font-mono text-xs leading-relaxed text-creme/90 sm:text-xs">
{`🍽 NOVO PEDIDO — Mesa 07
Tia Bela · 19:42

▪️ 2x Muamba de Galinha ......... 9.000 Kz
▪️ 1x Calulu de Peixe ........... 5.500 Kz
   ↳ sem piripiri
▪️ 3x Cuca 33cl ................. 1.800 Kz

TOTAL ....................... 16.300 Kz
Pagamento: na mesa

— enviado via Cardapp`}
              </pre>
            </div>
          </Revelar>
        </div>
      </section>

      <Prova />

      <Precos />

      <Perguntas />

      {/* ---------------------------------------------------------- */}
      {/* Fecho                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-linha">
        <Image
          src="/pratos/ambiente.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-grafite/88" />
        <div className="relative mx-auto max-w-conteudo px-5 py-28 text-center md:px-8 md:py-36">
          <Revelar>
            <h2 className="mx-auto max-w-[18ch] text-balance font-display text-4xl leading-none text-creme md:text-5xl">
              O seu cardápio pode estar pronto ao almoço.
            </h2>
            <div className="mt-10">
              <Botao asChild variante="ouro" tamanho="lg">
                <Link href="/criar-conta">Criar cardápio grátis</Link>
              </Botao>
            </div>
          </Revelar>
        </div>
      </section>

      </main>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-conteudo flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <Marca tamanho="sm" />
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <Link href="/entrar" className="font-sans text-xs text-tenue transition-colors hover:text-creme">
              Entrar
            </Link>
            <Link href="/criar-conta" className="font-sans text-xs text-tenue transition-colors hover:text-creme">
              Criar conta
            </Link>
            <Link href="/tia-bela" className="font-sans text-xs text-tenue transition-colors hover:text-creme">
              Cardápio de exemplo
            </Link>
            <a href="#perguntas" className="font-sans text-xs text-tenue transition-colors hover:text-creme">
              Perguntas
            </a>
          </div>

          {/*
            Aqui estiveram um número de WhatsApp e um email marcados como
            [TODO], visíveis para quem visitasse o site — e a ligação
            apontava mesmo para +244 000 000 000. Um contacto por acabar é
            pior do que contacto nenhum: quem tenta e falha desconfia da
            casa toda. Fica só o que é verdade até haver os reais.
          */}
          <div className="flex flex-col gap-1.5 font-sans text-xs text-tenue sm:items-end">
            <span>Luanda, Angola</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PassoCabecalho({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <div>
      <span className="font-display text-sm text-ouro">{numero}</span>
      <h3 className="mt-3 text-balance font-display text-2xl leading-none text-creme">{titulo}</h3>
      <p className="mt-3 font-sans text-sm leading-normal text-tenue">{texto}</p>
    </div>
  );
}
