import { AnimatePresence, motion } from 'framer-motion';
import { CirclePause, Play, PiggyBank, RotateCcw, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { usePlantaSi } from '@/store/useTelemetria';
import { Boton } from '@/components/ui/Boton';
import { Valor } from '@/components/ui/Valor';
import { VistaPreviaTelegram } from '@/features/alertas/VistaPreviaTelegram';
import { DURACION_NOMINAL_MS, PASOS } from './guionDemo';
import { useModoDemo } from './useModoDemo';
import { useContextoDemo } from './useMotorDemo';
import { sinAceleracion } from '@/lib/movimiento';

/** Botón para lanzar el recorrido de 60 s. */
export function BotonModoDemo({ compacto, className }: { compacto?: boolean; className?: string }) {
  const activo = useModoDemo((s) => s.activo);
  const pedir = useModoDemo((s) => s.pedirInicio);
  return (
    <Boton
      variante="secundario"
      tamano={compacto ? 'icono' : 'md'}
      icono={<Play />}
      onClick={pedir}
      disabled={activo}
      aria-label="Iniciar modo demo (recorrido de 60 segundos)"
      title="Modo demo: recorrido de 60 s"
      className={className}
    >
      {!compacto && 'Modo demo'}
    </Boton>
  );
}

/** Barra flotante del recorrido: paso, narración, avance, pausa, reinicio y salida. */
export function BarraDemo() {
  const s = useModoDemo();
  const planta = usePlantaSi(s.activo);
  const ctx = useContextoDemo();
  const paso = PASOS[s.paso];
  const avance = Math.min(1, s.msTotal / DURACION_NOMINAL_MS);
  const restante = Math.max(0, Math.ceil((DURACION_NOMINAL_MS - s.msTotal) / 1000));

  return (
    <AnimatePresence>
      {s.activo && (
        <motion.div
          role="region"
          aria-label="Modo demo"
          onUpdate={sinAceleracion}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[58] md:inset-x-auto md:bottom-6 md:left-[calc(50%+40px)] md:w-[min(760px,calc(100vw-140px))] md:-translate-x-1/2 xl:left-[calc(50%+128px)]"
        >
          <div className="overflow-hidden rounded-panel border border-accent-ring bg-surface-1 shadow-2">
            <div className="h-1 bg-surface-3">
              <motion.div className="h-full bg-accent" initial={false} animate={{ width: `${avance * 100}%` }} transition={{ duration: 0.2, ease: 'linear' }} />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="flex flex-wrap items-center gap-x-2 text-label font-semibold text-accent">
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.7rem] uppercase tracking-wider">Modo demo</span>
                  {s.terminado ? (
                    'Recorrido terminado'
                  ) : (
                    <>
                      <span className="num">
                        Paso {s.paso + 1} de {PASOS.length}
                      </span>
                      <span className="text-fg">· {paso.titulo}</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-body text-fg">
                  {s.terminado
                    ? 'Del lodo que sube al bombeo calculado, todo quedó en la bitácora. Puedes repetirlo o seguir explorando.'
                    : planta
                      ? paso.narracion(planta)
                      : 'Preparando la planta…'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!s.terminado && <span className="num hidden w-12 text-right text-label text-fg-muted sm:block">{restante} s</span>}
                {!s.terminado &&
                  (s.pausado ? (
                    <Boton variante="primario" tamano="icono" icono={<Play />} aria-label="Reanudar demo" title="Reanudar" onClick={() => s.reanudar(ctx)} />
                  ) : (
                    <Boton tamano="icono" icono={<CirclePause />} aria-label="Pausar demo" title="Pausar" onClick={() => s.pausar(ctx)} />
                  ))}
                <Boton tamano="icono" icono={<RotateCcw />} aria-label="Reiniciar demo" title="Reiniciar" onClick={() => s.arrancar(ctx)} />
                <Boton variante="fantasma" tamano="icono" icono={<X />} aria-label="Salir del modo demo" title="Salir" onClick={() => s.salir(ctx)} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Vista previa de Telegram flotante durante el paso de la alerta. */
export function TelegramDemo() {
  const visible = useModoDemo((s) => s.activo && s.telegram);
  const planta = usePlantaSi(visible);
  return (
    <AnimatePresence>
      {visible && planta && (
        <motion.div
          onUpdate={sinAceleracion}
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="fixed bottom-[calc(200px+env(safe-area-inset-bottom))] right-3 z-[57] w-[min(360px,calc(100vw-24px))] md:bottom-36 md:right-6"
        >
          <p className="mb-2 flex items-center justify-end gap-1.5 text-label font-semibold text-fg-muted">
            <Send className="size-4" aria-hidden /> En el celular del técnico de turno
          </p>
          <VistaPreviaTelegram planta={planta} className="h-[340px] md:h-[420px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Contador final: energía usada frente a 8 h fijas. */
export function AhorroDemo() {
  const visible = useModoDemo((s) => s.activo && s.ahorro);
  const planta = usePlantaSi(visible);
  if (!planta) return null;
  const { lineaBaseKwhDia: base, tarifaSolesKwh: tarifa } = planta.config;
  const usada = planta.energiaHoyKwh;
  const ahorro = Math.max(0, base - usada);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          onUpdate={sinAceleracion}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[56] grid place-items-center bg-overlay/80 p-4 pb-48"
        >
          <motion.div
            initial={{ y: 24, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-2xl rounded-panel border border-line-strong bg-surface-1 p-6 shadow-2 sm:p-8"
          >
            <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-wider text-fg-subtle">
              <PiggyBank className="size-5 text-ok" aria-hidden /> Energía de bombeo de hoy
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-line bg-surface-2 p-4">
                <p className="text-label text-fg-muted">Con 8 h fijas</p>
                <Valor valor={base} unidad="kWh" tamano="lg" atenuado animar={false} />
                <p className="num text-label text-fg-muted">{formatoSoles(base * tarifa)}</p>
              </div>
              <div className="rounded-card border border-accent-ring bg-accent-soft p-4">
                <p className="text-label text-fg-muted">Con AquaMind</p>
                <Valor valor={usada} unidad="kWh" decimales={1} tamano="lg" />
                <p className="num text-label text-fg-muted">{formatoSoles(usada * tarifa)}</p>
              </div>
            </div>
            <div className={cn('mt-5 flex flex-col gap-1 rounded-card border border-ok/40 bg-ok-soft p-5')}>
              <p className="text-label font-semibold text-fg">Ahorro de hoy</p>
              <div className="flex flex-wrap items-baseline gap-x-4">
                <Valor valor={ahorro} unidad="kWh" tamano="display" />
                <Valor valor={ahorro * tarifa} prefijo="S/" decimales={2} tamano="md" />
              </div>
              <p className="text-label text-fg-muted">
                Si cada día fuera así: unos <span className="num font-semibold text-fg">{formatoSoles(ahorro * tarifa * 30)}</span> al mes y{' '}
                <span className="num font-semibold text-fg">{formatoNumero((ahorro * 30) / 1000, 1)}</span> MWh menos.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
