import { AnimatePresence, motion } from 'framer-motion';
import { OctagonX, ShieldCheck, WifiOff } from 'lucide-react';
import { usePlantaCampos, useTelemetria } from '@/store/useTelemetria';
import { useComando } from '@/store/useComando';
import { usePuede } from '@/store/useOperacion';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { sinAceleracion } from '@/lib/movimiento';

/** Avisos de planta que deben verse en todas las pantallas. */
export function BannersPlanta() {
  const emergencia = usePlantaCampos((p) => p.emergencia);
  const conectado = useTelemetria((s) => s.conectado);
  const opera = usePuede('operar');
  const comando = useComando();
  const sinConexion = emergencia !== undefined && !conectado;

  return (
    <AnimatePresence initial={false}>
      {emergencia && (
        <motion.div
          key="emergencia"
          onUpdate={sinAceleracion}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          role="alert"
        >
          <div className="flex flex-col gap-3 border-b border-crit/40 bg-crit-soft px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <OctagonX className="hidden size-6 shrink-0 text-crit sm:block" aria-hidden />
            <p className="flex-1 text-body text-fg">
              <span className="font-bold text-crit">PARADA DE EMERGENCIA ACTIVA.</span> Compuertas cerradas y bombas apagadas.
            </p>
            {opera && (
              <BotonMantener
                etiqueta="Rearmar la planta"
                etiquetaConfirmado="Planta rearmada"
                icono={<ShieldCheck />}
                alConfirmar={() => comando({ tipo: 'rearmar' })}
                className="h-14 sm:w-72"
              />
            )}
          </div>
        </motion.div>
      )}
      {sinConexion && (
        <motion.div
          key="conexion"
          onUpdate={sinAceleracion}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          role="status"
        >
          <div className="flex items-center gap-3 border-b border-line bg-stale-soft px-4 py-3 sm:px-6 lg:px-8">
            <WifiOff className="size-5 shrink-0 text-stale" aria-hidden />
            <p className="text-label text-fg">
              <span className="font-semibold">Sin datos de la planta.</span> Los valores que ves son los últimos recibidos y pueden estar desactualizados.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
