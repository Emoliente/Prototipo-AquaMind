import { Suspense, useEffect, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MODULOS } from '@/app/permisos';
import { useTelemetria } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { BarraLateral } from './BarraLateral';
import { NavInferior } from './NavInferior';
import { Encabezado, RelojPlanta } from './Encabezado';
import { BannersPlanta } from './BannersPlanta';
import { MandoManual } from './MandoManual';
import { DialogoAutomatico } from './DialogoAutomatico';
import { LimiteError } from './LimiteError';
import { NotificacionesEnPantalla } from '@/components/alertas/NotificacionesEnPantalla';
import { useDespachoAlertas } from '@/notify/useDespachoAlertas';
import { useMotorDemo } from '@/demo/useMotorDemo';
import { AhorroDemo, BarraDemo, TelegramDemo } from '@/demo/ControlesDemo';
import { DialogoPurga } from '@/features/purgas/DialogoPurga';
import { DialogoRechazo } from '@/features/purgas/DialogoRechazo';
import { Avisos } from '@/components/ui/Avisos';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { sinAceleracion } from '@/lib/movimiento';

/** Una ventana que falla se cierra y se explica; el resto de la app sigue igual. */
function alFallarVentana() {
  useOperacion.setState({ purgaNave: null, rechazoAbierto: false, automaticoAbierto: false, mandoManualAbierto: false });
  useTelemetria.getState().avisar({ ok: false, mensaje: 'Esa ventana tuvo un error y se cerró. No se envió ninguna orden; vuelve a abrirla.' });
}

function alFallarFlotante() {
  useTelemetria.getState().avisar({ ok: false, mensaje: 'Un aviso en pantalla no se pudo mostrar. Las alertas siguen en la pantalla Alertas.' });
}

/** Armazón de la app: barra lateral, encabezado fijo, avisos y transición entre pantallas. */
export function Shell() {
  const conectar = useTelemetria((s) => s.conectar);
  useEffect(() => conectar(), [conectar]);
  useDespachoAlertas();
  useMotorDemo();

  const { pathname } = useLocation();
  const outlet = useOutlet();
  const modulo = MODULOS.find((m) => pathname.startsWith(`/${m.ruta}`));

  return (
    <div className="flex min-h-dvh bg-base">
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <Encabezado titulo={modulo?.texto ?? 'AquaMind'} />
        <BannersPlanta />
        {/* Solo animación de entrada: una salida con `mode="wait"` puede quedarse colgada si la pantalla vieja sigue recibiendo datos. */}
        <motion.main
          key={pathname}
          onUpdate={sinAceleracion}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8 lg:pt-8"
        >
          <LimiteError>
            <Suspense fallback={<Esqueleto className="h-[60vh] rounded-card" />}>{outlet}</Suspense>
          </LimiteError>
        </motion.main>
      </div>
      <NavInferior />
      <LimiteError variante="silencioso" alFallar={alFallarVentana}>
        <MandoManual />
        <DialogoAutomatico />
        <DialogoPurga />
        <DialogoRechazo />
      </LimiteError>
      <LimiteError variante="silencioso" alFallar={alFallarFlotante}>
        <NotificacionesEnPantalla />
        <AhorroDemo />
        <TelegramDemo />
        <BarraDemo />
      </LimiteError>
      {/* Fuera de los límites: los avisos de error tienen que poder mostrarse siempre. */}
      <Avisos />
    </div>
  );
}

/** Título de pantalla con descripción y acciones; en celular muestra también la hora de planta. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-heading font-semibold tracking-tight text-fg">{titulo}</h2>
        {descripcion && <div className="mt-1 text-body text-fg-muted">{descripcion}</div>}
      </div>
      <RelojPlanta className="2xl:hidden" />
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}
