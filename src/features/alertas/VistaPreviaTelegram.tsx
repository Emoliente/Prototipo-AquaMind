import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, Clock, Send } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { formatoHora } from '@/lib/format';
import { USUARIOS } from '@/config/usuarios';
import { useNotificaciones, type MensajeChat } from '@/store/useNotificaciones';
import { useTelemetria } from '@/store/useTelemetria';
import { Logo } from '@/components/layout/Logo';
import { sinAceleracion } from '@/lib/movimiento';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
let seqRespuesta = 0;

function diaTexto(t: number, ahora: number) {
  const d = new Date(t);
  if (d.toDateString() === new Date(ahora).toDateString()) return 'Hoy';
  if (d.toDateString() === new Date(ahora - 86_400_000).toDateString()) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/**
 * Así le llegan los avisos al técnico de turno en su celular.
 * Los botones funcionan: «Reconocer» responde como lo haría el bot real.
 */
export function VistaPreviaTelegram({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const mensajes = useNotificaciones((s) => s.mensajes);
  const agregar = useNotificaciones((s) => s.agregarMensaje);
  const enviar = useTelemetria((s) => s.enviar);
  const navegar = useNavigate();
  const tecnico = USUARIOS.tecnico;
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensajes.length]);

  const reconocer = async (m: MensajeChat) => {
    if (!m.alertaId) return;
    agregar({ id: `r-${++seqRespuesta}`, t: planta.t, destinatarioId: tecnico.id, de: 'usuario', texto: '✅ Reconocer', estado: 'entregado' });
    const r = await enviar({ tipo: 'reconocer_alerta', alertaId: m.alertaId, usuarioId: tecnico.id, motivo: 'Desde Telegram' }, { silencioso: true });
    setTimeout(
      () =>
        agregar({
          id: `r-${++seqRespuesta}`,
          t: planta.t,
          destinatarioId: tecnico.id,
          de: 'bot',
          texto: r.ok
            ? `Listo, ${tecnico.nombre.split(' ')[0]}. Alerta reconocida a las ${formatoHora(planta.t)}; queda en la bitácora.`
            : r.mensaje,
          estado: 'entregado',
        }),
      600,
    );
  };

  let diaPrevio = '';

  return (
    <section
      aria-label="Vista previa de los mensajes de Telegram del técnico de turno"
      className={cn('flex flex-col overflow-hidden rounded-[28px] border-[6px] border-surface-3 bg-surface-1 shadow-2', className)}
    >
      <header className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <Logo className="size-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-fg">AquaMind · Miraflores</p>
          <p className="truncate text-[0.75rem] text-fg-muted">bot · chat con {tecnico.nombre} ({tecnico.telegram})</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[0.7rem] font-semibold text-fg-muted">Vista previa</span>
      </header>

      <div ref={lista} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-surface-2/50 px-3 py-4">
        {mensajes.length === 0 && (
          <p className="m-auto max-w-[16rem] text-center text-label text-fg-muted">
            Aún no hay mensajes. Las alertas críticas y las advertencias llegarán aquí.
          </p>
        )}
        <AnimatePresence initial={false}>
          {mensajes.map((m) => {
            const dia = diaTexto(m.t, planta.t);
            const separador = dia !== diaPrevio;
            diaPrevio = dia;
            const alerta = m.alertaId ? planta.alertas.find((a) => a.id === m.alertaId) : undefined;
            const propio = m.de === 'usuario';
            return (
              <motion.div
                key={m.id}
                layout="position"
                onUpdate={sinAceleracion}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="flex flex-col gap-1.5"
              >
                {separador && (
                  <span className="mx-auto my-1 rounded-full bg-surface-3 px-3 py-0.5 text-[0.7rem] font-semibold text-fg-muted">{dia}</span>
                )}
                <div className={cn('flex', propio ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl px-3 py-2 shadow-1',
                      propio ? 'rounded-br-md bg-accent-soft text-fg ring-1 ring-accent-ring' : 'rounded-bl-md bg-surface-1 text-fg ring-1 ring-line',
                    )}
                  >
                    {m.mensaje ? (
                      <>
                        <p className="text-[0.75rem] font-bold tracking-wide text-fg-muted">
                          {m.mensaje.icono} {m.mensaje.etiquetaSeveridad}
                        </p>
                        <p className="mt-0.5 text-label font-semibold leading-snug">{m.mensaje.titulo}</p>
                        {m.mensaje.lineas.map((l) => (
                          <p key={l} className="mt-1 text-label leading-snug text-fg">
                            {l}
                          </p>
                        ))}
                      </>
                    ) : (
                      <p className="text-label leading-snug">{m.texto}</p>
                    )}
                    <p className="mt-1 flex items-center justify-end gap-1 text-[0.7rem] text-fg-subtle">
                      <span className="num">{formatoHora(m.t)}</span>
                      {m.de === 'bot' &&
                        (m.estado === 'enviando' ? (
                          <Clock className="size-3" aria-label="enviando" />
                        ) : (
                          <CheckCheck className="size-3.5 text-accent" aria-label="entregado" />
                        ))}
                    </p>
                  </div>
                </div>
                {m.mensaje && m.mensaje.botones.length > 0 && (
                  <div className="flex max-w-[88%] gap-1.5">
                    {m.mensaje.botones.map((b) => {
                      const hecho = b.accion === 'reconocer' && alerta?.reconocida;
                      return (
                        <button
                          key={b.accion}
                          type="button"
                          disabled={hecho || (b.accion === 'reconocer' && !alerta)}
                          onClick={() => (b.accion === 'reconocer' ? reconocer(m) : navegar('/panel'))}
                          className={cn(
                            'flex min-h-10 flex-1 items-center justify-center gap-1 rounded-btn bg-surface-1 px-3 text-label font-semibold ring-1 ring-line transition-colors',
                            hecho ? 'text-ok' : 'text-accent hover:bg-surface-3',
                            'disabled:cursor-default',
                          )}
                        >
                          {hecho ? (
                            <>
                              <Check className="size-4" aria-hidden /> Reconocida
                            </>
                          ) : (
                            b.texto
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <footer className="flex items-center gap-2 border-t border-line bg-surface-2 px-3 py-2.5">
        <span className="flex h-10 flex-1 items-center rounded-full bg-surface-1 px-4 text-label text-fg-subtle ring-1 ring-line">
          Así le llega al técnico de turno
        </span>
        <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-fg-subtle" aria-hidden>
          <Send className="size-4" />
        </span>
      </footer>
    </section>
  );
}
