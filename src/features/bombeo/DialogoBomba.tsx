import { Power, PowerOff, TriangleAlert } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { BombaId } from '@/types/dominio';
import { formatoDuracion, formatoNumero, formatoSoles } from '@/lib/format';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { Impulsor } from '@/components/planta/Bomba';

/** Encender o apagar una bomba a mano: se confirma manteniendo 2 s y queda en la auditoría. */
export function DialogoBomba({
  planta,
  bombaId,
  alCerrar,
}: {
  planta: EstadoPlanta;
  bombaId: BombaId | null;
  alCerrar: () => void;
}) {
  const comando = useComando();
  const b = planta.bombas.find((x) => x.id === bombaId);
  const encender = b?.estado !== 'en_marcha';
  const sola = b ? (planta.quebradaM3 / b.capacidadM3h) * 60 : 0;
  const sinLodo = planta.quebradaM3 < 1;

  return (
    <Dialogo
      abierto={!!b}
      alCerrar={alCerrar}
      icono={encender ? <Power /> : <PowerOff />}
      titulo={b ? `${encender ? 'Encender' : 'Apagar'} Bomba ${b.id.slice(1)}` : ''}
      descripcion={b ? `${b.modelo} · ${b.hp} HP · operación manual` : undefined}
      pie={
        b && (
          <BotonMantener
            etiqueta={`${encender ? 'Encender' : 'Apagar'} Bomba ${b.id.slice(1)}`}
            etiquetaConfirmado={encender ? 'Bomba encendida' : 'Bomba apagada'}
            icono={encender ? <Power /> : <PowerOff />}
            variante={encender ? 'primario' : 'peligro'}
            deshabilitado={encender && (sinLodo || planta.emergencia)}
            alConfirmar={() => {
              comando({ tipo: 'bomba', bombaId: b.id, encender });
              setTimeout(alCerrar, 650);
            }}
          />
        )
      }
    >
      {b && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Impulsor estado={b.estado} className="size-14" />
            <dl className="grid flex-1 grid-cols-2 gap-3">
              <div>
                <dt className="text-label text-fg-muted">Consume</dt>
                <dd className="num text-title font-semibold text-fg">
                  {formatoNumero(b.potenciaKw)} <span className="font-sans text-label font-normal text-fg-muted">kW</span>
                </dd>
                <dd className="num text-[0.75rem] text-fg-muted">{formatoSoles(b.potenciaKw * planta.config.tarifaSolesKwh)} por hora</dd>
              </div>
              <div>
                <dt className="text-label text-fg-muted">Evacúa</dt>
                <dd className="num text-title font-semibold text-fg">
                  {formatoNumero(b.capacidadM3h)} <span className="font-sans text-label font-normal text-fg-muted">m³/h</span>
                </dd>
              </div>
            </dl>
          </div>
          {encender ? (
            <p className="text-label text-fg">
              {sinLodo ? (
                'No hay lodo en la quebrada: no hace falta encenderla.'
              ) : (
                <>
                  Con <span className="num">{formatoNumero(planta.quebradaM3)}</span> m³ pendientes, sola tardaría{' '}
                  <span className="num font-semibold">{formatoDuracion(sola)}</span>. Queda en marcha hasta que la apagues o se vacíe la quebrada.
                </>
              )}
            </p>
          ) : (
            <p className="text-label text-fg">
              Quedan <span className="num">{formatoNumero(planta.quebradaM3)}</span> m³ en la quebrada.
            </p>
          )}
          {encender && planta.horaPunta && (
            <p className="flex items-start gap-2 rounded-btn bg-warn-soft p-3 text-label font-medium text-warn">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Es hora punta: la energía cuesta más. Si la quebrada lo permite, espera a las {planta.config.horaPuntaFin}:00.
            </p>
          )}
        </div>
      )}
    </Dialogo>
  );
}
