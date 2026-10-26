import { memo, useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileSpreadsheet, LoaderCircle, ScrollText, Search } from 'lucide-react';
import type { RegistroAuditoria } from '@/data/DataSource';
import { NOMBRE_PERFIL, nombreUsuario, perfilDeUsuario, USUARIO_SISTEMA } from '@/config/usuarios';
import { cn } from '@/lib/cn';
import { diaYHora, fechaIso } from '@/lib/format';
import { exportarExcel, precargarExcel } from '@/lib/exportar';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Segmentado } from '@/components/ui/Segmentado';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Boton } from '@/components/ui/Boton';
import { hojasAuditoria } from './libroAuditoria';

type FiltroResultado = 'todos' | 'aceptado' | 'rechazado';
const POR_PAGINA = 15;
const selectCls = 'h-12 rounded-btn border border-line-strong bg-surface-2 px-3 text-label font-semibold text-fg';

const perfilTexto = (id: string) => {
  if (id === USUARIO_SISTEMA.id) return 'Automático';
  const p = perfilDeUsuario(id);
  return p ? NOMBRE_PERFIL[p] : '';
};

function Resultado({ r }: { r: RegistroAuditoria }) {
  return r.resultado === 'aceptado' ? (
    <EstadoChip estado="normal" texto="Aceptada" tamano="sm" />
  ) : (
    <EstadoChip estado="critica" texto="Rechazada" tamano="sm" />
  );
}

/** Cada orden dada en la planta: quién, cuándo, qué, por qué y si se aceptó. */
export const TablaAuditoria = memo(function TablaAuditoria({
  auditoria,
  hoy,
  ahora,
  className,
}: {
  auditoria: RegistroAuditoria[];
  /** Inicio del día de planta (para "hoy" / "ayer"). */
  hoy: number;
  /** Hora de planta (para el nombre del archivo exportado). */
  ahora: number;
  className?: string;
}) {
  const [resultado, setResultado] = useState<FiltroResultado>('todos');
  const [usuario, setUsuario] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [exportando, setExportando] = useState(false);

  useEffect(() => precargarExcel(), []);

  const usuarios = useMemo(() => [...new Set(auditoria.map((a) => a.usuarioId))], [auditoria]);
  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return auditoria.filter(
      (a) =>
        (resultado === 'todos' || a.resultado === resultado) &&
        (usuario === 'todos' || a.usuarioId === usuario) &&
        (!q || `${a.comando} ${a.detalle} ${a.motivo ?? ''} ${nombreUsuario(a.usuarioId)}`.toLowerCase().includes(q)),
    );
  }, [auditoria, resultado, usuario, busqueda]);
  const visibles = lista.slice(0, limite);
  const rechazadas = auditoria.filter((a) => a.resultado === 'rechazado').length;

  const filtrar = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setLimite(POR_PAGINA);
  };

  // Mientras se arma el Excel, el botón queda ocupado: un doble clic no descarga dos veces.
  const exportar = async () => {
    if (exportando || !lista.length) return;
    setExportando(true);
    try {
      const filtros = [
        resultado !== 'todos' && (resultado === 'aceptado' ? 'Aceptadas' : 'Rechazadas'),
        usuario !== 'todos' && nombreUsuario(usuario),
        busqueda.trim() && `búsqueda «${busqueda.trim()}»`,
      ].filter((x): x is string => Boolean(x));
      await exportarExcel(`auditoria-desarenador-miraflores-${fechaIso(ahora)}.xlsx`, () => hojasAuditoria(lista, filtros, ahora), {
        titulo: 'Auditoría · Desarenador Miraflores',
        autor: 'AquaMind',
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <Tarjeta relleno="none" className={className}>
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <EncabezadoTarjeta
            icono={<ScrollText className="size-5" />}
            titulo="Registro de auditoría"
            subtitulo={`${auditoria.length} órdenes · ${rechazadas} rechazadas`}
          />
          <Boton
            variante="primario"
            icono={exportando ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}
            onClick={exportar}
            disabled={!lista.length || exportando}
            aria-busy={exportando || undefined}
          >
            {exportando ? 'Preparando…' : 'Exportar a Excel'}
          </Boton>
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="max-w-full overflow-x-auto">
            <Segmentado
              etiqueta="Resultado"
              valor={resultado}
              alCambiar={filtrar(setResultado)}
              opciones={[
                { valor: 'todos', texto: 'Todas' },
                { valor: 'aceptado', texto: 'Aceptadas' },
                { valor: 'rechazado', texto: 'Rechazadas' },
              ]}
            />
          </div>
          <select aria-label="Usuario" value={usuario} onChange={(e) => filtrar(setUsuario)(e.target.value)} className={selectCls}>
            <option value="todos">Todas las personas</option>
            {usuarios.map((u) => (
              <option key={u} value={u}>{nombreUsuario(u)}</option>
            ))}
          </select>
          <label className="relative flex-1 xl:min-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={busqueda}
              maxLength={100}
              onChange={(e) => filtrar(setBusqueda)(e.target.value)}
              placeholder="Buscar orden, detalle o motivo"
              aria-label="Buscar en la auditoría"
              className="h-12 w-full rounded-btn border border-line-strong bg-surface-2 pl-9 pr-3 text-body text-fg placeholder:text-fg-subtle"
            />
          </label>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="px-6 py-10 text-center text-label text-fg-muted">No hay órdenes con estos filtros.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <caption className="sr-only">Registro de auditoría</caption>
              <thead>
                <tr className="border-b border-line-strong text-label text-fg-muted">
                  <th scope="col" className="px-5 py-3 font-semibold">Fecha y hora</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Quién</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Orden</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Detalle</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Motivo</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.id} className={cn('border-b border-line align-top transition-colors hover:bg-surface-2', a.resultado === 'rechazado' && 'bg-crit-soft/30')}>
                    <td className="num whitespace-nowrap px-5 py-3 text-label text-fg">{diaYHora(a.t, hoy)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-label text-fg">{nombreUsuario(a.usuarioId)}</p>
                      <p className="text-[0.75rem] text-fg-muted">{perfilTexto(a.usuarioId)}</p>
                    </td>
                    <td className="px-4 py-3 text-label font-semibold text-fg">{a.comando}</td>
                    <td className="max-w-[28rem] px-4 py-3 text-label text-fg">{a.detalle || <span className="text-fg-subtle">—</span>}</td>
                    <td className="max-w-[18rem] px-4 py-3 text-label text-fg-muted">{a.motivo || <span className="text-fg-subtle">—</span>}</td>
                    <td className="px-5 py-3"><Resultado r={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col md:hidden">
            {visibles.map((a) => (
              <li key={a.id} className="flex flex-col gap-1.5 border-b border-line px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label font-semibold text-fg">{a.comando}</span>
                  <Resultado r={a} />
                </div>
                {a.detalle && <p className="text-label text-fg">{a.detalle}</p>}
                {a.motivo && <p className="text-label text-fg-muted">Motivo: {a.motivo}</p>}
                <p className="num text-[0.75rem] text-fg-muted">
                  {diaYHora(a.t, hoy)} · <span className="font-sans">{nombreUsuario(a.usuarioId)}</span>
                </p>
              </li>
            ))}
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
