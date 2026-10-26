import type { EventoBitacora } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoDuracion, formatoHora, formatoNumero } from '@/lib/format';
import { nombreUsuario } from '@/config/usuarios';
import { TIPO_EVENTO } from './tiposEvento';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const fecha = (t: number) => {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
};

function Tipo({ e }: { e: EventoBitacora }) {
  const { texto, icono: I } = TIPO_EVENTO[e.tipo];
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-label font-semibold',
        e.tipo === 'emergencia' ? 'bg-crit-soft text-crit' : 'bg-surface-3 text-fg',
      )}
    >
      <I className="size-4" aria-hidden /> {texto}
    </span>
  );
}

const num = (v: number | undefined, d = 0) => (v === undefined ? <span className="text-fg-subtle">—</span> : formatoNumero(v, d));

/** Bitácora: tabla en pantallas anchas, tarjetas en celular. */
export function TablaBitacora({ eventos }: { eventos: EventoBitacora[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <caption className="sr-only">Bitácora de operación</caption>
          <thead className="sticky top-0 z-10 bg-surface-1">
            <tr className="border-b border-line-strong text-label text-fg-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Fecha y hora</th>
              <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Nave</th>
              <th scope="col" className="px-4 py-3 font-semibold">Quién</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Apertura <span className="font-normal">cm</span></th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Duración</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Lodo <span className="font-normal">m³</span></th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Agua <span className="font-normal">m³</span></th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Energía <span className="font-normal">kWh</span></th>
              <th scope="col" className="px-4 py-3 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id} className="border-b border-line align-top transition-colors hover:bg-surface-2">
                <td className="num whitespace-nowrap px-4 py-3 text-label text-fg">
                  {fecha(e.t)} <span className="text-fg-muted">{formatoHora(e.t)}</span>
                </td>
                <td className="px-4 py-3"><Tipo e={e} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-label text-fg">{e.naveId ? `Nave ${e.naveId.slice(1)}` : <span className="text-fg-subtle">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-label text-fg">{nombreUsuario(e.usuarioId)}</td>
                <td className="num px-4 py-3 text-right text-label text-fg">{num(e.aperturaCm)}</td>
                <td className="num whitespace-nowrap px-4 py-3 text-right text-label text-fg">
                  {e.duracionMin !== undefined ? formatoDuracion(e.duracionMin) : <span className="text-fg-subtle">—</span>}
                </td>
                <td className="num px-4 py-3 text-right text-label text-fg">{num(e.volumenM3)}</td>
                <td className="num px-4 py-3 text-right text-label text-fg">{num(e.aguaM3)}</td>
                <td className="num px-4 py-3 text-right text-label text-fg">{num(e.kwh, 1)}</td>
                <td className="max-w-[28rem] px-4 py-3 text-label text-fg-muted">
                  {e.detalle}
                  {e.motivo && <span className="block text-fg">Motivo: {e.motivo}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {eventos.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <Tipo e={e} />
              <span className="num text-label text-fg-muted">
                {fecha(e.t)} {formatoHora(e.t)}
              </span>
            </div>
            <p className="text-label text-fg">
              {e.naveId && <span className="font-semibold">Nave {e.naveId.slice(1)} · </span>}
              {nombreUsuario(e.usuarioId)}
            </p>
            {(e.volumenM3 !== undefined || e.kwh !== undefined) && (
              <p className="num text-label text-fg">
                {e.aperturaCm !== undefined && <>{e.aperturaCm} cm · </>}
                {e.duracionMin !== undefined && <>{formatoDuracion(e.duracionMin)} · </>}
                {e.volumenM3 !== undefined && <>{formatoNumero(e.volumenM3)} m³ </>}
                {e.aguaM3 !== undefined && <>· agua {formatoNumero(e.aguaM3)} m³ </>}
                {e.kwh !== undefined && <>· {formatoNumero(e.kwh, 1)} kWh</>}
              </p>
            )}
            <p className="text-label text-fg-muted">{e.detalle}</p>
            {e.motivo && <p className="text-label text-fg">Motivo: {e.motivo}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
