import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Droplets, FileSpreadsheet, LoaderCircle, Mountain, PiggyBank, Repeat, Zap } from 'lucide-react';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { exportarExcel, precargarExcel } from '@/lib/exportar';
import { usePlantaCampos } from '@/store/useTelemetria';
import { useAncho } from '@/lib/useAncho';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { Boton } from '@/components/ui/Boton';
import { Valor } from '@/components/ui/Valor';
import { DENSIDAD_SEDIMENTO, informeMes, mesesDisponibles, type DiaInforme, type FuenteInforme } from './datosInforme';
import { hojasInforme } from './libroInforme';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function inicioDia(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function PaginaInformes() {
  // Solo lo que usa el informe: la pantalla no se vuelve a pintar con cada dato de planta.
  const planta = usePlantaCampos<FuenteInforme>((p) => ({
    t: inicioDia(p.t),
    bitacora: p.bitacora,
    energiaDiaria: p.energiaDiaria,
    energiaHoyKwh: Math.round(p.energiaHoyKwh * 10) / 10,
    config: p.config,
  }));
  if (!planta) return <Esqueleto aria-busy className="h-[70vh] rounded-card" />;
  return <Informes planta={planta} />;
}

function Kpi({ icono, etiqueta, children, pie }: { icono: ReactNode; etiqueta: string; children: ReactNode; pie?: ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-label font-medium text-fg-muted">
        <span className="text-fg-subtle [&>svg]:size-4">{icono}</span>
        {etiqueta}
      </p>
      {children}
      {pie && <div className="text-label text-fg-muted">{pie}</div>}
    </Tarjeta>
  );
}

const GraficoDias = memo(function GraficoDias({
  dias,
  clave,
  unidad,
  color,
  referencia,
  etiquetaReferencia,
}: {
  dias: DiaInforme[];
  clave: 'kwh' | 'lodoM3';
  unidad: string;
  color: string;
  referencia?: number;
  etiquetaReferencia?: string;
}) {
  const datos = useMemo(() => dias.map((d) => ({ ...d, etiqueta: String(new Date(d.dia).getDate()) })), [dias]);
  const max = Math.max(referencia ?? 0, ...datos.map((d) => d[clave]));
  // Los valores sobre las barras solo si cada día tiene espacio (en celular se usan los globos).
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const conEtiquetas = ancho / Math.max(1, datos.length) >= 24;
  return (
    <div ref={ref} className="h-56 w-full" role="img" aria-label={`${unidad} por día: ${datos.filter((d) => d[clave] > 0).map((d) => `día ${d.etiqueta}: ${formatoNumero(d[clave])}`).join(', ') || 'sin valores'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 16, right: 8, bottom: 0, left: -6 }} barCategoryGap="22%">
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: 'var(--line-strong)' }} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis domain={[0, Math.max(10, Math.ceil((max * 1.1) / 100) * 100)]} tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={44} />
          {referencia !== undefined && (
            <ReferenceLine y={referencia} stroke="var(--fg-muted)" strokeDasharray="6 4" label={{ value: etiquetaReferencia, position: 'insideTopRight', fill: 'var(--fg-muted)', fontSize: 11 }} />
          )}
          <Tooltip
            cursor={{ fill: 'var(--surface-3)', opacity: 0.5 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DiaInforme;
              const f = new Date(d.dia);
              return (
                <div className="rounded-btn border border-line-strong bg-surface-1 px-3 py-2 shadow-2">
                  <p className="text-[0.75rem] text-fg-muted">{DIAS[f.getDay()]} {f.getDate()}</p>
                  <p className="text-label text-fg">
                    <span className="num font-semibold">{formatoNumero(d[clave])}</span> {unidad}
                    {clave === 'lodoM3' && d.purgas > 0 && <span className="text-fg-muted"> · {d.purgas} purga{d.purgas > 1 ? 's' : ''}</span>}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey={clave} fill={color} radius={[4, 4, 0, 0]} minPointSize={0} isAnimationActive={false}>
            {/* Solo días con valor: sin números sobre cada barra vacía. */}
            {conEtiquetas && (
              <LabelList
                dataKey={clave}
                position="top"
                formatter={(v: number) => (v > 0 ? formatoNumero(v) : '')}
                style={{ fill: 'var(--fg-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function Informes({ planta }: { planta: FuenteInforme }) {
  const meses = useMemo(() => mesesDisponibles(planta), [planta]);
  const [sel, setSel] = useState(`${meses[0].anio}-${meses[0].mes}`);
  const [anio, mes] = sel.split('-').map(Number);
  const inf = useMemo(() => informeMes(planta, anio, mes), [planta, anio, mes]);
  const tarifa = planta.config.tarifaSolesKwh;
  const ahorroKwh = inf.kwhBase - inf.kwh;
  const ahorroPct = inf.kwhBase > 0 ? (ahorroKwh / inf.kwhBase) * 100 : 0;
  const nombreMes = `${MESES[mes]} ${anio}`;
  const enCurso = new Date(planta.t).getMonth() === mes && new Date(planta.t).getFullYear() === anio;

  useEffect(() => precargarExcel(), []);

  // Mientras se arma el Excel, el botón queda ocupado: un doble clic no descarga dos veces.
  const [exportando, setExportando] = useState(false);
  const exportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      await exportarExcel(
        `informe-${MESES[mes]}-${anio}-desarenador-miraflores.xlsx`,
        () => hojasInforme(inf, planta.config, nombreMes, enCurso, planta.t),
        { titulo: `Informe ${nombreMes} · Desarenador Miraflores`, autor: 'AquaMind' },
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Informes"
        descripcion={<>Resumen de energía, agua y sedimento de <span className="font-semibold text-fg">{nombreMes}</span>{enCurso && ` (hasta el día ${inf.dias.length})`}.</>}
        acciones={
          <>
            <select aria-label="Mes del informe" value={sel} onChange={(e) => setSel(e.target.value)} className="h-12 rounded-btn border border-line-strong bg-surface-2 px-3 text-label font-semibold text-fg">
              {meses.map((m) => (
                <option key={`${m.anio}-${m.mes}`} value={`${m.anio}-${m.mes}`}>
                  {MESES[m.mes][0].toUpperCase() + MESES[m.mes].slice(1)} {m.anio}
                </option>
              ))}
            </select>
            <Boton
              variante="primario"
              icono={exportando ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}
              onClick={exportar}
              disabled={exportando}
              aria-busy={exportando || undefined}
            >
              {exportando ? 'Preparando…' : 'Exportar a Excel'}
            </Boton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <Kpi icono={<PiggyBank />} etiqueta="Ahorro en bombeo" pie={<>frente a 8 h fijas · <span className="num text-fg">{formatoNumero(ahorroKwh)}</span> kWh menos ({formatoNumero(ahorroPct)} %)</>}>
          <Valor valor={ahorroKwh * tarifa} prefijo="S/" decimales={0} tamano="lg" />
        </Kpi>
        <Kpi icono={<Zap />} etiqueta="Energía de bombeo" pie={<><span className="num text-fg">{formatoSoles(inf.kwh * tarifa)}</span> · base <span className="num">{formatoNumero(inf.kwhBase)}</span> kWh</>}>
          <Valor valor={inf.kwh} unidad="kWh" tamano="lg" />
        </Kpi>
        <Kpi icono={<Mountain />} etiqueta="Sedimento retirado" pie={<>≈ <span className="num text-fg">{formatoNumero(inf.lodoM3 * DENSIDAD_SEDIMENTO)}</span> t · en <span className="num text-fg">{inf.purgas}</span> purgas</>}>
          <Valor valor={inf.lodoM3} unidad="m³" tamano="lg" />
        </Kpi>
        <Kpi icono={<Droplets />} etiqueta="Agua usada en purgas" pie={<><span className="num text-fg">{formatoNumero(inf.purgas ? inf.aguaM3 / inf.purgas : 0)}</span> m³ por purga</>}>
          <Valor valor={inf.aguaM3} unidad="m³" tamano="lg" />
        </Kpi>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-2">
        <Tarjeta>
          <EncabezadoTarjeta icono={<Zap className="size-5" />} titulo="Energía de bombeo por día" subtitulo="kWh · la línea es lo que se gastaría con 8 h fijas" />
          <div className="mt-4">
            <GraficoDias dias={inf.dias} clave="kwh" unidad="kWh" color="var(--accent)" referencia={planta.config.lineaBaseKwhDia} etiquetaReferencia={`8 h fijas · ${formatoNumero(planta.config.lineaBaseKwhDia)}`} />
          </div>
        </Tarjeta>
        <Tarjeta>
          <EncabezadoTarjeta icono={<Mountain className="size-5" />} titulo="Lodo purgado por día" subtitulo="m³ (Δ nivel × área de la nave)" />
          <div className="mt-4">
            <GraficoDias dias={inf.dias} clave="lodoM3" unidad="m³" color="var(--sludge)" />
          </div>
        </Tarjeta>
      </div>

      <Tarjeta relleno="none" className="mt-4 lg:mt-6">
        <div className="border-b border-line p-5 sm:p-6">
          <EncabezadoTarjeta icono={<Repeat className="size-5" />} titulo="Por nave" subtitulo={`${inf.bombeos} bombeos · ${formatoNumero(inf.horasBombeo, 1)} h de bombas en el mes`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">Resumen por nave</caption>
            <thead>
              <tr className="text-label text-fg-muted">
                <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Nave</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Purgas</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Lodo <span className="font-normal">m³</span></th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Agua <span className="font-normal">m³</span></th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Duración media <span className="font-normal">min</span></th>
                <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-6">Última purga</th>
              </tr>
            </thead>
            <tbody>
              {inf.porNave.map((n) => (
                <tr key={n.naveId} className="border-t border-line">
                  <th scope="row" className="px-5 py-3 text-body font-semibold text-fg sm:px-6">Nave {n.naveId.slice(1)}</th>
                  <td className="num px-4 py-3 text-right text-body text-fg">{n.purgas}</td>
                  <td className="num px-4 py-3 text-right text-body text-fg">{formatoNumero(n.lodoM3)}</td>
                  <td className="num px-4 py-3 text-right text-body text-fg">{formatoNumero(n.aguaM3)}</td>
                  <td className="num px-4 py-3 text-right text-body text-fg">{n.purgas ? formatoNumero(n.duracionMedia) : '—'}</td>
                  <td className="num px-5 py-3 text-right text-label text-fg-muted sm:px-6">
                    {n.ultima ? `${DIAS[new Date(n.ultima).getDay()]} ${new Date(n.ultima).getDate()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}
