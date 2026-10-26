import { create } from 'zustand';
import type { Severidad } from '@/types/dominio';
import type { MensajeBot } from '@/notify/Notifier';

export interface MensajeChat {
  id: string;
  /** Hora de planta del mensaje. */
  t: number;
  destinatarioId: string;
  de: 'bot' | 'usuario';
  alertaId?: string;
  mensaje?: MensajeBot;
  /** Texto simple (respuestas del bot o del usuario). */
  texto?: string;
  estado: 'enviando' | 'entregado';
}

interface EstadoNotificaciones {
  mensajes: MensajeChat[];
  /** Qué severidades se envían por Telegram al técnico de turno. */
  preferencias: Record<Severidad, boolean>;
  /** Alertas nuevas que se muestran deslizándose en pantalla. */
  emergentes: string[];
  agregarMensaje: (m: MensajeChat) => void;
  marcarEntregado: (id: string) => void;
  setPreferencia: (s: Severidad, v: boolean) => void;
  agregarEmergente: (alertaId: string) => void;
  quitarEmergente: (alertaId: string) => void;
  limpiarEmergentes: () => void;
}

export const useNotificaciones = create<EstadoNotificaciones>((set) => ({
  mensajes: [],
  preferencias: { critica: true, advertencia: true, info: false },
  emergentes: [],
  agregarMensaje: (m) => set((s) => ({ mensajes: [...s.mensajes, m].slice(-60) })),
  marcarEntregado: (id) =>
    set((s) => ({ mensajes: s.mensajes.map((m) => (m.id === id ? { ...m, estado: 'entregado' } : m)) })),
  setPreferencia: (sev, v) => set((s) => ({ preferencias: { ...s.preferencias, [sev]: v } })),
  agregarEmergente: (id) => set((s) => ({ emergentes: [id, ...s.emergentes.filter((x) => x !== id)].slice(0, 3) })),
  quitarEmergente: (id) => set((s) => ({ emergentes: s.emergentes.filter((x) => x !== id) })),
  limpiarEmergentes: () => set({ emergentes: [] }),
}));
