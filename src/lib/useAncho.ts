import { useLayoutEffect, useRef, useState } from 'react';

/** Mide el ancho real de un elemento para dibujar SVG en píxeles exactos. */
export function useAncho<T extends HTMLElement>(inicial = 0) {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, ancho] as const;
}
