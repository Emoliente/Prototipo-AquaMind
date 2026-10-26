import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Boton } from '@/components/ui/Boton';
import { Valor } from '@/components/ui/Valor';
import { useEnVista } from '@/lib/useEnVista';
import { FlujoCapa, type Lienzo } from './CapasAnimadas';

export const PASO_CM = 10;

interface Props {
  aperturaCm: number;
  aperturaMaxCm?: number;
  /** Si no se pasa, el control es solo de lectura. */
  alCambiar?: (cm: number) => void;
  deshabilitado?: boolean;
  className?: string;
}

const ALTO_HUECO = 70; // px para 100 cm (la hoja sube por encima del hueco)
const PX_CM = ALTO_HUECO / 100;
const BASE = 158;
const LIENZO: Lienzo = { w: 200, h: 168 };

/** Compuerta de purga dibujada: la hoja sube por pasos de 10 cm. */
export function CompuertaControl({
  aperturaCm,
  aperturaMaxCm = 100,
  alCambiar,
  deshabilitado,
  className,
}: Props) {
  const abiertaPx = aperturaCm * PX_CM;
  const abierta = aperturaCm > 0;
  const [ref, enVista] = useEnVista<HTMLDivElement>();
  const cambiar = (delta: number) =>
    alCambiar?.(Math.max(0, Math.min(aperturaMaxCm, aperturaCm + delta)));

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div ref={ref} className="relative w-full max-w-[220px]">
      <svg viewBox="0 0 200 168" className="block h-auto w-full" role="img" aria-label={`Compuerta abierta ${aperturaCm} cm`}>
        {/* regla de 10 en 10 cm */}
        <g className="num" fontSize="9" fill="var(--fg-subtle)">
          {Array.from({ length: 11 }, (_, i) => i * 10).map((c) => (
            <g key={c}>
              <line
                x1={c % 50 === 0 ? 22 : 26}
                x2={32}
                y1={BASE - c * PX_CM}
                y2={BASE - c * PX_CM}
                stroke={c <= aperturaCm && abierta ? 'var(--accent)' : 'var(--line-strong)'}
                strokeWidth={1.2}
              />
              {c % 50 === 0 && (
                <text x={18} y={BASE - c * PX_CM + 3} textAnchor="end">
                  {c}
                </text>
              )}
            </g>
          ))}
        </g>
        {/* marco */}
        <rect x={52} y={14} width={8} height={BASE - 6} rx={2} fill="var(--surface-3)" stroke="var(--line-strong)" />
        <rect x={152} y={14} width={8} height={BASE - 6} rx={2} fill="var(--surface-3)" stroke="var(--line-strong)" />
        <rect x={46} y={8} width={120} height={10} rx={3} fill="var(--surface-3)" stroke="var(--line-strong)" />
        <line x1={40} x2={172} y1={BASE + 1} y2={BASE + 1} stroke="var(--line-strong)" strokeWidth={2.5} strokeLinecap="round" />
        {/* agua con lodo pasando por debajo (su movimiento va en la capa de abajo) */}
        {abierta && <rect x={60} y={BASE - abiertaPx} width={92} height={abiertaPx} fill="var(--sludge)" opacity={0.35} />}
        {/* hoja de la compuerta */}
        <motion.g
          initial={false}
          animate={{ y: -abiertaPx }}
          transition={{ type: 'spring', stiffness: 170, damping: 22 }}
        >
          <rect
            x={60}
            y={BASE - ALTO_HUECO - 2}
            width={92}
            height={ALTO_HUECO + 2}
            rx={3}
            fill="var(--surface-2)"
            stroke={abierta ? 'var(--accent)' : 'var(--fg-subtle)'}
            strokeWidth={1.5}
          />
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={66}
              x2={146}
              y1={BASE - ALTO_HUECO * f}
              y2={BASE - ALTO_HUECO * f}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
          ))}
        </motion.g>
      </svg>
      {abierta && enVista && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[0.3, 0.6, 0.85].map((f, i) => (
            <FlujoCapa
              key={f}
              lienzo={LIENZO}
              x={60}
              y={BASE - abiertaPx * f}
              largo={92}
              grosor={1.5}
              color="var(--sludge-top)"
              opacidad={1}
              // Misma velocidad que antes (48 px por ciclo) con guiones de 24.
              duracion={(1 + i * 0.3) / 2}
              periodo={24}
              guion={10}
            />
          ))}
        </div>
      )}
      </div>

      <div className="flex w-full max-w-[280px] items-center justify-between gap-3">
        {alCambiar && (
          <Boton
            tamano="icono"
            aria-label="Cerrar 10 cm"
            onClick={() => cambiar(-PASO_CM)}
            disabled={deshabilitado || aperturaCm <= 0}
            icono={<Minus />}
          />
        )}
        <div className="flex flex-1 flex-col items-center">
          <Valor valor={aperturaCm} unidad="cm" tamano="md" />
          <span className="whitespace-nowrap text-label text-fg-muted">
            máx. <span className="num">{aperturaMaxCm}</span> cm
          </span>
          <span className="whitespace-nowrap text-[0.75rem] text-fg-subtle">pasos de {PASO_CM} cm</span>
        </div>
        {alCambiar && (
          <Boton
            tamano="icono"
            aria-label="Abrir 10 cm"
            onClick={() => cambiar(PASO_CM)}
            disabled={deshabilitado || aperturaCm >= aperturaMaxCm}
            icono={<Plus />}
          />
        )}
      </div>
    </div>
  );
}
