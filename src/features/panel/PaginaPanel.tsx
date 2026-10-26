import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Gauge, Waves, Zap } from 'lucide-react';
import type { EstadoPlanta, SensorInfo } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { cargaSedimentoTH } from '@/logic/gemeloDigital';
import { usePlanta } from '@/store/useTelemetria';
import { useOperacion, usePuede } from '@/store/useOperacion';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { TarjetaIndicador, TarjetaIndicadorEsqueleto, type CalidadDato } from '@/components/ui/TarjetaIndicador';
import { TarjetaNave } from '@/components/planta/TarjetaNave';
import { TarjetaBomba } from '@/components/planta/Bomba';
import { TarjetaRecomendacion } from './TarjetaRecomendacion';
import { EsquemaVivo } from './EsquemaVivo';
import { ResumenRapido } from './ResumenRapido';

const MIN = 60_000;

/** Promedia de a 3 puntos (cada 30 min) para que la tendencia se lea sin ruido. */
function suavizar(v: number[]): number[] {
  const r: number[] = [];
  for (let i = 0; i < v.length; i += 3) {
    const g = v.slice(i, i + 3);
    r.push(g.reduce((a, b) => a + b, 0) / g.length);
  }
  return r;
}

function calidad(planta: EstadoPlanta, id: string): { calidad: CalidadDato; minutos: number; sensor?: SensorInfo } {
  const sensor = planta.sensores.find((s) => s.id === id);
  if (!sensor) return { calidad: 'vigente', minutos: 0 };
  const minutos = (planta.t - sensor.actualizado) / MIN;
  if (sensor.estado === 'sin_datos') return { calidad: minutos > 2 ? 'desactualizado' : 'sin_datos', minutos, sensor };
  if (sensor.estado === 'fuera_rango' || sensor.estado === 'necesita_limpieza') return { calidad: sensor.estado, minutos, sensor };
  return { calidad: 'vigente', minutos, sensor };
}

export default function PaginaPanel() {
  const planta = usePlanta();
  if (!planta) return <PanelEsqueleto />;
  return <Panel planta={planta} />;
}

