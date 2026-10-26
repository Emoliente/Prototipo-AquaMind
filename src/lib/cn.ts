type Clase = string | false | null | undefined;

/** Une clases condicionales. */
export function cn(...clases: Clase[]): string {
  return clases.filter(Boolean).join(' ');
}
