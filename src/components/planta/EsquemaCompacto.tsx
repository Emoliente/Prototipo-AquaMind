import { memo, useId } from 'react';
import { ArrowDown, ArrowDownToLine, ChevronRight, Droplets, Fan, Waves } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import type { TipoEstado } from '@/components/ui/EstadoChip';
import { cn } from '@/lib/cn';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { ESCALA_CM, ESTADO_BOMBA, estadoNave, fraseBombeo, frasePurga, fraseSedimento, textoEmbalse, valido, type Frase } from './esquemaTextos';

/*
 * El esquema en vivo para pantallas angostas: el mismo recorrido, de arriba abajo
 * (entrada → naves → agua limpia al embalse y sus bombas; la purga se desvía a la quebrada),
 * sin tener que deslizar de costado.
 */

/** Corte pequeño de una nave: agua arriba, lodo abajo y la línea del nivel crítico. */
const CorteMini = memo(function CorteMini({ nivelCm, criticoCm, sinDatos }: { nivelCm: number; criticoCm: number; sinDatos: boolean }) {
  const id = useId().replace(/:/g, '');
  const H = 44;
  const alto = (cm: number) => Math.min(H - 3, Math.max(0, (cm / ESCALA_CM) * H));
  const yIn = H - alto(nivelCm * 1.12);
  const yOut = H - alto(nivelCm * 0.88);
  const yCrit = H - alto(criticoCm);
  return (
    <svg viewBox={`0 0 300 ${H}`} preserveAspectRatio="none" className="block h-11 w-full" aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <rect width="300" height={H} rx="8" />
        </clipPath>
        <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--water)" stopOpacity={0.85} />
          <stop offset="1" stopColor="var(--water-deep)" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#c${id})`} opacity={sinDatos ? 0.5 : 1}>
        <rect width="300" height={H} fill={`url(#a${id})`} />
        <path d={`M0,${H} L0,${yIn} Q75,${yIn} 150,${(yIn + yOut) / 2} T300,${yOut} L300,${H} Z`} fill="var(--sludge)" stroke="var(--sludge-top)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </g>
      <line x1="0" x2="300" y1={yCrit} y2={yCrit} stroke="var(--crit)" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
});

const Fila = memo(
  function Fila({ icono: I, frase }: { icono: typeof Fan; frase: Frase }) {
    return (
      <li className="flex items-start gap-2.5">
        <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-btn', frase.atencion ? 'bg-warn-soft text-warn' : 'bg-surface-3 text-fg-muted')}>
          <I className="size-4" aria-hidden />
        </span>
        <span className={cn('text-label leading-snug', frase.atencion ? 'font-semibold text-warn' : 'text-fg')}>{frase.texto}</span>
      </li>
    );
  },
  (a, b) => a.frase.texto === b.frase.texto && a.frase.atencion === b.frase.atencion,
);

const Flecha = () => (
  <div className="flex justify-center text-fg-subtle" aria-hidden>
    <ArrowDown className="size-4" />
  </div>
);

interface NaveFila {
  id: NaveId;
  nombre: string;
  nivelCm: number;
  criticoCm: number;
  pct: number | null;
  estado: TipoEstado;
  texto: string;
  sinDatos: boolean;
  aperturaCm: number;
}

