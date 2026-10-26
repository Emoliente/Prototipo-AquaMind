import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowDownToLine,
  BellPlus,
  CircleCheck,
  DoorClosed,
  Droplets,
  Gauge,
  Info,
  Moon,
  OctagonAlert,
  Play,
  RotateCcw,
  Sun,
  TriangleAlert,
  Waves,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import type { Alerta, Bomba, EstadoBomba, ModoOperacion } from '@/types/dominio';
import { useOperacion } from '@/store/useOperacion';
import { formatoNumero } from '@/lib/format';
import { Tarjeta, EncabezadoTarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';
import { Valor } from '@/components/ui/Valor';
import { EstadoChip, type TipoEstado } from '@/components/ui/EstadoChip';
import { TarjetaIndicador, TarjetaIndicadorEsqueleto } from '@/components/ui/TarjetaIndicador';
import { BotonMantener } from '@/components/ui/BotonMantener';
import { Segmentado } from '@/components/ui/Segmentado';
import { AlertaItem } from '@/components/alertas/AlertaItem';
import { BotonEmergencia } from '@/components/layout/BotonEmergencia';
import { ModoChip } from '@/components/layout/ModoChip';
import { Logo } from '@/components/layout/Logo';
import { TarjetaNave } from '@/components/planta/TarjetaNave';
import { NaveTanque } from '@/components/planta/NaveTanque';
import { MedidorUrgencia } from '@/components/planta/MedidorUrgencia';
import { CompuertaControl } from '@/components/planta/CompuertaControl';
import { TarjetaBomba } from '@/components/planta/Bomba';
import { Muestra, Seccion, Subtitulo } from './Muestras';

const INDICE = [
  ['colores', 'Colores'],
  ['tipografia', 'Tipografía'],
  ['espaciado', 'Espaciado y forma'],
  ['estados', 'Estados y modos'],
  ['botones', 'Botones'],
  ['indicadores', 'Indicadores'],
  ['naves', 'Nave tipo tanque'],
  ['urgencia', 'Medidor de urgencia'],
  ['compuerta', 'Compuerta'],
  ['confirmar', 'Mantener para confirmar'],
  ['alertas', 'Alertas'],
  ['bombas', 'Bombas'],
] as const;

/** Serie con caminata aleatoria suave para las demos. */
function serie(base: number, variacion: number, n = 24, semilla = 1) {
  let v = base;
  let s = semilla;
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280;
    v += ((s / 233280) - 0.5) * variacion;
    return v;
  });
}

const BOMBAS_INICIALES: Bomba[] = [
  { id: 'B1', modelo: 'Toyo DPF-75B', hp: 75, capacidadM3h: 416, potenciaKw: 75, kwhPorM3: 0.18, estado: 'apagada', corrienteA: 0, potenciaActualKw: 0, minutosMarchaHoy: 0 },
  { id: 'B2', modelo: 'Goodwin 100ANZE', hp: 40, capacidadM3h: 220, potenciaKw: 30, kwhPorM3: 0.14, estado: 'en_marcha', corrienteA: 52.4, potenciaActualKw: 29.6, minutosMarchaHoy: 136 },
  { id: 'B3', modelo: 'Toyo DPF-30', hp: 30, capacidadM3h: 125, potenciaKw: 30, kwhPorM3: 0.24, estado: 'falla', corrienteA: 0, potenciaActualKw: 0, minutosMarchaHoy: 18 },
];

