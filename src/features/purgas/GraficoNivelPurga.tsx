import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatoHora, formatoNumero } from '@/lib/format';

interface Props {
  muestras: { t: number; nivelCm: number }[];
  criticoCm: number;
  /** Nivel al que se quiere llegar (línea de referencia). */
  objetivoCm?: number;
  alto?: number;
}

function Globo({ active, payload }: { active?: boolean; payload?: { payload: { t: number; nivelCm: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-btn border border-line-strong bg-surface-1 px-3 py-2 shadow-2">
      <p className="num text-[0.75rem] text-fg-muted">{formatoHora(p.t)}</p>
      <p className="text-label text-fg">
        Lodo <span className="num font-semibold">{formatoNumero(p.nivelCm)}</span> cm
      </p>
    </div>
  );
}

/** Nivel de lodo minuto a minuto durante la purga, con el nivel crítico de referencia. */
export function GraficoNivelPurga({ muestras, criticoCm, objetivoCm, alto = 220 }: Props) {
  const max = Math.max(criticoCm + 20, ...muestras.map((m) => m.nivelCm));
  return (
    <div style={{ height: alto }} className="w-full" role="img" aria-label={`Nivel de lodo durante la purga: de ${formatoNumero(muestras[0]?.nivelCm ?? 0)} a ${formatoNumero(muestras.at(-1)?.nivelCm ?? 0)} cm`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={muestras} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatoHora}
            tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--line-strong)' }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={[0, Math.ceil(max / 50) * 50]}
            tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <ReferenceLine
            y={criticoCm}
            stroke="var(--crit)"
            strokeDasharray="6 4"
            label={{ value: `Crítico ${criticoCm} cm`, position: 'insideTopRight', fill: 'var(--crit)', fontSize: 11 }}
          />
          {objetivoCm !== undefined && (
            <ReferenceLine
              y={objetivoCm}
              stroke="var(--fg-subtle)"
              strokeDasharray="2 4"
              label={{ value: `Objetivo ${formatoNumero(objetivoCm)} cm`, position: 'insideBottomRight', fill: 'var(--fg-muted)', fontSize: 11 }}
            />
          )}
          <Tooltip content={<Globo />} cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="nivelCm"
            stroke="var(--sludge-top)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2, fill: 'var(--sludge-top)' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
