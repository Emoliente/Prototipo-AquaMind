import { CirclePause, Play, RotateCcw } from 'lucide-react';
import type { Escenario } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { usePlantaCampos, useTelemetria } from '@/store/useTelemetria';
import { ESCENARIOS } from '@/logic/gemeloDigital';
import { BotonModoDemo } from '@/demo/ControlesDemo';

const VELOCIDADES = [1, 10, 60];

/** Controles del simulador (no forman parte de la operación real). */
export function ControlSimulacion({ className }: { className?: string }) {
  const planta = usePlantaCampos((p) => ({ pausado: p.pausado, escenario: p.escenario, velocidad: p.velocidad }));
  const enviarTelemetria = useTelemetria((s) => s.enviar);
  const enviar = (c: Parameters<typeof enviarTelemetria>[0]) => enviarTelemetria(c, { silencioso: true });
  if (!planta) return null;

  return (
    <div className={cn('flex flex-col gap-3 rounded-card border border-dashed border-line-strong p-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-fg-subtle">Simulación</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => enviar({ tipo: 'pausa', pausado: !planta.pausado })}
            aria-label={planta.pausado ? 'Reanudar simulación' : 'Pausar simulación'}
            title={planta.pausado ? 'Reanudar' : 'Pausar'}
            className="grid size-9 place-items-center rounded-btn text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            {planta.pausado ? <Play className="size-4" /> : <CirclePause className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => enviar({ tipo: 'reiniciar' })}
            aria-label="Reiniciar simulación"
            title="Reiniciar"
            className="grid size-9 place-items-center rounded-btn text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
      <BotonModoDemo className="w-full" />
      <label className="flex flex-col gap-1">
        <span className="text-label text-fg-muted">Escenario</span>
        <select
          value={planta.escenario}
          onChange={(e) => enviar({ tipo: 'escenario', escenario: e.target.value as Escenario })}
          className="h-10 rounded-btn border border-line-strong bg-surface-2 px-2 text-label font-semibold text-fg"
        >
          {(Object.keys(ESCENARIOS) as Escenario[]).map((e) => (
            <option key={e} value={e}>
              {ESCENARIOS[e].nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-label text-fg-muted">1 s = {planta.velocidad === 1 ? '1 min' : `${planta.velocidad} min`}</span>
        <div className="grid grid-cols-3 gap-1">
          {VELOCIDADES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => enviar({ tipo: 'velocidad', velocidad: v })}
              aria-pressed={planta.velocidad === v}
              className={cn(
                'num h-9 rounded-btn text-label font-semibold transition-colors',
                planta.velocidad === v ? 'bg-surface-3 text-fg ring-1 ring-line-strong' : 'text-fg-muted hover:bg-surface-2',
              )}
            >
              ×{v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
