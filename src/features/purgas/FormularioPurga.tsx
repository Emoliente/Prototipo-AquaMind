import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownToLine, CalendarClock, Minus, Plus, Zap } from 'lucide-react';
import type { NaveId } from '@/types/dominio';
import type { EstadoPlanta } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { formatoHora, formatoNumero } from '@/lib/format';
import { simularPurga } from '@/logic/gemeloDigital';
import { esHoraPunta } from '@/logic/horario';
import { usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { Boton } from '@/components/ui/Boton';
import { Valor } from '@/components/ui/Valor';
import { Segmentado } from '@/components/ui/Segmentado';
import { CompuertaControl } from '@/components/planta/CompuertaControl';
import { APERTURA_MAX_CM } from '@/config/planta';
import { useModoDemo } from '@/demo/useModoDemo';

const MIN = 60_000;

/** Hora sugerida para programar: al terminar la hora punta, o dentro de 1 h. */
function horaSugerida(planta: EstadoPlanta): number {
  const { horaPuntaInicio, horaPuntaFin } = planta.config;
  const d = new Date(planta.t);
  if (esHoraPunta(planta.t, horaPuntaInicio, horaPuntaFin)) {
    d.setHours(horaPuntaFin, 0, 0, 0);
    return d.getTime();
  }
  const t = planta.t + 60 * MIN;
  return Math.ceil(t / (15 * MIN)) * 15 * MIN;
}

function aInputHora(t: number) {
  return formatoHora(t);
}

/**
 * Convierte "HH:MM" en el próximo instante después de `ahora`.
 * Una hora que pasó hace poco (menos de 2 h) se rechaza: casi seguro no se quería mañana.
 */
function deInputHora(valor: string, ahora: number): { t: number } | { error: string } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(valor);
  if (!m) return { error: 'Escribe una hora válida.' };
  const d = new Date(ahora);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() <= ahora) {
    if (ahora - d.getTime() < 2 * 60 * MIN) return { error: 'Esa hora ya pasó: elige otra.' };
    d.setDate(d.getDate() + 1);
  }
  return { t: d.getTime() };
}

interface Props {
  planta: EstadoPlanta;
  naveId: NaveId;
  /** Se llama tras confirmar (p. ej. para cerrar el diálogo). */
  alConfirmar?: () => void;
  /** Distribución en dos columnas (pantalla) o apilada (diálogo en celular). */
  className?: string;
}

