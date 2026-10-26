/**
 * Animaciones decorativas de los dibujos (flujo de agua, olas, sedimento cayendo)
 * hechas con capas HTML que solo se desplazan con `transform`: las mueve la tarjeta
 * gráfica sin volver a dibujar el SVG en cada cuadro.
 *
 * Se colocan sobre el dibujo con porcentajes de su viewBox, entre una capa SVG de
 * fondo (agua) y una de frente (lodo, rótulos, muros), así el orden visual no cambia.
 */
import { memo, type CSSProperties } from 'react';

export interface Lienzo {
  /** Ancho y alto del viewBox del dibujo. */
  w: number;
  h: number;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

function caja(l: Lienzo, x: number, y: number, w: number, h: number): CSSProperties {
  return { position: 'absolute', left: pct(x, l.w), top: pct(y, l.h), width: pct(w, l.w), height: pct(h, l.h), overflow: 'hidden' };
}

/** Periodo del guion que cabe un número entero de veces en `largo` (el bucle no salta). */
function periodoExacto(largo: number, deseado: number) {
  return largo / Math.max(1, Math.round(largo / deseado));
}

interface FlujoProps {
  lienzo: Lienzo;
  x: number;
  y: number;
  largo: number;
  /** Vertical: el flujo sube (de y + largo hacia y). */
  vertical?: boolean;
  grosor?: number;
  color?: string;
  opacidad?: number;
  /** Segundos que tarda el guion en avanzar un periodo (fija la velocidad). */
  duracion?: number;
  periodo?: number;
  guion?: number;
}

/** Línea discontinua que avanza: muestra hacia dónde corre el agua. */
export const FlujoCapa = memo(function FlujoCapa({
  lienzo,
  x,
  y,
  largo,
  vertical = false,
  grosor = 1.2,
  color = 'var(--water-flow)',
  opacidad = 0.5,
  duracion = 2,
  periodo = 48,
  guion = 14,
}: FlujoProps) {
  const p = periodoExacto(largo, periodo);
  // La capa recorre `largo` por ciclo: se ajusta el tiempo para mantener la velocidad pedida.
  const ciclo = (largo * duracion) / periodo;
  const alto = grosor * 3;
  const estiloCaja = vertical ? caja(lienzo, x - alto / 2, y, alto, largo) : caja(lienzo, x, y - alto / 2, largo, alto);
  return (
    <div style={{ ...estiloCaja, opacity: opacidad }} aria-hidden>
      <div
        className={vertical ? 'capa-sube' : 'capa-avanza'}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: vertical ? '100%' : '200%',
          height: vertical ? '200%' : '100%',
          animationDuration: `${ciclo}s`,
        }}
      >
        <svg
          viewBox={vertical ? `0 0 ${alto} ${largo * 2}` : `0 0 ${largo * 2} ${alto}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
        >
          <line
            x1={vertical ? alto / 2 : 0}
            x2={vertical ? alto / 2 : largo * 2}
            y1={vertical ? 0 : alto / 2}
            y2={vertical ? largo * 2 : alto / 2}
            stroke={color}
            strokeWidth={grosor}
            strokeDasharray={`${guion} ${p - guion}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
});

function caminoOla(largo: number, alto: number, base: number, amplitud: number, onda: number) {
  let d = `M0,${base}`;
  for (let x = 0; x < largo; x += onda) d += ` q${onda / 4},${-amplitud} ${onda / 2},0 t${onda / 2},0`;
  return `${d} V${alto} H0 Z`;
}

interface OlaProps {
  lienzo: Lienzo;
  x: number;
  /** Altura de la superficie del agua. */
  y: number;
  largo: number;
  /** Profundidad que tiñe la ola (de la superficie hacia abajo). */
  fondo: number;
  amplitud: number;
  onda: number;
  opacidad: number;
  duracion: number;
}

/** Superficie del agua que ondula; su relleno tiñe el agua hacia abajo, como en el dibujo original. */
export const OlaCapa = memo(function OlaCapa({ lienzo, x, y, largo, fondo, amplitud, onda, opacidad, duracion }: OlaProps) {
  const base = amplitud + 1;
  const alto = fondo + base;
  // La ola debe repetirse exacta en `largo` para que el bucle no salte.
  const ondaExacta = largo / Math.max(1, Math.round(largo / onda));
  return (
    <div style={caja(lienzo, x, y - base, largo, alto)} aria-hidden>
      <div className="capa-izquierda" style={{ position: 'absolute', inset: 0, width: '200%', animationDuration: `${duracion}s` }}>
        <svg viewBox={`0 0 ${largo * 2} ${alto}`} preserveAspectRatio="none" width="100%" height="100%">
          <path d={caminoOla(largo * 2, alto, base, amplitud, ondaExacta)} fill="var(--water-surface)" fillOpacity={opacidad} />
        </svg>
      </div>
    </div>
  );
});

interface ParticulasProps {
  lienzo: Lienzo;
  /** Zona de caída: de `y` a `y + alto`. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Radio de cada partícula, en unidades del dibujo. */
  radio: number;
  puntos: readonly { x: number; demora: number; ritmo: number }[];
  color?: string;
}

// Aparece arriba y se desvanece al llegar al lodo (máscara fija: no cuesta por cuadro).
const MASCARA_CAIDA = 'linear-gradient(to bottom, transparent 0%, #000 15%, #000 70%, transparent 100%)';

/**
 * Sedimento cayendo hacia el lodo. Todas las partículas van en una sola franja que baja y
 * se repite sin costura (cada punto está dos veces, a media franja de distancia): una
 * animación por tanque en vez de una por partícula, que era lo que más trabajo daba.
 */
export const ParticulasCapa = memo(function ParticulasCapa({ lienzo, x, y, ancho, alto, radio, puntos, color = 'var(--sludge-top)' }: ParticulasProps) {
  const lado = pct(radio * 2, ancho);
  // Ritmo medio de las partículas: segundos que tarda una en caer toda la zona.
  const duracion = 3.2 * (puntos.reduce((s, p) => s + p.ritmo, 0) / Math.max(1, puntos.length));
  return (
    <div style={{ ...caja(lienzo, x, y, ancho, alto), maskImage: MASCARA_CAIDA, WebkitMaskImage: MASCARA_CAIDA }} aria-hidden>
      <div className="capa-baja" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '200%', animationDuration: `${duracion}s` }}>
        {puntos.flatMap((p, i) => {
          // La demora del punto fija en qué parte de su caída empieza (fase).
          const fase = (p.demora / duracion) % 1;
          return [0, 50].map((mitad) => (
            <span
              key={`${i}-${mitad}`}
              style={{
                position: 'absolute',
                left: pct(p.x - radio - x, ancho),
                top: `${mitad + (1 - fase) * 50}%`,
                width: lado,
                aspectRatio: '1',
                borderRadius: 9999,
                background: color,
                opacity: 0.9,
              }}
            />
          ));
        })}
      </div>
    </div>
  );
});
