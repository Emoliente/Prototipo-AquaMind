import { Link } from 'react-router-dom';
import { ArrowRight, Fan } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import { formatoDuracion, formatoHora, formatoNumero } from '@/lib/format';
import { nombreUsuario } from '@/config/usuarios';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { GraficoNivelPurga } from './GraficoNivelPurga';

/** Resultado de la última purga: Δ nivel × área = lodo purgado, agua usada y siguiente paso (bombeo). */
export function ResultadoUltimaPurga({ planta }: { planta: EstadoPlanta }) {
  const u = planta.ultimaPurga;
  if (!u || !u.fin) return null;
  const nave = planta.naves.find((n) => n.id === u.naveId)!;
  const delta = u.nivelInicialCm - (u.nivelFinalCm ?? u.nivelInicialCm);

  return (
    <Tarjeta relleno="none" className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 sm:p-6">
        <div>
          <p className="text-label font-semibold uppercase tracking-wider text-fg-subtle">Última purga</p>
          <h3 className="mt-1 text-title font-semibold text-fg">
            {nave.nombre} · {formatoHora(u.inicio)}–{formatoHora(u.fin)}
          </h3>
          <p className="text-label text-fg-muted">
            {nombreUsuario(u.usuarioId)} · compuerta {u.aperturaUsadaCm} cm · {formatoDuracion(u.duracionMin)}
          </p>
        </div>
        <EstadoChip estado="normal" texto="Terminada" />
      </div>
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-label text-fg-muted">Lodo purgado</p>
            <Valor valor={u.volumenM3 ?? 0} unidad="m³" tamano="lg" />
            <p className="text-label text-fg-muted">
              <span className="num text-fg">{formatoNumero(delta)}</span> cm × <span className="num text-fg">{formatoNumero(nave.areaM2)}</span> m² de nave · se fue a la quebrada
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Lodo</dt>
              <dd className="text-label text-fg">
                <span className="num">{formatoNumero(u.nivelInicialCm)}</span> → <span className="num font-semibold">{formatoNumero(u.nivelFinalCm ?? 0)}</span> cm
              </dd>
            </div>
            <div className="rounded-btn border border-line p-3">
              <dt className="text-label text-fg-muted">Agua usada</dt>
              <dd>
                <Valor valor={u.aguaUsadaM3 ?? 0} unidad="m³" tamano="xs" animar={false} />
              </dd>
            </div>
          </dl>
          <Link
            to="/bombeo"
            className="mt-auto flex min-h-12 items-center gap-3 rounded-card border border-line bg-surface-2 p-3 transition-colors hover:border-accent-ring"
          >
            <Fan className="size-5 shrink-0 text-accent" aria-hidden />
            <span className="flex-1 text-label text-fg">
              {/* El bombeo es aparte: saca del embalse los finos que pasan con el agua limpia, no lo purgado. */}
              {planta.bombeo
                ? 'Embalse: bombeo en curso'
                : planta.plan.asignaciones.length && planta.embalseLodoM3 >= planta.embalseUmbralM3
                  ? <>Embalse: {planta.plan.asignaciones.map((a) => `B${a.bombaId.slice(1)}`).join(' + ')} por <span className="num">{formatoDuracion(planta.plan.asignaciones[0].minutos)}</span></>
                  : 'Embalse: aún no hace falta bombear'}
            </span>
            <ArrowRight className="size-4 text-fg-muted" aria-hidden />
          </Link>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-label font-semibold text-fg-muted">Nivel de lodo durante la purga (cm)</p>
          <GraficoNivelPurga muestras={u.muestras} criticoCm={nave.nivelCriticoCm} alto={220} />
        </div>
      </div>
    </Tarjeta>
  );
}
