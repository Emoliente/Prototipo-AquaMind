import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BombaEstado, EstadoPlanta, NaveEstado } from '@/data/DataSource';
import type { NaveId } from '@/types/dominio';
import { estadoPorNivel } from '@/lib/estado';
import { formatoNumero } from '@/lib/format';
import { EstadoChip } from '@/components/ui/EstadoChip';
import type { Colores3D } from './coloresTema';

/*
 * Medidas en metros, a escala aproximada: naves de 40 × 6.5 m y 4.5 m de alto.
 * Eje x = sentido del agua; z = de una nave a otra.
 */
export const LARGO = 40;
const ANCHO = 6.5;
const MURO = 0.4;
const ALTO = 4.5;
const AGUA_Y = 4.0;
const PASO_Z = ANCHO + MURO;
const ANCHO_TOTAL = 3 * ANCHO + 4 * MURO;
const zNave = (i: number) => (i - 1) * PASO_Z;
const Q = { x0: 49, x1: 63, z0: -8, z1: 8, alto: 2.6 };
/** Bombas en fila a lo largo de la quebrada (así sus rótulos no se tapan). */
const BOMBAS_X = [52.5, 56, 59.5];

interface Props {
  planta: EstadoPlanta;
  colores: Colores3D;
  destacada: NaveId | null;
  movimiento: boolean;
  alSeleccionarNave?: (id: NaveId) => void;
}

function Caja({ pos, tam, color, rugoso = 0.9, ...resto }: { pos: [number, number, number]; tam: [number, number, number]; color: string; rugoso?: number } & Record<string, unknown>) {
  return (
    <mesh position={pos} {...resto}>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={color} roughness={rugoso} metalness={0} />
    </mesh>
  );
}

