import { useEffect, useState } from 'react';
import { Radio, WifiOff, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatoHora } from '@/lib/format';
import { usePlantaCampos, useTelemetria } from '@/store/useTelemetria';
import { useComando } from '@/store/useComando';
import { usePuede } from '@/store/useOperacion';
import { Logo } from './Logo';
import { SelectorModo } from './SelectorModo';
import { SelectorPerfil } from './SelectorPerfil';
import { BotonMandoManual } from './MandoManual';
import { BotonEmergencia } from './BotonEmergencia';
import { BotonModoDemo } from '@/demo/ControlesDemo';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

/** Hora de planta + estado de la conexión + aviso de hora punta. */
export function RelojPlanta({ className }: { className?: string }) {
  const planta = usePlantaCampos((p) => ({
    t: p.t,
    horaPunta: p.horaPunta,
    pausado: p.pausado,
    inicio: p.config.horaPuntaInicio,
    fin: p.config.horaPuntaFin,
  }));
  const conectado = useTelemetria((s) => s.conectado);
  const recibido = useTelemetria((s) => s.recibido);
  const [, refrescar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => refrescar((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!planta) return <div className={cn('h-10 w-40 esqueleto rounded-btn', className)} />;
  const d = new Date(planta.t);
  const segundos = Math.round((Date.now() - recibido) / 1000);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex flex-col leading-tight">
        <span className="num text-title font-semibold text-fg">{formatoHora(planta.t)}</span>
        <span className="whitespace-nowrap text-[0.75rem] text-fg-muted">
          {DIAS[d.getDay()]} {d.getDate()} {MESES[d.getMonth()]}
        </span>
      </div>
      {planta.horaPunta && (
        <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-warn-soft px-2.5 text-label font-semibold text-warn" title={`Tarifa alta de ${planta.inicio}:00 a ${planta.fin}:00`}>
          <Zap className="size-4" aria-hidden /> Hora punta
        </span>
      )}
      {!conectado ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-crit-soft px-2.5 text-label font-semibold text-crit">
          <WifiOff className="size-4" aria-hidden /> Sin datos hace {segundos} s
        </span>
      ) : planta.pausado ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-stale-soft px-2.5 text-label font-semibold text-stale">
          <Radio className="size-4" aria-hidden /> En pausa
        </span>
      ) : (
        <span className="hidden h-7 items-center gap-1.5 rounded-full bg-ok-soft px-2.5 text-label font-semibold text-ok 2xl:inline-flex" title="Datos cada minuto de planta">
          <Radio className="size-4 anim-pulso" aria-hidden /> En vivo
        </span>
      )}
    </div>
  );
}

export function Encabezado({ titulo }: { titulo: string }) {
  const comando = useComando();
  const puedeParar = usePuede('parada_emergencia');

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/95">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 md:hidden">
          <Logo className="size-9" />
        </div>
        <h1 className="hidden min-w-0 truncate text-title font-semibold text-fg md:block">{titulo}</h1>
        <RelojPlanta className="ml-auto hidden 2xl:flex" />
        <div className="ml-auto flex items-center gap-2 2xl:ml-4">
          <div className="hidden sm:block">
            <SelectorModo />
          </div>
          <div className="sm:hidden">
            <SelectorModo compacto />
          </div>
          {/* En escritorio ancho el Modo demo está en la barra lateral (Simulación). */}
          <div className="hidden md:block xl:hidden">
            <BotonModoDemo compacto />
          </div>
          <div className="hidden lg:block">
            <BotonMandoManual />
          </div>
          <div className="lg:hidden">
            <BotonMandoManual compacto />
          </div>
          <SelectorPerfil />
          <div className="hidden lg:block">
            <BotonEmergencia deshabilitado={!puedeParar} alActivar={() => comando({ tipo: 'parada_emergencia' })} />
          </div>
          <div className="lg:hidden">
            <BotonEmergencia deshabilitado={!puedeParar} alActivar={() => comando({ tipo: 'parada_emergencia' })} compacto />
          </div>
        </div>
      </div>
    </header>
  );
}
