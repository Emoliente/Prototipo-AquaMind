import { BellRing, Send } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { Alerta } from '@/types/dominio';
import { USUARIOS, NOMBRE_PERFIL } from '@/config/usuarios';
import { useNotificaciones } from '@/store/useNotificaciones';
import { usePuede } from '@/store/useOperacion';
import { notificador } from '@/notify/notificador';
import { mensajeDeAlerta } from '@/notify/formato';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Interruptor } from '@/components/ui/Interruptor';
import { Boton } from '@/components/ui/Boton';
import { EstadoChip } from '@/components/ui/EstadoChip';

let seqPrueba = 0;

/** A quién y qué se avisa por Telegram, y por qué canal sale. */
export function PreferenciasAvisos({ planta }: { planta: EstadoPlanta }) {
  const { preferencias, setPreferencia } = useNotificaciones();
  const opera = usePuede('operar');
  const tecnico = USUARIOS.tecnico;

  const probar = () => {
    const alerta: Alerta = {
      id: `prueba-${++seqPrueba}`,
      t: planta.t,
      severidad: 'info',
      titulo: 'Mensaje de prueba',
      accionSugerida: 'Ninguna: solo confirma que los avisos llegan.',
      reconocida: true,
    };
    void notificador().enviar({ destinatario: tecnico, alerta, mensaje: mensajeDeAlerta(alerta) });
  };

  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoTarjeta icono={<BellRing className="size-5" />} titulo="Avisos por Telegram" subtitulo="Llegan al técnico de turno" />
      <div className="flex items-center justify-between gap-3 rounded-btn border border-line bg-surface-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-fg">{tecnico.nombre}</p>
          <p className="truncate text-label text-fg-muted">
            {NOMBRE_PERFIL.tecnico} · {tecnico.telegram}
          </p>
        </div>
        <EstadoChip estado="en_linea" texto="Conectado" tamano="sm" />
      </div>
      <div className="flex flex-col">
        <Interruptor
          activo={preferencias.critica}
          alCambiar={() => undefined}
          deshabilitado
          etiqueta="Críticas"
          descripcion="Siempre se envían"
        />
        <Interruptor
          activo={preferencias.advertencia}
          alCambiar={(v) => setPreferencia('advertencia', v)}
          deshabilitado={!opera}
          etiqueta="Advertencias"
          descripcion="Nivel alto, sensores sin datos"
        />
        <Interruptor
          activo={preferencias.info}
          alCambiar={(v) => setPreferencia('info', v)}
          deshabilitado={!opera}
          etiqueta="Información"
          descripcion="Purgas y bombeos terminados"
        />
      </div>
      <Boton icono={<Send />} onClick={probar} disabled={!opera}>
        Enviar mensaje de prueba
      </Boton>
      <p className="rounded-btn bg-surface-2 p-3 text-[0.75rem] text-fg-muted">
        Canal actual: <span className="font-semibold text-fg">{notificador().nombre}</span>. El conector para el bot real ya está listo
        (envía el mismo mensaje con sus botones); solo falta el token del bot en el servidor.
      </p>
    </Tarjeta>
  );
}
