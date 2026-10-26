import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { MODULOS } from '@/app/permisos';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';

/** Módulo aún no construido en el prototipo. */
export default function PaginaProximamente() {
  const { pathname } = useLocation();
  const m = MODULOS.find((x) => pathname.startsWith(`/${x.ruta}`));
  return (
    <>
      <EncabezadoPagina titulo={m?.texto ?? 'Módulo'} descripcion={`${m?.codigo ?? ''} · en construcción en el prototipo`} />
      <Tarjeta relleno="lg" className="flex flex-col items-start gap-4">
        <span className="grid size-12 place-items-center rounded-card bg-surface-3 text-fg-muted">
          <Hammer className="size-6" aria-hidden />
        </span>
        <p className="max-w-xl text-body text-fg-muted">
          Esta pantalla llega en los siguientes pasos del plan. Mientras tanto, el Panel de monitoreo ya muestra la recomendación, las naves, las bombas y permite purgar.
        </p>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Esqueleto className="h-28" />
          <Esqueleto className="h-28" />
          <Esqueleto className="h-28" />
        </div>
      </Tarjeta>
    </>
  );
}
