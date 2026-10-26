import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CheckCheck, Info, ListFilter, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId, Severidad } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { usePlanta } from '@/store/useTelemetria';
import { useOperacion, usePuede } from '@/store/useOperacion';
import { useComando } from '@/store/useComando';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { Segmentado } from '@/components/ui/Segmentado';
import { Boton } from '@/components/ui/Boton';
import { Interruptor } from '@/components/ui/Interruptor';
import { AlertaItem } from '@/components/alertas/AlertaItem';
import { VistaPreviaTelegram } from './VistaPreviaTelegram';
import { PreferenciasAvisos } from './PreferenciasAvisos';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const POR_PAGINA = 20;

type Filtro = 'todas' | Severidad;

function grupoDia(t: number, ahora: number) {
  const d = new Date(t);
  if (d.toDateString() === new Date(ahora).toDateString()) return 'Hoy';
  if (d.toDateString() === new Date(ahora - 86_400_000).toDateString()) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export default function PaginaAlertas() {
  const planta = usePlanta();
  if (!planta) {
    return (
      <div aria-busy className="grid grid-cols-12 gap-6">
        <Esqueleto className="col-span-12 h-[600px] rounded-card xl:col-span-8" />
        <Esqueleto className="col-span-12 h-[600px] rounded-card xl:col-span-4" />
      </div>
    );
  }
  return <Alertas planta={planta} />;
}

function Resumen({ icono, valor, texto, tono }: { icono: ReactNode; valor: number; texto: string; tono: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface-1 px-4 py-3">
      <span className={cn('grid size-10 place-items-center rounded-full [&>svg]:size-5', tono)}>{icono}</span>
      <div>
        <p className="num text-value-sm font-semibold leading-none text-fg">{valor}</p>
        <p className="mt-1 text-label text-fg-muted">{texto}</p>
      </div>
    </div>
  );
}

function Alertas({ planta }: { planta: EstadoPlanta }) {
  const opera = usePuede('operar');
  const comando = useComando();
  const abrirPurga = useOperacion((s) => s.abrirPurga);
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [nave, setNave] = useState<NaveId | 'todas'>('todas');
  const [pendientes, setPendientes] = useState(false);
  const [limite, setLimite] = useState(POR_PAGINA);

  const sinReconocer = planta.alertas.filter((a) => !a.reconocida);
  const criticas = sinReconocer.filter((a) => a.severidad === 'critica').length;
  const advertencias = sinReconocer.filter((a) => a.severidad === 'advertencia').length;
  const hoy = new Date(planta.t);
  hoy.setHours(0, 0, 0, 0);
  const infoHoy = planta.alertas.filter((a) => a.severidad === 'info' && a.t >= hoy.getTime()).length;

  const filtradas = useMemo(
    () =>
      planta.alertas.filter(
        (a) =>
          (filtro === 'todas' || a.severidad === filtro) &&
          (nave === 'todas' || a.naveId === nave) &&
          (!pendientes || !a.reconocida),
      ),
    [planta.alertas, filtro, nave, pendientes],
  );
  const visibles = filtradas.slice(0, limite);

  const grupos: { dia: string; items: typeof visibles }[] = [];
  for (const a of visibles) {
    const dia = grupoDia(a.t, planta.t);
    const g = grupos.at(-1);
    if (g?.dia === dia) g.items.push(a);
    else grupos.push({ dia, items: [a] });
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Alertas"
        descripcion="Severidad, hora, nave y la acción sugerida. Las críticas y advertencias también llegan por Telegram al técnico de turno."
      />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 flex min-w-0 flex-col gap-4 xl:col-span-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Resumen icono={<OctagonAlert />} valor={criticas} texto="críticas sin reconocer" tono="bg-crit-soft text-crit" />
            <Resumen icono={<TriangleAlert />} valor={advertencias} texto="advertencias sin reconocer" tono="bg-warn-soft text-warn" />
            <Resumen icono={<Info />} valor={infoHoy} texto="informativas hoy" tono="bg-info-soft text-info" />
          </div>

          <Tarjeta relleno="none" className="flex flex-col">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:flex-wrap lg:items-center">
              <ListFilter className="hidden size-5 text-fg-subtle lg:block" aria-hidden />
              <div className="max-w-full overflow-x-auto">
                <Segmentado
                  etiqueta="Severidad"
                  valor={filtro}
                  alCambiar={(v) => {
                    setFiltro(v);
                    setLimite(POR_PAGINA);
                  }}
                  opciones={[
                    { valor: 'todas', texto: 'Todas' },
                    { valor: 'critica', texto: 'Críticas', icono: <OctagonAlert /> },
                    { valor: 'advertencia', texto: 'Advertencias', icono: <TriangleAlert /> },
                    { valor: 'info', texto: 'Información', icono: <Info /> },
                  ]}
                />
              </div>
              <select
                aria-label="Nave"
                value={nave}
                onChange={(e) => setNave(e.target.value as NaveId | 'todas')}
                className="h-12 rounded-btn border border-line-strong bg-surface-2 px-3 text-label font-semibold text-fg"
              >
                <option value="todas">Todas las naves</option>
                {planta.naves.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
              <Interruptor activo={pendientes} alCambiar={setPendientes} etiqueta="Solo sin reconocer" className="lg:w-auto" />
              {opera && sinReconocer.length > 0 && (
                <Boton icono={<CheckCheck />} onClick={() => comando({ tipo: 'reconocer_todas' })} className="lg:ml-auto">
                  Reconocer todas
                </Boton>
              )}
            </div>

            <div className="flex flex-col gap-6 p-4 sm:p-5">
              {grupos.length === 0 && (
                <p className="rounded-btn border border-dashed border-line-strong p-8 text-center text-body text-fg-muted">
                  No hay alertas con estos filtros.
                </p>
              )}
              {grupos.map((g) => (
                <section key={g.dia} aria-label={g.dia} className="flex flex-col gap-3">
                  <h3 className="text-label font-semibold uppercase tracking-wider text-fg-subtle">{g.dia}</h3>
                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {g.items.map((a) => (
                        <AlertaItem
                          key={a.id}
                          alerta={a}
                          alVer={
                            a.reconocida || a.severidad === 'info'
                              ? undefined
                              : () => (a.naveId && opera ? abrirPurga(a.naveId) : navegar('/panel'))
                          }
                          textoVer={a.naveId && opera ? 'Ver recomendación' : 'Ver en el panel'}
                          alReconocer={opera ? () => comando({ tipo: 'reconocer_alerta', alertaId: a.id }) : undefined}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
              {filtradas.length > limite && (
                <Boton onClick={() => setLimite((l) => l + POR_PAGINA)} className="self-center">
                  Ver {Math.min(POR_PAGINA, filtradas.length - limite)} más
                </Boton>
              )}
            </div>
          </Tarjeta>
        </div>

        <div className="col-span-12 flex min-w-0 flex-col gap-4 xl:col-span-4">
          <VistaPreviaTelegram planta={planta} className="h-[640px]" />
          <PreferenciasAvisos planta={planta} />
        </div>
      </div>
    </>
  );
}
