import { FlaskConical, Ruler, ScanLine, type LucideIcon } from 'lucide-react';
import type { EstadoMuestra, SensorInfo, TipoMuestra } from '@/data/DataSource';
import type { EstadoSensor } from '@/types/dominio';
import type { TipoEstado } from '@/components/ui/EstadoChip';
import { formatoNumero } from '@/lib/format';

export const TIPO_MUESTRA: Record<TipoMuestra, { texto: string; icono: LucideIcon }> = {
  laboratorio: { texto: 'Laboratorio', icono: FlaskConical },
  miras: { texto: 'Miras', icono: Ruler },
  batimetria: { texto: 'Batimetría', icono: ScanLine },
};

export const ESTADO_MUESTRA: Record<EstadoMuestra, { texto: string; estado: TipoEstado }> = {
  conforme: { texto: 'Conforme', estado: 'normal' },
  pendiente: { texto: 'Por aprobar', estado: 'advertencia' },
  aprobada: { texto: 'Calibrado', estado: 'info' },
  descartada: { texto: 'Descartada', estado: 'desactualizado' },
};

/** Qué hacer con un sensor según su estado, en palabras de planta. */
export const QUE_HACER: Record<EstadoSensor, string> = {
  en_linea: '',
  sin_datos: 'No envía datos: revisar cable y alimentación. Mientras tanto, leer las miras a mano.',
  fuera_rango: 'La lectura salta fuera de lo posible: revisar el equipo y usar el último dato bueno.',
  necesita_limpieza: 'La sonda está sucia: limpiarla en el próximo recorrido y volver a comparar.',
};

/** "0.114 g/L", "126 cm"… con los decimales propios de cada sensor. */
export const conUnidad = (v: number, unidad: string, decimales: number) => `${formatoNumero(v, decimales)} ${unidad}`;

/** Diferencia legible: "+14 %" en sólidos, "+9 cm" en niveles. */
export function textoDiferencia(diferencia: number, relativa: number | null) {
  const signo = (v: number) => (v > 0 ? '+' : '');
  return relativa !== null ? `${signo(relativa)}${formatoNumero(relativa * 100)} %` : `${signo(diferencia)}${formatoNumero(diferencia)} cm`;
}

/** Días de calendario entre `t` y `hoy`: "hoy", "ayer", "hace N días" (igual en toda la pantalla). */
export function haceDias(t: number | null, hoy: number) {
  if (t === null) return 'nunca';
  const d = Math.round((new Date(hoy).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86_400_000);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
}

export const decimalesDe = (s: Pick<SensorInfo, 'unidad' | 'decimales'>) => (s.unidad === 'g/L' ? 3 : s.decimales);
