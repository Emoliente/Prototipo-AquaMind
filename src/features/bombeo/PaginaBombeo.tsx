import { useCallback, useMemo, useState } from 'react';
import { Waves } from 'lucide-react';
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
import { EmbalseVista } from '@/components/planta/EmbalseVista';
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
  const pct = (planta.embalseLodoM3 / planta.embalseCapacidadM3) * 100;
  const estadoQ = pct >= 75 ? 'critica' : pct >= 50 ? 'advertencia' : 'normal';
  const restante = Math.max(0, ...planta.bombas.map((b) => b.minutosRestantes ?? 0));

  return (
    <>
      <EncabezadoPagina
        titulo="Bombeo de lodos"
        descripcion="Las bombas del embalse evacúan el lodo fino que el agua limpia deja al asentarse, empezando por la que menos gasta por m³ y fuera de la hora punta. La purga no llega aquí: va a la quebrada."
      />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Tarjeta className="col-span-12 flex flex-col gap-4 xl:col-span-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <EncabezadoTarjeta className="basis-60" icono={<Waves className="size-5" />} titulo="Embalse" subtitulo="Lodo fino junto a las bombas" />
            <EstadoChip estado={estadoQ} texto={estadoQ === 'normal' ? 'Con espacio' : estadoQ === 'advertencia' ? 'A media capacidad' : 'Casi lleno'} />
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Valor valor={planta.embalseLodoM3} unidad="m³" tamano="display" />
            <span className="text-label text-fg-muted">
              <span className="num text-fg">{formatoNumero(pct)} %</span> de <span className="num">{formatoNumero(planta.embalseCapacidadM3)}</span> m³ que admite la zona de las bombas · se bombea desde{' '}
              <span className="num">{formatoNumero(planta.embalseUmbralM3)}</span> m³
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Llegando ahora</dt>
              <dd className="text-body text-fg">
                <span className="num font-semibold">{formatoNumero(planta.finosEmbalseM3h, planta.finosEmbalseM3h < 10 ? 1 : 0)}</span> m³/h de finos con el agua limpia
              </dd>
            </div>
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Para sacarlo</dt>
              <dd className="text-body text-fg">
                {planta.embalseLodoM3 < 1 ? (
                  'No hay lodo por sacar'
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
          <EmbalseVista
            volumenM3={planta.embalseLodoM3}
            capacidadM3={planta.embalseCapacidadM3}
            bombas={planta.bombas}
            entrando={planta.caudalM3s > 0}
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
