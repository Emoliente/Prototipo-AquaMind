import { ListOrdered } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';

/** Orden en que el plan elige las bombas: menor costo por m³ primero. */
export function PrioridadBombas({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const tarifa = planta.config.tarifaSolesKwh;
  const orden = [...planta.bombas].sort((a, b) => a.kwhPorM3 - b.kwhPorM3);
  const max = Math.max(...orden.map((b) => b.kwhPorM3));
  return (
    <Tarjeta className={cn('flex flex-col gap-5', className)}>
      <EncabezadoTarjeta icono={<ListOrdered className="size-5" />} titulo="Orden de uso" subtitulo="Primero la que menos cuesta por m³" />
      <ol className="flex flex-col gap-4">
        {orden.map((b, i) => {
          const falla = b.estado === 'falla';
          return (
            <li key={b.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="num grid size-7 place-items-center rounded-full bg-surface-3 text-label font-semibold text-fg">{i + 1}</span>
                  <span className="text-body font-semibold text-fg">Bomba {b.id.slice(1)}</span>
                  <span className="hidden text-label text-fg-muted sm:inline">{b.modelo}</span>
                </span>
                {falla ? (
                  <EstadoChip estado="falla" texto="No disponible" tamano="sm" />
                ) : (
                  <span className="num text-label text-fg">
                    {formatoSoles(b.kwhPorM3 * tarifa)} <span className="font-sans text-fg-muted">por m³</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                  <div className={cn('h-full rounded-full', falla ? 'bg-stale' : 'bg-accent')} style={{ width: `${(b.kwhPorM3 / max) * 100}%` }} />
                </div>
                <span className="num w-28 shrink-0 text-right text-[0.75rem] text-fg-muted">
                  {formatoNumero(b.kwhPorM3, 2)} kWh/m³
                </span>
              </div>
              <p className="text-[0.75rem] text-fg-muted">
                <span className="num text-fg">{formatoNumero(b.capacidadM3h)}</span> m³/h · <span className="num text-fg">{formatoNumero(b.potenciaKw)}</span> kW ·{' '}
                horómetro <span className="num text-fg">{formatoNumero(b.horometroH)}</span> h
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-auto rounded-btn bg-surface-2 p-3 text-label text-fg-muted">
        Si con la primera el bombeo pasa de 2.5 h, el plan suma la siguiente.
      </p>
    </Tarjeta>
  );
}
