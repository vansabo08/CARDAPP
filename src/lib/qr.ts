'use client';

import QRCode from 'qrcode';

/** Endereço que o QR de uma mesa abre. */
export function urlDaMesa(slug: string, numero: number, base: string) {
  const raiz = base.replace(/\/+$/, '');
  return `${raiz}/${slug}?mesa=${numero}`;
}

/**
 * O QR com a marca ao meio.
 *
 * DUAS COISAS TÊM DE ANDAR JUNTAS, E É POR ISSO QUE VIVEM NA MESMA
 * FUNÇÃO: tapar o centro de um QR estraga parte do desenho, e um QR só
 * aguenta isso se tiver sido gerado com correcção de erros alta. Com a
 * correcção média que aqui estava, o mesmo buraco deixava o código por
 * ler — e isso só se descobre com o cliente à mesa, a apontar a câmara
 * para um cartão impresso aos cento e cinquenta.
 *
 * O nível `H` repõe até 30 % do código a partir do que sobra. A marca
 * ocupa 22 % do lado, que dá menos de 5 % da área: fica com folga de
 * sobra, e o código lê-se mesmo com um dedo a tapar um canto.
 *
 * O quadrado branco por baixo da marca não é enfeite: é ele que diz à
 * câmara que aquilo não faz parte do código.
 */
export async function qrDataUrl(texto: string, largura = 512, comMarca = true) {
  const base = await QRCode.toDataURL(texto, {
    width: largura,
    margin: 0,
    errorCorrectionLevel: comMarca ? 'H' : 'M',
    color: { dark: '#1C1A17', light: '#FFFFFF' },
  });

  if (!comMarca || typeof document === 'undefined') return base;

  try {
    return await comMarcaAoCentro(base, largura);
  } catch {
    // Sem marca é melhor do que sem código: se o desenho falhar — um
    // browser antigo, a imagem a não carregar — devolve-se o QR puro.
    return base;
  }
}

/** A marca da casa, desenhada por cima do código já feito. */
async function comMarcaAoCentro(qrDataUrl: string, largura: number) {
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = largura;

  const pincel = tela.getContext('2d');
  if (!pincel) return qrDataUrl;

  pincel.drawImage(await carregar(qrDataUrl), 0, 0, largura, largura);

  const lado = Math.round(largura * 0.22);
  const canto = Math.round(lado * 0.22);
  const x = Math.round((largura - lado) / 2);

  // A folha branca por baixo, com uma margem a toda a volta para os
  // pontos do código não encostarem à marca.
  pincel.fillStyle = '#FFFFFF';
  quadradoRedondo(pincel, x, x, lado, canto);
  pincel.fill();

  const marca = Math.round(lado * 0.74);
  const margem = Math.round((lado - marca) / 2);
  pincel.drawImage(
    await carregar('/brand/cardapp-simbolo-primary.svg'),
    x + margem,
    x + margem,
    marca,
    marca,
  );

  return tela.toDataURL('image/png');
}

function carregar(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = src;
  });
}

function quadradoRedondo(
  pincel: CanvasRenderingContext2D,
  x: number,
  y: number,
  lado: number,
  raio: number,
) {
  pincel.beginPath();
  pincel.moveTo(x + raio, y);
  pincel.arcTo(x + lado, y, x + lado, y + lado, raio);
  pincel.arcTo(x + lado, y + lado, x, y + lado, raio);
  pincel.arcTo(x, y + lado, x, y, raio);
  pincel.arcTo(x, y, x + lado, y, raio);
  pincel.closePath();
}
