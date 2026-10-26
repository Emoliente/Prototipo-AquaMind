import { useMemo } from 'react';
import { useOperacion } from '@/store/useOperacion';

export interface Colores3D {
  fondo: string;
  suelo: string;
  concreto: string;
  concretoOscuro: string;
  agua: string;
  aguaProfunda: string;
  flujo: string;
  lodo: string;
  lodoSuperficie: string;
  critico: string;
  acento: string;
  apagado: string;
}

const leer = (v: string, porDefecto: string) => {
  const x = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return x.startsWith('#') ? x : porDefecto;
};

/** Los materiales 3D usan los mismos tokens de color que el resto de la interfaz. */
export function useColores3D(): Colores3D {
  const tema = useOperacion((s) => s.tema);
  return useMemo(
    () => ({
      fondo: leer('--base', '#070d18'),
      suelo: leer('--surface-2', '#121c2e'),
      concreto: tema === 'dark' ? '#5b6b82' : '#c3ccd8',
      concretoOscuro: tema === 'dark' ? '#3a4a62' : '#9aa7b8',
      agua: leer('--water', '#156d96'),
      aguaProfunda: leer('--water-deep', '#0a3754'),
      flujo: tema === 'dark' ? '#bfeaff' : '#ffffff',
      lodo: leer('--sludge', '#b8904f'),
      lodoSuperficie: leer('--sludge-top', '#d6b27a'),
      critico: leer('--crit', '#ff6b6b'),
      acento: leer('--accent', '#3cc4f0'),
      apagado: leer('--fg-subtle', '#7488a3'),
    }),
    // El tema cambia los valores de las variables CSS.
    [tema],
  );
}
