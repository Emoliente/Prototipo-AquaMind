import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface Opcion<T extends string> {
  valor: T;
  texto: string;
  icono?: ReactNode;
}

interface Props<T extends string> {
  opciones: Opcion<T>[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
  /** Solo íconos (el texto queda para lectores de pantalla). */
  soloIconos?: boolean;
  className?: string;
}

/** Selector segmentado con indicador deslizante. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  soloIconos,
  className,
}: Props<T>) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn('inline-flex h-12 items-center gap-1 rounded-btn border border-line bg-surface-2 p-1', className)}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={soloIconos ? o.texto : undefined}
            title={soloIconos ? o.texto : undefined}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              'relative inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-[6px] px-3 text-label font-semibold transition-colors duration-200',
              activo ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[6px] border border-line-strong bg-surface-3 shadow-1"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {o.icono && <span className="relative [&>svg]:size-4">{o.icono}</span>}
            {!soloIconos && <span className="relative">{o.texto}</span>}
          </button>
        );
      })}
    </div>
  );
}
