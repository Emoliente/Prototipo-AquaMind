import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { useNumeroAnimado } from '@/lib/useNumeroAnimado';

export type TamanoValor = 'display' | 'lg' | 'md' | 'sm' | 'xs';

const TAMANO_NUM: Record<TamanoValor, string> = {
  display: 'text-display font-semibold',
  lg: 'text-value-lg font-semibold',
  md: 'text-value font-semibold',
  sm: 'text-value-sm font-semibold',
  xs: 'text-title font-medium',
};
const TAMANO_UNIDAD: Record<TamanoValor, string> = {
  display: 'text-title',
  lg: 'text-title',
  md: 'text-body',
  sm: 'text-label',
  xs: 'text-label',
};

interface Props {
  valor: number | null | undefined;
  unidad?: string;
  decimales?: number;
  tamano?: TamanoValor;
  /** Atenúa el número (dato desactualizado). */
  atenuado?: boolean;
  animar?: boolean;
  /** Texto antes del número (p. ej. "S/"). */
  prefijo?: string;
  className?: string;
}

/** Número de planta: cifras tabulares, unidad siempre visible al lado. */
export function Valor({
  valor,
  unidad,
  decimales = 0,
  tamano = 'md',
  atenuado,
  animar = true,
  prefijo,
  className,
}: Props) {
  const hayValor = valor !== null && valor !== undefined && Number.isFinite(valor);
  const ref = useNumeroAnimado<HTMLSpanElement>(hayValor && animar ? valor : null, (v) => formatoNumero(v, decimales), undefined, 10 ** -decimales);

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      {prefijo && (
        <span className={cn('font-medium text-fg-muted', TAMANO_UNIDAD[tamano])}>{prefijo}</span>
      )}
      <span
        ref={ref}
        className={cn(
          'num tracking-tight transition-colors duration-300',
          TAMANO_NUM[tamano],
          atenuado || !hayValor ? 'text-fg-subtle' : 'text-fg',
        )}
      >
        {hayValor ? formatoNumero(valor, decimales) : '—'}
      </span>
      {unidad && (
        <span className={cn('font-medium text-fg-muted', TAMANO_UNIDAD[tamano])}>{unidad}</span>
      )}
    </span>
  );
}
