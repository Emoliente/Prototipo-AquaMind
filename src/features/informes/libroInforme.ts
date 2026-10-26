import type { Hoja } from '@/lib/excel';
import type { ConfigPlanta } from '@/config/planta';
import { formatoNumero } from '@/lib/format';
import { aFechaExcel } from '@/lib/fechaExcel';
import { DENSIDAD_SEDIMENTO, type InformeMes } from './datosInforme';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MINUTO = 60_000;
/** Dos decimales bastan: así la celda no muestra 443.71170319… al hacer clic. */
const r2 = (v: number) => Math.round(v * 100) / 100;

const fechaTexto = (t: number) => {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * El informe mensual en tres hojas: resumen con los indicadores, el detalle por día (con
 * totales) y el resumen por nave. Las cifras van como números, no como texto: se pueden
 * sumar, filtrar y graficar en Excel.
 */
export function hojasInforme(inf: InformeMes, config: ConfigPlanta, nombreMes: string, enCurso: boolean, hoy: number): Hoja[] {
  const tarifa = config.tarifaSolesKwh;
  const ahorroKwh = inf.kwhBase - inf.kwh;
  const periodo = `${nombreMes[0].toUpperCase()}${nombreMes.slice(1)}${enCurso ? ` (hasta el día ${inf.dias.length})` : ''}`;
  const subtitulo = `Desarenador Miraflores · ${periodo} · datos al ${fechaTexto(hoy)}`;

  const resumen: Hoja = {
    nombre: 'Resumen',
    titulo: 'Informe mensual de energía, agua y sedimento',
    filtro: false,
    subtitulo,
    columnas: [
      { titulo: 'Indicador', ancho: 42 },
      { titulo: 'Valor', ancho: 16, formato: 'decimal2' }, // cada celda trae su formato; esto alinea el encabezado
      { titulo: 'Unidad', ancho: 18 },
    ],
    filas: [
      ['Ahorro en bombeo frente a 8 h fijas', { v: r2(ahorroKwh * tarifa), formato: 'soles' }, 'soles'],
      ['Energía ahorrada', { v: r2(ahorroKwh), formato: 'decimal1' }, 'kWh'],
      ['Energía ahorrada', { v: inf.kwhBase > 0 ? ahorroKwh / inf.kwhBase : 0, formato: 'porcentaje' }, 'de la línea base'],
      ['Energía de bombeo', { v: r2(inf.kwh), formato: 'decimal1' }, 'kWh'],
      ['Costo de bombeo', { v: r2(inf.kwh * tarifa), formato: 'soles' }, 'soles'],
      ['Línea base (8 h fijas por día)', { v: r2(inf.kwhBase), formato: 'entero' }, 'kWh'],
      ['Sedimento retirado', { v: r2(inf.lodoM3), formato: 'decimal1' }, 'm³'],
      ['Sedimento retirado (aprox.)', { v: r2(inf.lodoM3 * DENSIDAD_SEDIMENTO), formato: 'decimal1' }, 't'],
      ['Purgas', { v: r2(inf.purgas), formato: 'entero' }, 'purgas'],
      ['Agua usada en purgas', { v: r2(inf.aguaM3), formato: 'entero' }, 'm³'],
      ['Agua por purga', { v: r2(inf.purgas ? inf.aguaM3 / inf.purgas : 0), formato: 'decimal1' }, 'm³'],
      ['Bombeos', { v: r2(inf.bombeos), formato: 'entero' }, 'bombeos'],
      ['Horas de bombas', { v: r2(inf.horasBombeo), formato: 'decimal1' }, 'h'],
      ['Tarifa referencial', { v: tarifa, formato: 'soles' }, 'por kWh'],
    ],
    notas: [
      `Línea base: ${formatoNumero(config.lineaBaseKwhDia)} kWh por día (bombas 8 h fijas).`,
      `Lodo purgado = bajada del nivel × área de la nave. Toneladas con densidad aparente de ${formatoNumero(DENSIDAD_SEDIMENTO, 1)} t/m³.`,
      'Generado por AquaMind con datos simulados del prototipo.',
    ],
  };

  const porDia: Hoja = {
    nombre: 'Por día',
    titulo: 'Detalle por día',
    subtitulo,
    columnas: [
      { titulo: 'Fecha', ancho: 12, formato: 'fecha', total: 'Total' },
      { titulo: 'Día', ancho: 7 },
      { titulo: 'Energía (kWh)', ancho: 14, formato: 'decimal1', total: 'suma' },
      { titulo: 'Costo (S/)', ancho: 14, formato: 'soles', total: 'suma' },
      { titulo: 'Línea base 8 h (kWh)', ancho: 15, formato: 'entero', total: 'suma' },
      { titulo: 'Ahorro (kWh)', ancho: 13, formato: 'decimal1', total: 'suma' },
      { titulo: 'Lodo purgado (m³)', ancho: 14, formato: 'decimal1', total: 'suma' },
      { titulo: 'Agua de purga (m³)', ancho: 14, formato: 'entero', total: 'suma' },
      { titulo: 'Purgas', ancho: 9, formato: 'entero', total: 'suma' },
    ],
    filas: inf.dias.map((d) => [
      aFechaExcel(d.dia),
      DIAS[new Date(d.dia).getDay()],
      r2(d.kwh),
      // Sin redondear al céntimo: la suma del mes coincide con el resumen y con la pantalla.
      Math.round(d.kwh * tarifa * 10_000) / 10_000,
      config.lineaBaseKwhDia,
      r2(config.lineaBaseKwhDia - d.kwh),
      r2(d.lodoM3),
      r2(d.aguaM3),
      d.purgas,
    ]),
  };

  const porNave: Hoja = {
    nombre: 'Por nave',
    titulo: 'Purgas por nave',
    subtitulo,
    columnas: [
      { titulo: 'Nave', ancho: 12, total: 'Total' },
      { titulo: 'Purgas', ancho: 9, formato: 'entero', total: 'suma' },
      { titulo: 'Lodo purgado (m³)', ancho: 15, formato: 'decimal1', total: 'suma' },
      { titulo: 'Agua de purga (m³)', ancho: 15, formato: 'entero', total: 'suma' },
      { titulo: 'Duración media (min)', ancho: 15, formato: 'entero' },
      { titulo: 'Última purga', ancho: 17, formato: 'fechaHora' },
    ],
    filas: inf.porNave.map((n) => [
      `Nave ${n.naveId.slice(1)}`,
      n.purgas,
      r2(n.lodoM3),
      r2(n.aguaM3),
      n.purgas ? r2(n.duracionMedia) : null,
      n.ultima !== null ? aFechaExcel(Math.floor(n.ultima / MINUTO) * MINUTO) : null,
    ]),
    notas: [`${inf.bombeos} bombeos y ${formatoNumero(inf.horasBombeo, 1)} h de bombas en el mes.`],
  };

  return [resumen, porDia, porNave];
}
