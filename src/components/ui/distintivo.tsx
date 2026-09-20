import { cn } from '@/lib/utils';

export function Distintivo({
  className,
  tom = 'linha',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tom?: 'linha' | 'laranja' | 'verde' | 'apagado' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 font-sans text-xs font-semibold',
        tom === 'linha' && 'border border-linha text-tenue',
        tom === 'laranja' && 'bg-laranja/15 text-laranja',
        tom === 'verde' && 'bg-verde/15 text-verde',
        tom === 'apagado' && 'border border-linha-escura text-tenue-escuro',
        className,
      )}
      {...props}
    />
  );
}
