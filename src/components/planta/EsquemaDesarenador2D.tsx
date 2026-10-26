import { memo, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowRight, Droplets, Fan } from 'lucide-react';
import type { BombaEstado, EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import type { TipoEstado } from '@/components/ui/EstadoChip';
import { cn } from '@/lib/cn';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { useEnVista } from '@/lib/useEnVista';
import { aPaso } from '@/lib/movimiento';
import { FlujoCapa, type Lienzo } from './CapasAnimadas';
import { ESCALA_CM, ESTADO_BOMBA, estadoNave, fraseBombeo, frasePurga, fraseSedimento, textoEmbalse, valido, type Frase } from './esquemaTextos';

/*
 * Esquema del desarenador: el agua entra por la izquierda, cruza las 3 naves (cada una
 * dibujada en corte: agua arriba, lodo asentado abajo) y sale limpia por arriba a la derecha.
 * El lodo baja por la compuerta de cada nave a la galería y la quebrada lo lleva hasta el
 * embalse, lejos del desarenador, donde las bombas lo evacúan. Pocos números: el dibujo cuenta
 * qué pasa; las tarjetas de abajo dan el detalle.
 */
const W = 1120;
const H = 500;
const NAVE_X0 = 156;
const NAVE_X1 = 736;
const NAVE_H = 112;
const NAVE_Y = [20, 146, 272];
const ENTRADA_X1 = 118;
const ENTRADA_H = 64;
const ENTRADA_Y = (NAVE_Y[0] + NAVE_Y[2] + NAVE_H) / 2 - ENTRADA_H / 2;
/** Compuerta de purga: marco fuera de la nave, al pie de su pared de salida. */
const COMPUERTA_X = NAVE_X1 + 7; // separada del borde resaltado de la nave
const COMPUERTA_W = 22;
const COLECTOR_X = 772;
const COLECTOR_W = 30;
const SALIDA_H = 30;
const GALERIA_X = 828;
const DERECHA_X1 = 1108;
/** Embalse (lejos del desarenador): ahí llega el lodo y están las bombas. */
const EMB_X0 = 16;
const EMB_X1 = 620;
const EMB_Y0 = 410;
const EMB_Y1 = 464;
/** La quebrada corre de la galería al embalse; el corte marca que es un tramo largo. */
const QUEBRADA_Y = (EMB_Y0 + EMB_Y1) / 2;
const CORTE_X = 720;
const BOMBAS_X = [310, 430, 550];
const CAPACIDAD_QUEBRADA = 3000;

/** Quebrada a ambos lados del corte, de la galería hacia el embalse (los guiones avanzan en ese sentido). */
const TRAMOS_QUEBRADA = [
  `M${GALERIA_X},${QUEBRADA_Y} C${GALERIA_X - 24},${QUEBRADA_Y - 10} ${GALERIA_X - 46},${QUEBRADA_Y + 10} ${GALERIA_X - 70},${QUEBRADA_Y} S${CORTE_X + 34},${QUEBRADA_Y - 8} ${CORTE_X + 12},${QUEBRADA_Y}`,
  `M${CORTE_X - 12},${QUEBRADA_Y} C${CORTE_X - 34},${QUEBRADA_Y + 8} ${CORTE_X - 56},${QUEBRADA_Y - 10} ${CORTE_X - 78},${QUEBRADA_Y} S${EMB_X1 + 10},${QUEBRADA_Y + 6} ${EMB_X1},${QUEBRADA_Y}`,
];

const LIENZO: Lienzo = { w: W, h: H };
const fondoNave = (y: number) => y + NAVE_H;
/**
 * Hueco máximo de la compuerta (100 cm). Se dibuja 1.5 veces más alto que a escala: abrir
 * 20 cm serían 6 px y no se notaría. Las aperturas siguen proporcionales entre sí.
 */
const HUECO = (100 / ESCALA_CM) * NAVE_H * 1.5;
/** El tubo de purga sale a ras del piso de la nave, por donde pasa el lodo. */
const yTubo = (y: number) => fondoNave(y) - 7;

/** Altura de una capa de lodo en el corte (el tanque completo son 400 cm). */
const altoLodo = (cm: number) => Math.min(NAVE_H - 4, Math.max(0, (cm / ESCALA_CM) * NAVE_H));

/**
 * Capa de lodo vista de costado: más gruesa a la entrada (el grano grueso cae primero) y
 * más delgada a la salida, como en las miras.
 */
function capaLodo(y: number, nivelCm: number) {
  const fondo = fondoNave(y);
  const yEntrada = fondo - altoLodo(nivelCm * 1.12);
  const ySalida = fondo - altoLodo(nivelCm * 0.88);
  const xm = (NAVE_X0 + NAVE_X1) / 2;
  return `M${NAVE_X0},${fondo + 2} L${NAVE_X0},${yEntrada} Q${NAVE_X0 + 150},${yEntrada + 1} ${xm},${(yEntrada + ySalida) / 2} T${NAVE_X1},${ySalida} L${NAVE_X1},${fondo + 2} Z`;
}

/** Flujo de agua permanente: capa que mueve la tarjeta gráfica (ver CapasAnimadas). */
const FlujosAgua = memo(function FlujosAgua() {
  const cy = ENTRADA_Y + ENTRADA_H / 2;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {[cy - 16, cy, cy + 16].map((y, i) => (
        <FlujoCapa key={y} lienzo={LIENZO} x={0} y={y} largo={ENTRADA_X1} grosor={1.3} opacidad={0.5 - i * 0.08} duracion={1.2 + i * 0.2} />
      ))}
      {NAVE_Y.map((y) =>
        [y + 22, y + 38].map((fy, i) => (
          <FlujoCapa key={fy} lienzo={LIENZO} x={NAVE_X0 + 12} y={fy} largo={NAVE_X1 - NAVE_X0 - 24} grosor={1.3} opacidad={0.42 - i * 0.1} duracion={2.2 + i * 0.4} />
        )),
      )}
      <FlujoCapa lienzo={LIENZO} vertical x={COLECTOR_X + COLECTOR_W / 2} y={NAVE_Y[0] + 6} largo={fondoNave(NAVE_Y[2]) - NAVE_Y[0] - 12} grosor={1.4} opacidad={0.55} duracion={1.6} />
      {[NAVE_Y[0] + 10, NAVE_Y[0] + 20].map((y, i) => (
        <FlujoCapa key={y} lienzo={LIENZO} x={COLECTOR_X + COLECTOR_W} y={y} largo={W - COLECTOR_X - COLECTOR_W} grosor={1.3} opacidad={0.5 - i * 0.15} duracion={1.3 + i * 0.3} />
      ))}
    </div>
  );
});

