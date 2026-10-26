import { useMemo } from 'react';
import type { EstadoPlanta, NaveEstado } from '@/data/DataSource';
import type { Escenario } from '@/types/dominio';
import { formatoHora, formatoNumero, horasLegibles } from '@/lib/format';
import { ESCENARIO_EN_FRASE } from '@/logic/gemeloDigital';
import { curvaPronostico, horasHastaCritico, tasaPronostico } from '@/logic/pronostico';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { GraficoPronostico, type PuntoGrafico } from './GraficoPronostico';

const HORA = 3_600_000;
const MIN = 60_000;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function cuandoLlega(t: number, ahora: number) {
  const d = new Date(t);
  const hoy = new Date(ahora);
  if (d.toDateString() === hoy.toDateString()) return `hoy a las ${formatoHora(t)}`;
  if (d.toDateString() === new Date(ahora + 86_400_000).toDateString()) return `mañana a las ${formatoHora(t)}`;
  return `el ${DIAS[d.getDay()]} ${d.getDate()} a las ${formatoHora(t)}`;
}

interface Props {
  planta: EstadoPlanta;
  nave: NaveEstado;
  escenario: Escenario;
  rango: '24h' | '7d';
}

/** Una nave: cuándo llega al crítico en el escenario elegido y su nivel medido + pronosticado. */
export function TarjetaPronosticoNave({ planta, nave, escenario, rango }: Props) {
  const tasa = tasaPronostico(planta, nave, escenario);
  const medida = escenario === planta.escenario && tasa === nave.tasaCmH;
  const horas = horasHastaCritico(nave.nivelCm, nave.nivelCriticoCm, tasa);
  const pct = (nave.nivelCm / nave.nivelCriticoCm) * 100;

  const horizonte = rango === '24h' ? 12 : 72;
  const historia = rango === '24h' ? planta.serie24h : planta.serie7d;
  // El gráfico avanza en saltos de 10 min (24 h) o 30 min (7 días), que a esa escala no se notan:
  // así no se redibuja con cada dato y la pantalla sigue fluida.
  const paso = (rango === '24h' ? 10 : 30) * MIN;
  // Cada nave salta en un momento distinto (desfase de un tercio de paso): los tres gráficos
  // nunca se redibujan en el mismo cuadro.
  const desfase = ((Number(nave.id.slice(1)) - 1) % 3) * (paso / 3);
  const ahora = Math.floor((planta.t + desfase) / paso) * paso - desfase;
  const nivel = Math.round(nave.nivelCm);
  const tasaG = Math.round(tasa * 20) / 20;
  const critico = nave.nivelCriticoCm;
  const datos = useMemo<PuntoGrafico[]>(
    () => [
      ...historia.filter((p) => p.t < ahora).map((p) => ({ t: p.t, real: p.niveles[nave.id] })),
      { t: ahora, real: nivel, pronostico: nivel },
      // El pronóstico se corta un poco después del crítico: más arriba no aporta y aplasta la escala.
      ...curvaPronostico(ahora, nivel, tasaG, horizonte, rango === '24h' ? 1 : 3)
        .slice(1)
        .filter((p) => p.nivelCm <= Math.max(critico * 1.25, nivel + 10))
        .map((p) => ({ t: p.t, pronostico: Math.max(0, p.nivelCm) })),
    ],
    [historia, ahora, nivel, tasaG, horizonte, rango, critico, nave.id],
  );
  const horasG = horasHastaCritico(nivel, critico, tasaG);
  const cruce = horasG !== null && horasG > 0 && horasG <= horizonte ? ahora + horasG * HORA : null;

  const riesgo =
    horas === 0
      ? { estado: 'critica' as const, texto: 'Ya pasó el crítico' }
      : horas !== null && horas < 12
        ? { estado: 'critica' as const, texto: 'Riesgo alto' }
        : horas !== null && horas < 48
          ? { estado: 'advertencia' as const, texto: 'Vigilar' }
          : { estado: 'normal' as const, texto: 'Con margen' };
  const legible = horas !== null && horas > 0 ? horasLegibles(horas) : null;

  return (
    <Tarjeta relleno="none" className="grid grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-3 border-b border-line p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-title font-semibold text-fg">{nave.nombre}</h3>
          <EstadoChip estado={riesgo.estado} texto={riesgo.texto} pulso={riesgo.estado === 'critica'} />
        </div>
        <div>
          <p className="text-label text-fg-muted">Llega al nivel crítico</p>
          {horas === 0 ? (
            <p className="text-value font-semibold text-crit">Ya lo pasó</p>
          ) : legible ? (
            <>
              <p>
                <span className="text-label text-fg-muted">en </span>
                <Valor valor={legible.valor} unidad={legible.unidad} decimales={legible.unidad === 'h' ? 1 : 1} tamano="md" />
              </p>
              <p className="text-label text-fg-muted">{cuandoLlega(planta.t + horas! * HORA, planta.t)}</p>
            </>
          ) : (
            <p className="text-value-sm font-semibold text-fg">No está subiendo</p>
          )}
        </div>
        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-label text-fg-muted">Lodo ahora</dt>
            <dd className="num text-body font-semibold text-fg">
              {formatoNumero(nave.nivelCm)} <span className="font-sans text-label font-normal text-fg-muted">cm · {formatoNumero(pct)} %</span>
            </dd>
          </div>
          <div>
            <dt className="text-label text-fg-muted">Sube</dt>
            <dd className="num text-body font-semibold text-fg">
              {formatoNumero(Math.max(0, tasa), 1)} <span className="font-sans text-label font-normal text-fg-muted">cm/h</span>
            </dd>
            <dd className="text-[0.75rem] text-fg-muted">{medida ? 'medido ahora' : `típico de ${ESCENARIO_EN_FRASE[escenario]}`}</dd>
          </div>
        </dl>
      </div>
      <div className="min-w-0 p-3 pt-4 sm:p-5">
        <GraficoPronostico
          datos={datos}
          ahora={ahora}
          criticoCm={nave.nivelCriticoCm}
          cruce={cruce}
          rango={rango}
          desde={ahora - (rango === '24h' ? 24 : 168) * HORA}
          hasta={ahora + horizonte * HORA}
          alto={210}
        />
        <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 pl-10 text-[0.75rem] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-sludge-top" aria-hidden /> Medido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed border-sludge-top" aria-hidden /> Pronóstico sin purgar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dashed border-crit" aria-hidden /> Nivel crítico
          </span>
        </p>
      </div>
    </Tarjeta>
  );
}
