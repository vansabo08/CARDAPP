import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Onboarding } from '@/components/painel/onboarding';
import { emModoDemonstracao } from '@/lib/dados';
import { utilizadorActual } from '@/lib/supabase/servidor';

export const metadata: Metadata = { title: 'Começar' };

export const dynamic = 'force-dynamic';

/**
 * Fica fora de /painel de propósito: durante os quatro passos não há
 * ainda restaurante nenhum, e a barra lateral não teria o que mostrar.
 */
export default async function PaginaComecar() {
  const demonstracao = emModoDemonstracao();
  if (!demonstracao && !(await utilizadorActual())) redirect('/entrar');

  return <Onboarding demonstracao={demonstracao} />;
}
