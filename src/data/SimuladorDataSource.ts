/**
 * Simulador de planta: 1 s real = 1 min simulado (×velocidad).
 * Hace de "servidor": mide, recomienda, ejecuta comandos, genera alertas y bitácora.
 */
import type {
  Alerta,
  BombaId,
  Escenario,
  EstadoSensor,
  EventoBitacora,
  ModoOperacion,
  NaveId,
  PlanBombeo,
  Severidad,
} from '@/types/dominio';
import {
  APERTURA_MAX_CM,
  BOMBAS_SPEC,
  CONFIG_INICIAL,
  NAVES,
  PASO_COMPUERTA_CM,
  PERFIL_MIRAS,
  type ConfigPlanta,
} from '@/config/planta';
import { nombreUsuario, perfilDeUsuario, USUARIO_SISTEMA, USUARIOS } from '@/config/usuarios';
import {
  aguaPorMinutoM3,
  bajadaPorPurgaCmMin,
  duracionPurgaMin,
  ESCENARIOS,
  finosAlEmbalseM3h,
  horasACritico,
  tasaSubidaBase,
  volumenPurgadoM3,
} from '@/logic/gemeloDigital';
import { evaluar, type ResultadoControl } from '@/logic/controladorDifuso';
import { generarHistoria } from './historico';
import { calcularPlan } from '@/logic/planBombeo';
import { esHoraPunta, horaDecimal } from '@/logic/horario';
import { formatoDuracion, formatoNumero } from '@/lib/format';
import { compartir } from '@/lib/compartir';
import { ANTIGUEDAD_MAXIMA_MS, comparar, TOLERANCIA, valorEnSerie } from '@/logic/calibracion';
import { describirCambios, MOTIVO_MINIMO, validarConfig } from '@/logic/configuracion';
import type {
  BombaEstado,
  BombeoEnCurso,
  Comando,
  DataSource,
  EstadoPlanta,
  NaveEstado,
  PuntoSerie,
  MuestraCalibracion,
  PurgaEnCurso,
  PurgaProgramada,
  RegistroAuditoria,
  ResultadoComando,
  SensorInfo,
} from './DataSource';

const MIN = 60_000;
const DIA_MS = 24 * 60 * MIN;
/** Lodo fino que admite la zona de las bombas del embalse antes de estorbar la succión (supuesto). */
const CAPACIDAD_EMBALSE_M3 = 3000;
/** Desde cuánto lodo fino conviene bombear: por debajo, el arranque no compensa. */
const UMBRAL_BOMBEO_M3 = 150;


/** Generador pseudoaleatorio con semilla (mulberry32): mismas condiciones en cada arranque. */
function crearRng(semilla: number) {
  let a = semilla >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const u = Math.max(1e-9, rng());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  return { rng, normal };
}

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const nombreNave = (id: NaveId) => `Nave ${id.slice(1)}`;
const nombreBomba = (id: BombaId) => `Bomba ${id.slice(1)}`;

interface NaveInterna {
  id: NaveId;
  nombre: string;
  area: number;
  peso: number;
  nivel: number;
  tasaEma: number;
  compuertaCm: number;
  offsetsMiras: number[];
  alertaNivel: 0 | 1 | 2;
}

interface SensorInterno extends SensorInfo {
  hasta: number | null;
  valorCongelado: number | null;
  /** Error de calibración: el sensor marca valor real × ganancia (+ sesgo en cm para niveles). */
  ganancia: number;
  sesgo: number;
}

interface Interno {
  t: number;
  escenario: Escenario;
  velocidad: number;
  pausado: boolean;
  modo: ModoOperacion;
  emergencia: boolean;
  config: ConfigPlanta;

  caudalBase: number;
  caudalOU: number;
  caudal: number;
  sstBase: number;
  sstOU: number;
  sst: number;
  tormenta: { hasta: number; pico: number } | null;
  eficiencia: number;
  sstSalida: number;

  naves: NaveInterna[];
  bombas: BombaEstado[];
  /** Lodo fino asentado en el embalse, por bombear (m³). La purga no llega aquí: va a la quebrada. */
  embalse: number;
  /** Finos que llegan al embalse con el agua limpia (m³/h). */
  finosEmbalse: number;
  energiaHoy: number;
  energiaMes: number;
  energiaDiaria: { dia: number; kwh: number }[];
  planProgramado: { inicio: number; usuarioId: string } | null;
  purgasHoy: number;
  purgas: PurgaEnCurso[];
  programadas: PurgaProgramada[];
  bombeo: BombeoEnCurso | null;
  plan: PlanBombeo;
  recomendaciones: ResultadoControl[];
  principal: ResultadoControl;

  alertas: Alerta[];
  bitacora: EventoBitacora[];
  auditoria: RegistroAuditoria[];
  sensores: SensorInterno[];
  muestras: MuestraCalibracion[];
  serie24h: PuntoSerie[];
  serie7d: PuntoSerie[];
  /** Si es false (pre-simulación) no se generan efectos visibles innecesarios. */
  enVivo: boolean;
}

export class SimuladorDataSource implements DataSource {
  private s!: Interno;
  private oyentes = new Set<(e: EstadoPlanta) => void>();
  private oyentesFalla = new Set<(mensaje: string) => void>();
  /** Última instantánea emitida: la siguiente reutiliza lo que no cambió. */
  private ultima: EstadoPlanta | null = null;
  private ultimaFalla = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private acumulado = 0;
  private seq = 0;
  private r = crearRng(7);

  constructor(private readonly semilla = 7) {
    this.reiniciar();
  }

  // ───────────────────────── interfaz pública ─────────────────────────

