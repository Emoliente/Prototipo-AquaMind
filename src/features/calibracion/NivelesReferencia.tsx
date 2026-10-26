import { memo } from 'react';
import { Ruler } from 'lucide-react';
import type { MuestraCalibracion } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { TOLERANCIA } from '@/logic/calibracion';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { haceDias } from './textos';

const ESCALA = 400;

export interface NivelNave {
  id: NaveId;
  nombre: string;
  /** Lo que marca el sensor (cm, entero). */
  sensor: number;
  /** Promedio de las 7 miras ahora (cm, entero). */
  miras: number;
  sinDatos: boolean;
}

/** Escala de 0 a 400 cm con el sensor (triángulo) y las miras (punto). */
function Escala({ sensor, miras }: { sensor: number; miras: number }) {
  const pos = (v: number) => `${(Math.min(ESCALA, Math.max(0, v)) / ESCALA) * 100}%`;
  return (
    <div className="relative h-8" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-3" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-warn/60"
        style={{ left: pos(Math.min(sensor, miras)), width: `${(Math.abs(sensor - miras) / ESCALA) * 100}%` }}
      />
      <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-1 bg-sludge-top" style={{ left: pos(miras) }} />
      <span
        className="absolute top-0 size-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-accent"
        style={{ left: pos(sensor) }}
      />
    </div>
  );
}

/** Nivel de lodo: el sensor frente a las miras ahora, y la última batimetría de cada nave. */
export const NivelesReferencia = memo(function NivelesReferencia({
  naves,
  muestras,
  hoy,
  className,
}: {
  naves: NivelNave[];
  muestras: MuestraCalibracion[];
  hoy: number;
  className?: string;
}) {
  return (
    <Tarjeta className={cn('flex flex-col gap-4', className)}>
      <EncabezadoTarjeta className="flex-none" icono={<Ruler className="size-5" />} titulo="Nivel de lodo: sensor frente a miras" subtitulo="Las miras se leen a mano y muestran el lodo real" />
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {naves.map((n) => {
          const dif = n.sensor - n.miras;
          const fuera = Math.abs(dif) > TOLERANCIA.cm;
          const bati = muestras.find((m) => m.tipo === 'batimetria' && m.sensorId === `nivel_${n.id}`);
          return (
            <li key={n.id} className={cn('flex flex-col gap-3 rounded-card border bg-surface-2 p-4', fuera ? 'border-warn/40' : 'border-line')}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-body font-semibold text-fg">{n.nombre}</p>
                {n.sinDatos ? (
                  <EstadoChip estado="sin_datos" tamano="sm" />
                ) : (
                  <EstadoChip estado={fuera ? 'advertencia' : 'normal'} texto={fuera ? 'Revisar sensor' : 'Coincide'} tamano="sm" />
                )}
              </div>
              <dl className="grid grid-cols-3 gap-2">
                <div>
                  <dt className="flex items-center gap-1.5 text-[0.75rem] text-fg-muted">
                    <span className="size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-accent" aria-hidden /> Sensor
                  </dt>
                  <dd className="num text-body font-semibold text-fg">{formatoNumero(n.sensor)} <span className="font-sans text-label font-normal text-fg-muted">cm</span></dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-[0.75rem] text-fg-muted">
                    <span className="size-2.5 rounded-full bg-sludge-top" aria-hidden /> Miras
                  </dt>
                  <dd className="num text-body font-semibold text-fg">{formatoNumero(n.miras)} <span className="font-sans text-label font-normal text-fg-muted">cm</span></dd>
                </div>
                <div>
                  <dt className="text-[0.75rem] text-fg-muted">Diferencia</dt>
                  <dd className={cn('num text-body font-semibold', fuera ? 'text-warn' : 'text-fg')}>
                    {dif > 0 ? '+' : ''}
                    {formatoNumero(dif)} <span className="font-sans text-label font-normal text-fg-muted">cm</span>
                  </dd>
                </div>
              </dl>
              <Escala sensor={n.sensor} miras={n.miras} />
              <p className="text-[0.75rem] text-fg-muted">
                {bati ? (
                  <>
                    Última batimetría {haceDias(bati.tMuestra, hoy)}:{' '}
                    <span className="num text-fg">{formatoNumero(bati.valorReferencia)} cm</span>
                  </>
                ) : (
                  'Sin batimetría registrada'
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
});
