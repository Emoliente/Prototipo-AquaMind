import { memo } from 'react';
import { ClipboardCheck, Gauge, Trash2 } from 'lucide-react';
import type { MuestraCalibracion, SensorInfo } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { diaYHora, formatoNumero } from '@/lib/format';
import { comparar } from '@/logic/calibracion';
import { nombreUsuario } from '@/config/usuarios';
import { usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { TIPO_MUESTRA, decimalesDe, textoDiferencia } from './textos';

/** Qué le pasa al sensor si se aprueba, en palabras simples. */
function efecto(m: MuestraCalibracion) {
  if (m.unidad === 'cm') {
    const c = m.valorReferencia - m.valorSensor;
    return `el sensor se corrige ${c > 0 ? '+' : ''}${formatoNumero(c)} cm y pasa a marcar como la referencia.`;
  }
  const f = m.valorReferencia / Math.max(1e-6, m.valorSensor);
  return `el sensor se multiplica por ${formatoNumero(f, 3)} (marcará ${formatoNumero(Math.abs(1 - f) * 100)} % ${f < 1 ? 'menos' : 'más'}).`;
}

function Cifra({ etiqueta, valor, unidad, destacada }: { etiqueta: string; valor: string; unidad?: string; destacada?: boolean }) {
  return (
    // En celular, la diferencia ocupa su propia fila debajo de las dos cifras.
    <div className={cn('min-w-0 rounded-btn border p-3', destacada ? 'col-span-2 border-warn/40 bg-warn-soft sm:col-span-1' : 'border-line bg-surface-1')}>
      <dt className="truncate text-[0.75rem] text-fg-muted">{etiqueta}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-1">
        <span className={cn('num whitespace-nowrap text-body font-semibold sm:text-title', destacada ? 'text-warn' : 'text-fg')}>{valor}</span>
        {unidad && <span className="text-label text-fg-muted">{unidad}</span>}
      </dd>
    </div>
  );
}

type SensorBreve = Pick<SensorInfo, 'id' | 'nombre' | 'unidad' | 'decimales'>;

function Pendiente({ m, sensor, ahora }: { m: MuestraCalibracion; sensor: SensorBreve; ahora: number }) {
  const aprueba = usePuede('aprobar_calibracion');
  const comando = useComando();
  const cmp = comparar(m.valorReferencia, m.valorSensor, m.unidad);
  const T = TIPO_MUESTRA[m.tipo];
  const d = decimalesDe(sensor);
  return (
    <li className="flex flex-col gap-4 rounded-card border border-warn/40 bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-btn bg-surface-3 text-fg-muted">
            <T.icono className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold text-fg">{sensor.nombre}</p>
            <p className="text-label text-fg-muted">
              {T.texto} · tomada {diaYHora(m.tMuestra, ahora)} · cargó {nombreUsuario(m.usuarioId)}
            </p>
          </div>
        </div>
        <EstadoChip estado="advertencia" texto="Por aprobar" tamano="sm" />
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Cifra etiqueta={m.tipo === 'laboratorio' ? 'Laboratorio' : m.tipo === 'miras' ? 'Miras' : 'Batimetría'} valor={formatoNumero(m.valorReferencia, d)} unidad={m.unidad} />
        <Cifra etiqueta="Sensor" valor={formatoNumero(m.valorSensor, d)} unidad={m.unidad} />
        <Cifra etiqueta="Diferencia" valor={textoDiferencia(cmp.diferencia, cmp.relativa)} destacada />
      </dl>

      <p className="text-label text-fg">
        {cmp.demasiado ? (
          <span className="font-medium text-crit">La diferencia es demasiado grande para calibrar con esta muestra: conviene repetirla.</span>
        ) : (
          <>
            <Gauge className="mr-1.5 inline size-4 align-[-3px] text-fg-muted" aria-hidden />
            Al aprobar, {efecto(m)}
          </>
        )}
        {m.nota && <span className="block text-fg-muted">Nota: {m.nota}</span>}
      </p>

      {aprueba ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!cmp.demasiado && (
            <BotonMantener
              etiqueta="Aprobar calibración"
              etiquetaConfirmado="Calibrado"
              icono={<ClipboardCheck />}
              alConfirmar={() => void comando({ tipo: 'revisar_muestra', muestraId: m.id, aprobar: true })}
              className="sm:flex-1"
            />
          )}
          <Boton
            variante="fantasma"
            icono={<Trash2 />}
            onClick={() => void comando({ tipo: 'revisar_muestra', muestraId: m.id, aprobar: false, motivo: 'Descartada por jefatura' })}
          >
            Descartar
          </Boton>
        </div>
      ) : (
        <p className="text-label text-fg-muted">Espera la aprobación de jefatura de operaciones.</p>
      )}
    </li>
  );
}

/** Comparaciones fuera de tolerancia que esperan la decisión de jefatura. */
export const ListaPendientes = memo(function ListaPendientes({
  muestras,
  sensores,
  ahora,
  className,
}: {
  muestras: MuestraCalibracion[];
  sensores: SensorBreve[];
  /** Inicio del día de planta (para "hoy" / "ayer"). */
  ahora: number;
  className?: string;
}) {
  const pendientes = muestras.filter((m) => m.estado === 'pendiente');
  return (
    <Tarjeta className={cn('flex flex-col gap-4', className)}>
      <EncabezadoTarjeta
        className="flex-none"
        icono={<ClipboardCheck className="size-5" />}
        titulo="Por aprobar"
        subtitulo={pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? 'sensor pide' : 'sensores piden'} calibración` : 'Todo dentro de tolerancia'}
      />
      {pendientes.length === 0 ? (
        <p className="rounded-btn border border-dashed border-line-strong px-4 py-6 text-center text-label text-fg-muted">
          No hay calibraciones pendientes. Los sensores coinciden con el laboratorio, las miras y las batimetrías.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pendientes.map((m) => {
            const sensor = sensores.find((s) => s.id === m.sensorId);
            return sensor ? <Pendiente key={m.id} m={m} sensor={sensor} ahora={ahora} /> : null;
          })}
        </ul>
      )}
    </Tarjeta>
  );
});
