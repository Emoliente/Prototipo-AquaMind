import { motion } from 'framer-motion';
import { ArrowRight, Check, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Alerta, Severidad } from '@/types/dominio';
import { cn } from '@/lib/cn';
import { formatoHora } from '@/lib/format';
import { nombreUsuario } from '@/config/usuarios';
import { Boton } from '@/components/ui/Boton';
import { sinAceleracion } from '@/lib/movimiento';

const SEVERIDAD: Record<
  Severidad,
  { icono: LucideIcon; texto: string; chip: string; borde: string; iconoFondo: string }
> = {
  info: {
    icono: Info,
    texto: 'Información',
    chip: 'bg-info-soft text-info',
    borde: 'before:bg-info',
    iconoFondo: 'bg-info-soft text-info',
  },
  advertencia: {
    icono: TriangleAlert,
    texto: 'Advertencia',
    chip: 'bg-warn-soft text-warn',
    borde: 'before:bg-warn',
    iconoFondo: 'bg-warn-soft text-warn',
  },
  critica: {
    icono: OctagonAlert,
    texto: 'Crítica',
    chip: 'bg-crit-soft text-crit',
    borde: 'before:bg-crit',
    iconoFondo: 'bg-crit-soft text-crit',
  },
};

interface Props {
  alerta: Alerta;
  alVer?: () => void;
  /** Texto del botón de ver (por defecto «Ver recomendación»). */
  textoVer?: string;
  alReconocer?: () => void;
  className?: string;
}

/** Alerta con severidad (ícono + texto), hora, nave y acción sugerida. Entra deslizándose. */
export function AlertaItem({ alerta, alVer, textoVer = 'Ver recomendación', alReconocer, className }: Props) {
  const s = SEVERIDAD[alerta.severidad];
  const Icono = s.icono;
  return (
    <motion.li
      layout
      onUpdate={sinAceleracion}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={cn(
        'relative flex list-none gap-4 overflow-hidden rounded-card border border-line bg-surface-1 p-4 pl-5 shadow-1',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        s.borde,
        alerta.reconocida && 'opacity-70',
        className,
      )}
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', s.iconoFondo)}>
        <Icono className="size-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-full px-2 text-[0.75rem] font-semibold',
              s.chip,
            )}
          >
            {s.texto}
          </span>
          <span className="num text-label text-fg-muted">{formatoHora(alerta.t)}</span>
          {alerta.naveId && (
            <span className="text-label font-medium text-fg-muted">
              Nave {alerta.naveId.slice(1)}
            </span>
          )}
          {alerta.reconocida && (
            <span className="inline-flex items-center gap-1 text-label text-fg-subtle">
              <Check className="size-3.5" aria-hidden /> Reconocida
              {alerta.reconocidaPor && (
                <>
                  {' '}
                  por {nombreUsuario(alerta.reconocidaPor)}
                  {alerta.reconocidaT !== undefined && <span className="num"> {formatoHora(alerta.reconocidaT)}</span>}
                </>
              )}
            </span>
          )}
        </div>
        <p className="text-body font-semibold text-fg">{alerta.titulo}</p>
        {alerta.detalle && <p className="text-label text-fg-muted">{alerta.detalle}</p>}
        <p className="text-label text-fg">
          <span className="text-fg-muted">Acción sugerida: </span>
          {alerta.accionSugerida}
        </p>
        {(alVer || (alReconocer && !alerta.reconocida)) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {alVer && (
              <Boton variante="primario" iconoDerecha={<ArrowRight />} onClick={alVer}>
                {textoVer}
              </Boton>
            )}
            {alReconocer && !alerta.reconocida && (
              <Boton variante="secundario" icono={<Check />} onClick={alReconocer}>
                Reconocer
              </Boton>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}
