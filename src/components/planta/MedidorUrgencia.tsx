import { motion } from 'framer-motion';
import { CalendarClock, Hourglass, Zap, type LucideIcon } from 'lucide-react';
import type { AccionRecomendada } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { accionPorUrgencia, TEXTO_ACCION } from '@/lib/estado';
import { useNumeroAnimado } from '@/lib/useNumeroAnimado';

// Arco de 240°, abierto hacia abajo.
const CX = 120;
const CY = 112;
const R = 92;
const INICIO = 150;
const BARRIDO = 240;

function punto(grados: number, r = R) {
  const rad = (grados * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)] as const;
}
function arco(desde: number, hasta: number, r = R) {
  const a = INICIO + (desde / 100) * BARRIDO;
  const b = INICIO + (hasta / 100) * BARRIDO;
  const [x1, y1] = punto(a, r);
  const [x2, y2] = punto(b, r);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

const ZONA: Record<AccionRecomendada, { color: string; texto: string; icono: LucideIcon; suave: string }> = {
  esperar: { color: 'var(--ok)', texto: 'text-ok', icono: Hourglass, suave: 'var(--ok-soft)' },
  programar: { color: 'var(--warn)', texto: 'text-warn', icono: CalendarClock, suave: 'var(--warn-soft)' },
  purgar_ya: { color: 'var(--crit)', texto: 'text-crit', icono: Zap, suave: 'var(--crit-soft)' },
};

interface Props {
  urgencia: number;
  /** Subtítulo bajo la recomendación (p. ej. "Nave 2"). */
  objetivo?: string;
  /** Versión pequeña: sin marcas de texto en el arco. */
  compacto?: boolean;
  className?: string;
}

/** Medidor de urgencia 0–100 con la recomendación en grande. */
export function MedidorUrgencia({ urgencia, objetivo, compacto, className }: Props) {
  // Entera, como se muestra: así el arco no se reanima cada segundo por décimas invisibles.
  const u = Math.round(Math.max(0, Math.min(100, urgencia)));
  const accion = accionPorUrgencia(u);
  const zona = ZONA[accion];
  const Icono = zona.icono;
  const cifra = useNumeroAnimado<SVGTextElement>(u, (v) => String(Math.round(v)), 0.8, 1);
  const [mx, my] = punto(INICIO + (u / 100) * BARRIDO);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg viewBox={compacto ? '0 4 240 168' : '0 0 240 196'} className="w-full max-w-[300px]" role="img" aria-label={`Urgencia ${Math.round(u)} de 100: ${TEXTO_ACCION[accion]}`}>
        {/* zonas: esperar · programar · purgar ya */}
        <path d={arco(0, 39.4)} fill="none" stroke="var(--ok-soft)" strokeWidth={16} />
        <path d={arco(40.6, 69.4)} fill="none" stroke="var(--warn-soft)" strokeWidth={16} />
        <path d={arco(70.6, 100)} fill="none" stroke="var(--crit-soft)" strokeWidth={16} />
        {/* valor */}
        <motion.path
          d={arco(0, 100)}
          fill="none"
          stroke={zona.color}
          strokeWidth={16}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: Math.max(0.005, u / 100) }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          style={{ transition: 'stroke 300ms ease' }}
        />
        {/* marcas de umbral */}
        {[40, 70].map((v) => {
          const g = INICIO + (v / 100) * BARRIDO;
          const [x1, y1] = punto(g, R - 13);
          const [x2, y2] = punto(g, R + 13);
          const [tx, ty] = punto(g, R + 24);
          return (
            <g key={v}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--surface-1)" strokeWidth={3} />
              {!compacto && (
                <text x={tx} y={ty + 3} textAnchor="middle" fontSize="10" className="num" fill="var(--fg-subtle)">
                  {v}
                </text>
              )}
            </g>
          );
        })}
        <motion.circle
          initial={false}
          animate={{ cx: mx, cy: my }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          r={9}
          fill="var(--surface-1)"
          stroke={zona.color}
          strokeWidth={3.5}
        />
        {/* cifra */}
        <text ref={cifra} x={CX} y={CY + 6} textAnchor="middle" className="num" fontSize="52" fontWeight={600} fill="var(--fg)">
          {Math.round(u)}
        </text>
        {!compacto && (
          <text x={CX} y={CY + 28} textAnchor="middle" fontSize="11" fill="var(--fg-muted)">
            urgencia de 0 a 100
          </text>
        )}
        {!compacto && (() => {
          const [ax, ay] = punto(INICIO, R);
          const [bx, by] = punto(INICIO + BARRIDO, R);
          return (
            <g className="num" fontSize="10" fill="var(--fg-subtle)">
              <text x={ax - 14} y={ay + 4} textAnchor="end">0</text>
              <text x={bx + 14} y={by + 4} textAnchor="start">100</text>
            </g>
          );
        })()}
      </svg>
      <div className={cn('flex flex-col items-center gap-1 text-center', compacto ? 'mt-1' : '-mt-8')}>
        <span
          className={cn(
            'inline-flex items-center gap-2 whitespace-nowrap font-bold',
            compacto ? 'text-body' : 'text-heading',
            zona.texto,
          )}
        >
          <Icono className={compacto ? 'size-4' : 'size-6'} strokeWidth={2.25} aria-hidden />
          {TEXTO_ACCION[accion]}
        </span>
        {objetivo && <span className="text-body font-medium text-fg-muted">{objetivo}</span>}
      </div>
    </div>
  );
}