function Rotulo({ x, y, w, h, children, className }: { x: number; y: number; w: number; h: number; children: ReactNode; className?: string }) {
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div className={cn('h-full w-full', className)}>{children}</div>
    </foreignObject>
  );
}

interface Props {
  planta: EstadoPlanta;
  /** Nave recomendada (se resalta). */
  naveDestacada?: NaveId | null;
  alSeleccionarNave?: (id: NaveId) => void;
  className?: string;
}

export function EsquemaDesarenador2D({ planta, naveDestacada, alSeleccionarNave, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const [ref, enVista] = useEnVista<HTMLDivElement>();
  // Las animaciones que quedan en el SVG (purga, bombas) se pausan fuera de pantalla.
  const pausa = enVista ? undefined : ('paused' as const);
  const quebrada = valido(planta.quebradaM3) ? planta.quebradaM3 : 0;
  const capacidad = valido(planta.quebradaCapacidadM3) && planta.quebradaCapacidadM3 > 0 ? planta.quebradaCapacidadM3 : CAPACIDAD_QUEBRADA;
  const qPct = Math.min(1, quebrada / capacidad);
  const hayPurga = planta.purgas.length > 0;
  // Solo se dibujan las naves y bombas que tienen lugar en el esquema (3 de cada una).
  const naves = planta.naves.slice(0, NAVE_Y.length);
  const bombas = planta.bombas.slice(0, BOMBAS_X.length);

  return (
    <div ref={ref} className={cn('relative block w-full select-none', className)} style={{ aspectRatio: `${W} / ${H}` }}>
      {/* Fondo: el agua (entrada, naves, colector y salida) */}
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`agua${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--water)" stopOpacity={0.85} />
            <stop offset="1" stopColor="var(--water-deep)" />
          </linearGradient>
          <linearGradient id={`aguaH${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--water)" stopOpacity={0.7} />
            <stop offset="1" stopColor="var(--water-deep)" stopOpacity={0.9} />
          </linearGradient>
          <filter id={`brillo${uid}`} x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect x={0} y={ENTRADA_Y} width={ENTRADA_X1} height={ENTRADA_H} rx={4} fill={`url(#aguaH${uid})`} />
        <path d={`M${ENTRADA_X1},${ENTRADA_Y} L${NAVE_X0},${NAVE_Y[0]} L${NAVE_X0},${fondoNave(NAVE_Y[2])} L${ENTRADA_X1},${ENTRADA_Y + ENTRADA_H} Z`} fill="var(--water)" fillOpacity={0.55} />
        {/* Tubos de purga y galería: van bajo el canal de agua limpia, que se dibuja encima */}
        {naves.map((n, i) => (
          <line key={n.id} x1={COMPUERTA_X + COMPUERTA_W} x2={GALERIA_X} y1={yTubo(NAVE_Y[i])} y2={yTubo(NAVE_Y[i])} stroke="var(--line-strong)" strokeWidth={10} strokeLinecap="round" opacity={0.45} />
        ))}
        <line x1={GALERIA_X} x2={GALERIA_X} y1={yTubo(NAVE_Y[0])} y2={QUEBRADA_Y} stroke="var(--line-strong)" strokeWidth={10} strokeLinecap="round" opacity={0.45} />
        {TRAMOS_QUEBRADA.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--water)" strokeOpacity={0.55} strokeWidth={14} strokeLinecap="round" />
        ))}
        <rect x={COLECTOR_X} y={NAVE_Y[0]} width={COLECTOR_W} height={fondoNave(NAVE_Y[2]) - NAVE_Y[0]} rx={4} fill="var(--water)" fillOpacity={0.55} />
        <rect x={COLECTOR_X} y={NAVE_Y[0]} width={W - COLECTOR_X} height={SALIDA_H} rx={4} fill={`url(#aguaH${uid})`} />
        {naves.map((n, i) => (
          <g key={n.id}>
            {naveDestacada === n.id && (
              <rect x={NAVE_X0 - 5} y={NAVE_Y[i] - 5} width={NAVE_X1 - NAVE_X0 + 10} height={NAVE_H + 10} rx={16} fill="none" stroke="var(--accent)" strokeWidth={8} opacity={0.3} filter={`url(#brillo${uid})`} />
            )}
            <rect x={NAVE_X0} y={NAVE_Y[i]} width={NAVE_X1 - NAVE_X0} height={NAVE_H} rx={12} fill={`url(#agua${uid})`} />
          </g>
        ))}
      </svg>

      {enVista && <FlujosAgua />}

      {/* Frente: lodo, niveles, compuertas, rótulos, quebrada y bombas */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        role="group"
        aria-label="Esquema del desarenador: entrada, tres naves con su lodo y compuertas de purga; la quebrada lleva el lodo al embalse, donde están las bombas"
      >
        <defs>
          <linearGradient id={`lodo${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--sludge)" />
            <stop offset="1" stopColor="var(--sludge-deep)" />
          </linearGradient>
          <pattern id={`rayas${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="var(--surface-2)" fillOpacity={0.55} />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--stale)" strokeWidth="2" strokeOpacity={0.4} />
          </pattern>
        </defs>

        {/* Bordes del canal de entrada y de salida */}
        <path d={`M0,${ENTRADA_Y} H${ENTRADA_X1} L${NAVE_X0},${NAVE_Y[0]}`} fill="none" stroke="var(--line-strong)" strokeWidth={2} />
        <path d={`M0,${ENTRADA_Y + ENTRADA_H} H${ENTRADA_X1} L${NAVE_X0},${fondoNave(NAVE_Y[2])}`} fill="none" stroke="var(--line-strong)" strokeWidth={2} />
        <Rotulo x={0} y={ENTRADA_Y - 34} w={150} h={28}>
          <span className="text-body font-semibold text-fg">Entrada</span>
        </Rotulo>
        <Rotulo x={COLECTOR_X + COLECTOR_W + 14} y={NAVE_Y[0] + SALIDA_H + 6} w={W - COLECTOR_X - COLECTOR_W - 14} h={26}>
          <span className="flex items-center justify-end gap-1.5 text-label font-medium text-fg-muted">
            Agua limpia al canal <ArrowRight className="size-4" aria-hidden />
          </span>
        </Rotulo>

        {/* Galería de purga y quebrada: el lodo baja de las compuertas y viaja al embalse (los cauces vacíos están en el fondo) */}
        {hayPurga &&
          [`M${GALERIA_X},${yTubo(NAVE_Y[0])} V${QUEBRADA_Y}`, ...TRAMOS_QUEBRADA].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="var(--sludge-top)"
              strokeWidth={5}
              strokeDasharray="8 10"
              strokeLinecap="round"
              className="anim-flujo"
              style={{ animationDuration: '1s', animationPlayState: pausa }}
            />
          ))}
        {/* Corte de la quebrada: el embalse queda lejos, el dibujo no está a escala */}
        {[CORTE_X - 6, CORTE_X + 6].map((x) => (
          <line key={x} x1={x - 6} x2={x + 6} y1={QUEBRADA_Y + 15} y2={QUEBRADA_Y - 15} stroke="var(--fg-subtle)" strokeWidth={2} strokeLinecap="round" />
        ))}
        <Rotulo x={EMB_X1 + 16} y={QUEBRADA_Y + 14} w={GALERIA_X - EMB_X1 - 4} h={H - QUEBRADA_Y - 14}>
          <div className="flex flex-col leading-tight">
            <span className="text-label font-semibold text-fg">Quebrada</span>
            <span className="text-[0.75rem] text-fg-muted">lleva el lodo lejos, al embalse</span>
          </div>
        </Rotulo>

        {naves.map((n, i) => {
          const e = estadoNave(planta, n);
          return (
            <Nave
              key={n.id}
              id={n.id}
              nombre={n.nombre}
              y={NAVE_Y[i]}
              // En cm enteros: el lodo solo se redibuja cuando cambia algo que se ve.
              nivelCm={valido(n.nivelCm) ? aPaso(Math.max(0, n.nivelCm), 1) : 0}
              criticoCm={valido(n.nivelCriticoCm) ? n.nivelCriticoCm : 250}
              pct={e.pct === null ? null : Math.round(e.pct)}
              estado={e.estado}
              texto={e.texto}
              sinDatos={e.sinDatos}
              aperturaCm={valido(n.compuerta?.aperturaCm) ? n.compuerta.aperturaCm : 0}
              destacada={naveDestacada === n.id}
              rotularCritico={i === 0}
              alSeleccionar={alSeleccionarNave}
              pausa={pausa}
              uid={uid}
            />
          );
        })}

        {/* Ahora mismo: lo que está pasando, en frases */}
        <AhoraMismo purga={frasePurga(planta)} bombeo={fraseBombeo(planta)} sedimento={fraseSedimento(planta.sstEntradaGL)} />

        {/* Embalse: el lodo que llega por la quebrada espera aquí a las bombas (borde punteado: es otro sitio) */}
        <rect x={EMB_X0} y={EMB_Y0} width={EMB_X1 - EMB_X0} height={EMB_Y1 - EMB_Y0} rx={14} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={2} strokeDasharray="8 6" />
        <clipPath id={`q${uid}`}>
          <rect x={EMB_X0 + 2} y={EMB_Y0 + 2} width={EMB_X1 - EMB_X0 - 4} height={EMB_Y1 - EMB_Y0 - 4} rx={12} />
        </clipPath>
        <g clipPath={`url(#q${uid})`}>
          <motion.rect
            x={EMB_X0}
            width={EMB_X1 - EMB_X0}
            height={EMB_Y1 - EMB_Y0}
            initial={false}
            animate={{ y: aPaso(EMB_Y1 - (EMB_Y1 - EMB_Y0) * Math.max(0.05, qPct)) }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
            fill={`url(#lodo${uid})`}
            opacity={0.85}
          />
        </g>
        <Rotulo x={EMB_X0 + 16} y={EMB_Y0 + 6} w={BOMBAS_X[0] - 28 - EMB_X0 - 16} h={EMB_Y1 - EMB_Y0 - 12}>
          <div className="flex h-full flex-col justify-center leading-tight">
            <span className="text-body font-semibold text-fg">Embalse</span>
            <span className="text-label text-fg-muted">{textoEmbalse(quebrada)}</span>
          </div>
        </Rotulo>
        {bombas.map((b, i) => (
          <BombaEsquema key={b.id} id={b.id} modelo={b.modelo} estado={b.estado} x={BOMBAS_X[i]} pausa={pausa} />
        ))}
      </svg>
    </div>
  );
}

