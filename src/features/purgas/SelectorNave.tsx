import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { TEXTO_ACCION } from '@/lib/estado';
import { EstadoChip, type TipoEstado } from '@/components/ui/EstadoChip';

const ESTADO_ACCION: Record<string, TipoEstado> = { esperar: 'normal', programar: 'advertencia', purgar_ya: 'critica' };

/** Elegir la nave a purgar: cada opción muestra su urgencia y lo recomendado. */
export function SelectorNave({
  planta,
  valor,
  alCambiar,
}: {
  planta: EstadoPlanta;
  valor: NaveId;
  alCambiar: (id: NaveId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Nave a purgar" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {planta.naves.map((n) => {
        const r = planta.recomendaciones.find((x) => x.naveId === n.id)!;
        const activo = valor === n.id;
        const recomendada = planta.principal.naveId === n.id && r.accion !== 'esperar';
        const ocupada = planta.purgas.some((p) => p.naveId === n.id);
        const pct = (n.nivelCm / n.nivelCriticoCm) * 100;
        return (
          <button
            key={n.id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => alCambiar(n.id)}
            className={cn(
              'relative flex min-h-12 flex-col gap-2 rounded-card border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200 sm:gap-3 sm:p-4',
              activo ? 'border-accent bg-accent-soft shadow-2' : 'border-line bg-surface-2 hover:border-line-strong',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-title font-semibold text-fg">{n.nombre}</span>
              {recomendada && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-fg-on-accent">
                  Recomendada
                </span>
              )}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="num text-value-sm font-semibold text-fg">{formatoNumero(n.nivelCm)}</span>
              <span className="text-label text-fg-muted">cm · {formatoNumero(pct)} %</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[0.75rem] text-fg-muted">Urgencia</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <span
                  className={cn('block h-full rounded-full', r.accion === 'purgar_ya' ? 'bg-crit' : r.accion === 'programar' ? 'bg-warn' : 'bg-ok')}
                  style={{ width: `${r.urgencia}%` }}
                />
              </span>
              <span className="num w-8 text-right text-label text-fg-muted">{r.urgencia}</span>
            </span>
            {ocupada ? (
              <EstadoChip estado="info" texto="Purgando" tamano="sm" />
            ) : (
              <EstadoChip estado={ESTADO_ACCION[r.accion]} texto={TEXTO_ACCION[r.accion]} tamano="sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
