import { emModoDemonstracao } from '@/lib/dados';
import { cn } from '@/lib/utils';

/**
 * Aviso de modo de demonstração.
 *
 * Sem credenciais do Supabase a aplicação continua a abrir e a parecer
 * inteira — só que nada é gravado. Foi assim que um deploy sem
 * variáveis de ambiente passou por bom durante dias.
 *
 * Um produto que perde pedidos tem de o dizer em voz alta, e no sítio
 * onde alguém está mesmo a olhar: por cima de tudo, em todas as
 * páginas que dependem da base de dados.
 */
export function AvisoDemonstracao({ className }: { className?: string }) {
  if (!emModoDemonstracao()) return null;

  return (
    <div
      role="status"
      className={cn(
        'relative z-[60] flex flex-wrap items-center justify-center gap-x-2 gap-y-1',
        'border-b border-[#e0655a]/25 bg-[#e0655a]/12 px-4 py-2.5 text-center',
        className,
      )}
    >
      <span className="etiqueta text-[#e0655a]">Modo de demonstração</span>
      <span className="font-sans text-[13px] leading-snug text-creme/80">
        O Supabase não está ligado — nenhum pedido é gravado.
      </span>
      <span className="font-sans text-[12.5px] text-tenue">
        Faltam <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </span>
    </div>
  );
}
