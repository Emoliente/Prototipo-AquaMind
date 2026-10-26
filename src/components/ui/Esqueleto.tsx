import { cn } from '@/lib/cn';

/** Bloque de carga: se usa en lugar de pantallas vacías. */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn('esqueleto rounded-btn', className)} />;
}
