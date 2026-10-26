/**
 * Plan de bombeo: minutos = lodo pendiente ÷ capacidad de las bombas elegidas.
 * Elige primero la bomba con menor kWh/m³ y suma bombas si el volumen es grande.
 * Si el nivel lo permite, evita la hora punta.
 */
import type { AsignacionBomba, Bomba, PlanBombeo } from '@/types/dominio';
import { minutosEnPunta, siguienteFueraDePunta } from './horario';

export interface OpcionesPlan {
  ahora: number;
  horaPuntaInicio: number;
  horaPuntaFin: number;
  lineaBaseKwhDia: number;
  /** Máximo de minutos que se acepta con una sola bomba antes de sumar otra. */
  minutosObjetivo?: number;
  /** Si es urgente (mucho lodo fino junto a las bombas) no se espera a que pase la hora punta. */
  urgente?: boolean;
}

export function calcularPlan(volumenM3: number, bombas: Bomba[], o: OpcionesPlan): PlanBombeo {
  const objetivo = o.minutosObjetivo ?? 150;
  const disponibles = bombas.filter((b) => b.estado !== 'falla').sort((a, b) => a.kwhPorM3 - b.kwhPorM3);

  const elegidas: Bomba[] = [];
  for (const b of disponibles) {
    elegidas.push(b);
    const capacidad = elegidas.reduce((s, x) => s + x.capacidadM3h, 0);
    if ((volumenM3 / capacidad) * 60 <= objetivo) break;
  }

  const capacidad = elegidas.reduce((s, x) => s + x.capacidadM3h, 0) || 1;
  // Todas las bombas elegidas arrancan juntas; cada una mueve su parte.
  const minutos = Math.ceil((volumenM3 / capacidad) * 60);
  const asignaciones: AsignacionBomba[] = elegidas.map((b) => ({
    bombaId: b.id,
    minutos,
    kwh: (b.potenciaKw * minutos) / 60,
  }));

  const inicioFuera = siguienteFueraDePunta(o.ahora, o.horaPuntaInicio, o.horaPuntaFin);
  const evitaHoraPunta =
    !o.urgente &&
    (inicioFuera !== o.ahora || minutosEnPunta(o.ahora, minutos, o.horaPuntaInicio, o.horaPuntaFin) > 0);
  let inicio = o.ahora;
  if (evitaHoraPunta) {
    inicio = inicioFuera;
    // Si arrancando ya se metería en la punta, se empieza al terminar la punta.
    if (minutosEnPunta(inicio, minutos, o.horaPuntaInicio, o.horaPuntaFin) > 0) {
      const d = new Date(inicio);
      if (d.getHours() < o.horaPuntaFin) d.setHours(o.horaPuntaFin, 0, 0, 0);
      inicio = d.getTime();
    }
  }

  const kwhTotal = asignaciones.reduce((s, a) => s + a.kwh, 0);
  return {
    volumenPendienteM3: volumenM3,
    asignaciones: volumenM3 > 0 ? asignaciones : [],
    inicioSugerido: inicio,
    evitaHoraPunta: evitaHoraPunta && inicio !== o.ahora,
    kwhTotal: volumenM3 > 0 ? kwhTotal : 0,
    ahorroKwhVsBase: o.lineaBaseKwhDia - (volumenM3 > 0 ? kwhTotal : 0),
  };
}
