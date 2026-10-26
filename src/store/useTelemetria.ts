import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Comando, EstadoPlanta, ResultadoComando } from '@/data/DataSource';
import { fuenteDatos } from '@/data/fuente';

export interface Aviso {
  id: number;
  ok: boolean;
  mensaje: string;
}

interface EstadoTelemetria {
  planta: EstadoPlanta | null;
  /** Hora real (ms) de la última actualización recibida. */
  recibido: number;
  conectado: boolean;
  avisos: Aviso[];
  conectar: () => () => void;
  /** `silencioso`: no muestra aviso (controles del simulador). */
  enviar: (c: Comando, opciones?: { silencioso?: boolean }) => Promise<ResultadoComando>;
  quitarAviso: (id: number) => void;
  /** Aviso breve en pantalla para cualquier resultado (exportar, notificar, errores). */
  avisar: (r: ResultadoComando) => void;
}

let idAviso = 0;

type Set = (parcial: (s: EstadoTelemetria) => Partial<EstadoTelemetria>) => void;

/** Muestra un aviso breve (como mucho 3 a la vez) que se va solo. */
function avisar(set: Set, get: () => EstadoTelemetria, r: ResultadoComando) {
  const aviso = { id: ++idAviso, ...r };
  set((s) => ({ avisos: [...s.avisos.slice(-2), aviso] }));
  setTimeout(() => get().quitarAviso(aviso.id), r.ok ? 4500 : 7000);
}

export const useTelemetria = create<EstadoTelemetria>((set, get) => ({
  planta: null,
  recibido: 0,
  conectado: false,
  avisos: [],
  conectar: () => {
    // Se conecta después del primer pintado: la pantalla muestra esqueletos mientras tanto.
    let desuscribir = () => {};
    const arranque = setTimeout(() => {
      try {
        desuscribir = fuenteDatos().suscribir(
          (planta) => set({ planta, recibido: Date.now(), conectado: true }),
          (mensaje) => avisar(set, get, { ok: false, mensaje }),
        );
      } catch (e) {
        // El vigilante marcará "sin conexión"; aquí solo se explica qué pasó.
        console.error('[telemetría] no se pudo conectar a la fuente de datos', e);
        avisar(set, get, { ok: false, mensaje: 'No se pudo conectar con los datos de planta. Recarga la página para reintentar.' });
      }
    }, 60);
    // Si pasan más de 5 s sin datos (y la simulación no está en pausa), se marca sin conexión.
    const vigilante = setInterval(() => {
      const { recibido, planta, conectado } = get();
      const sinDatos = !planta?.pausado && Date.now() - recibido > 5000;
      if (sinDatos === conectado) set({ conectado: !sinDatos });
    }, 1000);
    return () => {
      clearTimeout(arranque);
      desuscribir();
      clearInterval(vigilante);
    };
  },
  enviar: async (c, opciones) => {
    let r: ResultadoComando;
    try {
      r = await fuenteDatos().enviar(c);
    } catch (e) {
      // Una orden que no llega nunca debe quedar en silencio: se avisa y la pantalla sigue usable.
      console.error('[telemetría] falló el envío de la orden', c.tipo, e);
      r = { ok: false, mensaje: 'No se pudo enviar la orden. Revisa la conexión e inténtalo de nuevo.' };
    }
    if (opciones?.silencioso && r.ok) return r;
    avisar(set, get, r);
    return r;
  },
  quitarAviso: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
  avisar: (r) => avisar(set, get, r),
}));

/** Estado de planta completo: se vuelve a pintar con cada dato (1 por segundo). Solo para pantallas. */
export const usePlanta = () => useTelemetria((s) => s.planta);

/**
 * Solo los campos que el componente usa (comparación superficial): si no cambian,
 * el componente no se vuelve a pintar aunque llegue un dato nuevo.
 */
export function usePlantaCampos<T>(selector: (p: EstadoPlanta) => T): T | undefined {
  return useTelemetria(useShallow((s) => (s.planta ? selector(s.planta) : undefined)));
}

/** La planta solo mientras `activo` (p. ej. un diálogo abierto); cerrado no se suscribe a cada dato. */
export function usePlantaSi(activo: boolean): EstadoPlanta | null {
  return useTelemetria((s) => (activo ? s.planta : null));
}
