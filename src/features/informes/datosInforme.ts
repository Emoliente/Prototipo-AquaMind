import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { NAVES } from '@/config/planta';

/** Densidad aparente del sedimento depositado (t/m³) para pasar m³ a toneladas. */
export const DENSIDAD_SEDIMENTO = 1.5;
const DIA = 86_400_000;

/** Lo único que el informe necesita de la planta (cambia pocas veces al día, no cada segundo). */
export type FuenteInforme = Pick<EstadoPlanta, 't' | 'bitacora' | 'energiaDiaria' | 'energiaHoyKwh' | 'config'>;

export interface DiaInforme {
  dia: number;
  kwh: number;
  lodoM3: number;
  aguaM3: number;
  purgas: number;
}

export interface InformeMes {
  anio: number;
  mes: number;
  dias: DiaInforme[];
  kwh: number;
  kwhBase: number;
  lodoM3: number;
  aguaM3: number;
  purgas: number;
  bombeos: number;
  horasBombeo: number;
  porNave: { naveId: NaveId; purgas: number; lodoM3: number; aguaM3: number; duracionMedia: number; ultima: number | null }[];
}

export function mesesDisponibles(planta: FuenteInforme): { anio: number; mes: number }[] {
  const vistos = new Map<string, { anio: number; mes: number }>();
  for (const t of [planta.t, ...planta.bitacora.map((e) => e.t)]) {
    const d = new Date(t);
    vistos.set(`${d.getFullYear()}-${d.getMonth()}`, { anio: d.getFullYear(), mes: d.getMonth() });
  }
  return [...vistos.values()].sort((a, b) => b.anio - a.anio || b.mes - a.mes);
}

export function informeMes(planta: FuenteInforme, anio: number, mes: number): InformeMes {
  const inicio = new Date(anio, mes, 1).getTime();
  const fin = new Date(anio, mes + 1, 1).getTime();
  const hoy = new Date(planta.t);
  hoy.setHours(0, 0, 0, 0);
  const limite = Math.min(fin, hoy.getTime() + DIA);

  const dias: DiaInforme[] = [];
  for (let d = inicio; d < limite; d += DIA) {
    const dia = new Date(d);
    dia.setHours(0, 0, 0, 0);
    const t = dia.getTime();
    const kwh = t === hoy.getTime() ? planta.energiaHoyKwh : (planta.energiaDiaria.find((x) => x.dia === t)?.kwh ?? 0);
    dias.push({ dia: t, kwh, lodoM3: 0, aguaM3: 0, purgas: 0 });
  }
  const delMes = planta.bitacora.filter((e) => e.t >= inicio && e.t < fin);
  const porNave = new Map<NaveId, { purgas: number; lodoM3: number; aguaM3: number; duracion: number; ultima: number | null }>();
  let bombeos = 0;
  let minutosBombeo = 0;
  for (const e of delMes) {
    if (e.tipo === 'bombeo') {
      bombeos++;
      minutosBombeo += e.duracionMin ?? 0;
    }
    if (e.tipo !== 'purga') continue;
    const d = new Date(e.t);
    d.setHours(0, 0, 0, 0);
    const fila = dias.find((x) => x.dia === d.getTime());
    if (fila) {
      fila.lodoM3 += e.volumenM3 ?? 0;
      fila.aguaM3 += e.aguaM3 ?? 0;
      fila.purgas++;
    }
    if (e.naveId) {
      const n = porNave.get(e.naveId) ?? { purgas: 0, lodoM3: 0, aguaM3: 0, duracion: 0, ultima: null };
      n.purgas++;
      n.lodoM3 += e.volumenM3 ?? 0;
      n.aguaM3 += e.aguaM3 ?? 0;
      n.duracion += e.duracionMin ?? 0;
      n.ultima = Math.max(n.ultima ?? 0, e.t);
      porNave.set(e.naveId, n);
    }
  }

  return {
    anio,
    mes,
    dias,
    kwh: dias.reduce((s, d) => s + d.kwh, 0),
    kwhBase: planta.config.lineaBaseKwhDia * dias.length,
    lodoM3: dias.reduce((s, d) => s + d.lodoM3, 0),
    aguaM3: dias.reduce((s, d) => s + d.aguaM3, 0),
    purgas: dias.reduce((s, d) => s + d.purgas, 0),
    bombeos,
    horasBombeo: minutosBombeo / 60,
    porNave: NAVES.map((n) => {
      const x = porNave.get(n.id);
      return {
        naveId: n.id,
        purgas: x?.purgas ?? 0,
        lodoM3: x?.lodoM3 ?? 0,
        aguaM3: x?.aguaM3 ?? 0,
        duracionMedia: x && x.purgas ? x.duracion / x.purgas : 0,
        ultima: x?.ultima ?? null,
      };
    }),
  };
}
