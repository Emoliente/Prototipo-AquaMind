import { Briefcase, ChevronDown, HardHat, Moon, Play, Sun, UserCog, type LucideIcon } from 'lucide-react';
import { useModoDemo } from '@/demo/useModoDemo';
import type { Perfil } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { USUARIOS, NOMBRE_PERFIL } from '@/config/usuarios';
import { useOperacion } from '@/store/useOperacion';
import { Menu, OpcionMenu } from '@/components/ui/Menu';

const ICONO: Record<Perfil, LucideIcon> = { tecnico: HardHat, jefatura: UserCog, gerencia: Briefcase };
const RESUMEN: Record<Perfil, string> = {
  tecnico: 'Opera purgas y bombas, registra lecturas',
  jefatura: 'Todo, más modo Automático y configuración',
  gerencia: 'Consulta indicadores, ahorro y riesgo',
};

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

/** Sin login en la demo: el perfil cambia lo que se ve y lo que se puede hacer. */
export function SelectorPerfil({ compacto }: { compacto?: boolean }) {
  const { perfil, setPerfil, tema, alternarTema } = useOperacion();
  const u = USUARIOS[perfil];
  const iniciarDemo = useModoDemo((s) => s.pedirInicio);
  return (
    <Menu
      etiqueta={`Perfil: ${NOMBRE_PERFIL[perfil]}`}
      ancho="w-[20rem]"
      claseDisparador={cn(
        'flex h-12 items-center gap-2.5 rounded-btn pl-1.5 pr-2 hover:bg-surface-2',
        compacto && 'w-12 justify-center pr-1.5',
      )}
      disparador={(abierto) => (
        <>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-label font-semibold text-fg">
            {iniciales(u.nombre)}
          </span>
          {!compacto && (
            <span className="hidden min-w-0 flex-col text-left xl:flex">
              <span className="truncate text-label font-semibold leading-tight text-fg">{u.nombre}</span>
              <span className="truncate text-[0.75rem] leading-tight text-fg-muted">{NOMBRE_PERFIL[perfil]}</span>
            </span>
          )}
          {!compacto && (
            <ChevronDown className={cn('hidden size-4 text-fg-muted transition-transform xl:block', abierto && 'rotate-180')} aria-hidden />
          )}
        </>
      )}
    >
      {(cerrar) => (
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 pt-1 text-label font-semibold text-fg-subtle">Ver como (demo sin login)</p>
          {(Object.keys(USUARIOS) as Perfil[]).map((p) => {
            const I = ICONO[p];
            return (
              <OpcionMenu
                key={p}
                icono={<I />}
                titulo={NOMBRE_PERFIL[p]}
                descripcion={`${USUARIOS[p].nombre} · ${RESUMEN[p]}`}
                activo={p === perfil}
                onClick={() => {
                  setPerfil(p);
                  cerrar();
                }}
              />
            );
          })}
          <div className="my-1 border-t border-line" />
          <OpcionMenu
            icono={<Play />}
            titulo="Iniciar modo demo"
            descripcion="Recorrido automático de 60 s"
            onClick={() => {
              iniciarDemo();
              cerrar();
            }}
          />
          <OpcionMenu
            icono={tema === 'dark' ? <Sun /> : <Moon />}
            titulo={tema === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
            onClick={() => {
              alternarTema();
              cerrar();
            }}
          />
        </div>
      )}
    </Menu>
  );
}
