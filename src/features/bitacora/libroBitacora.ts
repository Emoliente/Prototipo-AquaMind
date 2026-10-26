import type { Hoja } from '@/lib/excel';
import type { EventoBitacora, TipoEvento } from '@/types/dominio';
import { aFechaExcel } from '@/lib/fechaExcel';
import { nombreUsuario } from '@/config/usuarios';
import { TIPO_EVENTO } from './tiposEvento';

const MINUTO = 60_000;
/** Dos decimales bastan: así la celda no muestra 443.71170319… al hacer clic. */
const r2 = (v: number | undefined) => (v === undefined ? null : Math.round(v * 100) / 100);

const fechaHoraTexto = (t: number) => {
  const d = new Date(t);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

export interface FiltrosBitacora {
  /** "Últimos 7 días", "Hoy"… */
  periodo: string;
  /** Solo los filtros activos, ya en palabras ("Nave 2", "Purgas"…). */
  activos: string[];
}

/**
 * La bitácora tal como se ve filtrada en pantalla, en dos hojas: los registros (con totales)
 * y un resumen por tipo. Las cifras van como números y la fecha como fecha de Excel, así se
 * pueden ordenar, filtrar y sumar.
 */
export function hojasBitacora(eventos: EventoBitacora[], filtros: FiltrosBitacora, tarifa: number, ahora: number): Hoja[] {
  const subtitulo = `Desarenador Miraflores · ${filtros.periodo} · ${eventos.length} registros · exportado el ${fechaHoraTexto(ahora)}`;
  const notaFiltros = filtros.activos.length ? `Filtros aplicados: ${filtros.activos.join(' · ')}.` : 'Sin filtros: todos los registros del período.';

  const registros: Hoja = {
    nombre: 'Bitácora',
    titulo: 'Bitácora de operación',
    subtitulo,
    columnas: [
      { titulo: 'Fecha y hora', ancho: 17, formato: 'fechaHora', total: 'Total' },
      { titulo: 'Tipo', ancho: 17 },
      { titulo: 'Nave', ancho: 9 },
      { titulo: 'Quién', ancho: 22 },
      { titulo: 'Apertura (cm)', ancho: 11, formato: 'entero' },
      { titulo: 'Duración (min)', ancho: 11, formato: 'entero' },
      { titulo: 'Lodo (m³)', ancho: 11, formato: 'decimal1', total: 'suma' },
      { titulo: 'Agua (m³)', ancho: 11, formato: 'entero', total: 'suma' },
      { titulo: 'Energía (kWh)', ancho: 12, formato: 'decimal1', total: 'suma' },
      { titulo: 'Motivo', ancho: 28 },
      { titulo: 'Detalle', ancho: 90 },
    ],
    filas: eventos.map((e) => [
      aFechaExcel(Math.floor(e.t / MINUTO) * MINUTO),
      TIPO_EVENTO[e.tipo].texto,
      e.naveId ? `Nave ${e.naveId.slice(1)}` : null,
      nombreUsuario(e.usuarioId),
      r2(e.aperturaCm),
      r2(e.duracionMin),
      r2(e.volumenM3),
      r2(e.aguaM3),
      r2(e.kwh),
      e.motivo ?? null,
      e.detalle,
    ]),
    notas: [notaFiltros, 'Generado por AquaMind con datos simulados del prototipo.'],
  };

  const cuenta = (tipo: TipoEvento) => eventos.filter((e) => e.tipo === tipo).length;
  // Suma de los mismos valores redondeados de la hoja Bitácora: los totales coinciden entre hojas.
  const suma = (tipo: TipoEvento, campo: 'volumenM3' | 'aguaM3' | 'kwh') =>
    eventos.filter((e) => e.tipo === tipo).reduce((s, e) => s + (r2(e[campo]) ?? 0), 0);
  const kwh = suma('bombeo', 'kwh');
  const tipos = Object.keys(TIPO_EVENTO) as TipoEvento[];

  const resumen: Hoja = {
    nombre: 'Resumen',
    titulo: 'Resumen de la bitácora',
    subtitulo,
    filtro: false,
    columnas: [
      { titulo: 'Concepto', ancho: 32 },
      { titulo: 'Valor', ancho: 14, formato: 'entero' },
      { titulo: 'Unidad', ancho: 14 },
    ],
    filas: [
      ...tipos.map((t): Hoja['filas'][number] => [TIPO_EVENTO[t].texto, cuenta(t), 'registros']),
      ['Lodo purgado', { v: r2(suma('purga', 'volumenM3')), formato: 'decimal1' }, 'm³'],
      ['Agua usada en purgas', { v: r2(suma('purga', 'aguaM3')), formato: 'entero' }, 'm³'],
      ['Energía de bombeo', { v: r2(kwh), formato: 'decimal1' }, 'kWh'],
      ['Costo de bombeo', { v: r2(kwh * tarifa), formato: 'soles' }, 'soles'],
    ],
    notas: [notaFiltros, `Costo con la tarifa referencial de S/ ${tarifa.toFixed(2)} por kWh.`],
  };

  return [registros, resumen];
}
