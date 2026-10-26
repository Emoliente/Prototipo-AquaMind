import { create } from 'zustand';
import type { NaveId, Perfil } from '@/types/dominio';
import { USUARIOS } from '@/config/usuarios';
import { puede, type Accion } from '@/app/permisos';

export type Tema = 'dark' | 'light';

/** Estado de la interfaz (no de la planta): perfil, tema y paneles abiertos. */
interface EstadoOperacion {
  perfil: Perfil;
  tema: Tema;
  mandoManualAbierto: boolean;
  /** Nave cuya purga se está preparando en el diálogo (null = cerrado). */
  purgaNave: NaveId | null;
  rechazoAbierto: boolean;
  /** Confirmación para activar el modo Automático. */
  automaticoAbierto: boolean;
  setPerfil: (p: Perfil) => void;
  setTema: (t: Tema) => void;
  alternarTema: () => void;
  setMandoManual: (abierto: boolean) => void;
  abrirPurga: (naveId: NaveId | null) => void;
  setRechazo: (abierto: boolean) => void;
  setAutomatico: (abierto: boolean) => void;
}

function leer<T extends string>(clave: string, validos: readonly T[], porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    if (v && (validos as readonly string[]).includes(v)) return v as T;
  } catch {
    /* almacenamiento no disponible */
  }
  return porDefecto;
}

function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin persistencia */
  }
}

function aplicarTema(t: Tema) {
  document.documentElement.dataset.theme = t;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', t === 'dark' ? '#070d18' : '#edf1f6');
  guardar('aquamind.tema', t);
}

const temaInicial = leer<Tema>('aquamind.tema', ['dark', 'light'], 'dark');
aplicarTema(temaInicial);

export const useOperacion = create<EstadoOperacion>((set, get) => ({
  perfil: leer<Perfil>('aquamind.perfil', ['tecnico', 'jefatura', 'gerencia'], 'tecnico'),
  tema: temaInicial,
  mandoManualAbierto: false,
  purgaNave: null,
  rechazoAbierto: false,
  automaticoAbierto: false,
  setPerfil: (perfil) => {
    guardar('aquamind.perfil', perfil);
    set({ perfil });
  },
  setTema: (tema) => {
    aplicarTema(tema);
    set({ tema });
  },
  alternarTema: () => get().setTema(get().tema === 'dark' ? 'light' : 'dark'),
  setMandoManual: (mandoManualAbierto) => set({ mandoManualAbierto }),
  abrirPurga: (purgaNave) => set({ purgaNave }),
  setRechazo: (rechazoAbierto) => set({ rechazoAbierto }),
  setAutomatico: (automaticoAbierto) => set({ automaticoAbierto }),
}));

/** Usuario activo según el perfil elegido. */
export const useUsuario = () => USUARIOS[useOperacion((s) => s.perfil)];
export const usePuede = (accion: Accion) => puede(useOperacion((s) => s.perfil), accion);
