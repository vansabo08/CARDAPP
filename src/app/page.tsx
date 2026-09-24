import Link from 'next/link';
import Image from 'next/image';
import { Botao } from '@/components/ui/botao';
import { Revelar } from '@/components/ui/revelar';
import { Marca } from '@/components/marca';
import { Telemovel } from '@/components/marketing/telemovel';
import { TelemovelFlutuante } from '@/components/marketing/telemovel-flutuante';
import { BarraFlutuante } from '@/components/marketing/barra-flutuante';
import {
  CartaoMesa,
  EcraAcompanhar,
  EcraCardapio,
  EcraPainel,
  BalaoWhatsApp,
} from '@/components/marketing/mockups';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import { FaixaPratos } from '@/components/marketing/faixa-pratos';
import { FraseRevelada } from '@/components/marketing/frase-revelada';
import { Prova } from '@/components/marketing/prova';
import { Perguntas } from '@/components/marketing/perguntas';
import { Precos } from '@/components/marketing/precos';
import { Rodape } from '@/components/marketing/rodape';
import { EcraEmUso } from '@/components/marketing/ecra-em-uso';
import { EntraESai } from '@/components/marketing/entra-e-sai';

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
    titulo: 'O pedido chega à cozinha',
    texto:
      'No WhatsApp ou no painel do CardApp, como a casa escolher. No painel, um alarme toca até alguém carregar em Recebido.',
  },
];

/**
 * O que o painel faz, dito pelo que resolve.
 *
 * Cada linha diz primeiro o problema que acaba e só depois como. "Alarme
 * que insiste" é uma funcionalidade; "nenhum pedido fica por ver" é a
 * razão para alguém a querer.
 */
const CAMINHO_PAINEL = [
  {
    titulo: 'Nenhum pedido fica por ver',
    texto:
      'Um alarme toca quando o pedido entra e volta a tocar de quatro em quatro segundos, até alguém carregar em Recebido.',
  },
  {
    titulo: 'A alergia não se perde na lista',
    texto:
      'O que o cliente escreve, como "sem cebola" ou "alérgico a amendoim", aparece numa caixa própria, destacada dos pratos.',
  },
  {
    titulo: 'A cozinha marca cada passo',
    texto: 'A preparar, pronto, a caminho. Um toque em cada um, e o cliente vê a mudança na mesa.',
  },
];

