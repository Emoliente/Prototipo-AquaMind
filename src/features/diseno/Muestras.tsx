import { useEffect, useState, type ReactNode } from 'react';
import { useOperacion } from '@/store/useOperacion';
import { cn } from '@/lib/cn';

/** Lee el valor real de un token CSS (cambia con el tema). */
function useToken(nombre: string) {
  const tema = useOperacion((s) => s.tema);
  const [valor, setValor] = useState('');
  useEffect(() => {
    setValor(getComputedStyle(document.documentElement).getPropertyValue(nombre).trim());
  }, [nombre, tema]);
  return valor;
}

function luminancia(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((x) => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string) {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

interface MuestraProps {
  token: string;
  nombre: string;
  uso?: string;
  /** Mide contraste de este color sobre la superficie 1. */
  medirContraste?: boolean;
  icono?: ReactNode;
}

export function Muestra({ token, nombre, uso, medirContraste, icono }: MuestraProps) {
  const valor = useToken(token);
  const superficie = useToken('--surface-1');
  const ratio = medirContraste && valor.startsWith('#') ? contraste(valor, superficie) : null;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface-1">
      <div className="relative h-16 border-b border-line" style={{ background: `var(${token})` }}>
        {icono && (
          <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-surface-1/90 [&>svg]:size-4" style={{ color: `var(${token})` }}>
            {icono}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-label font-semibold text-fg">{nombre}</span>
        <span className="num truncate text-[0.75rem] text-fg-muted">{token}</span>
        <span className="num truncate text-[0.75rem] text-fg-subtle">{valor || '…'}</span>
        {ratio !== null && (
          <span
            className={cn(
              'num mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold',
              ratio >= 4.5 ? 'bg-ok-soft text-ok' : ratio >= 3 ? 'bg-warn-soft text-warn' : 'bg-crit-soft text-crit',
            )}
          >
            {ratio.toFixed(1)}:1 {ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA grande' : 'bajo'}
          </span>
        )}
        {uso && <span className="mt-1 text-[0.75rem] leading-snug text-fg-muted">{uso}</span>}
      </div>
    </div>
  );
}

export function Seccion({
  id,
  titulo,
  descripcion,
  children,
}: {
  id: string;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-6 flex flex-col gap-1">
        <h2 className="text-heading font-semibold tracking-tight text-fg">{titulo}</h2>
        {descripcion && <p className="max-w-3xl text-body text-fg-muted">{descripcion}</p>}
      </header>
      {children}
    </section>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-label font-semibold uppercase tracking-wider text-fg-subtle">{children}</h3>;
}