  suscribir(alRecibir: (estado: EstadoPlanta) => void, alFallar?: (mensaje: string) => void) {
    this.oyentes.add(alRecibir);
    if (alFallar) this.oyentesFalla.add(alFallar);
    alRecibir(this.estable());
    if (!this.timer) {
      this.timer = setInterval(() => this.latido(), 250);
    }
    return () => {
      this.oyentes.delete(alRecibir);
      if (alFallar) this.oyentesFalla.delete(alFallar);
      if (this.oyentes.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  enviar(comando: Comando): Promise<ResultadoComando> {
    let r: ResultadoComando;
    try {
      r = this.ejecutar(comando);
    } catch (e) {
      console.error('[simulador] falló el comando', comando.tipo, e);
      r = { ok: false, mensaje: 'No se pudo completar la orden por un error interno. No se cambió nada; inténtalo de nuevo.' };
    }
    this.emitir();
    return Promise.resolve(r);
  }

  // ───────────────────────── ciclo ─────────────────────────

  private latido() {
    if (this.s.pausado) return;
    this.acumulado += this.s.velocidad * 0.25;
    let pasos = 0;
    try {
      while (this.acumulado >= 1 && pasos < 600) {
        this.paso();
        this.acumulado -= 1;
        pasos++;
      }
    } catch (e) {
      // Un minuto simulado que falla no detiene la planta: se salta y se avisa (como mucho cada 10 s).
      this.acumulado = 0;
      console.error('[simulador] falló un paso de la simulación', e);
      this.avisarFalla('La simulación tuvo un error y se saltó un momento. Los datos siguen llegando.');
    }
    if (pasos > 0) this.emitir();
  }

  private avisarFalla(mensaje: string) {
    const ahora = Date.now();
    if (ahora - this.ultimaFalla < 10_000) return;
    this.ultimaFalla = ahora;
    this.oyentesFalla.forEach((f) => f(mensaje));
  }

  private estable() {
    this.ultima = this.ultima ? compartir(this.ultima, this.instantanea()) : this.instantanea();
    return this.ultima;
  }

  private emitir() {
    let e: EstadoPlanta;
    try {
      e = this.estable();
    } catch (err) {
      console.error('[simulador] no se pudo armar el estado de planta', err);
      this.avisarFalla('No se pudo actualizar el estado de planta. Se reintenta en el siguiente dato.');
      return;
    }
    // Un oyente que falla no debe dejar sin datos a los demás.
    this.oyentes.forEach((f) => {
      try {
        f(e);
      } catch (err) {
        console.error('[simulador] un oyente falló al recibir datos', err);
      }
    });
  }

  private id(prefijo: string) {
    return `${prefijo}-${++this.seq}`;
  }

  private reiniciar() {
    this.r = crearRng(this.semilla);
    // `seq` no se reinicia: los id deben seguir siendo únicos tras un reinicio (las notificaciones los recuerdan).
    this.acumulado = 0;
    const ahora = Math.floor(Date.now() / MIN) * MIN;
    const t0 = ahora - 7 * 24 * 60 * MIN;

    // Época seca: el lodo sube ~0.07 cm/h, así que en la semana previa casi no cambia; la N2 ya está alta.
    const nivelesIniciales: Record<NaveId, number> = { N1: 168, N2: 183, N3: 160 };
    this.s = {
      t: t0,
      escenario: 'seca',
      velocidad: 1,
      pausado: false,
      modo: 'asistido',
      emergencia: false,
      config: structuredClone(CONFIG_INICIAL),
      caudalBase: ESCENARIOS.seca.caudalBase,
      caudalOU: 0,
      caudal: ESCENARIOS.seca.caudalBase,
      sstBase: ESCENARIOS.seca.sstBase,
      sstOU: 0,
      sst: ESCENARIOS.seca.sstBase,
      tormenta: null,
      eficiencia: 20,
      sstSalida: 0.054,
      naves: NAVES.map((n) => ({
        id: n.id,
        nombre: n.nombre,
        area: n.areaM2,
        peso: n.peso,
        nivel: nivelesIniciales[n.id],
        tasaEma: 0.07,
        compuertaCm: 0,
        offsetsMiras: PERFIL_MIRAS.map(() => this.r.normal() * 2.5),
        alertaNivel: 0,
      })),
      bombas: BOMBAS_SPEC.map((b) => ({
        ...b,
        estado: 'apagada',
        corrienteA: 0,
        potenciaActualKw: 0,
        minutosMarchaHoy: 0,
        minutosRestantes: null,
        horometroH: { B1: 11_842, B2: 6_315, B3: 9_207 }[b.id],
      })),
      // En seca llegan ~33 m³ de finos al día: el primer bombeo de la semana cae la segunda noche.
      embalse: 100,
      finosEmbalse: finosAlEmbalseM3h(0.054, ESCENARIOS.seca.caudalBase),
      energiaHoy: 0,
      energiaMes: 0,
      energiaDiaria: [],
      planProgramado: null,
      purgasHoy: 0,
      purgas: [],
      programadas: [],
      bombeo: null,
      plan: { volumenPendienteM3: 0, asignaciones: [], inicioSugerido: t0, evitaHoraPunta: false, kwhTotal: 0, ahorroKwhVsBase: 1080 },
      recomendaciones: [],
      principal: undefined as unknown as ResultadoControl,
      alertas: [],
      bitacora: [],
      auditoria: [],
      // Cada sensor arrastra un error de calibración: la entrada de sólidos marca ~14 % de más
      // y el nivel de la Nave 2, 9 cm de más (lo muestran el laboratorio y las miras).
      sensores: (
        [
          { id: 'caudal', nombre: 'Caudalímetro de entrada', unidad: 'm³/s', decimales: 1, rango: [0, 15], ganancia: 1.02, sesgo: 0, dias: 64 },
          { id: 'sst_in', nombre: 'Sólidos en suspensión · entrada', unidad: 'g/L', decimales: 2, rango: [0, 10], ganancia: 1.14, sesgo: 0, dias: 30 },
          { id: 'sst_out', nombre: 'Sólidos en suspensión · salida', unidad: 'g/L', decimales: 3, rango: [0, 10], ganancia: 0.96, sesgo: 0, dias: 30 },
          { id: 'nivel_N1', nombre: 'Nivel de lodo · Nave 1', naveId: 'N1', unidad: 'cm', decimales: 0, rango: [0, 400], ganancia: 1, sesgo: 2, dias: 21 },
          { id: 'nivel_N2', nombre: 'Nivel de lodo · Nave 2', naveId: 'N2', unidad: 'cm', decimales: 0, rango: [0, 400], ganancia: 1, sesgo: 9, dias: 21 },
          { id: 'nivel_N3', nombre: 'Nivel de lodo · Nave 3', naveId: 'N3', unidad: 'cm', decimales: 0, rango: [0, 400], ganancia: 1, sesgo: -3, dias: 21 },
          { id: 'embalse', nombre: 'Lodo en el embalse', unidad: 'm³', decimales: 0, rango: [0, CAPACIDAD_EMBALSE_M3], ganancia: 1, sesgo: 0, dias: 90 },
        ] as const
      ).map(({ dias, ...x }) => ({
        ...x,
        rango: [...x.rango] as [number, number],
        naveId: 'naveId' in x ? (x.naveId as NaveId) : undefined,
        estado: 'en_linea' as EstadoSensor,
        actualizado: t0,
        valor: 0,
        ultimaCalibracion: ahora - dias * DIA_MS,
        hasta: null,
        valorCongelado: null,
      })),
      muestras: [],
      serie24h: [],
      serie7d: [],
      enVivo: false,
    };

    // Historia de los 30 días previos: eventos de bitácora y energía por día.
    const DIA = 24 * 60 * MIN;
    const historia = generarHistoria(t0 - 30 * DIA, t0 - 12 * 60 * MIN, crearRng(this.semilla + 1).rng);
    for (const e of historia.eventos) this.s.bitacora.unshift({ ...e, id: this.id('ev') });
    const hoy0 = new Date(t0);
    hoy0.setHours(0, 0, 0, 0);
    for (let dia = hoy0.getTime() - 30 * DIA; dia < hoy0.getTime(); dia += DIA) {
      this.s.energiaDiaria.push({ dia, kwh: historia.energiaPorDia.get(dia) ?? 0 });
    }
    this.s.energiaHoy = historia.energiaPorDia.get(hoy0.getTime()) ?? 0;
    this.s.energiaMes =
      this.s.energiaHoy +
      this.s.energiaDiaria.filter((d) => new Date(d.dia).getMonth() === hoy0.getMonth()).reduce((a, d) => a + d.kwh, 0);

    // Última semana simulada (operación de siempre: purgas de noche, como en el registro de limpieza,
    // y el bombeo del embalse a las 23:15, fuera de la hora punta, cuando ya juntó lodo fino).
    const anoche = new Date(ahora - 24 * 60 * MIN);
    anoche.setHours(21, 0, 0, 0);
    const hace5d = new Date(ahora - 5 * 24 * 60 * MIN);
    hace5d.setHours(21, 30, 0, 0);
    const historicas = [
      { t: hace5d.getTime(), nave: 'N3' as NaveId, objetivo: 70 },
      { t: anoche.getTime(), nave: 'N1' as NaveId, objetivo: 60 },
    ];
    const tecnico = USUARIOS.tecnico.id;

    this.control();
    while (this.s.t < ahora) {
      for (const h of historicas) {
        if (this.s.t === Math.floor(h.t / MIN) * MIN) {
          const n = this.nave(h.nave);
          const dur = duracionPurgaMin(n.nivel, h.objetivo, 20);
          this.ejecutar({ tipo: 'iniciar_purga', naveId: h.nave, aperturaCm: 20, duracionMin: dur, origen: 'manual', usuarioId: tecnico });
        }
      }
      const d = new Date(this.s.t);
      if (d.getHours() === 23 && d.getMinutes() === 15 && !this.s.bombeo && this.s.embalse >= UMBRAL_BOMBEO_M3) {
        this.ejecutar({ tipo: 'ejecutar_plan', usuarioId: tecnico });
      }
      this.paso();
    }
    this.control(true);
    this.historiaMuestras(ahora);
    this.historiaAuditoria(t0, ahora);
    this.s.enVivo = true;
  }

  // ───────────────────────── un minuto simulado ─────────────────────────

  private paso() {
    const s = this.s;
    s.t += MIN;
    const d = new Date(s.t);
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      const ayer = new Date(s.t - MIN);
      ayer.setHours(0, 0, 0, 0);
      s.energiaDiaria.push({ dia: ayer.getTime(), kwh: s.energiaHoy });
      if (s.energiaDiaria.length > 31) s.energiaDiaria.shift();
      s.energiaHoy = 0;
      s.purgasHoy = 0;
      s.bombas.forEach((b) => (b.minutosMarchaHoy = 0));
      if (d.getDate() === 1) s.energiaMes = 0;
    }
    if (d.getHours() === s.config.horaPuntaInicio && d.getMinutes() === 0 && s.bombas.some((b) => b.estado === 'en_marcha')) {
      this.alerta('advertencia', 'Empezó la hora punta con bombas encendidas', 'Si el embalse lo permite, pausar el bombeo hasta las 23:00.', undefined, `Tarifa más cara de ${s.config.horaPuntaInicio}:00 a ${s.config.horaPuntaFin}:00.`);
    }
    this.pasoProgramadas();
    if (s.planProgramado && s.t >= s.planProgramado.inicio && !s.bombeo) {
      const { usuarioId } = s.planProgramado;
      s.planProgramado = null;
      const r = this.ejecutar({ tipo: 'ejecutar_plan', usuarioId, motivo: 'Plan programado' });
      if (!r.ok) this.alerta('advertencia', 'No arrancó el plan de bombeo programado', r.mensaje);
    }
    this.entradas();
    this.pasoNaves();
    this.pasoBombas();
    this.pasoSensores();
    this.control();
    this.alertasNivel();

    if (d.getMinutes() % 10 === 0) {
      s.serie24h.push(this.punto());
      if (s.serie24h.length > 144) s.serie24h.shift();
    }
    if (d.getMinutes() === 0) {
      s.serie7d.push(this.punto());
      if (s.serie7d.length > 168) s.serie7d.shift();
    }
  }

  private pasoProgramadas() {
    const s = this.s;
    const vencidas = s.programadas.filter((x) => x.inicio <= s.t);
    if (!vencidas.length) return;
    s.programadas = s.programadas.filter((x) => x.inicio > s.t);
    for (const x of vencidas) {
      const r = this.ejecutar({
        tipo: 'iniciar_purga',
        naveId: x.naveId,
        aperturaCm: x.aperturaCm,
        duracionMin: x.duracionMin,
        origen: x.origen,
        usuarioId: x.usuarioId,
        motivo: 'Purga programada',
      });
      if (!r.ok) this.alerta('advertencia', `No se pudo iniciar la purga programada de la ${nombreNave(x.naveId)}`, r.mensaje, x.naveId);
    }
  }

  private entradas() {
    const s = this.s;
    const esc = ESCENARIOS[s.escenario];
    const { normal, rng } = this.r;
    const hora = horaDecimal(s.t);

    s.caudalBase += (esc.caudalBase - s.caudalBase) * 0.03;
    s.caudalOU += -s.caudalOU * 0.02 + normal() * 0.05;
    s.caudal = limitar(s.caudalBase + esc.caudalAmp * Math.sin((2 * Math.PI * (hora - 9)) / 24) + s.caudalOU, 4, 13.5);

    if (!s.tormenta && esc.pulsos > 0 && rng() < esc.pulsos / 240) {
      s.tormenta = { hasta: s.t + (60 + rng() * 150) * MIN, pico: esc.sstBase * (1.4 + rng() * 1.2) };
    }
    if (s.tormenta && s.t > s.tormenta.hasta) s.tormenta = null;
    const objetivo = s.tormenta ? s.tormenta.pico : esc.sstBase;
    s.sstBase += (objetivo - s.sstBase) * 0.04;
    s.sstOU += -s.sstOU * 0.05 + normal() * 0.025;
    s.sst = limitar(s.sstBase * (1 + s.sstOU), esc.sstMin, esc.sstMax);

    // Retiene ~20 % de los sólidos: sobre todo arena; los finos (limo, arcilla) pasan. Sale del registro
    // de purgas (~0.15 m³ de lodo por t que entra, con ~1.4 t/m³ de lodo asentado, supuesto).
    s.eficiencia = limitar(21 - (s.caudal - 10) * 1.2 + normal() * 0.6, 12, 30);
    s.sstSalida = s.sst * (1 - s.eficiencia / 100);

    // Los finos que pasan se van con el agua limpia al embalse y se asientan ahí.
    s.finosEmbalse = finosAlEmbalseM3h(s.sstSalida, s.caudal);
    s.embalse = Math.min(CAPACIDAD_EMBALSE_M3, s.embalse + s.finosEmbalse / 60);
  }

  private pasoNaves() {
    const s = this.s;
    for (const n of s.naves) {
      let delta = (tasaSubidaBase(s.sst, s.caudal) * n.peso * (1 + this.r.normal() * 0.05)) / 60;
      const p = s.purgas.find((x) => x.naveId === n.id);
      if (p) {
        // la compuerta se mueve 10 cm por minuto hacia el objetivo
        if (n.compuertaCm < p.aperturaObjetivoCm) n.compuertaCm = Math.min(p.aperturaObjetivoCm, n.compuertaCm + PASO_COMPUERTA_CM);
        else if (n.compuertaCm > p.aperturaObjetivoCm) n.compuertaCm = Math.max(p.aperturaObjetivoCm, n.compuertaCm - PASO_COMPUERTA_CM);
        p.aperturaCm = n.compuertaCm;
        p.aperturaUsadaCm = Math.max(p.aperturaUsadaCm, n.compuertaCm);

        if (p.fase === 'abriendo' && n.compuertaCm === p.aperturaObjetivoCm) p.fase = 'purgando';
        if (p.fase === 'purgando') {
          p.minutosPurgando++;
          if ((!p.manual && p.minutosPurgando >= p.duracionMin) || n.nivel <= 12) {
            p.fase = 'cerrando';
            p.aperturaObjetivoCm = 0;
          }
        }
        const bajada = Math.min(bajadaPorPurgaCmMin(n.compuertaCm, n.nivel), Math.max(0, n.nivel - 5));
        delta -= bajada;
        // Lo purgado (lodo y agua) baja a la quebrada: no llega al embalse ni a las bombas.
        p.volumenParcialM3 += volumenPurgadoM3(bajada, n.area);
        p.aguaParcialM3 += aguaPorMinutoM3(n.compuertaCm);
      }
      n.nivel = Math.max(5, n.nivel + delta);
      if (p) {
        p.muestras.push({ t: s.t, nivelCm: n.nivel });
        if (p.muestras.length > 360) p.muestras.shift();
        if (p.fase === 'cerrando' && n.compuertaCm === 0) this.terminarPurga(p, n);
      }
      n.tasaEma = n.tasaEma * 0.92 + delta * 60 * 0.08;
    }
  }

  private terminarPurga(p: PurgaEnCurso, n: NaveInterna) {
    const s = this.s;
    s.purgas = s.purgas.filter((x) => x !== p);
    const volumen = volumenPurgadoM3(p.nivelInicialCm - n.nivel, n.area);
    const duracion = Math.round((s.t - p.inicio) / MIN);
    const agua = p.aguaParcialM3;
    // La tasa medida durante la purga no sirve después: se vuelve a la de entrada de sedimento.
    n.tasaEma = tasaSubidaBase(s.sst, s.caudal) * n.peso;
    this.evento({
      tipo: 'purga',
      naveId: n.id,
      usuarioId: p.usuarioId,
      aperturaCm: p.aperturaUsadaCm,
      duracionMin: duracion,
      volumenM3: volumen,
      aguaM3: agua,
      detalle: `Purga ${p.origen === 'automatico' ? 'automática' : p.origen === 'manual' ? 'manual' : 'asistida'} de ${n.nombre}: el lodo bajó de ${formatoNumero(p.nivelInicialCm)} a ${formatoNumero(n.nivel)} cm.`,
    });
    // Guarda el resultado para que la pantalla muestre el volumen al terminar.
    this.ultimaPurga = { ...p, fin: s.t, nivelFinalCm: n.nivel, volumenM3: volumen, aguaUsadaM3: agua, estado: 'terminada', duracionMin: duracion };
    this.alerta(
      'info',
      `Purga de la ${n.nombre} terminada: ${formatoNumero(volumen)} m³ de lodo`,
      'Ninguna: el lodo purgado se fue a la quebrada.',
      n.id,
      `Usó ${formatoNumero(agua)} m³ de agua en ${formatoDuracion(duracion)}.`,
    );
  }

  private ultimaPurga: PurgaEnCurso | null = null;

  private pasoBombas() {
    const s = this.s;
    for (const b of s.bombas) {
      if (b.estado !== 'en_marcha') {
        b.corrienteA = 0;
        b.potenciaActualKw = 0;
        continue;
      }
      const mov = Math.min(s.embalse, b.capacidadM3h / 60);
      s.embalse -= mov;
      const kwh = b.potenciaKw / 60;
      s.energiaHoy += kwh;
      s.energiaMes += kwh;
      b.minutosMarchaHoy++;
      b.horometroH += 1 / 60;
      b.potenciaActualKw = b.potenciaKw * (0.95 + this.r.rng() * 0.04);
      b.corrienteA = b.potenciaActualKw * 1.54 * (0.98 + this.r.rng() * 0.04);
      if (s.bombeo) {
        s.bombeo.kwh += kwh;
        s.bombeo.volumenM3 += mov;
      }
      if (b.minutosRestantes !== null) {
        b.minutosRestantes--;
        if (b.minutosRestantes <= 0) this.apagar(b);
      }
    }
    // Los finos llegan de a poco (fracciones de m³ por minuto): solo se da por vacío mientras se bombea.
    if (s.embalse <= 0.5 && s.bombas.some((b) => b.estado === 'en_marcha')) {
      s.embalse = 0;
      s.bombas.filter((b) => b.estado === 'en_marcha').forEach((b) => this.apagar(b));
    }
    if (s.bombeo && !s.bombas.some((b) => b.estado === 'en_marcha')) this.terminarBombeo();
  }

  private apagar(b: BombaEstado) {
    b.estado = 'apagada';
    b.minutosRestantes = null;
    b.corrienteA = 0;
    b.potenciaActualKw = 0;
  }

  private terminarBombeo() {
    const s = this.s;
    const bo = s.bombeo!;
    s.bombeo = null;
    const min = Math.round((s.t - bo.inicio) / MIN);
    const ahorro = s.config.lineaBaseKwhDia - bo.kwh;
    this.evento({
      tipo: 'bombeo',
      usuarioId: this.usuarioBombeo,
      duracionMin: min,
      volumenM3: bo.volumenM3,
      kwh: bo.kwh,
      detalle: `Bombeo del embalse con ${bo.plan.asignaciones.map((a) => nombreBomba(a.bombaId)).join(' y ')}: ${formatoNumero(bo.volumenM3)} m³ de lodo fino evacuados.`,
    });
    this.alerta(
      'info',
      `Bombeo terminado: ${formatoNumero(bo.volumenM3)} m³ en ${formatoDuracion(min)}`,
      `Ninguna. Se usaron ${formatoNumero(bo.kwh)} kWh: ${formatoNumero(ahorro)} kWh menos que 8 h fijas.`,
    );
  }

  private usuarioBombeo = USUARIOS.tecnico.id;

  private pasoSensores() {
    const s = this.s;
    const { rng } = this.r;
    for (const x of s.sensores) {
      if (x.hasta !== null && s.t >= x.hasta) {
        const antes = x.estado;
        x.estado = 'en_linea';
        x.hasta = null;
        x.valorCongelado = null;
        if (antes === 'sin_datos') this.alerta('info', `${x.nombre}: volvió a enviar datos`, 'Ninguna.', x.naveId);
        if (antes === 'fuera_rango') this.alerta('info', `${x.nombre}: la lectura volvió a lo normal`, 'Ninguna.', x.naveId);
      }
      if (x.estado === 'en_linea') x.actualizado = s.t;
    }
    if (s.enVivo && rng() < 1 / 700) {
      const candidatos = s.sensores.filter((x) => x.estado === 'en_linea' && ['sst_out', 'nivel_N3', 'nivel_N1', 'embalse', 'caudal'].includes(x.id));
      const x = candidatos[Math.floor(rng() * candidatos.length)];
      if (x) {
        const tipo: EstadoSensor =
          x.id === 'caudal' ? 'fuera_rango' : x.id === 'sst_out' && rng() < 0.4 ? 'necesita_limpieza' : 'sin_datos';
        x.valorCongelado = tipo === 'sin_datos' ? this.lectura(x.id) : null;
        x.estado = tipo;
        x.hasta = s.t + (6 + rng() * 12) * MIN;
        const textos: Record<EstadoSensor, [string, string]> = {
          sin_datos: ['sin datos', 'Revisar el sensor; mientras tanto, leer las miras a mano.'],
          necesita_limpieza: ['la sonda necesita limpieza', 'Limpiar la sonda en el próximo recorrido.'],
          fuera_rango: ['lectura fuera de rango', 'Revisar el equipo: la lectura salta fuera de lo posible. Usar el último dato bueno.'],
          en_linea: ['', ''],
        };
        this.alerta('advertencia', `${x.nombre}: ${textos[tipo][0]}`, textos[tipo][1], x.naveId);
      }
    }
  }

  private planPara(volumen: number): PlanBombeo {
    const s = this.s;
    return calcularPlan(volumen, s.bombas, {
      ahora: s.t,
      horaPuntaInicio: s.config.horaPuntaInicio,
      horaPuntaFin: s.config.horaPuntaFin,
      lineaBaseKwhDia: s.config.lineaBaseKwhDia,
      urgente: volumen > CAPACIDAD_EMBALSE_M3 * 0.75,
    });
  }

  /** `forzar`: recalcular aunque sea pre-simulación (ver abajo). */
  private control(forzar = false) {
    const s = this.s;
    // En la pre-simulación (7 días, minuto a minuto) nadie mira la recomendación entre
    // controles: basta cada 10 min. Era lo que más demoraba el arranque. Las alertas y el
    // final de la pre-simulación la piden al día con `forzar`.
    if (!s.enVivo && !forzar && s.recomendaciones.length && new Date(s.t).getMinutes() % 10 !== 0) return;
    const punta = esHoraPunta(s.t, s.config.horaPuntaInicio, s.config.horaPuntaFin);
    s.recomendaciones = s.naves.map((n) =>
      evaluar(
        {
          naveId: n.id,
          nivelCm: this.nivelExpuesto(n),
          criticoCm: s.config.nivelCriticoCm[n.id],
          tasaCmH: n.tasaEma,
          sstGL: this.lectura('sst_in'),
          horaPunta: punta,
          aperturaMaxCm: s.modo === 'automatico' ? s.config.automatico.aperturaMaxCm : APERTURA_MAX_CM,
        },
        s.t,
      ),
    );
    const libres = s.recomendaciones.filter((r) => !s.purgas.some((p) => p.naveId === r.naveId));
    const pool = libres.length ? libres : s.recomendaciones;
    s.principal = pool.reduce((a, b) => (b.urgencia > a.urgencia ? b : a));

    // En la pre-simulación basta recalcular el plan cada 10 min.
    if (!s.bombeo && (s.enVivo || new Date(s.t).getMinutes() % 10 === 0)) s.plan = this.planPara(s.embalse);

    if (s.modo === 'automatico' && !s.emergencia && s.enVivo) {
      const a = s.config.automatico;
      const h = horaDecimal(s.t);
      const enHorario = a.horaDesde <= a.horaHasta ? h >= a.horaDesde && h < a.horaHasta : h >= a.horaDesde || h < a.horaHasta;
      const p = s.principal;
      if (p.accion === 'purgar_ya' && s.purgas.length === 0 && s.purgasHoy < a.purgasMaxDia && enHorario) {
        this.ejecutar({ tipo: 'iniciar_purga', naveId: p.naveId, aperturaCm: p.aperturaCm, duracionMin: p.duracionMin, origen: 'automatico', usuarioId: USUARIO_SISTEMA.id, motivo: p.reglaTexto });
      }
      if (!s.bombeo && s.embalse >= UMBRAL_BOMBEO_M3 && s.t >= s.plan.inicioSugerido) {
        this.ejecutar({ tipo: 'ejecutar_plan', usuarioId: USUARIO_SISTEMA.id, motivo: 'Plan automático: lodo fino en el embalse' });
      }
    }
  }

  private alertasNivel() {
    const s = this.s;
    for (const n of s.naves) {
      const critico = s.config.nivelCriticoCm[n.id];
      const pct = (this.nivelExpuesto(n) / critico) * 100;
      const purgando = s.purgas.some((p) => p.naveId === n.id);
      if (pct < 55) n.alertaNivel = 0;
      if (purgando) continue;
      const alerta = (pct >= 85 && n.alertaNivel < 2) || (pct >= 65 && n.alertaNivel < 1);
      // Si va a salir una alerta en la pre-simulación, su texto usa la recomendación de este minuto.
      if (alerta && !s.enVivo) this.control(true);
      const rec = s.recomendaciones.find((r) => r.naveId === n.id)!;
      if (pct >= 85 && n.alertaNivel < 2) {
        n.alertaNivel = 2;
        const h = horasACritico(n.nivel, critico, n.tasaEma);
        this.alerta(
          'critica',
          h !== null ? `La ${n.nombre} llegará al nivel crítico en ${formatoDuracion(h * 60)}` : `La ${n.nombre} está al ${formatoNumero(pct)} % del nivel crítico`,
          rec.reglaTexto,
          n.id,
          `Lodo al ${formatoNumero(pct)} % del crítico, subiendo ${formatoNumero(Math.max(0, n.tasaEma), 1)} cm/h con sólidos en ${formatoNumero(s.sst, 2)} g/L.`,
        );
      } else if (pct >= 65 && n.alertaNivel < 1) {
        n.alertaNivel = 1;
        this.alerta(
          'advertencia',
          `La ${n.nombre} superó el 65 % del nivel crítico`,
          rec.accion === 'esperar' ? `Vigilar la ${n.nombre} y programar la purga si sigue subiendo.` : rec.reglaTexto,
          n.id,
        );
      }
    }
  }

  // ───────────────────────── utilidades ─────────────────────────

  private nave(id: NaveId) {
    return this.s.naves.find((n) => n.id === id)!;
  }

  private sensorNave(id: NaveId) {
    return this.s.sensores.find((x) => x.id === `nivel_${id}`)!;
  }

  /** Nivel que informa el sensor: con su sesgo, o congelado si no envía datos. */
  private nivelExpuesto(n: NaveInterna) {
    const x = this.sensorNave(n.id);
    return x.estado === 'sin_datos' && x.valorCongelado !== null ? x.valorCongelado : Math.max(0, n.nivel + x.sesgo);
  }

  private sensor(id: string) {
    return this.s.sensores.find((x) => x.id === id)!;
  }

  /** Lo que marca un sensor ahora: el valor real deformado por su error de calibración. */
  private lectura(id: string): number {
    const s = this.s;
    const x = this.sensor(id);
    if (x.estado === 'sin_datos' && x.valorCongelado !== null) return x.valorCongelado;
    switch (id) {
      case 'caudal':
        return s.caudal * x.ganancia;
      case 'sst_in':
        return s.sst * x.ganancia;
      case 'sst_out':
        return s.sstSalida * x.ganancia;
      case 'embalse':
        return s.embalse * x.ganancia;
      default:
        return this.nivelExpuesto(this.nave(x.naveId!));
    }
  }

  /** Lo que marcaba el sensor en un momento pasado (de las series guardadas). */
  private lecturaEn(id: string, t: number): number | null {
    const s = this.s;
    if (s.t - t < 10 * MIN) return this.lectura(id);
    return valorEnSerie(s.serie24h, s.serie7d, s.t, id, this.sensor(id).naveId, t);
  }

  /**
   * Auditoría de la historia previa: las órdenes que dejaron rastro en la bitácora de los 30 días
   * anteriores, las calibraciones revisadas, un cambio de tarifa y un intento rechazado.
   * (Lo que pasó en la pre-simulación ya quedó auditado al ejecutarse.)
   */
  private historiaAuditoria(t0: number, ahora: number) {
    const s = this.s;
    const previos: RegistroAuditoria[] = [];
    const agregar = (r: Omit<RegistroAuditoria, 'id'>) => previos.push({ ...r, id: this.id('au') });
    for (const e of s.bitacora) {
      if (e.t >= t0) continue;
      if (e.tipo === 'purga' && e.naveId) {
        agregar({
          t: e.t - (e.duracionMin ?? 0) * MIN,
          usuarioId: e.usuarioId,
          comando: 'Iniciar purga',
          detalle: `${nombreNave(e.naveId)} · compuerta a ${e.aperturaCm ?? 20} cm · ${e.duracionMin ?? 0} min`,
          resultado: 'aceptado',
        });
      } else if (e.tipo === 'bombeo') {
        agregar({ t: e.t - (e.duracionMin ?? 0) * MIN, usuarioId: e.usuarioId, comando: 'Iniciar plan de bombeo', detalle: e.detalle, resultado: 'aceptado' });
      } else if (e.tipo === 'rechazo' && e.naveId) {
        agregar({ t: e.t, usuarioId: e.usuarioId, comando: 'Rechazar recomendación', detalle: nombreNave(e.naveId), motivo: e.motivo, resultado: 'aceptado' });
      }
    }
    for (const m of s.muestras) {
      if (!m.revisadoPor || !m.revisadoT) continue;
      const x = this.sensor(m.sensorId);
      agregar({
        t: m.revisadoT,
        usuarioId: m.revisadoPor,
        comando: m.estado === 'aprobada' ? 'Aprobar calibración' : 'Descartar muestra',
        detalle: x.nombre,
        motivo: m.estado === 'descartada' ? m.nota : undefined,
        resultado: 'aceptado',
      });
    }
    const inicioHoy = new Date(ahora).setHours(0, 0, 0, 0);
    agregar({
      t: inicioHoy - 12 * DIA_MS + 10 * 60 * MIN,
      usuarioId: USUARIOS.jefatura.id,
      comando: 'Cambiar configuración',
      detalle: 'Tarifa: S/ 0.42 → S/ 0.45 por kWh',
      motivo: 'Nuevo pliego tarifario de la distribuidora',
      resultado: 'aceptado',
    });
    agregar({
      t: inicioHoy - 4 * DIA_MS + 3 * 60 * MIN + 12 * MIN,
      usuarioId: USUARIOS.tecnico.id,
      comando: 'Cambiar modo',
      detalle: 'Solo jefatura puede activar el modo Automático.',
      resultado: 'rechazado',
    });
    s.auditoria = [...s.auditoria, ...previos].sort((a, b) => b.t - a.t).slice(0, 300);
  }

  /** Historia de calibraciones: laboratorio semanal de sólidos, batimetrías y una lectura de miras. */
  private historiaMuestras(ahora: number) {
    const s = this.s;
    const { rng } = crearRng(this.semilla + 2);
    const jefe = USUARIOS.jefatura.id;
    const tecnico = USUARIOS.tecnico.id;
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    const muestras: MuestraCalibracion[] = [];
    const agregar = (m: Omit<MuestraCalibracion, 'id'>) => muestras.push({ ...m, id: this.id('mu') });
    // Las muestras se toman a horas redondas de días anteriores.
    const inicioHoy = new Date(ahora).setHours(0, 0, 0, 0);
    const aLas = (diasAtras: number, hora: number) => inicioHoy - diasAtras * DIA_MS + hora * 60 * MIN;

    // Sólidos a la entrada, una muestra por semana: el sensor se va desviando hasta pedir calibración.
    const desvios = [0.12, 0.17, 0.02, 0.05, 0.09];
    desvios.forEach((d, i) => {
      const tMuestra = aLas(35 - i * 7, 9);
      const real = 0.06 + rng() * 0.1;
      const estado = i === 1 ? 'aprobada' : Math.abs(d) <= TOLERANCIA.relativa ? 'conforme' : 'descartada';
      agregar({
        t: tMuestra + DIA_MS,
        tMuestra,
        tipo: 'laboratorio',
        sensorId: 'sst_in',
        valorReferencia: r3(real),
        valorSensor: r3(real * (1 + d)),
        unidad: 'g/L',
        usuarioId: jefe,
        estado,
        revisadoPor: estado === 'aprobada' || estado === 'descartada' ? jefe : undefined,
        revisadoT: estado === 'aprobada' || estado === 'descartada' ? tMuestra + DIA_MS + 2 * 60 * MIN : undefined,
        nota: estado === 'descartada' ? 'Muestra repetida al día siguiente.' : undefined,
      });
    });
    // La de ayer, con lo que de verdad marcaba el sensor: 14 % de más, pide calibrar.
    const tAyer = aLas(1, 9);
    const marcaba = this.lecturaEn('sst_in', tAyer);
    if (marcaba !== null) {
      agregar({
        t: ahora - 3 * 60 * MIN,
        tMuestra: tAyer,
        tipo: 'laboratorio',
        sensorId: 'sst_in',
        valorReferencia: r3((marcaba / 1.14) * (1 + (rng() - 0.5) * 0.02)),
        valorSensor: r3(marcaba),
        unidad: 'g/L',
        usuarioId: jefe,
        estado: 'pendiente',
        nota: 'Laboratorio de la EPS, método gravimétrico.',
      });
    }
    // Salida: dentro de tolerancia.
    const salida = this.lecturaEn('sst_out', tAyer);
    if (salida !== null) {
      agregar({ t: ahora - 3 * 60 * MIN, tMuestra: tAyer, tipo: 'laboratorio', sensorId: 'sst_out', valorReferencia: r3(salida / 0.96), valorSensor: r3(salida), unidad: 'g/L', usuarioId: jefe, estado: 'conforme' });
    }
    // Batimetría de las tres naves hace 21 días (con la que se calibraron los niveles).
    for (const n of s.naves) {
      const t = aLas(21, 10);
      const ref = Math.round(90 + rng() * 80);
      agregar({ t, tMuestra: t, tipo: 'batimetria', sensorId: `nivel_${n.id}`, valorReferencia: ref, valorSensor: ref + Math.round((rng() - 0.5) * 16), unidad: 'cm', usuarioId: jefe, estado: 'aprobada', revisadoPor: jefe, revisadoT: t + 60 * MIN, nota: 'Ecosonda desde la pasarela, 12 puntos por nave.' });
    }
    // Miras de la Nave 2 hace 2 días: el sensor marca 9 cm de más.
    const tMiras = aLas(2, 7);
    const nivelSensor = this.lecturaEn('nivel_N2', tMiras);
    if (nivelSensor !== null) {
      agregar({ t: tMiras, tMuestra: tMiras, tipo: 'miras', sensorId: 'nivel_N2', valorReferencia: Math.round(nivelSensor - 9), valorSensor: Math.round(nivelSensor), unidad: 'cm', usuarioId: tecnico, estado: 'pendiente' });
    }
    s.muestras = muestras.sort((a, b) => b.t - a.t);
    // La última calibración de cada sensor es la de su muestra aprobada más reciente.
    for (const x of s.sensores) {
      const aprobada = s.muestras.find((m) => m.sensorId === x.id && m.estado === 'aprobada');
      if (aprobada?.revisadoT) x.ultimaCalibracion = aprobada.revisadoT;
    }
  }

  private punto(): PuntoSerie {
    const s = this.s;
    return {
      t: s.t,
      caudalM3s: this.lectura('caudal'),
      sstEntradaGL: this.lectura('sst_in'),
      sstSalidaGL: this.lectura('sst_out'),
      eficienciaPct: s.eficiencia,
      niveles: { N1: this.nivelExpuesto(s.naves[0]), N2: this.nivelExpuesto(s.naves[1]), N3: this.nivelExpuesto(s.naves[2]) },
      embalseLodoM3: s.embalse,
      energiaKwh: s.energiaHoy,
    };
  }

  /** Las informativas no piden reconocimiento: nacen reconocidas. */
  private alerta(severidad: Severidad, titulo: string, accionSugerida: string, naveId?: NaveId, detalle?: string) {
    this.s.alertas.unshift({ id: this.id('al'), t: this.s.t, severidad, titulo, accionSugerida, naveId, detalle, reconocida: severidad === 'info' });
    if (this.s.alertas.length > 80) this.s.alertas.pop();
  }

  private evento(e: Omit<EventoBitacora, 'id' | 't'>) {
    this.s.bitacora.unshift({ ...e, id: this.id('ev'), t: this.s.t });
    if (this.s.bitacora.length > 500) this.s.bitacora.pop();
  }

  private auditar(usuarioId: string, comando: string, detalle: string, resultado: 'aceptado' | 'rechazado', motivo?: string) {
    this.s.auditoria.unshift({ id: this.id('au'), t: this.s.t, usuarioId, comando, detalle, motivo, resultado });
    if (this.s.auditoria.length > 300) this.s.auditoria.pop();
  }

  // ───────────────────────── comandos ─────────────────────────

  private ejecutar(c: Comando): ResultadoComando {
    const s = this.s;
    const no = (mensaje: string, usuarioId?: string, comando?: string): ResultadoComando => {
      if (usuarioId && comando) this.auditar(usuarioId, comando, mensaje, 'rechazado');
      return { ok: false, mensaje };
    };
    const si = (mensaje: string): ResultadoComando => ({ ok: true, mensaje });

    switch (c.tipo) {
      case 'iniciar_purga': {
        if (s.emergencia) return no('Parada de emergencia activa: rearmar antes de purgar.', c.usuarioId, 'Iniciar purga');
        if (s.purgas.some((p) => p.naveId === c.naveId)) return no(`Ya hay una purga en curso en la ${nombreNave(c.naveId)}.`, c.usuarioId, 'Iniciar purga');
        const n = this.nave(c.naveId);
        const apertura = limitar(Math.round(c.aperturaCm / PASO_COMPUERTA_CM) * PASO_COMPUERTA_CM, PASO_COMPUERTA_CM, APERTURA_MAX_CM);
        s.purgas.push({
          id: this.id('pu'),
          naveId: c.naveId,
          inicio: s.t,
          aperturaCm: n.compuertaCm,
          duracionMin: c.duracionMin,
          nivelInicialCm: n.nivel,
          origen: c.origen,
          usuarioId: c.usuarioId,
          estado: 'en_curso',
          aperturaObjetivoCm: apertura,
          minutosPurgando: 0,
          fase: 'abriendo',
          manual: false,
          aperturaUsadaCm: 0,
          volumenParcialM3: 0,
          aguaParcialM3: 0,
          muestras: [{ t: s.t, nivelCm: n.nivel }],
        });
        s.purgasHoy++;
        const det = `${nombreNave(c.naveId)} · compuerta a ${apertura} cm · ${c.duracionMin} min`;
        this.auditar(c.usuarioId, 'Iniciar purga', det, 'aceptado', c.motivo);
        return si(`Purga iniciada: ${det}.`);
      }
      case 'programar_purga': {
        if (c.inicio <= s.t) return no('La hora programada ya pasó.', c.usuarioId, 'Programar purga');
        if (s.programadas.some((x) => x.naveId === c.naveId)) return no(`La ${nombreNave(c.naveId)} ya tiene una purga programada.`, c.usuarioId, 'Programar purga');
        const apertura = limitar(Math.round(c.aperturaCm / PASO_COMPUERTA_CM) * PASO_COMPUERTA_CM, PASO_COMPUERTA_CM, APERTURA_MAX_CM);
        s.programadas.push({
          id: this.id('pp'),
          naveId: c.naveId,
          aperturaCm: apertura,
          duracionMin: c.duracionMin,
          inicio: Math.floor(c.inicio / MIN) * MIN,
          origen: s.modo === 'automatico' ? 'asistido' : s.modo,
          usuarioId: c.usuarioId,
          creada: s.t,
        });
        s.programadas.sort((a, b) => a.inicio - b.inicio);
        const hora = new Date(c.inicio);
        const det = `${nombreNave(c.naveId)} · ${apertura} cm · ${c.duracionMin} min · ${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
        this.auditar(c.usuarioId, 'Programar purga', det, 'aceptado', c.motivo);
        this.evento({ tipo: 'comando', naveId: c.naveId, usuarioId: c.usuarioId, detalle: `Purga programada: ${det}.` });
        return si(`Purga programada: ${det}.`);
      }
      case 'cancelar_programada': {
        const x = s.programadas.find((p) => p.id === c.programadaId);
        if (!x) return no('Esa purga programada ya no existe.');
        s.programadas = s.programadas.filter((p) => p !== x);
        this.auditar(c.usuarioId, 'Cancelar purga programada', nombreNave(x.naveId), 'aceptado', c.motivo);
        return si(`Purga programada de la ${nombreNave(x.naveId)} cancelada.`);
      }
      case 'abortar_purga': {
        const p = s.purgas.find((x) => x.naveId === c.naveId);
        if (!p) return no('No hay purga en curso en esa nave.');
        p.fase = 'cerrando';
        p.aperturaObjetivoCm = 0;
        this.auditar(c.usuarioId, 'Detener purga', nombreNave(c.naveId), 'aceptado', c.motivo);
        return si(`Cerrando la compuerta de la ${nombreNave(c.naveId)}.`);
      }
      case 'mover_compuerta': {
        if (s.emergencia && c.aperturaCm > 0) return no('Parada de emergencia activa.', c.usuarioId, 'Mover compuerta');
        const cm = limitar(Math.round(c.aperturaCm / PASO_COMPUERTA_CM) * PASO_COMPUERTA_CM, 0, APERTURA_MAX_CM);
        const n = this.nave(c.naveId);
        let p = s.purgas.find((x) => x.naveId === c.naveId);
        if (!p && cm > 0) {
          p = {
            id: this.id('pu'), naveId: c.naveId, inicio: s.t, aperturaCm: n.compuertaCm, duracionMin: 0, nivelInicialCm: n.nivel,
            origen: s.modo === 'automatico' ? 'asistido' : s.modo, usuarioId: c.usuarioId, estado: 'en_curso', aperturaObjetivoCm: cm,
            minutosPurgando: 0, fase: 'abriendo', manual: true, aperturaUsadaCm: 0, volumenParcialM3: 0, aguaParcialM3: 0, muestras: [{ t: s.t, nivelCm: n.nivel }],
          };
          s.purgas.push(p);
          s.purgasHoy++;
        } else if (p) {
          p.aperturaObjetivoCm = cm;
          p.manual = true;
          p.fase = cm === 0 ? 'cerrando' : p.fase === 'cerrando' ? 'abriendo' : p.fase;
        }
        this.auditar(c.usuarioId, 'Mover compuerta', `${nombreNave(c.naveId)} → ${cm} cm`, 'aceptado', c.motivo);
        return si(`Compuerta de la ${nombreNave(c.naveId)} hacia ${cm} cm.`);
      }
      case 'bomba': {
        const b = s.bombas.find((x) => x.id === c.bombaId)!;
        const accion = c.encender ? 'Encender bomba' : 'Apagar bomba';
        if (c.encender) {
          if (s.emergencia) return no('Parada de emergencia activa.', c.usuarioId, accion);
          if (b.estado === 'falla') return no(`${nombreBomba(b.id)} en falla: revisar en campo.`, c.usuarioId, accion);
          if (s.embalse < 1) return no('No hay lodo fino por bombear en el embalse.', c.usuarioId, accion);
          b.estado = 'en_marcha';
          b.minutosRestantes = null;
          if (!s.bombeo) {
            s.bombeo = { inicio: s.t, volumenM3: 0, kwh: 0, plan: { ...s.plan, asignaciones: [{ bombaId: b.id, minutos: 0, kwh: 0 }] } };
            this.usuarioBombeo = c.usuarioId;
          }
        } else {
          this.apagar(b);
        }
        this.auditar(c.usuarioId, accion, nombreBomba(b.id), 'aceptado', c.motivo);
        return si(`${nombreBomba(b.id)} ${c.encender ? 'encendida' : 'apagada'}.`);
      }
      case 'programar_plan': {
        if (c.inicio <= s.t) return no('La hora del plan ya pasó.', c.usuarioId, 'Programar bombeo');
        s.planProgramado = { inicio: Math.floor(c.inicio / MIN) * MIN, usuarioId: c.usuarioId };
        const d = new Date(c.inicio);
        const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        this.auditar(c.usuarioId, 'Programar bombeo', `Arranque a las ${hora}`, 'aceptado', c.motivo);
        return si(`Bombeo programado para las ${hora}.`);
      }
      case 'cancelar_plan_programado': {
        if (!s.planProgramado) return no('No hay bombeo programado.');
        s.planProgramado = null;
        this.auditar(c.usuarioId, 'Cancelar bombeo programado', '', 'aceptado', c.motivo);
        return si('Bombeo programado cancelado.');
      }
      case 'detener_bombeo': {
        if (!s.bombas.some((b) => b.estado === 'en_marcha')) return no('No hay bombas en marcha.');
        s.bombas.filter((b) => b.estado === 'en_marcha').forEach((b) => this.apagar(b));
        if (s.bombeo) this.terminarBombeo();
        this.auditar(c.usuarioId, 'Detener bombeo', 'Todas las bombas', 'aceptado', c.motivo);
        return si('Bombeo detenido: todas las bombas apagadas.');
      }
      case 'ejecutar_plan': {
        s.planProgramado = null;
        if (s.emergencia) return no('Parada de emergencia activa.', c.usuarioId, 'Iniciar plan de bombeo');
        const plan = this.planPara(s.embalse);
        if (!plan.asignaciones.length) return no('No hay lodo pendiente de bombear.');
        for (const a of plan.asignaciones) {
          const b = s.bombas.find((x) => x.id === a.bombaId)!;
          b.estado = 'en_marcha';
          b.minutosRestantes = a.minutos;
        }
        s.plan = plan;
        s.bombeo = { inicio: s.t, volumenM3: 0, kwh: 0, plan };
        this.usuarioBombeo = c.usuarioId;
        const det = plan.asignaciones.map((a) => `${nombreBomba(a.bombaId)} ${formatoDuracion(a.minutos)}`).join(' + ');
        this.auditar(c.usuarioId, 'Iniciar plan de bombeo', `${formatoNumero(plan.volumenPendienteM3)} m³ · ${det}`, 'aceptado', c.motivo);
        return si(`Plan de bombeo en marcha: ${det}.`);
      }
      case 'parada_emergencia': {
        s.emergencia = true;
        s.purgas.forEach((p) => {
          p.fase = 'cerrando';
          p.aperturaObjetivoCm = 0;
        });
        s.bombas.forEach((b) => this.apagar(b));
        if (s.bombeo) this.terminarBombeo();
        this.auditar(c.usuarioId, 'PARADA DE EMERGENCIA', 'Cierre de compuertas y apagado de bombas', 'aceptado', c.motivo);
        this.evento({ tipo: 'emergencia', usuarioId: c.usuarioId, detalle: `Parada de emergencia activada por ${nombreUsuario(c.usuarioId)}.` });
        this.alerta('critica', `Parada de emergencia activada por ${nombreUsuario(c.usuarioId)}`, 'Revisar la planta y rearmar cuando sea seguro.');
        return si('Parada de emergencia: compuertas cerrando y bombas apagadas.');
      }
      case 'rearmar': {
        s.emergencia = false;
        this.auditar(c.usuarioId, 'Rearmar', 'Fin de la parada de emergencia', 'aceptado', c.motivo);
        this.alerta('info', `Planta rearmada por ${nombreUsuario(c.usuarioId)}`, 'Ninguna.');
        return si('Planta rearmada.');
      }
      case 'modo': {
        if (c.modo === 'automatico' && perfilDeUsuario(c.usuarioId) !== 'jefatura') {
          return no('Solo jefatura puede activar el modo Automático.', c.usuarioId, 'Cambiar modo');
        }
        s.modo = c.modo;
        this.auditar(c.usuarioId, 'Cambiar modo', `Modo ${c.modo}`, 'aceptado', c.motivo);
        this.evento({ tipo: 'comando', usuarioId: c.usuarioId, detalle: `Modo de operación cambiado a ${c.modo}.` });
        return si('Modo de operación cambiado.');
      }
      case 'rechazar_recomendacion': {
        this.auditar(c.usuarioId, 'Rechazar recomendación', `${nombreNave(c.naveId)} · urgencia ${c.urgencia}`, 'aceptado', c.motivo);
        this.evento({ tipo: 'rechazo', naveId: c.naveId, usuarioId: c.usuarioId, motivo: c.motivo, detalle: `Recomendación rechazada (urgencia ${c.urgencia}).` });
        return si('Rechazo registrado en la bitácora.');
      }
      case 'reconocer_alerta': {
        const a = s.alertas.find((x) => x.id === c.alertaId);
        if (!a) return no('Esa alerta ya no existe.');
        if (!a.reconocida) {
          a.reconocida = true;
          a.reconocidaPor = c.usuarioId;
          a.reconocidaT = s.t;
          this.auditar(c.usuarioId, 'Reconocer alerta', a.titulo, 'aceptado', c.motivo);
        }
        return si('Alerta reconocida.');
      }
      case 'reconocer_todas': {
        const pendientes = s.alertas.filter((a) => !a.reconocida);
        if (!pendientes.length) return no('No hay alertas sin reconocer.');
        pendientes.forEach((a) => {
          a.reconocida = true;
          a.reconocidaPor = c.usuarioId;
          a.reconocidaT = s.t;
        });
        this.auditar(c.usuarioId, 'Reconocer alertas', `${pendientes.length} alertas`, 'aceptado', c.motivo);
        return si(`${pendientes.length} alertas reconocidas.`);
      }
      case 'registrar': {
        this.evento({ ...c.evento, usuarioId: c.usuarioId });
        return si('Registro guardado en la bitácora.');
      }
      case 'config': {
        const accion = 'Cambiar configuración';
        if (perfilDeUsuario(c.usuarioId) !== 'jefatura') return no('Solo jefatura de operaciones puede cambiar la configuración.', c.usuarioId, accion);
        const errores = Object.values(validarConfig(c.config));
        if (errores.length) return no(`No se guardó: ${errores[0]}`, c.usuarioId, accion);
        if ((c.motivo?.trim().length ?? 0) < MOTIVO_MINIMO) return no('Escribe el motivo del cambio: queda en la auditoría.', c.usuarioId, accion);
        const cambios = describirCambios(s.config, c.config);
        if (!cambios.length) return no('No hay cambios que guardar.');
        s.config = { ...s.config, ...c.config };
        this.auditar(c.usuarioId, accion, cambios.join(' · '), 'aceptado', c.motivo?.trim());
        this.evento({ tipo: 'comando', usuarioId: c.usuarioId, motivo: c.motivo?.trim(), detalle: `Configuración cambiada: ${cambios.join(' · ')}.` });
        this.control();
        return si(cambios.length === 1 ? `Guardado: ${cambios[0]}.` : `Guardados ${cambios.length} cambios de configuración.`);
      }
      case 'registrar_muestra': {
        const x = s.sensores.find((y) => y.id === c.sensorId);
        if (!x) return no('Ese sensor no existe.', c.usuarioId, 'Registrar muestra');
        if (!Number.isFinite(c.valorReferencia) || c.valorReferencia < x.rango[0] || c.valorReferencia > x.rango[1]) {
          return no(`El valor debe estar entre ${x.rango[0]} y ${x.rango[1]} ${x.unidad}.`, c.usuarioId, 'Registrar muestra');
        }
        if (c.tMuestra > s.t + MIN || s.t - c.tMuestra > ANTIGUEDAD_MAXIMA_MS) {
          return no('La fecha de la muestra debe ser de los últimos 7 días.', c.usuarioId, 'Registrar muestra');
        }
        const marcaba = this.lecturaEn(x.id, c.tMuestra);
        if (marcaba === null) return no('No hay registro del sensor a esa hora para comparar.', c.usuarioId, 'Registrar muestra');
        const nivel = x.unidad === 'cm';
        const { dentro } = comparar(c.valorReferencia, marcaba, nivel ? 'cm' : 'g/L');
        const m: MuestraCalibracion = {
          id: this.id('mu'),
          t: s.t,
          tMuestra: c.tMuestra,
          tipo: c.tipoMuestra,
          sensorId: x.id,
          valorReferencia: c.valorReferencia,
          valorSensor: nivel ? Math.round(marcaba) : Math.round(marcaba * 1000) / 1000,
          unidad: nivel ? 'cm' : 'g/L',
          usuarioId: c.usuarioId,
          estado: dentro ? 'conforme' : 'pendiente',
          nota: c.nota?.trim() || undefined,
        };
        s.muestras.unshift(m);
        if (s.muestras.length > 120) s.muestras.pop();
        const origen = { laboratorio: 'Resultado de laboratorio', miras: 'Lectura de miras', batimetria: 'Batimetría' }[c.tipoMuestra];
        this.evento({
          tipo: c.tipoMuestra === 'miras' ? 'lectura_mira' : 'calibracion',
          naveId: x.naveId,
          usuarioId: c.usuarioId,
          detalle:
            c.detalle ??
            `${origen} · ${x.nombre}: ${formatoNumero(c.valorReferencia, x.decimales)} ${x.unidad} (el sensor marcaba ${formatoNumero(marcaba, x.decimales)} ${x.unidad}).`,
        });
        return si(dentro ? 'Guardado: el sensor está dentro de la tolerancia.' : 'Guardado: la diferencia pide calibrar; queda para aprobación de jefatura.');
      }
      case 'revisar_muestra': {
        const accion = c.aprobar ? 'Aprobar calibración' : 'Descartar muestra';
        if (perfilDeUsuario(c.usuarioId) !== 'jefatura') return no('Solo jefatura puede aprobar o descartar calibraciones.', c.usuarioId, accion);
        const m = s.muestras.find((y) => y.id === c.muestraId);
        if (!m || m.estado !== 'pendiente') return no('Esa muestra ya fue revisada.', c.usuarioId, accion);
        const x = this.sensor(m.sensorId);
        if (!c.aprobar) {
          s.muestras = s.muestras.map((y) => (y.id === m.id ? { ...y, estado: 'descartada', revisadoPor: c.usuarioId, revisadoT: s.t, nota: c.motivo ?? y.nota } : y));
          this.auditar(c.usuarioId, accion, `${x.nombre}`, 'aceptado', c.motivo);
          return si('Muestra descartada: el sensor sigue como estaba.');
        }
        let detalle: string;
        if (comparar(m.valorReferencia, m.valorSensor, m.unidad).demasiado) {
          return no(
            m.unidad === 'cm' ? 'La corrección pasa de 60 cm: revisar la lectura antes de calibrar.' : 'La diferencia es de más del 50 %: repetir la muestra antes de calibrar.',
            c.usuarioId,
            accion,
          );
        }
        if (m.unidad === 'cm') {
          const correccion = m.valorReferencia - m.valorSensor;
          x.sesgo += correccion;
          detalle = `${x.nombre}: corrección de ${correccion >= 0 ? '+' : ''}${formatoNumero(correccion)} cm`;
        } else {
          const factor = m.valorReferencia / Math.max(1e-6, m.valorSensor);
          x.ganancia *= factor;
          detalle = `${x.nombre}: factor ×${formatoNumero(factor, 3)}`;
        }
        x.ultimaCalibracion = s.t;
        // Las pendientes anteriores del mismo sensor quedan reemplazadas por esta calibración.
        s.muestras = s.muestras.map((y) =>
          y.id === m.id
            ? { ...y, estado: 'aprobada', revisadoPor: c.usuarioId, revisadoT: s.t }
            : y.sensorId === m.sensorId && y.estado === 'pendiente' && y.tMuestra <= m.tMuestra
              ? { ...y, estado: 'descartada', revisadoPor: c.usuarioId, revisadoT: s.t, nota: 'Reemplazada por una calibración más reciente.' }
              : y,
        );
        this.auditar(c.usuarioId, accion, detalle, 'aceptado', c.motivo);
        this.evento({ tipo: 'calibracion', naveId: x.naveId, usuarioId: c.usuarioId, detalle: `Calibración aprobada · ${detalle}.` });
        this.control();
        return si(`Calibración aplicada: ${x.nombre} ya marca según la referencia.`);
      }
      case 'escenario':
        s.escenario = c.escenario;
        return si(`Escenario: ${ESCENARIOS[c.escenario].nombre}.`);
      case 'velocidad':
        s.velocidad = limitar(c.velocidad, 1, 600);
        return si(`Velocidad ×${s.velocidad}.`);
      case 'pausa':
        s.pausado = c.pausado;
        return si(c.pausado ? 'Simulación en pausa.' : 'Simulación en marcha.');
      case 'forzar_nivel': {
        const n = this.nave(c.naveId);
        n.nivel = c.nivelCm;
        if (c.tasaCmH !== undefined) n.tasaEma = c.tasaCmH;
        this.control();
        return si('Nivel ajustado.');
      }
      case 'reiniciar':
        this.reiniciar();
        return si('Simulación reiniciada.');
    }
  }

  // ───────────────────────── instantánea ─────────────────────────

  private instantanea(): EstadoPlanta {
    const s = this.s;
    const naves: NaveEstado[] = s.naves.map((n) => {
      const sensor = this.sensorNave(n.id);
      const nivel = this.nivelExpuesto(n);
      const critico = s.config.nivelCriticoCm[n.id];
      const p = s.purgas.find((x) => x.naveId === n.id);
      return {
        id: n.id,
        nombre: n.nombre,
        anchoM: 6.5,
        largoM: 40,
        areaM2: n.area,
        nivelCm: nivel,
        nivelCriticoCm: critico,
        tasaCmH: n.tasaEma,
        horasACritico: horasACritico(nivel, critico, n.tasaEma),
        compuerta: {
          naveId: n.id,
          aperturaCm: n.compuertaCm,
          objetivoCm: p?.aperturaObjetivoCm ?? 0,
          aperturaMaxCm: APERTURA_MAX_CM,
          estado: !p ? 'cerrada' : p.fase === 'abriendo' ? 'abriendo' : p.fase === 'cerrando' ? 'cerrando' : 'abierta',
        },
        sensor: sensor.estado,
        actualizado: sensor.actualizado,
        // Las miras se leen a mano: muestran el lodo real, sin el error del sensor.
        miras: PERFIL_MIRAS.map((f, i) => Math.max(0, n.nivel * f + n.offsetsMiras[i])),
      };
    });
    return {
      t: s.t,
      escenario: s.escenario,
      velocidad: s.velocidad,
      pausado: s.pausado,
      modo: s.modo,
      emergencia: s.emergencia,
      horaPunta: esHoraPunta(s.t, s.config.horaPuntaInicio, s.config.horaPuntaFin),
      caudalM3s: this.lectura('caudal'),
      sstEntradaGL: this.lectura('sst_in'),
      sstSalidaGL: this.lectura('sst_out'),
      eficienciaPct: s.eficiencia,
      naves,
      bombas: s.bombas.map((b) => ({ ...b })),
      embalseLodoM3: s.embalse,
      embalseCapacidadM3: CAPACIDAD_EMBALSE_M3,
      embalseUmbralM3: UMBRAL_BOMBEO_M3,
      finosEmbalseM3h: s.finosEmbalse,
      energiaHoyKwh: s.energiaHoy,
      energiaDiaria: [...s.energiaDiaria],
      planProgramado: s.planProgramado,
      energiaMesKwh: s.energiaMes,
      purgasHoy: s.purgasHoy,
      purgas: s.purgas.map((p) => ({ ...p, muestras: [...p.muestras] })),
      programadas: s.programadas.map((x) => ({ ...x })),
      ultimaPurga: this.ultimaPurga,
      bombeo: s.bombeo ? { ...s.bombeo } : null,
      plan: s.plan,
      recomendaciones: s.recomendaciones,
      principal: s.principal,
      alertas: s.alertas.map((a) => ({ ...a })),
      bitacora: [...s.bitacora],
      auditoria: [...s.auditoria],
      sensores: s.sensores.map(({ hasta: _h, valorCongelado: _v, ganancia: _g, sesgo: _s, ...x }) => ({ ...x, valor: this.lectura(x.id) })),
      muestras: s.muestras,
      serie24h: [...s.serie24h],
      serie7d: [...s.serie7d],
      config: s.config,
    };
  }
}
