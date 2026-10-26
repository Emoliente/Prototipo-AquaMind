import { memo } from 'react';
import { DoorClosed, DoorOpen, TrendingDown, TrendingUp } from 'lucide-react';
import type { EstadoCompuerta, EstadoSensor, NaveId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { estadoPorNivel } from '@/lib/estado';
import { formatoNumero, hace, horasLegibles } from '@/lib/format';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { NaveTanque } from './NaveTanque';

interface Props {
  id: NaveId;
  nivelCm: number;
  nivelCriticoCm: number;
  tasaCmH: number;
  horasACritico: number | null;
  aperturaCm: number;
  estadoCompuerta: EstadoCompuerta;
  sensor?: EstadoSensor;
  minutosSinActualizar?: number;
  /** Resalta la nave recomendada. */
  destacada?: boolean;
  onClick?: () => void;
  className?: string;
}

const TEXTO_COMPUERTA: Record<EstadoCompuerta, string> = {
  cerrada: 'Cerrada',
  abriendo: 'Abriendo',
  abierta: 'Abierta',
  cerrando: 'Cerrando',
  falla: 'Falla',
};

/** Tarjeta por nave: corte del tanque + nivel, % del crítico, horas al crítico y compuerta. */
export const TarjetaNave = memo(function TarjetaNave({
  id,
  nivelCm,
  nivelCriticoCm,
  tasaCmH,
  horasACritico,
  aperturaCm,
  estadoCompuerta,
  sensor = 'en_linea',
  minutosSinActualizar = 0,
  destacada,
  onClick,
  className,
}: Props) {
  const pct = (nivelCm / nivelCriticoCm) * 100;
  const estado = estadoPorNivel(pct);
  const sinDatos = sensor === 'sin_datos';
  const abierta = aperturaCm > 0;
  const subiendo = tasaCmH > 0.05;
  const horas = horasLegibles(horasACritico ?? 0);

  return (
    <Tarjeta
      relleno="none"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-4 p-5 transition-[border-color,box-shadow] duration-200',
        destacada && 'border-accent-ring shadow-2',
        onClick && 'cursor-pointer hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-title font-semibold text-fg">Nave {id.slice(1)}</h3>
          <p className="flex items-center gap-1.5 text-label text-fg-muted">
            {subiendo ? (
              <TrendingUp className="size-4 text-fg-subtle" aria-hidden />
            ) : (
              <TrendingDown className="size-4 text-fg-subtle" aria-hidden />
            )}
            <span>
              {subiendo ? 'Sube' : 'Baja'}{' '}
              <span className="num text-fg">{formatoNumero(Math.abs(tasaCmH), 1)}</span> cm/h
            </span>
          </p>
        </div>
        {sinDatos ? (
          <EstadoChip estado="sin_datos" texto={`Sin datos · ${hace(minutosSinActualizar)}`} />
        ) : (
          <EstadoChip estado={estado} pulso={estado === 'critica'} />
        )}
      </div>

      <NaveTanque
        nivelCm={nivelCm}
        nivelCriticoCm={nivelCriticoCm}
        aperturaCm={aperturaCm}
        sedimentando={subiendo}
        sinDatos={sinDatos}
      />

      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <dt className="text-label text-fg-muted">Nivel de lodo</dt>
          <dd>
            <Valor valor={nivelCm} unidad="cm" tamano="sm" atenuado={sinDatos} />
          </dd>
          <dd className="text-[0.75rem] leading-5 text-fg-muted">
            <span className="num text-fg">{formatoNumero(pct)} %</span> del crítico
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-label text-fg-muted">Al nivel crítico</dt>
          <dd>
            {pct >= 100 ? (
              <span className="text-value-sm font-semibold text-crit">Superado</span>
            ) : (
              <Valor
                valor={subiendo && horasACritico !== null ? horas.valor : null}
                unidad={horas.unidad}
                decimales={horas.decimales}
                tamano="sm"
                atenuado={sinDatos}
              />
            )}
          </dd>
          <dd className="text-[0.75rem] leading-5 text-fg-muted">
            {subiendo ? 'a la tasa actual' : 'no está subiendo'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-label text-fg-muted">Compuerta</dt>
          <dd className="flex items-center gap-1.5 text-value-sm font-semibold text-fg">
            {abierta ? (
              <DoorOpen className="size-5 shrink-0 text-accent" aria-hidden />
            ) : (
              <DoorClosed className="size-5 shrink-0 text-fg-subtle" aria-hidden />
            )}
            <span className="truncate text-title">{TEXTO_COMPUERTA[estadoCompuerta]}</span>
          </dd>
          <dd className="text-[0.75rem] leading-5 text-fg-muted">
            {abierta ? (
              <>
                <span className="num text-fg">{formatoNumero(aperturaCm)} cm</span> de apertura
              </>
            ) : (
              'sin purga'
            )}
          </dd>
        </div>
      </dl>
    </Tarjeta>
  );
});
