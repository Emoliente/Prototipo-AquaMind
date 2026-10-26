import { CloudLightning, CloudRain, Sun, type LucideIcon } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { Escenario } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoNumero, formatoSoles } from '@/lib/format';
import { resumenEscenario, type ResumenEscenario } from '@/logic/pronostico';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';

export const ICONO_ESCENARIO: Record<Escenario, LucideIcon> = { seca: Sun, lluvias: CloudRain, nino: CloudLightning };
const ORDEN: Escenario[] = ['seca', 'lluvias', 'nino'];

const FILAS: { etiqueta: string; valor: (r: ResumenEscenario) => string; unidad: string }[] = [
  { etiqueta: 'Sólidos típicos en la entrada', valor: (r) => formatoNumero(r.sstGL, 2), unidad: 'g/L' },
  { etiqueta: 'Caudal típico', valor: (r) => formatoNumero(r.caudalM3s, 1), unidad: 'm³/s' },
  { etiqueta: 'Subida de la nave más cargada', valor: (r) => formatoNumero(r.subidaMaxCmH, 1), unidad: 'cm/h' },
  { etiqueta: 'Purgas por semana (3 naves)', valor: (r) => formatoNumero(r.purgasSemana, r.purgasSemana < 10 ? 1 : 0), unidad: 'purgas' },
  { etiqueta: 'Lodo a evacuar', valor: (r) => formatoNumero(r.lodoM3Semana), unidad: 'm³/semana' },
  { etiqueta: 'Agua usada en purgas', valor: (r) => formatoNumero(r.aguaM3Semana), unidad: 'm³/semana' },
  { etiqueta: 'Energía de bombeo', valor: (r) => formatoNumero(r.kwhSemana), unidad: 'kWh/semana' },
  { etiqueta: 'Costo de bombeo', valor: (r) => formatoSoles(r.solesSemana), unidad: 'por semana' },
];

/** Las tres temporadas lado a lado: qué esperar en purgas, agua y energía por semana. */
export function ComparacionEscenarios({ planta, seleccionado }: { planta: EstadoPlanta; seleccionado: Escenario }) {
  const resumenes = ORDEN.map((e) => resumenEscenario(e, planta));
  const base = resumenes[0].kwhBaseSemana;
  return (
    <Tarjeta relleno="none">
      <div className="border-b border-line p-5 sm:p-6">
        <EncabezadoTarjeta
          titulo="Comparación de temporadas"
          subtitulo="Una semana típica con purgas a demanda y bombeo calculado"
        />
        <p className="mt-2 text-[0.75rem] text-fg-muted sm:hidden">Desliza la tabla para ver las tres temporadas →</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Comparación de escenarios por semana</caption>
          <thead>
            <tr>
              <th scope="col" className="px-5 py-3 text-label font-semibold text-fg-muted sm:px-6">Por semana</th>
              {resumenes.map((r) => {
                const I = ICONO_ESCENARIO[r.escenario];
                return (
                  <th
                    key={r.escenario}
                    scope="col"
                    className={cn('px-4 py-3 text-right text-label font-semibold', r.escenario === seleccionado ? 'bg-accent-soft text-fg' : 'text-fg-muted')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <I className="size-4" aria-hidden /> {r.nombre}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f) => (
              <tr key={f.etiqueta} className="border-t border-line">
                <th scope="row" className="px-5 py-3 text-label font-normal text-fg-muted sm:px-6">
                  {f.etiqueta}
                </th>
                {resumenes.map((r) => (
                  <td key={r.escenario} className={cn('px-4 py-3 text-right', r.escenario === seleccionado && 'bg-accent-soft')}>
                    <span className="num text-body font-semibold text-fg">{f.valor(r)}</span>{' '}
                    <span className="text-[0.75rem] text-fg-muted">{f.unidad}</span>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th scope="row" className="px-5 py-3 text-label font-normal text-fg-muted sm:px-6">
                Ahorro frente a 8 h fijas (<span className="num">{formatoNumero(base)}</span> kWh)
              </th>
              {resumenes.map((r) => (
                <td key={r.escenario} className={cn('px-4 py-3 text-right', r.escenario === seleccionado && 'bg-accent-soft')}>
                  <span className="num text-body font-semibold text-ok">{formatoSoles(r.ahorroSolesSemana)}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
