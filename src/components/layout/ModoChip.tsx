import { Bot, Hand, UserCheck, type LucideIcon } from 'lucide-react';
import type { ModoOperacion } from '@/types/dominio';
import { cn } from '@/lib/cn';

export const MODOS: Record<ModoOperacion, { icono: LucideIcon; texto: string; descripcion: string }> = {
  manual: {
    icono: Hand,
    texto: 'Manual',
    descripcion: 'El técnico opera compuertas y bombas directamente',
  },
  asistido: {
    icono: UserCheck,
    texto: 'Asistido',
    descripcion: 'El sistema recomienda y el técnico confirma',
  },
  automatico: {
    icono: Bot,
    texto: 'Automático',
    descripcion: 'El sistema purga solo dentro de los límites fijados por jefatura',
  },
};

/** Modo de operación siempre visible: ícono + texto. */
export function ModoChip({ modo, className }: { modo: ModoOperacion; className?: string }) {
  const { icono: Icono, texto } = MODOS[modo];
  return (
    <span
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-label font-semibold',
        modo === 'automatico'
          ? 'border-accent-ring bg-accent-soft text-accent'
          : 'border-line-strong bg-surface-2 text-fg',
        className,
      )}
    >
      <Icono className="size-4" strokeWidth={2} aria-hidden />
      <span>
        <span className="font-normal text-fg-muted">Modo </span>
        {texto}
      </span>
    </span>
  );
}
