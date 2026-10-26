/**
 * Todas las notificaciones salen por esta interfaz.
 * Hoy la implementa la vista previa en pantalla; mañana un bot real de Telegram
 * (ver TelegramBotNotifier) sin tocar las pantallas.
 */
import type { Alerta, Usuario } from '@/types/dominio';

export interface BotonMensaje {
  texto: string;
  /** Acción que el bot recibe al tocarlo (callback_data en Telegram). */
  accion: 'reconocer' | 'abrir_app';
}

export interface MensajeBot {
  /** Línea principal en negrita. */
  titulo: string;
  /** Líneas de detalle (texto plano). */
  lineas: string[];
  /** Ícono de severidad (emoji) que acompaña al texto. */
  icono: string;
  etiquetaSeveridad: string;
  botones: BotonMensaje[];
}

export interface Notificacion {
  destinatario: Usuario;
  alerta: Alerta;
  mensaje: MensajeBot;
}

export interface ResultadoEnvio {
  ok: boolean;
  /** Identificador del mensaje en el canal (message_id en Telegram). */
  idMensaje?: string;
  error?: string;
}

export interface Notifier {
  readonly nombre: string;
  enviar(n: Notificacion): Promise<ResultadoEnvio>;
}
