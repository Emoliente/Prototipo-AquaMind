import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, LoaderCircle, Ruler, Search, StickyNote } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { fechaIso, formatoNumero, formatoSoles } from '@/lib/format';
import { exportarExcel, precargarExcel } from '@/lib/exportar';
import { nombreUsuario } from '@/config/usuarios';
import { usePlanta } from '@/store/useTelemetria';
import { usePuede } from '@/store/useOperacion';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { Segmentado } from '@/components/ui/Segmentado';
import { Boton } from '@/components/ui/Boton';
import { TablaBitacora } from './TablaBitacora';
import { DialogoLecturaMiras, DialogoNota } from './DialogosRegistro';
import { coincideTipo, type FiltroTipo } from './tiposEvento';
import { hojasBitacora } from './libroBitacora';

const DIA = 86_400_000;
const POR_PAGINA = 50;
type Periodo = 'hoy' | '7d' | '30d' | 'todo';

const TEXTO_PERIODO: Record<Periodo, string> = { hoy: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', todo: 'Todo el registro' };
const TEXTO_TIPO: Record<FiltroTipo, string> = {
  todos: 'Todos los tipos',
  purga: 'Purgas',
  bombeo: 'Bombeos',
  registros: 'Lecturas, notas y calibraciones',
  otros: 'Rechazos y comandos',
};

export default function PaginaBitacora() {
  const planta = usePlanta();
  if (!planta) return <Esqueleto aria-busy className="h-[70vh] rounded-card" />;
  return <Bitacora planta={planta} />;
}

const selectCls = 'h-12 rounded-btn border border-line-strong bg-surface-2 px-3 text-label font-semibold text-fg';

function Bitacora({ planta }: { planta: EstadoPlanta }) {
  const registra = usePuede('registrar_lectura');
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [nave, setNave] = useState<NaveId | 'todas'>('todas');
  const [usuario, setUsuario] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [dialogo, setDialogo] = useState<'miras' | 'nota' | null>(null);

  const usuarios = useMemo(() => [...new Set(planta.bitacora.map((e) => e.usuarioId))], [planta.bitacora]);
  const desde = useMemo(() => {
    const hoy = new Date(planta.t);
    hoy.setHours(0, 0, 0, 0);
    return periodo === 'hoy' ? hoy.getTime() : periodo === '7d' ? planta.t - 7 * DIA : periodo === '30d' ? planta.t - 30 * DIA : 0;
  }, [periodo, planta.t]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return planta.bitacora.filter(
      (e) =>
        e.t >= desde &&
        coincideTipo(e.tipo, tipo) &&
        (nave === 'todas' || e.naveId === nave) &&
        (usuario === 'todos' || e.usuarioId === usuario) &&
        (!q || `${e.detalle} ${e.motivo ?? ''} ${nombreUsuario(e.usuarioId)}`.toLowerCase().includes(q)),
    );
  }, [planta.bitacora, desde, tipo, nave, usuario, busqueda]);

  const purgas = filtrados.filter((e) => e.tipo === 'purga');
  const bombeos = filtrados.filter((e) => e.tipo === 'bombeo');
  const lodo = purgas.reduce((s, e) => s + (e.volumenM3 ?? 0), 0);
  const agua = purgas.reduce((s, e) => s + (e.aguaM3 ?? 0), 0);
  const kwh = bombeos.reduce((s, e) => s + (e.kwh ?? 0), 0);

  useEffect(() => precargarExcel(), []);

  // Mientras se arma el Excel, el botón queda ocupado: un doble clic no descarga dos veces.
  const [exportando, setExportando] = useState(false);
  const exportar = async () => {
    if (exportando || !filtrados.length) return;
    setExportando(true);
    try {
      const activos = [
        tipo !== 'todos' && TEXTO_TIPO[tipo],
        nave !== 'todas' && `Nave ${nave.slice(1)}`,
        usuario !== 'todos' && nombreUsuario(usuario),
        busqueda.trim() && `búsqueda «${busqueda.trim()}»`,
      ].filter((x): x is string => Boolean(x));
      await exportarExcel(
        `bitacora-desarenador-miraflores-${fechaIso(planta.t)}.xlsx`,
        () => hojasBitacora(filtrados, { periodo: TEXTO_PERIODO[periodo], activos }, planta.config.tarifaSolesKwh, planta.t),
        { titulo: 'Bitácora · Desarenador Miraflores', autor: 'AquaMind' },
      );
    } finally {
      setExportando(false);
    }
  };

  const reiniciarPagina = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setLimite(POR_PAGINA);
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Bitácora"
        descripcion="Cada purga, bombeo, lectura y comando queda registrado solo, con quién y cuándo."
        acciones={
          <>
            {registra && (
              <>
                <Boton icono={<Ruler />} onClick={() => setDialogo('miras')}>Lectura de miras</Boton>
                <Boton icono={<StickyNote />} onClick={() => setDialogo('nota')}>Agregar nota</Boton>
              </>
            )}
            <Boton
              variante="primario"
              icono={exportando ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}
              onClick={exportar}
              disabled={!filtrados.length || exportando}
              aria-busy={exportando || undefined}
            >
              {exportando ? 'Preparando…' : 'Exportar a Excel'}
            </Boton>
          </>
        }
      />

      <Tarjeta relleno="none" className="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="max-w-full overflow-x-auto">
            <Segmentado
              etiqueta="Período"
              valor={periodo}
              alCambiar={reiniciarPagina(setPeriodo)}
              opciones={[
                { valor: 'hoy', texto: 'Hoy' },
                { valor: '7d', texto: '7 días' },
                { valor: '30d', texto: '30 días' },
                { valor: 'todo', texto: 'Todo' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:flex [&>select:first-child]:col-span-2 sm:[&>select:first-child]:col-span-1">
            <select aria-label="Tipo de registro" value={tipo} onChange={(e) => reiniciarPagina(setTipo)(e.target.value as FiltroTipo)} className={selectCls}>
              {(Object.keys(TEXTO_TIPO) as FiltroTipo[]).map((t) => (
                <option key={t} value={t}>{TEXTO_TIPO[t]}</option>
              ))}
            </select>
            <select aria-label="Nave" value={nave} onChange={(e) => reiniciarPagina(setNave)(e.target.value as NaveId | 'todas')} className={selectCls}>
              <option value="todas">Todas las naves</option>
              {planta.naves.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
            <select aria-label="Usuario" value={usuario} onChange={(e) => reiniciarPagina(setUsuario)(e.target.value)} className={selectCls}>
              <option value="todos">Todas las personas</option>
              {usuarios.map((u) => (
                <option key={u} value={u}>{nombreUsuario(u)}</option>
              ))}
            </select>
          </div>
          <label className="relative flex-1 xl:min-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => reiniciarPagina(setBusqueda)(e.target.value)}
              maxLength={100}
              placeholder="Buscar en el detalle"
              aria-label="Buscar en el detalle"
              className="h-12 w-full rounded-btn border border-line-strong bg-surface-2 pl-9 pr-3 text-body text-fg placeholder:text-fg-subtle"
            />
          </label>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line bg-surface-2/50 px-4 py-4 sm:px-5 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Registros', formatoNumero(filtrados.length), ''],
            ['Purgas', formatoNumero(purgas.length), ''],
            ['Lodo purgado', formatoNumero(lodo), 'm³'],
            ['Agua usada', formatoNumero(agua), 'm³'],
            ['Energía de bombeo', formatoNumero(kwh), 'kWh'],
            ['Costo de bombeo', formatoSoles(kwh * planta.config.tarifaSolesKwh), ''],
          ].map(([k, v, u]) => (
            <div key={k}>
              <dt className="text-label text-fg-muted">{k}</dt>
              <dd className="num text-title font-semibold text-fg">
                {v} {u && <span className="font-sans text-label font-normal text-fg-muted">{u}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <div className="p-2 sm:p-3">
          {filtrados.length === 0 ? (
            <p className="m-4 rounded-btn border border-dashed border-line-strong p-8 text-center text-body text-fg-muted">
              No hay registros con estos filtros.
            </p>
          ) : (
            <TablaBitacora eventos={filtrados.slice(0, limite)} />
          )}
          {filtrados.length > limite && (
            <div className="flex justify-center p-4">
              <Boton onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Ver {Math.min(POR_PAGINA, filtrados.length - limite)} más de {formatoNumero(filtrados.length - limite)}
              </Boton>
            </div>
          )}
        </div>
      </Tarjeta>

      <DialogoLecturaMiras planta={planta} abierto={dialogo === 'miras'} alCerrar={() => setDialogo(null)} />
      <DialogoNota planta={planta} abierto={dialogo === 'nota'} alCerrar={() => setDialogo(null)} />
    </>
  );
}
