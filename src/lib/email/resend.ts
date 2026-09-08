import 'server-only';
import { Resend } from 'resend';

/**
 * Cliente Resend. Só do lado do servidor — a chave é secreta a sério,
 * ao contrário da anon do Supabase: quem a tiver envia email em nome
 * deste domínio. Por isso nunca leva o prefixo NEXT_PUBLIC_.
 */

const CHAVE = process.env.RESEND_API_KEY ?? '';

/**
 * Remetente. Sem domínio verificado, o Resend só deixa usar
 * onboarding@resend.dev — e só para o email da própria conta.
 */
export const REMETENTE = process.env.RESEND_REMETENTE ?? 'Cardapp <onboarding@resend.dev>';

export function resendConfigurado() {
  return CHAVE.startsWith('re_');
}

let instancia: Resend | null = null;

export function cliente() {
  if (!resendConfigurado()) return null;
  if (!instancia) instancia = new Resend(CHAVE);
  return instancia;
}

export type ResultadoEnvio =
  | { ok: true; id: string | null }
  | { ok: false; erro: string };

export async function enviarEmail({
  para,
  assunto,
  html,
  texto,
}: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}): Promise<ResultadoEnvio> {
  const resend = cliente();
  if (!resend) return { ok: false, erro: 'RESEND_API_KEY em falta.' };

  const { data, error } = await resend.emails.send({
    from: REMETENTE,
    to: [para],
    subject: assunto,
    html,
    text: texto,
  });

  if (error) return { ok: false, erro: error.message ?? String(error) };
  return { ok: true, id: data?.id ?? null };
}