const ahora = Date.now();
const ALERTAS_INICIALES: Alerta[] = [
  {
    id: 'a1',
    t: ahora - 4 * 60_000,
    severidad: 'critica',
    naveId: 'N2',
    titulo: 'La Nave 2 llegará al nivel crítico en 58 min',
    detalle: 'Lodo al 88 % del crítico, subiendo 3.1 cm/h con sólidos en 4.2 g/L.',
    accionSugerida: 'Purgar Nave 2 con compuerta a 20 cm por 15 min.',
    reconocida: false,
  },
  {
    id: 'a2',
    t: ahora - 22 * 60_000,
    severidad: 'advertencia',
    titulo: 'Sensor de sólidos de salida sin datos desde hace 6 min',
    accionSugerida: 'Revisar la sonda; usar la última lectura de laboratorio.',
    reconocida: false,
  },
  {
    id: 'a3',
    t: ahora - 64 * 60_000,
    severidad: 'info',
    titulo: 'Plan de bombeo terminado: 486 m³ evacuados',
    accionSugerida: 'Ninguna. Ahorro de 1 012 kWh frente a 8 h fijas.',
    reconocida: true,
  },
];

export default function PaginaDiseno() {
  const { tema, setTema } = useOperacion();

  // Datos vivos de demostración: cambian cada 2 s para ver los números contar.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const ruido = (amp: number, fase = 0) => Math.sin(tick * 1.3 + fase) * amp;

  const [nivelN2, setNivelN2] = useState(220);
  const [purgando, setPurgando] = useState(false);
  useEffect(() => {
    if (!purgando) return;
    const id = setInterval(() => {
      setNivelN2((n) => {
        if (n <= 40) {
          setPurgando(false);
          return 40;
        }
        return n - 15;
      });
    }, 400);
    return () => clearInterval(id);
  }, [purgando]);

  const [apertura, setApertura] = useState(20);
  const [urgencia, setUrgencia] = useState(84);
  const [modo, setModo] = useState<ModoOperacion>('asistido');
  const [confirmaciones, setConfirmaciones] = useState<string[]>([]);
  const [alertas, setAlertas] = useState(ALERTAS_INICIALES);
  const [bombas, setBombas] = useState(BOMBAS_INICIALES);
  const [emergencia, setEmergencia] = useState(false);

  const alternarBomba = (id: string) =>
    setBombas((bs) =>
      bs.map((b) => {
        if (b.id !== id) return b;
        const encender = b.estado !== 'en_marcha';
        const estado: EstadoBomba = encender ? 'en_marcha' : 'apagada';
        return {
          ...b,
          estado,
          corrienteA: encender ? b.potenciaKw * 1.75 : 0,
          potenciaActualKw: encender ? b.potenciaKw * 0.98 : 0,
        };
      }),
    );

  const simularAlerta = () => {
    const n = alertas.length + 1;
    setAlertas((a) => [
      {
        id: `a${Date.now()}`,
        t: Date.now(),
        severidad: n % 2 ? 'advertencia' : 'critica',
        naveId: 'N1',
        titulo: n % 2 ? 'La Nave 1 sube más rápido de lo normal' : 'La Nave 1 superó el 85 % del crítico',
        accionSugerida: n % 2 ? 'Programar purga en las próximas 3 h.' : 'Purgar Nave 1 a 20 cm por 12 min.',
        reconocida: false,
      },
      ...a,
    ]);
  };

  const pctN2 = (nivelN2 / 250) * 100;

  return (
    <div className="min-h-dvh bg-base">
      {/* barra superior */}
      <header className="sticky top-0 z-30 border-b border-line bg-base/95">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-fg">AquaMind</p>
              <p className="truncate text-label text-fg-muted">Sistema de diseño · Desarenador Miraflores</p>
            </div>
          </div>
          <Segmentado
            etiqueta="Tema"
            valor={tema}
            alCambiar={setTema}
            soloIconos
            opciones={[
              { valor: 'dark', texto: 'Modo oscuro', icono: <Moon /> },
              { valor: 'light', texto: 'Modo claro', icono: <Sun /> },
            ]}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* índice */}
        <nav aria-label="Secciones" className="sticky top-28 hidden h-fit w-52 shrink-0 xl:block">
          <p className="mb-3 text-label font-semibold uppercase tracking-wider text-fg-subtle">Contenido</p>
          <ul className="flex flex-col gap-0.5">
            {INDICE.map(([id, texto]) => (
              <li key={id}>
                <a
                  href={`#/diseno`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex h-10 items-center rounded-btn px-3 text-label font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-20">
          {/* Portada */}
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface-1 px-3 py-1 text-label text-fg-muted">
              <Waves className="size-4 text-accent" aria-hidden /> Sala de control moderna y tranquila
            </span>
            <h1 className="max-w-4xl text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-fg sm:text-[3rem]">
              Tokens y componentes para leer el desarenador en 3 segundos.
            </h1>
            <p className="max-w-3xl text-title font-normal text-fg-muted">
              Fondo azul pizarra en capas, el agua como único acento y los colores de estado reservados
              para decir algo. Cada número lleva su unidad; cada estado, su ícono y su texto.
            </p>
          </div>

          {/* COLORES */}
          <Seccion
            id="colores"
            titulo="Colores"
            descripcion="Todo color sale de un token. El cian se usa solo para el agua y lo que se puede tocar; los colores de estado nunca se usan para decorar."
          >
            <div className="flex flex-col gap-8">
              <div>
                <Subtitulo>Fondos y superficies</Subtitulo>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Muestra token="--base" nombre="Fondo" uso="Detrás de todo" />
                  <Muestra token="--surface-1" nombre="Superficie 1" uso="Tarjetas" />
                  <Muestra token="--surface-2" nombre="Superficie 2" uso="Paneles internos" />
                  <Muestra token="--surface-3" nombre="Superficie 3" uso="Botones, controles" />
                  <Muestra token="--line" nombre="Borde" uso="Separadores finos" />
                  <Muestra token="--line-strong" nombre="Borde fuerte" uso="Contornos de control" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <Subtitulo>Texto</Subtitulo>
                  <div className="grid grid-cols-3 gap-3">
                    <Muestra token="--fg" nombre="Principal" medirContraste />
                    <Muestra token="--fg-muted" nombre="Secundario" medirContraste />
                    <Muestra token="--fg-subtle" nombre="Tenue" uso="Solo apoyo" medirContraste />
                  </div>
                </div>
                <div>
                  <Subtitulo>Agua · acento interactivo</Subtitulo>
                  <div className="grid grid-cols-3 gap-3">
                    <Muestra token="--accent" nombre="Acento" uso="Botones, enlaces" medirContraste />
                    <Muestra token="--water" nombre="Agua" />
                    <Muestra token="--water-deep" nombre="Agua profunda" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
                <div>
                  <Subtitulo>Lodo · arena y ocre</Subtitulo>
                  <div className="grid grid-cols-3 gap-3">
                    <Muestra token="--sludge-top" nombre="Lodo superficie" />
                    <Muestra token="--sludge" nombre="Lodo" />
                    <Muestra token="--sludge-deep" nombre="Lodo compacto" />
                  </div>
                </div>
                <div>
                  <Subtitulo>Estados · reservados</Subtitulo>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Muestra token="--ok" nombre="Normal" icono={<CircleCheck />} medirContraste />
                    <Muestra token="--warn" nombre="Advertencia" icono={<TriangleAlert />} medirContraste />
                    <Muestra token="--crit" nombre="Crítico" icono={<OctagonAlert />} medirContraste />
                    <Muestra token="--info" nombre="Información" icono={<Info />} medirContraste />
                    <Muestra token="--stale" nombre="Sin datos" icono={<WifiOff />} medirContraste />
                  </div>
                </div>
              </div>
            </div>
          </Seccion>

          {/* TIPOGRAFÍA */}
          <Seccion
            id="tipografia"
            titulo="Tipografía"
            descripcion="Inter para textos y JetBrains Mono con cifras tabulares para valores: los dígitos no bailan cuando el número se actualiza."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
              <Tarjeta relleno="none" className="divide-y divide-line">
                {[
                  ['Valor principal', '48 px · Mono semibold', <Valor key="a" valor={10.4} decimales={1} unidad="m³/s" tamano="display" animar={false} />],
                  ['Valor grande', '40 px · Mono semibold', <Valor key="b" valor={1080} unidad="kWh/día" tamano="lg" animar={false} />],
                  ['Valor de tarjeta', '32 px · Mono semibold', <Valor key="c" valor={2.31} decimales={2} unidad="g/L" tamano="md" animar={false} />],
                  ['Valor secundario', '24 px · Mono semibold', <Valor key="d" valor={205} unidad="cm" tamano="sm" animar={false} />],
                  ['Título de sección', '24 px · Inter semibold', <span key="e" className="text-heading font-semibold">Bombeo de lodos</span>],
                  ['Título de tarjeta', '18 px · Inter semibold', <span key="f" className="text-title font-semibold">Nave 2</span>],
                  ['Texto', '15 px · Inter regular', <span key="g" className="text-body">Abrir la compuerta de 10 en 10 cm.</span>],
                  ['Etiqueta', '13 px · Inter, gris', <span key="h" className="text-label text-fg-muted">Caudal de entrada</span>],
                ].map(([nombre, spec, ej]) => (
                  <div key={nombre as string} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="w-44 shrink-0">
                      <p className="text-label font-semibold text-fg">{nombre}</p>
                      <p className="text-[0.75rem] text-fg-subtle">{spec}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden">{ej}</div>
                  </div>
                ))}
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-5">
                <EncabezadoTarjeta titulo="Cifras tabulares" subtitulo="Columnas alineadas, sin saltos al actualizar" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-label text-fg-muted">Mono tabular</p>
                    <div className="num flex flex-col items-end gap-1 rounded-btn bg-surface-2 p-3 text-title">
                      <span>1 080.0</span>
                      <span>212.4</span>
                      <span>11.1</span>
                      <span>{formatoNumero(486 + ruido(30), 1)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-label text-fg-muted">Proporcional (evitar)</p>
                    <div className="flex flex-col items-end gap-1 rounded-btn bg-surface-2 p-3 text-title opacity-70">
                      <span>1 080.0</span>
                      <span>212.4</span>
                      <span>11.1</span>
                      <span>{formatoNumero(486 + ruido(30), 1)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-btn border border-line bg-surface-2 p-4">
                  <p className="text-label text-fg-muted">Unidad siempre al lado</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <Valor valor={0.45} decimales={2} prefijo="S/" unidad="por kWh" tamano="sm" animar={false} />
                    <Valor valor={260} unidad="m²" tamano="sm" animar={false} />
                    <Valor valor={3.1} decimales={1} unidad="cm/h" tamano="sm" animar={false} />
                  </div>
                </div>
              </Tarjeta>
            </div>
          </Seccion>

          {/* ESPACIADO */}
          <Seccion
            id="espaciado"
            titulo="Espaciado y forma"
            descripcion="Escala de 8 px. Esquinas de 14–16 px en tarjetas y 8 px en botones. Sombras mínimas: la profundidad viene de las capas de superficie."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Tarjeta className="flex flex-col gap-3">
                <EncabezadoTarjeta titulo="Escala de 8 px" />
                {[8, 16, 24, 32, 48, 64].map((px) => (
                  <div key={px} className="flex items-center gap-4">
                    <span className="num w-12 text-label text-fg-muted">{px} px</span>
                    <span className="h-3 rounded-sm bg-accent/70" style={{ width: px * 2.5 }} />
                  </div>
                ))}
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4">
                <EncabezadoTarjeta titulo="Esquinas" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Botón', 'rounded-btn', '8 px'],
                    ['Tarjeta', 'rounded-card', '14 px'],
                    ['Panel', 'rounded-panel', '16 px'],
                  ].map(([n, c, v]) => (
                    <div key={n} className="flex flex-col items-center gap-2">
                      <div className={`size-20 border-2 border-accent/60 bg-accent-soft ${c}`} />
                      <span className="text-label font-semibold text-fg">{n}</span>
                      <span className="num text-[0.75rem] text-fg-muted">{v}</span>
                    </div>
                  ))}
                </div>
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4">
                <EncabezadoTarjeta titulo="Capas" />
                <div className="relative h-40 rounded-panel bg-base p-4">
                  <div className="h-full rounded-card border border-line bg-surface-1 p-4 shadow-1">
                    <div className="h-full rounded-btn border border-line bg-surface-2 p-3">
                      <div className="flex h-12 items-center rounded-btn border border-line-strong bg-surface-3 px-3 text-label text-fg-muted">
                        Fondo → 1 → 2 → 3
                      </div>
                    </div>
                  </div>
                </div>
              </Tarjeta>
            </div>
          </Seccion>

          {/* ESTADOS */}
          <Seccion
            id="estados"
            titulo="Estados y modos"
            descripcion="Siempre ícono + texto: se entiende aunque no se distingan los colores o la pantalla tenga reflejos."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <Tarjeta className="flex flex-col gap-5">
                <div>
                  <Subtitulo>Nivel y alertas</Subtitulo>
                  <div className="flex flex-wrap gap-2">
                    {(['normal', 'advertencia', 'critica', 'info'] as TipoEstado[]).map((e) => (
                      <EstadoChip key={e} estado={e} />
                    ))}
                  </div>
                </div>
                <div>
                  <Subtitulo>Sensores y datos</Subtitulo>
                  <div className="flex flex-wrap gap-2">
                    {(['en_linea', 'sin_datos', 'desactualizado', 'fuera_rango', 'necesita_limpieza'] as TipoEstado[]).map((e) => (
                      <EstadoChip key={e} estado={e} />
                    ))}
                  </div>
                </div>
                <div>
                  <Subtitulo>Equipos</Subtitulo>
                  <div className="flex flex-wrap gap-2">
                    {(['en_marcha', 'apagada', 'falla'] as TipoEstado[]).map((e) => (
                      <EstadoChip key={e} estado={e} />
                    ))}
                    <EstadoChip estado="normal" texto="Cerrada" tamano="md" />
                  </div>
                </div>
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4">
                <Subtitulo>Modo de operación</Subtitulo>
                <div className="flex flex-wrap gap-2">
                  <ModoChip modo="manual" />
                  <ModoChip modo="asistido" />
                  <ModoChip modo="automatico" />
                </div>
                <Segmentado
                  etiqueta="Modo de operación"
                  valor={modo}
                  alCambiar={setModo}
                  className="w-full [&>button]:flex-1"
                  opciones={[
                    { valor: 'manual', texto: 'Manual' },
                    { valor: 'asistido', texto: 'Asistido' },
                    { valor: 'automatico', texto: 'Automático' },
                  ]}
                />
                <p className="text-label text-fg-muted">El modo Automático solo lo activa jefatura.</p>
              </Tarjeta>
            </div>
          </Seccion>

          {/* BOTONES */}
          <Seccion
            id="botones"
            titulo="Botones"
            descripcion="Todos de 48 px o más. Al pasar el cursor cambian de tono; al presionar se hunden un poco."
          >
            <Tarjeta className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Boton variante="primario" icono={<ArrowDownToLine />}>Purgar Nave 2</Boton>
                <Boton variante="secundario" icono={<DoorClosed />}>Cerrar compuerta</Boton>
                <Boton variante="fantasma" icono={<X />}>Rechazar</Boton>
                <Boton variante="peligro" icono={<OctagonAlert />}>Abortar purga</Boton>
                <Boton tamano="icono" aria-label="Reiniciar" icono={<RotateCcw />} />
                <Boton variante="primario" disabled>Sin permiso</Boton>
                <Boton variante="primario" tamano="lg" icono={<Play />}>Modo demo</Boton>
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-6">
                <BotonEmergencia alActivar={() => setEmergencia(true)} />
                <BotonEmergencia alActivar={() => undefined} deshabilitado />
                <BotonEmergencia alActivar={() => setEmergencia(true)} compacto />
                <p className="text-label text-fg-muted">
                  {emergencia ? (
                    <span className="font-semibold text-crit">Parada activada: compuertas cerrando, bombas apagadas.</span>
                  ) : (
                    'Parada de emergencia: se mantiene 1 s. Gerencia la ve desactivada.'
                  )}
                </p>
              </div>
            </Tarjeta>
          </Seccion>

          {/* INDICADORES */}
          <Seccion
            id="indicadores"
            titulo="Tarjetas de indicador"
            descripcion="Etiqueta pequeña en gris, valor grande con su unidad y tendencia de las últimas horas. Si el dato está viejo, se dice y se atenúa."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TarjetaIndicador
                etiqueta="Caudal de entrada"
                icono={<Waves />}
                valor={10.4 + ruido(0.4)}
                decimales={1}
                unidad="m³/s"
                tendencia={serie(10, 0.6, 24, 3)}
                detalle="Rango de diseño 4 – 13.5 m³/s"
              />
              <TarjetaIndicador
                etiqueta="Sólidos en suspensión · entrada"
                icono={<Droplets />}
                valor={2.31 + ruido(0.2, 1)}
                decimales={2}
                unidad="g/L"
                color="sludge"
                tendencia={serie(2, 0.5, 24, 7)}
                detalle="Época de lluvias · 0.1 – 7 g/L"
              />
              <TarjetaIndicador
                etiqueta="Eficiencia del desarenador"
                icono={<Gauge />}
                valor={86 + ruido(1.5, 2)}
                unidad="%"
                color="ok"
                tendencia={serie(85, 2, 24, 11)}
                detalle={<>Salida <span className="num text-fg">0.32</span> g/L</>}
              />
              <TarjetaIndicador
                etiqueta="Energía de bombeo hoy"
                icono={<Zap />}
                valor={212 + Math.max(0, tick % 30)}
                unidad="kWh"
                tendencia={[0, 20, 40, 40, 60, 90, 120, 150, 150, 170, 190, 212]}
                detalle={<>Línea base <span className="num text-fg">1 080</span> kWh · ahorro <span className="num font-semibold text-ok">80 %</span></>}
              />
              <TarjetaIndicador
                etiqueta="Sólidos · salida"
                icono={<Droplets />}
                valor={0.31}
                decimales={2}
                unidad="g/L"
                tendencia={serie(0.3, 0.05, 18, 5)}
                calidad="desactualizado"
                minutosSinActualizar={6}
                detalle="Última lectura válida 14:32"
              />
              <TarjetaIndicador
                etiqueta="Turbidez de salida"
                icono={<Droplets />}
                valor={null}
                unidad="NTU"
                calidad="sin_datos"
                detalle="El sensor no responde"
              />
              <TarjetaIndicadorEsqueleto />
              <TarjetaIndicadorEsqueleto className="hidden xl:flex" />
            </div>
          </Seccion>

          {/* NAVES */}
          <Seccion
            id="naves"
            titulo="Nave tipo tanque"
            descripcion="Corte lateral de cada nave: el agua fluye hacia la salida, el lodo se acumula en el fondo y la línea roja marca el nivel crítico. La compuerta de purga está a la derecha."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TarjetaNave
                id="N1"
                nivelCm={112 + ruido(1)}
                nivelCriticoCm={250}
                tasaCmH={0.4}
                horasACritico={345}
                aperturaCm={0}
                estadoCompuerta="cerrada"
              />
              <TarjetaNave
                id="N2"
                nivelCm={nivelN2}
                nivelCriticoCm={250}
                tasaCmH={purgando ? -36 : 3.1}
                horasACritico={Math.max(0, (250 - nivelN2) / 3.1)}
                aperturaCm={purgando ? 20 : 0}
                estadoCompuerta={purgando ? 'abierta' : 'cerrada'}
                destacada
              />
              <TarjetaNave
                id="N3"
                nivelCm={172}
                nivelCriticoCm={250}
                tasaCmH={1.2}
                horasACritico={65}
                aperturaCm={0}
                estadoCompuerta="cerrada"
                sensor="sin_datos"
                minutosSinActualizar={9}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Boton variante="primario" icono={<ArrowDownToLine />} onClick={() => setPurgando(true)} disabled={purgando || nivelN2 <= 40}>
                Simular purga en Nave 2
              </Boton>
              <Boton icono={<RotateCcw />} onClick={() => { setPurgando(false); setNivelN2(220); }}>
                Reiniciar nivel
              </Boton>
              <span className="text-label text-fg-muted">
                Nivel N2: <span className="num text-fg">{formatoNumero(nivelN2)} cm</span> ·{' '}
                <span className="num text-fg">{formatoNumero(pctN2)} %</span> del crítico
              </span>
            </div>
          </Seccion>

          {/* URGENCIA */}
          <Seccion
            id="urgencia"
            titulo="Medidor de urgencia"
            descripcion="0–100. Menos de 40: esperar. De 40 a 70: programar purga. Más de 70: purgar ya. Debajo, la regla que disparó la recomendación en palabras simples."
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <Tarjeta relleno="lg" className="grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(240px,320px)_1fr]">
                <MedidorUrgencia urgencia={urgencia} objetivo="Nave 2" />
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-label font-medium text-fg-muted">Recomendación actual</p>
                    <p className="mt-1 text-heading font-semibold leading-snug text-fg">
                      Purgar Nave 2 a <span className="num">20</span> cm por <span className="num">15</span> min
                    </p>
                    <p className="mt-2 text-body text-fg-muted">
                      Porque el lodo está al <span className="num font-semibold text-fg">88</span> % del nivel crítico y sube{' '}
                      <span className="num font-semibold text-fg">3.1</span> cm por hora. Llegaría al crítico en{' '}
                      <span className="num font-semibold text-fg">58</span> min.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <BotonMantener
                      etiqueta="Confirmar purga"
                      icono={<ArrowDownToLine />}
                      alConfirmar={() => undefined}
                      className="sm:max-w-xs"
                    />
                    <Boton variante="fantasma" icono={<X />} className="h-16">
                      Rechazar con motivo
                    </Boton>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="text-label text-fg-muted">
                      Prueba el medidor: <span className="num text-fg">{urgencia}</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={urgencia}
                      onChange={(e) => setUrgencia(Number(e.target.value))}
                      className="h-12 w-full accent-[var(--accent)]"
                    />
                  </label>
                </div>
              </Tarjeta>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Tarjeta className="flex items-center gap-4">
                  <MedidorUrgencia urgencia={24} compacto className="w-40 shrink-0" />
                  <p className="text-label text-fg-muted">Lodo al 45 % y subiendo lento: no hace falta purgar.</p>
                </Tarjeta>
                <Tarjeta className="flex items-center gap-4">
                  <MedidorUrgencia urgencia={56} compacto className="w-40 shrink-0" />
                  <p className="text-label text-fg-muted">Al 70 %: programar la purga fuera de la hora punta (18:00–23:00).</p>
                </Tarjeta>
              </div>
            </div>
          </Seccion>

          {/* COMPUERTA */}
          <Seccion
            id="compuerta"
            titulo="Compuerta de purga"
            descripcion="La hoja sube y baja en pasos de 10 cm, como se opera hoy a mano. Al abrirse se ve el lodo saliendo por debajo."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Tarjeta className="flex flex-col gap-4">
                <EncabezadoTarjeta titulo="Compuerta Nave 2" subtitulo="Modo Asistido · apertura máxima 60 cm" />
                <CompuertaControl aperturaCm={apertura} aperturaMaxCm={60} alCambiar={setApertura} />
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4">
                <EncabezadoTarjeta titulo="Solo lectura" subtitulo="Lo que ve gerencia" />
                <CompuertaControl aperturaCm={0} />
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4 md:col-span-2 xl:col-span-1">
                <EncabezadoTarjeta titulo="Vista en el tanque" subtitulo="Misma apertura, en el corte de la nave" />
                <NaveTanque nivelCm={150} nivelCriticoCm={250} aperturaCm={apertura} />
              </Tarjeta>
            </div>
          </Seccion>

          {/* CONFIRMAR */}
          <Seccion
            id="confirmar"
            titulo="Mantener presionado para confirmar"
            descripcion="Las acciones críticas se confirman manteniendo 2 s. El anillo se llena mientras se presiona; si se suelta antes, no pasa nada. Funciona con dedo, mouse y teclado (Espacio)."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Tarjeta className="flex flex-col gap-4">
                <Subtitulo>Confirmar purga</Subtitulo>
                <BotonMantener
                  etiqueta="Purgar N2 · 20 cm · 15 min"
                  etiquetaConfirmado="Purga confirmada"
                  icono={<ArrowDownToLine />}
                  alConfirmar={() => setConfirmaciones((c) => [`Purga N2 confirmada ${new Date().toLocaleTimeString('es-PE')}`, ...c].slice(0, 3))}
                />
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-4">
                <Subtitulo>Acción de riesgo</Subtitulo>
                <BotonMantener
                  etiqueta="Cerrar todas las compuertas"
                  etiquetaConfirmado="Cerrando compuertas"
                  icono={<DoorClosed />}
                  variante="peligro"
                  alConfirmar={() => setConfirmaciones((c) => [`Cierre total ${new Date().toLocaleTimeString('es-PE')}`, ...c].slice(0, 3))}
                />
              </Tarjeta>
              <Tarjeta className="flex flex-col gap-3">
                <Subtitulo>Registro</Subtitulo>
                {confirmaciones.length === 0 ? (
                  <p className="text-label text-fg-muted">Mantén presionado un botón para ver el comando registrado aquí.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {confirmaciones.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-label text-fg">
                        <CircleCheck className="size-4 text-ok" aria-hidden /> {c}
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
            </div>
          </Seccion>

          {/* ALERTAS */}
          <Seccion
            id="alertas"
            titulo="Alertas"
            descripcion="Severidad con ícono y texto, hora, nave y la acción sugerida. Las nuevas entran deslizándose desde la derecha."
          >
            <div className="mb-4">
              <Boton icono={<BellPlus />} onClick={simularAlerta}>
                Simular alerta nueva
              </Boton>
            </div>
            <ul className="flex max-w-4xl flex-col gap-3">
              <AnimatePresence initial={false}>
                {alertas.slice(0, 5).map((a) => (
                  <AlertaItem
                    key={a.id}
                    alerta={a}
                    alVer={a.severidad === 'critica' && !a.reconocida ? () => undefined : undefined}
                    alReconocer={() =>
                      setAlertas((as) => as.map((x) => (x.id === a.id ? { ...x, reconocida: true } : x)))
                    }
                  />
                ))}
              </AnimatePresence>
            </ul>
          </Seccion>

          {/* BOMBAS */}
          <Seccion
            id="bombas"
            titulo="Bombas de lodos"
            descripcion="El impulsor gira cuando la bomba está en marcha. Corriente, potencia y consumo por m³ siempre con su unidad."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bombas.map((b) => (
                <TarjetaBomba
                  key={b.id}
                  bomba={b.estado === 'en_marcha' ? { ...b, corrienteA: b.corrienteA + ruido(0.6, 4), potenciaActualKw: b.potenciaActualKw + ruido(0.3, 5) } : b}
                  alAlternar={() => alternarBomba(b.id)}
                />
              ))}
            </div>
          </Seccion>

          <footer className="border-t border-line pt-8 text-label text-fg-subtle">
            AquaMind · prototipo de interfaz para H2Olmos · Desarenador Miraflores, Lambayeque
          </footer>
        </main>
      </div>
    </div>
  );
}
