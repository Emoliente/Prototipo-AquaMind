import { useEffect, useState } from 'react';
import { Save, ScanLine, FlaskConical, TriangleAlert, CircleCheck } from 'lucide-react';
import type { EstadoPlanta, TipoMuestra } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { comparar, valorEnSerie } from '@/logic/calibracion';
import { NAVES } from '@/config/planta';
import { usePlantaSi } from '@/store/useTelemetria';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { Boton } from '@/components/ui/Boton';
import { Segmentado } from '@/components/ui/Segmentado';
import { aMomento, CampoFechaHora, fechaHoraInicial, type FechaHora } from './CampoFechaHora';
import { conUnidad, decimalesDe, textoDiferencia } from './textos';

const campo =
  'num h-12 w-full rounded-btn border border-line-strong bg-surface-2 px-3 text-title font-semibold text-fg placeholder:font-normal placeholder:text-fg-subtle';
const MAX_NOTA = 300;

type TipoDialogo = Exclude<TipoMuestra, 'miras'>;

const COPIA: Record<TipoDialogo, { titulo: string; descripcion: string; etiqueta: string; ayudaNota: string; minutosAtras: number }> = {
  laboratorio: {
    titulo: 'Resultado de laboratorio',
    descripcion: 'Sólidos en suspensión medidos en una muestra de agua. Se compara con lo que marcaba el sensor a esa hora.',
    etiqueta: 'Sólidos en la muestra',
    ayudaNota: 'Ej.: laboratorio de la EPS, método gravimétrico',
    minutosAtras: 120,
  },
  batimetria: {
    titulo: 'Batimetría',
    descripcion: 'Espesor medio del lodo medido con ecosonda o varilla en toda la nave. Se compara con el sensor de nivel.',
    etiqueta: 'Espesor medio de lodo',
    ayudaNota: 'Ej.: ecosonda desde la pasarela, 12 puntos',
    minutosAtras: 0,
  },
};

/** Carga un resultado de laboratorio o una batimetría y muestra al instante cuánto difiere del sensor. */
export function DialogoMuestra({ tipo, abierto, alCerrar }: { tipo: TipoDialogo; abierto: boolean; alCerrar: () => void }) {
  const planta = usePlantaSi(abierto);
  if (!planta) return null;
  return <Formulario key={tipo} tipo={tipo} planta={planta} abierto={abierto} alCerrar={alCerrar} />;
}

