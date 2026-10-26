import { Check, CircleStop } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EstadoPlanta, PurgaEnCurso } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { formatoDuracion, formatoHora } from '@/lib/format';
import { nombreUsuario } from '@/config/usuarios';
import { usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { NaveTanque } from '@/components/planta/NaveTanque';
import { GraficoNivelPurga } from './GraficoNivelPurga';

const ORIGEN = { manual: 'Manual', asistido: 'Asistido', automatico: 'Automático' } as const;
const PASOS = [
  { id: 'abriendo', texto: 'Abrir compuerta', detalle: 'de 10 en 10 cm' },
  { id: 'purgando', texto: 'Purgar', detalle: 'el lodo baja' },
  { id: 'cerrando', texto: 'Cerrar compuerta', detalle: 'de 10 en 10 cm' },
  { id: 'volumen', texto: 'Calcular volumen', detalle: 'Δ nivel × 260 m²' },
] as const;

function Pasos({ fase }: { fase: PurgaEnCurso['fase'] }) {
  const actual = PASOS.findIndex((p) => p.id === fase);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-btn border px-3 py-2.5 transition-colors duration-300',
              activo ? 'border-accent-ring bg-accent-soft' : 'border-line bg-surface-2',
            )}
            aria-current={activo ? 'step' : undefined}
          >
            <span
              className={cn(
                'num grid size-7 shrink-0 place-items-center rounded-full text-label font-semibold',
                hecho ? 'bg-ok-soft text-ok' : activo ? 'bg-accent text-fg-on-accent' : 'bg-surface-3 text-fg-muted',
              )}
            >
              {hecho ? <Check className="size-4" aria-label="hecho" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn('block truncate text-label font-semibold', activo || hecho ? 'text-fg' : 'text-fg-muted')}>{p.texto}</span>
              <span className="block truncate text-[0.75rem] text-fg-muted">{p.detalle}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Seguimiento en vivo de una purga: pasos, corte de la nave, gráfico y números. */
export function SeguimientoPurga({ planta, purga }: { planta: EstadoPlanta; purga: PurgaEnCurso }) {
  const opera = usePuede('operar');
  const comando = useComando();
  const nave = planta.naves.find((n) => n.id === purga.naveId)!;
  const bajo = Math.max(0, purga.nivelInicialCm - nave.nivelCm);
  const restante = purga.manual ? null : Math.max(0, purga.duracionMin - purga.minutosPurgando);
  const progreso = purga.manual ? null : Math.min(1, purga.minutosPurgando / Math.max(1, purga.duracionMin));
  const fase = purga.fase === 'abriendo' ? 'Abriendo compuerta' : purga.fase === 'cerrando' ? 'Cerrando compuerta' : 'Purgando';

  return (
    <Tarjeta relleno="none" className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 sm:p-6">
        <div>
          <p className="text-label font-semibold uppercase tracking-wider text-fg-subtle">Purga en curso</p>
          <h3 className="mt-1 text-heading font-semibold text-fg">{nave.nombre}</h3>
          <p className="text-label text-fg-muted">
            Inició <span className="num text-fg">{formatoHora(purga.inicio)}</span> · {nombreUsuario(purga.usuarioId)} · modo {ORIGEN[purga.origen]}
          </p>
        </div>
        <EstadoChip estado="info" texto={fase} pulso />
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <Pasos fase={purga.fase} />

        {progreso !== null && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-label text-fg-muted">
              <span>
                Purgando <span className="num text-fg">{formatoDuracion(purga.minutosPurgando)}</span> de{' '}
                <span className="num text-fg">{formatoDuracion(purga.duracionMin)}</span>
              </span>
              <span>
                Quedan <span className="num font-semibold text-fg">{formatoDuracion(restante ?? 0)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
              <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${progreso * 100}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,2fr)_3fr]">
          <div className="flex flex-col gap-3">
            <NaveTanque
              nivelCm={nave.nivelCm}
              nivelCriticoCm={nave.nivelCriticoCm}
              aperturaCm={nave.compuerta.aperturaCm}
              sedimentando={false}
              titulo={`Corte de la ${nave.nombre} durante la purga`}
            />
            <p className="text-center text-label text-fg-muted">
              Compuerta <span className="num font-semibold text-fg">{nave.compuerta.aperturaCm}</span> de{' '}
              <span className="num text-fg">{purga.aperturaObjetivoCm || purga.aperturaUsadaCm}</span> cm
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="mb-1 text-label font-semibold text-fg-muted">Nivel de lodo durante la purga (cm)</p>
              <GraficoNivelPurga muestras={purga.muestras} criticoCm={nave.nivelCriticoCm} objetivoCm={nave.nivelCriticoCm * 0.2} alto={200} />
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato etiqueta="Lodo ahora" valor={nave.nivelCm} unidad="cm" />
              <Dato etiqueta="Bajó" valor={bajo} unidad="cm" />
              <Dato etiqueta="Lodo purgado" valor={purga.volumenParcialM3} unidad="m³" />
              <Dato etiqueta="Agua usada" valor={purga.aguaParcialM3} unidad="m³" />
            </dl>
          </div>
        </div>

        {opera && purga.fase !== 'cerrando' && (
          <BotonMantener
            etiqueta="Detener la purga"
            etiquetaConfirmado="Cerrando compuerta"
            icono={<CircleStop />}
            variante="peligro"
            alConfirmar={() => comando({ tipo: 'abortar_purga', naveId: purga.naveId, motivo: 'Detenida desde Purgas' })}
            className="sm:max-w-sm"
          />
        )}
      </div>
    </Tarjeta>
  );
}

function Dato({ etiqueta, valor, unidad }: { etiqueta: string; valor: number; unidad: string }) {
  return (
    <div className="rounded-btn border border-line p-3">
      <dt className="text-label text-fg-muted">{etiqueta}</dt>
      <dd>
        <Valor valor={valor} unidad={unidad} tamano="sm" />
      </dd>
    </div>
  );
}

