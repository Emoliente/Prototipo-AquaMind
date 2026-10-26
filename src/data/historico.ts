/**
 * Historia de operación anterior a la simulación (30 días de época seca):
 * purgas de noche, bombeos calculados, lecturas de miras y notas.
 * Sirve para que la bitácora y el informe mensual tengan datos desde el primer día.
 */
import type { EventoBitacora, NaveId } from '@/types/dominio';
import { NAVES } from '@/config/planta';
import { aguaPorMinutoM3, volumenPurgadoM3 } from '@/logic/gemeloDigital';

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

type Rng = () => number;
type Evento = Omit<EventoBitacora, 'id'>;

const TECNICOS = ['u-tecnico', 'u-tecnico2'];
const NOTAS = [
  'Limpieza de las rejillas de la entrada; sin novedad.',
  'Ronda nocturna: compuertas sin fugas y miras legibles.',
  'Se retiró una rama atascada en el canal de entrada.',
  'Revisión de la Bomba 3: ruido normal, sin vibraciones.',
];

export interface Historia {
  eventos: Evento[];
  /** kWh de bombeo por día (inicio del día local → kWh). */
  energiaPorDia: Map<number, number>;
}

function inicioDia(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function generarHistoria(desde: number, hasta: number, rng: Rng): Historia {
  const eventos: Evento[] = [];
  const energiaPorDia = new Map<number, number>();
  const entre = (a: number, b: number) => a + rng() * (b - a);
  const elegir = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];

  // Purgas como en el registro de limpieza (R3) en época seca: cada nave cada 2–3 meses, de
  // noche, de 1 a 2.5 h y unos 300–450 m³; luego el bombeo calculado.
  NAVES.forEach((n, i) => {
    let t = inicioDia(desde) + (4 + i * 9) * DIA;
    while (t < hasta) {
      const inicio = inicioDia(t) + entre(20.5, 23.5) * HORA;
      if (inicio >= hasta) break;
      const tecnico = elegir(TECNICOS);
      const apertura = rng() < 0.8 ? 20 : 30;
      const duracion = Math.round(entre(60, 150));
      const nivelAntes = entre(170, 215);
      const nivelDespues = entre(45, 70);
      const volumen = volumenPurgadoM3(nivelAntes - nivelDespues, n.areaM2);
      const agua = aguaPorMinutoM3(apertura) * duracion;
      eventos.push({
        t: inicio + duracion * MIN,
        tipo: 'purga',
        naveId: n.id as NaveId,
        usuarioId: tecnico,
        aperturaCm: apertura,
        duracionMin: duracion,
        volumenM3: volumen,
        aguaM3: agua,
        detalle: `Purga asistida de ${n.nombre}: el lodo bajó de ${Math.round(nivelAntes)} a ${Math.round(nivelDespues)} cm.`,
      });
      const minutosBombeo = Math.ceil((volumen / 220) * 60);
      const kwh = (30 * minutosBombeo) / 60;
      const finBombeo = inicio + (duracion + 45 + minutosBombeo) * MIN;
      eventos.push({
        t: finBombeo,
        tipo: 'bombeo',
        usuarioId: tecnico,
        duracionMin: minutosBombeo,
        volumenM3: volumen,
        kwh,
        detalle: `Bombeo con Bomba 2: ${Math.round(volumen)} m³ evacuados.`,
      });
      const dia = inicioDia(finBombeo);
      energiaPorDia.set(dia, (energiaPorDia.get(dia) ?? 0) + kwh);
      t = inicio + entre(60, 90) * DIA;
    }
  });

  // Lecturas de miras cada 3 días por la mañana.
  for (let t = inicioDia(desde) + 2 * DIA + 8 * HORA; t < hasta; t += 3 * DIA) {
    const n = elegir(NAVES);
    const sensor = entre(80, 200);
    const miras = Math.round(sensor + entre(-6, 6));
    eventos.push({
      t: t + entre(0, 50) * MIN,
      tipo: 'lectura_mira',
      naveId: n.id as NaveId,
      usuarioId: 'u-tecnico2',
      detalle: `Lectura de miras ${n.nombre}: promedio ${miras} cm (sensor ${Math.round(sensor)} cm, diferencia ${miras - Math.round(sensor) >= 0 ? '+' : ''}${miras - Math.round(sensor)} cm).`,
    });
  }

  // Algunas notas y un rechazo de recomendación.
  for (let k = 0; k < NOTAS.length; k++) {
    const t = desde + entre(0.1, 0.95) * (hasta - desde);
    eventos.push({ t, tipo: 'nota', usuarioId: elegir(TECNICOS), detalle: NOTAS[k] });
  }
  eventos.push({
    t: desde + 0.4 * (hasta - desde),
    tipo: 'rechazo',
    naveId: 'N1',
    usuarioId: 'u-tecnico',
    motivo: 'No hay personal en campo',
    detalle: 'Recomendación rechazada (urgencia 52).',
  });

  eventos.sort((a, b) => a.t - b.t);
  return { eventos, energiaPorDia };
}
