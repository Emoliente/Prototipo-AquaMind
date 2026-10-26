import { memo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatoHora, formatoNumero } from '@/lib/format';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export interface PuntoGrafico {
  t: number;
  real?: number;
  pronostico?: number;
}

interface Props {
  datos: PuntoGrafico[];
  ahora: number;
  criticoCm: number;
  /** Momento en que el pronóstico cruza el crítico (si cae dentro del gráfico). */
  cruce?: number | null;
  /** '24h' marca horas; '7d' marca días. */
  rango: '24h' | '7d';
  /** Ventana fija de tiempo: todas las naves comparten la misma escala. */
  desde: number;
  hasta: number;
  alto?: number;
}

function etiquetaTiempo(t: number, rango: '24h' | '7d') {
  const d = new Date(t);
  return rango === '24h' ? formatoHora(t) : `${DIAS[d.getDay()]} ${d.getDate()}`;
}

function Globo({ active, payload, rango }: { active?: boolean; payload?: { payload: PuntoGrafico }[]; rango: '24h' | '7d' }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const valor = p.real ?? p.pronostico;
  if (valor === undefined) return null;
  const d = new Date(p.t);
  return (
    <div className="rounded-btn border border-line-strong bg-surface-1 px-3 py-2 shadow-2">
      <p className="num text-[0.75rem] text-fg-muted">
        {rango === '7d' && `${DIAS[d.getDay()]} ${d.getDate()} · `}
        {formatoHora(p.t)}
      </p>
      <p className="text-label text-fg">
        Lodo <span className="num font-semibold">{formatoNumero(valor)}</span> cm
        <span className="text-fg-muted"> · {p.real !== undefined ? 'medido' : 'pronóstico'}</span>
      </p>
    </div>
  );
}

/** Nivel de lodo: lo medido (área) y el pronóstico (línea discontinua), con el nivel crítico. */
export const GraficoPronostico = memo(function GraficoPronostico({ datos, ahora, criticoCm, cruce, rango, desde, hasta, alto = 200 }: Props) {
  const max = Math.max(criticoCm * 1.3, ...datos.map((d) => d.real ?? d.pronostico ?? 0));
  const ultimo = hasta;
  // Marcas en horas locales redondas: cada 6 h (24 h) o a medianoche (7 días).
  const ticks: number[] = [];
  const d = new Date(desde);
  d.setMinutes(0, 0, 0);
  if (rango === '24h') d.setHours(Math.ceil(d.getHours() / 6) * 6);
  else d.setHours(24);
  const paso = rango === '24h' ? 6 * 3_600_000 : 86_400_000;
  for (let t = d.getTime(); t <= ultimo; t += paso) ticks.push(t);

  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 16, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <ReferenceArea x1={ahora} x2={ultimo} fill="var(--surface-3)" fillOpacity={0.45} ifOverflow="hidden" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[desde, hasta]}
            allowDataOverflow
            ticks={ticks}
            tickFormatter={(t: number) => etiquetaTiempo(t, rango)}
            tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--line-strong)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, Math.ceil(max / 50) * 50]}
            tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine
            y={criticoCm}
            stroke="var(--crit)"
            strokeDasharray="6 4"
            label={{ value: `Crítico ${criticoCm} cm`, position: 'insideTopLeft', fill: 'var(--crit)', fontSize: 11 }}
          />
          <ReferenceLine
            x={ahora}
            stroke="var(--fg-muted)"
            strokeWidth={1}
            label={{ value: 'ahora', position: 'top', fill: 'var(--fg-muted)', fontSize: 11 }}
          />
          <Tooltip content={<Globo rango={rango} />} cursor={{ stroke: 'var(--line-strong)' }} isAnimationActive={false} />
          <Area
            type="monotone"
            dataKey="real"
            stroke="var(--sludge-top)"
            strokeWidth={2}
            fill="var(--sludge)"
            fillOpacity={0.16}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2, fill: 'var(--sludge-top)' }}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="linear"
            dataKey="pronostico"
            stroke="var(--sludge-top)"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2, fill: 'var(--sludge-top)' }}
            isAnimationActive={false}
            connectNulls={false}
          />
          {cruce && (
            <ReferenceDot x={cruce} y={criticoCm} r={6} fill="var(--crit)" stroke="var(--surface-1)" strokeWidth={2} ifOverflow="hidden" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
