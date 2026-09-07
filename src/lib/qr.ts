'use client';

import QRCode from 'qrcode';

/** Endereço que o QR de uma mesa abre. */
export function urlDaMesa(slug: string, numero: number, base: string) {
  const raiz = base.replace(/\/+$/, '');
  return `${raiz}/${slug}?mesa=${numero}`;
}

export async function qrDataUrl(texto: string, largura = 512) {
  return QRCode.toDataURL(texto, {
    width: largura,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#141414', light: '#FFFFFF' },
  });
}
