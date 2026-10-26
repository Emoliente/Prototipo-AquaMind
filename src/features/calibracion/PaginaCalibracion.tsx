import { useMemo, useState } from 'react';
import { FlaskConical, Ruler, ScanLine } from 'lucide-react';
import type { MuestraCalibracion, SensorInfo } from '@/data/DataSource';
import { usePlantaCampos, usePlantaSi } from '@/store/useTelemetria';
import { usePuede } from '@/store/useOperacion';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Boton } from '@/components/ui/Boton';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { DialogoLecturaMiras } from '@/features/bitacora/DialogosRegistro';
import { TarjetaSensor } from './TarjetaSensor';
import { ListaPendientes } from './ListaPendientes';
import { GraficoLaboratorio } from './GraficoLaboratorio';
import { NivelesReferencia, type NivelNave } from './NivelesReferencia';
import { TablaMuestras } from './TablaMuestras';
import { DialogoMuestra } from './DialogoMuestra';

type Abierto = 'laboratorio' | 'batimetria' | 'miras' | null;

const promedio = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);

export default function PaginaCalibracion() {
  // Solo lo que usa la pantalla; `naves` se reduce a números enteros (cambian poco).
  const datos = usePlantaCampos((p) => ({
    t: p.t,
    sensores: p.sensores,
    muestras: p.muestras,
    niveles: p.naves.map((n) => `${n.id}:${n.nombre}:${Math.round(n.nivelCm)}:${Math.round(promedio(n.miras))}:${n.sensor === 'sin_datos' ? 1 : 0}`).join('|'),
  }));
  if (!datos) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Esqueleto className="h-24 rounded-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-56 rounded-card" />
          ))}
        </div>
      </div>
    );
  }
  return <Calibracion {...datos} />;
}

function Calibracion({ t, sensores, muestras, niveles }: { t: number; sensores: SensorInfo[]; muestras: MuestraCalibracion[]; niveles: string }) {
  const registra = usePuede('registrar_lectura');
  const [abierto, setAbierto] = useState<Abierto>(null);
  const cerrar = () => setAbierto(null);

  const hoy = new Date(t).setHours(0, 0, 0, 0);
  // Lo fijo de cada sensor (nombre, unidad): no cambia aunque cambie lo que marca.
  const claveSensores = sensores.map((s) => s.id).join('|');
  const catalogo = useMemo(
    () => sensores.map(({ id, nombre, unidad, decimales, naveId }) => ({ id, nombre, unidad, decimales, naveId })),
    [claveSensores], // se recalcula solo si cambia la lista de sensores
  );
  const naves = useMemo<NivelNave[]>(
    () =>
      niveles.split('|').map((x) => {
        const [id, nombre, sensor, miras, sinDatos] = x.split(':');
        return { id: id as NivelNave['id'], nombre, sensor: Number(sensor), miras: Number(miras), sinDatos: sinDatos === '1' };
      }),
    [niveles],
  );
  const ultimaDe = useMemo(() => {
    const m = new Map<string, MuestraCalibracion>();
    for (const x of muestras) if (!m.has(x.sensorId)) m.set(x.sensorId, x);
    return m;
  }, [muestras]);

  const conProblema = sensores.filter((s) => s.estado !== 'en_linea');
  const pendientes = muestras.filter((m) => m.estado === 'pendiente').length;

  return (
    <>
      <EncabezadoPagina
        titulo="Calibración y laboratorio"
        descripcion="Compara los sensores con el laboratorio, las miras y las batimetrías. Si difieren, jefatura aprueba la corrección."
        acciones={
          registra && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Boton variante="primario" icono={<FlaskConical />} onClick={() => setAbierto('laboratorio')}>
                Resultado de laboratorio
              </Boton>
              <Boton icono={<Ruler />} onClick={() => setAbierto('miras')}>
                Lectura de miras
              </Boton>
              <Boton icono={<ScanLine />} onClick={() => setAbierto('batimetria')}>
                Batimetría
              </Boton>
            </div>
          )
        }
      />

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-title font-semibold text-fg">Estado de los sensores</h3>
          <div className="flex flex-wrap gap-2">
            <EstadoChip estado="en_linea" texto={`${sensores.length - conProblema.length} en línea`} tamano="sm" />
            {conProblema.map((s) => (
              <EstadoChip key={s.id} estado={s.estado} texto={s.nombre.replace('Nivel de lodo · ', '').replace('Sólidos en suspensión · ', 'Sólidos ')} tamano="sm" />
            ))}
            {pendientes > 0 && <EstadoChip estado="advertencia" texto={`${pendientes} por aprobar`} tamano="sm" />}
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
          {sensores.map((s) => (
            <TarjetaSensor key={s.id} sensor={s} ultima={ultimaDe.get(s.id)} hoy={hoy} />
          ))}
        </div>

        <ListaPendientes muestras={muestras} sensores={catalogo} ahora={hoy} className="col-span-12 xl:col-span-7" />
        <GraficoLaboratorio muestras={muestras} hoy={hoy} className="col-span-12 xl:col-span-5" />
        <NivelesReferencia naves={naves} muestras={muestras} hoy={hoy} className="col-span-12" />
        <TablaMuestras muestras={muestras} sensores={catalogo} hoy={hoy} className="col-span-12" />
      </div>

      <DialogoMuestra tipo="laboratorio" abierto={abierto === 'laboratorio'} alCerrar={cerrar} />
      <DialogoMuestra tipo="batimetria" abierto={abierto === 'batimetria'} alCerrar={cerrar} />
      <MirasConPlanta abierto={abierto === 'miras'} alCerrar={cerrar} />
    </>
  );
}

/** El diálogo de miras (el mismo de la Bitácora) solo se suscribe a la planta mientras está abierto. */
function MirasConPlanta({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const planta = usePlantaSi(abierto);
  return planta ? <DialogoLecturaMiras planta={planta} abierto={abierto} alCerrar={alCerrar} /> : null;
}
