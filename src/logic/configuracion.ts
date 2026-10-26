/**
 * Reglas de la configuración de planta, compartidas por el simulador (que valida al guardar)
 * y la pantalla de Configuración (que avisa antes de guardar).
 */
import { NAVES, type ConfigPlanta } from '@/config/planta';
import { formatoNumero } from '@/lib/format';

/** Límites aceptados: fuera de esto el valor es un error de tipeo o pone en riesgo la planta. */
export const LIMITES = {
  /** cm. El tanque mide 400 cm: se deja margen para purgar antes de llenarlo. */
  nivelCritico: { min: 100, max: 380 },
  /** Horas de hora punta en un día (la franja empieza y termina el mismo día). */
  horasPunta: { min: 1, max: 12 },
  /** S/ por kWh. */
  tarifa: { min: 0.05, max: 3 },
  purgasMaxDia: { min: 1, max: 12 },
  aperturaMaxCm: { min: 10, max: 100 },
} as const;

export const MOTIVO_MINIMO = 5;

const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Errores de un cambio de configuración, por campo; vacío si se puede guardar. */
export function validarConfig(cambio: Partial<ConfigPlanta>): Record<string, string> {
  const e: Record<string, string> = {};
  const entre = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (cambio.nivelCriticoCm) {
    for (const n of NAVES) {
      const v = cambio.nivelCriticoCm[n.id];
      if (!entre(v, LIMITES.nivelCritico.min, LIMITES.nivelCritico.max)) {
        e[`critico_${n.id}`] = `Entre ${LIMITES.nivelCritico.min} y ${LIMITES.nivelCritico.max} cm.`;
      }
    }
  }
  if (cambio.horaPuntaInicio !== undefined || cambio.horaPuntaFin !== undefined) {
    const ini = cambio.horaPuntaInicio ?? NaN;
    const fin = cambio.horaPuntaFin ?? NaN;
    if (!Number.isInteger(ini) || !Number.isInteger(fin) || ini < 0 || fin > 24) e.horaPunta = 'Elige una hora de inicio y de fin.';
    else if (fin <= ini) e.horaPunta = 'La hora punta debe terminar después de empezar (el mismo día).';
    else if (fin - ini > LIMITES.horasPunta.max) e.horaPunta = `La hora punta no puede pasar de ${LIMITES.horasPunta.max} h.`;
  }
  if (cambio.tarifaSolesKwh !== undefined && !entre(cambio.tarifaSolesKwh, LIMITES.tarifa.min, LIMITES.tarifa.max)) {
    e.tarifa = `Entre S/ ${LIMITES.tarifa.min.toFixed(2)} y S/ ${LIMITES.tarifa.max.toFixed(2)} por kWh.`;
  }
  if (cambio.automatico) {
    const a = cambio.automatico;
    if (!Number.isInteger(a.purgasMaxDia) || !entre(a.purgasMaxDia, LIMITES.purgasMaxDia.min, LIMITES.purgasMaxDia.max)) e.purgasMaxDia = `Entre ${LIMITES.purgasMaxDia.min} y ${LIMITES.purgasMaxDia.max} purgas.`;
    if (!entre(a.aperturaMaxCm, LIMITES.aperturaMaxCm.min, LIMITES.aperturaMaxCm.max) || a.aperturaMaxCm % 10 !== 0) e.aperturaMaxCm = 'De 10 en 10 cm, hasta 100 cm.';
    if (!Number.isInteger(a.horaDesde) || !Number.isInteger(a.horaHasta) || a.horaDesde < 0 || a.horaHasta > 24 || a.horaDesde === a.horaHasta) e.horarioAutomatico = 'Elige un horario válido.';
  }
  return e;
}

/** Cada cambio en palabras: «Nivel crítico Nave 2: 250 → 220 cm». Vacío si no cambia nada. */
export function describirCambios(antes: ConfigPlanta, cambio: Partial<ConfigPlanta>): string[] {
  const d: string[] = [];
  if (cambio.nivelCriticoCm) {
    for (const n of NAVES) {
      const a = antes.nivelCriticoCm[n.id];
      const b = cambio.nivelCriticoCm[n.id];
      if (a !== b) d.push(`Nivel crítico ${n.nombre}: ${formatoNumero(a)} → ${formatoNumero(b)} cm`);
    }
  }
  const ini = cambio.horaPuntaInicio ?? antes.horaPuntaInicio;
  const fin = cambio.horaPuntaFin ?? antes.horaPuntaFin;
  if (ini !== antes.horaPuntaInicio || fin !== antes.horaPuntaFin) {
    d.push(`Hora punta: ${hora(antes.horaPuntaInicio)}–${hora(antes.horaPuntaFin)} → ${hora(ini)}–${hora(fin)}`);
  }
  if (cambio.tarifaSolesKwh !== undefined && cambio.tarifaSolesKwh !== antes.tarifaSolesKwh) {
    d.push(`Tarifa: S/ ${formatoNumero(antes.tarifaSolesKwh, 2)} → S/ ${formatoNumero(cambio.tarifaSolesKwh, 2)} por kWh`);
  }
  if (cambio.lineaBaseKwhDia !== undefined && cambio.lineaBaseKwhDia !== antes.lineaBaseKwhDia) {
    d.push(`Línea base: ${formatoNumero(antes.lineaBaseKwhDia)} → ${formatoNumero(cambio.lineaBaseKwhDia)} kWh por día`);
  }
  if (cambio.automatico) {
    const a = antes.automatico;
    const b = cambio.automatico;
    if (a.purgasMaxDia !== b.purgasMaxDia) d.push(`Automático: máximo ${a.purgasMaxDia} → ${b.purgasMaxDia} purgas por día`);
    if (a.aperturaMaxCm !== b.aperturaMaxCm) d.push(`Automático: apertura máxima ${a.aperturaMaxCm} → ${b.aperturaMaxCm} cm`);
    if (a.horaDesde !== b.horaDesde || a.horaHasta !== b.horaHasta) {
      d.push(`Automático: horario ${hora(a.horaDesde)}–${hora(a.horaHasta)} → ${hora(b.horaDesde)}–${hora(b.horaHasta)}`);
    }
  }
  return d;
}
