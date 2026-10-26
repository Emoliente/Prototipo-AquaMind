import type { Perfil, Usuario } from '@/types/dominio';

/** Usuarios de demostración (sin login: el perfil se elige en el encabezado). */
export const USUARIOS: Record<Perfil, Usuario> = {
  tecnico: { id: 'u-tecnico', nombre: 'Luis Quispe', perfil: 'tecnico', telegram: '@lquispe_turno' },
  jefatura: { id: 'u-jefatura', nombre: 'Ana Torres', perfil: 'jefatura', telegram: '@atorres_ops' },
  gerencia: { id: 'u-gerencia', nombre: 'Carlos Mendoza', perfil: 'gerencia' },
};

export const USUARIO_SISTEMA: Usuario = { id: 'sistema', nombre: 'AquaMind (automático)', perfil: 'jefatura' };

/** Otros operadores que aparecen en la historia (no se eligen en el selector de perfil). */
export const OTROS_USUARIOS: Usuario[] = [
  { id: 'u-tecnico2', nombre: 'Rosa Huamán', perfil: 'tecnico', telegram: '@rhuaman_turno' },
];

const TODOS = [...Object.values(USUARIOS), ...OTROS_USUARIOS];

export function nombreUsuario(id: string): string {
  if (id === USUARIO_SISTEMA.id) return USUARIO_SISTEMA.nombre;
  return TODOS.find((u) => u.id === id)?.nombre ?? id;
}

export function perfilDeUsuario(id: string): Perfil | null {
  if (id === USUARIO_SISTEMA.id) return 'jefatura';
  return TODOS.find((u) => u.id === id)?.perfil ?? null;
}

export const NOMBRE_PERFIL: Record<Perfil, string> = {
  tecnico: 'Técnico de turno',
  jefatura: 'Jefatura de operaciones',
  gerencia: 'Gerencia',
};
