/** Modelo de datos del Desarenador Miraflores. */

export type NaveId = 'N1' | 'N2' | 'N3';
export type BombaId = 'B1' | 'B2' | 'B3';

export type Perfil = 'tecnico' | 'jefatura' | 'gerencia';
export type ModoOperacion = 'manual' | 'asistido' | 'automatico';
export type Escenario = 'seca' | 'lluvias' | 'nino';

export type EstadoSensor = 'en_linea' | 'sin_datos' | 'fuera_rango' | 'necesita_limpieza';
/** Estado general que se muestra con ícono + texto. */
export type EstadoNivel = 'normal' | 'advertencia' | 'critica';
export type Severidad = 'info' | 'advertencia' | 'critica';

export interface Usuario {
  id: string;
  nombre: string;
  perfil: Perfil;
  telegram?: string;
}

export type EstadoCompuerta = 'cerrada' | 'abriendo' | 'abierta' | 'cerrando' | 'falla';

export interface Compuerta {
  naveId: NaveId;
  /** Apertura actual en cm (siempre múltiplo de 10). */
  aperturaCm: number;
  objetivoCm: number;
  aperturaMaxCm: number;
  estado: EstadoCompuerta;
}

export interface Nave {
  id: NaveId;
  nombre: string;
  anchoM: number;
  largoM: number;
  areaM2: number;
  nivelCm: number;
  nivelCriticoCm: number;
  /** Tasa de subida del lodo en cm/h (negativa si baja). */
  tasaCmH: number;
  horasACritico: number | null;
  compuerta: Compuerta;
  sensor: EstadoSensor;
  actualizado: number;
}

export type EstadoBomba = 'en_marcha' | 'apagada' | 'falla';

export interface Bomba {
  id: BombaId;
  modelo: string;
  hp: number;
  capacidadM3h: number;
  potenciaKw: number;
  kwhPorM3: number;
  estado: EstadoBomba;
  corrienteA: number;
  potenciaActualKw: number;
  minutosMarchaHoy: number;
}

export interface Lectura {
  t: number;
  caudalM3s: number;
  sstEntradaGL: number;
  sstSalidaGL: number;
  eficienciaPct: number;
  niveles: Record<NaveId, number>;
}

export type AccionRecomendada = 'esperar' | 'programar' | 'purgar_ya';

export interface Recomendacion {
  naveId: NaveId;
  urgencia: number;
  accion: AccionRecomendada;
  aperturaCm: number;
  duracionMin: number;
  reglaTexto: string;
  generada: number;
}

export type EstadoPurga = 'en_curso' | 'terminada' | 'abortada';

export interface Purga {
  id: string;
  naveId: NaveId;
  inicio: number;
  fin?: number;
  aperturaCm: number;
  duracionMin: number;
  nivelInicialCm: number;
  nivelFinalCm?: number;
  volumenM3?: number;
  aguaUsadaM3?: number;
  origen: ModoOperacion;
  usuarioId: string;
  estado: EstadoPurga;
}

export interface AsignacionBomba {
  bombaId: BombaId;
  minutos: number;
  kwh: number;
}

export interface PlanBombeo {
  volumenPendienteM3: number;
  asignaciones: AsignacionBomba[];
  inicioSugerido: number;
  evitaHoraPunta: boolean;
  kwhTotal: number;
  ahorroKwhVsBase: number;
}

export interface Alerta {
  id: string;
  t: number;
  severidad: Severidad;
  naveId?: NaveId;
  titulo: string;
  detalle?: string;
  accionSugerida: string;
  reconocida: boolean;
  reconocidaPor?: string;
  reconocidaT?: number;
}

export type TipoEvento =
  | 'purga'
  | 'bombeo'
  | 'rechazo'
  | 'lectura_mira'
  | 'nota'
  | 'comando'
  | 'emergencia'
  | 'calibracion';

export interface EventoBitacora {
  id: string;
  t: number;
  tipo: TipoEvento;
  naveId?: NaveId;
  usuarioId: string;
  aperturaCm?: number;
  duracionMin?: number;
  volumenM3?: number;
  aguaM3?: number;
  kwh?: number;
  motivo?: string;
  detalle: string;
}
