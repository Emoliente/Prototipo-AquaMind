/**
 * Lo que dice el esquema en vivo, en palabras de planta. Compartido por el esquema grande
 * (escritorio) y el compacto (celular) para que digan exactamente lo mismo.
 */
import type { BombaEstado, EstadoPlanta, NaveEstado } from '@/data/DataSource';
import type { TipoEstado } from '@/components/ui/EstadoChip';
import { formatoDuracion, formatoHora, formatoNumero } from '@/lib/format';

/** El tanque mide 400 cm de alto: es la escala del corte de cada nave. */
export const ESCALA_CM = 400;

/** Un número de planta que no sirve (NaN, infinito) se trata como dato faltante. */
export const valido = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export interface EstadoNaveEsquema {
  estado: TipoEstado;
  texto: string;
  /** % del nivel crítico (null si no hay dato confiable). */
  pct: number | null;
  sinDatos: boolean;
  purgando: boolean;
}

/** Qué hacer con cada nave, en una palabra: lo mismo que recomienda AquaMind. */
export function estadoNave(planta: EstadoPlanta, n: NaveEstado): EstadoNaveEsquema {
  const sinDatos = n.sensor === 'sin_datos' || !valido(n.nivelCm) || !valido(n.nivelCriticoCm) || n.nivelCriticoCm <= 0;
  const pct = sinDatos ? null : (n.nivelCm / n.nivelCriticoCm) * 100;
  const purga = planta.purgas.find((p) => p.naveId === n.id);
  if (purga) return { estado: 'info', texto: 'Purgando', pct, sinDatos, purgando: true };
  if (sinDatos) return { estado: 'sin_datos', texto: 'Sin datos', pct, sinDatos, purgando: false };
  const accion = planta.recomendaciones.find((r) => r.naveId === n.id)?.accion;
  if (accion === 'purgar_ya') return { estado: 'critica', texto: 'Purgar ya', pct, sinDatos, purgando: false };
  if (accion === 'programar') return { estado: 'advertencia', texto: 'Programar purga', pct, sinDatos, purgando: false };
  // Sin purga recomendada pero cerca del crítico: igual que la tarjeta de la nave (desde el 65 %).
  if (pct !== null && pct >= 65) return { estado: 'advertencia', texto: 'Vigilar', pct, sinDatos, purgando: false };
  return { estado: 'normal', texto: 'Normal', pct, sinDatos, purgando: false };
}

export interface Frase {
  texto: string;
  /** Resalta la frase cuando pide atención. */
  atencion?: boolean;
}

/** La purga en curso (o la próxima programada), en una frase. */
export function frasePurga(planta: EstadoPlanta): Frase {
  const p = planta.purgas[0];
  if (p) {
    const nave = `Nave ${p.naveId.slice(1)}`;
    if (p.fase === 'abriendo') return { texto: `Abriendo la compuerta de la ${nave}` };
    if (p.fase === 'cerrando') return { texto: `Cerrando la compuerta de la ${nave}` };
    const resta = p.manual ? null : Math.max(0, p.duracionMin - p.minutosPurgando);
    return { texto: resta === null ? `Purgando la ${nave}` : `Purgando la ${nave} · faltan ${formatoDuracion(resta)}` };
  }
  const prox = [...planta.programadas].sort((a, b) => a.inicio - b.inicio)[0];
  if (prox) return { texto: `Purga de la Nave ${prox.naveId.slice(1)} programada a las ${formatoHora(prox.inicio)}` };
  return { texto: 'Ninguna nave purgando' };
}

/** El bombeo de la quebrada, en una frase. */
export function fraseBombeo(planta: EstadoPlanta): Frase {
  const falla = planta.bombas.find((b) => b.estado === 'falla');
  if (falla) return { texto: `Bomba ${falla.id.slice(1)} en falla: revisar`, atencion: true };
  const enMarcha = planta.bombas.filter((b) => b.estado === 'en_marcha');
  if (enMarcha.length) {
    const resta = Math.max(0, ...enMarcha.map((b) => (valido(b.minutosRestantes) ? b.minutosRestantes : 0)));
    const cuales = enMarcha.map((b) => `B${b.id.slice(1)}`).join(' y ');
    return { texto: resta > 0 ? `Bombeando con ${cuales} · faltan ${formatoDuracion(resta)}` : `Bombeando con ${cuales}` };
  }
  if (valido(planta.quebradaM3) && planta.quebradaM3 >= 1) return { texto: 'Lodo en la quebrada esperando bombeo' };
  return { texto: 'Bombas en espera: la quebrada está vacía' };
}

/** Cuánto sedimento trae el agua: anticipa si las naves se llenan más rápido. */
export function fraseSedimento(sstGL: number): Frase {
  if (!valido(sstGL)) return { texto: 'Sin dato de sedimento en la entrada' };
  if (sstGL < 0.3) return { texto: 'Entra agua con poco sedimento' };
  if (sstGL < 1.5) return { texto: 'Entra agua con sedimento moderado' };
  return { texto: 'Entra agua muy cargada: las naves se llenan rápido', atencion: true };
}

/** "350 m³ por bombear" o "Vacía". */
export function textoQuebrada(m3: number): string {
  if (!valido(m3)) return 'Sin dato';
  return m3 < 1 ? 'Vacía' : `${formatoNumero(m3)} m³ por bombear`;
}

/** Estado de una bomba, corto: para su rótulo bajo el ícono. */
export const ESTADO_BOMBA: Record<BombaEstado['estado'], { estado: TipoEstado; texto: string }> = {
  en_marcha: { estado: 'en_marcha', texto: 'En marcha' },
  apagada: { estado: 'apagada', texto: 'Apagada' },
  falla: { estado: 'falla', texto: 'Falla' },
};
