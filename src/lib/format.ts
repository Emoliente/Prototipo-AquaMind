/**
 * Formato numérico de planta: punto decimal y miles separados por espacio fino
 * (1 080 kWh · 0.45 S/). Se usa en todas las cifras para que se lean igual.
 */
const ESPACIO_FINO = ' ';

/**
 * Hecho a mano (sin Intl): las cifras que cuentan se formatean en cada cuadro de animación
 * y crear un Intl.NumberFormat por llamada era lo que más cargaba el hilo principal.
 * Da el mismo texto que Intl en-US, salvo "-0", que aquí se muestra como "0".
 */
export function formatoNumero(valor: number, decimales = 0): string {
  if (!Number.isFinite(valor)) return '—';
  const abs = Math.abs(valor);
  // Redondeo «de escuela» sobre la cifra decimal que se ve (1.005 → 1.01), como Intl.
  const redondeado = abs < 1e15 ? Number(`${Math.round(Number(`${abs}e${decimales}`))}e-${decimales}`) : abs;
  const texto = (Number.isFinite(redondeado) ? redondeado : abs).toFixed(decimales);
  const punto = texto.indexOf('.');
  const entero = punto < 0 ? texto : texto.slice(0, punto);
  let agrupado = entero;
  if (entero.length > 3) {
    agrupado = '';
    for (let i = entero.length; i > 0; i -= 3) agrupado = entero.slice(Math.max(0, i - 3), i) + (agrupado ? ESPACIO_FINO + agrupado : '');
  }
  const cuerpo = punto < 0 ? agrupado : agrupado + texto.slice(punto);
  return valor < 0 && /[1-9]/.test(texto) ? `-${cuerpo}` : cuerpo;
}

export function formatoSoles(valor: number): string {
  return `S/${ESPACIO_FINO}${formatoNumero(valor, 2)}`;
}

/** 125 → "2 h 05 min" */
export function formatoDuracion(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (h === 0) return `${resto} min`;
  return `${h} h ${String(resto).padStart(2, '0')} min`;
}

/** Horas hasta un evento: en horas si es pronto, en días si falta mucho. */
export function horasLegibles(horas: number): { valor: number; unidad: string; decimales: number } {
  if (horas >= 48) return { valor: horas / 24, unidad: 'días', decimales: 1 };
  return { valor: horas, unidad: 'h', decimales: 1 };
}

export function formatoHora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function hace(minutos: number): string {
  if (minutos < 1) return 'hace instantes';
  if (minutos < 60) return `hace ${Math.round(minutos)} min`;
  return `hace ${formatoDuracion(minutos)}`;
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "hoy 09:00", "ayer 09:00" o "lun 20 09:00", relativo a la hora de planta. */
export function diaYHora(t: number, ahora: number): string {
  const d = new Date(t).toDateString();
  const dia =
    d === new Date(ahora).toDateString()
      ? 'hoy'
      : d === new Date(ahora - 86_400_000).toDateString()
        ? 'ayer'
        : `${DIAS_CORTOS[new Date(t).getDay()]} ${new Date(t).getDate()}`;
  return `${dia} ${formatoHora(t)}`;
}

/** 2026-10-25 (para nombres de archivo). */
export function fechaIso(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