export default function PaginaInicial() {
  return (
    // `overflow-x-clip`, e não `hidden`: o clip corta o que sai pelo
    // lado (o brilho do aparelho, a faixa dos pratos) sem criar um
    // contexto de rolagem — com `hidden`, a barra de cima deixava de
    // poder ser fixa.
    <div className="relative min-h-dvh overflow-x-clip">
      <FundoVivo />

      {/*
        Para quem navega por teclado: primeira paragem do tabulador, e
        invisível até lá. Sem isto, chegar ao conteúdo obriga a passar por
        toda a navegação em cada página.
      */}
      <a
        href="#conteudo"
        className="sr-only rounded-campo bg-laranja px-4 py-2 font-sans text-sm font-semibold text-creme focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[60]"
      >
        Saltar para o conteúdo
      </a>

      {/* ---------------------------------------------------------- */}
      {/* Navegação                                                    */}
      {/* ---------------------------------------------------------- */}
      <BarraFlutuante />

      <main id="conteudo">
      {/* ---------------------------------------------------------- */}
      {/* Herói                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-conteudo px-5 pb-24 pt-24 md:px-8 md:pb-32 md:pt-32">
          {/*
            O aparelho fica ao lado do texto em toda a parte, também no
            telemóvel — em baixo, ninguém o via sem rolar, e era ele que
            contava o que isto é. Aí é pequeno, com a coluna do texto a
            mandar; os botões é que descem para debaixo dos dois, porque
            um botão de 40 % de largura não se carrega bem.
          */}
          <div className="grid grid-cols-[1fr_136px] items-center gap-x-5 gap-y-10 sm:grid-cols-[1fr_190px] sm:gap-x-8 lg:grid-cols-[1fr_420px] lg:gap-x-16">
            <div className="min-w-0">
              <Revelar>
                <span className="etiqueta text-laranja">Premium · Angola · Kwanza</span>
              </Revelar>

              {/*
                Escala do Tailwind, sem valores arbitrários. O `text-6xl`
                já traz a entrelinha 1, que é a que um display quer — por
                isso não se lhe põe `leading` à mão. O `tracking-tight`
                é da escala e a Playfair, com o contraste que tem,
                precisa dele nos tamanhos grandes.
              */}
              <Revelar atraso={60}>
                <h1 className="mt-5 max-w-[12ch] text-balance font-display text-[30px] leading-[1.05] tracking-tight text-creme sm:text-4xl md:mt-6 md:text-6xl md:leading-none">
                  O cardápio que cabe numa{' '}
                  <span className="laranja-display font-assinatura text-[1.25em] font-normal tracking-normal">
                    mesa.
                  </span>
                </h1>
              </Revelar>

              <Revelar atraso={120}>
                <p className="mt-5 max-w-[44ch] text-pretty font-sans text-sm leading-relaxed text-tenue sm:text-base md:mt-8 md:text-lg">
                  O cliente lê o QR da mesa e pede sem instalar nada. O pedido chega à cozinha já
                  escrito, no WhatsApp ou no painel do CardApp, e ele acompanha no telemóvel até o
                  prato chegar.
                </p>
              </Revelar>
            </div>

            <Revelar atraso={140} className="flex justify-center lg:row-span-2 lg:justify-end">
              <TelemovelFlutuante>
                {/*
                  Os três momentos, em ciclo: escolher, acompanhar, a
                  cozinha a receber. É a app a ser usada, e não uma
                  fotografia dela.
                */}
                <EcraEmUso
                  passos={[
                    { rotulo: 'Escolhe na mesa', ecra: <EcraCardapio /> },
                    { rotulo: 'Acompanha o pedido', ecra: <EcraAcompanhar /> },
                    { rotulo: 'A cozinha recebe', ecra: <EcraPainel /> },
                  ]}
                />
              </TelemovelFlutuante>
            </Revelar>

            <div className="col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:-mt-2">
              <Revelar atraso={180}>
                <div className="flex flex-wrap items-center gap-3">
                  <Botao asChild variante="laranja" tamanho="lg">
                    <Link href="/criar-conta">Experimentar 7 dias</Link>
                  </Botao>
                  <Botao asChild variante="contorno" tamanho="lg">
                    <Link href="/tia-bela?mesa=7">Ver um cardápio a sério</Link>
                  </Botao>
                </div>
              </Revelar>

              <Revelar atraso={240}>
                <p className="mt-6 font-sans text-sm text-tenue">
                  Sete dias com tudo aberto. Sem cartão de crédito.
                </p>
              </Revelar>
            </div>
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
        {/* Ao meio: são três colunas iguais por baixo, e um título
            encostado à esquerda por cima de três colunas centradas
            deixava a secção torta. */}
        <Revelar className="text-center">
          <span className="etiqueta text-laranja">Como funciona</span>
          <h2 className="mx-auto mt-5 max-w-[20ch] text-balance font-display text-4xl leading-tight text-creme md:text-5xl">
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
              <div className="absolute inset-0 bg-grafite/60" />
              <div className="relative px-6 py-14">
                <CartaoMesa numero={7} />
              </div>
            </div>
          </Revelar>

          <Revelar atraso={80} className="flex flex-col">
            <PassoCabecalho {...PASSOS[1]} />
            <div className="mt-9 flex flex-1 items-center justify-center px-2 py-6">
              <EntraESai de="baixo" atraso={0.05}>
                <Telemovel largura={216} sombra={false}>
                  <EcraCardapio />
                </Telemovel>
              </EntraESai>
            </div>
          </Revelar>

          <Revelar atraso={160} className="flex flex-col">
            <PassoCabecalho {...PASSOS[2]} />
            <div className="mt-9 flex flex-1 items-center justify-center px-2 py-6">
              <EntraESai de="direita" atraso={0.12}>
                <Telemovel largura={216} sombra={false}>
                  <EcraPainel />
                </Telemovel>
              </EntraESai>
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
            className="mx-auto max-w-[620px] text-center font-display text-2xl leading-snug tracking-[-0.01em] md:text-[34px]"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Dois caminhos                                                */}
      {/* ---------------------------------------------------------- */}
      {/*
        Isto era "A mensagem", e mostrava só o WhatsApp — do tempo em que
        era o único caminho. Uma casa que lesse a página até aqui ficava a
        pensar que o CardApp era um gerador de mensagens, e não sabia que
        podia receber os pedidos num painel com alarme.
      */}
      <section id="caminhos" className="border-t border-linha">
        <div className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-32">
          <Revelar>
            <span className="etiqueta text-laranja">Onde chegam os pedidos</span>
            {/*
              Parte no ponto final, que é onde o pensamento parte. Com um
              limite de largura em caracteres partia em "Dois caminhos. A /
              casa escolhe o seu", com o artigo pendurado no fim da linha.
            */}
            <h2 className="mt-5 text-balance font-display text-4xl leading-none text-creme md:text-5xl">
              <span className="block">Dois caminhos.</span>{" "}
              <span className="block">A casa escolhe o seu.</span>
            </h2>
            <p className="mt-6 max-w-[52ch] text-pretty font-sans text-base leading-relaxed text-tenue">
              Escolhe nas definições e muda quando quiser. O cardápio das mesas é o mesmo nos dois.
            </p>
          </Revelar>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {/* WhatsApp */}
            <Revelar className="flex">
              <article className="flex w-full flex-col">
                <span className="etiqueta text-verde">No WhatsApp</span>
                <h3 className="mt-4 text-balance font-display text-2xl leading-tight text-creme">
                  O número que a casa já usa todos os dias.
                </h3>
                <p className="mt-3 text-pretty font-sans text-sm leading-relaxed text-tenue">
                  A mensagem chega escrita de uma vez, com a mesa, as quantidades, as observações e o
                  total alinhado. Não há nada novo para aprender.
                </p>
                {/* A mensagem dentro do balão do WhatsApp: é assim que
                    ela chega ao telefone de quem está na cozinha. */}
                {/* Sem moldura: o balão já tem a cor da conversa, e uma
                    caixa branca à volta fazia dois cartões um dentro do
                    outro. */}
                <div className="mt-6">
                  <BalaoWhatsApp fundo={false} />
                </div>
              </article>
            </Revelar>

            {/* Painel */}
            <Revelar atraso={80} className="flex">
              <article className="flex w-full flex-col">
                <span className="etiqueta text-laranja">No painel do CardApp</span>
                <h3 className="mt-4 text-balance font-display text-2xl leading-tight text-creme">
                  Os pedidos numa lista que se mexe sozinha.
                </h3>
                <p className="mt-3 text-pretty font-sans text-sm leading-relaxed text-tenue">
                  Fica aberto no telemóvel do balcão, instalado como uma aplicação. Cada pedido novo
                  aparece em cima, na hora.
                </p>

                <ul className="mt-6 flex flex-col gap-5">
                  {CAMINHO_PAINEL.map((linha) => (
                    <li key={linha.titulo} className="flex gap-4">
                      <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-laranja" aria-hidden />
                      <span>
                        <span className="block font-sans text-sm font-semibold text-creme">
                          {linha.titulo}
                        </span>
                        <span className="mt-1 block text-pretty font-sans text-sm leading-relaxed text-tenue">
                          {linha.texto}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* O cliente acompanha                                          */}
      {/* ---------------------------------------------------------- */}
      <section className="border-y border-linha">
        <div className="mx-auto grid max-w-conteudo items-center gap-16 px-5 py-24 md:grid-cols-2 md:px-8 md:py-28">
          <EntraESai de="direita" className="flex justify-center md:order-2">
            <Telemovel largura={300} sombra={false}>
              {/* Os dois estados que o cliente vê enquanto espera. */}
              <EcraEmUso
                passos={[
                  { rotulo: 'A preparar', ecra: <EcraAcompanhar /> },
                  { rotulo: 'A caminho da mesa', ecra: <EcraAcompanhar estado="caminho" /> },
                ]}
              />
            </Telemovel>
          </EntraESai>

          <Revelar atraso={80}>
            <span className="etiqueta text-laranja">Depois de pedir</span>
            <h2 className="mt-5 text-balance font-display text-3xl leading-none text-creme md:text-4xl">
              <span className="block">O cliente sabe que o prato</span>{" "}
              <span className="block">já está a ser feito.</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-pretty font-sans text-base leading-relaxed text-tenue">
              Quando a casa recebe os pedidos no painel, o telemóvel do cliente mostra o caminho do
              dele: recebido, a preparar, pronto, a caminho da mesa. Muda sozinho a cada passo que a
              cozinha dá, sem recarregar nada.
            </p>
            <p className="mt-4 max-w-[46ch] text-pretty font-sans text-base leading-relaxed text-tenue">
              É a pergunta que faz levantar a mão a meio da refeição. Deixa de ser preciso fazê-la.
            </p>
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
        <div className="absolute inset-0 bg-grafite/90" />
        <div className="relative mx-auto max-w-conteudo px-5 py-28 text-center md:px-8 md:py-36">
          <Revelar>
            <h2 className="mx-auto max-w-[18ch] text-balance font-display text-4xl leading-none text-creme md:text-5xl">
              O seu cardápio pode estar pronto ao almoço.
            </h2>
            <div className="mt-10">
              <Botao asChild variante="laranja" tamanho="lg">
                <Link href="/criar-conta">Experimentar 7 dias</Link>
              </Botao>
            </div>
          </Revelar>
        </div>
      </section>

      </main>

      <Rodape />
    </div>
  );
}

function PassoCabecalho({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <div className="text-center">
      {/* O número num círculo: ao meio, marca o princípio da coluna. */}
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-laranja/15 font-display text-sm text-laranja">
        {numero}
      </span>
      <h3 className="mt-4 text-balance font-display text-2xl leading-tight text-creme">{titulo}</h3>
      <p className="mx-auto mt-3 max-w-[38ch] text-pretty font-sans text-sm leading-normal text-tenue">
        {texto}
      </p>
    </div>
  );
}
