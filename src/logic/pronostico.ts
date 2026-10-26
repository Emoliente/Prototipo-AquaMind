/**
 * Pronóstico por escenario con el gemelo digital: cuánto sube el lodo, cuándo
 * llega al crítico y qué significa en purgas, agua y energía por semana.
 * Supone que no se purga dentro del horizonte (para ver el riesgo real).
 */
import type { Escenario, NaveId } from '@/types/dominio';
import type { EstadoPlanta, NaveEstado } from '@/data/DataSource';
import { NAVES } from '@/config/planta';
import { ESCENARIOS, duracionPurgaMin, simularPurga, tasaSubidaBase } from './gemeloDigital';

const HORA = 3_600_000;
/** Las purgas se hacen al 85 % del crítico y bajan el lodo al 20 %. */
const PURGA_DESDE = 0.85;
const PURGA_HASTA = 0.2;
const APERTURA_TIPICA = 20;

export function pesoNave(id: NaveId) {
  return NAVES.find((n) => n.id === id)!.peso;
}

/** Subida típica (cm/h) de una nave en un escenario. */
export function tasaEscenario(escenario: Escenario, naveId: NaveId) {
  const e = ESCENARIOS[escenario];
  return tasaSubidaBase(e.sstBase, e.caudalBase) * pesoNave(naveId);
}

/**
 * Subida a usar en el pronóstico: si el escenario es el que vive la planta y la
 * nave está subiendo, se usa lo medido; si no, la típica del escenario.
 */
export function tasaPronostico(planta: EstadoPlanta, nave: NaveEstado, escenario: Escenario) {
  if (escenario === planta.escenario && nave.tasaCmH > 0.05 && !planta.purgas.some((p) => p.naveId === nave.id)) {
    return nave.tasaCmH;
  }
  return tasaEscenario(escenario, nave.id);
}

export interface PuntoPronostico {
  t: number;
  nivelCm: number;
}

export function curvaPronostico(desde: number, nivelCm: number, tasaCmH: number, horas: number, pasoH = 1): PuntoPronostico[] {
  const puntos: PuntoPronostico[] = [];
  for (let h = 0; h <= horas; h += pasoH) puntos.push({ t: desde + h * HORA, nivelCm: nivelCm + tasaCmH * h });
  return puntos;
}

export function horasHastaCritico(nivelCm: number, criticoCm: number, tasaCmH: number): number | null {
  if (nivelCm >= criticoCm) return 0;
  if (tasaCmH <= 0.01) return null;
  return (criticoCm - nivelCm) / tasaCmH;
}

export interface ResumenEscenario {
  escenario: Escenario;
  nombre: string;
  sstGL: number;
  caudalM3s: number;
  /** Subida de la nave más cargada (N2), cm/h. */
  subidaMaxCmH: number;
  purgasSemana: number;
  lodoM3Semana: number;
  aguaM3Semana: number;
  kwhSemana: number;
  solesSemana: number;
  kwhBaseSemana: number;
  ahorroSolesSemana: number;
}

/** Qué implica un escenario en una semana de operación con purgas a demanda y bombeo calculado. */
// El resumen simula purgas minuto a minuto y la pantalla lo pide cada segundo, pero solo
// cambia con la temporada, la configuración o la bomba más eficiente disponible.
const cacheResumen = new Map<string, ResumenEscenario>();

export function resumenEscenario(escenario: Escenario, planta: EstadoPlanta): ResumenEscenario {
  const { tarifaSolesKwh, lineaBaseKwhDia, nivelCriticoCm } = planta.config;
  const masEficiente = [...planta.bombas].filter((b) => b.estado !== 'falla').sort((a, b) => a.kwhPorM3 - b.kwhPorM3)[0];
  const kwhPorM3 = masEficiente?.kwhPorM3 ?? 0.18;
  const clave = [escenario, kwhPorM3, tarifaSolesKwh, lineaBaseKwhDia, ...NAVES.map((n) => nivelCriticoCm[n.id])].join('|');
  let r = cacheResumen.get(clave);
  if (!r) {
    if (cacheResumen.size > 50) cacheResumen.clear();
    r = calcularResumen(escenario, kwhPorM3, tarifaSolesKwh, lineaBaseKwhDia, nivelCriticoCm);
    cacheResumen.set(clave, r);
  }
  return r;
}

function calcularResumen(
  escenario: Escenario,
  kwhPorM3: number,
  tarifaSolesKwh: number,
  lineaBaseKwhDia: number,
  nivelCriticoCm: EstadoPlanta['config']['nivelCriticoCm'],
): ResumenEscenario {
  const e = ESCENARIOS[escenario];

  let purgas = 0;
  let lodo = 0;
  let agua = 0;
  for (const n of NAVES) {
    const critico = nivelCriticoCm[n.id];
    const tasa = tasaEscenario(escenario, n.id);
    const subidaSemana = tasa * 24 * 7;
    const delta = critico * (PURGA_DESDE - PURGA_HASTA);
    const purgasNave = subidaSemana / delta;
    const desde = critico * PURGA_DESDE;
    const duracion = duracionPurgaMin(desde, critico * PURGA_HASTA, APERTURA_TIPICA);
    purgas += purgasNave;
    lodo += (subidaSemana / 100) * n.areaM2;
    agua += purgasNave * simularPurga(desde, APERTURA_TIPICA, duracion, n.areaM2).aguaM3;
  }
  const kwh = lodo * kwhPorM3;
  const kwhBase = lineaBaseKwhDia * 7;
  return {
    escenario,
    nombre: e.nombre,
    sstGL: e.sstBase,
    caudalM3s: e.caudalBase,
    subidaMaxCmH: Math.max(...NAVES.map((n) => tasaEscenario(escenario, n.id))),
    purgasSemana: purgas,
    lodoM3Semana: lodo,
    aguaM3Semana: agua,
    kwhSemana: kwh,
    solesSemana: kwh * tarifaSolesKwh,
    kwhBaseSemana: kwhBase,
    ahorroSolesSemana: (kwhBase - kwh) * tarifaSolesKwh,
  };
}
