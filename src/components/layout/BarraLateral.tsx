import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { modulosDe } from '@/app/permisos';
import { useOperacion } from '@/store/useOperacion';
import { usePlantaCampos } from '@/store/useTelemetria';
import { Logo } from './Logo';
import { ControlSimulacion } from './ControlSimulacion';

/** Navegación principal (tablet y escritorio). En tablet se reduce a íconos. */
export function BarraLateral() {
  const perfil = useOperacion((s) => s.perfil);
  const pendientes = usePlantaCampos((p) => p.alertas.filter((a) => !a.reconocida && a.severidad !== 'info').length) ?? 0;

  return (
    <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r border-line bg-surface-1 md:flex xl:w-64">
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line px-[22px] xl:px-5">
        <Logo />
        <div className="hidden min-w-0 xl:block">
          <p className="truncate text-body font-semibold leading-tight text-fg">AquaMind</p>
          <p className="truncate text-[0.75rem] text-fg-muted">Desarenador Miraflores</p>
        </div>
      </div>

      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {modulosDe(perfil).map((m) => {
            const Icono = m.icono;
            return (
              <li key={m.ruta}>
                <NavLink
                  to={`/${m.ruta}`}
                  title={m.texto}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-12 items-center gap-3 rounded-btn px-3.5 text-label font-semibold transition-colors duration-150',
                      'justify-center xl:justify-start',
                      isActive ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-accent" aria-hidden />}
                      <Icono className={cn('size-5 shrink-0', isActive && 'text-accent')} strokeWidth={2} aria-hidden />
                      <span className="hidden truncate xl:inline">{m.texto}</span>
                      {m.ruta === 'alertas' && pendientes > 0 && (
                        <span className="num absolute right-2 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-crit-strong px-1 text-[0.7rem] font-bold text-white xl:static xl:ml-auto">
                          {pendientes}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden shrink-0 p-3 xl:block">
        <ControlSimulacion />
      </div>
    </aside>
  );
}
