import { useId } from 'react';
import { formatoHora } from '@/lib/format';
import { ANTIGUEDAD_MAXIMA_MS } from '@/logic/calibracion';

const DIA = 86_400_000;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const campo = 'num h-12 w-full rounded-btn border border-line-strong bg-surface-2 px-3 text-body text-fg';

export interface FechaHora {
  /** Días atrás: 0 = hoy. */
  dia: number;
  /** "HH:MM" */
  hora: string;
}

/** Valor inicial: hace `minutos` de la hora de planta. */
export function fechaHoraInicial(ahora: number, minutos = 0): FechaHora {
  const t = ahora - minutos * 60_000;
  const inicioHoy = new Date(ahora).setHours(0, 0, 0, 0);
  const inicioT = new Date(t).setHours(0, 0, 0, 0);
  return { dia: Math.round((inicioHoy - inicioT) / DIA), hora: formatoHora(t) };
}

/** Pasa la fecha elegida a un instante, o explica por qué no sirve. */
export function aMomento(ahora: number, f: FechaHora): { t: number } | { error: string } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(f.hora);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { error: 'Escribe la hora como 09:30.' };
  const d = new Date(ahora - f.dia * DIA);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  const t = d.getTime();
  if (t > ahora + 60_000) return { error: 'La hora todavía no llega.' };
  if (ahora - t > ANTIGUEDAD_MAXIMA_MS) return { error: 'Solo se comparan muestras de los últimos 7 días.' };
  return { t };
}

/** Día (hoy, ayer… hasta hace 6 días) y hora de la muestra. */
export function CampoFechaHora({
  ahora,
  valor,
  alCambiar,
  error,
}: {
  ahora: number;
  valor: FechaHora;
  alCambiar: (f: FechaHora) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold text-fg-muted">Cuándo se tomó</legend>
      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <label className="sr-only" htmlFor={`${id}-dia`}>Día</label>
        <select
          id={`${id}-dia`}
          value={valor.dia}
          onChange={(e) => alCambiar({ ...valor, dia: Number(e.target.value) })}
          className={campo}
        >
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(ahora - i * DIA);
            const texto = i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : `${DIAS[d.getDay()][0].toUpperCase()}${DIAS[d.getDay()].slice(1)} ${d.getDate()}`;
            return (
              <option key={i} value={i}>
                {texto}
              </option>
            );
          })}
        </select>
        <label className="sr-only" htmlFor={`${id}-hora`}>Hora</label>
        <input
          id={`${id}-hora`}
          type="time"
          value={valor.hora}
          onChange={(e) => alCambiar({ ...valor, hora: e.target.value })}
          aria-invalid={error ? true : undefined}
          className={campo}
        />
      </div>
      {error && (
        <p role="alert" className="text-label font-medium text-crit">
          {error}
        </p>
      )}
    </fieldset>
  );
}
