'use client';

import { clienteNavegador } from './supabase/cliente';
import { BUCKET } from './supabase/config';

export const TAMANHO_MAXIMO = 4 * 1024 * 1024; // 4 MB
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export type ResultadoUpload =
  | { ok: true; url: string | null; demonstracao?: boolean }
  | { ok: false; erro: string };

/**
 * Reduz a imagem antes de enviar. Uma foto de telemovel tem 4 MB e o
 * cardapio mostra-a a 76px: enviar o original seria castigar quem depois
 * a descarrega em 3G.
 */
async function encolher(ficheiro: File, ladoMaximo = 1000): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return ficheiro;

  try {
    const bitmap = await createImageBitmap(ficheiro);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && ficheiro.size < 600_000) return ficheiro;

    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;

    const ctx = tela.getContext('2d');
    if (!ctx) return ficheiro;
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const blob = await new Promise<Blob | null>((resolve) =>
      tela.toBlob(resolve, 'image/webp', 0.82),
    );
    return blob && blob.size < ficheiro.size ? blob : ficheiro;
  } catch {
    return ficheiro;
  }
}

/** Envia uma imagem para o Storage e devolve o URL publico. */
export async function enviarImagem(ficheiro: File, pasta: 'pratos' | 'logos'): Promise<ResultadoUpload> {
  if (!TIPOS.includes(ficheiro.type)) {
    return { ok: false, erro: 'Use uma imagem JPG, PNG ou WebP.' };
  }
  if (ficheiro.size > TAMANHO_MAXIMO) {
    return { ok: false, erro: 'A imagem é maior do que 4 MB.' };
  }

  const supabase = clienteNavegador();
  if (!supabase) {
    // Sem Supabase nao ha onde guardar; o ecra continua utilizavel.
    return { ok: true, url: null, demonstracao: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' };

  const reduzida = await encolher(ficheiro);
  const extensao = reduzida.type === 'image/webp' ? 'webp' : ficheiro.name.split('.').pop() || 'jpg';
  const caminho = `${user.id}/${pasta}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, reduzida, {
    cacheControl: '31536000',
    upsert: false,
    contentType: reduzida.type,
  });

  if (error) return { ok: false, erro: 'Não foi possível enviar a imagem.' };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return { ok: true, url: data.publicUrl };
}
