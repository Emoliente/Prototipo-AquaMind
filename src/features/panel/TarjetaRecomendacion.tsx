import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownToLine, Bot, ChevronDown, CircleStop, ListChecks, Waves, X } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { formatoDuracion, formatoHora, formatoNumero } from '@/lib/format';
import { useOperacion, usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { MedidorUrgencia } from '@/components/planta/MedidorUrgencia';
import { NaveTanque } from '@/components/planta/NaveTanque';
import { Impulsor } from '@/components/planta/Bomba';
import { sinAceleracion } from '@/lib/movimiento';

const MIN = 60_000;

/**
 * La tarjeta que responde "¿hay que purgar?". Sigue el flujo completo:
 * recomendación → purga en curso → volumen purgado (va a la quebrada). Si las bombas del
 * embalse están en marcha, muestra el bombeo en curso.
 */
export function TarjetaRecomendacion({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const purga = planta.purgas[0];
  const ultima = planta.ultimaPurga;
  const recienTerminada = !!ultima?.fin && planta.t - ultima.fin < 45 * MIN;

  let contenido;
  let clave;
  if (purga) {
    clave = `purga-${purga.id}`;
    contenido = <PurgaEnCurso planta={planta} />;
  } else if (planta.bombeo) {
    clave = 'bombeo';
    contenido = <BombeoEnCurso planta={planta} />;
  } else if (recienTerminada) {
    clave = `resultado-${ultima!.id}`;
    contenido = <ResultadoPurga planta={planta} />;
  } else {
    clave = 'recomendacion';
    contenido = <Recomendacion planta={planta} />;
  }

  return (
    <Tarjeta relleno="none" className={cn('relative flex flex-col overflow-hidden', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={clave}
          onUpdate={sinAceleracion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-1 flex-col gap-5 p-5 sm:p-6"
        >
          {contenido}
        </motion.div>
      </AnimatePresence>
    </Tarjeta>
  );
}

function Cabecera({ titulo, derecha }: { titulo: string; derecha?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-label font-semibold uppercase tracking-wider text-fg-subtle">{titulo}</h3>
      {derecha}
    </div>
  );
}

function Recomendacion({ planta }: { planta: EstadoPlanta }) {
  const r = planta.principal;
  const opera = usePuede('operar');
  const abrirPurga = useOperacion((s) => s.abrirPurga);
  const setRechazo = useOperacion((s) => s.setRechazo);
  const [verReglas, setVerReglas] = useState(false);
  const nave = `Nave ${r.naveId.slice(1)}`;
  const automatico = planta.modo === 'automatico';

  return (
    <>
      <Cabecera
        titulo="Recomendación"
        derecha={<span className="num text-label text-fg-muted">calculada {formatoHora(r.generada)}</span>}
      />
      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,280px)_1fr] xl:items-center 2xl:grid-cols-1 2xl:items-stretch">
        <MedidorUrgencia
          urgencia={r.urgencia}
          objetivo={r.accion === 'esperar' ? `${nave}, la más cargada` : nave}
          className="mx-auto w-full max-w-[260px]"
        />
        <div className="flex flex-col gap-5">
          <p className="text-body text-fg">{r.reglaTexto}</p>

          <div>
            <button
              type="button"
              onClick={() => setVerReglas((v) => !v)}
              aria-expanded={verReglas}
              className="flex h-10 items-center gap-2 rounded-btn text-label font-semibold text-fg-muted hover:text-fg"
            >
              <ListChecks className="size-4" aria-hidden />
              Por qué: {r.reglaDominante}
              <ChevronDown className={cn('size-4 transition-transform', verReglas && 'rotate-180')} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {verReglas && (
                <motion.ul
                  onUpdate={sinAceleracion}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col gap-2 overflow-hidden"
                >
                  {r.reglas.slice(0, 4).map((x) => (
                    <li key={x.id} className="flex items-center gap-3 text-label">
                      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-3">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${x.fuerza * 100}%` }} />
                      </span>
                      <span className="flex-1 text-fg">Si {x.condicion}</span>
                      <span className="num shrink-0 text-fg-muted">→ {x.salida}</span>
                    </li>
                  ))}
                  <li className="text-[0.75rem] text-fg-subtle">
                    Entradas: nivel {formatoNumero(r.nivelPct)} % del crítico · sube {formatoNumero(Math.max(0, planta.naves.find((n) => n.id === r.naveId)!.tasaCmH), 1)} cm/h · sólidos {formatoNumero(planta.sstEntradaGL, 2)} g/L · {planta.horaPunta ? 'hora punta' : 'fuera de hora punta'}
                  </li>
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {!opera ? (
              <p className="rounded-btn bg-surface-2 p-3 text-label text-fg-muted">Solo lectura: las purgas las confirma el técnico de turno.</p>
            ) : automatico && r.accion === 'purgar_ya' ? (
              <p className="flex items-center gap-2 rounded-btn bg-accent-soft p-3 text-label font-medium text-fg">
                <Bot className="size-5 shrink-0 text-accent" aria-hidden /> Modo Automático: el sistema inicia la purga dentro de los límites.
              </p>
            ) : (
              <>
                <Boton
                  variante={r.accion === 'esperar' ? 'secundario' : 'primario'}
                  tamano="lg"
                  icono={<ArrowDownToLine />}
                  onClick={() => abrirPurga(r.naveId)}
                  disabled={planta.emergencia}
                  className="w-full"
                >
                  {r.accion === 'purgar_ya' ? `Purgar la ${nave}` : `Preparar purga de la ${nave}`}
                </Boton>
                {r.accion !== 'esperar' && (
                  <Boton variante="fantasma" icono={<X />} onClick={() => setRechazo(true)} className="w-full">
                    Rechazar con motivo
                  </Boton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PurgaEnCurso({ planta }: { planta: EstadoPlanta }) {
  const p = planta.purgas[0];
  const nave = planta.naves.find((n) => n.id === p.naveId)!;
  const opera = usePuede('operar');
  const comando = useComando();
  const progreso = p.manual ? null : Math.min(1, p.minutosPurgando / Math.max(1, p.duracionMin));
  const fase = p.fase === 'abriendo' ? 'Abriendo compuerta' : p.fase === 'cerrando' ? 'Cerrando compuerta' : 'Purgando';
  const restante = p.manual ? null : Math.max(0, p.duracionMin - p.minutosPurgando);

  return (
    <>
      <Cabecera titulo="Purga en curso" derecha={<EstadoChip estado="info" texto={fase} pulso />} />
      <div>
        <p className="text-heading font-semibold text-fg">{nave.nombre}</p>
        <p className="text-label text-fg-muted">
          Compuerta a <span className="num text-fg">{p.aperturaCm}</span> de <span className="num text-fg">{p.aperturaObjetivoCm || p.aperturaUsadaCm}</span> cm ·{' '}
          {p.manual ? 'apertura manual' : <>quedan <span className="num text-fg">{formatoDuracion(restante ?? 0)}</span></>}
        </p>
      </div>
      {progreso !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${progreso * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Lodo ahora</dt>
          <dd><Valor valor={nave.nivelCm} unidad="cm" tamano="sm" /></dd>
          <dd className="text-[0.75rem] text-fg-muted">bajó <span className="num text-fg">{formatoNumero(Math.max(0, p.nivelInicialCm - nave.nivelCm))}</span> cm</dd>
        </div>
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Lodo purgado</dt>
          <dd><Valor valor={p.volumenParcialM3} unidad="m³" tamano="sm" /></dd>
          <dd className="text-[0.75rem] text-fg-muted">agua <span className="num text-fg">{formatoNumero(p.aguaParcialM3)}</span> m³</dd>
        </div>
      </dl>
      <NaveTanque
        nivelCm={nave.nivelCm}
        nivelCriticoCm={nave.nivelCriticoCm}
        aperturaCm={nave.compuerta.aperturaCm}
        sedimentando={false}
        className="mx-auto max-w-[370px]"
        titulo={`Corte de la ${nave.nombre} durante la purga`}
      />
      {opera && p.fase !== 'cerrando' && (
        <div className="mt-auto">
          <BotonMantener
            etiqueta="Detener la purga"
            etiquetaConfirmado="Cerrando compuerta"
            icono={<CircleStop />}
            variante="peligro"
            alConfirmar={() => comando({ tipo: 'abortar_purga', naveId: p.naveId, motivo: 'Detenida desde el panel' })}
          />
        </div>
      )}
    </>
  );
}

function ResultadoPurga({ planta }: { planta: EstadoPlanta }) {
  const u = planta.ultimaPurga!;
  const nave = `Nave ${u.naveId.slice(1)}`;

  return (
    <>
      <Cabecera titulo="Purga terminada" derecha={<EstadoChip estado="normal" texto="Terminada" />} />
      <div>
        <p className="text-label text-fg-muted">{nave} · {formatoDuracion(u.duracionMin)}</p>
        <Valor valor={u.volumenM3 ?? 0} unidad="m³ de lodo" tamano="lg" />
        <p className="text-label text-fg-muted">
          El lodo bajó de <span className="num text-fg">{formatoNumero(u.nivelInicialCm)}</span> a{' '}
          <span className="num text-fg">{formatoNumero(u.nivelFinalCm ?? 0)}</span> cm · agua usada{' '}
          <span className="num text-fg">{formatoNumero(u.aguaUsadaM3 ?? 0)}</span> m³
        </p>
      </div>
      <div className="rounded-card border border-line bg-surface-2 p-4">
        <p className="flex items-center gap-2 text-label font-semibold text-fg">
          <Waves className="size-4 text-accent" aria-hidden /> Se fue a la quebrada: no hay que bombearlo
        </p>
        <p className="mt-2 text-label text-fg-muted">
          Las bombas del embalse trabajan aparte: sacan los finos que pasan con el agua limpia. Ahora hay{' '}
          <span className="num text-fg">{formatoNumero(planta.embalseLodoM3)}</span> m³ de lodo fino en el embalse.
        </p>
      </div>
    </>
  );
}

function BombeoEnCurso({ planta }: { planta: EstadoPlanta }) {
  const b = planta.bombeo!;
  const enMarcha = planta.bombas.filter((x) => x.estado === 'en_marcha');
  const restante = Math.max(0, ...enMarcha.map((x) => x.minutosRestantes ?? 0));
  const total = b.volumenM3 + planta.embalseLodoM3;
  const progreso = total > 0 ? b.volumenM3 / total : 0;
  return (
    <>
      <Cabecera titulo="Bombeo en curso" derecha={<EstadoChip estado="en_marcha" pulso />} />
      <div>
        <p className="text-heading font-semibold text-fg">{enMarcha.map((x) => `Bomba ${x.id.slice(1)}`).join(' + ') || 'Bombas'}</p>
        <p className="text-label text-fg-muted">
          {restante > 0 ? <>Quedan <span className="num text-fg">{formatoDuracion(restante)}</span> según el plan</> : 'Operación manual'}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full rounded-full bg-sludge" initial={false} animate={{ width: `${progreso * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Evacuado</dt>
          <dd><Valor valor={b.volumenM3} unidad="m³" tamano="sm" /></dd>
          <dd className="text-[0.75rem] text-fg-muted">quedan <span className="num text-fg">{formatoNumero(planta.embalseLodoM3)}</span> m³</dd>
        </div>
        <div className="rounded-btn border border-line p-3">
          <dt className="text-label text-fg-muted">Energía</dt>
          <dd><Valor valor={b.kwh} unidad="kWh" decimales={1} tamano="sm" /></dd>
          <dd className="text-[0.75rem] text-fg-muted">S/ <span className="num text-fg">{formatoNumero(b.kwh * planta.config.tarifaSolesKwh, 2)}</span></dd>
        </div>
      </dl>
      <ul className="flex flex-col gap-2">
        {enMarcha.map((x) => (
          <li key={x.id} className="flex items-center gap-3 rounded-btn border border-line p-3">
            <Impulsor estado={x.estado} className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-fg">Bomba {x.id.slice(1)}</p>
              <p className="text-label text-fg-muted">
                <span className="num text-fg">{formatoNumero(x.potenciaActualKw, 1)}</span> kW ·{' '}
                <span className="num text-fg">{formatoNumero(x.corrienteA, 1)}</span> A ·{' '}
                <span className="num text-fg">{formatoNumero(x.capacidadM3h)}</span> m³/h
              </p>
            </div>
            {x.minutosRestantes !== null && (
              <span className="num shrink-0 text-label text-fg-muted">{formatoDuracion(x.minutosRestantes)}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-label text-fg-muted">
        Con 8 h fijas se gastarían <span className="num text-fg">{formatoNumero(planta.config.lineaBaseKwhDia)}</span> kWh al día.
      </p>
    </>
  );
}
