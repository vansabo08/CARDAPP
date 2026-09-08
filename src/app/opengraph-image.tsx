import { imagemDePartilha, TAMANHO_OG, TIPO_OG } from '@/lib/og';

export const alt = 'Cardapp — o cardápio que cabe numa mesa';
export const size = TAMANHO_OG;
export const contentType = TIPO_OG;

export default async function Imagem() {
  return imagemDePartilha({
    etiqueta: 'Angola · Kwanza',
    titulo: 'O cardápio que cabe numa mesa.',
    subtitulo: 'O cliente lê o QR, escolhe, e o pedido chega ao WhatsApp já escrito.',
  });
}
