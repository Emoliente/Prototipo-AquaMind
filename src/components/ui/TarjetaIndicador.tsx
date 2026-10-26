import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { hace } from '@/lib/format';
import { Tarjeta } from './Tarjeta';
import { Valor } from './Valor';
import { Sparkline, type ColorSerie } from './Sparkline';
import { EstadoChip } from './EstadoChip';
import { Esqueleto } from './Esqueleto';

/** `fuera_rango` y `necesita_limpieza`: hay dato, pero no es confiable. */
export type CalidadDato = 'vigente' | 'desactualizado' | 'sin_datos' | 'fuera_rango' | 'necesita_limpieza';

interface Props {
  etiqueta: string;
  icono?: ReactNode;
  valor: number | null;
  unidad: string;
  decimales?: number;
  tendencia?: number[];
  color?: ColorSerie;
  referencia?: number;
  /** Línea secundaria: comparación, rango, etc. */
  detalle?: ReactNode;
  calidad?: CalidadDato;
  minutosSinActualizar?: number;
  className?: string;
}

/** Tarjeta de indicador con valor grande, unidad visible y tendencia. */
export function TarjetaIndicador({
  etiqueta,
  icono,
  valor,
  unidad,
  decimales = 0,
  tendencia,
  color = 'accent',
  referencia,
  detalle,
  calidad = 'vigente',
  minutosSinActualizar = 0,
  className,
}: Props) {
  const viejo = calidad !== 'vigente';
  return (
    <Tarjeta relleno="none" className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-label font-medium text-fg-muted">
          {icono && <span className="shrink-0 text-fg-subtle [&>svg]:size-4">{icono}</span>}
          <span className="truncate">{etiqueta}</span>
        </span>
        {calidad === 'desactualizado' && (
          <EstadoChip estado="desactualizado" tamano="sm" texto={hace(minutosSinActualizar)} />
        )}
        {calidad === 'sin_datos' && <EstadoChip estado="sin_datos" tamano="sm" />}
        {(calidad === 'fuera_rango' || calidad === 'necesita_limpieza') && <EstadoChip estado={calidad} tamano="sm" />}
      </div>
      <Valor
        valor={calidad === 'sin_datos' ? null : valor}
        unidad={unidad}
        decimales={decimales}
        tamano="md"
        atenuado={viejo}
      />
      {tendencia && (
        <Sparkline
          datos={tendencia}
          color={viejo ? 'stale' : color}
          referencia={referencia}
          discontinuo={viejo}
          alto={36}
        />
      )}
      {detalle && <div className="text-label text-fg-muted">{detalle}</div>}
    </Tarjeta>
  );
}

export function TarjetaIndicadorEsqueleto({ className }: { className?: string }) {
  return (
    <Tarjeta relleno="none" className={cn('flex flex-col gap-3 p-5', className)} aria-busy>
      <Esqueleto className="h-4 w-28" />
      <Esqueleto className="h-9 w-36" />
      <Esqueleto className="h-9 w-full" />
      <Esqueleto className="h-4 w-40" />
    </Tarjeta>
  );
}
