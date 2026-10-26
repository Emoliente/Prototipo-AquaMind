import type { ReactNode } from 'react';
import type { EstadoPlanta } from '@/data/DataSource';
import { cn } from '@/lib/cn';
import { EstadoChip, type TipoEstado } from '@/components/ui/EstadoChip';

function Respuesta({ pregunta, estado, texto, pulso }: { pregunta: string; estado: TipoEstado; texto: ReactNode; pulso?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-3 py-2.5 sm:flex-col sm:items-stretch sm:gap-1">
      <span className="shrink-0 text-label font-medium text-fg-muted sm:text-[0.75rem]">{pregunta}</span>
      <EstadoChip estado={estado} texto={typeof texto === 'string' ? texto : undefined} pulso={pulso} className="max-w-full" />
    </div>
  );
}

/** Las tres preguntas del turno, respondidas sin tocar nada. */
export function ResumenRapido({ planta, className }: { planta: EstadoPlanta; className?: string }) {
  const r = planta.principal;
  const nave = `Nave ${r.naveId.slice(1)}`;
  const purga = planta.purgas[0];

  let purgar: { estado: TipoEstado; texto: string; pulso?: boolean };
  if (purga) purgar = { estado: 'info', texto: `Purgando Nave ${purga.naveId.slice(1)}` };
  else if (r.accion === 'purgar_ya') purgar = { estado: 'critica', texto: `Sí, ${nave} ya`, pulso: true };
  else if (r.accion === 'programar') purgar = { estado: 'advertencia', texto: `Programar ${nave}` };
  else purgar = { estado: 'normal', texto: 'No por ahora' };

  const fallas = planta.bombas.filter((b) => b.estado === 'falla');
  const enMarcha = planta.bombas.filter((b) => b.estado === 'en_marcha').length;
  const bombas: { estado: TipoEstado; texto: string } = fallas.length
    ? { estado: 'falla', texto: `Bomba ${fallas[0].id.slice(1)} en falla` }
    : { estado: 'normal', texto: enMarcha ? `Bien · ${enMarcha} en marcha` : 'Bien · 3 disponibles' };

  const malos = planta.sensores.filter((s) => s.estado !== 'en_linea');
  const sensores: { estado: TipoEstado; texto: string } = malos.length
    ? { estado: malos.find((s) => s.estado === 'sin_datos')?.estado ?? malos[0].estado, texto: `${malos.length} con problema` }
    : { estado: 'en_linea', texto: `${planta.sensores.length} en línea` };

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3', className)}>
      <Respuesta pregunta="¿Hay que purgar?" {...purgar} />
      <Respuesta pregunta="¿Bombas?" {...bombas} />
      <Respuesta pregunta="¿Sensores?" {...sensores} />
    </div>
  );
}
