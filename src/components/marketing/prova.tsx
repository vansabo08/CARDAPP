import Link from 'next/link';
import QRCode from 'qrcode';
import { Revelar } from '@/components/ui/revelar';
import { Botao } from '@/components/ui/botao';
import { SITE_URL } from '@/lib/supabase/config';

/**
 * Prova, no lugar onde antes havia testemunhos por preencher.
 *
 * A secção anterior mostrava três citações marcadas como [TODO] a quem
 * visitasse o site — e chegaram a estar em produção. Inventar as
 * citações resolvia o aspecto e publicava uma mentira; deixá-las por
 * preencher dizia ao visitante que a casa não está acabada.
 *
 * A saída é não alegar prova que não existe e mostrar a que existe: o
 * produto a funcionar. O código aqui ao lado é real, é gerado pelo mesmo
 * módulo que imprime os cartões das mesas, e abre o cardápio de exemplo
 * exactamente como abriria numa mesa. Em cinco segundos o visitante
 * deixa de ler sobre o Cardapp e passa a usá-lo.
 *
 * Quando houver depoimentos verdadeiros, com autorização, entram por
 * baixo desta secção — não no lugar dela.
 */
export async function Prova() {
  const enderecoDemo = `${SITE_URL.replace(/\/+$/, '')}/tia-bela?mesa=7`;

  /**
   * O QR é gerado no build e fica cozido no HTML estático. Se a variável
   * NEXT_PUBLIC_SITE_URL faltar nesse momento, o `SITE_URL` recua para
   * localhost — e toda a gente receberia um código que não abre em
   * telemóvel nenhum. Um código que falha é pior do que código nenhum,
   * porque quem o lê conclui que o produto não funciona.
   *
   * Em desenvolvimento mostra-se na mesma, para se poder ver o desenho.
   */
  const enderecoLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(enderecoDemo);
  const mostrarQr = !enderecoLocal || process.env.NODE_ENV !== 'production';

  const qr = mostrarQr
    ? await QRCode.toDataURL(enderecoDemo, {
        width: 512,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#141414', light: '#FAF8F5' },
      })
    : null;

  return (
    <section className="border-t border-linha">
      <div className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-28">
        <div className="grid items-center gap-14 md:grid-cols-[1fr_minmax(0,300px)] md:gap-16">
          <Revelar>
            <span className="etiqueta text-ouro-fundo">Prova</span>

            <h2 className="mt-5 max-w-[20ch] text-balance font-display text-[34px] leading-[1.08] text-creme md:text-[44px]">
              Não lhe mostramos elogios que ainda não recebemos.
            </h2>

            <p className="mt-6 max-w-[52ch] text-pretty font-sans text-[16px] leading-[1.68] text-tenue">
              O Cardapp é novo e ainda está a juntar as primeiras casas. Em vez de testemunhos,
              fica aqui o produto a trabalhar
              {qr
                ? ': leia este código com a câmara do telemóvel, como faria sentado a uma mesa, e veja o cardápio abrir e o pedido sair já escrito para o WhatsApp.'
                : ': abra o cardápio de exemplo e veja o pedido sair já escrito para o WhatsApp.'}
            </p>

            {qr ? (
              <p className="mt-4 max-w-[52ch] text-pretty font-sans text-[15px] leading-[1.65] text-tenue">
                É o mesmo cartão que o Cardapp imprime para as suas mesas, gerado pelo mesmo código.
              </p>
            ) : null}

            <div className="mt-9">
              <Botao asChild variante="contorno" tamanho="lg">
                <Link href="/tia-bela?mesa=7">
                  {qr ? 'Abrir sem ler o código' : 'Abrir o cardápio de exemplo'}
                </Link>
              </Botao>
            </div>
          </Revelar>

          {qr ? (
            <Revelar atraso={100} className="flex justify-center md:justify-end">
              {/* O cartão da mesa, tal e qual sai da impressora. */}
              <figure className="w-[264px] rounded-cartao border border-linha bg-creme p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)]">
                <figcaption className="text-center">
                  <span className="etiqueta text-grafite/55">Mesa 7</span>
                </figcaption>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt={`Código QR que abre o cardápio de exemplo do Cardapp em ${enderecoDemo}`}
                  width={512}
                  height={512}
                  className="mt-4 h-auto w-full rounded-[6px]"
                />

                <p className="mt-4 text-center text-pretty font-sans text-[12.5px] leading-[1.5] text-grafite/60">
                  Aponte a câmara. O cardápio abre sem instalar nada.
                </p>
              </figure>
            </Revelar>
          ) : null}
        </div>
      </div>
    </section>
  );
}
