import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Zap } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Valor } from '@/components/ui/Valor';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

interface Punto {
  etiqueta: string;
  kwh: number;
  hoy: boolean;
}

function Globo({ active, payload, tarifa }: { active?: boolean; payload?: { payload: Punto }[]; tarifa: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-btn border border-line-strong bg-surface-1 px-3 py-2 shadow-2">
      <p className="text-[0.75rem] text-fg-muted">{p.hoy ? 'Hoy (hasta ahora)' : p.etiqueta}</p>
      <p className="text-label text-fg">
        <span className="num font-semibold">{formatoNumero(p.kwh)}</span> kWh · <span className="num">{formatoSoles(p.kwh * tarifa)}</span>
      </p>
    </div>
  );
}

function Bloque({ titulo, kwh, tarifa, base, pie }: { titulo: string; kwh: number; tarifa: number; base: number; pie: string }) {
  const ahorro = Math.max(0, base - kwh);
  const pct = base > 0 ? Math.min(1, kwh / base) : 0;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-2 p-4">
      <p className="text-label font-semibold text-fg-muted">{titulo}</p>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <Valor valor={kwh} unidad="kWh" tamano="md" />
        <span className="num text-body text-fg-muted">{formatoSoles(kwh * tarifa)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${formatoNumero(pct * 100)} % de la línea base`}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(1, pct * 100)}%` }} />
        </div>
        <p className="text-[0.75rem] text-fg-muted">
          de <span className="num text-fg">{formatoNumero(base)}</span> kWh con 8 h fijas · {pie}
        </p>
      </div>
      <p className="text-label text-fg">
        Ahorro <span className="num font-semibold text-ok">{formatoNumero(ahorro)}</span> kWh ·{' '}
        <span className="num font-semibold text-ok">{formatoSoles(ahorro * tarifa)}</span>
      </p>
    </div>
  );
}

/** Energía de bombeo: hoy y el mes, frente a la línea base de 8 h fijas (135 kW × 8 h). */
export function TarjetaEnergia({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const { tarifaSolesKwh: tarifa, lineaBaseKwhDia: base } = planta.config;
  const hoy = new Date(planta.t);
  const diaMes = hoy.getDate();
  const pendiente = planta.bombeo ? 0 : planta.plan.kwhTotal;
  const proyeccion = planta.energiaHoyKwh + pendiente;

  return (
    <Tarjeta className={className}>
      <EncabezadoTarjeta
        icono={<Zap className="size-5" />}
        titulo="Energía de bombeo"
        subtitulo={<>Tarifa referencial <span className="num">{formatoSoles(tarifa)}</span> por kWh</>}
      />
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Bloque titulo="Hoy" kwh={planta.energiaHoyKwh} tarifa={tarifa} base={base} pie={pendiente > 0 ? `con el plan pendiente: ${formatoNumero(proyeccion)} kWh` : 'sin plan pendiente'} />
        <Bloque titulo="Este mes" kwh={planta.energiaMesKwh} tarifa={tarifa} base={base * diaMes} pie={`${diaMes} días`} />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-label font-semibold text-fg-muted">Últimos 7 días (kWh por día)</p>
        {/* Hoy en kWh enteros (como se rotula): el gráfico no se redibuja por décimas. */}
        <GraficoEnergia energiaDiaria={planta.energiaDiaria} hoyKwh={Math.round(planta.energiaHoyKwh)} base={base} tarifa={tarifa} />
      </div>
    </Tarjeta>
  );
}

/** Barras de los últimos 7 días; solo se redibuja cuando cambian los datos de energía. */
const GraficoEnergia = memo(function GraficoEnergia({
  energiaDiaria,
  hoyKwh,
  base,
  tarifa,
}: {
  energiaDiaria: EstadoPlanta['energiaDiaria'];
  hoyKwh: number;
  base: number;
  tarifa: number;
}) {
  const datos = useMemo<Punto[]>(
    () => [
      ...energiaDiaria.slice(-6).map((d) => {
        const f = new Date(d.dia);
        return { etiqueta: `${DIAS[f.getDay()]} ${f.getDate()}`, kwh: d.kwh, hoy: false };
      }),
      { etiqueta: 'hoy', kwh: hoyKwh, hoy: true },
    ],
    [energiaDiaria, hoyKwh],
  );
  return (
    <div className="h-44 w-full" role="img" aria-label={`Energía por día: ${datos.map((d) => `${d.etiqueta} ${formatoNumero(d.kwh)} kWh`).join(', ')}. Línea base ${formatoNumero(base)} kWh.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 16, right: 8, bottom: 0, left: -8 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} />
          <YAxis domain={[0, Math.ceil((base * 1.1) / 200) * 200]} tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={44} />
          <ReferenceLine y={base} stroke="var(--fg-muted)" strokeDasharray="6 4" label={{ value: `8 h fijas · ${formatoNumero(base)}`, position: 'insideTopRight', fill: 'var(--fg-muted)', fontSize: 11 }} />
          <Tooltip content={<Globo tarifa={tarifa} />} cursor={{ fill: 'var(--surface-3)', opacity: 0.5 }} isAnimationActive={false} />
          <Bar dataKey="kwh" radius={[4, 4, 0, 0]} minPointSize={2} isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.etiqueta} fill="var(--accent)" fillOpacity={d.hoy ? 0.55 : 1} />
            ))}
            <LabelList
              dataKey="kwh"
              position="top"
              formatter={(v: number) => (v >= 1 ? formatoNumero(v) : '0')}
              style={{ fill: 'var(--fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
