import Link from 'next/link';
import { Marca } from '@/components/marca';
import { Botao } from '@/components/ui/botao';
import { DIAS_DE_TESTE } from '@/lib/planos';

/**
 * O rodapé da página inicial.
 *
 * Era uma linha: a marca, quatro ligações e "Luanda, Angola". Um rodapé
 * assim diz que a página acabou; este diz para onde se pode ir a
 * seguir, que é o que um rodapé de casa séria faz.
 *
 * TRÊS ANDARES, como nos rodapés que o dono escolheu: a marca com uma
 * frase e o botão, as colunas de ligações, e a barra de baixo com o ano
 * e a morada.
 *
 * O QUE NÃO ESTÁ AQUI, E PORQUÊ. Não há caixa de newsletter (não há
 * lista para onde enviar), não há ícones de redes sociais (as contas
 * ainda não existem) e não há número de telefone inventado — já cá
 * esteve um +244 000 000 000 visível para quem visitasse o site. Um
 * rodapé cheio de coisas que não levam a lado nenhum é pior do que um
 * rodapé curto: quem experimenta e bate em nada desconfia da casa toda.
 * Quando houver contactos e redes a sério, entram nas colunas que já
 * estão desenhadas para os receber.
 */

const COLUNAS: { titulo: string; ligacoes: { rotulo: string; href: string; externo?: boolean }[] }[] = [
  {
    titulo: 'O produto',
    ligacoes: [
      { rotulo: 'Como funciona', href: '/#como-funciona' },
      { rotulo: 'Onde chegam os pedidos', href: '/#caminhos' },
      { rotulo: 'Preços', href: '/#precos' },
      { rotulo: 'Perguntas frequentes', href: '/#perguntas' },
    ],
  },
  {
    titulo: 'Ver a funcionar',
    ligacoes: [
      { rotulo: 'Cardápio de exemplo', href: '/tia-bela?mesa=7' },
      { rotulo: 'Acompanhar um pedido', href: '/tia-bela' },
    ],
  },
  {
    titulo: 'A sua casa',
    ligacoes: [
      { rotulo: 'Entrar', href: '/entrar' },
      { rotulo: `Experimentar ${DIAS_DE_TESTE} dias`, href: '/criar-conta' },
    ],
  },
];

export function Rodape() {
  return (
    <footer className="border-t border-linha">
      <div className="mx-auto max-w-conteudo px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-16">
          {/* ---------------------------------------------------- */}
          {/* A marca                                               */}
          {/* ---------------------------------------------------- */}
          <div>
            <Marca />
            <p className="mt-5 max-w-[34ch] text-pretty font-sans text-sm leading-relaxed text-tenue">
              O cardápio digital das casas angolanas. O cliente lê o QR da mesa, pede sem instalar
              nada, e o pedido chega à cozinha já escrito.
            </p>
            <Botao asChild variante="laranja" tamanho="md" className="mt-6">
              <Link href="/criar-conta">Experimentar {DIAS_DE_TESTE} dias</Link>
            </Botao>
          </div>

          {/* ---------------------------------------------------- */}
          {/* As colunas                                            */}
          {/* ---------------------------------------------------- */}
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {COLUNAS.map((coluna) => (
              <nav key={coluna.titulo} aria-label={coluna.titulo}>
                <h2 className="etiqueta text-[11px] text-creme/40">{coluna.titulo}</h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {coluna.ligacoes.map((ligacao) => (
                    <li key={ligacao.rotulo}>
                      <Link
                        href={ligacao.href}
                        className="font-sans text-sm text-tenue transition-colors duration-200 hover:text-laranja"
                      >
                        {ligacao.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* A barra de baixo                                          */}
      {/* -------------------------------------------------------- */}
      <div className="border-t border-linha">
        <div className="mx-auto flex max-w-conteudo flex-col gap-3 px-5 py-6 font-sans text-xs text-tenue sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>
            © {new Date().getFullYear()} CardApp ·{' '}
            <span className="font-assinatura text-base text-creme/80">
              Feito em Luanda, para as casas de Angola
            </span>
          </p>
          <p className="flex items-center gap-2">
            Preços em Kwanzas
            <span aria-hidden className="h-1 w-1 rounded-full bg-current opacity-40" />
            Multicaixa Express e transferência
          </p>
        </div>
      </div>
    </footer>
  );
}