function Panel({ planta }: { planta: EstadoPlanta }) {
  const abrirPurga = useOperacion((s) => s.abrirPurga);
  const opera = usePuede('operar');
  const r = planta.principal;
  const destacada = planta.purgas[0]?.naveId ?? (r.accion !== 'esperar' ? r.naveId : null);
  const serie = planta.serie24h;
  const hoy = new Date(planta.t);
  hoy.setHours(0, 0, 0, 0);
  const inicioHoy = hoy.getTime();
  // La serie solo cambia cada 10 min simulados: las tendencias se recalculan entonces, no a cada dato.
  const tendencias = useMemo(
    () => ({
      caudal: suavizar(serie.map((p) => p.caudalM3s)),
      sst: suavizar(serie.map((p) => p.sstEntradaGL)),
      eficiencia: suavizar(serie.map((p) => p.eficienciaPct)),
      energia: serie.filter((p) => p.t >= inicioHoy).map((p) => p.energiaKwh),
    }),
    [serie, inicioHoy],
  );
  const energiaHoySerie = tendencias.energia;
  // Un manejador fijo por nave: las tarjetas (memorizadas) no se repintan por un manejador nuevo.
  const abrirNave = useMemo(
    () => (opera ? Object.fromEntries(planta.naves.map((n) => [n.id, () => abrirPurga(n.id)])) : {}) as Partial<Record<NaveId, () => void>>,
    [opera, abrirPurga], // los id de las naves no cambian
  );

  const qCaudal = calidad(planta, 'caudal');
  const qSstIn = calidad(planta, 'sst_in');
  const qSstOut = calidad(planta, 'sst_out');
  const ahorroKwh = Math.max(0, planta.config.lineaBaseKwhDia - planta.energiaHoyKwh);
  const retenidoTH = cargaSedimentoTH(planta.sstEntradaGL, planta.caudalM3s) * (planta.eficienciaPct / 100);

  const irANave = (id: NaveId) => document.getElementById(`nave-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <>
      <EncabezadoPagina
        titulo="Desarenador Miraflores"
        descripcion="3 naves de 6.5 × 40 m · lecturas cada minuto"
        acciones={<ResumenRapido planta={planta} className="w-full lg:w-auto" />}
      />

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        {/* Recomendación: primero en celular, a la derecha en pantallas grandes */}
        <TarjetaRecomendacion planta={planta} className="order-first col-span-12 2xl:order-none 2xl:col-span-4 2xl:col-start-9 2xl:row-start-1" />

        <EsquemaVivo
          planta={planta}
          destacada={destacada}
          alSeleccionarNave={irANave}
          className="col-span-12 flex min-w-0 flex-col 2xl:col-span-8 2xl:row-start-1"
        />

        {/* Indicadores generales */}
        <TarjetaIndicador
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          etiqueta="Caudal de entrada"
          icono={<Waves />}
          valor={planta.caudalM3s}
          decimales={1}
          unidad="m³/s"
          tendencia={tendencias.caudal}
          calidad={qCaudal.calidad}
          minutosSinActualizar={qCaudal.minutos}
          detalle={<>Últimas 24 h · rango 4 – 13.5 m³/s</>}
        />
        <TarjetaIndicador
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          etiqueta="Sólidos en suspensión · entrada"
          icono={<Droplets />}
          valor={planta.sstEntradaGL}
          decimales={2}
          unidad="g/L"
          color="sludge"
          tendencia={tendencias.sst}
          calidad={qSstIn.calidad}
          minutosSinActualizar={qSstIn.minutos}
          detalle={
            <>
              Salida <span className="num text-fg">{formatoNumero(planta.sstSalidaGL, 3)}</span> g/L
              {qSstOut.sensor && qSstOut.sensor.estado !== 'en_linea' && (
                <span className="text-warn"> · {qSstOut.sensor.estado === 'sin_datos' ? 'sensor de salida sin datos' : 'sonda de salida por limpiar'}</span>
              )}
            </>
          }
        />
        <TarjetaIndicador
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          etiqueta="Sólidos retenidos"
          icono={<Gauge />}
          valor={planta.eficienciaPct}
          unidad="%"
          color="ok"
          tendencia={tendencias.eficiencia}
          detalle={
            <>
              <span className="block">
                <span className="num text-fg">{formatoNumero(retenidoTH, retenidoTH < 10 ? 1 : 0)}</span> t por hora, sobre todo arena
              </span>
              <span className="block">Los finos siguen al embalse</span>
            </>
          }
        />
        <TarjetaIndicador
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          etiqueta="Energía de bombeo hoy"
          icono={<Zap />}
          valor={planta.energiaHoyKwh}
          unidad="kWh"
          tendencia={energiaHoySerie.some((v) => v > 0) ? energiaHoySerie : undefined}
          detalle={
            <>
              <span className="block">
                Con 8 h fijas: <span className="num text-fg">{formatoNumero(planta.config.lineaBaseKwhDia)}</span> kWh al día
              </span>
              <span className="block">
                Ahorro estimado <span className="num font-semibold text-ok">{formatoNumero(ahorroKwh)}</span> kWh ·{' '}
                <span className="num font-semibold text-ok">{formatoSoles(ahorroKwh * planta.config.tarifaSolesKwh)}</span>
              </span>
            </>
          }
        />

        {/* Naves */}
        <div className="col-span-12 mt-2 flex items-end justify-between gap-3">
          <h3 className="text-title font-semibold text-fg">Naves</h3>
          <span className="text-label text-fg-muted">Nivel crítico {formatoNumero(planta.config.nivelCriticoCm.N1)} cm</span>
        </div>
        {planta.naves.map((n) => (
          <div key={n.id} id={`nave-${n.id}`} className="col-span-12 scroll-mt-28 lg:col-span-4">
            <TarjetaNave
              id={n.id}
              // Redondeos por debajo de lo que se ve: la tarjeta solo se repinta cuando algo cambia a la vista.
              nivelCm={Math.round(n.nivelCm * 4) / 4}
              nivelCriticoCm={n.nivelCriticoCm}
              tasaCmH={Math.round(n.tasaCmH * 100) / 100}
              horasACritico={n.horasACritico === null ? null : Math.round(n.horasACritico * 20) / 20}
              aperturaCm={n.compuerta.aperturaCm}
              estadoCompuerta={n.compuerta.estado}
              sensor={n.sensor}
              minutosSinActualizar={Math.floor((planta.t - n.actualizado) / MIN)}
              destacada={destacada === n.id}
              onClick={abrirNave[n.id]}
              className="h-full"
            />
          </div>
        ))}

        {/* Bombas */}
        <div className="col-span-12 mt-2 flex items-end justify-between gap-3">
          <h3 className="text-title font-semibold text-fg">Bombas de lodos</h3>
          <Link to="/bombeo" className="inline-flex h-10 items-center gap-1.5 rounded-btn px-2 text-label font-semibold text-accent hover:bg-accent-soft">
            Plan de bombeo <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {planta.bombas.map((b) => (
          <TarjetaBomba key={b.id} bomba={b} className="col-span-12 lg:col-span-4" />
        ))}
      </div>

    </>
  );
}

function PanelEsqueleto() {
  return (
    <div aria-busy aria-label="Cargando datos de planta">
      <div className="mb-8 flex flex-col gap-2">
        <Esqueleto className="h-8 w-72" />
        <Esqueleto className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Esqueleto className="col-span-12 h-[440px] rounded-card 2xl:col-span-8" />
        <Esqueleto className="col-span-12 h-[440px] rounded-card 2xl:col-span-4" />
        {[0, 1, 2, 3].map((i) => (
          <TarjetaIndicadorEsqueleto key={i} className="col-span-12 sm:col-span-6 xl:col-span-3" />
        ))}
      </div>
    </div>
  );
}
