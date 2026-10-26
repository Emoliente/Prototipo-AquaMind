import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Nivel de superficie: 1 (tarjeta) o 2 (tarjeta dentro de un panel). */
  nivel?: 1 | 2;
  relleno?: 'none' | 'sm' | 'md' | 'lg';
}

const RELLENO = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

export function Tarjeta({ nivel = 1, relleno = 'md', className, ...resto }: Props) {
  return (
    <div
      className={cn(
        'rounded-card border shadow-1',
        nivel === 1 ? 'border-line bg-surface-1' : 'border-line bg-surface-2',
        RELLENO[relleno],
        className,
      )}
      {...resto}
    />
  );
}

export function EncabezadoTarjeta({
  titulo,
  subtitulo,
  icono,
  accion,
  className,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  icono?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icono && (
          <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface-3 text-fg-muted">
            {icono}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-title font-semibold text-fg">{titulo}</h3>
          {subtitulo && <p className="truncate text-label text-fg-muted">{subtitulo}</p>}
        </div>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}
