import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMantener } from '@/lib/useMantener';
import { sinAceleracion } from '@/lib/movimiento';

interface Props {
  etiqueta: string;
  /** Texto mostrado tras confirmar. */
  etiquetaConfirmado?: string;
  icono: ReactNode;
  alConfirmar: () => void;
  duracionMs?: number;
  variante?: 'primario' | 'peligro';
  deshabilitado?: boolean;
  /** Vuelve al reposo tras confirmar (ms). 0 = se queda confirmado. */
  reiniciarTrasMs?: number;
  /** Modo demo: el botón se mantiene presionado solo (se ve el anillo llenarse). */
  pulsarSolo?: boolean;
  className?: string;
}

const R = 17;
const CIRC = 2 * Math.PI * R;

/** Botón de acción crítica: hay que mantenerlo presionado; un anillo muestra el avance. */
export function BotonMantener({
  etiqueta,
  etiquetaConfirmado = 'Confirmado',
  icono,
  alConfirmar,
  duracionMs = 2000,
  variante = 'primario',
  deshabilitado,
  reiniciarTrasMs = 2200,
  pulsarSolo,
  className,
}: Props) {
  const { progreso, fase, handlers, reiniciar, empezar } = useMantener(duracionMs, alConfirmar, deshabilitado);

  useEffect(() => {
    if (pulsarSolo && fase === 'reposo') empezar();
  }, [pulsarSolo, fase, empezar]);
  const segundos = (duracionMs / 1000).toLocaleString('es-PE');

  useEffect(() => {
    if (fase !== 'confirmado' || !reiniciarTrasMs) return;
    const t = setTimeout(reiniciar, reiniciarTrasMs);
    return () => clearTimeout(t);
  }, [fase, reiniciar, reiniciarTrasMs]);

  const confirmado = fase === 'confirmado';
  const peligro = variante === 'peligro';
  const ayuda =
    fase === 'manteniendo'
      ? 'Sigue presionando…'
      : fase === 'soltado'
        ? `Soltaste antes: mantén ${segundos} s`
        : confirmado
          ? 'Comando enviado'
          : `Mantén presionado ${segundos} s`;

  return (
    <button
      type="button"
      disabled={deshabilitado}
      aria-label={`${etiqueta}. ${ayuda}`}
      {...handlers}
      className={cn(
        'group relative isolate flex min-h-16 w-full select-none items-center gap-4 overflow-hidden rounded-btn py-2 pl-3 pr-5 text-left',
        'touch-none transition-[transform,background-color,box-shadow] duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        fase === 'manteniendo' && 'scale-[0.985]',
        peligro
          ? 'bg-crit-strong text-white'
          : confirmado
            ? 'bg-ok text-fg-on-accent'
            : 'bg-accent text-fg-on-accent',
        className,
      )}
    >
      {/* Relleno de fondo que acompaña al anillo */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 -z-10 bg-black/15"
        style={{ width: `${progreso * 100}%` }}
      />
      <span className="relative grid size-11 shrink-0 place-items-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r={R} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
          <circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progreso)}
            className={cn(fase === 'soltado' && 'transition-[stroke-dashoffset] duration-300 ease-out')}
          />
        </svg>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={confirmado ? 'ok' : 'icono'}
            onUpdate={sinAceleracion}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid place-items-center [&>svg]:size-5"
          >
            {confirmado ? <Check strokeWidth={2.5} /> : icono}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-title font-semibold leading-tight">
          {confirmado ? etiquetaConfirmado : etiqueta}
        </span>
        <span className="truncate text-label opacity-80">{ayuda}</span>
      </span>
    </button>
  );
}
