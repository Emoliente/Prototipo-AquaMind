/**
 * Reglas de calibración compartidas por el simulador y la pantalla de Calibración:
 * cuánto puede diferir un sensor de su referencia y qué lectura tenía en un momento dado.
 */
import type { PuntoSerie } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';

const MIN = 60_000;
const DIA = 24 * 60 * MIN;

/** Diferencia que se acepta sin calibrar: ±10 % en sólidos (mín. 0.005 g/L), ±5 cm en nivel. */
export const TOLERANCIA = { relativa: 0.1, minimaGL: 0.005, cm: 5 };
/** Más allá de esto la muestra parece mal tomada: no se calibra con ella. */
export const CORRECCION_MAXIMA = { relativa: 0.5, cm: 60 };
/** Antigüedad máxima de una muestra para compararla con el sensor. */
export const ANTIGUEDAD_MAXIMA_MS = 7 * DIA;

export type UnidadMuestra = 'g/L' | 'cm';

export interface Comparacion {
  /** Sensor − referencia, en la unidad de la muestra. */
  diferencia: number;
  /** Diferencia relativa a la referencia (solo sólidos). */
  relativa: number | null;
  dentro: boolean;
  /** La corrección sería tan grande que conviene repetir la muestra. */
  demasiado: boolean;
}

export function comparar(referencia: number, sensor: number, unidad: UnidadMuestra): Comparacion {
  const diferencia = sensor - referencia;
  if (unidad === 'cm') {
    return { diferencia, relativa: null, dentro: Math.abs(diferencia) <= TOLERANCIA.cm, demasiado: Math.abs(diferencia) > CORRECCION_MAXIMA.cm };
  }
  const relativa = referencia > 0 ? diferencia / referencia : 0;
  const factor = referencia / Math.max(1e-6, sensor);
  return {
    diferencia,
    relativa,
    dentro: Math.abs(diferencia) <= Math.max(TOLERANCIA.relativa * referencia, TOLERANCIA.minimaGL),
    demasiado: Math.abs(factor - 1) > CORRECCION_MAXIMA.relativa,
  };
}

/** Qué marcaba un sensor en `t`, según las series guardadas (null si no hay registro cercano). */
export function valorEnSerie(
  serie24h: PuntoSerie[],
  serie7d: PuntoSerie[],
  ahora: number,
  sensorId: string,
  naveId: NaveId | undefined,
  t: number,
): number | null {
  const serie = ahora - t <= DIA ? serie24h : serie7d;
  if (!serie.length) return null;
  let mejor = serie[0];
  for (const p of serie) if (Math.abs(p.t - t) < Math.abs(mejor.t - t)) mejor = p;
  if (Math.abs(mejor.t - t) > 90 * MIN) return null;
  if (sensorId === 'sst_in') return mejor.sstEntradaGL;
  if (sensorId === 'sst_out') return mejor.sstSalidaGL;
  if (sensorId === 'caudal') return mejor.caudalM3s;
  if (sensorId === 'embalse') return mejor.embalseLodoM3;
  if (naveId) return mejor.niveles[naveId];
  return null;
}
