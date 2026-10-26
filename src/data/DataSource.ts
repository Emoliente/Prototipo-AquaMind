/**
 * Todo acceso a datos de planta pasa por esta interfaz.
 * Hoy la implementa el simulador; mañana un cliente WebSocket o MQTT sin tocar las pantallas.
 */
import type {
  Alerta,
  Bomba,
  BombaId,
  Escenario,
  EstadoSensor,
  EventoBitacora,
  ModoOperacion,
  Nave,
  NaveId,
  PlanBombeo,
  Purga,
} from '@/types/dominio';
import type { ConfigPlanta } from '@/config/planta';
import type { ResultadoControl } from '@/logic/controladorDifuso';

export interface PuntoSerie {
  t: number;
  caudalM3s: number;
  sstEntradaGL: number;
  sstSalidaGL: number;
  eficienciaPct: number;
  niveles: Record<NaveId, number>;
  quebradaM3: number;
  energiaKwh: number;
}

export interface NaveEstado extends Nave {
  /** Lecturas de las 7 miras (cm), de la entrada a la salida. */
  miras: number[];
}

export interface BombaEstado extends Bomba {
  /** Minutos que le quedan según el plan de bombeo (null = sin plan, operación manual). */
  minutosRestantes: number | null;
  /** Horómetro: horas de marcha acumuladas (para mantenimiento). */
  horometroH: number;
}

export interface SensorInfo {
  id: string;
  nombre: string;
  naveId?: NaveId;
  estado: EstadoSensor;
  actualizado: number;
  /** Lo que marca ahora (con su error de calibración, como un sensor real). */
  valor: number;
  unidad: 'm³/s' | 'g/L' | 'cm' | 'm³';
  decimales: number;
  /** Rango de medida del equipo. */
  rango: [number, number];
  /** Última calibración aprobada (null = nunca). */
  ultimaCalibracion: number | null;
}

/** De dónde sale el valor de referencia con que se compara un sensor. */
export type TipoMuestra = 'laboratorio' | 'miras' | 'batimetria';

/**
 * `conforme`: el sensor está dentro de la tolerancia. `pendiente`: la diferencia pide
 * calibrar y espera a jefatura. `aprobada`: se calibró. `descartada`: no se usó.
 */
export type EstadoMuestra = 'conforme' | 'pendiente' | 'aprobada' | 'descartada';

export interface MuestraCalibracion {
  id: string;
  /** Cuándo se cargó el resultado. */
  t: number;
  /** Cuándo se tomó la muestra o se hizo la lectura. */
  tMuestra: number;
  tipo: TipoMuestra;
  sensorId: string;
  /** Laboratorio, promedio de miras o batimetría. */
  valorReferencia: number;
  /** Lo que marcaba el sensor en ese momento. */
  valorSensor: number;
  unidad: 'g/L' | 'cm';
  usuarioId: string;
  estado: EstadoMuestra;
  revisadoPor?: string;
  revisadoT?: number;
  nota?: string;
}

export interface PurgaEnCurso extends Purga {
  aperturaObjetivoCm: number;
  minutosPurgando: number;
  fase: 'abriendo' | 'purgando' | 'cerrando';
  /** Purga manual abierta sin duración fija. */
  manual: boolean;
  /** Apertura máxima alcanzada (para la bitácora). */
  aperturaUsadaCm: number;
  volumenParcialM3: number;
  aguaParcialM3: number;
  /** Nivel de lodo minuto a minuto desde que empezó (seguimiento en vivo). */
  muestras: { t: number; nivelCm: number }[];
}

export interface PurgaProgramada {
  id: string;
  naveId: NaveId;
  aperturaCm: number;
  duracionMin: number;
  inicio: number;
  origen: ModoOperacion;
  usuarioId: string;
  creada: number;
}

export interface BombeoEnCurso {
  inicio: number;
  volumenM3: number;
  kwh: number;
  plan: PlanBombeo;
}

export interface RegistroAuditoria {
  id: string;
  t: number;
  usuarioId: string;
  comando: string;
  detalle: string;
  motivo?: string;
  resultado: 'aceptado' | 'rechazado';
}

export interface EstadoPlanta {
  t: number;
  escenario: Escenario;
  velocidad: number;
  pausado: boolean;
  modo: ModoOperacion;
  emergencia: boolean;
  horaPunta: boolean;

  caudalM3s: number;
  sstEntradaGL: number;
  sstSalidaGL: number;
  eficienciaPct: number;

  naves: NaveEstado[];
  bombas: BombaEstado[];
  /** Lodo en la quebrada pendiente de evacuar (m³). */
  quebradaM3: number;
  quebradaCapacidadM3: number;

