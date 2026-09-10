import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { PagarEProvar } from '@/components/painel/pagar-e-provar';
import { formatarKz } from '@/lib/format';
import { PRECO_PLANO } from '@/lib/planos';
import { NOME_PLANO, type Restaurante } from '@/lib/tipos';

/**
 * O painel, fechado por falta de pagamento.
 *
 * Não é um aviso: é a porta. Substitui o conteúdo todo do painel, e a
 * casa não gere cardápio nem mesas enquanto não pagar.
 *
 * O que fica de fora desta porta, de propósito: o cardápio das mesas
 * continua a servir e os pedidos continuam a entrar. Se o cardápio
 * morresse, quem pagava a conta eram os clientes sentados à mesa a meio
 * da refeição — pessoas que não têm nada a ver com a assinatura de
 * ninguém. Fechar o painel dói ao dono, que é quem decide pagar; fechar
 * o cardápio dói a quem está a jantar.
 *
 * O pagamento acontece aqui dentro: mostram-se as credenciais, a casa
 * transfere, e sobe o comprovativo no mesmo ecrã. Mandá-la para fora —
 * para uma plataforma, para o WhatsApp — era perder metade das pessoas
 * pelo caminho, no único ecrã onde isso custa dinheiro.
 */
export function PortaFechada({
  restaurante,
  aEsperarConfirmacao = false,
}: {
  restaurante: Restaurante;
  aEsperarConfirmacao?: boolean;
}) {
  const preco = formatarKz(PRECO_PLANO[restaurante.plano]);

  return (
    <div className="mx-auto max-w-[560px] py-10 md:py-16">
      <div className="vidro rounded-folha p-7 md:p-9">
        <span className="etiqueta text-ouro-fundo">Conta suspensa</span>

        <h1 className="mt-5 text-balance font-display text-3xl leading-tight text-creme md:text-4xl">
          O tempo de experiência acabou.
        </h1>

        <p className="mt-5 text-pretty font-sans text-base leading-relaxed text-tenue">
          O painel do {restaurante.nome} está fechado até o plano ser pago. O plano{' '}
          {NOME_PLANO[restaurante.plano]} custa <span className="text-creme">{preco}</span> por mês.
        </p>

        <div className="mt-7 rounded-cartao border border-linha p-5">
          <p className="font-sans text-sm font-semibold text-creme">
            O seu cardápio continua a funcionar.
          </p>
          <p className="mt-2 text-pretty font-sans text-sm leading-relaxed text-tenue">
            As mesas continuam a ler o QR, os clientes continuam a pedir e os pedidos continuam a
            entrar. O que está fechado é a gestão: mudar pratos, preços e mesas.
          </p>
        </div>

        <div className="mt-7 border-t border-linha pt-7">
          {aEsperarConfirmacao ? (
            /*
             * O beco: comprovativo entregue, os dias provisórios gastos, e
             * ninguém decidiu. Sem isto a casa via o ecrã de pagar, voltava
             * a enviar, e era recusada por já haver um à espera — fechada,
             * tendo pago, sem nada que pudesse fazer.
             */
            <div>
              <p className="font-sans text-sm font-semibold text-creme">
                O seu comprovativo está connosco.
              </p>
              <p className="mt-2 text-pretty font-sans text-sm leading-relaxed text-tenue">
                Recebemos a prova da transferência e ainda não a confirmámos no banco. Isto demorou
                mais do que devia — mande-nos uma mensagem e resolvemos já.
              </p>
              <Botao asChild variante="ouro" tamanho="lg" className="mt-5">
                <a
                  href={`https://wa.me/244930207076?text=${encodeURIComponent(
                    `Olá. Enviei o comprovativo do plano do Cardapp e a minha casa continua fechada. A casa é ${restaurante.nome} (${restaurante.slug}).`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar connosco no WhatsApp
                </a>
              </Botao>
            </div>
          ) : (
            <PagarEProvar restaurante={restaurante} />
          )}
        </div>

        <div className="mt-7 border-t border-linha pt-5">
          <Botao asChild variante="contorno" tamanho="lg">
            <a href={`/${restaurante.slug}`} target="_blank" rel="noreferrer">
              Ver o meu cardápio ↗
            </a>
          </Botao>
        </div>

        <p className="mt-4 font-sans text-xs text-tenue">
          <Link href="/" className="underline underline-offset-4 hover:text-creme">
            Voltar à página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
