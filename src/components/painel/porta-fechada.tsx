import Link from 'next/link';
import { Botao } from '@/components/ui/botao';
import { formatarKz } from '@/lib/format';
import { PRECO_PLANO, linkDePagamento } from '@/lib/planos';
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
 * O ecrã diz o número de referência da casa. Sem isso, quem paga fica
 * sem forma de provar que pagou.
 */
export function PortaFechada({ restaurante }: { restaurante: Restaurante }) {
  const preco = formatarKz(PRECO_PLANO[restaurante.plano]);

  /*
   * Sem link de pagamento configurado, o botão leva à conversa — que é
   * como isto funcionava antes de haver plataforma. Um botão que não vai
   * a lado nenhum, no único ecrã que pede dinheiro, seria o pior sítio
   * possível para uma variável de ambiente em falta.
   */
  const recado = `Olá. Quero pagar o plano ${NOME_PLANO[restaurante.plano]} do Cardapp. A minha casa é ${restaurante.nome} (${restaurante.slug}).`;
  const link =
    linkDePagamento(restaurante.plano) ??
    `https://wa.me/244953716363?text=${encodeURIComponent(recado)}`;

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

        <div className="mt-7 flex flex-wrap gap-3">
          <Botao asChild variante="ouro" tamanho="lg">
            <a href={link} target="_blank" rel="noreferrer">
              Pagar o plano {NOME_PLANO[restaurante.plano]}
            </a>
          </Botao>

          <Botao asChild variante="contorno" tamanho="lg">
            <a href={`/${restaurante.slug}`} target="_blank" rel="noreferrer">
              Ver o meu cardápio ↗
            </a>
          </Botao>
        </div>

        <p className="mt-7 border-t border-linha pt-5 font-sans text-xs leading-normal text-tenue">
          Assim que o pagamento entrar, o painel abre sozinho — não é preciso avisar ninguém nem
          voltar a entrar. Referência da casa:{' '}
          <span className="text-creme">{restaurante.slug}</span>.
        </p>

        <p className="mt-4 font-sans text-xs text-tenue">
          <Link href="/" className="underline underline-offset-4 hover:text-creme">
            Voltar à página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
