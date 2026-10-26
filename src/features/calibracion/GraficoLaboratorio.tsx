import { memo, useMemo } from 'react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { FlaskConical } from 'lucide-react';
import type { EstadoMuestra, MuestraCalibracion } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { diaYHora, formatoNumero } from '@/lib/format';
import { comparar, TOLERANCIA } from '@/logic/calibracion';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { ESTADO_MUESTRA, textoDiferencia } from './textos';

interface Punto {
  lab: number;
  sensor: number;
  m: MuestraCalibracion;
}

const COLOR: Record<EstadoMuestra, string> = {
  conforme: 'var(--ok)',
  pendiente: 'var(--warn)',
  aprobada: 'var(--info)',
  descartada: 'var(--stale)',
};
const ORDEN: EstadoMuestra[] = ['conforme', 'pendiente', 'aprobada', 'descartada'];

function Globo({ active, payload, hoy }: { active?: boolean; payload?: { payload: Punto }[]; hoy: number }) {
  if (!active || !payload?.length) return null;
  const { m } = payload[0].payload;
  const c = comparar(m.valorReferencia, m.valorSensor, m.unidad);
  return (
    <div className="rounded-btn border border-line-strong bg-surface-1 px-3 py-2 shadow-2">
      <p className="text-[0.75rem] text-fg-muted">
        {m.sensorId === 'sst_in' ? 'Entrada' : 'Salida'} · {diaYHora(m.tMuestra, hoy)}
      </p>
      <p className="text-label text-fg">
        Lab <span className="num font-semibold">{formatoNumero(m.valorReferencia, 3)}</span> · sensor{' '}
        <span className="num font-semibold">{formatoNumero(m.valorSensor, 3)}</span> g/L
      </p>
      <p className="text-[0.75rem] text-fg-muted">
        {textoDiferencia(c.diferencia, c.relativa)} · {ESTADO_MUESTRA[m.estado].texto.toLowerCase()}
      </p>
    </div>
  );
}

/**
 * Sólidos: cada punto es una muestra (laboratorio en X, sensor en Y). Sobre la diagonal el
 * sensor coincide; la franja punteada es la tolerancia de ±10 %.
 */
export const GraficoLaboratorio = memo(function GraficoLaboratorio({
  muestras,
  hoy,
  className,
}: {
  muestras: MuestraCalibracion[];
  /** Inicio del día de planta (para "hoy" / "ayer"). */
  hoy: number;
  className?: string;
}) {
  const { series, max, presentes } = useMemo(() => {
    const lab = muestras.filter((m) => m.tipo === 'laboratorio' && m.unidad === 'g/L');
    const max = Math.max(0.05, ...lab.map((m) => Math.max(m.valorReferencia, m.valorSensor))) * 1.15;
    const series = ORDEN.map((e) => ({ estado: e, datos: lab.filter((m) => m.estado === e).map((m) => ({ lab: m.valorReferencia, sensor: m.valorSensor, m })) }));
    return { series, max: Math.ceil(max * 100) / 100, presentes: series.filter((s) => s.datos.length) };
  }, [muestras]);
  const total = presentes.reduce((s, x) => s + x.datos.length, 0);

  return (
    <Tarjeta className={cn('flex flex-col gap-4', className)}>
      <EncabezadoTarjeta className="flex-none" icono={<FlaskConical className="size-5" />} titulo="Laboratorio frente al sensor" subtitulo="Sólidos en suspensión, g/L · cada punto es una muestra" />
      {total === 0 ? (
        <p className="rounded-btn border border-dashed border-line-strong px-4 py-10 text-center text-label text-fg-muted">Aún no hay resultados de laboratorio cargados.</p>
      ) : (
        <>
          {/* Crece con la tarjeta (mín. 256 px); el contenedor absoluto le da al gráfico un alto exacto. */}
          <div
            className="relative min-h-64 w-full flex-1"
            role="img"
            aria-label={`${total} muestras de laboratorio. ${presentes.map((s) => `${s.datos.length} ${ESTADO_MUESTRA[s.estado].texto.toLowerCase()}`).join(', ')}.`}
          >
            <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 26, right: 16, bottom: 18, left: -4 }}>
                <CartesianGrid stroke="var(--line)" />
                <XAxis
                  type="number"
                  dataKey="lab"
                  domain={[0, max]}
                  tickFormatter={(v: number) => formatoNumero(v, 2)}
                  tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: 'var(--line-strong)' }}
                  tickLine={false}
                  label={{ value: 'Laboratorio', position: 'insideBottom', offset: -12, fill: 'var(--fg-muted)', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="sensor"
                  domain={[0, max]}
                  tickFormatter={(v: number) => formatoNumero(v, 2)}
                  tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  label={{ value: 'Sensor', position: 'top', offset: 12, fill: 'var(--fg-muted)', fontSize: 11 }}
                />
                <ZAxis range={[90, 90]} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max * (1 + TOLERANCIA.relativa) }]} stroke="var(--line-strong)" strokeDasharray="4 4" ifOverflow="hidden" />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max * (1 - TOLERANCIA.relativa) }]} stroke="var(--line-strong)" strokeDasharray="4 4" ifOverflow="hidden" />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke="var(--fg-muted)" ifOverflow="hidden" />
                <Tooltip content={<Globo hoy={hoy} />} cursor={false} isAnimationActive={false} />
                {series.map((s) => (
                  <Scatter key={s.estado} data={s.datos} fill={COLOR[s.estado]} stroke="var(--surface-1)" strokeWidth={1.5} isAnimationActive={false} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presentes.map((s) => (
              <EstadoChip key={s.estado} estado={ESTADO_MUESTRA[s.estado].estado} texto={`${ESTADO_MUESTRA[s.estado].texto} · ${s.datos.length}`} tamano="sm" />
            ))}
            <span className="flex items-center gap-1.5 text-[0.75rem] text-fg-muted">
              <span className="h-0 w-5 border-t-2 border-dashed border-line-strong" aria-hidden /> ±10 % tolerancia
            </span>
          </div>
        </>
      )}
    </Tarjeta>
  );
});
