import { memo, useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import type { MuestraCalibracion, SensorInfo, TipoMuestra } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { diaYHora } from '@/lib/format';
import { comparar } from '@/logic/calibracion';
import { nombreUsuario } from '@/config/usuarios';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Segmentado } from '@/components/ui/Segmentado';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Boton } from '@/components/ui/Boton';
import { ESTADO_MUESTRA, TIPO_MUESTRA, conUnidad, textoDiferencia } from './textos';

type Filtro = 'todas' | TipoMuestra;
const POR_PAGINA = 8;

function Tipo({ tipo }: { tipo: TipoMuestra }) {
  const { texto, icono: I } = TIPO_MUESTRA[tipo];
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-3 px-2.5 text-label font-semibold text-fg">
      <I className="size-4" aria-hidden /> {texto}
    </span>
  );
}

/** Todas las comparaciones cargadas: tabla en pantallas anchas, tarjetas en celular. */
export const TablaMuestras = memo(function TablaMuestras({
  muestras,
  sensores,
  hoy,
  className,
}: {
  muestras: MuestraCalibracion[];
  sensores: Pick<SensorInfo, 'id' | 'nombre'>[];
  hoy: number;
  className?: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [limite, setLimite] = useState(POR_PAGINA);
  const lista = filtro === 'todas' ? muestras : muestras.filter((m) => m.tipo === filtro);
  const visibles = lista.slice(0, limite);
  const nombre = (id: string) => sensores.find((s) => s.id === id)?.nombre ?? id;
  const d = (m: MuestraCalibracion) => (m.unidad === 'g/L' ? 3 : 0);

  return (
    <Tarjeta relleno="none" className={className}>
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <EncabezadoTarjeta icono={<History className="size-5" />} titulo="Historial de comparaciones" subtitulo={`${lista.length} registros`} />
        <div className="max-w-full overflow-x-auto">
          <Segmentado
            etiqueta="Tipo de comparación"
            valor={filtro}
            alCambiar={(f) => {
              setFiltro(f);
              setLimite(POR_PAGINA);
            }}
            opciones={[
              { valor: 'todas', texto: 'Todas' },
              { valor: 'laboratorio', texto: 'Laboratorio' },
              { valor: 'miras', texto: 'Miras' },
              { valor: 'batimetria', texto: 'Batimetría' },
            ]}
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="px-6 py-10 text-center text-label text-fg-muted">No hay comparaciones de este tipo.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <caption className="sr-only">Historial de comparaciones de sensores</caption>
              <thead>
                <tr className="border-b border-line-strong text-label text-fg-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">Tomada</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Sensor</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Referencia</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Sensor marcaba</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Diferencia</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Quién</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => {
                  const c = comparar(m.valorReferencia, m.valorSensor, m.unidad);
                  return (
                    <tr key={m.id} className="border-b border-line align-top transition-colors hover:bg-surface-2">
                      <td className="num whitespace-nowrap px-5 py-3 text-label text-fg">{diaYHora(m.tMuestra, hoy)}</td>
                      <td className="px-4 py-3"><Tipo tipo={m.tipo} /></td>
                      <td className="px-4 py-3 text-label text-fg">{nombre(m.sensorId)}</td>
                      <td className="num whitespace-nowrap px-4 py-3 text-right text-label text-fg">{conUnidad(m.valorReferencia, m.unidad, d(m))}</td>
                      <td className="num whitespace-nowrap px-4 py-3 text-right text-label text-fg">{conUnidad(m.valorSensor, m.unidad, d(m))}</td>
                      <td className={cn('num whitespace-nowrap px-4 py-3 text-right text-label font-semibold', c.dentro ? 'text-fg' : 'text-warn')}>
                        {textoDiferencia(c.diferencia, c.relativa)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoChip estado={ESTADO_MUESTRA[m.estado].estado} texto={ESTADO_MUESTRA[m.estado].texto} tamano="sm" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-label text-fg-muted">
                        {nombreUsuario(m.usuarioId)}
                        {m.revisadoPor && m.revisadoPor !== m.usuarioId && <span className="block text-[0.75rem]">revisó {nombreUsuario(m.revisadoPor)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col md:hidden">
            {visibles.map((m) => {
              const c = comparar(m.valorReferencia, m.valorSensor, m.unidad);
              return (
                <li key={m.id} className="flex flex-col gap-2 border-b border-line px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <Tipo tipo={m.tipo} />
                    <EstadoChip estado={ESTADO_MUESTRA[m.estado].estado} texto={ESTADO_MUESTRA[m.estado].texto} tamano="sm" />
                  </div>
                  <p className="text-label font-semibold text-fg">{nombre(m.sensorId)}</p>
                  <p className="text-label text-fg">
                    Referencia <span className="num font-semibold">{conUnidad(m.valorReferencia, m.unidad, d(m))}</span> · sensor{' '}
                    <span className="num font-semibold">{conUnidad(m.valorSensor, m.unidad, d(m))}</span> ·{' '}
                    <span className={cn('num font-semibold', !c.dentro && 'text-warn')}>{textoDiferencia(c.diferencia, c.relativa)}</span>
                  </p>
                  <p className="num text-[0.75rem] text-fg-muted">
                    {diaYHora(m.tMuestra, hoy)} · <span className="font-sans">{nombreUsuario(m.usuarioId)}</span>
                  </p>
                </li>
              );
            })}
          </ul>

          {lista.length > limite && (
            <div className="flex justify-center p-4">
              <Boton variante="fantasma" iconoDerecha={<ChevronDown />} onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Ver más ({lista.length - limite})
              </Boton>
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
});
