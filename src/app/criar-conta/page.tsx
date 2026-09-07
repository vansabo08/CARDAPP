import type { Metadata } from 'next';
import { FormularioAuth } from '@/components/autenticacao/formulario-auth';

export const metadata: Metadata = { title: 'Criar conta' };

export default function PaginaCriarConta() {
  return <FormularioAuth modo="criar" />;
}
