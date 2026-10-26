import { ArrowDownToLine, Fan, FlaskConical, OctagonX, Ruler, StickyNote, Terminal, X, type LucideIcon } from 'lucide-react';
import type { TipoEvento } from '@/types/dominio';

export const TIPO_EVENTO: Record<TipoEvento, { texto: string; icono: LucideIcon }> = {
  purga: { texto: 'Purga', icono: ArrowDownToLine },
  bombeo: { texto: 'Bombeo', icono: Fan },
  lectura_mira: { texto: 'Lectura de miras', icono: Ruler },
  nota: { texto: 'Nota', icono: StickyNote },
  rechazo: { texto: 'Rechazo', icono: X },
  comando: { texto: 'Comando', icono: Terminal },
  emergencia: { texto: 'Emergencia', icono: OctagonX },
  calibracion: { texto: 'Calibración', icono: FlaskConical },
};

export type FiltroTipo = 'todos' | 'purga' | 'bombeo' | 'registros' | 'otros';

export function coincideTipo(tipo: TipoEvento, filtro: FiltroTipo) {
  if (filtro === 'todos') return true;
  if (filtro === 'registros') return tipo === 'lectura_mira' || tipo === 'nota' || tipo === 'calibracion';
  if (filtro === 'otros') return tipo === 'rechazo' || tipo === 'comando' || tipo === 'emergencia';
  return tipo === filtro;
}
