import { Gamepad2, Minus, Plus, Power, PowerOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatoNumero } from '@/lib/format';
import { usePlantaSi } from '@/store/useTelemetria';
import { useOperacion, usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { Boton } from '@/components/ui/Boton';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { Impulsor } from '@/components/planta/Bomba';
import { PASO_COMPUERTA_CM } from '@/config/planta';

/** Botón del encabezado que abre el mando manual (siempre visible). */
export function BotonMandoManual({ compacto }: { compacto?: boolean }) {
  const abrir = useOperacion((s) => s.setMandoManual);
  return (
    <Boton
      variante="secundario"
      tamano={compacto ? 'icono' : 'md'}
      icono={<Gamepad2 />}
      onClick={() => abrir(true)}
      aria-label="Abrir mando manual"
      title="Mando manual"
      className={cn(!compacto && 'px-4')}
    >
      {!compacto && 'Mando manual'}
    </Boton>
  );
}

/** Panel lateral de mando manual: compuertas de 10 en 10 cm y bombas. */
export function MandoManual() {
  const abierto = useOperacion((s) => s.mandoManualAbierto);
  const cerrar = useOperacion((s) => s.setMandoManual);
  const planta = usePlantaSi(abierto);
  const opera = usePuede('operar');
  const comando = useComando();

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={() => cerrar(false)}
      variante="lateral"
      icono={<Gamepad2 />}
      titulo="Mando manual"
      descripcion={opera ? 'Cada comando queda en la auditoría con tu nombre.' : 'Solo lectura para tu perfil.'}
    >
      {!planta ? null : (
        <div className="flex flex-col gap-6">
          {planta.emergencia && (
            <div className="flex flex-col gap-3 rounded-card border border-crit/40 bg-crit-soft p-4">
              <EstadoChip estado="critica" texto="Parada de emergencia activa" />
              <p className="text-label text-fg">Compuertas cerradas y bombas apagadas. Rearma solo cuando la planta esté segura.</p>
              {opera && (
                <BotonMantener
                  etiqueta="Rearmar la planta"
                  etiquetaConfirmado="Planta rearmada"
                  icono={<ShieldCheck />}
                  alConfirmar={() => comando({ tipo: 'rearmar' })}
                />
              )}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-label font-semibold uppercase tracking-wider text-fg-subtle">Compuertas de purga</h3>
            {planta.naves.map((n) => {
              const c = n.compuerta;
              const mover = (delta: number) =>
                comando({ tipo: 'mover_compuerta', naveId: n.id, aperturaCm: Math.max(0, Math.min(100, c.objetivoCm + delta)) });
              return (
                <div key={n.id} className="flex items-center gap-3 rounded-card border border-line bg-surface-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-fg">{n.nombre}</p>
                    <p className="text-label text-fg-muted">
                      Lodo <span className="num text-fg">{formatoNumero(n.nivelCm)}</span> cm ·{' '}
                      {c.estado === 'cerrada' ? 'cerrada' : c.estado}
                    </p>
                  </div>
                  <Boton tamano="icono" aria-label={`Cerrar 10 cm la compuerta de la ${n.nombre}`} icono={<Minus />} disabled={!opera || c.objetivoCm <= 0} onClick={() => mover(-PASO_COMPUERTA_CM)} />
                  <div className="w-16 text-center">
                    <span className="num text-value-sm font-semibold text-fg">{c.aperturaCm}</span>
                    <span className="ml-1 text-label text-fg-muted">cm</span>
                  </div>
                  <Boton tamano="icono" aria-label={`Abrir 10 cm la compuerta de la ${n.nombre}`} icono={<Plus />} disabled={!opera || planta.emergencia || c.objetivoCm >= 100} onClick={() => mover(PASO_COMPUERTA_CM)} />
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-label font-semibold uppercase tracking-wider text-fg-subtle">Bombas de lodos</h3>
            <p className="text-label text-fg-muted">
              Lodo fino en el embalse: <span className="num font-semibold text-fg">{formatoNumero(planta.embalseLodoM3)}</span> m³
            </p>
            {planta.bombas.map((b) => {
              const enMarcha = b.estado === 'en_marcha';
              return (
                <div key={b.id} className="flex items-center gap-3 rounded-card border border-line bg-surface-2 p-3">
                  <Impulsor estado={b.estado} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-fg">Bomba {b.id.slice(1)}</p>
                    <p className="truncate text-label text-fg-muted">
                      {enMarcha ? (
                        <>
                          <span className="num text-fg">{formatoNumero(b.potenciaActualKw, 1)}</span> kW ·{' '}
                          <span className="num text-fg">{formatoNumero(b.corrienteA, 1)}</span> A
                        </>
                      ) : (
                        b.modelo
                      )}
                    </p>
                  </div>
                  <Boton
                    variante={enMarcha ? 'secundario' : 'primario'}
                    icono={enMarcha ? <PowerOff /> : <Power />}
                    disabled={!opera || b.estado === 'falla' || (!enMarcha && planta.emergencia)}
                    onClick={() => comando({ tipo: 'bomba', bombaId: b.id, encender: !enMarcha })}
                  >
                    {enMarcha ? 'Apagar' : 'Encender'}
                  </Boton>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </Dialogo>
  );
}
