import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CircleCheck,
  CircleSlash,
  CircleX,
  Clock,
  Info,
  OctagonAlert,
  PowerOff,
  SprayCan,
  TriangleAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type TipoEstado =
  | 'normal'
  | 'advertencia'
  | 'critica'
  | 'info'
  | 'en_linea'
  | 'sin_datos'
  | 'desactualizado'
  | 'fuera_rango'
  | 'necesita_limpieza'
  | 'en_marcha'
  | 'apagada'
  | 'falla';

type Tono = 'ok' | 'warn' | 'crit' | 'info' | 'stale';

const ESTADOS: Record<TipoEstado, { icono: LucideIcon; texto: string; tono: Tono }> = {
  normal: { icono: CircleCheck, texto: 'Normal', tono: 'ok' },
  advertencia: { icono: TriangleAlert, texto: 'Advertencia', tono: 'warn' },
  critica: { icono: OctagonAlert, texto: 'Crítico', tono: 'crit' },
  info: { icono: Info, texto: 'Información', tono: 'info' },
  en_linea: { icono: Wifi, texto: 'En línea', tono: 'ok' },
  sin_datos: { icono: WifiOff, texto: 'Sin datos', tono: 'stale' },
  desactualizado: { icono: Clock, texto: 'Desactualizado', tono: 'stale' },
  fuera_rango: { icono: CircleSlash, texto: 'Fuera de rango', tono: 'warn' },
  necesita_limpieza: { icono: SprayCan, texto: 'Necesita limpieza', tono: 'warn' },
  en_marcha: { icono: Activity, texto: 'En marcha', tono: 'ok' },
  apagada: { icono: PowerOff, texto: 'Apagada', tono: 'stale' },
  falla: { icono: CircleX, texto: 'Falla', tono: 'crit' },
};

export const TONO_CLASES: Record<Tono, { chip: string; texto: string; fondo: string; borde: string }> = {
  ok: { chip: 'bg-ok-soft text-ok', texto: 'text-ok', fondo: 'bg-ok', borde: 'border-ok' },
  warn: { chip: 'bg-warn-soft text-warn', texto: 'text-warn', fondo: 'bg-warn', borde: 'border-warn' },
  crit: { chip: 'bg-crit-soft text-crit', texto: 'text-crit', fondo: 'bg-crit', borde: 'border-crit' },
  info: { chip: 'bg-info-soft text-info', texto: 'text-info', fondo: 'bg-info', borde: 'border-info' },
  stale: { chip: 'bg-stale-soft text-stale', texto: 'text-stale', fondo: 'bg-stale', borde: 'border-stale' },
};

export function tonoDeEstado(estado: TipoEstado): Tono {
  return ESTADOS[estado].tono;
}

interface Props {
  estado: TipoEstado;
  /** Reemplaza el texto por defecto. */
  texto?: string;
  tamano?: 'sm' | 'md';
  /** Parpadeo suave para estados que exigen atención. */
  pulso?: boolean;
  className?: string;
}

/** Estado siempre con ícono + texto: nunca solo color. */
export function EstadoChip({ estado, texto, tamano = 'md', pulso, className }: Props) {
  const { icono: Icono, texto: porDefecto, tono } = ESTADOS[estado];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
        tamano === 'sm' ? 'h-6 px-2 text-[0.75rem]' : 'h-7 px-2.5 text-label',
        TONO_CLASES[tono].chip,
        className,
      )}
    >
      <Icono
        aria-hidden
        strokeWidth={2}
        className={cn(tamano === 'sm' ? 'size-3.5' : 'size-4', pulso && 'anim-pulso')}
      />
      {texto ?? porDefecto}
    </span>
  );
}
