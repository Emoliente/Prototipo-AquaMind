import type { Notificacion, Notifier, ResultadoEnvio } from './Notifier';
import { textoTelegramHtml } from './formato';

/**
 * Conector para un bot real de Telegram (Bot API: sendMessage).
 * No se usa en la demo. En producción el token NO va en el navegador:
 * esta clase debe correr en un servidor que reciba la alerta y la reenvíe.
 */
export class TelegramBotNotifier implements Notifier {
  readonly nombre = 'Bot de Telegram';

  constructor(
    private readonly token: string,
    /** chat_id de cada usuario (lo obtiene el bot cuando el técnico le escribe /start). */
    private readonly chatIdDe: (usuarioId: string) => string | undefined,
  ) {}

  async enviar(n: Notificacion): Promise<ResultadoEnvio> {
    const chatId = this.chatIdDe(n.destinatario.id);
    if (!chatId) return { ok: false, error: `${n.destinatario.nombre} no tiene chat con el bot.` };
    // Sin respuesta en 8 s se da por fallido: el aviso no debe quedarse colgado.
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), 8000);
    try {
      return await this.pedir(chatId, n, corte.signal);
    } catch (e) {
      const porTiempo = e instanceof DOMException && e.name === 'AbortError';
      return { ok: false, error: porTiempo ? 'Telegram no respondió a tiempo' : 'sin conexión con Telegram' };
    } finally {
      clearTimeout(reloj);
    }
  }

  private async pedir(chatId: string, n: Notificacion, signal: AbortSignal): Promise<ResultadoEnvio> {
    const respuesta = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textoTelegramHtml(n.mensaje),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            n.mensaje.botones.map((b) => ({ text: b.texto, callback_data: `${b.accion}:${n.alerta.id}` })),
          ],
        },
      }),
    });
    const datos = (await respuesta.json().catch(() => ({ ok: false, description: `respuesta no válida (HTTP ${respuesta.status})` }))) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    return datos.ok ? { ok: true, idMensaje: String(datos.result?.message_id) } : { ok: false, error: datos.description };
  }
}
