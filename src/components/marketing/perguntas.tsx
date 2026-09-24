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
      'Se quiser, chegam. É o mesmo número que já usa, e a mensagem vem escrita de uma vez, com a mesa, os pratos, as observações e o total em Kwanzas. Se preferir, recebe-os no painel do CardApp, com alarme e com o estado de cada pedido. Escolhe nas definições e muda quando quiser.',
  },
  {
    pergunta: 'E se ninguém ouvir o pedido a chegar?',
    resposta:
      'No painel, o alarme toca quando o pedido entra e volta a tocar de quatro em quatro segundos até alguém carregar em Recebido. Não se cala sozinho. Deixe o painel aberto no telemóvel do balcão, com o som ligado, e instale-o como aplicação quando ele o sugerir.',
  },
  {
    pergunta: 'Tenho de imprimir alguma coisa?',
    resposta:
      'Só os cartões das mesas. O CardApp gera um PDF A4 com seis cartões por página, já com o QR de cada mesa. Imprime, corta e põe na mesa.',
  },
  {
    pergunta: 'Quanto custa?',
    resposta: `Há dois planos, e ambos abrem com ${DIAS_DE_TESTE} dias livres, com tudo aberto e sem cartão. Depois disso, o plano Mesa custa ${formatarKz(PRECO_PLANO.mesa)} por mês e o plano Sala ${formatarKz(PRECO_PLANO.sala)} por mês.`,
  },
  {
    pergunta: 'Como se paga o plano?',
    resposta:
      'Por Multicaixa Express ou por transferência bancária. O painel mostra para onde transferir; depois envia a fotografia do comprovativo ali mesmo, e o painel reabre na hora enquanto confirmamos a transferência. Não há débito automático, e quem paga antes do fim não perde os dias que ainda tinha: somam-se.',
  },
];

export function Perguntas() {
  return (
    <section id="perguntas" className="border-t border-linha">
      <div className="mx-auto max-w-[860px] px-5 py-24 md:px-8 md:py-28">
        {/*
          O título ao meio e as perguntas em cartões numerados, como na
          referência. Cada uma é um `<details>`: abre sem JavaScript,
          responde ao teclado, e o browser trata do estado — o número e o
          sinal de mais são só o desenho por cima disso.
        */}
        <Revelar className="text-center">
          <span className="etiqueta inline-flex items-center gap-2 text-laranja">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-laranja" />
            FAQ
          </span>
          <h2 className="mt-4 text-balance font-display text-3xl leading-tight text-creme md:text-[40px]">
            O que costumam querer saber
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-pretty font-sans text-sm leading-relaxed text-tenue">
            Se ficar alguma por responder, escreva. Respondemos pelo mesmo sítio por onde os pedidos
            chegam.
          </p>
        </Revelar>

        <dl className="mt-12 flex flex-col gap-3">
          {PERGUNTAS.map(({ pergunta, resposta }, n) => (
            <Revelar key={pergunta} atraso={n * 50}>
              <details className="superficie group rounded-[18px] transition-shadow duration-300 hover:shadow-elevacao-2 open:shadow-elevacao-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-laranja/60 md:px-6 md:py-5">
                  <dt className="flex min-w-0 items-baseline gap-2.5 text-pretty font-sans text-[15px] font-semibold leading-snug text-creme md:text-base">
                    <span className="shrink-0 tabular-nums text-laranja">{n + 1}.</span>
                    {pergunta}
                  </dt>
                  {/* O mais que vira menos: a barra de pé encolhe ao abrir. */}
                  <span aria-hidden className="relative h-3 w-3 shrink-0 text-creme/50">
                    <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-current" />
                    <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ease-calmo group-open:scale-y-0" />
                  </span>
                </summary>
                <dd className="px-5 pb-5 pr-10 text-pretty font-sans text-sm leading-relaxed text-tenue md:px-6 md:pb-6 md:pl-[3.1rem]">
                  {resposta}
                </dd>
              </details>
            </Revelar>
          ))}
        </dl>
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
