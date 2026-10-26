import { useEffect, useState } from 'react';
import { CircleAlert, Clock, Coins, Gauge, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import type { NaveId } from '@/types/dominio';
import { NAVES, type ConfigPlanta } from '@/config/planta';
import { cn } from '@/lib/cn';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { describirCambios, LIMITES, MOTIVO_MINIMO, validarConfig } from '@/logic/configuracion';
import { useComando } from '@/store/useComando';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { BotonMantener } from '@/components/ui/BotonMantener';

const campo = 'num h-12 w-full rounded-btn border border-line-strong bg-surface-2 px-3 text-title font-semibold text-fg';
const selector = 'num h-12 w-full rounded-btn border border-line-strong bg-surface-2 px-3 text-body font-semibold text-fg';
const MAX_MOTIVO = 200;
const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface Borrador {
  criticos: Record<NaveId, string>;
  inicio: number;
  fin: number;
  tarifa: string;
}

const desdeConfig = (c: ConfigPlanta): Borrador => ({
  criticos: { N1: String(c.nivelCriticoCm.N1), N2: String(c.nivelCriticoCm.N2), N3: String(c.nivelCriticoCm.N3) },
  inicio: c.horaPuntaInicio,
  fin: c.horaPuntaFin,
  tarifa: c.tarifaSolesKwh.toFixed(2),
});

const numero = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.')));

function MensajeError({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <span role="alert" className="text-label font-medium text-crit">
      {texto}
    </span>
  );
}

/**
 * Niveles críticos, hora punta y tarifa. Muestra al instante qué cambia, pide el motivo
 * (queda en la auditoría) y se guarda manteniendo presionado 2 s.
 */
export function FormularioParametros({
  config,
  niveles,
  puedeEditar,
  className,
}: {
  config: ConfigPlanta;
  /** Nivel de lodo actual por nave (cm, entero), para ver cómo queda con el nuevo crítico. */
  niveles: Record<NaveId, number>;
  puedeEditar: boolean;
  className?: string;
}) {
  const comando = useComando();
  const [b, setB] = useState<Borrador>(() => desdeConfig(config));
  const [motivo, setMotivo] = useState('');

  const cambio: Partial<ConfigPlanta> = {
    nivelCriticoCm: { N1: numero(b.criticos.N1), N2: numero(b.criticos.N2), N3: numero(b.criticos.N3) },
    horaPuntaInicio: b.inicio,
    horaPuntaFin: b.fin,
    tarifaSolesKwh: numero(b.tarifa),
  };
  const errores = validarConfig(cambio);
  const hayErrores = Object.keys(errores).length > 0;
  const cambios = hayErrores ? [] : describirCambios(config, cambio);
  const motivoOk = motivo.trim().length >= MOTIVO_MINIMO;

  // Sin cambios en curso, el formulario sigue a la configuración guardada (p. ej. si cambia en otra pantalla).
  const [base, setBase] = useState(config);
  const editando = describirCambios(base, hayErrores ? {} : cambio).length > 0 || hayErrores;
  useEffect(() => {
    if (config === base) return;
    if (!editando) setB(desdeConfig(config));
    setBase(config);
  }, [config]); // solo cuando cambia la configuración guardada

  const descartar = () => {
    setB(desdeConfig(config));
    setMotivo('');
  };

  const guardar = async () => {
    const r = await comando({ tipo: 'config', config: cambio, motivo: motivo.trim() });
    if (r.ok) setMotivo('');
  };

  const tarifa = numero(b.tarifa);
  const deshabilitado = !puedeEditar;

  return (
    <Tarjeta className={cn('flex flex-col gap-6', className)}>
      <EncabezadoTarjeta
        className="flex-none"
        icono={<SlidersHorizontal className="size-5" />}
        titulo="Parámetros de operación"
        subtitulo="Cada cambio queda en la auditoría con quién, cuándo y por qué"
      />

      {/* Niveles críticos */}
      <fieldset className="flex flex-col gap-3" disabled={deshabilitado}>
        <legend className="mb-3 flex items-center gap-2 text-body font-semibold text-fg">
          <Gauge className="size-4 text-fg-muted" aria-hidden /> Nivel crítico de lodo
        </legend>
        <p className="-mt-2 text-label text-fg-muted">
          A partir de aquí la nave pide purga. Entre {LIMITES.nivelCritico.min} y {LIMITES.nivelCritico.max} cm (el tanque mide 400 cm).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {NAVES.map((n) => {
            const v = numero(b.criticos[n.id]);
            const pct = Number.isFinite(v) && v > 0 ? (niveles[n.id] / v) * 100 : null;
            const error = errores[`critico_${n.id}`];
            return (
              <label key={n.id} className="flex flex-col gap-1.5">
                <span className="text-label font-semibold text-fg-muted">{n.nombre}</span>
                <span className="relative">
                  <input
                    inputMode="numeric"
                    maxLength={3}
                    value={b.criticos[n.id]}
                    onChange={(e) => setB((x) => ({ ...x, criticos: { ...x.criticos, [n.id]: e.target.value.replace(/\D/g, '') } }))}
                    aria-invalid={error ? true : undefined}
                    className={cn(campo, 'pr-12', error && 'border-crit')}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label text-fg-muted">cm</span>
                </span>
                {error ? (
                  <MensajeError texto={error} />
                ) : (
                  <span className="text-[0.75rem] text-fg-muted">
                    Hoy <span className="num text-fg">{formatoNumero(niveles[n.id])} cm</span>
                    {pct !== null && (
                      <>
                        {' '}→ <span className={cn('num font-semibold', pct >= 85 ? 'text-warn' : 'text-fg')}>{formatoNumero(pct)} %</span> del crítico
                      </>
                    )}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Hora punta */}
      <div className="border-t border-line pt-5">
      <fieldset className="flex flex-col gap-3" disabled={deshabilitado}>
        <legend className="mb-3 flex items-center gap-2 text-body font-semibold text-fg">
          <Clock className="size-4 text-fg-muted" aria-hidden /> Hora punta eléctrica
        </legend>
        <p className="-mt-2 text-label text-fg-muted">El plan de bombeo evita esta franja si la quebrada lo permite.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-semibold text-fg-muted">Empieza</span>
            <select value={b.inicio} onChange={(e) => setB((x) => ({ ...x, inicio: Number(e.target.value) }))} className={selector} aria-invalid={errores.horaPunta ? true : undefined}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{hora(h)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-semibold text-fg-muted">Termina</span>
            <select value={b.fin} onChange={(e) => setB((x) => ({ ...x, fin: Number(e.target.value) }))} className={selector} aria-invalid={errores.horaPunta ? true : undefined}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{hora(h)}</option>
              ))}
            </select>
          </label>
        </div>
        {errores.horaPunta ? (
          <MensajeError texto={errores.horaPunta} />
        ) : (
          <span className="text-[0.75rem] text-fg-muted">
            <span className="num text-fg">{b.fin - b.inicio} h</span> con la tarifa más cara, de {hora(b.inicio)} a {hora(b.fin)}.
          </span>
        )}
      </fieldset>
      </div>

      {/* Tarifa */}
      <div className="border-t border-line pt-5">
      <fieldset className="flex flex-col gap-3" disabled={deshabilitado}>
        <legend className="mb-3 flex items-center gap-2 text-body font-semibold text-fg">
          <Coins className="size-4 text-fg-muted" aria-hidden /> Tarifa de energía
        </legend>
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-label font-semibold text-fg-muted">Soles por kWh</span>
          <span className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label text-fg-muted">S/</span>
            <input
              inputMode="decimal"
              maxLength={5}
              value={b.tarifa}
              onChange={(e) => setB((x) => ({ ...x, tarifa: e.target.value.replace(/[^\d.,]/g, '') }))}
              aria-invalid={errores.tarifa ? true : undefined}
              className={cn(campo, 'pl-10', errores.tarifa && 'border-crit')}
            />
          </span>
        </label>
        {errores.tarifa ? (
          <MensajeError texto={errores.tarifa} />
        ) : (
          <span className="text-[0.75rem] text-fg-muted">
            Bombear 8 h fijas ({formatoNumero(config.lineaBaseKwhDia)} kWh) costaría{' '}
            <span className="num text-fg">{formatoSoles(config.lineaBaseKwhDia * tarifa)}</span> al día.
          </span>
        )}
      </fieldset>
      </div>

      {/* Cambios, motivo y guardar */}
      {puedeEditar ? (
        <div className="flex flex-col gap-4 border-t border-line pt-5">
          {cambios.length > 0 ? (
            <div className="rounded-btn border border-accent-ring bg-accent-soft p-3">
              <p className="text-label font-semibold text-fg">Se va a cambiar:</p>
              <ul className="mt-1 list-disc pl-5 text-label text-fg">
                {cambios.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : (
            !hayErrores && <p className="text-label text-fg-muted">Sin cambios: los valores son los que están en uso.</p>
          )}
          {cambios.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-label font-semibold text-fg-muted">Motivo del cambio (obligatorio)</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                maxLength={MAX_MOTIVO}
                placeholder="Ej.: nuevo pliego tarifario; batimetría mostró menos espacio útil en la Nave 2"
                className="rounded-btn border border-line-strong bg-surface-2 p-3 text-body text-fg placeholder:text-fg-subtle"
              />
              {!motivoOk && (
                <span className="flex items-center gap-1.5 text-[0.75rem] text-fg-muted">
                  <CircleAlert className="size-3.5" aria-hidden /> Escribe al menos {MOTIVO_MINIMO} letras para poder guardar.
                </span>
              )}
            </label>
          )}
          {/* Los botones aparecen solo cuando hay algo que guardar o descartar. */}
          {editando && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BotonMantener
              etiqueta="Guardar cambios"
              etiquetaConfirmado="Guardado"
              icono={<Save />}
              alConfirmar={() => void guardar()}
              deshabilitado={!cambios.length || hayErrores || !motivoOk}
              className="sm:flex-1"
            />
            <Boton variante="fantasma" icono={<RotateCcw />} onClick={descartar}>
              Descartar
            </Boton>
          </div>
          )}
        </div>
      ) : (
        <p className="border-t border-line pt-5 text-label text-fg-muted">Solo jefatura de operaciones puede cambiar estos valores.</p>
      )}
    </Tarjeta>
  );
}
