import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePlantaSi } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { Boton } from '@/components/ui/Boton';

const MOTIVOS = [
  'Ya se purgó hace poco',
  'La lectura de miras no coincide',
  'No hay personal en campo',
  'Mantenimiento en curso',
  'Esperar a que pase la hora punta',
  'Otro motivo',
];

/** Rechazar la recomendación: el motivo es obligatorio y queda en la bitácora. */
export function DialogoRechazo() {
  const abierto = useOperacion((s) => s.rechazoAbierto);
  const setAbierto = useOperacion((s) => s.setRechazo);
  const planta = usePlantaSi(abierto);
  const comando = useComando();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (abierto) {
      setMotivo(null);
      setNota('');
    }
  }, [abierto]);

  const rec = planta?.principal;
  const listo = !!motivo && (motivo !== 'Otro motivo' || nota.trim().length > 2);

  return (
    <Dialogo
      abierto={abierto && !!rec}
      alCerrar={() => setAbierto(false)}
      icono={<X />}
      titulo="Rechazar la recomendación"
      descripcion={rec ? `Nave ${rec.naveId.slice(1)} · urgencia ${rec.urgencia}. El motivo queda en la bitácora.` : undefined}
      pie={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            disabled={!listo}
            onClick={() => {
              if (!rec || !motivo) return;
              comando({
                tipo: 'rechazar_recomendacion',
                naveId: rec.naveId,
                urgencia: rec.urgencia,
                motivo: nota.trim() ? `${motivo}: ${nota.trim()}` : motivo,
              });
              setAbierto(false);
            }}
          >
            Registrar rechazo
          </Boton>
        </div>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-fg-muted">Motivo</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MOTIVOS.map((m) => (
            <label
              key={m}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-btn border px-3 py-2 text-label font-medium transition-colors',
                motivo === m ? 'border-accent bg-accent-soft text-fg' : 'border-line bg-surface-2 text-fg hover:border-line-strong',
              )}
            >
              <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="size-4 accent-[var(--accent)]" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-label font-semibold text-fg-muted">Nota {motivo === 'Otro motivo' ? '(obligatoria)' : '(opcional)'}</span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ej.: la mira 4 marca 160 cm, menos que el sensor"
          className="rounded-btn border border-line-strong bg-surface-2 p-3 text-body text-fg placeholder:text-fg-subtle"
        />
      </label>
    </Dialogo>
  );
}
