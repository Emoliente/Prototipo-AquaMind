import { ChevronDown } from 'lucide-react';
import type { ModoOperacion } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { usePlantaCampos } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { puede } from '@/app/permisos';
import { Menu, OpcionMenu } from '@/components/ui/Menu';
import { MODOS } from './ModoChip';

/** Modo de operación siempre visible; cambiarlo depende del perfil. */
export function SelectorModo({ compacto }: { compacto?: boolean }) {
  const perfil = useOperacion((s) => s.perfil);
  const comando = useComando();
  const abrirAutomatico = useOperacion((s) => s.setAutomatico);

  const modo = usePlantaCampos((p) => p.modo) ?? 'asistido';
  const { icono: Icono, texto } = MODOS[modo];
  const opera = puede(perfil, 'operar');
  const auto = modo === 'automatico';

  const elegir = (m: ModoOperacion, cerrar: () => void) => {
    cerrar();
    if (m === modo) return;
    if (m === 'automatico') abrirAutomatico(true);
    else comando({ tipo: 'modo', modo: m });
  };

  return (
    <Menu
      etiqueta={`Modo de operación: ${texto}`}
      deshabilitado={!opera}
      ancho="w-[22rem]"
      claseDisparador={cn(
        'inline-flex h-12 items-center gap-2 rounded-full border px-3.5 text-label font-semibold',
        auto ? 'border-accent-ring bg-accent-soft text-accent' : 'border-line-strong bg-surface-2 text-fg',
        opera ? 'hover:border-accent-ring' : 'cursor-default disabled:cursor-default',
        compacto && 'w-12 justify-center px-0',
      )}
      disparador={(abierto) => (
        <>
          <Icono className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
          {!compacto && (
            <span className="whitespace-nowrap">
              <span className="font-normal text-fg-muted">Modo </span>
              {texto}
            </span>
          )}
          {!compacto && opera && (
            <ChevronDown className={cn('size-4 text-fg-muted transition-transform', abierto && 'rotate-180')} aria-hidden />
          )}
        </>
      )}
    >
      {(cerrar) => (
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 pt-1 text-label font-semibold text-fg-subtle">Modo de operación</p>
          {(Object.keys(MODOS) as ModoOperacion[]).map((m) => {
            const M = MODOS[m];
            const bloqueado = m === 'automatico' && !puede(perfil, 'modo_automatico');
            return (
              <OpcionMenu
                key={m}
                icono={<M.icono />}
                titulo={M.texto}
                descripcion={M.descripcion}
                activo={m === modo}
                deshabilitado={bloqueado}
                motivo="Solo jefatura de operaciones"
                onClick={() => elegir(m, cerrar)}
              />
            );
          })}
        </div>
      )}
    </Menu>
  );
}
