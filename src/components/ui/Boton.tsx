import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';
export type TamanoBoton = 'md' | 'lg' | 'icono';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  icono?: ReactNode;
  iconoDerecha?: ReactNode;
}

const VARIANTES: Record<VarianteBoton, string> = {
  primario:
    'bg-accent text-fg-on-accent hover:bg-accent-strong shadow-1 disabled:bg-surface-3 disabled:text-fg-subtle',
  secundario:
    'bg-surface-3 text-fg border border-line-strong hover:bg-surface-hover disabled:text-fg-subtle',
  fantasma: 'bg-transparent text-fg-muted hover:bg-surface-3 hover:text-fg disabled:text-fg-subtle',
  peligro: 'bg-crit-strong text-white hover:brightness-110 shadow-1 disabled:opacity-50',
};

// Todos los tamaños miden 48 px o más para uso con guantes y en tablet.
const TAMANOS: Record<TamanoBoton, string> = {
  md: 'h-12 px-5 gap-2 text-body',
  lg: 'h-14 px-6 gap-2.5 text-title',
  icono: 'size-12 justify-center',
};

export const Boton = forwardRef<HTMLButtonElement, Props>(function Boton(
  { variante = 'secundario', tamano = 'md', icono, iconoDerecha, className, children, type, ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-btn font-semibold',
        'transition-[background-color,color,transform,box-shadow,filter] duration-150 ease-out',
        'active:scale-[0.97] disabled:active:scale-100',
        VARIANTES[variante],
        TAMANOS[tamano],
        className,
      )}
      {...resto}
    >
      {icono && <span className="grid shrink-0 place-items-center [&>svg]:size-5">{icono}</span>}
      {children}
      {iconoDerecha && (
        <span className="grid shrink-0 place-items-center [&>svg]:size-5">{iconoDerecha}</span>
      )}
    </button>
  );
});
