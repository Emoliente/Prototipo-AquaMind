import type { AccionRecomendada, EstadoNivel } from '@/types/dominio';

/** Umbrales del nivel de lodo respecto al nivel crítico. */
export function estadoPorNivel(porcentajeCritico: number): EstadoNivel {
  if (porcentajeCritico >= 85) return 'critica';
  if (porcentajeCritico >= 65) return 'advertencia';
  return 'normal';
}

/** Urgencia 0–100 → recomendación: <40 esperar, 40–70 programar, >70 purgar ya. */
export function accionPorUrgencia(urgencia: number): AccionRecomendada {
  if (urgencia > 70) return 'purgar_ya';
  if (urgencia >= 40) return 'programar';
  return 'esperar';
}

export const TEXTO_ACCION: Record<AccionRecomendada, string> = {
  esperar: 'Esperar',
  programar: 'Programar purga',
  purgar_ya: 'Purgar ya',
};
