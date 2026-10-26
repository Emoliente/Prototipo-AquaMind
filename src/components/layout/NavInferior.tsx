import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { modulosDe } from '@/app/permisos';
import { useOperacion } from '@/store/useOperacion';

/** Navegación inferior en celular (los 5 primeros módulos del perfil). */
export function NavInferior() {
  const perfil = useOperacion((s) => s.perfil);
  const modulos = modulosDe(perfil).slice(0, 5);
  return (
    <nav
      aria-label="Módulos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${modulos.length}, minmax(0, 1fr))` }}>
        {modulos.map((m) => {
          const Icono = m.icono;
          return (
            <li key={m.ruta}>
              <NavLink
                to={`/${m.ruta}`}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors',
                    isActive ? 'text-accent' : 'text-fg-muted',
                  )
                }
              >
                <Icono className="size-5" strokeWidth={2} aria-hidden />
                <span className="max-w-full truncate px-1">{m.corto}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
