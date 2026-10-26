import { useEffect, useRef, useState } from 'react';

/**
 * ¿El elemento está en pantalla (o cerca)? Sirve para no animar lo que no se ve.
 * Si el navegador no tiene IntersectionObserver, se asume visible.
 */
export function useEnVista<T extends Element>(margen = '120px') {
  const ref = useRef<T>(null);
  const [enVista, setEnVista] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setEnVista(e.isIntersecting), { rootMargin: margen });
    obs.observe(el);
    return () => obs.disconnect();
  }, [margen]);

  return [ref, enVista] as const;
}
