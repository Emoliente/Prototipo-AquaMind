import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, X } from 'lucide-react';
import { useTelemetria } from '@/store/useTelemetria';
import { cn } from '@/lib/cn';
import { sinAceleracion } from '@/lib/movimiento';

/** Respuesta de la planta a cada comando (aceptado o rechazado). */
export function Avisos() {
  const avisos = useTelemetria((s) => s.avisos);
  const quitar = useTelemetria((s) => s.quitarAviso);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
    >
      <AnimatePresence initial={false}>
        {avisos.map((a) => (
          <motion.div
            key={a.id}
            layout
            onUpdate={sinAceleracion}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-surface-1 p-3 pl-4 shadow-2',
              a.ok ? 'border-line-strong' : 'border-crit/50',
            )}
          >
            {a.ok ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
            ) : (
              <CircleX className="mt-0.5 size-5 shrink-0 text-crit" aria-hidden />
            )}
            <p className="flex-1 text-label text-fg">
              <span className="font-semibold">{a.ok ? 'Hecho. ' : 'No se pudo. '}</span>
              {a.mensaje}
            </p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => quitar(a.id)}
              className="-m-1 grid size-8 shrink-0 place-items-center rounded-btn text-fg-muted hover:bg-surface-3"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
