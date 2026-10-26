import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface Props {
  activo: boolean;
  alCambiar: (v: boolean) => void;
  etiqueta: ReactNode;
  descripcion?: ReactNode;
  deshabilitado?: boolean;
  className?: string;
}

/** Interruptor encendido/apagado con texto: toda la fila es tocable (48 px). */
export function Interruptor({ activo, alCambiar, etiqueta, descripcion, deshabilitado, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => alCambiar(!activo)}
      className={cn(
        'flex min-h-12 w-full items-center justify-between gap-4 rounded-btn px-3 py-2 text-left transition-colors hover:bg-surface-2',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-body font-medium text-fg">{etiqueta}</span>
        {descripcion && <span className="block text-label text-fg-muted">{descripcion}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="w-8 text-right text-label font-semibold text-fg-muted">{activo ? 'Sí' : 'No'}</span>
        <span className={cn('relative h-7 w-12 rounded-full transition-colors duration-200', activo ? 'bg-accent' : 'bg-surface-3 ring-1 ring-line-strong')}>
          <motion.span
            className="absolute top-1 size-5 rounded-full bg-white shadow-1"
            initial={false}
            animate={{ left: activo ? 24 : 4 }}
            transition={{ type: 'spring', stiffness: 600, damping: 36 }}
          />
        </span>
      </span>
    </button>
  );
}
