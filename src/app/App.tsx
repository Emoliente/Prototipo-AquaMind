import { Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Shell } from '@/components/layout/Shell';
import { useOperacion } from '@/store/useOperacion';
import { MODULOS, puedeVer, type RutaModulo } from './permisos';
import { cargaDiferida, precargarEnReposo } from '@/lib/cargaDiferida';

const PaginaDiseno = cargaDiferida(() => import('@/features/diseno/PaginaDiseno'));
const PaginaPanel = cargaDiferida(() => import('@/features/panel/PaginaPanel'));
const PaginaPurgas = cargaDiferida(() => import('@/features/purgas/PaginaPurgas'));
const PaginaBombeo = cargaDiferida(() => import('@/features/bombeo/PaginaBombeo'));
const PaginaAlertas = cargaDiferida(() => import('@/features/alertas/PaginaAlertas'));
const PaginaPronostico = cargaDiferida(() => import('@/features/pronostico/PaginaPronostico'));
const PaginaBitacora = cargaDiferida(() => import('@/features/bitacora/PaginaBitacora'));
const PaginaInformes = cargaDiferida(() => import('@/features/informes/PaginaInformes'));
const PaginaCalibracion = cargaDiferida(() => import('@/features/calibracion/PaginaCalibracion'));
const PaginaConfiguracion = cargaDiferida(() => import('@/features/configuracion/PaginaConfiguracion'));
const PaginaProximamente = cargaDiferida(() => import('@/features/proximamente/PaginaProximamente'));

const PAGINAS: Partial<Record<RutaModulo, ReactNode>> = {
  panel: <PaginaPanel />,
  purgas: <PaginaPurgas />,
  bombeo: <PaginaBombeo />,
  alertas: <PaginaAlertas />,
  pronostico: <PaginaPronostico />,
  bitacora: <PaginaBitacora />,
  informes: <PaginaInformes />,
  calibracion: <PaginaCalibracion />,
  configuracion: <PaginaConfiguracion />,
};

/** Si el perfil no puede ver el módulo, vuelve al panel. */
function Protegida({ ruta, children }: { ruta: RutaModulo; children: ReactNode }) {
  const perfil = useOperacion((s) => s.perfil);
  return puedeVer(perfil, ruta) ? <>{children}</> : <Navigate to="/panel" replace />;
}

export function App() {
  // Las pantallas del menú se traen en segundo plano (la de diseño no: es solo para el equipo).
  useEffect(() => {
    precargarEnReposo([PaginaPanel, PaginaPurgas, PaginaBombeo, PaginaAlertas, PaginaPronostico, PaginaBitacora, PaginaInformes, PaginaCalibracion, PaginaConfiguracion]);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/diseno" element={<PaginaDiseno />} />
            <Route element={<Shell />}>
              {MODULOS.map((m) => (
                <Route
                  key={m.ruta}
                  path={`/${m.ruta}`}
                  element={<Protegida ruta={m.ruta}>{PAGINAS[m.ruta] ?? <PaginaProximamente />}</Protegida>}
                />
              ))}
              <Route path="*" element={<Navigate to="/panel" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </MotionConfig>
  );
}
