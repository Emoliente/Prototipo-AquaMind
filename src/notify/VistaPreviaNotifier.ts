import type { Notificacion, Notifier, ResultadoEnvio } from './Notifier';
import { useNotificaciones } from '@/store/useNotificaciones';

let seq = 0;

/** Notifier de la demo: los mensajes aparecen en la vista previa de Telegram de la pantalla Alertas. */
export class VistaPreviaNotifier implements Notifier {
  readonly nombre = 'Vista previa (demo)';

  async enviar(n: Notificacion, entregadoEnMs = 700): Promise<ResultadoEnvio> {
    const id = `msg-${++seq}`;
    const { agregarMensaje, marcarEntregado } = useNotificaciones.getState();
    agregarMensaje({
      id,
      t: n.alerta.t,
      destinatarioId: n.destinatario.id,
      de: 'bot',
      alertaId: n.alerta.id,
      mensaje: n.mensaje,
      estado: entregadoEnMs > 0 ? 'enviando' : 'entregado',
    });
    if (entregadoEnMs > 0) setTimeout(() => marcarEntregado(id), entregadoEnMs);
    return { ok: true, idMensaje: id };
  }
}
