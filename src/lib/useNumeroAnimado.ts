import { useLayoutEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * Escribe sobre el nodo de texto que ya creó React (no lo reemplaza): así, cuando React
 * vuelve a pintar, sigue actualizando el mismo nodo que se ve.
 */
function escribir(el: Element, texto: string) {
  const nodo = el.firstChild;
  if (nodo && nodo.nodeType === Node.TEXT_NODE) {
    // Mismo texto: no se toca el DOM (evita recalcular estilos sin que cambie nada a la vista).
    if (nodo.nodeValue !== texto) nodo.nodeValue = texto;
  } else el.textContent = texto;
}

/**
 * Cuenta suavemente hasta el nuevo valor escribiendo directo en el texto del elemento.
 * No vuelve a pintar el componente de React en cada cuadro: decenas de cifras pueden
 * contar a la vez cada segundo sin cargar el hilo principal.
 *
 * Devuelve la ref para el elemento; React pinta el valor final y este hook,
 * antes de que se vea, lo reemplaza por el valor que se está mostrando y anima.
 *
 * `paso` es lo mínimo que cambia la cifra a la vista (1 si no tiene decimales, 0.1 con uno).
 * Solo se cuenta cuando el salto es de 3 pasos o más: de 62 a 63 no hay nada que contar, y
 * animarlo mantenía el navegador dibujando cuadros cada segundo sin que se viera.
 */
export function useNumeroAnimado<T extends Element>(
  valor: number | null,
  formatear: (v: number) => string,
  duracion = 0.45,
  paso = 0,
) {
  const ref = useRef<T>(null);
  const actual = useRef<number | null>(valor);
  const reducir = useReducedMotion();
  const fmt = useRef(formatear);
  fmt.current = formatear;

  useLayoutEffect(() => {
    const el = ref.current;
    const desde = actual.current;
    if (!el || valor === null || !Number.isFinite(valor)) {
      actual.current = valor;
      return;
    }
    // Si la cifra que se ve no cambia (7.61 → 7.63 se ve «7.6»), no hay nada que contar.
    const saltoChico = Math.abs(valor - (desde ?? valor)) < paso * 3;
    if (reducir || desde === null || !Number.isFinite(desde) || desde === valor || saltoChico || fmt.current(desde) === fmt.current(valor)) {
      actual.current = valor;
      escribir(el, fmt.current(valor));
      return;
    }
    escribir(el, fmt.current(desde));
    const control = animate(desde, valor, {
      duration: duracion,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (v) => {
        actual.current = v;
        escribir(el, fmt.current(v));
      },
    });
    return () => control.stop();
  }, [valor, duracion, reducir, paso]);

  return ref;
}
