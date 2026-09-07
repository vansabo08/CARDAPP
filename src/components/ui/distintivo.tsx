import { cn } from '@/lib/utils';

export function Distintivo({
  className,
  tom = 'linha',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tom?: 'linha' | 'ouro' | 'verde' | 'apagado' }) {
  return (
    <span
      className={cn(
        'etiqueta inline-flex items-center rounded-full px-2.5 py-1',
        tom === 'linha' && 'border border-linha text-tenue',
        tom === 'ouro' && 'bg-ouro/12 text-ouro',
        tom === 'verde' && 'bg-verde/12 text-verde',
        tom === 'apagado' && 'border border-linha-escura text-tenue-escuro',
        className,
      )}
      {...props}
    />
  );
}
