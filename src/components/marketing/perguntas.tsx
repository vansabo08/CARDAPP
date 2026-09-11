import { Revelar } from '@/components/ui/revelar';
import { formatarKz } from '@/lib/format';
import { DIAS_DE_TESTE, PRECO_PLANO } from '@/lib/planos';

/**
 * As dúvidas que travam a decisão, respondidas antes de alguém ter de
 * perguntar. Vão em `<details>` nativo: abre sem JavaScript, é navegável
 * por teclado e o browser trata do estado sozinho.
 *
 * A mesma lista alimenta o texto e o schema — se um dia divergirem, a
 * culpa não pode ser de haver duas cópias.
 */
const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'O cliente precisa de instalar alguma aplicação?',
    resposta:
      'Não. A câmara do telemóvel lê o QR da mesa e o cardápio abre no browser. Não há aplicação para descarregar nem conta para criar — nem sequer um ecrã de login.',
  },
  {
    pergunta: 'Os pedidos chegam ao meu WhatsApp normal?',
    resposta:
      'Se quiser, chegam. É o mesmo número que já usa, e a mensagem vem escrita de uma vez, com a mesa, os pratos, as observações e o total em Kwanzas. Se preferir, recebe-os no painel do Cardapp, com alarme e com o estado de cada pedido. Escolhe nas definições e muda quando quiser.',
  },
  {
    pergunta: 'E se ninguém ouvir o pedido a chegar?',
    resposta:
      'No painel, o alarme toca quando o pedido entra e volta a tocar de quatro em quatro segundos até alguém carregar em Recebido. Não se cala sozinho. Deixe o painel aberto no telemóvel do balcão, com o som ligado, e instale-o como aplicação quando ele o sugerir.',
  },
  {
    pergunta: 'Como é que o cliente sabe que o pedido foi recebido?',
    resposta:
      'Quando a casa recebe os pedidos no painel, o cliente fica com um ecrã que mostra o caminho do pedido: recebido, a preparar, pronto, a caminho da mesa. Muda sozinho sempre que a cozinha marca um passo. No modo WhatsApp é a própria conversa que faz esse papel.',
  },
  {
    pergunta: 'E se a internet da zona estiver fraca?',
    resposta:
      'O cardápio foi feito para abrir em 3G num telemóvel modesto: as fotografias vão comprimidas e cada página carrega só o que desenha. Se a rede da zona costuma falhar, o modo WhatsApp é o mais resistente, porque o WhatsApp costuma aguentar quando as outras aplicações já não aguentam.',
  },
  {
    pergunta: 'Tenho de imprimir alguma coisa?',
    resposta:
      'Só os cartões das mesas. O Cardapp gera um PDF A4 com seis cartões por página, já com o QR de cada mesa. Imprime, corta e põe na mesa.',
  },
  {
    pergunta: 'Posso mudar um preço a meio do serviço?',
    resposta:
      'Pode. Altera no painel e o cardápio passa a mostrar o valor novo na abertura seguinte. Não é preciso reimprimir cartão nenhum, porque o QR aponta para o cardápio, não para os preços.',
  },
  {
    pergunta: 'Quanto custa?',
    resposta: `Há dois planos, e ambos abrem com ${DIAS_DE_TESTE} dias livres, com tudo aberto e sem cartão. Depois disso, o plano Mesa custa ${formatarKz(PRECO_PLANO.mesa)} por mês e o plano Sala ${formatarKz(PRECO_PLANO.sala)} por mês.`,
  },
  {
    pergunta: 'Preciso de cartão de crédito para experimentar?',
    resposta:
      'Não. Os sete dias abrem sem cartão nenhum. Só se fala em pagamento no fim deles, e se decidir ficar.',
  },
  {
    pergunta: 'Como se paga o plano?',
    resposta:
      'Por Multicaixa Express ou por transferência bancária. O painel mostra para onde transferir; depois envia a fotografia do comprovativo ali mesmo, e o painel reabre na hora enquanto confirmamos a transferência. Não há débito automático, e quem paga antes do fim não perde os dias que ainda tinha: somam-se.',
  },
  {
    pergunta: 'O cardápio funciona fora do restaurante?',
    resposta:
      'Funciona. O endereço é público, por isso pode partilhar a ligação no WhatsApp, no Instagram ou no Facebook. Quem abrir sem ler o QR vê o cardápio na mesma, apenas sem o número da mesa preenchido.',
  },
];

export function Perguntas() {
  return (
    <section id="perguntas" className="border-t border-linha">
      <div className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-[minmax(0,340px)_1fr] md:gap-16">
          <Revelar>
            <span className="etiqueta text-ouro-fundo">Perguntas</span>
            <h2 className="mt-5 text-balance font-display text-3xl leading-none text-creme md:text-4xl">
              O que costumam querer saber.
            </h2>
            <p className="mt-5 max-w-[34ch] text-pretty font-sans text-sm leading-relaxed text-tenue">
              Se ficar alguma por responder, escreva. Respondemos pelo mesmo sítio por onde os
              pedidos chegam.
            </p>
          </Revelar>

          <Revelar atraso={80}>
            <dl className="border-t border-linha">
              {PERGUNTAS.map(({ pergunta, resposta }) => (
                <details key={pergunta} className="group border-b border-linha">
                  <summary
                    className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 outline-none transition-colors duration-200 ease-calmo hover:text-creme focus-visible:ring-2 focus-visible:ring-ouro/60"
                    // O marcador nativo some, e o sinal fica a cargo do traço.
                  >
                    <dt className="text-pretty font-display text-lg leading-tight text-creme md:text-xl">
                      {pergunta}
                    </dt>
                    <span
                      aria-hidden
                      className="relative mt-2 h-[9px] w-[9px] shrink-0 text-ouro"
                    >
                      <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-current" />
                      <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-current transition-transform duration-300 ease-calmo group-open:scale-y-0" />
                    </span>
                  </summary>
                  <dd className="max-w-[62ch] pb-7 pr-8 text-pretty font-sans text-sm leading-relaxed text-tenue">
                    {resposta}
                  </dd>
                </details>
              ))}
            </dl>
          </Revelar>
        </div>
      </div>

      {/* Para quem pergunta ao motor de busca em vez de perguntar aqui. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: PERGUNTAS.map(({ pergunta, resposta }) => ({
              '@type': 'Question',
              name: pergunta,
              acceptedAnswer: { '@type': 'Answer', text: resposta },
            })),
          }),
        }}
      />
    </section>
  );
}
