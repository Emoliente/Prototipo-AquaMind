/** Fecha de Excel: días desde el 30/12/1899, con la hora local como fracción del día. */
export function aFechaExcel(t: number) {
  const d = new Date(t);
  const dia = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30);
  return dia / 86_400_000 + (d.getHours() * 60 + d.getMinutes()) / 1440;
}
