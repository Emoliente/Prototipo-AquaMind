import { CalendarClock, CircleStop, Fan, Lightbulb, Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EstadoPlanta } from '@/data/DataSource';
import { formatoDuracion, formatoHora, formatoNumero, formatoSoles } from '@/lib/format';
import { usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { LineaTiempoBombeo } from './LineaTiempoBombeo';

/** Por qué el plan es así, en palabras simples. */
function razones(planta: EstadoPlanta): string[] {
  const p = planta.plan;
  if (!p.asignaciones.length) return [];
  const bombas = planta.bombas;
  const elegidas = p.asignaciones.map((a) => bombas.find((b) => b.id === a.bombaId)!);
  const primera = elegidas[0];
  const r = [`Bomba ${primera.id.slice(1)} primero: es la que menos energía gasta por m³ (${formatoNumero(primera.kwhPorM3, 2)} kWh/m³).`];
  if (elegidas.length > 1) {
    const sola = (p.volumenPendienteM3 / primera.capacidadM3h) * 60;
    r.push(`Se suma${elegidas.length > 2 ? 'n' : ''} ${elegidas.slice(1).map((b) => `la Bomba ${b.id.slice(1)}`).join(' y ')}: con una sola tardaría ${formatoDuracion(sola)}.`);
  }
  if (p.evitaHoraPunta) {
    r.push(`Empieza a las ${formatoHora(p.inicioSugerido)} para no bombear en hora punta (${planta.config.horaPuntaInicio}:00–${planta.config.horaPuntaFin}:00); el embalse tiene espacio.`);
  } else if (planta.embalseLodoM3 > planta.embalseCapacidadM3 * 0.75) {
    r.push('No espera: hay mucho lodo fino junto a las bombas.');
  } else {
    r.push('Puede empezar ahora: no cae en hora punta.');
  }
  return r;
}

/** Por qué todavía no se bombea: poco lodo fino en el embalse, y cuándo llegará al umbral. */
function textoEspera(planta: EstadoPlanta): string {
  const lodo = planta.embalseLodoM3;
  const umbral = planta.embalseUmbralM3;
  if (lodo < 1) return 'No hay lodo fino por bombear en el embalse.';
  const base = `Hay ${formatoNumero(lodo)} m³ de lodo fino en el embalse: conviene bombear desde ${formatoNumero(umbral)} m³.`;
  const ritmo = planta.finosEmbalseM3h;
  if (!(ritmo > 0.05) || lodo >= umbral) return base;
  const minutos = ((umbral - lodo) / ritmo) * 60;
  const cuando = minutos > 48 * 60 ? `unos ${formatoNumero(minutos / (24 * 60))} días` : formatoDuracion(minutos);
  return `${base} Al ritmo de ahora (${formatoNumero(ritmo, ritmo < 10 ? 1 : 0)} m³/h) se llega en ${cuando}.`;
}

export function TarjetaPlanBombeo({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const opera = usePuede('operar');
  const comando = useComando();
  const p = planta.plan;
  const { tarifaSolesKwh: tarifa, lineaBaseKwhDia: base } = planta.config;
  const enCurso = !!planta.bombeo;
  // Con poco lodo fino no conviene arrancar: el plan se muestra al pasar el umbral.
  const espera = !enCurso && !planta.planProgramado && planta.embalseLodoM3 < planta.embalseUmbralM3;
  const sinLodo = !enCurso && (!p.asignaciones.length || espera);

  return (
    <Tarjeta relleno="none" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 sm:p-6">
        <EncabezadoTarjeta
          className="basis-72"
          icono={<Fan className="size-5" />}
          titulo="Plan de bombeo"
          subtitulo="Las bombas trabajan solo el tiempo calculado, no 8 h fijas"
        />
        {enCurso ? (
          <EstadoChip estado="en_marcha" texto="En marcha" pulso />
        ) : planta.planProgramado ? (
          <EstadoChip estado="info" texto={`Programado ${formatoHora(planta.planProgramado.inicio)}`} />
        ) : sinLodo ? (
          <EstadoChip estado="normal" texto={planta.embalseLodoM3 < 1 ? 'Sin lodo pendiente' : 'Aún no hace falta'} />
        ) : (
          <EstadoChip estado="advertencia" texto="Por iniciar" />
        )}
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        {sinLodo ? (
          <p className="rounded-btn border border-dashed border-line-strong p-6 text-center text-body text-fg-muted">
            {textoEspera(planta)}
          </p>
        ) : enCurso ? (
          <EnCurso planta={planta} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
              <div>
                <p className="text-label text-fg-muted">Lodo a evacuar</p>
                <Valor valor={p.volumenPendienteM3} unidad="m³" tamano="lg" />
                <ul className="mt-2 flex flex-col gap-1">
                  {p.asignaciones.map((a) => (
                    <li key={a.bombaId} className="text-body text-fg">
                      Bomba {a.bombaId.slice(1)} · <span className="num font-semibold">{formatoDuracion(a.minutos)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="flex flex-col gap-2">
                {razones(planta).map((r) => (
                  <li key={r} className="flex gap-2 text-label text-fg">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!sinLodo && !enCurso && <LineaTiempoBombeo planta={planta} />}

        {!sinLodo && !enCurso && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Con este plan</dt>
              <dd><Valor valor={p.kwhTotal} unidad="kWh" tamano="sm" /></dd>
              <dd className="num text-label text-fg-muted">{formatoSoles(p.kwhTotal * tarifa)}</dd>
            </div>
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Con 8 h fijas</dt>
              <dd><Valor valor={base} unidad="kWh" tamano="sm" atenuado /></dd>
              <dd className="num text-label text-fg-muted">{formatoSoles(base * tarifa)}</dd>
            </div>
            <div className="rounded-btn border border-ok/40 bg-ok-soft p-3">
              <dt className="text-label text-fg-muted">Ahorro</dt>
              <dd><Valor valor={p.ahorroKwhVsBase} unidad="kWh" tamano="sm" /></dd>
              <dd className="num text-label font-semibold text-ok">{formatoSoles(p.ahorroKwhVsBase * tarifa)}</dd>
            </div>
          </dl>
        )}

        {opera && !sinLodo && !enCurso && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {planta.planProgramado ? (
              <>
                <Boton variante="primario" icono={<Play />} onClick={() => comando({ tipo: 'ejecutar_plan' })}>
                  Bombear ahora
                </Boton>
                <Boton variante="fantasma" icono={<X />} onClick={() => comando({ tipo: 'cancelar_plan_programado' })}>
                  Cancelar programación
                </Boton>
              </>
            ) : p.evitaHoraPunta ? (
              <>
                <Boton variante="primario" icono={<CalendarClock />} onClick={() => comando({ tipo: 'programar_plan', inicio: p.inicioSugerido })}>
                  Programar a las {formatoHora(p.inicioSugerido)}
                </Boton>
                <Boton icono={<Play />} onClick={() => comando({ tipo: 'ejecutar_plan', motivo: 'Bombeo en hora punta por decisión del operador' })}>
                  Bombear ahora de todas formas
                </Boton>
              </>
            ) : (
              <Boton variante="primario" tamano="lg" icono={<Play />} onClick={() => comando({ tipo: 'ejecutar_plan' })}>
                Iniciar bombeo
              </Boton>
            )}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

function EnCurso({ planta }: { planta: EstadoPlanta }) {
  const opera = usePuede('operar');
  const comando = useComando();
  const b = planta.bombeo!;
  const total = b.volumenM3 + planta.embalseLodoM3;
  const progreso = total > 0 ? b.volumenM3 / total : 0;
  const tarifa = planta.config.tarifaSolesKwh;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-2 text-label text-fg-muted">
          <span>
            Evacuado <span className="num font-semibold text-fg">{formatoNumero(b.volumenM3)}</span> de{' '}
            <span className="num text-fg">{formatoNumero(total)}</span> m³
          </span>
          <span>
            Quedan <span className="num font-semibold text-fg">{formatoNumero(planta.embalseLodoM3)}</span> m³
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="h-full rounded-full bg-sludge" initial={false} animate={{ width: `${progreso * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Energía de este bombeo</dt>
          <dd><Valor valor={b.kwh} unidad="kWh" decimales={1} tamano="sm" /></dd>
          <dd className="num text-label text-fg-muted">{formatoSoles(b.kwh * tarifa)}</dd>
        </div>
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Empezó</dt>
          <dd className="num text-value-sm font-semibold text-fg">{formatoHora(b.inicio)}</dd>
          <dd className="text-label text-fg-muted">hace {formatoDuracion((planta.t - b.inicio) / 60_000)}</dd>
        </div>
        <div className="col-span-2 rounded-btn border border-line p-3 sm:col-span-1">
          <dt className="text-label text-fg-muted">Potencia ahora</dt>
          <dd>
            <Valor
              valor={planta.bombas.reduce((s, x) => s + x.potenciaActualKw, 0)}
              unidad="kW"
              decimales={1}
              tamano="sm"
            />
          </dd>
        </div>
      </dl>
      <LineaTiempoBombeo planta={planta} />
      {opera && (
        <BotonMantener
          etiqueta="Detener el bombeo"
          etiquetaConfirmado="Bombas apagadas"
          icono={<CircleStop />}
          variante="peligro"
          alConfirmar={() => comando({ tipo: 'detener_bombeo', motivo: 'Detenido desde Bombeo' })}
          className="sm:max-w-sm"
        />
      )}
    </div>
  );
}
