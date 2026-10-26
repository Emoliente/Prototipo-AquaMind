import { useId } from 'react';
import { motion } from 'framer-motion';
import type { BombaEstado } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { aPaso } from '@/lib/movimiento';
import { formatoNumero } from '@/lib/format';

/*
 * Corte de la quebrada: el lodo purgado entra por la galería (izquierda) y
 * las 3 bombas sumergibles lo evacúan por sus tuberías (derecha arriba).
 */
const W = 640;
const H = 270;
const FONDO = 222;
const BORDE = 70;
const BOMBAS_X = [210, 330, 450];
const SALIDA_Y = 34;

function yNivel(fraccion: number) {
  return FONDO - (FONDO - BORDE) * Math.max(0, Math.min(1, fraccion));
}

interface Props {
  volumenM3: number;
  capacidadM3: number;
  bombas: BombaEstado[];
  /** Hay una purga en curso: entra lodo por la galería. */
  entrando?: boolean;
  className?: string;
}

export function QuebradaVista({ volumenM3, capacidadM3, bombas, entrando, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const f = volumenM3 / capacidadM3;
  const y = aPaso(yNivel(Math.max(0.02, f)));
  const cuenco = `M60,${BORDE} L110,${FONDO} Q112,${FONDO + 8} 120,${FONDO + 8} L520,${FONDO + 8} Q528,${FONDO + 8} 530,${FONDO} L580,${BORDE}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('block h-auto w-full', className)} role="img" aria-label={`Quebrada con ${formatoNumero(volumenM3)} m³ de lodo pendiente de ${formatoNumero(capacidadM3)} m³`}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={`${cuenco} Z`} />
        </clipPath>
        <linearGradient id={`l${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--sludge-top)" stopOpacity={0.95} />
          <stop offset="1" stopColor="var(--sludge-deep)" />
        </linearGradient>
      </defs>

      {/* terreno */}
      <path d={`M0,${BORDE} H60 ${cuenco.slice(cuenco.indexOf('L'))} H${W}`} fill="none" stroke="var(--line-strong)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`${cuenco} Z`} fill="var(--surface-2)" />

      {/* lodo */}
      <g clipPath={`url(#c${uid})`}>
        <motion.g initial={false} animate={{ y }} transition={{ type: 'spring', stiffness: 50, damping: 16 }}>
          <rect x={0} y={0} width={W} height={H} fill={`url(#l${uid})`} />
          <path d={`M0,0 Q80,-4 160,0 T320,0 T480,0 T640,0`} fill="none" stroke="var(--sludge-top)" strokeWidth={2} />
        </motion.g>
      </g>

      {/* regla de volumen */}
      <g className="num" fontSize="10" fill="var(--fg-subtle)">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={596} x2={604} y1={yNivel(v)} y2={yNivel(v)} stroke="var(--line-strong)" />
            <text x={610} y={yNivel(v) + 3.5}>{formatoNumero(capacidadM3 * v)}</text>
          </g>
        ))}
        <text x={610} y={BORDE - 14}>m³</text>
      </g>

      {/* entrada desde la galería de purga */}
      <rect x={0} y={BORDE - 26} width={66} height={14} rx={3} fill="var(--surface-3)" stroke="var(--line-strong)" />
      {entrando && (
        <path d={`M62,${BORDE - 19} Q84,${BORDE - 18} 92,${BORDE + 10} T100,${y}`} fill="none" stroke="var(--sludge-top)" strokeWidth={5} strokeDasharray="8 8" strokeLinecap="round" className="anim-flujo" style={{ animationDuration: '0.8s' }} />
      )}
      <text x={4} y={BORDE - 34} fontSize="11" fill="var(--fg-muted)">
        Desde la galería de purga
      </text>

      {/* tubería de descarga común */}
      <path d={`M${BOMBAS_X[0]},${SALIDA_Y} H${W - 50}`} fill="none" stroke="var(--line-strong)" strokeWidth={8} strokeLinecap="round" />
      <path d={`M${BOMBAS_X[0]},${SALIDA_Y} H${W - 50}`} fill="none" stroke="var(--surface-2)" strokeWidth={4} strokeLinecap="round" />
      {bombas.some((b) => b.estado === 'en_marcha') && (
        <path d={`M${BOMBAS_X[0]},${SALIDA_Y} H${W - 50}`} fill="none" stroke="var(--sludge-top)" strokeWidth={4} strokeDasharray="8 10" className="anim-flujo" style={{ animationDuration: '0.9s' }} />
      )}
      <text x={W - 50} y={SALIDA_Y - 10} fontSize="11" textAnchor="end" fill="var(--fg-muted)">
        Evacuación →
      </text>

      {/* bombas sumergibles */}
      {bombas.map((b, i) => {
        const x = BOMBAS_X[i];
        const enMarcha = b.estado === 'en_marcha';
        const color = enMarcha ? 'var(--accent)' : b.estado === 'falla' ? 'var(--crit)' : 'var(--fg-subtle)';
        const cy = FONDO - 40;
        return (
          <g key={b.id}>
            <title>{`Bomba ${b.id.slice(1)} · ${b.modelo}`}</title>
            <line x1={x} x2={x} y1={cy - 26} y2={SALIDA_Y} stroke="var(--line-strong)" strokeWidth={6} />
            <line x1={x} x2={x} y1={cy - 26} y2={SALIDA_Y} stroke="var(--surface-2)" strokeWidth={2.5} />
            {enMarcha && (
              <line x1={x} x2={x} y1={cy - 26} y2={SALIDA_Y} stroke="var(--sludge-top)" strokeWidth={3} strokeDasharray="6 8" className="anim-flujo" style={{ animationDuration: '0.7s' }} />
            )}
            <rect x={x - 24} y={cy - 26} width={48} height={52} rx={10} fill="var(--surface-1)" stroke={color} strokeWidth={2} />
            <g transform={`translate(${x - 18},${cy - 18}) scale(0.75)`}>
              <g className={enMarcha ? 'anim-giro' : undefined} style={{ transformBox: 'view-box', transformOrigin: '24px 24px' }}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <path key={a} d="M24 24 C 25 17, 30 13, 35 12.5 C 32 16, 28 20, 24 24 Z" fill={color} fillOpacity={enMarcha ? 0.95 : 0.55} transform={`rotate(${a} 24 24)`} />
                ))}
              </g>
              <circle cx={24} cy={24} r={3.5} fill="var(--surface-1)" stroke={color} strokeWidth={1.5} />
            </g>
            <rect x={x - 16} y={cy + 30} width={32} height={18} rx={9} fill="var(--surface-1)" fillOpacity={0.9} />
            <text x={x} y={cy + 43} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--fg)">
              B{b.id.slice(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
