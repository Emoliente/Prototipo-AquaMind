import { useState, type ReactNode } from 'react';
import { CalendarRange, Clock, Hourglass, PiggyBank, Repeat } from 'lucide-react';
import type { EstadoPlanta } from '@/data/DataSource';
import type { Escenario } from '@/types/dominio';
import { formatoNumero, formatoSoles, horasLegibles } from '@/lib/format';
import { ESCENARIOS, ESCENARIO_EN_FRASE } from '@/logic/gemeloDigital';
import { horasHastaCritico, resumenEscenario, tasaPronostico } from '@/logic/pronostico';
import { usePlanta } from '@/store/useTelemetria';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { Segmentado } from '@/components/ui/Segmentado';
import { EstadoChip } from '@/components/ui/EstadoChip';
import { Valor } from '@/components/ui/Valor';
import { TarjetaPronosticoNave } from './TarjetaPronosticoNave';
import { ComparacionEscenarios, ICONO_ESCENARIO } from './ComparacionEscenarios';

export default function PaginaPronostico() {
  const planta = usePlanta();
  if (!planta) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Esqueleto className="h-28 rounded-card" />
        <Esqueleto className="h-64 rounded-card" />
        <Esqueleto className="h-64 rounded-card" />
      </div>
    );
  }
  return <Pronostico planta={planta} />;
}

function Indicador({ icono, etiqueta, children, pie }: { icono: ReactNode; etiqueta: string; children: ReactNode; pie?: ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-label font-medium text-fg-muted">
        <span className="text-fg-subtle [&>svg]:size-4">{icono}</span>
        {etiqueta}
      </p>
      {children}
      {pie && <p className="text-label text-fg-muted">{pie}</p>}
    </Tarjeta>
  );
}

function Pronostico({ planta }: { planta: EstadoPlanta }) {
  const [escenario, setEscenario] = useState<Escenario>(planta.escenario);
  const [rango, setRango] = useState<'24h' | '7d'>('24h');
  const simulado = escenario !== planta.escenario;
  const resumen = resumenEscenario(escenario, planta);

  const horas = planta.naves.map((n) => ({ nave: n, h: horasHastaCritico(n.nivelCm, n.nivelCriticoCm, tasaPronostico(planta, n, escenario)) }));
  const masCerca = horas.filter((x) => x.h !== null).sort((a, b) => a.h! - b.h!)[0];
  const legible = masCerca && masCerca.h! > 0 ? horasLegibles(masCerca.h!) : null;

  return (
    <>
      <EncabezadoPagina
        titulo="Pronóstico y temporada"
        descripcion="Cuándo llega cada nave al nivel crítico si no se purga, y qué significa cada temporada en purgas, agua y energía."
      />

      <Tarjeta className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-label font-semibold text-fg-muted">Escenario del pronóstico</p>
          <p className="text-label text-fg-muted">
            La planta está hoy en <span className="font-semibold text-fg">{ESCENARIO_EN_FRASE[planta.escenario]}</span>.
            {simulado && <> Estás viendo qué pasaría con <span className="font-semibold text-fg">{ESCENARIO_EN_FRASE[escenario]}</span>.</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-full overflow-x-auto">
            <Segmentado
              etiqueta="Escenario"
              valor={escenario}
              alCambiar={setEscenario}
              opciones={(['seca', 'lluvias', 'nino'] as Escenario[]).map((e) => {
                const I = ICONO_ESCENARIO[e];
                return { valor: e, texto: ESCENARIOS[e].nombre, icono: <I /> };
              })}
            />
          </div>
          <Segmentado
            etiqueta="Período del gráfico"
            valor={rango}
            alCambiar={setRango}
            opciones={[
              { valor: '24h', texto: '24 h', icono: <Clock /> },
              { valor: '7d', texto: '7 días', icono: <CalendarRange /> },
            ]}
          />
        </div>
      </Tarjeta>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        <Indicador icono={<Hourglass />} etiqueta="Nave más cerca del crítico">
          {masCerca ? (
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-heading font-semibold text-fg">{masCerca.nave.nombre}</span>
              {legible ? (
                <Valor valor={legible.valor} unidad={legible.unidad} decimales={1} tamano="md" />
              ) : (
                <EstadoChip estado="critica" texto="Ya pasó el crítico" />
              )}
            </div>
          ) : (
            <p className="text-heading font-semibold text-fg">Ninguna está subiendo</p>
          )}
        </Indicador>
        <Indicador icono={<Repeat />} etiqueta="Purgas estimadas por semana" pie={<>Unos <span className="num text-fg">{formatoNumero(resumen.lodoM3Semana)}</span> m³ de lodo a evacuar</>}>
          <Valor valor={resumen.purgasSemana} decimales={resumen.purgasSemana < 10 ? 1 : 0} unidad="purgas" tamano="md" />
        </Indicador>
        <Indicador
          icono={<PiggyBank />}
          etiqueta="Ahorro semanal en bombeo"
          pie={<>Bombeo calculado <span className="num text-fg">{formatoSoles(resumen.solesSemana)}</span> frente a <span className="num text-fg">{formatoSoles(resumen.kwhBaseSemana * planta.config.tarifaSolesKwh)}</span> con 8 h fijas</>}
        >
          <Valor valor={resumen.ahorroSolesSemana} prefijo="S/" decimales={0} tamano="md" />
        </Indicador>
      </div>

      <div className="flex flex-col gap-4 lg:gap-6">
        {planta.naves.map((n) => (
          <TarjetaPronosticoNave key={n.id} planta={planta} nave={n} escenario={escenario} rango={rango} />
        ))}
        <ComparacionEscenarios planta={planta} seleccionado={escenario} />
      </div>
    </>
  );
}