function Formulario({ tipo, planta, abierto, alCerrar }: { tipo: TipoDialogo; planta: EstadoPlanta; abierto: boolean; alCerrar: () => void }) {
  const comando = useComando();
  const c = COPIA[tipo];
  const [punto, setPunto] = useState<'sst_in' | 'sst_out'>('sst_in');
  const [nave, setNave] = useState<NaveId>('N2');
  const [cuando, setCuando] = useState<FechaHora>(() => fechaHoraInicial(planta.t, c.minutosAtras));
  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Cada vez que se abre, el formulario empieza limpio.
  useEffect(() => {
    if (!abierto) return;
    setTexto('');
    setNota('');
    setCuando(fechaHoraInicial(planta.t, c.minutosAtras));
  }, [abierto]); // solo al abrir: la hora de planta avanza cada segundo

  const sensorId = tipo === 'laboratorio' ? punto : `nivel_${nave}`;
  const sensor = planta.sensores.find((s) => s.id === sensorId)!;
  const decimales = decimalesDe(sensor);
  const momento = aMomento(planta.t, cuando);

  const t = texto.trim();
  const numero = Number(t.replace(',', '.'));
  const errorValor =
    t === ''
      ? undefined
      : !Number.isFinite(numero) || numero < sensor.rango[0] || numero > sensor.rango[1]
        ? `Escribe un valor entre ${sensor.rango[0]} y ${sensor.rango[1]} ${sensor.unidad}.`
        : undefined;
  const valido = t !== '' && !errorValor && 't' in momento;

  // Lo que marcaba el sensor a esa hora (el simulador hace la misma cuenta al guardar).
  const marcaba =
    't' in momento
      ? planta.t - momento.t < 10 * 60_000
        ? sensor.valor
        : valorEnSerie(planta.serie24h, planta.serie7d, planta.t, sensorId, sensor.naveId, momento.t)
      : null;
  const cmp = valido && marcaba !== null ? comparar(numero, marcaba, sensor.unidad === 'cm' ? 'cm' : 'g/L') : null;
  const area = NAVES.find((n) => n.id === nave)?.areaM2 ?? 260;

  const guardar = async () => {
    if (!valido || !('t' in momento) || enviando) return;
    setEnviando(true);
    const r = await comando({
      tipo: 'registrar_muestra',
      tipoMuestra: tipo,
      sensorId,
      valorReferencia: numero,
      tMuestra: momento.t,
      nota: nota.trim() || undefined,
    });
    setEnviando(false);
    if (r.ok) alCerrar();
  };

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      icono={tipo === 'laboratorio' ? <FlaskConical /> : <ScanLine />}
      titulo={c.titulo}
      descripcion={c.descripcion}
      pie={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" icono={<Save />} disabled={!valido || marcaba === null || enviando} onClick={guardar}>
            {enviando ? 'Guardando…' : 'Guardar y comparar'}
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {tipo === 'laboratorio' ? (
          <Segmentado
            etiqueta="Punto de muestreo"
            valor={punto}
            alCambiar={setPunto}
            className="w-full [&>button]:flex-1"
            opciones={[
              { valor: 'sst_in', texto: 'Entrada' },
              { valor: 'sst_out', texto: 'Salida' },
            ]}
          />
        ) : (
          <Segmentado
            etiqueta="Nave"
            valor={nave}
            alCambiar={setNave}
            className="w-full [&>button]:flex-1"
            opciones={NAVES.map((n) => ({ valor: n.id, texto: n.nombre }))}
          />
        )}

        <CampoFechaHora ahora={planta.t} valor={cuando} alCambiar={setCuando} error={'error' in momento ? momento.error : undefined} />

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg-muted">
            {c.etiqueta} <span className="font-normal">({sensor.unidad})</span>
          </span>
          <input
            inputMode="decimal"
            value={texto}
            maxLength={8}
            onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder={sensor.unidad === 'cm' ? 'Ej.: 150' : 'Ej.: 0.085'}
            aria-invalid={errorValor ? true : undefined}
            className={cn(campo, errorValor && 'border-crit')}
          />
          {errorValor && (
            <span role="alert" className="text-label font-medium text-crit">
              {errorValor}
            </span>
          )}
        </label>

        {/* Comparación inmediata con el sensor */}
        <div
          className={cn(
            'flex flex-col gap-1 rounded-btn border p-3',
            cmp && !cmp.dentro ? 'border-warn/50 bg-warn-soft' : 'border-line bg-surface-2',
          )}
          aria-live="polite"
        >
          <p className="text-label text-fg">
            {marcaba === null ? (
              <span className="text-fg-muted">No hay registro del sensor a esa hora para comparar.</span>
            ) : (
              <>
                El sensor marcaba <span className="num font-semibold">{conUnidad(marcaba, sensor.unidad, decimales)}</span>
                {cmp && (
                  <>
                    {' '}· diferencia <span className="num font-semibold">{textoDiferencia(cmp.diferencia, cmp.relativa)}</span>
                  </>
                )}
              </>
            )}
          </p>
          {cmp &&
            (cmp.dentro ? (
              <p className="flex items-center gap-1.5 text-label font-medium text-ok">
                <CircleCheck className="size-4 shrink-0" aria-hidden /> Dentro de la tolerancia: no hace falta calibrar.
              </p>
            ) : cmp.demasiado ? (
              <p className="flex items-center gap-1.5 text-label font-medium text-crit">
                <TriangleAlert className="size-4 shrink-0" aria-hidden /> Diferencia muy grande: conviene repetir la medición antes de calibrar.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-label font-medium text-warn">
                <TriangleAlert className="size-4 shrink-0" aria-hidden /> Fuera de tolerancia: quedará para que jefatura apruebe la calibración.
              </p>
            ))}
          {tipo === 'batimetria' && valido && (
            <p className="text-[0.75rem] text-fg-muted">
              Equivale a unos <span className="num text-fg">{formatoNumero((numero / 100) * area)}</span> m³ de lodo en la nave.
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg-muted">Nota (opcional)</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            maxLength={MAX_NOTA}
            placeholder={c.ayudaNota}
            className="rounded-btn border border-line-strong bg-surface-2 p-3 text-body text-fg placeholder:text-fg-subtle"
          />
        </label>
      </div>
    </Dialogo>
  );
}
