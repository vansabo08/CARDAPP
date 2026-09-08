import Link from 'next/link';
import Image from 'next/image';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Revelar } from '@/components/ui/revelar';
import { Marca } from '@/components/marca';
import { Telemovel } from '@/components/marketing/telemovel';
import { CartaoMesa, EcraCardapio, EcraWhatsApp } from '@/components/marketing/mockups';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { FaixaPratos } from '@/components/marketing/faixa-pratos';
import { formatarKz } from '@/lib/format';

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

const PLANOS = [
  {
    nome: 'Balcão',
    preco: 'Grátis',
    detalhe: 'para sempre',
    descricao: 'Para quem quer experimentar antes de decidir.',
    inclui: ['1 mesa', 'Até 15 pratos', 'Pedidos por WhatsApp', 'Marca Cardapp visível'],
    destaque: false,
    cta: 'Começar grátis',
  },
  {
    nome: 'Mesa',
    preco: formatarKz(9900),
    detalhe: 'por mês',
    descricao: 'O plano de quem já tem sala cheia.',
    inclui: ['Mesas ilimitadas', 'Pratos ilimitados', 'Logo próprio no cardápio', 'Cartões de mesa em PDF'],
    destaque: true,
    cta: 'Escolher Mesa',
  },
  {
    nome: 'Sala',
    preco: formatarKz(19900),
    detalhe: 'por mês',
    descricao: 'Para grupos com mais do que uma casa.',
    inclui: ['Tudo do plano Mesa', 'Estatísticas de vendas', 'Várias unidades', 'Sem marca Cardapp'],
    destaque: false,
    cta: 'Escolher Sala',
  },
];

