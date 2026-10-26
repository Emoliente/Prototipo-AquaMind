import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, OctagonAlert, TriangleAlert, X } from 'lucide-react';
import type { Alerta } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoHora } from '@/lib/format';
import { usePlantaSi } from '@/store/useTelemetria';
import { useNotificaciones } from '@/store/useNotificaciones';
import { useOperacion, usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { useModoDemo } from '@/demo/useModoDemo';
import { Boton } from '@/components/ui/Boton';
import { sinAceleracion } from '@/lib/movimiento';

/** Solo se muestran alertas de los últimos 90 min de planta. */
const RECIENTE = 90 * 60_000;

/** Alertas nuevas (advertencia y crítica) que entran deslizándose sobre cualquier pantalla. */
export function NotificacionesEnPantalla() {
  const emergentes = useNotificaciones((s) => s.emergentes);
  // Sin avisos en cola no hace falta escuchar cada dato de la planta.
  const planta = usePlantaSi(emergentes.length > 0);
  const quitar = useNotificaciones((s) => s.quitarEmergente);
  const { pathname } = useLocation();
  const enAlertas = pathname.startsWith('/alertas');
  const limpiar = useNotificaciones((s) => s.limpiarEmergentes);
  // En celular, durante el paso de Telegram del demo, la misma alerta ya se ve en el chat.
  const telegramDemo = useModoDemo((s) => s.activo && s.telegram);

  // En la pantalla de Alertas ya se ven todas: se dan por vistas y no se tapa la lista.
  useEffect(() => {
    if (enAlertas && emergentes.length) limpiar();
  }, [enAlertas, emergentes.length, limpiar]);

  const visibles = enAlertas
    ? []
    : emergentes
        .map((id) => planta?.alertas.find((a) => a.id === id))
        .filter((a): a is Alerta => !!a && !a.reconocida && planta!.t - a.t < RECIENTE)
        .slice(0, 2);

  return (
    <div
      aria-live="assertive"
      className={cn(
        'pointer-events-none fixed inset-x-4 top-[84px] z-[55] flex flex-col items-end gap-2 md:left-auto md:right-6 md:w-[26rem]',
        telegramDemo && 'max-md:hidden',
      )}
    >
      <AnimatePresence initial={false}>
        {visibles.map((a) => (
          <Emergente key={a.id} alerta={a} alCerrar={() => quitar(a.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Emergente({ alerta, alCerrar }: { alerta: Alerta; alCerrar: () => void }) {
  const critica = alerta.severidad === 'critica';
  const opera = usePuede('operar');
  const comando = useComando();
  const abrirPurga = useOperacion((s) => s.abrirPurga);
  const navegar = useNavigate();
  const Icono = critica ? OctagonAlert : TriangleAlert;

  // Las advertencias se van solas; las críticas esperan a que alguien las vea.
  // (ref: la tarjeta se vuelve a pintar con cada dato y no debe reiniciar el plazo)
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useEffect(() => {
    if (critica) return;
    const t = setTimeout(() => cerrar.current(), 10_000);
    return () => clearTimeout(t);
  }, [critica]);

  return (
    <motion.div
      layout
      role="alert"
      onUpdate={sinAceleracion}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-card border bg-surface-1 p-4 pl-5 shadow-2',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        critica ? 'border-crit/50 before:bg-crit' : 'border-warn/40 before:bg-warn',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', critica ? 'bg-crit-soft text-crit' : 'bg-warn-soft text-warn')}>
          <Icono className={cn('size-5', critica && 'anim-pulso')} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label">
            <span className={cn('font-semibold', critica ? 'text-crit' : 'text-warn')}>{critica ? 'Alerta crítica' : 'Advertencia'}</span>
            <span className="num text-fg-muted"> · {formatoHora(alerta.t)}</span>
            {alerta.naveId && <span className="text-fg-muted"> · Nave {alerta.naveId.slice(1)}</span>}
          </p>
          <p className="mt-0.5 text-body font-semibold text-fg">{alerta.titulo}</p>
          <p className="mt-1 text-label text-fg-muted">{alerta.accionSugerida}</p>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Ocultar aviso"
          className="-mr-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-btn text-fg-muted hover:bg-surface-3 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-12">
        {critica && alerta.naveId && opera ? (
          <Boton
            variante="primario"
            iconoDerecha={<ArrowRight />}
            onClick={() => {
              abrirPurga(alerta.naveId!);
              alCerrar();
            }}
          >
            Ver recomendación
          </Boton>
        ) : (
          <Boton
            iconoDerecha={<ArrowRight />}
            onClick={() => {
              navegar('/alertas');
              alCerrar();
            }}
          >
            Ver alertas
          </Boton>
        )}
        {opera && (
          <Boton variante="fantasma" icono={<Check />} onClick={() => comando({ tipo: 'reconocer_alerta', alertaId: alerta.id })}>
            Reconocer
          </Boton>
        )}
      </div>
    </motion.div>
  );
}
