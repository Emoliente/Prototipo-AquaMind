import {
  ArrowDownToLine,
  Bell,
  ChartSpline,
  Fan,
  FileChartColumn,
  FlaskConical,
  LayoutDashboard,
  NotebookPen,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Perfil } from '@/types/dominio';

export type RutaModulo =
  | 'panel'
  | 'purgas'
  | 'bombeo'
  | 'alertas'
  | 'pronostico'
  | 'bitacora'
  | 'informes'
  | 'calibracion'
  | 'configuracion';

export interface Modulo {
  ruta: RutaModulo;
  codigo: string;
  texto: string;
  /** Nombre corto para la navegación inferior del celular. */
  corto: string;
  icono: LucideIcon;
  perfiles: Perfil[];
}

export const MODULOS: Modulo[] = [
  { ruta: 'panel', codigo: 'M1', texto: 'Panel de monitoreo', corto: 'Panel', icono: LayoutDashboard, perfiles: ['tecnico', 'jefatura', 'gerencia'] },
  { ruta: 'purgas', codigo: 'M2', texto: 'Purgas', corto: 'Purgas', icono: ArrowDownToLine, perfiles: ['tecnico', 'jefatura'] },
  { ruta: 'bombeo', codigo: 'M3', texto: 'Bombeo de lodos', corto: 'Bombeo', icono: Fan, perfiles: ['tecnico', 'jefatura'] },
  { ruta: 'alertas', codigo: 'M4', texto: 'Alertas', corto: 'Alertas', icono: Bell, perfiles: ['tecnico', 'jefatura'] },
  { ruta: 'pronostico', codigo: 'M5', texto: 'Pronóstico y temporada', corto: 'Pronóstico', icono: ChartSpline, perfiles: ['jefatura', 'gerencia'] },
  { ruta: 'bitacora', codigo: 'M6', texto: 'Bitácora', corto: 'Bitácora', icono: NotebookPen, perfiles: ['tecnico', 'jefatura'] },
  { ruta: 'informes', codigo: 'M6', texto: 'Informes', corto: 'Informes', icono: FileChartColumn, perfiles: ['jefatura', 'gerencia'] },
  { ruta: 'calibracion', codigo: 'M7', texto: 'Calibración y laboratorio', corto: 'Calibración', icono: FlaskConical, perfiles: ['jefatura'] },
  { ruta: 'configuracion', codigo: 'M8', texto: 'Configuración y seguridad', corto: 'Ajustes', icono: Settings, perfiles: ['jefatura'] },
];

export function modulosDe(perfil: Perfil): Modulo[] {
  return MODULOS.filter((m) => m.perfiles.includes(perfil));
}

export function puedeVer(perfil: Perfil, ruta: RutaModulo): boolean {
  return MODULOS.some((m) => m.ruta === ruta && m.perfiles.includes(perfil));
}

export type Accion =
  /** Confirmar o rechazar recomendaciones, operar compuertas y bombas (Asistido/Manual). */
  | 'operar'
  | 'parada_emergencia'
  | 'registrar_lectura'
  | 'modo_automatico'
  | 'editar_configuracion'
  | 'aprobar_calibracion';

const PERMISOS: Record<Perfil, Accion[]> = {
  tecnico: ['operar', 'parada_emergencia', 'registrar_lectura'],
  jefatura: ['operar', 'parada_emergencia', 'registrar_lectura', 'modo_automatico', 'editar_configuracion', 'aprobar_calibracion'],
  gerencia: [],
};

export function puede(perfil: Perfil, accion: Accion): boolean {
  return PERMISOS[perfil].includes(accion);
}
