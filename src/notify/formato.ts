import type { Alerta, Severidad } from '@/types/dominio';
import type { MensajeBot } from './Notifier';
import { formatoHora } from '@/lib/format';

const SEVERIDAD: Record<Severidad, { icono: string; etiqueta: string }> = {
  critica: { icono: '🔴', etiqueta: 'CRÍTICA' },
  advertencia: { icono: '🟠', etiqueta: 'ADVERTENCIA' },
  info: { icono: '🔵', etiqueta: 'INFORMACIÓN' },
};

/** Convierte una alerta en un mensaje corto de bot, en lenguaje de planta. */
export function mensajeDeAlerta(a: Alerta): MensajeBot {
  const s = SEVERIDAD[a.severidad];
  const lineas = [
    ...(a.detalle ? [a.detalle] : []),
    `👉 ${a.accionSugerida}`,
    `🕒 ${formatoHora(a.t)} · Desarenador Miraflores${a.naveId ? ` · Nave ${a.naveId.slice(1)}` : ''}`,
  ];
  return {
    titulo: a.titulo,
    lineas,
    icono: s.icono,
    etiquetaSeveridad: s.etiqueta,
    botones:
      a.severidad === 'info'
        ? [{ texto: 'Abrir AquaMind', accion: 'abrir_app' }]
        : [
            { texto: '✅ Reconocer', accion: 'reconocer' },
            { texto: 'Abrir AquaMind', accion: 'abrir_app' },
          ],
  };
}

/** Texto en formato HTML de Telegram (parse_mode=HTML) para el bot real. */
export function textoTelegramHtml(m: MensajeBot): string {
  const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [`${m.icono} <b>${m.etiquetaSeveridad}</b>`, `<b>${escapar(m.titulo)}</b>`, ...m.lineas.map(escapar)].join('\n');
}
