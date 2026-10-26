import { memo, useId, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useAncho } from '@/lib/useAncho';

export type ColorSerie = 'accent' | 'ok' | 'warn' | 'crit' | 'sludge' | 'stale';

const COLOR: Record<ColorSerie, string> = {
  accent: 'var(--accent)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  sludge: 'var(--sludge-top)',
  stale: 'var(--stale)',
};

interface Props {
  datos: number[];
  color?: ColorSerie;
  alto?: number;
  /** Línea de referencia horizontal (p. ej. línea base). */
  referencia?: number;
  /** Trazo discontinuo para datos desactualizados. */
  discontinuo?: boolean;
  className?: string;
}

/** Mini gráfico de tendencia, dibujado en píxeles reales para que el trazo no se deforme. */
export const Sparkline = memo(function Sparkline({ datos, color = 'accent', alto = 40, referencia, discontinuo, className }: Props) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const id = `sp${useId().replace(/:/g, '')}`;
  const trazo = COLOR[color];

  const { linea, area, ultimo, yRef } = useMemo(() => {
    if (datos.length < 2 || ancho === 0) return { linea: '', area: '', ultimo: null, yRef: null };
    const valores = referencia !== undefined ? [...datos, referencia] : datos;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    const pad = 4;
    const w = ancho - pad * 2;
    const h = alto - pad * 2;
    const pts = datos.map((v, i) => [pad + (i / (datos.length - 1)) * w, pad + h - ((v - min) / rango) * h]);
    const linea = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${linea} L${pts[pts.length - 1][0].toFixed(1)},${alto} L${pts[0][0].toFixed(1)},${alto} Z`;
    const yRef = referencia !== undefined ? pad + h - ((referencia - min) / rango) * h : null;
    return { linea, area, ultimo: pts[pts.length - 1], yRef };
  }, [datos, ancho, alto, referencia]);

  return (
    <div ref={ref} className={cn('w-full', className)} style={{ height: alto }} aria-hidden>
      {ancho > 0 && linea && (
        <svg width={ancho} height={alto} className="block overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trazo} stopOpacity={0.16} />
              <stop offset="100%" stopColor={trazo} stopOpacity={0} />
            </linearGradient>
          </defs>
          {yRef !== null && (
            <line x1={0} x2={ancho} y1={yRef} y2={yRef} stroke="var(--line-strong)" strokeDasharray="3 4" />
          )}
          {!discontinuo && <path d={area} fill={`url(#${id})`} />}
          <path
            d={linea}
            fill="none"
            stroke={trazo}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={discontinuo ? '3 4' : undefined}
          />
          {ultimo && !discontinuo && (
            <circle cx={ultimo[0]} cy={ultimo[1]} r={3} fill="var(--surface-1)" stroke={trazo} strokeWidth={2} />
          )}
        </svg>
      )}
    </div>
  );
});
