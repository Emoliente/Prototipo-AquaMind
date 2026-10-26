/**
 * Controlador difuso simplificado (tipo Sugeno de orden cero).
 * Entradas: nivel (% del crítico), tasa de subida (cm/h), sólidos de entrada (g/L) y hora punta.
 * Salida: urgencia 0–100 + la regla dominante explicada en palabras de planta.
 */
import type { NaveId, Recomendacion } from '@/types/dominio';
import { accionPorUrgencia } from '@/lib/estado';
import { formatoNumero } from '@/lib/format';
import { duracionPurgaMin } from './gemeloDigital';

// Funciones de pertenencia
const trap = (x: number, a: number, b: number, c: number, d: number) => {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
};
const tri = (x: number, a: number, b: number, c: number) => trap(x, a, b, b, c);

export interface EntradasControl {
  naveId: NaveId;
  nivelCm: number;
  criticoCm: number;
  tasaCmH: number;
  sstGL: number;
  horaPunta: boolean;
  aperturaMaxCm: number;
}

export interface ReglaActivada {
  id: string;
  /** Condición en palabras simples. */
  condicion: string;
  fuerza: number;
  salida: number;
}

export interface ResultadoControl extends Recomendacion {
  nivelPct: number;
  reglas: ReglaActivada[];
  /** Regla que más pesó, en corto. */
  reglaDominante: string;
}

export function evaluar(e: EntradasControl, ahora: number): ResultadoControl {
  const pct = (e.nivelCm / e.criticoCm) * 100;

  const nivel = {
    bajo: trap(pct, 0, 0, 45, 65),
    medio: tri(pct, 50, 68, 86),
    alto: trap(pct, 76, 88, 100, 108),
    critico: trap(pct, 98, 108, 400, 400),
  };
  const tasa = {
    lenta: trap(e.tasaCmH, -99, -99, 0.6, 1.4),
    moderada: tri(e.tasaCmH, 0.8, 2, 3.4),
    rapida: trap(e.tasaCmH, 2.6, 4, 99, 99),
  };
  const sst = {
    bajo: trap(e.sstGL, 0, 0, 0.6, 1.5),
    alto: trap(e.sstGL, 2.5, 4.5, 99, 99),
  };
  const punta = e.horaPunta ? 1 : 0;
  const min = Math.min;
  const max = Math.max;

  const reglas: ReglaActivada[] = [
    { id: 'R1', condicion: 'el lodo está bajo', fuerza: nivel.bajo, salida: 10 },
    { id: 'R2', condicion: 'el nivel es medio y sube lento', fuerza: min(nivel.medio, tasa.lenta), salida: 34 },
    { id: 'R3', condicion: 'el nivel es medio y sube a ritmo moderado', fuerza: min(nivel.medio, tasa.moderada), salida: 55 },
    { id: 'R4', condicion: 'el nivel es medio pero sube rápido', fuerza: min(nivel.medio, tasa.rapida), salida: 76 },
    { id: 'R5', condicion: 'el nivel es alto y sube lento', fuerza: min(nivel.alto, tasa.lenta), salida: 64 },
    { id: 'R6', condicion: 'el nivel es alto y sigue subiendo', fuerza: min(nivel.alto, max(tasa.moderada, tasa.rapida)), salida: 86 },
    { id: 'R7', condicion: 'el lodo pasó el nivel crítico', fuerza: nivel.critico, salida: 98 },
    { id: 'R8', condicion: 'entran muchos sólidos y el nivel ya es medio', fuerza: min(sst.alto, nivel.medio), salida: 70 },
    {
      id: 'R9',
      condicion: 'es hora punta y el nivel lo permite',
      fuerza: min(punta, max(nivel.bajo, nivel.medio), 1 - tasa.rapida),
      salida: 22,
    },
    { id: 'R10', condicion: 'el agua viene limpia y el nivel es bajo', fuerza: min(sst.bajo, nivel.bajo), salida: 6 },
  ];

  const activas = reglas.filter((r) => r.fuerza > 0.01);
  const peso = activas.reduce((s, r) => s + r.fuerza, 0);
  // Se redondea antes de decidir: lo que se muestra es exactamente lo que decide.
  const urgencia = Math.round(peso > 0 ? activas.reduce((s, r) => s + r.fuerza * r.salida, 0) / peso : 0);
  const dominante = [...activas].sort((a, b) => b.fuerza - a.fuerza)[0] ?? reglas[0];
  const accion = accionPorUrgencia(urgencia);

  // Apertura y duración sugeridas
  let apertura = e.tasaCmH > 3 || e.sstGL > 3 || pct > 100 ? 30 : 20;
  apertura = Math.min(apertura, e.aperturaMaxCm);
  const objetivo = e.criticoCm * 0.2;
  const duracion = duracionPurgaMin(e.nivelCm, objetivo, apertura);

  const nombre = `N${e.naveId.slice(1)}`;
  const pctTxt = `${formatoNumero(pct)} %`;
  const tasaTxt =
    e.tasaCmH > 0.05 ? `sube ${formatoNumero(e.tasaCmH, 1)} cm por hora` : 'no está subiendo';

  let texto: string;
  if (accion === 'purgar_ya') {
    texto = `Purgar ${nombre} a ${apertura} cm por ${duracion} min porque el lodo está al ${pctTxt} y ${tasaTxt}.`;
  } else if (accion === 'programar') {
    const horas = e.tasaCmH > 0.05 ? (e.criticoCm * 0.85 - e.nivelCm) / e.tasaCmH : null;
    const plazo =
      horas !== null && horas > 0 ? ` en las próximas ${formatoNumero(Math.max(1, Math.floor(horas)))} h` : '';
    texto = `Programar la purga de ${nombre}${plazo}${e.horaPunta ? ', después de la hora punta,' : ''} porque el lodo está al ${pctTxt} y ${tasaTxt}.`;
  } else {
    texto = `Esperar: el lodo de ${nombre} está al ${pctTxt} y ${tasaTxt}${dominante.id === 'R9' ? '; es hora punta y el nivel lo permite' : ''}.`;
  }

  return {
    naveId: e.naveId,
    urgencia,
    accion,
    aperturaCm: apertura,
    duracionMin: duracion,
    reglaTexto: texto,
    generada: ahora,
    nivelPct: pct,
    reglas: activas.sort((a, b) => b.fuerza - a.fuerza),
    reglaDominante: dominante.condicion,
  };
}
