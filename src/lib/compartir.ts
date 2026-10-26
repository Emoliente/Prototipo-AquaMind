/**
 * Reutiliza las partes de `anterior` que no cambiaron en `nuevo` (compartición estructural).
 * Así, si la lista de alertas o la serie de 7 días son iguales a las del segundo anterior,
 * siguen siendo el mismo objeto y los componentes y `useMemo` que dependen de ellas no se
 * vuelven a calcular.
 *
 * Solo recorre arreglos y objetos planos; lo demás se compara por identidad.
 */
export function compartir<T>(anterior: T, nuevo: T): T {
  if (Object.is(anterior, nuevo)) return anterior;
  if (Array.isArray(anterior) && Array.isArray(nuevo)) {
    let igual = anterior.length === nuevo.length;
    const out = nuevo.map((v, i) => {
      const c = i < anterior.length ? compartir(anterior[i], v) : v;
      if (c !== anterior[i]) igual = false;
      return c;
    });
    return (igual ? anterior : out) as T;
  }
  if (esPlano(anterior) && esPlano(nuevo)) {
    const claves = Object.keys(nuevo);
    let igual = claves.length === Object.keys(anterior).length;
    const out: Record<string, unknown> = {};
    for (const k of claves) {
      const c = compartir(anterior[k], nuevo[k]);
      if (c !== anterior[k] || !(k in anterior)) igual = false;
      out[k] = c;
    }
    return (igual ? anterior : out) as T;
  }
  return nuevo;
}

function esPlano(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