/** Preparar una purga: apertura de 10 en 10 cm, duración, estimados, ahora o programada. */
export function FormularioPurga({ planta, naveId, alConfirmar, className }: Props) {
  const opera = usePuede('operar');
  const comando = useComando();
  const pulsarSolo = useModoDemo((s) => s.activo && s.confirmarPurga);
  const nave = planta.naves.find((n) => n.id === naveId)!;
  const rec = planta.recomendaciones.find((r) => r.naveId === naveId);
  const automatico = planta.modo === 'automatico';
  const maxCm = automatico ? planta.config.automatico.aperturaMaxCm : APERTURA_MAX_CM;

  // Nace con lo recomendado ya cargado: sin un primer cuadro con valores por defecto
  // que luego salten (se veía como parpadeo). Cada nave monta su propio formulario.
  const [apertura, setApertura] = useState(() => Math.min(rec?.aperturaCm ?? 20, maxCm));
  const [duracion, setDuracion] = useState(() => rec?.duracionMin ?? 30);
  const [cuando, setCuando] = useState<'ahora' | 'programar'>(() =>
    rec?.accion === 'programar' && planta.horaPunta ? 'programar' : 'ahora',
  );
  const [hora, setHora] = useState(() => aInputHora(horaSugerida(planta)));

  const estimado = useMemo(
    () => simularPurga(nave.nivelCm, apertura, duracion, nave.areaM2),
    [nave.nivelCm, nave.areaM2, apertura, duracion],
  );

  const programa = cuando === 'programar' ? deInputHora(hora, planta.t) : null;
  const inicioProgramado = programa && 't' in programa ? programa.t : null;
  const ocupada = planta.purgas.some((p) => p.naveId === naveId);
  const yaProgramada = planta.programadas.some((p) => p.naveId === naveId);
  const pct = (nave.nivelCm / nave.nivelCriticoCm) * 100;
  const bloqueo = !opera
    ? 'Tu perfil solo puede consultar.'
    : planta.emergencia
      ? 'Parada de emergencia activa: rearma primero.'
      : cuando === 'ahora' && ocupada
        ? 'Esta nave ya tiene una purga en curso.'
        : cuando === 'programar' && yaProgramada
          ? 'Esta nave ya tiene una purga programada.'
          : programa && 'error' in programa
            ? programa.error
            : null;

  const confirmar = () => {
    if (cuando === 'programar' && inicioProgramado) {
      comando({ tipo: 'programar_purga', naveId, aperturaCm: apertura, duracionMin: duracion, inicio: inicioProgramado, motivo: rec?.reglaTexto });
    } else {
      comando({
        tipo: 'iniciar_purga',
        naveId,
        aperturaCm: apertura,
        duracionMin: duracion,
        origen: automatico ? 'asistido' : planta.modo,
        motivo: rec?.reglaTexto,
      });
    }
    if (alConfirmar) setTimeout(alConfirmar, 650);
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface-2 p-4">
          <span className="self-start text-label font-semibold text-fg-muted">Apertura de compuerta</span>
          <CompuertaControl aperturaCm={apertura} aperturaMaxCm={maxCm} alCambiar={setApertura} deshabilitado={!opera} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {rec && <p className="rounded-btn bg-surface-2 p-3 text-label text-fg">{rec.reglaTexto}</p>}
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-2 p-3">
            <div>
              <p className="text-label font-semibold text-fg-muted">Duración</p>
              <Valor valor={duracion} unidad="min" tamano="sm" />
            </div>
            <div className="flex gap-2">
              <Boton tamano="icono" aria-label="5 minutos menos" icono={<Minus />} disabled={!opera || duracion <= 10} onClick={() => setDuracion((d) => Math.max(10, d - 5))} />
              <Boton tamano="icono" aria-label="5 minutos más" icono={<Plus />} disabled={!opera || duracion >= 300} onClick={() => setDuracion((d) => Math.min(300, d + 5))} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Estimado etiqueta="Lodo ahora" valor={nave.nivelCm} unidad="cm" pie={<><span className="num text-fg">{formatoNumero(pct)} %</span> del crítico</>} />
            <Estimado etiqueta="Lodo al terminar" valor={estimado.nivelFinalCm} unidad="cm" pie="estimado" />
            <Estimado etiqueta="Lodo que sale" valor={estimado.volumenM3} unidad="m³" pie="va a la quebrada" />
            <Estimado etiqueta="Agua usada" valor={estimado.aguaM3} unidad="m³" pie="estimado" />
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-3 sm:flex-row sm:items-center">
        <Segmentado
          etiqueta="Cuándo purgar"
          valor={cuando}
          alCambiar={(c) => {
            // Al pasar a «Programar» se propone una hora vigente, no la de cuando se abrió el formulario.
            if (c === 'programar') setHora(aInputHora(horaSugerida(planta)));
            setCuando(c);
          }}
          opciones={[
            { valor: 'ahora', texto: 'Ahora', icono: <Zap /> },
            { valor: 'programar', texto: 'Programar', icono: <CalendarClock /> },
          ]}
        />
        {cuando === 'programar' ? (
          <label className="flex flex-1 items-center gap-3">
            <span className="text-label text-fg-muted">A las</span>
            <input
              type="time"
              value={hora}
              step={300}
              onChange={(e) => setHora(e.target.value)}
              className="num h-12 rounded-btn border border-line-strong bg-surface-1 px-3 text-title font-semibold text-fg"
            />
            {planta.horaPunta && <span className="text-label text-fg-muted">fin de hora punta {planta.config.horaPuntaFin}:00</span>}
          </label>
        ) : (
          <p className="text-label text-fg-muted">La compuerta abre de 10 en 10 cm al confirmar.</p>
        )}
      </div>

      {automatico && (
        <p className="text-label text-fg-muted">
          Modo Automático: apertura limitada a <span className="num text-fg">{maxCm}</span> cm.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <BotonMantener
          etiqueta={
            cuando === 'programar'
              ? `Programar ${nave.nombre} · ${apertura} cm · ${hora}`
              : `Purgar ${nave.nombre} · ${apertura} cm · ${duracion} min`
          }
          etiquetaConfirmado={cuando === 'programar' ? 'Purga programada' : 'Purga confirmada'}
          icono={cuando === 'programar' ? <CalendarClock /> : <ArrowDownToLine />}
          deshabilitado={!!bloqueo}
          alConfirmar={confirmar}
          pulsarSolo={pulsarSolo}
        />
        {bloqueo && <p className="text-center text-label font-medium text-warn">{bloqueo}</p>}
      </div>
    </div>
  );
}

function Estimado({ etiqueta, valor, unidad, pie }: { etiqueta: string; valor: number; unidad: string; pie: ReactNode }) {
  return (
    <div className="rounded-btn border border-line p-3">
      <dt className="text-label text-fg-muted">{etiqueta}</dt>
      <dd>
        <Valor valor={valor} unidad={unidad} tamano="xs" />
      </dd>
      <dd className="text-[0.75rem] text-fg-muted">{pie}</dd>
    </div>
  );
}
