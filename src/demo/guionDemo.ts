/**
 * Guion del Modo demo (~60 s): lluvias → sube el lodo de la N2 → alerta (pantalla y Telegram)
 * → recomendación → confirmación → la compuerta abre y el nivel baja → volumen purgado y plan
 * de bombeo → las bombas trabajan → energía ahorrada frente a 8 h fijas.
 */
import type { Comando, EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { formatoDuracion, formatoNumero } from '@/lib/format';

export interface ContextoDemo {
  enviar: (c: Comando) => void;
  planta: () => EstadoPlanta | null;
  abrirPurga: (id: NaveId | null) => void;
  navegar: (ruta: string) => void;
  mostrar: (cambios: { telegram?: boolean; ahorro?: boolean; confirmarPurga?: boolean }) => void;
  limpiarAvisos: () => void;
  /** Vuelve al inicio de la página: el esquema y la recomendación deben verse. */
  subir: () => void;
}

export interface PasoDemo {
  id: string;
  titulo: string;
  /** Qué está pasando, en palabras para quien mira (puede usar datos en vivo). */
  narracion: (p: EstadoPlanta) => string;
  /** Duración mínima del paso. */
  duracionMs: number;
  /** Si existe, el paso espera esta condición (hasta `maxMs`) antes de avanzar. */
  listo?: (p: EstadoPlanta, inicio: number) => boolean;
  maxMs?: number;
  alEntrar?: (ctx: ContextoDemo) => void;
  cadaTick?: (ctx: ContextoDemo, ms: number) => void;
  alSalir?: (ctx: ContextoDemo) => void;
}

const NAVE: NaveId = 'N2';
const N2 = (p: EstadoPlanta) => p.naves.find((n) => n.id === NAVE)!;
const pct = (p: EstadoPlanta) => (N2(p).nivelCm / N2(p).nivelCriticoCm) * 100;
const NIVEL_INICIO = 182;
const NIVEL_FIN = 222;
const SUBIDA = 3.5;

export const PASOS: PasoDemo[] = [
  {
    id: 'lluvias',
    titulo: 'Empiezan las lluvias',
    narracion: (p) =>
      `El río trae más sólidos: ${formatoNumero(p.sstEntradaGL, 2)} g/L en la entrada. Cada segundo de la demo son 10 minutos de planta.`,
    duracionMs: 5000,
    alEntrar: ({ navegar, enviar, subir }) => {
      navegar('/panel');
      subir();
      enviar({ tipo: 'escenario', escenario: 'lluvias' });
      enviar({ tipo: 'velocidad', velocidad: 10 });
      enviar({ tipo: 'forzar_nivel', naveId: NAVE, nivelCm: NIVEL_INICIO, tasaCmH: SUBIDA });
    },
  },
  {
    id: 'sube',
    titulo: 'Sube el lodo de la Nave 2',
    narracion: (p) =>
      `El lodo de la Nave 2 sube ${formatoNumero(SUBIDA, 1)} cm por hora: ya está en ${formatoNumero(N2(p).nivelCm)} cm, el ${formatoNumero(pct(p))} % del nivel crítico.`,
    duracionMs: 8000,
    cadaTick: ({ enviar }, ms) => {
      if (ms % 300 > 100) return;
      const nivel = NIVEL_INICIO + (NIVEL_FIN - NIVEL_INICIO) * Math.min(1, ms / 7500);
      enviar({ tipo: 'forzar_nivel', naveId: NAVE, nivelCm: nivel, tasaCmH: SUBIDA });
    },
  },
  {
    id: 'alerta',
    titulo: 'Llega la alerta',
    narracion: () => 'Alerta crítica en pantalla y, al mismo tiempo, por Telegram al técnico de turno.',
    duracionMs: 6000,
    alEntrar: ({ enviar, mostrar, subir }) => {
      enviar({ tipo: 'velocidad', velocidad: 1 });
      mostrar({ telegram: true });
      subir();
    },
    alSalir: ({ mostrar }) => mostrar({ telegram: false }),
  },
  {
    id: 'recomendacion',
    titulo: 'Se abre la recomendación',
    narracion: (p) => `AquaMind recomienda: ${p.principal.reglaTexto}`,
    duracionMs: 5000,
    alEntrar: ({ abrirPurga, limpiarAvisos }) => {
      limpiarAvisos();
      abrirPurga(NAVE);
    },
  },
  {
    id: 'confirmar',
    titulo: 'Se confirma la purga',
    narracion: () => 'El técnico confirma manteniendo presionado 2 segundos: tercer toque, y la purga empieza.',
    duracionMs: 3600,
    alEntrar: ({ mostrar }) => mostrar({ confirmarPurga: true }),
    alSalir: ({ mostrar, abrirPurga }) => {
      mostrar({ confirmarPurga: false });
      abrirPurga(null);
    },
  },
  {
    id: 'purga',
    titulo: 'La compuerta abre y el nivel baja',
    narracion: (p) => {
      const purga = p.purgas.find((x) => x.naveId === NAVE);
      return purga
        ? `Compuerta a ${purga.aperturaCm} cm (sube de 10 en 10). El lodo baja: ${formatoNumero(N2(p).nivelCm)} cm, ${formatoNumero(purga.volumenParcialM3)} m³ purgados.`
        : 'La compuerta se cierra de 10 en 10 cm.';
    },
    duracionMs: 6000,
    maxMs: 16000,
    listo: (p, inicio) => p.purgas.length === 0 && !!p.ultimaPurga?.fin && p.ultimaPurga.fin > inicio,
    alEntrar: ({ enviar, subir }) => {
      // Una purga real dura ~1.5 h: a ×10 se ve entera en unos 10 s.
      enviar({ tipo: 'velocidad', velocidad: 10 });
      subir();
    },
  },
  {
    id: 'volumen',
    titulo: 'Volumen purgado y plan de bombeo',
    narracion: (p) => {
      const u = p.ultimaPurga;
      const plan = p.plan.asignaciones.map((a) => `Bomba ${a.bombaId.slice(1)} por ${formatoDuracion(a.minutos)}`).join(' y ');
      return u
        ? `Salieron ${formatoNumero(u.volumenM3 ?? 0)} m³ de lodo (Δ nivel × 260 m²) con ${formatoNumero(u.aguaUsadaM3 ?? 0)} m³ de agua. Plan: ${plan || 'sin bombeo'}, empezando por la que menos gasta.`
        : 'Calculando el volumen purgado…';
    },
    duracionMs: 6500,
    alEntrar: ({ enviar, subir }) => {
      enviar({ tipo: 'velocidad', velocidad: 1 });
      subir();
    },
  },
  {
    id: 'bombeo',
    titulo: 'Las bombas trabajan solo lo necesario',
    narracion: (p) => {
      const enMarcha = p.bombas.filter((b) => b.estado === 'en_marcha').map((b) => `Bomba ${b.id.slice(1)}`);
      return enMarcha.length
        ? `${enMarcha.join(' y ')} en marcha: quedan ${formatoNumero(p.quebradaM3)} m³ en la quebrada. Se apaga sola al terminar.`
        : `Quebrada vacía. Energía usada: ${formatoNumero(p.energiaHoyKwh)} kWh.`;
    },
    duracionMs: 5000,
    maxMs: 14000,
    listo: (p) => !p.bombeo && p.quebradaM3 < 1,
    alEntrar: ({ enviar, subir }) => {
      subir();
      enviar({ tipo: 'ejecutar_plan', usuarioId: 'u-tecnico', motivo: 'Modo demo' });
      enviar({ tipo: 'velocidad', velocidad: 15 });
    },
  },
  {
    id: 'ahorro',
    titulo: 'Energía ahorrada',
    narracion: (p) =>
      `Con 8 horas fijas de bombeo se gastarían ${formatoNumero(p.config.lineaBaseKwhDia)} kWh al día. Hoy, solo ${formatoNumero(p.energiaHoyKwh)} kWh.`,
    duracionMs: 9000,
    alEntrar: ({ enviar, mostrar }) => {
      enviar({ tipo: 'velocidad', velocidad: 1 });
      mostrar({ ahorro: true });
    },
  },
];

export const DURACION_NOMINAL_MS = PASOS.reduce((s, p) => s + p.duracionMs, 0);