export function Escena({ planta, colores, destacada, movimiento, alSeleccionarNave }: Props) {
  return (
    <group>
      <fog attach="fog" args={[colores.fondo, 110, 260]} />
      <hemisphereLight args={['#dbe8ff', '#1a2233', 0.95]} />
      <directionalLight position={[30, 55, 25]} intensity={1.5} />
      <directionalLight position={[-30, 20, -20]} intensity={0.35} />

      {/* terreno */}
      <mesh rotation-x={-Math.PI / 2} position={[24, -0.01, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={colores.suelo} roughness={1} />
      </mesh>

      <Estructura colores={colores} />
      <Entrada colores={colores} movimiento={movimiento} />
      {planta.naves.map((n, i) => (
        <Nave3D
          key={n.id}
          nave={n}
          indice={i}
          z={zNave(i)}
          colores={colores}
          destacada={destacada === n.id}
          purgando={planta.purgas.some((p) => p.naveId === n.id)}
          movimiento={movimiento}
          alSeleccionar={alSeleccionarNave}
        />
      ))}
      <Quebrada3D planta={planta} colores={colores} movimiento={movimiento} />
    </group>
  );
}

function Estructura({ colores }: { colores: Colores3D }) {
  return (
    <group>
      {/* losa de fondo */}
      <Caja pos={[LARGO / 2, -0.15, 0]} tam={[LARGO, 0.3, ANCHO_TOTAL]} color={colores.concretoOscuro} />
      {/* muros longitudinales (4: dos exteriores y dos entre naves) */}
      {[-1.5, -0.5, 0.5, 1.5].map((k) => (
        <Caja key={k} pos={[LARGO / 2, ALTO / 2, k * PASO_Z]} tam={[LARGO, ALTO, MURO]} color={colores.concreto} />
      ))}
      {/* vertedero de salida: el agua limpia pasa por encima */}
      <Caja pos={[LARGO + MURO / 2, (ALTO - 0.6) / 2, 0]} tam={[MURO, ALTO - 0.6, ANCHO_TOTAL]} color={colores.concreto} />
      {/* canal colector de agua limpia, elevado sobre las tuberías de purga */}
      <Caja pos={[LARGO + MURO + 1.3, 1.6, 0]} tam={[2.6, 0.3, ANCHO_TOTAL]} color={colores.concretoOscuro} />
      <Caja pos={[LARGO + MURO + 2.6 + 0.2, 2.4, 0]} tam={[MURO, 1.9, ANCHO_TOTAL]} color={colores.concreto} />
      <mesh rotation-x={-Math.PI / 2} position={[LARGO + MURO + 1.3, 2.9, 0]}>
        <planeGeometry args={[2.6, ANCHO_TOTAL - 0.2]} />
        <meshStandardMaterial color={colores.agua} transparent opacity={0.7} roughness={0.2} />
      </mesh>
      {/* canal de salida hacia la conducción */}
      <Caja pos={[LARGO + MURO + 1.3, 1.6, -ANCHO_TOTAL / 2 - 7]} tam={[2.6, 0.3, 14]} color={colores.concretoOscuro} />
      <mesh rotation-x={-Math.PI / 2} position={[LARGO + MURO + 1.3, 2.6, -ANCHO_TOTAL / 2 - 7]}>
        <planeGeometry args={[2.4, 14]} />
        <meshStandardMaterial color={colores.agua} transparent opacity={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Entrada({ colores, movimiento }: { colores: Colores3D; movimiento: boolean }) {
  return (
    <group>
      {/* cámara de reparto */}
      <Caja pos={[-2, -0.15, 0]} tam={[4, 0.3, ANCHO_TOTAL]} color={colores.concretoOscuro} />
      <Caja pos={[-2, ALTO / 2, -ANCHO_TOTAL / 2 + MURO / 2]} tam={[4, ALTO, MURO]} color={colores.concreto} />
      <Caja pos={[-2, ALTO / 2, ANCHO_TOTAL / 2 - MURO / 2]} tam={[4, ALTO, MURO]} color={colores.concreto} />
      {/* muro trasero con la abertura del canal de entrada (4.4 m) */}
      {[-1, 1].map((lado) => {
        const largo = (ANCHO_TOTAL - 4.4) / 2;
        return <Caja key={lado} pos={[-4 - MURO / 2, ALTO / 2, lado * (2.2 + largo / 2)]} tam={[MURO, ALTO, largo]} color={colores.concreto} />;
      })}
      {/* canal de entrada */}
      <Caja pos={[-12, -0.15, 0]} tam={[16, 0.3, 4]} color={colores.concretoOscuro} />
      <Caja pos={[-12, ALTO / 2, -2.2]} tam={[16, ALTO, MURO]} color={colores.concreto} />
      <Caja pos={[-12, ALTO / 2, 2.2]} tam={[16, ALTO, MURO]} color={colores.concreto} />
      <AguaPlana x={-2} z={0} largo={4} ancho={ANCHO_TOTAL - 0.8} colores={colores} />
      <AguaPlana x={-12} z={0} largo={16} ancho={4} colores={colores} />
      <Flujo x0={-20} x1={-4} z={0} ancho={3.4} y={AGUA_Y + 0.03} n={18} colores={colores} movimiento={movimiento} velocidad={3} />
    </group>
  );
}

function AguaPlana({ x, z, largo, ancho, colores }: { x: number; z: number; largo: number; ancho: number; colores: Colores3D }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, AGUA_Y, z]}>
      <planeGeometry args={[largo, ancho]} />
      <meshStandardMaterial color={colores.agua} transparent opacity={0.62} roughness={0.15} metalness={0.1} depthWrite={false} />
    </mesh>
  );
}

/** Partículas que avanzan sobre el agua: muestran hacia dónde corre. */
function Flujo({
  x0,
  x1,
  z,
  ancho,
  y,
  n,
  colores,
  movimiento,
  velocidad = 2,
}: {
  x0: number;
  x1: number;
  z: number;
  ancho: number;
  y: number;
  n: number;
  colores: Colores3D;
  movimiento: boolean;
  velocidad?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const datos = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ x: x0 + ((i + Math.random() * 0.6) / n) * (x1 - x0), z: z + (Math.random() - 0.5) * ancho, v: velocidad * (0.8 + Math.random() * 0.4) })),
    [n, x0, x1, z, ancho, velocidad],
  );
  const m = useMemo(() => new THREE.Matrix4(), []);

  useFrame((_, dt) => {
    const malla = ref.current;
    if (!malla) return;
    for (let i = 0; i < datos.length; i++) {
      const p = datos[i];
      if (movimiento) {
        p.x += p.v * Math.min(dt, 0.05);
        if (p.x > x1) p.x = x0;
      }
      m.makeTranslation(p.x, y, p.z);
      malla.setMatrixAt(i, m);
    }
    malla.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <boxGeometry args={[0.9, 0.02, 0.08]} />
      <meshBasicMaterial color={colores.flujo} transparent opacity={0.55} />
    </instancedMesh>
  );
}

