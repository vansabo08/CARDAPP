'use client';

import { jsPDF } from 'jspdf';
import { numeroMesa } from './format';
import { qrDataUrl, urlDaMesa } from './qr';
import type { Mesa, Restaurante } from './tipos';

/**
 * Folha A4 com seis cartões de mesa por página, prontos a cortar.
 * Impressa a preto e branco num café de bairro tem de continuar legível,
 * por isso o QR é grande e não leva cor por cima.
 */

export { qrDataUrl, urlDaMesa };

const A4 = { largura: 210, altura: 297 };
const COLUNAS = 2;
const LINHAS = 3;
const MARGEM = 10;

const LARGURA_CARTAO = (A4.largura - MARGEM * 2) / COLUNAS;
const ALTURA_CARTAO = (A4.altura - MARGEM * 2) / LINHAS;

/** Descarrega o logótipo e converte-o em data URL para o jsPDF. */
async function logoParaPdf(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const resposta = await fetch(url, { mode: 'cors' });
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise<string | null>((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(typeof leitor.result === 'string' ? leitor.result : null);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarCartoesPdf(
  restaurante: Restaurante,
  mesas: Mesa[],
  base: string,
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const [qrs, logo] = await Promise.all([
    Promise.all(mesas.map((mesa) => qrDataUrl(urlDaMesa(restaurante.slug, mesa.numero, base)))),
    logoParaPdf(restaurante.logo_url),
  ]);

  mesas.forEach((mesa, indice) => {
    const posicao = indice % (COLUNAS * LINHAS);
    if (indice > 0 && posicao === 0) doc.addPage();

    const coluna = posicao % COLUNAS;
    const linha = Math.floor(posicao / COLUNAS);
    const x = MARGEM + coluna * LARGURA_CARTAO;
    const y = MARGEM + linha * ALTURA_CARTAO;

    desenharCartao(doc, { x, y, restaurante, mesa, qr: qrs[indice], logo });
  });

  return doc.output('blob');
}

function desenharCartao(
  doc: jsPDF,
  {
    x,
    y,
    restaurante,
    mesa,
    qr,
    logo,
  }: {
    x: number;
    y: number;
    restaurante: Restaurante;
    mesa: Mesa;
    qr: string;
    logo: string | null;
  },
) {
  const centro = x + LARGURA_CARTAO / 2;

  // Guia de corte, fina e cinzenta.
  doc.setDrawColor(210);
  doc.setLineWidth(0.1);
  doc.rect(x, y, LARGURA_CARTAO, ALTURA_CARTAO);

  let cursor = y + 14;

  if (logo) {
    try {
      doc.addImage(logo, centro - 9, cursor - 5, 18, 18, undefined, 'FAST');
      cursor += 18;
    } catch {
      /* logótipo em formato que o jsPDF não lê: seguimos com o nome */
    }
  }

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(restaurante.nome, centro, cursor, { align: 'center', maxWidth: LARGURA_CARTAO - 20 });

  const ladoQr = 42;
  const yQr = cursor + 6;
  doc.addImage(qr, 'PNG', centro - ladoQr / 2, yQr, ladoQr, ladoQr, undefined, 'FAST');

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('SCANEIE PARA VER O CARDÁPIO', centro, yQr + ladoQr + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(`Mesa ${numeroMesa(mesa.numero)}`, centro, yQr + ladoQr + 19, { align: 'center' });
}