export default function PaginaInicial() {
  return (
    <div className="relative min-h-dvh">
      <FundoVivo />

      {/* ---------------------------------------------------------- */}
      {/* Navegação                                                    */}
      {/* ---------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-linha bg-grafite/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-[68px] max-w-conteudo items-center justify-between px-5 md:px-8">
          <Marca />
          <div className="hidden items-center gap-9 md:flex">
            <a href="#como-funciona" className="font-sans text-[14px] text-tenue transition-colors hover:text-creme">
              Como funciona
            </a>
            <a href="#precos" className="font-sans text-[14px] text-tenue transition-colors hover:text-creme">
              Preços
            </a>
            <Link href="/tia-bela?mesa=7" className="font-sans text-[14px] text-tenue transition-colors hover:text-creme">
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

      {/* ---------------------------------------------------------- */}
      {/* Herói                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-conteudo px-5 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_460px]">
            <div>
              <Revelar>
                <span className="etiqueta text-ouro-fundo">Premium · Angola · Kwanza</span>
              </Revelar>

              <Revelar atraso={60}>
                <h1 className="mt-6 max-w-[12ch] font-display text-[46px] leading-[0.98] tracking-[-0.025em] text-creme sm:text-[62px] md:text-[76px]">
                  O cardápio que cabe numa{' '}
                  <span className="ouro-display italic">mesa.</span>
                </h1>
              </Revelar>

              <Revelar atraso={120}>
                <p className="mt-8 max-w-[44ch] font-sans text-[17px] leading-[1.65] text-tenue">
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
                <p className="mt-7 font-sans text-[13px] text-tenue">
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
              <p className="font-display text-[32px] leading-none text-creme">{grande}</p>
              <p className="mt-2.5 font-sans text-[14px] text-tenue">{pequeno}</p>
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
          <h2 className="mt-5 max-w-[16ch] font-display text-[36px] leading-[1.06] text-creme md:text-[50px]">
            Três passos. Nenhum deles é instalar uma aplicação.
          </h2>
        </Revelar>

        <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-7">
          <Revelar className="flex flex-col">
            <PassoCabecalho {...PASSOS[0]} />
            <div className="relative mt-9 flex flex-1 items-center justify-center overflow-hidden rounded-cartao">
              <Image
                src="/pratos/sala.jpg"
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
            <div className="mt-9 flex flex-1 items-center justify-center rounded-cartao border border-linha bg-grafite-alto/55 px-6 py-11 backdrop-blur-md transition-colors duration-300 hover:border-ouro/25">
              <Telemovel largura={216} sombra={false}>
                <EcraCardapio />
              </Telemovel>
            </div>
          </Revelar>

          <Revelar atraso={160} className="flex flex-col">
            <PassoCabecalho {...PASSOS[2]} />
            <div className="mt-9 flex flex-1 items-center justify-center rounded-cartao border border-linha bg-grafite-alto/55 px-6 py-11 backdrop-blur-md transition-colors duration-300 hover:border-ouro/25">
              <Telemovel largura={216} sombra={false}>
                <EcraWhatsApp />
              </Telemovel>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* A mensagem                                                   */}
      {/* ---------------------------------------------------------- */}
      <section className="border-y border-linha bg-grafite-alto/55 backdrop-blur-md">
        <div className="mx-auto grid max-w-conteudo items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8 md:py-28">
          <Revelar>
            <span className="etiqueta text-ouro-fundo">A mensagem</span>
            <h2 className="mt-5 max-w-[18ch] font-display text-[34px] leading-[1.08] text-creme md:text-[44px]">
              Escrita para ser lida na cozinha, não por um computador.
            </h2>
            <p className="mt-6 max-w-[44ch] font-sans text-[16px] leading-[1.68] text-tenue">
              Mesa, quantidades, observações e total alinhado. Chega ao mesmo WhatsApp que o
              restaurante já usa todos os dias — nada de painel novo para aprender.
            </p>
          </Revelar>

          <Revelar atraso={80}>
            <div className="overflow-x-auto rounded-cartao border border-linha bg-grafite/70 p-6 backdrop-blur-md">
              <pre className="whitespace-pre font-mono text-[12px] leading-[1.7] text-creme/90 sm:text-[13px]">
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

      {/* ---------------------------------------------------------- */}
      {/* Preços                                                       */}
      {/* ---------------------------------------------------------- */}
      <section id="precos" className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-32">
        <Revelar>
          <span className="etiqueta text-ouro-fundo">Preços</span>
          <h2 className="mt-5 font-display text-[36px] leading-[1.06] text-creme md:text-[50px]">
            Comece grátis. Cresça quando a sala encher.
          </h2>
        </Revelar>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PLANOS.map((plano, i) => (
            <Revelar key={plano.nome} atraso={i * 70}>
              <div
                className={`flex h-full flex-col rounded-cartao border p-7 transition-[transform,border-color,background-color] duration-300 ease-calmo hover:-translate-y-1 ${
                  plano.destaque ? 'border-ouro/40 bg-ouro/[0.06] hover:border-ouro/70' : 'border-linha bg-grafite-alto/60 hover:border-creme/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-[25px] text-creme">{plano.nome}</h3>
                  {plano.destaque ? <Distintivo tom="ouro">Mais escolhido</Distintivo> : null}
                </div>

                <p className="mt-5 font-sans text-[31px] font-extrabold tracking-[-0.03em] text-creme">
                  {plano.preco}
                </p>
                <p className="mt-1 font-sans text-[13px] text-tenue">{plano.detalhe}</p>

                <p className="mt-5 font-sans text-[14px] leading-[1.6] text-tenue">{plano.descricao}</p>

                <ul className="mt-7 flex flex-col gap-3 border-t border-linha pt-7">
                  {plano.inclui.map((linha) => (
                    <li key={linha} className="flex items-start gap-3 font-sans text-[14px] text-creme/85">
                      <span className="mt-[7px] block h-[5px] w-[5px] shrink-0 rounded-full bg-ouro" />
                      {linha}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-1">
                  <Botao asChild largo variante={plano.destaque ? 'ouro' : 'contorno'} tamanho="md">
                    <Link href="/criar-conta">{plano.cta}</Link>
                  </Botao>
                </div>
              </div>
            </Revelar>
          ))}
        </div>

        <Revelar atraso={200}>
          <p className="mt-8 font-sans text-[13px] text-tenue">
            Pagamentos por Multicaixa Express e AppyPay em breve. Por agora, a subscrição é
            combinada directamente connosco.
          </p>
        </Revelar>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Fecho                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-linha">
        <Image
          src="/pratos/ambiente.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-grafite/88" />
        <div className="relative mx-auto max-w-conteudo px-5 py-28 text-center md:px-8 md:py-36">
          <Revelar>
            <h2 className="mx-auto max-w-[18ch] font-display text-[38px] leading-[1.04] text-creme md:text-[56px]">
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

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-conteudo flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <Marca tamanho="sm" />
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <Link href="/entrar" className="font-sans text-[13px] text-tenue transition-colors hover:text-creme">
              Entrar
            </Link>
            <Link href="/criar-conta" className="font-sans text-[13px] text-tenue transition-colors hover:text-creme">
              Criar conta
            </Link>
            <Link href="/tia-bela" className="font-sans text-[13px] text-tenue transition-colors hover:text-creme">
              Cardápio de exemplo
            </Link>
          </div>
          <p className="font-sans text-[13px] text-tenue">Luanda, Angola</p>
        </div>
      </footer>
    </div>
  );
}

function PassoCabecalho({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <div>
      <span className="font-display text-[15px] text-ouro">{numero}</span>
      <h3 className="mt-3 font-display text-[24px] leading-[1.18] text-creme">{titulo}</h3>
      <p className="mt-3 font-sans text-[15px] leading-[1.62] text-tenue">{texto}</p>
    </div>
  );
}
