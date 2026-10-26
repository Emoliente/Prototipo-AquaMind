import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelemetria } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { useNotificaciones } from '@/store/useNotificaciones';
import type { ContextoDemo } from './guionDemo';
import { useModoDemo } from './useModoDemo';

const PASO_MS = 100;

/** Contexto con el que el guion actúa sobre la app (planta, navegación, diálogos). */
export function useContextoDemo(): ContextoDemo {
  const navegar = useNavigate();
  return useMemo(
    () => ({
      enviar: (c) => void useTelemetria.getState().enviar(c, { silencioso: true }),
      planta: () => useTelemetria.getState().planta,
      abrirPurga: (id) => useOperacion.getState().abrirPurga(id),
      navegar: (ruta) => navegar(ruta),
      mostrar: (c) => useModoDemo.getState().mostrar(c),
      limpiarAvisos: () => useNotificaciones.getState().limpiarEmergentes(),
      subir: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    }),
    [navegar],
  );
}

/** Si un paso del guion falla, la demo se detiene con un aviso y la app queda como estaba, usable. */
function protegido(ctx: ContextoDemo, f: () => void) {
  try {
    f();
  } catch (e) {
    console.error('[demo] el guion falló', e);
    try {
      useModoDemo.getState().salir(ctx);
    } catch {
      // Si ni salir funciona, al menos se apaga el modo demo.
      useModoDemo.setState({ activo: false, pedido: null });
    }
    useTelemetria.getState().avisar({ ok: false, mensaje: 'El Modo demo se detuvo por un error. Puedes iniciarlo de nuevo desde el botón Modo demo.' });
  }
}

/** Reloj del Modo demo: avanza el guion cada 100 ms mientras está activo y sin pausa. */
export function useMotorDemo() {
  const ctx = useContextoDemo();
  const activo = useModoDemo((s) => s.activo);
  const pedido = useModoDemo((s) => s.pedido);

  useEffect(() => {
    if (pedido !== 'iniciar') return;
    protegido(ctx, () => {
      useOperacion.getState().setPerfil('tecnico');
      useModoDemo.getState().arrancar(ctx);
    });
  }, [pedido, ctx]);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => protegido(ctx, () => useModoDemo.getState().tick(ctx, PASO_MS)), PASO_MS);
    return () => clearInterval(id);
  }, [activo, ctx]);
}
