'use client';

import * as React from 'react';
import { Botao } from '@/components/ui/botao';
import { Campo, Erro } from '@/components/ui/campo';
import { qrDataUrl, urlDaMesa } from '@/lib/qr';
import { numeroMesa } from '@/lib/format';
import { LIMITES_PLANO, type Mesa, type Restaurante } from '@/lib/tipos';
import { acrescentarMesas, apagarMesa } from '@/app/painel/mesas/accoes';

export function GestorMesas({
  restaurante,
  mesasIniciais,
  base,
  demonstracao,
}: {
  restaurante: Restaurante;
  mesasIniciais: Mesa[];
  base: string;
  demonstracao: boolean;
}) {
  const [mesas, setMesas] = React.useState(mesasIniciais);
  const [quantas, setQuantas] = React.useState('4');
  const [aGerar, setAGerar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const limite = LIMITES_PLANO[restaurante.plano].mesas;
  const cheio = mesas.length >= limite;

  async function juntar() {
    setErro(null);
    const n = Math.max(1, Math.min(50, Number.parseInt(quantas, 10) || 1));

    if (mesas.length + n > limite) {
      setErro(`O plano actual permite ${limite} ${limite === 1 ? 'mesa' : 'mesas'}.`);
      return;
    }

    const resultado = await acrescentarMesas(n);

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }

    if (resultado.mesas?.length) {
      setMesas((m) => [...m, ...resultado.mesas!].sort((a, b) => a.numero - b.numero));
      return;
    }

    // Demonstração: as mesas existem só no ecrã.
    const maior = mesas.reduce((m, mesa) => Math.max(m, mesa.numero), 0);
    setMesas((m) => [
      ...m,
      ...Array.from({ length: n }, (_, i) => ({
        id: `demo-${maior + i + 1}`,
        restaurant_id: restaurante.id,
        numero: maior + i + 1,
        qr_token: `demo${maior + i + 1}`,
      })),
    ]);
  }

  async function remover(id: string) {
    setMesas((m) => m.filter((x) => x.id !== id));
    await apagarMesa(id);
  }

  async function descarregar() {
    if (!mesas.length) return;
    setAGerar(true);
    setErro(null);
    try {
      // O jsPDF só entra no telemóvel de quem carrega no botão.
      const { gerarCartoesPdf } = await import('@/lib/cartoes-pdf');
      const blob = await gerarCartoesPdf(restaurante, mesas, base);
      const url = URL.createObjectURL(blob);
      const ligacao = document.createElement('a');
      ligacao.href = url;
      ligacao.download = `cartoes-${restaurante.slug}.pdf`;
      document.body.appendChild(ligacao);
      ligacao.click();
      ligacao.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErro('Não foi possível gerar o PDF.');
    } finally {
      setAGerar(false);
    }
  }

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Botao variante="ouro" tamanho="md" onClick={descarregar} disabled={aGerar || !mesas.length}>
          {aGerar ? 'A preparar…' : 'Descarregar cartões (PDF)'}
        </Botao>

        <div className="flex items-center gap-2">
          <Campo
            aria-label="Quantas mesas juntar"
            inputMode="numeric"
            value={quantas}
            onChange={(e) => setQuantas(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="w-[70px] text-center"
          />
          <Botao variante="contorno" tamanho="md" onClick={juntar} disabled={cheio}>
            Juntar mesas
          </Botao>
        </div>
      </div>

      {cheio ? (
        <p className="mt-4 font-sans text-[13.5px] text-tenue">
          O plano Balcão dá direito a uma mesa. O plano Mesa não tem limite.
        </p>
      ) : null}
      {demonstracao ? (
        <p className="mt-4 font-sans text-[13.5px] text-tenue">
          Estes QR apontam para <span className="text-creme">{base}</span> — mude o endereço em
          NEXT_PUBLIC_SITE_URL antes de imprimir a sério.
        </p>
      ) : null}
      {erro ? <Erro>{erro}</Erro> : null}

      <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {mesas.map((mesa) => (
          <CartaoMesaQr
            key={mesa.id}
            mesa={mesa}
            slug={restaurante.slug}
            base={base}
            aoRemover={() => remover(mesa.id)}
          />
        ))}
      </div>

      {!mesas.length ? (
        <p className="vidro mt-10 rounded-cartao px-6 py-12 text-center font-sans text-[15px] text-tenue">
          Ainda não há mesas. Junte as que tem na sala e imprima os cartões.
        </p>
      ) : null}
    </div>
  );
}

function CartaoMesaQr({
  mesa,
  slug,
  base,
  aoRemover,
}: {
  mesa: Mesa;
  slug: string;
  base: string;
  aoRemover: () => void;
}) {
  const [qr, setQr] = React.useState<string | null>(null);
  const url = urlDaMesa(slug, mesa.numero, base);

  React.useEffect(() => {
    let vivo = true;
    qrDataUrl(url, 320).then((d) => {
      if (vivo) setQr(d);
    });
    return () => {
      vivo = false;
    };
  }, [url]);

  return (
    <div className="vidro-leve group relative flex flex-col items-center rounded-cartao p-4">
      <button
        type="button"
        onClick={aoRemover}
        aria-label={`Apagar mesa ${mesa.numero}`}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-tenue opacity-0 transition-opacity duration-200 hover:bg-white/[0.07] hover:text-creme focus-visible:opacity-100 group-hover:opacity-100"
      >
        ×
      </button>

      <div className="flex aspect-square w-full items-center justify-center rounded-campo bg-creme p-3">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR da mesa ${mesa.numero}`} className="h-full w-full" />
        ) : (
          <span className="h-full w-full animate-pulse rounded bg-grafite/10" />
        )}
      </div>

      <p className="mt-3 font-display text-[19px] text-creme">Mesa {numeroMesa(mesa.numero)}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 max-w-full truncate font-sans text-[11.5px] text-tenue underline underline-offset-4 hover:text-creme"
      >
        abrir ↗
      </a>
    </div>
  );
}
