import { useEffect } from 'react';
import { useTelemetria } from '@/store/useTelemetria';
import { useNotificaciones } from '@/store/useNotificaciones';
import { USUARIOS } from '@/config/usuarios';
import type { Alerta, Usuario } from '@/types/dominio';
import { mensajeDeAlerta } from './formato';
import { notificador } from './notificador';

const vistas = new Set<string>();

/** Envía la alerta por el Notifier; si falla, lo dice en pantalla (la alerta sigue en la lista). */
function enviarAviso(destinatario: Usuario, alerta: Alerta) {
  const fallo = (detalle?: string) =>
    useTelemetria.getState().avisar({
      ok: false,
      mensaje: `No se pudo avisar a ${destinatario.nombre} por ${notificador().nombre}${detalle ? `: ${detalle}` : ''}. La alerta sigue en la pantalla Alertas.`,
    });
  try {
    notificador()
      .enviar({ destinatario, alerta, mensaje: mensajeDeAlerta(alerta) })
      .then((r) => {
        if (!r.ok) fallo(r.error);
      })
      .catch((e) => {
        console.error('[notificaciones] falló el envío', e);
        fallo();
      });
  } catch (e) {
    console.error('[notificaciones] no se pudo preparar el mensaje', e);
    fallo();
  }
}
let iniciado = false;

/**
 * Cada alerta nueva: se envía al técnico de turno por el Notifier (según sus
 * preferencias) y, si no es informativa, entra deslizándose en pantalla.
 */
export function useDespachoAlertas() {
  const alertas = useTelemetria((s) => s.planta?.alertas);

  useEffect(() => {
    if (!alertas) return;
    const { preferencias, agregarMensaje, agregarEmergente } = useNotificaciones.getState();
    const destinatario = USUARIOS.tecnico;

    if (!iniciado) {
      // Al abrir la app, lo ya enviado antes aparece como historial del chat.
      iniciado = true;
      alertas.forEach((a) => vistas.add(a.id));
      alertas
        .filter((a) => preferencias[a.severidad])
        .slice(0, 4)
        .reverse()
        .forEach((a) =>
          agregarMensaje({
            id: `hist-${a.id}`,
            t: a.t,
            destinatarioId: destinatario.id,
            de: 'bot',
            alertaId: a.id,
            mensaje: mensajeDeAlerta(a),
            estado: 'entregado',
          }),
        );
      return;
    }

    const nuevas = alertas.filter((a) => !vistas.has(a.id)).reverse();
    // Muchas «nuevas» de golpe = la simulación se reinició con otra historia: se dan por vistas.
    if (nuevas.length > 5) {
      nuevas.forEach((a) => vistas.add(a.id));
      useNotificaciones.getState().limpiarEmergentes();
      return;
    }
    for (const a of nuevas) {
      vistas.add(a.id);
      if (preferencias[a.severidad]) enviarAviso(destinatario, a);
      if (a.severidad !== 'info') agregarEmergente(a.id);
    }
  }, [alertas]);
}
