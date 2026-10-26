import { useMemo } from 'react';
import type { NaveId } from '@/types/dominio';
import type { RegistroAuditoria } from '@/data/DataSource';
import type { ConfigPlanta } from '@/config/planta';
import { usePlantaCampos } from '@/store/useTelemetria';
import { usePuede } from '@/store/useOperacion';
import { EncabezadoPagina } from '@/components/layout/Shell';
import { Esqueleto } from '@/components/ui/Esqueleto';
import { FormularioParametros } from './FormularioParametros';
import { UsuariosPerfiles } from './UsuariosPerfiles';
import { TablaAuditoria } from './TablaAuditoria';

export default function PaginaConfiguracion() {
  // Solo lo que usa la pantalla: la hora va redondeada al día y los niveles a cm enteros,
  // así no se vuelve a pintar con cada dato de planta.
  const datos = usePlantaCampos((p) => ({
    hoy: new Date(p.t).setHours(0, 0, 0, 0),
    config: p.config,
    auditoria: p.auditoria,
    niveles: p.naves.map((n) => `${n.id}:${Math.round(n.nivelCm)}`).join('|'),
  }));
  if (!datos) {
    return (
      <div aria-busy className="grid grid-cols-12 gap-6">
        <Esqueleto className="col-span-12 h-[640px] rounded-card xl:col-span-7" />
        <Esqueleto className="col-span-12 h-[640px] rounded-card xl:col-span-5" />
      </div>
    );
  }
  return <Configuracion {...datos} />;
}

function Configuracion({ hoy, config, auditoria, niveles }: { hoy: number; config: ConfigPlanta; auditoria: RegistroAuditoria[]; niveles: string }) {
  const edita = usePuede('editar_configuracion');
  const nivelesPorNave = useMemo(
    () => Object.fromEntries(niveles.split('|').map((x) => x.split(':')).map(([id, cm]) => [id, Number(cm)])) as Record<NaveId, number>,
    [niveles],
  );

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración y seguridad"
        descripcion="Los parámetros de la planta, quién puede hacer qué y el registro de cada orden dada."
      />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <FormularioParametros config={config} niveles={nivelesPorNave} puedeEditar={edita} className="col-span-12 self-start xl:col-span-7" />
        <UsuariosPerfiles auditoria={auditoria} hoy={hoy} className="col-span-12 xl:col-span-5" />
        <TablaAuditoria auditoria={auditoria} hoy={hoy} ahora={hoy} className="col-span-12" />
      </div>
    </>
  );
}
