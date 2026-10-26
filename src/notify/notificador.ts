import type { Notifier } from './Notifier';
import { VistaPreviaNotifier } from './VistaPreviaNotifier';

/**
 * Canal de notificaciones de la app. Para usar el bot real, devolver aquí un
 * TelegramBotNotifier (idealmente detrás de un servidor que guarde el token).
 */
let instancia: Notifier | null = null;

export function notificador(): Notifier {
  instancia ??= new VistaPreviaNotifier();
  return instancia;
}
