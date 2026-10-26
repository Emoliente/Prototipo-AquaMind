import { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { usePlanta } from '@/store/useTelemetria';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { SeguimientoPurga } from './SeguimientoPurga';
import { SelectorNave } from './SelectorNave';
import { FormularioPurga } from './FormularioPurga';
import { ResultadoUltimaPurga } from './ResultadoUltimaPurga';
import { TarjetaAutomatico } from './TarjetaAutomatico';
import { HistorialPurgas, ListaProgramadas } from './ListasPurgas';

const HORA = 3_600_000;

export default function PaginaPurgas() {
  const planta = usePlanta();
  if (!planta) {
    return (
      <div aria-busy className="grid grid-cols-12 gap-6">
        <Esqueleto className="col-span-12 h-[560px] rounded-card xl:col-span-8" />
        <Esqueleto className="col-span-12 h-[560px] rounded-card xl:col-span-4" />
      </div>
    );
  }
  return <Purgas planta={planta} />;
}

function Purgas({ planta }: { planta: EstadoPlanta }) {
  const [nave, setNave] = useState<NaveId>(planta.principal.naveId);
  const purgas = planta.purgas;
  const libres = planta.naves.filter((n) => !purgas.some((p) => p.naveId === n.id));

  // Si la nave elegida empieza a purgarse, se propone otra libre.
  useEffect(() => {
    if (purgas.some((p) => p.naveId === nave) && libres.length) setNave(libres[0].id);
  }, [purgas.length]);

  const verResultado = !!planta.ultimaPurga?.fin && planta.t - planta.ultimaPurga.fin < 12 * HORA;

  return (
    <>
      <EncabezadoPagina
        titulo="Purgas"
        descripcion="La compuerta abre de 10 en 10 cm; al cerrar se calcula el lodo purgado (Δ nivel × 260 m²)."
      />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 flex min-w-0 flex-col gap-4 lg:gap-6 xl:col-span-8">
          {purgas.map((p) => (
            <SeguimientoPurga key={p.id} planta={planta} purga={p} />
          ))}

          {libres.length > 0 && (
            <Tarjeta relleno="none">
              <div className="border-b border-line p-5 sm:p-6">
                <EncabezadoTarjeta
                  icono={<ArrowDownToLine className="size-5" />}
                  titulo={purgas.length ? 'Preparar otra purga' : 'Preparar purga'}
                  subtitulo="La nave recomendada viene elegida con su apertura y duración"
                />
              </div>
              <div className="flex flex-col gap-6 p-5 sm:p-6">
                <SelectorNave planta={planta} valor={nave} alCambiar={setNave} />
                <FormularioPurga key={nave} planta={planta} naveId={nave} />
              </div>
            </Tarjeta>
          )}

          {verResultado && <ResultadoUltimaPurga planta={planta} />}
        </div>

        <div className="col-span-12 flex min-w-0 flex-col gap-4 lg:gap-6 xl:col-span-4">
          <ListaProgramadas planta={planta} />
          <TarjetaAutomatico planta={planta} />
          <HistorialPurgas planta={planta} />
        </div>
      </div>
    </>
  );
}
