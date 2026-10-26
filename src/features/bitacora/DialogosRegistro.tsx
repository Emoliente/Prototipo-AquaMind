import { useEffect, useState } from 'react';
import { Ruler, Save, StickyNote, TriangleAlert } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { Boton } from '@/components/ui/Boton';
import { Segmentado } from '@/components/ui/Segmentado';
import { MIRAS_POR_NAVE } from '@/config/planta';
import { ESCALA_CM } from '@/components/planta/NaveTanque';

/** Largo máximo de una nota: suficiente para el turno, sin textos pegados por error. */
const MAX_NOTA = 500;

type Lectura = { estado: 'vacia' } | { estado: 'invalida' } | { estado: 'ok'; valor: number };

/** Una mira mide de 0 a 400 cm: fuera de eso es un error de tipeo (p. ej. 1600 en vez de 160). */
function leerMira(v: string): Lectura {
  const t = v.trim();
  if (!t) return { estado: 'vacia' };
  const x = Number(t.replace(',', '.'));
  return Number.isFinite(x) && x >= 0 && x <= ESCALA_CM ? { estado: 'ok', valor: x } : { estado: 'invalida' };
}

const campo =
  'num h-12 w-full rounded-btn border border-line-strong bg-surface-2 px-3 text-title font-semibold text-fg placeholder:font-normal placeholder:text-fg-subtle';

/** Lectura manual de las 7 miras de una nave, comparada con el sensor. */
export function DialogoLecturaMiras({ planta, abierto, alCerrar }: { planta: EstadoPlanta; abierto: boolean; alCerrar: () => void }) {
  const comando = useComando();
  const [nave, setNave] = useState<NaveId>('N2');
  const [valores, setValores] = useState<string[]>(Array(MIRAS_POR_NAVE).fill(''));

  useEffect(() => {
    if (abierto) setValores(Array(MIRAS_POR_NAVE).fill(''));
  }, [abierto, nave]);

  const n = planta.naves.find((x) => x.id === nave)!;
  const lecturas = valores.map(leerMira);
  const numeros = lecturas.flatMap((l) => (l.estado === 'ok' ? [l.valor] : []));
  const invalidas = lecturas.flatMap((l, i) => (l.estado === 'invalida' ? [i + 1] : []));
  const vacias = lecturas.filter((l) => l.estado === 'vacia').length;
  const completas = numeros.length === MIRAS_POR_NAVE;
  const promedio = numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : null;
  const diferencia = promedio !== null ? promedio - n.nivelCm : null;
  const grande = diferencia !== null && Math.abs(diferencia) > 10;

  const guardar = () => {
    if (!completas || promedio === null || diferencia === null) return;
    // Queda en la bitácora y, comparada con el sensor, en Calibración (si difiere, para que jefatura la revise).
    comando({
      tipo: 'registrar_muestra',
      tipoMuestra: 'miras',
      sensorId: `nivel_${nave}`,
      valorReferencia: Math.round(promedio * 10) / 10,
      tMuestra: planta.t,
      detalle: `Lectura de miras ${n.nombre}: ${numeros.map((v) => formatoNumero(v)).join(', ')} cm · promedio ${formatoNumero(promedio)} cm (sensor ${formatoNumero(n.nivelCm)} cm, diferencia ${diferencia >= 0 ? '+' : ''}${formatoNumero(diferencia)} cm).`,
    });
    alCerrar();
  };

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      icono={<Ruler />}
      titulo="Registrar lectura de miras"
      descripcion="Escribe lo que marca cada mira, de la entrada (1) a la salida (7)."
      ancho="sm:max-w-xl"
      pie={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" icono={<Save />} disabled={!completas} onClick={guardar}>
            Guardar en la bitácora
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmentado
          etiqueta="Nave"
          valor={nave}
          alCambiar={setNave}
          className="w-full [&>button]:flex-1"
          opciones={planta.naves.map((x) => ({ valor: x.id, texto: x.nombre }))}
        />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {valores.map((v, i) => (
            <label key={i} className="flex flex-col gap-1">
              <span className="text-label text-fg-muted">Mira {i + 1}</span>
              <input
                inputMode="decimal"
                value={v}
                onChange={(e) => setValores((xs) => xs.map((x, j) => (j === i ? e.target.value.replace(/[^\d.,]/g, '') : x)))}
                placeholder="cm"
                aria-label={`Mira ${i + 1} en centímetros`}
                aria-invalid={lecturas[i].estado === 'invalida' || undefined}
                maxLength={6}
                className={cn(campo, lecturas[i].estado === 'invalida' && 'border-crit')}
              />
            </label>
          ))}
        </div>
        <div className={cn('flex flex-col gap-1 rounded-btn border p-3', grande ? 'border-warn/50 bg-warn-soft' : 'border-line bg-surface-2')}>
          <p className="text-label text-fg">
            Promedio <span className="num font-semibold">{promedio === null ? '—' : formatoNumero(promedio)}</span> cm · sensor{' '}
            <span className="num font-semibold">{formatoNumero(n.nivelCm)}</span> cm
            {diferencia !== null && (
              <>
                {' '}· diferencia <span className="num font-semibold">{diferencia >= 0 ? '+' : ''}{formatoNumero(diferencia)}</span> cm
              </>
            )}
          </p>
          {grande && (
            <p className="flex items-center gap-1.5 text-label font-medium text-warn">
              <TriangleAlert className="size-4" aria-hidden /> Más de 10 cm de diferencia: conviene revisar el sensor (Calibración).
            </p>
          )}
          {invalidas.length > 0 && (
            <p role="alert" className="flex items-center gap-1.5 text-label font-medium text-crit">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              {invalidas.length === 1 ? `Mira ${invalidas[0]}` : `Miras ${invalidas.join(', ')}`}: escribe un valor entre 0 y {ESCALA_CM} cm.
            </p>
          )}
          {vacias > 0 && <p className="text-[0.75rem] text-fg-muted">Faltan {vacias} {vacias === 1 ? 'mira' : 'miras'}.</p>}
        </div>
      </div>
    </Dialogo>
  );
}

