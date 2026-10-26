import { useEffect, useState } from 'react';

/** ¿Se cumple la media query? Escucha los cambios (girar el celular, cambiar el tamaño). */
export function useMedia(consulta: string, inicial = true) {
  const [cumple, setCumple] = useState(() => {
    try {
      return window.matchMedia(consulta).matches;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(consulta);
    } catch {
      return;
    }
    const cambio = () => setCumple(mq.matches);
    cambio();
    mq.addEventListener('change', cambio);
    return () => mq.removeEventListener('change', cambio);
  }, [consulta]);
  return cumple;
}
