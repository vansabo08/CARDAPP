import type { Metadata } from 'next';
import { FormularioAuth } from '@/components/autenticacao/formulario-auth';

export const metadata: Metadata = { title: 'Entrar' };

export default function PaginaEntrar() {
  return <FormularioAuth modo="entrar" />;
}
