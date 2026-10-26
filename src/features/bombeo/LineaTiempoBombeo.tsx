import type { EstadoPlanta } from '@/data/DataSource';
import type { BombaId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoHora } from '@/lib/format';

const MIN = 60_000;
const HORA = 60 * MIN;

interface Bloque {
  bombaId: BombaId;
  desde: number;
  hasta: number;
  enCurso: boolean;
}

/** Línea de tiempo de las próximas horas: cuándo trabaja cada bomba y dónde cae la hora punta. */
export function LineaTiempoBombeo({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const ahora = planta.t;
  const bloques: Bloque[] = [];
  if (planta.bombeo) {
    for (const b of planta.bombas.filter((x) => x.estado === 'en_marcha')) {
      bloques.push({ bombaId: b.id, desde: planta.bombeo.inicio, hasta: ahora + (b.minutosRestantes ?? 30) * MIN, enCurso: true });
    }
  } else {
    const inicio = planta.planProgramado?.inicio ?? planta.plan.inicioSugerido;
    for (const a of planta.plan.asignaciones) {
      bloques.push({ bombaId: a.bombaId, desde: inicio, hasta: inicio + a.minutos * MIN, enCurso: false });
    }
  }

  const fin = Math.max(ahora + 8 * HORA, ...bloques.map((b) => b.hasta + HORA));
  const desde = Math.min(ahora - HORA, ...bloques.map((b) => b.desde));
  const inicioVentana = Math.floor(desde / HORA) * HORA;
  const finVentana = Math.ceil(fin / HORA) * HORA;
  const total = finVentana - inicioVentana;
  const pos = (t: number) => `${((Math.min(Math.max(t, inicioVentana), finVentana) - inicioVentana) / total) * 100}%`;
  const ancho = (a: number, b: number) => `${((Math.min(b, finVentana) - Math.max(a, inicioVentana)) / total) * 100}%`;

  // franjas de hora punta dentro de la ventana
  const puntas: [number, number][] = [];
  const d = new Date(inicioVentana);
  d.setHours(0, 0, 0, 0);
  for (let dia = d.getTime(); dia < finVentana; dia += 24 * HORA) {
    const a = dia + planta.config.horaPuntaInicio * HORA;
    const b = dia + planta.config.horaPuntaFin * HORA;
    if (b > inicioVentana && a < finVentana) puntas.push([a, b]);
  }

  const horas = Math.round(total / HORA);
  const paso = horas > 14 ? 3 : 2;
  const marcas: number[] = [];
  for (let t = inicioVentana; t <= finVentana; t += paso * HORA) marcas.push(t);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        {/* filas */}
        <div className="flex flex-col gap-2">
          {planta.bombas.map((b) => {
            const bl = bloques.find((x) => x.bombaId === b.id);
            return (
              <div key={b.id} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-label font-semibold text-fg">B{b.id.slice(1)}</span>
                <div className="relative h-9 flex-1 overflow-hidden rounded-btn bg-surface-2">
                  {puntas.map(([a, z]) => (
                    <div
                      key={a}
                      className="absolute inset-y-0 bg-warn-soft"
                      style={{ left: pos(a), width: ancho(a, z), backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--warn) 18%, transparent) 6px 8px)' }}
                      aria-hidden
                    />
                  ))}
                  {bl && (
                    <div
                      className={cn(
                        'absolute inset-y-1.5 flex items-center overflow-hidden rounded-[6px] px-2 text-[0.75rem] font-semibold',
                        bl.enCurso ? 'bg-accent text-fg-on-accent' : 'border-2 border-dashed border-accent bg-accent-soft text-fg',
                      )}
                      style={{ left: pos(bl.desde), width: ancho(bl.desde, bl.hasta) }}
                      title={`Bomba ${b.id.slice(1)}: ${formatoHora(bl.desde)}–${formatoHora(bl.hasta)}`}
                    >
                      <span className="num truncate">
                        {formatoHora(bl.desde)}–{formatoHora(bl.hasta)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* ahora */}
        <div className="pointer-events-none absolute inset-y-0 left-11 right-0" aria-hidden>
          <div className="absolute inset-y-[-6px] w-0.5 rounded-full bg-fg" style={{ left: pos(ahora) }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-1.5 text-[0.65rem] font-bold text-[var(--base)]">
              ahora
            </span>
          </div>
        </div>
      </div>
      {/* eje */}
      <div className="relative ml-11 h-5">
        {marcas.map((t) => (
          <span key={t} className="num absolute -translate-x-1/2 text-[0.75rem] text-fg-subtle" style={{ left: pos(t) }}>
            {formatoHora(t)}
          </span>
        ))}
      </div>
      <div className="ml-11 flex flex-wrap gap-x-5 gap-y-1 text-[0.75rem] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm border-2 border-dashed border-accent bg-accent-soft" aria-hidden /> Planificado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-accent" aria-hidden /> En marcha
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-warn-soft" aria-hidden /> Hora punta {planta.config.horaPuntaInicio}:00–{planta.config.horaPuntaFin}:00
        </span>
      </div>
    </div>
  );
}
