import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export type FaseMantener = 'reposo' | 'manteniendo' | 'soltado' | 'confirmado';

/**
 * Confirmación por presión sostenida (mouse, toque o teclado Espacio/Enter).
 * Si se suelta antes de tiempo no pasa nada y el anillo vuelve a cero.
 */
export function useMantener(duracionMs: number, alCompletar: () => void, deshabilitado = false) {
  const [progreso, setProgreso] = useState(0);
  const [fase, setFase] = useState<FaseMantener>('reposo');
  const inicio = useRef<number | null>(null);
  const raf = useRef<number>(0);
  const completar = useRef(alCompletar);
  completar.current = alCompletar;

  const detener = useCallback(() => {
    cancelAnimationFrame(raf.current);
    inicio.current = null;
  }, []);

  const paso = useCallback(
    (ahora: number) => {
      if (inicio.current === null) return;
      const p = Math.min(1, (ahora - inicio.current) / duracionMs);
      setProgreso(p);
      if (p >= 1) {
        detener();
        setFase('confirmado');
        navigator.vibrate?.(40);
        completar.current();
        return;
      }
      raf.current = requestAnimationFrame(paso);
    },
    [duracionMs, detener],
  );

  const empezar = useCallback(() => {
    if (deshabilitado || inicio.current !== null || fase === 'confirmado') return;
    inicio.current = performance.now();
    setFase('manteniendo');
    raf.current = requestAnimationFrame(paso);
  }, [deshabilitado, fase, paso]);

  const soltar = useCallback(() => {
    if (inicio.current === null) return;
    detener();
    setFase('soltado');
    setProgreso(0);
  }, [detener]);

  const reiniciar = useCallback(() => {
    detener();
    setProgreso(0);
    setFase('reposo');
  }, [detener]);

  useEffect(() => detener, [detener]);

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      empezar();
    },
    onPointerUp: soltar,
    onPointerCancel: soltar,
    onLostPointerCapture: soltar,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        empezar();
      }
    },
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === ' ' || e.key === 'Enter') soltar();
    },
    onBlur: soltar,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  };

  return { progreso, fase, handlers, reiniciar, empezar };
}