  energiaHoyKwh: number;
  energiaMesKwh: number;
  /** Energía de bombeo de los días anteriores (sin hoy), del más antiguo al más reciente. */
  energiaDiaria: { dia: number; kwh: number }[];
  /** Plan de bombeo programado para arrancar solo (null = ninguno). */
  planProgramado: { inicio: number; usuarioId: string } | null;
  purgasHoy: number;

  purgas: PurgaEnCurso[];
  programadas: PurgaProgramada[];
  /** Resultado de la última purga terminada (volumen, agua). */
  ultimaPurga: PurgaEnCurso | null;
  bombeo: BombeoEnCurso | null;
  /** Plan sugerido para el lodo pendiente (o el que se está ejecutando). */
  plan: PlanBombeo;

  recomendaciones: ResultadoControl[];
  principal: ResultadoControl;

  alertas: Alerta[];
  bitacora: EventoBitacora[];
  auditoria: RegistroAuditoria[];
  sensores: SensorInfo[];
  /** Resultados de laboratorio, miras y batimetrías comparados con los sensores (más reciente primero). */
  muestras: MuestraCalibracion[];

  /** Últimas 24 h, un punto cada 10 min. */
  serie24h: PuntoSerie[];
  /** Últimos 7 días, un punto por hora. */
  serie7d: PuntoSerie[];

  config: ConfigPlanta;
}

type ConUsuario = { usuarioId: string; motivo?: string };

export type Comando =
  | ({ tipo: 'iniciar_purga'; naveId: NaveId; aperturaCm: number; duracionMin: number; origen: ModoOperacion } & ConUsuario)
  | ({ tipo: 'programar_purga'; naveId: NaveId; aperturaCm: number; duracionMin: number; inicio: number } & ConUsuario)
  | ({ tipo: 'cancelar_programada'; programadaId: string } & ConUsuario)
  | ({ tipo: 'abortar_purga'; naveId: NaveId } & ConUsuario)
  | ({ tipo: 'mover_compuerta'; naveId: NaveId; aperturaCm: number } & ConUsuario)
  | ({ tipo: 'bomba'; bombaId: BombaId; encender: boolean } & ConUsuario)
  | ({ tipo: 'ejecutar_plan' } & ConUsuario)
  | ({ tipo: 'programar_plan'; inicio: number } & ConUsuario)
  | ({ tipo: 'cancelar_plan_programado' } & ConUsuario)
  | ({ tipo: 'detener_bombeo' } & ConUsuario)
  | ({ tipo: 'parada_emergencia' } & ConUsuario)
  | ({ tipo: 'rearmar' } & ConUsuario)
  | ({ tipo: 'modo'; modo: ModoOperacion } & ConUsuario)
  | ({ tipo: 'rechazar_recomendacion'; naveId: NaveId; urgencia: number } & ConUsuario)
  | ({ tipo: 'reconocer_alerta'; alertaId: string } & ConUsuario)
  | ({ tipo: 'reconocer_todas' } & ConUsuario)
  | ({ tipo: 'registrar'; evento: Omit<EventoBitacora, 'id' | 't' | 'usuarioId'> } & ConUsuario)
  | ({ tipo: 'config'; config: Partial<ConfigPlanta> } & ConUsuario)
  | ({
      tipo: 'registrar_muestra';
      tipoMuestra: TipoMuestra;
      sensorId: string;
      valorReferencia: number;
      tMuestra: number;
      nota?: string;
      /** Texto para la bitácora (p. ej. las 7 lecturas de miras). */
      detalle?: string;
    } & ConUsuario)
  | ({ tipo: 'revisar_muestra'; muestraId: string; aprobar: boolean } & ConUsuario)
  | { tipo: 'escenario'; escenario: Escenario }
  | { tipo: 'velocidad'; velocidad: number }
  | { tipo: 'pausa'; pausado: boolean }
  | { tipo: 'forzar_nivel'; naveId: NaveId; nivelCm: number; tasaCmH?: number }
  | { tipo: 'reiniciar' };

export interface ResultadoComando {
  ok: boolean;
  mensaje: string;
}

export interface DataSource {
  /**
   * Se suscribe al estado de planta; devuelve la función para desuscribirse.
   * `alFallar` recibe un mensaje legible si la fuente tiene un problema (sin cortar la suscripción).
   */
  suscribir(alRecibir: (estado: EstadoPlanta) => void, alFallar?: (mensaje: string) => void): () => void;
  enviar(comando: Comando): Promise<ResultadoComando>;
}
