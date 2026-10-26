import { Bot } from 'lucide-react';
import { formatoNumero } from '@/lib/format';
import { usePlantaCampos } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Dialogo } from '@/components/ui/Dialogo';
import { BotonMantener } from '@/components/ui/BotonMantener';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Confirmación (mantener 2 s) para pasar a modo Automático, con sus límites a la vista. */
export function DialogoAutomatico() {
  const abierto = useOperacion((s) => s.automaticoAbierto);
  const cerrar = useOperacion((s) => s.setAutomatico);
  const comando = useComando();
  const a = usePlantaCampos((p) => p.config.automatico);

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={() => cerrar(false)}
      icono={<Bot />}
      titulo="Activar modo Automático"
      descripcion="El sistema purgará solo cuando la urgencia pase de 70."
      pie={
        <BotonMantener
          etiqueta="Activar modo Automático"
          etiquetaConfirmado="Modo Automático activo"
          icono={<Bot />}
          alConfirmar={() => {
            comando({ tipo: 'modo', modo: 'automatico' });
            setTimeout(() => cerrar(false), 700);
          }}
        />
      }
    >
      {a && (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Purgas máximas', `${formatoNumero(a.purgasMaxDia)} por día`],
            ['Apertura máxima', `${formatoNumero(a.aperturaMaxCm)} cm`],
            ['Horario permitido', `${hh(a.horaDesde)} – ${hh(a.horaHasta)}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-btn border border-line bg-surface-2 p-3">
              <dt className="text-label text-fg-muted">{k}</dt>
              <dd className="num whitespace-nowrap text-body font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-4 text-label text-fg-muted">
        Los límites se ajustan en la pantalla de Purgas. Cualquier operador puede volver a Asistido o Manual en todo momento.
      </p>
    </Dialogo>
  );
}
