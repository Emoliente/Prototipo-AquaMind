import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { sinAceleracion } from '@/lib/movimiento';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  titulo: ReactNode;
  descripcion?: ReactNode;
  icono?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
  /** `centro`: modal (hoja inferior en celular). `lateral`: panel desde la derecha. */
  variante?: 'centro' | 'lateral';
  ancho?: string;
}

// Diálogos abiertos a la vez (uno puede abrir otro encima).
let abiertos = 0;

/** Diálogo accesible: Escape cierra, el foco entra al abrir y vuelve al cerrar. */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  icono,
  children,
  pie,
  variante = 'centro',
  ancho = 'sm:max-w-lg',
}: Props) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const previo = useRef<HTMLElement | null>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    if (!abierto) return;
    previo.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => panel.current?.focus(), 30);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar.current();
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    // Con un diálogo abierto, lo animado de la pantalla de atrás (tapado por el fondo oscuro) se
    // pausa: el navegador deja de recomponerlo en cada cuadro. Los datos siguen actualizándose.
    abiertos++;
    document.documentElement.dataset.modal = '';
    return () => {
      if (--abiertos === 0) delete document.documentElement.dataset.modal;
      clearTimeout(t);
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
      previo.current?.focus?.();
    };
  }, [abierto]);

  const lateral = variante === 'lateral';

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-overlay"
            onUpdate={sinAceleracion}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={alCerrar}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            tabIndex={-1}
            onUpdate={sinAceleracion}
            initial={lateral ? { x: '100%' } : { y: 40, opacity: 0 }}
            animate={lateral ? { x: 0 } : { y: 0, opacity: 1 }}
            exit={lateral ? { x: '100%' } : { y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col border border-line-strong bg-surface-1 shadow-2 outline-none',
              lateral
                ? 'ml-auto h-dvh max-h-dvh rounded-none sm:h-dvh sm:max-w-md sm:self-stretch'
                : cn('rounded-t-panel sm:mx-4 sm:rounded-panel', ancho),
            )}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
              {icono && (
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-btn bg-surface-3 text-fg-muted [&>svg]:size-5">
                  {icono}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={`${id}-t`} className="text-title font-semibold text-fg">
                  {titulo}
                </h2>
                {descripcion && <p className="text-label text-fg-muted">{descripcion}</p>}
              </div>
              <button
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar"
                className="-mr-2 -mt-1 grid size-12 shrink-0 place-items-center rounded-btn text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {pie && <footer className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{pie}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
