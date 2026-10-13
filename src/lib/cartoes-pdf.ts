'use client';

import { jsPDF } from 'jspdf';
import { nomeDaMesa } from './format';
import { qrDataUrl, urlDaMesa } from './qr';
import type { Mesa, Restaurante } from './tipos';

/**
 * Folha A4 com seis cartões de mesa por página, prontos a cortar.
 *
 * O CARTÃO TEM DUAS COISAS, E MAIS NENHUMA: o nome da mesa e o código.
 * Chegou aqui com o logótipo da casa no topo e o nome da casa por baixo,
 * e isso era repetir o que o cliente já tem à frente — ele está sentado
 * no restaurante, não precisa que um cartão lhe diga onde está. O que
 * ele precisa de saber é que mesa é a dele e para onde apontar a câmara.
 *
 * A marca do CardApp vive ao meio do código, desenhada pelo `qrDataUrl`,
 * e é a única que aparece.
 *
 * Impresso a preto e branco num café de bairro tem de continuar legível,
 * por isso o QR é grande e não leva cor por cima.
 */

export { qrDataUrl, urlDaMesa };

const A4 = { largura: 210, altura: 297 };
const COLUNAS = 2;
const LINHAS = 3;
const MARGEM = 10;

const LARGURA_CARTAO = (A4.largura - MARGEM * 2) / COLUNAS;
const ALTURA_CARTAO = (A4.altura - MARGEM * 2) / LINHAS;

/** Lado do código impresso, em milímetros. */
const LADO_QR = 48;

export async function gerarCartoesPdf(
  restaurante: Restaurante,
  mesas: Mesa[],
  base: string,
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const qrs = await Promise.all(
    mesas.map((mesa) => qrDataUrl(urlDaMesa(restaurante.slug, mesa.numero, base))),
  );

  mesas.forEach((mesa, indice) => {
    const posicao = indice % (COLUNAS * LINHAS);
    if (indice > 0 && posicao === 0) doc.addPage();

    const coluna = posicao % COLUNAS;
    const linha = Math.floor(posicao / COLUNAS);
    const x = MARGEM + coluna * LARGURA_CARTAO;
    const y = MARGEM + linha * ALTURA_CARTAO;

    desenharCartao(doc, { x, y, mesa, qr: qrs[indice] });
  });

  return doc.output('blob');
}

function desenharCartao(
  doc: jsPDF,
  { x, y, mesa, qr }: { x: number; y: number; mesa: Mesa; qr: string },
) {
  const centro = x + LARGURA_CARTAO / 2;

  // Guia de corte, fina e cinzenta. Não é moldura: é onde a tesoura passa.
  doc.setDrawColor(214);
  doc.setLineWidth(0.1);
  doc.rect(x, y, LARGURA_CARTAO, ALTURA_CARTAO);

  // O nome da mesa no topo, que é o que se lê de longe.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(28, 26, 23); // o tom da marca
  doc.text(nomeDaMesa(mesa), centro, y + 19, {
    align: 'center',
    maxWidth: LARGURA_CARTAO - 16,
  });

  const yQr = y + 27;
  doc.addImage(qr, 'PNG', centro - LADO_QR / 2, yQr, LADO_QR, LADO_QR, undefined, 'FAST');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(122, 122, 122);
  doc.text('SCANEIE PARA VER O CARDÁPIO', centro, yQr + LADO_QR + 9, { align: 'center' });
}