interface NaveProps {
  id: NaveId;
  nombre: string;
  y: number;
  nivelCm: number;
  criticoCm: number;
  pct: number | null;
  estado: TipoEstado;
  texto: string;
  sinDatos: boolean;
  aperturaCm: number;
  destacada: boolean;
  rotularCritico: boolean;
  alSeleccionar?: (id: NaveId) => void;
  pausa?: 'paused';
  uid: string;
}

/** Una nave en corte: el agua cruza arriba, el lodo se asienta abajo y sube hacia la línea crítica. */
const Nave = memo(function Nave({ id, nombre, y, nivelCm, criticoCm, pct, estado, texto, sinDatos, aperturaCm, destacada, rotularCritico, alSeleccionar, pausa, uid }: NaveProps) {
  const [foco, setFoco] = useState(false);
  const yCritico = fondoNave(y) - altoLodo(criticoCm);
  const borde = sinDatos ? 'var(--stale)' : estado === 'critica' ? 'var(--crit)' : estado === 'advertencia' ? 'var(--warn)' : 'var(--line-strong)';
  const elegir = alSeleccionar ? () => alSeleccionar(id) : undefined;
  const tecla = (e: KeyboardEvent<SVGGElement>) => {
    if (elegir && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      elegir();
    }
  };
  const clip = `nave${uid}${id}`;

  return (
    <g
      onClick={elegir}
      onKeyDown={tecla}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      tabIndex={elegir ? 0 : undefined}
      role={elegir ? 'button' : undefined}
      aria-label={`${nombre}: ${texto}${pct !== null ? `, lodo al ${pct} % del nivel crítico` : ''}. Ver detalle.`}
      className={cn('outline-none', elegir && 'cursor-pointer')}
    >
      <clipPath id={clip}>
        <rect x={NAVE_X0} y={y} width={NAVE_X1 - NAVE_X0} height={NAVE_H} rx={12} />
      </clipPath>
      <g clipPath={`url(#${clip})`} opacity={sinDatos ? 0.5 : 1}>
        <motion.path
          initial={false}
          animate={{ d: capaLodo(y, nivelCm) }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          fill={`url(#lodo${uid})`}
          stroke="var(--sludge-top)"
          strokeWidth={2}
        />
        {sinDatos && <rect x={NAVE_X0} y={y} width={NAVE_X1 - NAVE_X0} height={NAVE_H} fill={`url(#rayas${uid})`} />}
      </g>

      {/* Nivel crítico */}
      <line x1={NAVE_X0 + 2} x2={NAVE_X1 - 2} y1={yCritico} y2={yCritico} stroke="var(--crit)" strokeWidth={1.5} strokeDasharray="7 5" opacity={0.85} />
      {rotularCritico && (
        <text x={NAVE_X1 - 26} y={yCritico - 6} textAnchor="end" fontSize="12" fontWeight={600} fill="var(--crit)">
          Nivel crítico
        </text>
      )}

      {/* Borde de la nave (también su área para tocar) */}
      {destacada && <rect x={NAVE_X0 - 5} y={y - 5} width={NAVE_X1 - NAVE_X0 + 10} height={NAVE_H + 10} rx={16} fill="none" stroke="var(--accent)" strokeWidth={2} />}
      <rect
        x={NAVE_X0}
        y={y}
        width={NAVE_X1 - NAVE_X0}
        height={NAVE_H}
        rx={12}
        fill="transparent"
        stroke={foco ? 'var(--accent)' : borde}
        strokeWidth={foco ? 3 : estado === 'normal' && !sinDatos ? 1.5 : 2}
        strokeDasharray={sinDatos && !foco ? '6 5' : undefined}
      />

      {/* Encima del borde: el lodo que sale por el hueco corta la pared de la nave */}
      <Compuerta y={y} aperturaCm={aperturaCm} pausa={pausa} />

      {/* Rótulo: nombre, cuánto lodo tiene y qué hacer */}
      <Rotulo x={NAVE_X0 + 10} y={y + 7} w={480} h={34}>
        <div className="inline-flex h-full items-center gap-2.5 rounded-btn bg-surface-1/90 px-3 shadow-1">
          <span className="text-body font-semibold text-fg">{nombre}</span>
          {pct !== null && (
            <span className="num text-body font-semibold text-fg">
              {pct} <span className="font-sans text-[0.75rem] font-normal text-fg-muted">% del crítico</span>
            </span>
          )}
          <EstadoChip estado={estado} texto={aperturaCm > 0 ? `${texto} · ${aperturaCm} cm` : texto} pulso={estado === 'critica'} />
        </div>
      </Rotulo>
    </g>
  );
});

/**
 * Compuerta de purga de tipo deslizante: marco con dos guías y travesaño, motor arriba y
 * hoja con vástago que sube según la apertura. Abierta, el lodo sale por el hueco de abajo
 * hacia la galería (cuánto está abierta lo dice el rótulo de la nave).
 */
const Compuerta = memo(function Compuerta({ y, aperturaCm, pausa }: { y: number; aperturaCm: number; pausa?: 'paused' }) {
  const fondo = fondoNave(y);
  const abierta = aperturaCm > 0;
  const alzado = (Math.min(100, Math.max(0, aperturaCm)) / 100) * HUECO;
  const hoja = HUECO + 6; // la hoja tapa el hueco y apoya en el piso
  const tope = fondo - hoja - HUECO - 10; // el marco deja subir la hoja todo el hueco
  const x0 = COMPUERTA_X;
  const x1 = COMPUERTA_X + COMPUERTA_W;
  const color = abierta ? 'var(--accent)' : 'var(--fg-subtle)';
  const resorte = { type: 'spring' as const, stiffness: 140, damping: 22 };

  return (
    <g>
      <title>{abierta ? `Compuerta de purga abierta ${aperturaCm} cm` : 'Compuerta de purga cerrada'}</title>

      {/* Lodo saliendo por el hueco hacia el tubo */}
      {abierta && (
        <>
          <motion.rect x={NAVE_X1 - 3} width={x1 - NAVE_X1 + 6} initial={false} animate={{ y: fondo - alzado, height: alzado }} transition={resorte} fill="var(--sludge)" />
          {[
            [x1, COLECTOR_X],
            [COLECTOR_X + COLECTOR_W, GALERIA_X],
          ].map(([a, b]) => (
            <line
              key={a}
              x1={a}
              x2={b}
              y1={yTubo(y)}
              y2={yTubo(y)}
              stroke="var(--sludge-top)"
              strokeWidth={5}
              strokeDasharray="8 10"
              strokeLinecap="round"
              className="anim-flujo"
              style={{ animationDuration: '0.9s', animationPlayState: pausa }}
            />
          ))}
        </>
      )}

      {/* Marco: guías, travesaño y motor */}
      <line x1={x0 + 2} x2={x0 + 2} y1={tope} y2={fondo + 1} stroke="var(--line-strong)" strokeWidth={3} strokeLinecap="round" />
      <line x1={x1 - 2} x2={x1 - 2} y1={tope} y2={fondo + 1} stroke="var(--line-strong)" strokeWidth={3} strokeLinecap="round" />
      <line x1={x0} x2={x1} y1={tope} y2={tope} stroke="var(--line-strong)" strokeWidth={3} strokeLinecap="round" />
      <rect x={x0 + 4} y={tope - 9} width={COMPUERTA_W - 8} height={8} rx={2} fill="var(--surface-3)" stroke="var(--line-strong)" strokeWidth={1.5} />

      {/* Hoja con su vástago: sube y baja junta */}
      <motion.g initial={false} animate={{ y: -alzado }} transition={resorte}>
        <line x1={(x0 + x1) / 2} x2={(x0 + x1) / 2} y1={fondo - hoja - HUECO - 6} y2={fondo - hoja} stroke={color} strokeWidth={2} />
        <rect x={x0 + 5} y={fondo - hoja} width={COMPUERTA_W - 10} height={hoja} rx={2} fill="var(--surface-3)" stroke={color} strokeWidth={2} />
        {[0.33, 0.66].map((f) => (
          <line key={f} x1={x0 + 8} x2={x1 - 8} y1={fondo - hoja + hoja * f} y2={fondo - hoja + hoja * f} stroke={color} strokeWidth={1} opacity={0.7} />
        ))}
      </motion.g>

    </g>
  );
});

const IconoFrase = { purga: ArrowDownToLine, bombeo: Fan, sedimento: Droplets };

/** Tres frases sobre lo que pasa ahora: purga, bombeo y cómo viene el agua. */
const AhoraMismo = memo(
  function AhoraMismo({ purga, bombeo, sedimento }: { purga: Frase; bombeo: Frase; sedimento: Frase }) {
    const filas: [keyof typeof IconoFrase, Frase][] = [
      ['purga', purga],
      ['bombeo', bombeo],
      ['sedimento', sedimento],
    ];
    return (
      <Rotulo x={GALERIA_X + 30} y={NAVE_Y[1] - 26} w={DERECHA_X1 - GALERIA_X - 30} h={fondoNave(NAVE_Y[2]) - NAVE_Y[1] + 26}>
        <div className="flex h-full flex-col justify-center gap-3 pl-1">
          <p className="text-label font-semibold text-fg-muted">Ahora mismo</p>
          <ul className="flex flex-col gap-3">
            {filas.map(([clave, f]) => {
              const I = IconoFrase[clave];
              return (
                <li key={clave} className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-btn', f.atencion ? 'bg-warn-soft text-warn' : 'bg-surface-3 text-fg-muted')}>
                    <I className="size-4" aria-hidden />
                  </span>
                  <span className={cn('text-label leading-snug', f.atencion ? 'font-semibold text-warn' : 'text-fg')}>{f.texto}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Rotulo>
    );
  },
  (a, b) => a.purga.texto === b.purga.texto && a.bombeo.texto === b.bombeo.texto && a.sedimento.texto === b.sedimento.texto,
);

const BombaEsquema = memo(function BombaEsquema({ id, modelo, estado, x, pausa }: { id: string; modelo: string; estado: BombaEstado['estado']; x: number; pausa?: 'paused' }) {
  const cy = (EMB_Y0 + EMB_Y1) / 2;
  const enMarcha = estado === 'en_marcha';
  const color = enMarcha ? 'var(--accent)' : estado === 'falla' ? 'var(--crit)' : 'var(--fg-subtle)';
  const e = ESTADO_BOMBA[estado] ?? ESTADO_BOMBA.apagada;
  return (
    <g>
      <title>{`Bomba ${id.slice(1)} · ${modelo} · ${e.texto}`}</title>
      <circle cx={x} cy={cy} r={20} fill="var(--surface-1)" stroke={color} strokeWidth={2} />
      <g transform={`translate(${x - 24},${cy - 24})`}>
        <g className={enMarcha ? 'anim-giro' : undefined} style={{ transformBox: 'view-box', transformOrigin: '24px 24px', animationPlayState: pausa }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M24 24 C 25 17, 30 13, 35 12.5 C 32 16, 28 20, 24 24 Z" fill={color} fillOpacity={enMarcha ? 0.95 : 0.55} transform={`rotate(${a} 24 24)`} />
          ))}
        </g>
        <circle cx={24} cy={24} r={3.5} fill="var(--surface-1)" stroke={color} strokeWidth={1.5} />
      </g>
      <Rotulo x={x - 58} y={EMB_Y1 + 6} w={116} h={26}>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-label font-semibold text-fg">B{id.slice(1)}</span>
          <EstadoChip estado={e.estado} texto={e.texto} tamano="sm" />
        </div>
      </Rotulo>
    </g>
  );
});
