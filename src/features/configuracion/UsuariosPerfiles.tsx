import { memo, useMemo } from 'react';
import { Bot, Check, Minus, ShieldCheck, Users } from 'lucide-react';
import type { RegistroAuditoria } from '@/data/DataSource';
import type { Perfil, Usuario } from '@/types/dominio';
import { MODULOS, puede, puedeVer, type Accion } from '@/app/permisos';
import { NOMBRE_PERFIL, OTROS_USUARIOS, USUARIO_SISTEMA, USUARIOS } from '@/config/usuarios';
import { cn } from '@/lib/cn';
import { diaYHora } from '@/lib/format';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';

const PERFILES: Perfil[] = ['tecnico', 'jefatura', 'gerencia'];
const CORTO: Record<Perfil, string> = { tecnico: 'Técnico', jefatura: 'Jefatura', gerencia: 'Gerencia' };
const PERSONAS: Usuario[] = [USUARIOS.tecnico, ...OTROS_USUARIOS, USUARIOS.jefatura, USUARIOS.gerencia];

const ACCIONES: { accion: Accion; texto: string }[] = [
  { accion: 'operar', texto: 'Purgar, mover compuertas y bombas' },
  { accion: 'parada_emergencia', texto: 'Parada de emergencia' },
  { accion: 'registrar_lectura', texto: 'Registrar miras, notas y muestras' },
  { accion: 'modo_automatico', texto: 'Activar el modo Automático' },
  { accion: 'aprobar_calibracion', texto: 'Aprobar calibraciones' },
  { accion: 'editar_configuracion', texto: 'Cambiar la configuración' },
];

/** Sí o No con ícono y texto (nunca solo color). */
function Permiso({ si }: { si: boolean }) {
  return si ? (
    <span className="inline-flex items-center gap-1 text-label font-semibold text-ok">
      <Check className="size-4" aria-hidden /> Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-label text-fg-subtle">
      <Minus className="size-4" aria-hidden /> No
    </span>
  );
}

/** Personas con su perfil y actividad, y la tabla de quién puede ver y hacer qué. */
export const UsuariosPerfiles = memo(function UsuariosPerfiles({
  auditoria,
  hoy,
  className,
}: {
  auditoria: RegistroAuditoria[];
  /** Inicio del día de planta (para "hoy" / "ayer"). */
  hoy: number;
  className?: string;
}) {
  const actividad = useMemo(() => {
    const m = new Map<string, { ultima: number; total: number }>();
    for (const a of auditoria) {
      const x = m.get(a.usuarioId);
      if (x) x.total++;
      else m.set(a.usuarioId, { ultima: a.t, total: 1 });
    }
    return m;
  }, [auditoria]);

  return (
    <Tarjeta className={cn('flex flex-col gap-6', className)}>
      <EncabezadoTarjeta className="flex-none" icono={<Users className="size-5" />} titulo="Usuarios y perfiles" subtitulo="Quién usa AquaMind y con qué permisos" />

      <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
        {[...PERSONAS, USUARIO_SISTEMA].map((u) => {
          const act = actividad.get(u.id);
          const sistema = u.id === USUARIO_SISTEMA.id;
          return (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full text-label font-semibold',
                  sistema ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-fg',
                )}
                aria-hidden
              >
                {sistema ? <Bot className="size-5" /> : u.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-fg">{u.nombre}</p>
                <p className="truncate text-label text-fg-muted">
                  {sistema ? 'Modo Automático y tareas programadas' : NOMBRE_PERFIL[u.perfil]}
                  {u.telegram && <> · <span className="num">{u.telegram}</span></>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[0.75rem] text-fg-muted">Última orden</p>
                <p className="num text-label text-fg">{act ? diaYHora(act.ultima, hoy) : '—'}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-body font-semibold text-fg">
          <ShieldCheck className="size-4 text-fg-muted" aria-hidden /> Qué puede hacer cada perfil
        </h4>
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Permisos por perfil</caption>
            <thead>
              <tr className="border-b border-line-strong bg-surface-2 text-label text-fg-muted">
                <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">Permiso</th>
                {PERFILES.map((p) => (
                  <th key={p} scope="col" className="px-2 py-2.5 font-semibold sm:px-3">{CORTO[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th colSpan={4} scope="colgroup" className="bg-surface-2/50 px-4 pb-1 pt-3 text-[0.75rem] font-semibold uppercase tracking-wide text-fg-subtle">
                  Hacer
                </th>
              </tr>
              {ACCIONES.map((a) => (
                <tr key={a.accion} className="border-b border-line">
                  <th scope="row" className="px-3 py-2 text-label font-normal text-fg sm:px-4">{a.texto}</th>
                  {PERFILES.map((p) => (
                    <td key={p} className="whitespace-nowrap px-2 py-2 sm:px-3"><Permiso si={puede(p, a.accion)} /></td>
                  ))}
                </tr>
              ))}
              <tr>
                <th colSpan={4} scope="colgroup" className="bg-surface-2/50 px-4 pb-1 pt-3 text-[0.75rem] font-semibold uppercase tracking-wide text-fg-subtle">
                  Ver
                </th>
              </tr>
              {MODULOS.map((m) => (
                <tr key={m.ruta} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-label font-normal text-fg sm:px-4">{m.texto}</th>
                  {PERFILES.map((p) => (
                    <td key={p} className="whitespace-nowrap px-2 py-2 sm:px-3"><Permiso si={puedeVer(p, m.ruta)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[0.75rem] text-fg-muted">
          En la demo no hay inicio de sesión: el perfil se elige en el encabezado. En producción cada persona entra con su cuenta y estos permisos se aplican también en el servidor.
        </p>
      </div>
    </Tarjeta>
  );
});
