export function horaDecimal(t: number): number {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60;
}

export function esHoraPunta(t: number, inicio: number, fin: number): boolean {
  const h = horaDecimal(t);
  return h >= inicio && h < fin;
}

/** Próximo instante (≥ t) fuera de hora punta. */
export function siguienteFueraDePunta(t: number, inicio: number, fin: number): number {
  if (!esHoraPunta(t, inicio, fin)) return t;
  const d = new Date(t);
  d.setHours(fin, 0, 0, 0);
  return d.getTime();
}

/** Minutos que se solapan entre [desde, desde+min) y la hora punta del día. */
export function minutosEnPunta(desde: number, minutos: number, inicio: number, fin: number): number {
  let n = 0;
  for (let m = 0; m < minutos; m += 5) if (esHoraPunta(desde + m * 60_000, inicio, fin)) n += 5;
  return Math.min(n, minutos);
}
