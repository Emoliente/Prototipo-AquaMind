import { memo } from 'react';
import { Power, PowerOff, TriangleAlert } from 'lucide-react';
import type { Bomba, EstadoBomba } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoDuracion, formatoNumero } from '@/lib/format';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { Boton } from '@/components/ui/Boton';

const COLOR: Record<EstadoBomba, string> = {
  en_marcha: 'var(--accent)',
  apagada: 'var(--fg-subtle)',
  falla: 'var(--crit)',
};

/** Impulsor de la bomba: gira cuando está en marcha. */
export function Impulsor({ estado, className }: { estado: EstadoBomba; className?: string }) {
  const color = COLOR[estado];
  return (
    <svg viewBox="0 0 48 48" className={cn('size-12', className)} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="var(--surface-2)" stroke={color} strokeWidth="2" strokeOpacity={estado === 'apagada' ? 0.6 : 1} />
      <g className={estado === 'en_marcha' ? 'anim-giro' : undefined} style={{ transformBox: 'view-box', transformOrigin: '24px 24px' }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            key={a}
            d="M24 24 C 25 17, 30 13, 35 12.5 C 32 16, 28 20, 24 24 Z"
            fill={color}
            fillOpacity={estado === 'apagada' ? 0.5 : 0.9}
            transform={`rotate(${a} 24 24)`}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="4" fill="var(--surface-1)" stroke={color} strokeWidth="2" />
    </svg>
  );
}

interface Props {
  bomba: Bomba;
  /** Horas de marcha acumuladas. */
  horometroH?: number;
  /** Minutos que le quedan según el plan (null = sin plan). */
  minutosRestantes?: number | null;
  alAlternar?: () => void;
  deshabilitado?: boolean;
  className?: string;
}

/** Tarjeta de bomba: estado, corriente, potencia, capacidad, consumo y horas de marcha. */
export const TarjetaBomba = memo(function TarjetaBomba({ bomba, horometroH, minutosRestantes, alAlternar, deshabilitado, className }: Props) {
  const enMarcha = bomba.estado === 'en_marcha';
  const falla = bomba.estado === 'falla';
  return (
    <Tarjeta relleno="none" className={cn('flex flex-col gap-4 p-5', className)}>
      <div className="flex items-start gap-3">
        <Impulsor estado={bomba.estado} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-title font-semibold text-fg">Bomba {bomba.id.slice(1)}</h3>
            <EstadoChip estado={bomba.estado} pulso={falla} />
          </div>
          <p className="truncate text-label text-fg-muted">
            {bomba.modelo} · <span className="num">{bomba.hp}</span> HP
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-label text-fg-muted">Corriente</dt>
          <dd>
            <Valor valor={enMarcha ? bomba.corrienteA : 0} unidad="A" decimales={1} tamano="sm" atenuado={!enMarcha} />
          </dd>
        </div>
        <div>
          <dt className="text-label text-fg-muted">Potencia</dt>
          <dd>
            <Valor valor={enMarcha ? bomba.potenciaActualKw : 0} unidad="kW" decimales={1} tamano="sm" atenuado={!enMarcha} />
          </dd>
        </div>
        <div>
          <dt className="text-label text-fg-muted">Capacidad</dt>
          <dd className="num text-body text-fg">
            {formatoNumero(bomba.capacidadM3h)} <span className="font-sans text-label text-fg-muted">m³/h</span>
          </dd>
        </div>
        <div>
          <dt className="text-label text-fg-muted">Consumo por m³</dt>
          <dd className="num text-body text-fg">
            {formatoNumero(bomba.kwhPorM3, 2)} <span className="font-sans text-label text-fg-muted">kWh/m³</span>
          </dd>
        </div>
      </dl>

      {falla && (
        <p className="flex items-center gap-2 rounded-btn bg-crit-soft px-3 py-2 text-label font-medium text-crit">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Sobrecorriente: revisar en campo antes de reiniciar
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="flex min-w-0 flex-col text-label text-fg-muted">
          <span>
            Marcha hoy <span className="num text-fg">{formatoDuracion(bomba.minutosMarchaHoy)}</span>
          </span>
          {enMarcha && minutosRestantes != null ? (
            <span>
              Quedan <span className="num text-fg">{formatoDuracion(minutosRestantes)}</span> del plan
            </span>
          ) : (
            horometroH !== undefined && (
              <span>
                Horómetro <span className="num text-fg">{formatoNumero(horometroH)}</span> h
              </span>
            )
          )}
        </span>
        {alAlternar && (
          <Boton
            variante={enMarcha ? 'secundario' : 'primario'}
            icono={enMarcha ? <PowerOff /> : <Power />}
            onClick={alAlternar}
            disabled={deshabilitado || falla}
          >
            {enMarcha ? 'Apagar' : 'Encender'}
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
});
