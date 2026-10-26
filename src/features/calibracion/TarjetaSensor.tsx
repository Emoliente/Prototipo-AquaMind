import { memo } from 'react';
import type { MuestraCalibracion, SensorInfo } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { comparar } from '@/logic/calibracion';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { ESTADO_MUESTRA, QUE_HACER, TIPO_MUESTRA, haceDias, textoDiferencia } from './textos';

interface Props {
  sensor: SensorInfo;
  /** Última comparación cargada para este sensor. */
  ultima?: MuestraCalibracion;
  /** Hora de planta redondeada al día (las fechas relativas cambian una vez al día). */
  hoy: number;
}

/** Un sensor: estado con ícono y texto, lo que marca, cuándo se calibró y su último control. */
export const TarjetaSensor = memo(function TarjetaSensor({ sensor, ultima, hoy }: Props) {
  const bien = sensor.estado === 'en_linea';
  const cmp = ultima ? comparar(ultima.valorReferencia, ultima.valorSensor, ultima.unidad) : null;
  const T = ultima ? TIPO_MUESTRA[ultima.tipo] : null;
  return (
    <Tarjeta relleno="none" className={cn('flex flex-col gap-3 p-5', !bien && 'border-warn/40')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-label font-semibold text-fg">{sensor.nombre}</h3>
        <EstadoChip estado={sensor.estado} tamano="sm" pulso={sensor.estado === 'sin_datos'} />
      </div>
      <Valor
        valor={sensor.valor}
        unidad={sensor.unidad}
        decimales={sensor.decimales}
        tamano="md"
        atenuado={!bien}
      />
      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div className="min-w-0">
          <dt className="text-[0.75rem] text-fg-muted">Calibrado</dt>
          <dd className="text-label text-fg">{haceDias(sensor.ultimaCalibracion, hoy)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[0.75rem] text-fg-muted">Último control</dt>
          {ultima && cmp && T ? (
            // Calibrada: la diferencia ya se corrigió, así que se dice eso y cuánto fue.
            <dd className="flex flex-col">
              <span className={cn('num text-label font-semibold', ultima.estado === 'pendiente' ? 'text-warn' : 'text-fg')}>
                {ultima.estado === 'aprobada' ? <span className="font-sans">Corregido</span> : textoDiferencia(cmp.diferencia, cmp.relativa)}
              </span>
              <span className="truncate text-[0.75rem] text-fg-muted">
                {T.texto} ·{' '}
                {ultima.estado === 'aprobada'
                  ? `se corrigió ${textoDiferencia(cmp.diferencia, cmp.relativa)}`
                  : ESTADO_MUESTRA[ultima.estado].texto.toLowerCase()}
              </span>
            </dd>
          ) : (
            <dd className="text-label text-fg-subtle">Sin comparaciones</dd>
          )}
        </div>
      </dl>
      {!bien && <p className="rounded-btn bg-warn-soft px-3 py-2 text-[0.75rem] leading-5 text-fg">{QUE_HACER[sensor.estado]}</p>}
      <p className="num mt-auto text-[0.75rem] text-fg-subtle">
        Rango {sensor.rango[0]} – {sensor.rango[1]} {sensor.unidad}
      </p>
    </Tarjeta>
  );
});