function AguaNave({ z, colores, movimiento, alClick }: { z: number; colores: Colores3D; movimiento: boolean; alClick?: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(LARGO, ANCHO - 0.05, 48, 6), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);

  useFrame(({ clock }) => {
    if (!movimiento) return;
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.55 - t * 1.6 + z) * 0.05 + Math.sin(y * 1.3 + t * 1.1) * 0.025);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh
      ref={ref}
      geometry={geo}
      rotation-x={-Math.PI / 2}
      position={[LARGO / 2, AGUA_Y, z]}
      onClick={(e) => {
        e.stopPropagation();
        alClick?.();
      }}
      onPointerOver={() => alClick && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <meshStandardMaterial color={colores.agua} transparent opacity={0.34} roughness={0.12} metalness={0.15} depthWrite={false} />
    </mesh>
  );
}

/** Lodo en 7 tramos, uno por mira: se ve el perfil (más alto cerca de la entrada). */
function LodoNave({ nave, z, colores, movimiento }: { nave: NaveEstado; z: number; colores: Colores3D; movimiento: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const tramo = LARGO / nave.miras.length;
  useFrame((_, dt) => {
    nave.miras.forEach((cm, i) => {
      const m = refs.current[i];
      if (!m) return;
      const objetivo = Math.max(0.05, Math.min(ALTO - 0.2, cm / 100));
      const actual = m.scale.y;
      const nuevo = movimiento ? THREE.MathUtils.damp(actual, objetivo, 3, dt) : objetivo;
      m.scale.y = nuevo;
      m.position.y = nuevo / 2;
    });
  });
  return (
    <group>
      {nave.miras.map((cm, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={[tramo * (i + 0.5), cm / 200, z]}
          scale={[1, Math.max(0.05, cm / 100), 1]}
        >
          <boxGeometry args={[tramo - 0.04, 1, ANCHO - 0.1]} />
          <meshStandardMaterial color={colores.lodo} roughness={1} emissive={colores.lodo} emissiveIntensity={i % 2 ? 0.08 : 0.16} />
        </mesh>
      ))}
    </group>
  );
}

function Compuerta3D({ apertura, z, colores }: { apertura: number; z: number; colores: Colores3D }) {
  const ref = useRef<THREE.Mesh>(null);
  const abierta = apertura > 0;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const objetivo = 0.8 + (apertura / 100) * 1.2;
    m.position.y = THREE.MathUtils.damp(m.position.y, objetivo, 6, dt);
  });
  return (
    <group>
      <mesh ref={ref} position={[LARGO + MURO + 0.25, 0.8, z]}>
        <boxGeometry args={[0.3, 1.6, 1.8]} />
        <meshStandardMaterial
          color={abierta ? colores.acento : colores.concretoOscuro}
          emissive={abierta ? colores.acento : '#000000'}
          emissiveIntensity={abierta ? 0.35 : 0}
          roughness={0.5}
        />
      </mesh>
      {/* tubería de purga hacia la quebrada (pasa bajo el colector) */}
      <mesh rotation-z={Math.PI / 2} position={[(LARGO + Q.x0) / 2 + 0.4, 0.45, z * 0.95]}>
        <cylinderGeometry args={[0.35, 0.35, Q.x0 - LARGO - 0.8, 16]} />
        <meshStandardMaterial color={abierta ? colores.lodoSuperficie : colores.concretoOscuro} emissive={abierta ? colores.lodo : '#000000'} emissiveIntensity={abierta ? 0.35 : 0} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Nave3D({
  nave,
  indice,
  z,
  colores,
  destacada,
  purgando,
  movimiento,
  alSeleccionar,
}: {
  nave: NaveEstado;
  /** Posición de la nave (0–2): las etiquetas se escalonan para no taparse. */
  indice: number;
  z: number;
  colores: Colores3D;
  destacada: boolean;
  purgando: boolean;
  movimiento: boolean;
  alSeleccionar?: (id: NaveId) => void;
}) {
  const pct = (nave.nivelCm / nave.nivelCriticoCm) * 100;
  const estado = estadoPorNivel(pct);
  const yCrit = nave.nivelCriticoCm / 100;
  const sinDatos = nave.sensor === 'sin_datos';

  return (
    <group>
      <LodoNave nave={nave} z={z} colores={colores} movimiento={movimiento} />
      <AguaNave z={z} colores={colores} movimiento={movimiento} alClick={alSeleccionar ? () => alSeleccionar(nave.id) : undefined} />
      <Flujo x0={0.5} x1={LARGO - 0.5} z={z} ancho={ANCHO - 1} y={AGUA_Y + 0.04} n={22} colores={colores} movimiento={movimiento} velocidad={1.6} />

      {/* nivel crítico marcado en ambos muros */}
      {[-1, 1].map((lado) => (
        <mesh key={lado} position={[LARGO / 2, yCrit, z + lado * (ANCHO / 2 - 0.02)]}>
          <boxGeometry args={[LARGO, 0.07, 0.05]} />
          <meshBasicMaterial color={colores.critico} />
        </mesh>
      ))}

      {/* miras: postes en el muro con la altura en metros */}
      {nave.miras.map((_, i) => (
        <mesh key={i} position={[(LARGO / nave.miras.length) * (i + 0.5), ALTO / 2 + 0.2, z - ANCHO / 2 + 0.12]}>
          <boxGeometry args={[0.08, ALTO + 0.4, 0.08]} />
          <meshStandardMaterial color={colores.apagado} roughness={0.6} />
        </mesh>
      ))}

      {/* borde resaltado: nave recomendada */}
      {destacada &&
        [-1, 1].map((lado) => (
          <mesh key={lado} position={[LARGO / 2, ALTO + 0.06, z + lado * (ANCHO / 2 + MURO / 2)]}>
            <boxGeometry args={[LARGO, 0.12, MURO + 0.06]} />
            <meshBasicMaterial color={colores.acento} />
          </mesh>
        ))}

      <Compuerta3D apertura={nave.compuerta.aperturaCm} z={z} colores={colores} />

      <Html position={[6 + indice * 13, ALTO + 1.8, z]} center distanceFactor={44} zIndexRange={[20, 0]}>
        <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap rounded-btn border border-line-strong bg-surface-1/95 px-3 py-2 shadow-2">
          <span className="text-label font-semibold text-fg">
            {nave.nombre} · <span className="num">{formatoNumero(nave.nivelCm)}</span> cm{' '}
            <span className="font-normal text-fg-muted">({formatoNumero(pct)} %)</span>
          </span>
          {sinDatos ? (
            <EstadoChip estado="sin_datos" tamano="sm" />
          ) : purgando ? (
            <EstadoChip estado="info" texto={`Purgando · ${nave.compuerta.aperturaCm} cm`} tamano="sm" />
          ) : (
            <EstadoChip estado={estado} tamano="sm" />
          )}
        </div>
      </Html>
    </group>
  );
}

function Quebrada3D({ planta, colores, movimiento }: { planta: EstadoPlanta; colores: Colores3D; movimiento: boolean }) {
  const lodo = useRef<THREE.Mesh>(null);
  const ancho = Q.x1 - Q.x0;
  const fondo = Q.z1 - Q.z0;
  const objetivo = Math.max(0.05, (planta.quebradaM3 / planta.quebradaCapacidadM3) * (Q.alto - 0.3));

  useFrame((_, dt) => {
    const m = lodo.current;
    if (!m) return;
    const h = movimiento ? THREE.MathUtils.damp(m.scale.y, objetivo, 2, dt) : objetivo;
    m.scale.y = h;
    m.position.y = 0.15 + h / 2;
  });

  return (
    <group>
      <Caja pos={[(Q.x0 + Q.x1) / 2, 0.075, 0]} tam={[ancho, 0.15, fondo]} color={colores.concretoOscuro} />
      <Caja pos={[Q.x0, Q.alto / 2, 0]} tam={[MURO, Q.alto, fondo]} color={colores.concreto} />
      <Caja pos={[Q.x1, Q.alto / 2, 0]} tam={[MURO, Q.alto, fondo]} color={colores.concreto} />
      <Caja pos={[(Q.x0 + Q.x1) / 2, Q.alto / 2, Q.z0]} tam={[ancho, Q.alto, MURO]} color={colores.concreto} />
      <Caja pos={[(Q.x0 + Q.x1) / 2, Q.alto / 2, Q.z1]} tam={[ancho, Q.alto, MURO]} color={colores.concreto} />
      <mesh ref={lodo} position={[(Q.x0 + Q.x1) / 2, 0.15 + objetivo / 2, 0]} scale={[1, objetivo, 1]}>
        <boxGeometry args={[ancho - 0.5, 1, fondo - 0.5]} />
        <meshStandardMaterial color={colores.lodo} roughness={1} />
      </mesh>
      {planta.bombas.map((b, i) => (
        <Bomba3D key={b.id} bomba={b} x={BOMBAS_X[i]} z={1.5} colores={colores} movimiento={movimiento} />
      ))}
      <Html position={[Q.x0 + 4, Q.alto + 4.2, Q.z0 + 1]} center distanceFactor={44} zIndexRange={[20, 0]}>
        <div className="pointer-events-none flex select-none flex-col gap-1.5 whitespace-nowrap rounded-btn border border-line-strong bg-surface-1/95 px-3 py-2 text-label shadow-2">
          <span>
            <span className="font-semibold text-fg">Quebrada</span>{' '}
            <span className="text-fg-muted">
              · <span className="num text-fg">{formatoNumero(planta.quebradaM3)}</span> m³ de lodo
            </span>
          </span>
          {/* Estado de las bombas en un solo rótulo: tres separados se tapaban entre sí. */}
          <span className="flex gap-1.5">
            {planta.bombas.map((b) => (
              <span key={b.id} className="flex items-center gap-1">
                <span className="font-semibold text-fg">B{b.id.slice(1)}</span>
                <EstadoChip estado={b.estado} tamano="sm" texto={b.estado === 'en_marcha' ? 'Marcha' : undefined} />
              </span>
            ))}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Bomba3D({ bomba, x, z, colores, movimiento }: { bomba: BombaEstado; x: number; z: number; colores: Colores3D; movimiento: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  const enMarcha = bomba.estado === 'en_marcha';
  const color = enMarcha ? colores.acento : bomba.estado === 'falla' ? colores.critico : colores.apagado;
  useFrame((_, dt) => {
    if (rotor.current && enMarcha && movimiento) rotor.current.rotation.y += dt * 6;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 3.2, 24]} />
        <meshStandardMaterial color={colores.concreto} roughness={0.45} metalness={0.25} />
      </mesh>
      <group ref={rotor} position={[0, 3.3, 0]}>
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} rotation-y={(k * Math.PI * 2) / 5} position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 0.12, 0.28]} />
            <meshStandardMaterial color={color} emissive={enMarcha ? color : '#000000'} emissiveIntensity={enMarcha ? 0.4 : 0} />
          </mesh>
        ))}
      </group>
      {/* descarga */}
      <mesh rotation-x={Math.PI / 2} position={[0, 3.0, -4.6]}>
        <cylinderGeometry args={[0.22, 0.22, 9.2, 12]} />
        <meshStandardMaterial color={enMarcha ? colores.lodoSuperficie : colores.concretoOscuro} emissive={enMarcha ? colores.lodo : '#000000'} emissiveIntensity={enMarcha ? 0.3 : 0} />
      </mesh>
    </group>
  );
}