const FilaNave = memo(function FilaNave({ n, destacada, alSeleccionar }: { n: NaveFila; destacada: boolean; alSeleccionar?: (id: NaveId) => void }) {
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="text-body font-semibold text-fg">{n.nombre}</span>
          {n.pct !== null && (
            <span className="num text-label font-semibold text-fg">
              {n.pct} <span className="font-sans font-normal text-fg-muted">% del crítico</span>
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <EstadoChip estado={n.estado} texto={n.texto} tamano="sm" pulso={n.estado === 'critica'} />
          {alSeleccionar && <ChevronRight className="size-4 text-fg-subtle" aria-hidden />}
        </span>
      </div>
      <CorteMini nivelCm={n.nivelCm} criticoCm={n.criticoCm} sinDatos={n.sinDatos} />
      {n.aperturaCm > 0 && <span className="text-[0.75rem] text-fg-muted">Compuerta abierta {n.aperturaCm} cm</span>}
    </>
  );
  const clase = cn('flex w-full flex-col gap-2 rounded-btn px-3 py-3 text-left', destacada && 'ring-2 ring-accent-ring');
  return alSeleccionar ? (
    <button type="button" onClick={() => alSeleccionar(n.id)} className={cn(clase, 'transition-colors hover:bg-surface-2')} aria-label={`${n.nombre}: ${n.texto}. Ver detalle.`}>
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
  );
});

export function EsquemaCompacto({
  planta,
  naveDestacada,
  alSeleccionarNave,
}: {
  planta: EstadoPlanta;
  naveDestacada?: NaveId | null;
  alSeleccionarNave?: (id: NaveId) => void;
}) {
  const lodoEmbalse = valido(planta.embalseLodoM3) ? planta.embalseLodoM3 : 0;
  const capacidad = valido(planta.embalseCapacidadM3) && planta.embalseCapacidadM3 > 0 ? planta.embalseCapacidadM3 : 3000;
  const naves: NaveFila[] = planta.naves.map((n) => {
    const e = estadoNave(planta, n);
    return {
      id: n.id,
      nombre: n.nombre,
      nivelCm: valido(n.nivelCm) ? Math.round(Math.max(0, n.nivelCm)) : 0,
      criticoCm: valido(n.nivelCriticoCm) ? n.nivelCriticoCm : 250,
      pct: e.pct === null ? null : Math.round(e.pct),
      estado: e.estado,
      texto: e.texto,
      sinDatos: e.sinDatos,
      aperturaCm: valido(n.compuerta?.aperturaCm) ? n.compuerta.aperturaCm : 0,
    };
  });

  return (
    <div className="flex flex-col gap-3 px-4 py-4" role="group" aria-label="Esquema del desarenador, de la entrada al embalse donde están las bombas">
      <ul className="flex flex-col gap-2.5">
        <Fila icono={Droplets} frase={fraseSedimento(planta.sstEntradaGL)} />
      </ul>
      <Flecha />
      <div className="flex flex-col divide-y divide-line rounded-card border border-line">
        {naves.map((n) => (
          <FilaNave key={n.id} n={n} destacada={naveDestacada === n.id} alSeleccionar={alSeleccionarNave} />
        ))}
      </div>
      <Flecha />
      <ul className="flex flex-col gap-2.5">
        <Fila icono={Waves} frase={{ texto: 'La purga baja a la quebrada: ese lodo no llega al embalse' }} />
        <Fila icono={Droplets} frase={{ texto: 'El agua limpia sigue al embalse con los finos que pasan' }} />
      </ul>
      <Flecha />
      <div className="flex flex-col gap-2.5 rounded-card border border-line px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-body font-semibold text-fg">Embalse</span>
          <span className="text-label text-fg-muted">{textoEmbalse(lodoEmbalse)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Lodo fino en el embalse al ${Math.round(Math.min(1, lodoEmbalse / capacidad) * 100)} % de su capacidad`}>
          <div className="h-full rounded-full bg-sludge transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(1, lodoEmbalse / capacidad) * 100)}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {planta.bombas.map((b) => {
            const e = ESTADO_BOMBA[b.estado] ?? ESTADO_BOMBA.apagada;
            return (
              <span key={b.id} className="flex items-center gap-1.5">
                <span className="text-label font-semibold text-fg">B{b.id.slice(1)}</span>
                <EstadoChip estado={e.estado} texto={e.texto} tamano="sm" />
              </span>
            );
          })}
        </div>
      </div>
      <p className="pt-1 text-label font-semibold text-fg-muted">Ahora mismo</p>
      <ul className="flex flex-col gap-2.5">
        <Fila icono={ArrowDownToLine} frase={frasePurga(planta)} />
        <Fila icono={Fan} frase={fraseBombeo(planta)} />
      </ul>
    </div>
  );
}