/** Nota libre del turno (opcionalmente asociada a una nave). */
export function DialogoNota({ planta, abierto, alCerrar }: { planta: EstadoPlanta; abierto: boolean; alCerrar: () => void }) {
  const comando = useComando();
  const [texto, setTexto] = useState('');
  const [nave, setNave] = useState<NaveId | ''>('');

  useEffect(() => {
    if (abierto) {
      setTexto('');
      setNave('');
    }
  }, [abierto]);

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      icono={<StickyNote />}
      titulo="Agregar nota"
      descripcion="Queda en la bitácora con tu nombre y la hora."
      pie={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
          <Boton
            variante="primario"
            icono={<Save />}
            disabled={texto.trim().length < 3 || texto.length > MAX_NOTA}
            onClick={() => {
              comando({ tipo: 'registrar', evento: { tipo: 'nota', naveId: nave || undefined, detalle: texto.trim() } });
              alCerrar();
            }}
          >
            Guardar nota
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg-muted">Nave (opcional)</span>
          <select
            value={nave}
            onChange={(e) => setNave(e.target.value as NaveId | '')}
            className="h-12 rounded-btn border border-line-strong bg-surface-2 px-3 text-body text-fg"
          >
            <option value="">General</option>
            {planta.naves.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg-muted">Nota</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={MAX_NOTA}
            placeholder="Ej.: limpieza de rejillas; la compuerta de la Nave 3 hace ruido al abrir."
            className="rounded-btn border border-line-strong bg-surface-2 p-3 text-body text-fg placeholder:text-fg-subtle"
          />
          <span className="self-end text-[0.75rem] text-fg-muted">
            <span className="num">{texto.length}</span> / {MAX_NOTA}
          </span>
        </label>
      </div>
    </Dialogo>
  );
}
