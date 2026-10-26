import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, History, X } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { formatoDuracion, formatoHora, formatoNumero } from '@/lib/format';
import { nombreUsuario } from '@/config/usuarios';
import { usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function cuando(t: number, ahora: number) {
  const d = new Date(t);
  const hoy = new Date(ahora);
  const mismoDia = d.toDateString() === hoy.toDateString();
  const ayer = new Date(ahora - 86_400_000).toDateString() === d.toDateString();
  const manana = new Date(ahora + 86_400_000).toDateString() === d.toDateString();
  const dia = mismoDia ? 'hoy' : ayer ? 'ayer' : manana ? 'mañana' : `${DIAS[d.getDay()]} ${d.getDate()}`;
  return `${dia} ${formatoHora(t)}`;
}

/** Purgas programadas, con opción de cancelarlas. */
export function ListaProgramadas({ planta }: { planta: EstadoPlanta }) {
  const opera = usePuede('operar');
  const comando = useComando();
  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoTarjeta icono={<CalendarClock className="size-5" />} titulo="Programadas" subtitulo="Se inician solas a la hora indicada" />
      {planta.programadas.length === 0 ? (
        <p className="rounded-btn border border-dashed border-line-strong p-4 text-center text-label text-fg-muted">
          Sin purgas programadas. Elige «Programar» al preparar una purga.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {planta.programadas.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-btn border border-line bg-surface-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-fg">
                  Nave {p.naveId.slice(1)} · <span className="num">{cuando(p.inicio, planta.t)}</span>
                </p>
                <p className="truncate text-label text-fg-muted">
                  <span className="num">{p.aperturaCm}</span> cm · <span className="num">{p.duracionMin}</span> min · {nombreUsuario(p.usuarioId)}
                </p>
              </div>
              {opera && (
                <Boton
                  variante="fantasma"
                  tamano="icono"
                  aria-label={`Cancelar purga programada de la Nave ${p.naveId.slice(1)}`}
                  icono={<X />}
                  onClick={() => comando({ tipo: 'cancelar_programada', programadaId: p.id })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/** Últimas purgas registradas en la bitácora. */
export function HistorialPurgas({ planta, limite = 6 }: { planta: EstadoPlanta; limite?: number }) {
  const purgas = planta.bitacora.filter((e) => e.tipo === 'purga').slice(0, limite);
  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoTarjeta
        icono={<History className="size-5" />}
        titulo="Purgas recientes"
        accion={
          <Link to="/bitacora" className="inline-flex h-10 items-center gap-1 rounded-btn px-2 text-label font-semibold text-accent hover:bg-accent-soft">
            Bitácora <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {purgas.length === 0 ? (
        <p className="text-label text-fg-muted">Aún no hay purgas registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {purgas.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-body font-semibold text-fg">
                  Nave {e.naveId?.slice(1)} <span className="num font-normal text-fg-muted">· {cuando(e.t, planta.t)}</span>
                </p>
                <p className="truncate text-label text-fg-muted">
                  {nombreUsuario(e.usuarioId)} · <span className="num">{e.aperturaCm}</span> cm · {formatoDuracion(e.duracionMin ?? 0)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="num text-body font-semibold text-fg">
                  {formatoNumero(e.volumenM3 ?? 0)} <span className="font-sans text-label font-normal text-fg-muted">m³</span>
                </p>
                <p className="num text-[0.75rem] text-fg-muted">agua {formatoNumero(e.aguaM3 ?? 0)} m³</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
