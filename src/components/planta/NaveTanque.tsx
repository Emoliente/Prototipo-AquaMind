import { memo, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { useEnVista } from '@/lib/useEnVista';
import { aPaso } from '@/lib/movimiento';
import { FlujoCapa, OlaCapa, ParticulasCapa, type Lienzo } from './CapasAnimadas';

/** Escala del corte: el interior del tanque representa 400 cm de altura. */
export const ESCALA_CM = 400;

const X0 = 46; // pared izquierda (interior)
const X1 = 306; // pared derecha (interior)
const Y0 = 14; // borde superior
const Y1 = 190; // fondo
const ALTO = Y1 - Y0;
const ANCHO = X1 - X0; // 260 → 4 olas de 65 px
const PX_CM = ALTO / ESCALA_CM;
const Y_AGUA = Y0 + 12;
const HUECO_COMPUERTA = 100 * PX_CM; // apertura máxima dibujada: 100 cm

const yDe = (cm: number) => Y1 - Math.min(ESCALA_CM, Math.max(0, cm)) * PX_CM;

// Borde superior del lodo, algo irregular (como se ve en las miras).
const BORDE_LODO =
  `M${X0 - 2},2 C${X0 + 40},-1 ${X0 + 70},4 ${X0 + 110},1 S${X0 + 190},-1 ${X0 + 220},2 S${X1},1 ${X1 + 2},3 V${ALTO + 20} H${X0 - 2} Z`;

// Partículas en coordenadas del interior del tanque.
const PARTICULAS = [
  { x: 78, demora: 0, ritmo: 0.9 },
  { x: 118, demora: 1.3, ritmo: 1 },
  { x: 152, demora: 0.6, ritmo: 0.8 },
  { x: 196, demora: 2.1, ritmo: 1.1 },
  { x: 228, demora: 1.7, ritmo: 0.9 },
  { x: 262, demora: 0.3, ritmo: 1 },
  { x: 288, demora: 2.6, ritmo: 0.85 },
].map((p) => ({ ...p, x: p.x - X0 }));

const VISTA = { w: 340, h: 206 };
const INTERIOR: Lienzo = { w: ANCHO, h: ALTO };
const AGUA = Y_AGUA - Y0; // superficie del agua, medida desde el borde del interior
const R_PARTICULA = 1.4;
const pctV = (v: number, total: number) => `${(v / total) * 100}%`;
// El interior tiene las esquinas de abajo redondeadas (radio 6), igual que su recorte en el SVG.
const ESTILO_INTERIOR = {
  left: pctV(X0, VISTA.w),
  top: pctV(Y0, VISTA.h),
  width: pctV(ANCHO, VISTA.w),
  height: pctV(ALTO, VISTA.h),
  borderRadius: `0 0 ${pctV(6, ANCHO)} ${pctV(6, ANCHO)} / 0 0 ${pctV(6, ALTO)} ${pctV(6, ALTO)}`,
};

/**
 * Lo que se mueve sin parar (olas, flujo, sedimento): capas HTML que solo cambian
 * `transform`, entre el fondo y el frente del dibujo.
 */
const AnimacionAgua = memo(function AnimacionAgua({ caida, sedimentando }: { caida: number; sedimentando: boolean }) {
  return (
    <div className="pointer-events-none absolute overflow-hidden" style={ESTILO_INTERIOR} aria-hidden>
      <OlaCapa lienzo={INTERIOR} x={0} y={AGUA - 1} largo={ANCHO} fondo={ALTO - AGUA + 1} amplitud={1.8} onda={52} opacidad={0.14} duracion={11} />
      <OlaCapa lienzo={INTERIOR} x={0} y={AGUA} largo={ANCHO} fondo={ALTO - AGUA} amplitud={2.6} onda={65} opacidad={0.22} duracion={6} />
      {/* líneas de flujo: el agua avanza hacia la salida */}
      {[26, 52, 80].map((dy, i) => (
        <FlujoCapa
          key={dy}
          lienzo={INTERIOR}
          x={0}
          y={AGUA + dy}
          largo={ANCHO}
          opacidad={0.5 - i * 0.12}
          duracion={1.6 + i * 0.5}
          periodo={48}
          guion={14}
        />
      ))}
      {sedimentando && (
        <ParticulasCapa
          lienzo={INTERIOR}
          x={0}
          y={AGUA + 24 - R_PARTICULA}
          ancho={ANCHO}
          alto={caida + R_PARTICULA * 2}
          radio={R_PARTICULA}
          puntos={PARTICULAS}
        />
      )}
    </div>
  );
});

interface Props {
  nivelCm: number;
  nivelCriticoCm: number;
  aperturaCm?: number;
  /** Muestra partículas cayendo (lodo entrando). */
  sedimentando?: boolean;
  /** Sensor sin datos: se tacha el tanque y se avisa. */
  sinDatos?: boolean;
  className?: string;
  titulo?: string;
}

/** Corte lateral de una nave: agua animada, capa de lodo, línea crítica y compuerta de purga. */
export const NaveTanque = memo(function NaveTanque({
  nivelCm,
  nivelCriticoCm,
  aperturaCm = 0,
  sedimentando = true,
  sinDatos,
  className,
  titulo,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const [ref, enVista] = useEnVista<HTMLDivElement>();
  const yLodo = aPaso(yDe(nivelCm), 0.25);
  const yCritico = yDe(nivelCriticoCm);
  const abiertaPx = Math.min(100, aperturaCm) * PX_CM;
  const abierta = aperturaCm > 0;
  // En pasos de 6 px: la capa de partículas no se recalcula con cada décima del nivel.
  const caida = Math.max(20, Math.round((yLodo - (Y_AGUA + 24) - 4) / 6) * 6);
  const etiqueta =
    titulo ?? `Nivel de lodo ${formatoNumero(nivelCm)} cm de ${formatoNumero(nivelCriticoCm)} cm crítico`;
  const recorte = (
    <path d={`M${X0},${Y0} V${Y1 - 6} q0,6 6,6 H${X1 - 6} q6,0 6,-6 V${Y0} Z`} />
  );

  return (
    <div ref={ref} role="img" aria-label={etiqueta} className={cn('relative block w-full', className)} style={{ aspectRatio: '340 / 206' }}>
      {/* Fondo: tanque y agua */}
      <svg viewBox="0 0 340 206" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <clipPath id={`intf${uid}`}>{recorte}</clipPath>
          <linearGradient id={`agua${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity={0.85} />
            <stop offset="100%" stopColor="var(--water-deep)" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#intf${uid})`} opacity={sinDatos ? 0.45 : 1}>
          <rect x={X0} y={Y0} width={ANCHO} height={ALTO} fill="var(--surface-2)" />
          <rect x={X0} y={Y_AGUA} width={ANCHO} height={Y1 - Y_AGUA} fill={`url(#agua${uid})`} />
        </g>
      </svg>

      {enVista && !sinDatos && <AnimacionAgua caida={caida} sedimentando={sedimentando} />}

      {/* Frente: lodo, niveles, muros y rótulos */}
      <svg viewBox="0 0 340 206" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <clipPath id={`int${uid}`}>{recorte}</clipPath>
        <linearGradient id={`lodo${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sludge)" />
          <stop offset="100%" stopColor="var(--sludge-deep)" />
        </linearGradient>
        <pattern id={`rayas${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--surface-2)" fillOpacity={0.55} />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--stale)" strokeWidth="2" strokeOpacity={0.35} />
        </pattern>
      </defs>

      {/* Regla (miras) */}
      <g className="num" fontSize="9.5" fill="var(--fg-subtle)">
        {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((c) => (
          <g key={c}>
            <line
              x1={c % 100 === 0 ? 30 : 34}
              x2={40}
              y1={yDe(c)}
              y2={yDe(c)}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            {c % 100 === 0 && (
              <text x={26} y={yDe(c) + 3.2} textAnchor="end">
                {c}
              </text>
            )}
          </g>
        ))}
        <text x={26} y={Y1 + 14} textAnchor="end" fontSize="9" fill="var(--fg-subtle)">
          cm
        </text>
      </g>

      <g clipPath={`url(#int${uid})`} opacity={sinDatos ? 0.45 : 1}>
        {/* capa de lodo */}
        <motion.g
          initial={false}
          animate={{ y: yLodo }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, mass: 0.8 }}
        >
          <path d={BORDE_LODO} fill={`url(#lodo${uid})`} />
          <path
            d={`M${X0 - 2},2 C${X0 + 40},-1 ${X0 + 70},4 ${X0 + 110},1 S${X0 + 190},-1 ${X0 + 220},2 S${X1},1 ${X1 + 2},3`}
            fill="none"
            stroke="var(--sludge-top)"
            strokeWidth={2}
          />
          {[12, 26, 44].map((dy, i) => (
            <path
              key={dy}
              d={`M${X0},${dy} C${X0 + 60},${dy + 2} ${X0 + 140},${dy - 2} ${X1},${dy + 1}`}
              fill="none"
              stroke="var(--sludge-deep)"
              strokeOpacity={0.45 - i * 0.1}
              strokeWidth={1}
            />
          ))}
        </motion.g>
        {sinDatos && <rect x={X0} y={Y0} width={ANCHO} height={ALTO} fill={`url(#rayas${uid})`} />}
      </g>

      {/* línea del nivel crítico */}
      <g>
        <line
          x1={X0}
          x2={X1}
          y1={yCritico}
          y2={yCritico}
          stroke="var(--crit)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <rect x={X0 + 6} y={yCritico - 17} width={92} height={14} rx={7} fill="var(--surface-1)" fillOpacity={0.85} />
        <text x={X0 + 13} y={yCritico - 7} fontSize="9.5" fontWeight={600} fill="var(--crit)">
          Crítico · <tspan className="num">{formatoNumero(nivelCriticoCm)} cm</tspan>
        </text>
      </g>

      {/* marcador del nivel actual en la regla */}
      {!sinDatos && (
        <motion.path
          initial={false}
          animate={{ y: yLodo }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, mass: 0.8 }}
          d="M36,-5 L44,0 L36,5 Z"
          fill="var(--sludge-top)"
        />
      )}

      {/* paredes */}
      <path
        d={`M${X0 - 1},${Y0 - 6} V${Y1 - 6} q0,7 7,7 H${X1 + 16}`}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M${X1 + 1},${Y0 - 6} V${Y1 - HUECO_COMPUERTA - 4}`}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* compuerta de purga: sube en pasos de 10 cm */}
      <g>
        <line x1={X1 + 12} x2={X1 + 12} y1={Y1 - HUECO_COMPUERTA - 22} y2={Y1 + 3} stroke="var(--line)" strokeWidth={1.5} />
        {abierta && (
          <path
            d={`M${X1 + 4},${Y1 - abiertaPx / 2} C${X1 + 22},${Y1 - abiertaPx / 2} ${X1 + 26},${Y1 + 2} ${X1 + 32},${Y1 + 14}`}
            fill="none"
            stroke="var(--sludge-top)"
            strokeWidth={Math.max(3, abiertaPx * 0.6)}
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="anim-flujo"
            style={{ animationPlayState: enVista ? 'running' : 'paused' }}
            opacity={0.85}
          />
        )}
        <motion.rect
          initial={false}
          animate={{ y: Y1 - HUECO_COMPUERTA - 2 - abiertaPx }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          x={X1 - 1}
          width={9}
          height={HUECO_COMPUERTA + 4}
          rx={2}
          fill="var(--surface-3)"
          stroke={abierta ? 'var(--accent)' : 'var(--fg-subtle)'}
          strokeWidth={1.5}
        />
      </g>

      {sinDatos && (
        <g>
          <rect x={X0 + ANCHO / 2 - 72} y={Y0 + ALTO / 2 - 14} width={144} height={28} rx={14} fill="var(--surface-1)" stroke="var(--line-strong)" />
          <text x={X0 + ANCHO / 2} y={Y0 + ALTO / 2 + 4} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--fg-muted)">
            Sensor sin datos
          </text>
        </g>
      )}
      </svg>
    </div>
  );
});
