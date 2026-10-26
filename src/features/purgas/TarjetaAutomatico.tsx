import { useEffect, useState } from 'react';
import { Bot, Minus, Plus, Save, UserCheck } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { ConfigPlanta } from '@/config/planta';
import { usePuede, useOperacion } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { EstadoChip } from '@/components/ui/EstadoChip';

const HORAS = Array.from({ length: 25 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

function Paso({
  etiqueta,
  valor,
  unidad,
  min,
  max,
  paso,
  editable,
  alCambiar,
}: {
  etiqueta: string;
  valor: number;
  unidad: string;
  min: number;
  max: number;
  paso: number;
  editable: boolean;
  alCambiar: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-btn border border-line bg-surface-2 p-3">
      <div>
        <p className="text-label text-fg-muted">{etiqueta}</p>
        <p className="num text-title font-semibold text-fg">
          {valor} <span className="font-sans text-label font-normal text-fg-muted">{unidad}</span>
        </p>
      </div>
      {editable && (
        <div className="flex gap-2">
          <Boton tamano="icono" aria-label={`${etiqueta}: menos`} icono={<Minus />} disabled={valor <= min} onClick={() => alCambiar(Math.max(min, valor - paso))} />
          <Boton tamano="icono" aria-label={`${etiqueta}: más`} icono={<Plus />} disabled={valor >= max} onClick={() => alCambiar(Math.min(max, valor + paso))} />
        </div>
      )}
    </div>
  );
}

/** Modo Automático: estado y límites (purgas por día, apertura máxima, horario). Solo jefatura los cambia. */
export function TarjetaAutomatico({ planta }: { planta: EstadoPlanta }) {
  const editable = usePuede('editar_configuracion');
  const activar = usePuede('modo_automatico');
  const opera = usePuede('operar');
  const abrirAutomatico = useOperacion((s) => s.setAutomatico);
  const comando = useComando();
  const [limites, setLimites] = useState<ConfigPlanta['automatico']>(planta.config.automatico);
  const activo = planta.modo === 'automatico';

  // Si otro usuario guarda límites, se reflejan aquí.
  useEffect(() => setLimites(planta.config.automatico), [planta.config.automatico]);

  const cambiado = JSON.stringify(limites) !== JSON.stringify(planta.config.automatico);
  const set = (k: keyof ConfigPlanta['automatico']) => (v: number) => setLimites((l) => ({ ...l, [k]: v }));

  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-btn bg-surface-3 text-fg-muted">
            <Bot className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-title font-semibold text-fg">Modo Automático</h3>
            <p className="text-label text-fg-muted">
              Purgas hoy <span className="num text-fg">{planta.purgasHoy}</span> de <span className="num text-fg">{planta.config.automatico.purgasMaxDia}</span>
            </p>
          </div>
        </div>
        {activo ? <EstadoChip estado="en_marcha" texto="Activo" /> : <EstadoChip estado="apagada" texto="Inactivo" />}
      </div>

      <p className="text-label text-fg-muted">
        Cuando la urgencia pasa de 70, el sistema purga solo, dentro de estos límites.
      </p>

      <div className="flex flex-col gap-2">
        <Paso etiqueta="Purgas máximas por día" valor={limites.purgasMaxDia} unidad="purgas" min={1} max={10} paso={1} editable={editable} alCambiar={set('purgasMaxDia')} />
        <Paso etiqueta="Apertura máxima" valor={limites.aperturaMaxCm} unidad="cm" min={10} max={100} paso={10} editable={editable} alCambiar={set('aperturaMaxCm')} />
        <div className="flex flex-col gap-2 rounded-btn border border-line bg-surface-2 p-3">
          <p className="text-label text-fg-muted">Horario permitido</p>
          {editable ? (
            <div className="flex items-center gap-2">
              <select
                aria-label="Desde"
                value={limites.horaDesde}
                onChange={(e) => set('horaDesde')(Number(e.target.value))}
                className="num h-12 flex-1 rounded-btn border border-line-strong bg-surface-1 px-3 text-body font-semibold text-fg"
              >
                {HORAS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>{hh(h)}</option>
                ))}
              </select>
              <span className="text-label text-fg-muted">a</span>
              <select
                aria-label="Hasta"
                value={limites.horaHasta}
                onChange={(e) => set('horaHasta')(Number(e.target.value))}
                className="num h-12 flex-1 rounded-btn border border-line-strong bg-surface-1 px-3 text-body font-semibold text-fg"
              >
                {HORAS.slice(1).map((h) => (
                  <option key={h} value={h}>{hh(h)}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="num text-title font-semibold text-fg">
              {hh(limites.horaDesde)} – {hh(limites.horaHasta)}
            </p>
          )}
        </div>
      </div>

      {editable && cambiado && (
        <Boton variante="primario" icono={<Save />} onClick={() => comando({ tipo: 'config', config: { automatico: limites }, motivo: 'Límites del modo Automático' })}>
          Guardar límites
        </Boton>
      )}

      {activo
        ? opera && (
            <Boton icono={<UserCheck />} onClick={() => comando({ tipo: 'modo', modo: 'asistido' })}>
              Volver a modo Asistido
            </Boton>
          )
        : activar && (
            <Boton icono={<Bot />} onClick={() => abrirAutomatico(true)} disabled={cambiado}>
              Activar modo Automático
            </Boton>
          )}
      {!editable && <p className="text-[0.75rem] text-fg-subtle">Solo jefatura de operaciones cambia los límites y activa este modo.</p>}
    </Tarjeta>
  );
}
