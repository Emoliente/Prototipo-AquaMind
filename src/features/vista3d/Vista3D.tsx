import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { Move3d, RotateCcw } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { Escena, LARGO } from './Escena';
import { useColores3D } from './coloresTema';

interface Props {
  planta: EstadoPlanta;
  naveDestacada: NaveId | null;
  alSeleccionarNave?: (id: NaveId) => void;
  /** Si WebGL se cae a mitad de camino, se vuelve al plano 2D. */
  alFallar: (motivo: string) => void;
}

/** Mide los cuadros por segundo reales (se lee en window.__fps3d al revisar el rendimiento). */
function MedidorFps() {
  const cuadros = useRef(0);
  const desde = useRef(performance.now());
  useFrame(() => {
    cuadros.current++;
    const ahora = performance.now();
    if (ahora - desde.current >= 1000) {
      (window as unknown as { __fps3d: number }).__fps3d = Math.round((cuadros.current * 1000) / (ahora - desde.current));
      cuadros.current = 0;
      desde.current = ahora;
    }
  });
  return null;
}

/** Si el equipo no sostiene los cuadros por segundo, se baja la resolución antes que la fluidez. */
function AjusteRendimiento() {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
    />
  );
}

// Vista de costado y en alto: se lee de izquierda a derecha como el plano 2D.
// Centro de la escena: de la entrada (x ≈ −20) a la quebrada (x ≈ 63).
/**
 * En pantallas angostas (celular, vertical) la cámara se aleja para que entre
 * toda la planta. Se recalcula solo cuando cambia la proporción del lienzo.
 */
function AjusteCamara() {
  const { camera, size, controls, invalidate } = useThree();
  const ultima = useRef(0);
  useEffect(() => {
    const aspecto = size.width / Math.max(1, size.height);
    if (Math.abs(aspecto - ultima.current) < 0.05) return;
    ultima.current = aspecto;
    const factor = Math.max(1, 1.9 / aspecto);
    const dir = new Vector3(...CAMARA).sub(new Vector3(...OBJETIVO));
    camera.position.copy(new Vector3(...OBJETIVO).add(dir.multiplyScalar(factor)));
    camera.lookAt(...OBJETIVO);
    (controls as unknown as OrbitControlsImpl | null)?.saveState();
    invalidate();
  }, [size.width, size.height, camera, controls, invalidate]);
  return null;
}

const CAMARA: [number, number, number] = [LARGO / 2 + 5, 40, 56];
const OBJETIVO: [number, number, number] = [LARGO / 2 + 5, 0, -2];

/** Vista 3D del desarenador (se carga solo cuando se pide). */
export default function Vista3D({ planta, naveDestacada, alSeleccionarNave, alFallar }: Props) {
  const colores = useColores3D();
  const reducir = useReducedMotion() ?? false;
  const controles = useRef<OrbitControlsImpl>(null);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-card bg-base/40 sm:h-[520px]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: CAMARA, fov: 38, near: 0.5, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        frameloop={reducir ? 'demand' : 'always'}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            alFallar('Se perdió la conexión con la tarjeta gráfica.');
          });
        }}
        aria-label="Vista 3D del desarenador: entrada, tres naves con su lodo, compuertas, quebrada y bombas"
        role="img"
      >
        <AjusteRendimiento />
        <AjusteCamara />
        <Escena planta={planta} colores={colores} destacada={naveDestacada} movimiento={!reducir} alSeleccionarNave={alSeleccionarNave} />
        <OrbitControls
          ref={controles}
          target={OBJETIVO}
          enablePan={false}
          minDistance={24}
          maxDistance={180}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping={!reducir}
          makeDefault
        />
        {import.meta.env.DEV && <MedidorFps />}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
        <ul className="pointer-events-auto flex flex-wrap gap-x-4 gap-y-1 rounded-btn bg-surface-1/90 px-3 py-2 text-[0.75rem] text-fg-muted shadow-1">
          <li className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm bg-water" aria-hidden /> Agua</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sludge" aria-hidden /> Lodo (un tramo por mira)</li>
          <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-crit" aria-hidden /> Nivel crítico</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-2 rounded-[2px] bg-accent" aria-hidden /> Compuerta abierta</li>
        </ul>
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-btn bg-surface-1/90 px-3 py-2 text-[0.75rem] text-fg-muted shadow-1 sm:flex">
            <Move3d className="size-4" aria-hidden /> Arrastra para girar · rueda para acercar
          </span>
          <button
            type="button"
            onClick={() => controles.current?.reset()}
            className="flex h-12 items-center gap-2 rounded-btn border border-line-strong bg-surface-1/95 px-3 text-label font-semibold text-fg shadow-1 hover:bg-surface-3"
          >
            <RotateCcw className="size-4" aria-hidden /> Vista inicial
          </button>
        </div>
      </div>
    </div>
  );
}
