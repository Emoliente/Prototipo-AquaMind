/**
 * Gemelo digital simplificado del desarenador.
 * Carga de sedimento que entra = sólidos (g/L) × caudal (m³/s); se reparte entre las 3 naves.
 *
 * Calibrado con los registros de H2Olmos (scripts/calibrar_gemelo.py): sólidos (R2) y caudales
 * (R4) diarios de marzo y setiembre de 2026, y 46 purgas por nave con su volumen (R3).
 */
import type { Escenario } from '@/types/dominio';

/**
 * Subida media del lodo (cm/h) para una carga dada, antes de repartir por nave.
 * Ajustada con 12 intervalos entre purgas de marzo de 2026 y las purgas de setiembre:
 * ~1 cm/h un día típico de lluvias, ~0.07 cm/h en época seca, 2.5–3.5 cm/h en días de crecida.
 */
export function tasaSubidaBase(sstGL: number, caudalM3s: number): number {
  return 0.027 + 0.068 * sstGL * caudalM3s;
}

/** Carga de sedimento que entra al desarenador, en toneladas por hora. */
export function cargaSedimentoTH(sstGL: number, caudalM3s: number): number {
  return (sstGL * caudalM3s * 3600) / 1000;
}

/** Lodo asentado: ~1.4 t por m³ (supuesto; el mismo con que se estimó la eficiencia). */
const DENSIDAD_LODO_T_M3 = 1.4;

/**
 * Lodo fino que llega al embalse, en m³ por hora. La purga va a la quebrada; el agua limpia
 * va al embalse con los finos que no se quedaron en las naves, y ahí, casi quieta, los deja
 * asentar (supuesto: todos, donde las bombas los alcanzan).
 */
export function finosAlEmbalseM3h(sstSalidaGL: number, caudalM3s: number): number {
  return cargaSedimentoTH(sstSalidaGL, caudalM3s) / DENSIDAD_LODO_T_M3;
}

export function horasACritico(nivelCm: number, criticoCm: number, tasaCmH: number): number | null {
  if (tasaCmH <= 0.05) return null;
  return Math.max(0, (criticoCm - nivelCm) / tasaCmH);
}

/**
 * Cuánto baja el lodo por minuto con la compuerta abierta (cm/min).
 * Más apertura y más carga de lodo encima → baja más rápido. Con 20 cm saca ~280 m³/h, la
 * mediana del registro de purgas: una purga típica (del 85 % al 20 % del crítico) dura ~1.5 h.
 */
export function bajadaPorPurgaCmMin(aperturaCm: number, nivelCm: number): number {
  if (aperturaCm <= 0) return 0;
  const carga = Math.sqrt(Math.max(nivelCm, 15) / 150);
  return 0.102 * aperturaCm * carga;
}

/** Duración estimada (min) para bajar el lodo hasta `objetivoCm`, redondeada a 5 min. */
export function duracionPurgaMin(nivelCm: number, objetivoCm: number, aperturaCm: number): number {
  let nivel = nivelCm;
  let min = 0;
  while (nivel > objetivoCm && min < 300) {
    nivel -= bajadaPorPurgaCmMin(aperturaCm, nivel);
    min++;
  }
  return Math.max(30, Math.ceil(min / 5) * 5);
}

/** Volumen de lodo purgado = Δnivel × área útil de la nave. */
export function volumenPurgadoM3(deltaCm: number, areaM2: number): number {
  return Math.max(0, (deltaCm / 100) * areaM2);
}

/**
 * Agua usada en la purga (orificio bajo compuerta): Q = Cd · b · a · √(2 g h).
 * Cd 0.6, ancho efectivo 0.6 m, carga 2 m.
 */
export function aguaPorMinutoM3(aperturaCm: number): number {
  const a = aperturaCm / 100;
  return 0.6 * 0.6 * a * Math.sqrt(2 * 9.81 * 2) * 60;
}

/** Cómo se nombra cada escenario dentro de una frase («en época seca», «con El Niño»). */
export const ESCENARIO_EN_FRASE: Record<Escenario, string> = { seca: 'época seca', lluvias: 'lluvias', nino: 'El Niño' };

/**
 * Época seca y lluvias: día típico (mediana) y rango de la Bocatoma Miraflores en setiembre y
 * marzo de 2026 (R2 y R4). El Niño no tiene registros: es un supuesto por encima de las lluvias.
 */
export const ESCENARIOS: Record<
  Escenario,
  { nombre: string; caudalBase: number; caudalAmp: number; sstBase: number; sstMin: number; sstMax: number; pulsos: number }
> = {
  seca: { nombre: 'Época seca', caudalBase: 9.9, caudalAmp: 1.2, sstBase: 0.067, sstMin: 0.029, sstMax: 0.19, pulsos: 0 },
  lluvias: { nombre: 'Lluvias', caudalBase: 11.3, caudalAmp: 1.6, sstBase: 1.21, sstMin: 0.1, sstMax: 7, pulsos: 0.35 },
  nino: { nombre: 'El Niño', caudalBase: 12.6, caudalAmp: 0.8, sstBase: 4.6, sstMin: 1.5, sstMax: 7, pulsos: 0.5 },
};

/** Estima el resultado de una purga antes de hacerla (minuto a minuto). */
export function simularPurga(nivelCm: number, aperturaCm: number, duracionMin: number, areaM2: number) {
  let nivel = nivelCm;
  let agua = 0;
  for (let m = 0; m < duracionMin; m++) {
    nivel = Math.max(5, nivel - bajadaPorPurgaCmMin(aperturaCm, nivel));
    agua += aguaPorMinutoM3(aperturaCm);
  }
  return { nivelFinalCm: nivel, volumenM3: volumenPurgadoM3(nivelCm - nivel, areaM2), aguaM3: agua };
}
