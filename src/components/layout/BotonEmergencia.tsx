import { useEffect } from 'react';
import { OctagonX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMantener } from '@/lib/useMantener';

interface Props {
  alActivar: () => void;
  deshabilitado?: boolean;
  /** Versión compacta para el encabezado en celular. */
  compacto?: boolean;
  className?: string;
}

const DURACION_MS = 1000;

/**
 * PARADA DE EMERGENCIA: cierra compuertas y apaga bombas.
 * Se mantiene 1 s (rápido, pero sin disparos accidentales).
 */
export function BotonEmergencia({ alActivar, deshabilitado, compacto, className }: Props) {
  const { progreso, fase, handlers, reiniciar } = useMantener(DURACION_MS, alActivar, deshabilitado);

  useEffect(() => {
    if (fase !== 'confirmado') return;
    const t = setTimeout(reiniciar, 2500);
    return () => clearTimeout(t);
  }, [fase, reiniciar]);

  const activada = fase === 'confirmado';

  return (
    <button
      type="button"
      disabled={deshabilitado}
      title={deshabilitado ? 'Solo personal de operación' : 'Mantén presionado 1 s'}
      aria-label={
        deshabilitado
          ? 'Parada de emergencia (solo personal de operación)'
          : 'Parada de emergencia: mantén presionado 1 segundo'
      }
      {...handlers}
      className={cn(
        'relative isolate inline-flex h-12 shrink-0 select-none items-center gap-2.5 overflow-hidden rounded-btn font-bold',
        'touch-none border-2 border-crit-strong bg-crit-strong text-white shadow-1 transition-[transform,filter] duration-150',
        'hover:brightness-110 disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-surface-3 disabled:text-fg-subtle disabled:hover:brightness-100',
        fase === 'manteniendo' && 'scale-[0.97]',
        compacto ? 'w-12 justify-center px-0' : 'px-4',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 -z-10 bg-black/30"
        style={{ width: `${progreso * 100}%` }}
      />
      <OctagonX className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
      {!compacto && (
        <span className="whitespace-nowrap text-label uppercase tracking-wide">
          {activada ? 'Parada activada' : 'Parada de emergencia'}
        </span>
      )}
    </button>
  );
}
