import { create } from 'zustand';
import type { ContextoDemo } from './guionDemo';
import { PASOS } from './guionDemo';

interface EstadoDemo {
  activo: boolean;
  pausado: boolean;
  terminado: boolean;
  paso: number;
  msPaso: number;
  msTotal: number;
  /** Hora de planta en que empezó el paso (para condiciones como «terminó la purga»). */
  inicioPasoPlanta: number;
  telegram: boolean;
  ahorro: boolean;
  confirmarPurga: boolean;
  /** Se pide desde los botones; el motor (que tiene el contexto) lo ejecuta. */
  pedido: 'iniciar' | null;
  pedirInicio: () => void;
  arrancar: (ctx: ContextoDemo) => void;
  pausar: (ctx: ContextoDemo) => void;
  reanudar: (ctx: ContextoDemo) => void;
  salir: (ctx: ContextoDemo) => void;
  tick: (ctx: ContextoDemo, ms: number) => void;
  mostrar: (c: { telegram?: boolean; ahorro?: boolean; confirmarPurga?: boolean }) => void;
}

const INICIAL = {
  activo: false,
  pausado: false,
  terminado: false,
  paso: 0,
  msPaso: 0,
  msTotal: 0,
  inicioPasoPlanta: 0,
  telegram: false,
  ahorro: false,
  confirmarPurga: false,
};

export const useModoDemo = create<EstadoDemo>((set, get) => ({
  ...INICIAL,
  pedido: null,
  pedirInicio: () => set({ pedido: 'iniciar' }),

  arrancar: (ctx) => {
    // Siempre desde el mismo punto: planta reiniciada, perfil técnico, panel.
    ctx.abrirPurga(null);
    ctx.enviar({ tipo: 'reiniciar' });
    ctx.enviar({ tipo: 'pausa', pausado: false });
    set({ ...INICIAL, activo: true, pedido: null, inicioPasoPlanta: ctx.planta()?.t ?? 0 });
    PASOS[0].alEntrar?.(ctx);
  },

  pausar: (ctx) => {
    ctx.enviar({ tipo: 'pausa', pausado: true });
    set({ pausado: true });
  },

  reanudar: (ctx) => {
    ctx.enviar({ tipo: 'pausa', pausado: false });
    set({ pausado: false });
  },

  salir: (ctx) => {
    const { paso, terminado } = get();
    if (!terminado) PASOS[paso]?.alSalir?.(ctx);
    ctx.enviar({ tipo: 'pausa', pausado: false });
    ctx.enviar({ tipo: 'velocidad', velocidad: 1 });
    set({ ...INICIAL });
  },

  tick: (ctx, ms) => {
    const s = get();
    if (!s.activo || s.pausado || s.terminado) return;
    const paso = PASOS[s.paso];
    const msPaso = s.msPaso + ms;
    paso.cadaTick?.(ctx, msPaso);
    const planta = ctx.planta();
    const condicion = !paso.listo || (planta ? paso.listo(planta, s.inicioPasoPlanta) : false);
    const avanzar = (msPaso >= paso.duracionMs && condicion) || (paso.maxMs !== undefined && msPaso >= paso.maxMs);
    if (!avanzar) {
      set({ msPaso, msTotal: s.msTotal + ms });
      return;
    }
    paso.alSalir?.(ctx);
    const siguiente = s.paso + 1;
    if (siguiente >= PASOS.length) {
      set({ terminado: true, msPaso, msTotal: s.msTotal + ms });
      return;
    }
    set({ paso: siguiente, msPaso: 0, msTotal: s.msTotal + ms, inicioPasoPlanta: planta?.t ?? 0 });
    PASOS[siguiente].alEntrar?.(ctx);
  },

  mostrar: (c) =>
    set((s) => ({
      telegram: c.telegram ?? s.telegram,
      ahorro: c.ahorro ?? s.ahorro,
      confirmarPurga: c.confirmarPurga ?? s.confirmarPurga,
    })),
}));
