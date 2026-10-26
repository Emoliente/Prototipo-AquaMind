import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { sinAceleracion } from '@/lib/movimiento';

interface Props {
  /** Contenido del botón disparador. */
  disparador: (abierto: boolean) => ReactNode;
  etiqueta: string;
  children: (cerrar: () => void) => ReactNode;
  alinear?: 'izquierda' | 'derecha';
  ancho?: string;
  claseDisparador?: string;
  deshabilitado?: boolean;
}

/**
 * Menú desplegable: se cierra con Escape o al tocar fuera.
 * Se dibuja en su propia capa (portal) encima de las alertas en pantalla: si una alerta
 * llega mientras el menú está abierto, no tapa sus opciones.
 */
export function Menu({
  disparador,
  etiqueta,
  children,
  alinear = 'derecha',
  ancho = 'w-80',
  claseDisparador,
  deshabilitado,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = useState<CSSProperties>({});

  // Bajo el botón, alineado a su borde; se recalcula si cambia el tamaño de la ventana.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = raiz.current?.getBoundingClientRect();
      if (!r) return;
      setPosicion(alinear === 'derecha' ? { top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) } : { top: r.bottom + 8, left: Math.max(16, r.left) });
    };
    ubicar();
    window.addEventListener('resize', ubicar);
    return () => window.removeEventListener('resize', ubicar);
  }, [abierto, alinear]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!raiz.current?.contains(t) && !panel.current?.contains(t)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta}
        disabled={deshabilitado}
        onClick={() => setAbierto((a) => !a)}
        className={cn('select-none transition-colors duration-150', claseDisparador)}
      >
        {disparador(abierto)}
      </button>
      {createPortal(
      <AnimatePresence>
        {abierto && (
          <motion.div
            ref={panel}
            role="menu"
            aria-label={etiqueta}
            style={posicion}
            onUpdate={sinAceleracion}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            className={cn(
              'fixed z-[59] max-w-[calc(100vw-2rem)] rounded-card border border-line-strong bg-surface-1 p-2 shadow-2',
              alinear === 'derecha' ? 'origin-top-right' : 'origin-top-left',
              ancho,
            )}
          >
            {children(() => setAbierto(false))}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </div>
  );
}

export function OpcionMenu({
  icono,
  titulo,
  descripcion,
  activo,
  deshabilitado,
  motivo,
  onClick,
}: {
  icono?: ReactNode;
  titulo: ReactNode;
  descripcion?: ReactNode;
  activo?: boolean;
  deshabilitado?: boolean;
  /** Por qué está deshabilitada. */
  motivo?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-start gap-3 rounded-btn px-3 py-2.5 text-left transition-colors',
        activo ? 'bg-accent-soft' : 'hover:bg-surface-3',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent',
      )}
    >
      {icono && <span className={cn('mt-0.5 shrink-0 [&>svg]:size-5', activo ? 'text-accent' : 'text-fg-muted')}>{icono}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-fg">{titulo}</span>
        {descripcion && <span className="block text-label text-fg-muted">{descripcion}</span>}
        {deshabilitado && motivo && <span className="mt-0.5 block text-label font-medium text-warn">{motivo}</span>}
      </span>
      {activo && <Check className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />}
    </button>
  );
}
