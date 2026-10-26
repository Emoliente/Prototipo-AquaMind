import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Box, Map, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { hayWebGL } from '@/lib/webgl';
import { FUNCIONES } from '@/config/funciones';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Segmentado } from '@/components/ui/Segmentado';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { EsquemaDesarenador2D } from '@/components/planta/EsquemaDesarenador2D';
import { EsquemaCompacto } from '@/components/planta/EsquemaCompacto';
import { Boton } from '@/components/ui/Boton';
import { useAncho } from '@/lib/useAncho';

// three.js y React Three Fiber solo se descargan al pedir la vista 3D.
const Vista3D = lazy(() => import('@/features/vista3d/Vista3D'));

type Vista = '2d' | '3d';

function leerVista(): Vista {
  if (!FUNCIONES.vista3d) return '2d';
  try {
    return localStorage.getItem('aquamind.vista') === '3d' && hayWebGL() ? '3d' : '2d';
  } catch {
    return '2d';
  }
}

/** Si la vista 3D falla (carga o dibujo), se vuelve al 2D sin romper el panel. */
class Respaldo2D extends Component<{ alFallar: (m: string) => void; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: Error) {
    this.props.alFallar(e.message || 'Error al dibujar en 3D.');
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

/** Ancho desde el que el esquema completo se lee bien (sus textos no quedan diminutos). */
const ANCHO_ESQUEMA_COMPLETO = 940;

/**
 * Si el dibujo del esquema falla, se avisa dentro de la tarjeta y se puede reintentar;
 * el resto del Panel (tarjetas de naves y bombas) sigue funcionando.
 */
class LimiteEsquema extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: Error) {
    console.error('[esquema] no se pudo dibujar', e);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 px-5 py-8 sm:px-6">
        <p className="flex items-center gap-2 text-body font-semibold text-fg">
          <TriangleAlert className="size-5 text-warn" aria-hidden /> No se pudo dibujar el esquema
        </p>
        <p className="text-label text-fg-muted">Los datos de cada nave y bomba siguen al día en las tarjetas de abajo.</p>
        <Boton icono={<RotateCcw />} onClick={() => this.setState({ error: false })}>
          Reintentar
        </Boton>
      </div>
    );
  }
}

interface Props {
  planta: EstadoPlanta;
  destacada: NaveId | null;
  alSeleccionarNave: (id: NaveId) => void;
  className?: string;
}

/** Tarjeta del esquema en vivo: plano 2D, o vista 3D si está encendida en FUNCIONES. */
export function EsquemaVivo({ planta, destacada, alSeleccionarNave, className }: Props) {
  const [vista, setVista] = useState<Vista>(leerVista);
  const [contenedor, ancho] = useAncho<HTMLDivElement>();
  const [aviso, setAviso] = useState<string | null>(null);

  const cambiar = (v: Vista) => {
    if (v === '3d' && !hayWebGL()) {
      setAviso('Este navegador no permite gráficos 3D (WebGL). Seguimos en el plano 2D.');
      return;
    }
    setAviso(null);
    setVista(v);
    try {
      localStorage.setItem('aquamind.vista', v);
    } catch {
      /* sin persistencia */
    }
  };

  const fallar = (motivo: string) => {
    setVista('2d');
    setAviso(`No se pudo mostrar la vista 3D (${motivo}). Volvimos al plano 2D.`);
  };

  return (
    <Tarjeta relleno="none" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {vista === '3d' ? <Box className="size-5 text-fg-subtle" aria-hidden /> : <Map className="size-5 text-fg-subtle" aria-hidden />}
          <h3 className="text-title font-semibold text-fg">Esquema en vivo</h3>
        </div>
        {FUNCIONES.vista3d && (
          <Segmentado
            etiqueta="Vista del esquema"
            valor={vista}
            alCambiar={cambiar}
            opciones={[
              { valor: '2d', texto: 'Plano 2D', icono: <Map /> },
              { valor: '3d', texto: 'Vista 3D', icono: <Box /> },
            ]}
          />
        )}
      </div>

      {aviso && (
        <div role="status" className="mx-5 mt-3 flex items-start gap-2 rounded-btn bg-warn-soft p-3 text-label text-fg sm:mx-6">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <span className="flex-1">{aviso}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)} className="-m-1 grid size-8 place-items-center rounded-btn text-fg-muted hover:bg-surface-3">
            <X className="size-4" />
          </button>
        </div>
      )}

      {vista === '3d' ? (
        <div className="p-3 sm:p-4">
          <Respaldo2D alFallar={fallar}>
            <Suspense
              fallback={
                <div aria-busy className="relative h-[360px] sm:h-[520px]">
                  <Esqueleto className="h-full w-full rounded-card" />
                  <p className="absolute inset-0 grid place-items-center text-label text-fg-muted">Cargando la vista 3D…</p>
                </div>
              }
            >
              <Vista3D planta={planta} naveDestacada={destacada} alSeleccionarNave={alSeleccionarNave} alFallar={fallar} />
            </Suspense>
          </Respaldo2D>
        </div>
      ) : (
        // Según el espacio de la tarjeta: el esquema completo, o el compacto de arriba abajo.
        <div ref={contenedor} className="flex flex-1 flex-col justify-center">
          <LimiteEsquema>
            {ancho >= ANCHO_ESQUEMA_COMPLETO ? (
              <div className="px-3 py-4 sm:px-5">
                <EsquemaDesarenador2D planta={planta} naveDestacada={destacada} alSeleccionarNave={alSeleccionarNave} />
              </div>
            ) : ancho > 0 ? (
              <EsquemaCompacto planta={planta} naveDestacada={destacada} alSeleccionarNave={alSeleccionarNave} />
            ) : null}
          </LimiteEsquema>
        </div>
      )}
    </Tarjeta>
  );
}
