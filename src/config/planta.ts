import type { Bomba, NaveId } from '@/types/dominio';

/** Datos fijos del Desarenador Miraflores. */
export const NAVES: { id: NaveId; nombre: string; anchoM: number; largoM: number; areaM2: number; peso: number }[] = [
  // `peso`: parte de la carga de sedimento que recibe cada nave frente al promedio, según el
  // lodo purgado de cada una en marzo de 2026 (registro R3; scripts/calibrar_gemelo.py).
  { id: 'N1', nombre: 'Nave 1', anchoM: 6.5, largoM: 40, areaM2: 260, peso: 1.02 },
  { id: 'N2', nombre: 'Nave 2', anchoM: 6.5, largoM: 40, areaM2: 260, peso: 0.92 },
  { id: 'N3', nombre: 'Nave 3', anchoM: 6.5, largoM: 40, areaM2: 260, peso: 1.07 },
];

/** Miras (reglas de medición) por nave. */
export const MIRAS_POR_NAVE = 7;
/** El sedimento grueso se deposita más cerca de la entrada. */
export const PERFIL_MIRAS = [1.12, 1.08, 1.04, 1.0, 0.96, 0.92, 0.88];

export const BOMBAS_SPEC: Pick<Bomba, 'id' | 'modelo' | 'hp' | 'capacidadM3h' | 'potenciaKw' | 'kwhPorM3'>[] = [
  { id: 'B1', modelo: 'Toyo DPF-75B', hp: 75, capacidadM3h: 416, potenciaKw: 75, kwhPorM3: 0.18 },
  { id: 'B2', modelo: 'Goodwin 100ANZE', hp: 40, capacidadM3h: 220, potenciaKw: 30, kwhPorM3: 0.14 },
  { id: 'B3', modelo: 'Toyo DPF-30', hp: 30, capacidadM3h: 125, potenciaKw: 30, kwhPorM3: 0.24 },
];

export interface ConfigPlanta {
  nivelCriticoCm: Record<NaveId, number>;
  horaPuntaInicio: number;
  horaPuntaFin: number;
  tarifaSolesKwh: number;
  /** Bombeo de referencia: 135 kW × 8 h. */
  lineaBaseKwhDia: number;
  automatico: {
    purgasMaxDia: number;
    aperturaMaxCm: number;
    horaDesde: number;
    horaHasta: number;
  };
}

export const CONFIG_INICIAL: ConfigPlanta = {
  nivelCriticoCm: { N1: 250, N2: 250, N3: 250 },
  horaPuntaInicio: 18,
  horaPuntaFin: 23,
  tarifaSolesKwh: 0.45,
  lineaBaseKwhDia: 1080,
  automatico: { purgasMaxDia: 4, aperturaMaxCm: 40, horaDesde: 0, horaHasta: 24 },
};

export const APERTURA_MAX_CM = 100;
export const PASO_COMPUERTA_CM = 10;
