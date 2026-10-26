import { useCallback, useMemo, useState } from 'react';
import { Mountain } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { BombaId } from '@/types/dominio';
import { formatoDuracion, formatoNumero } from '@/lib/format';
import { usePlanta } from '@/store/useTelemetria';
import { usePuede } from '@/store/useOperacion';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { TarjetaBomba } from '@/components/planta/Bomba';
import { QuebradaVista } from '@/components/planta/QuebradaVista';
import { TarjetaEnergia } from './TarjetaEnergia';
import { TarjetaPlanBombeo } from './TarjetaPlanBombeo';
import { PrioridadBombas } from './PrioridadBombas';
import { DialogoBomba } from './DialogoBomba';

export default function PaginaBombeo() {
  const planta = usePlanta();
  if (!planta) {
    return (
      <div aria-busy className="grid grid-cols-12 gap-6">
        <Esqueleto className="col-span-12 h-[420px] rounded-card xl:col-span-5" />
        <Esqueleto className="col-span-12 h-[420px] rounded-card xl:col-span-7" />
      </div>
    );
  }
  return <Bombeo planta={planta} />;
}

function Bombeo({ planta }: { planta: EstadoPlanta }) {
  const opera = usePuede('operar');
  const [bombaSel, setBombaSel] = useState<BombaId | null>(null);
  // Manejadores fijos: las tarjetas de bomba (memorizadas) solo se repintan si cambia su bomba.
  const alternar = useMemo(
    () => (opera ? Object.fromEntries(planta.bombas.map((b) => [b.id, () => setBombaSel(b.id)])) : {}) as Partial<Record<BombaId, () => void>>,
    [opera], // los id de las bombas no cambian
  );
  const cerrarDialogo = useCallback(() => setBombaSel(null), []);
  const pct = (planta.quebradaM3 / planta.quebradaCapacidadM3) * 100;
  const estadoQ = pct >= 75 ? 'critica' : pct >= 50 ? 'advertencia' : 'normal';
  const entrando = planta.purgas.reduce((s, p) => s + p.volumenParcialM3, 0);
  const restante = Math.max(0, ...planta.bombas.map((b) => b.minutosRestantes ?? 0));

  return (
    <>
      <EncabezadoPagina
        titulo="Bombeo de lodos"
        descripcion="Las bombas evacúan solo el lodo purgado, empezando por la que menos gasta por m³ y fuera de la hora punta."
      />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Tarjeta className="col-span-12 flex flex-col gap-4 xl:col-span-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <EncabezadoTarjeta className="basis-60" icono={<Mountain className="size-5" />} titulo="Quebrada" subtitulo="Lodo purgado pendiente de evacuar" />
            <EstadoChip estado={estadoQ} texto={estadoQ === 'normal' ? 'Con espacio' : estadoQ === 'advertencia' ? 'A media capacidad' : 'Casi llena'} />
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Valor valor={planta.quebradaM3} unidad="m³" tamano="display" />
            <span className="text-label text-fg-muted">
              <span className="num text-fg">{formatoNumero(pct)} %</span> de <span className="num">{formatoNumero(planta.quebradaCapacidadM3)}</span> m³
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Entrando ahora</dt>
              <dd className="text-body text-fg">
                {entrando > 0 ? (
                  <>
                    <span className="num font-semibold">{formatoNumero(entrando)}</span> m³ de la purga en curso
                  </>
                ) : (
                  'Nada: no hay purga'
                )}
              </dd>
            </div>
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Para vaciarla</dt>
              <dd className="text-body text-fg">
                {planta.quebradaM3 < 1 ? (
                  'Ya está vacía'
                ) : planta.bombeo ? (
                  <>
                    <span className="num font-semibold">{formatoDuracion(restante)}</span> con el bombeo en curso
                  </>
                ) : (
                  <>
                    <span className="num font-semibold">{formatoDuracion(planta.plan.asignaciones[0]?.minutos ?? 0)}</span> con el plan
                  </>
                )}
              </dd>
            </div>
          </dl>
          <QuebradaVista
            volumenM3={planta.quebradaM3}
            capacidadM3={planta.quebradaCapacidadM3}
            bombas={planta.bombas}
            entrando={planta.purgas.length > 0}
            className="my-auto"
          />
        </Tarjeta>

        <TarjetaEnergia planta={planta} className="col-span-12 xl:col-span-7" />

        <TarjetaPlanBombeo planta={planta} className="col-span-12 min-w-0 xl:col-span-8" />
        <PrioridadBombas planta={planta} className="col-span-12 xl:col-span-4" />

        <h3 className="col-span-12 mt-2 text-title font-semibold text-fg">Bombas</h3>
        {planta.bombas.map((b) => (
          <TarjetaBomba
            key={b.id}
            bomba={b}
            horometroH={b.horometroH}
            minutosRestantes={b.minutosRestantes}
            alAlternar={alternar[b.id]}
            deshabilitado={planta.emergencia && b.estado !== 'en_marcha'}
            className="col-span-12 lg:col-span-4"
          />
        ))}
      </div>
      <DialogoBomba planta={planta} bombaId={bombaSel} alCerrar={cerrarDialogo} />
    </>
  );
}
