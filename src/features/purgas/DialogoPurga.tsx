import { ArrowDownToLine } from 'lucide-react';
import { usePlantaSi } from '@/store/useTelemetria';
import { useOperacion } from '@/store/useOperacion';
import { Dialogo } from '@/components/ui/Dialogo';
import { FormularioPurga } from './FormularioPurga';

/**
 * Purga en 3 toques desde el Panel: toque 1 abre este diálogo con la
 * recomendación ya cargada; mantener 2 s confirma.
 */
export function DialogoPurga() {
  const naveId = useOperacion((s) => s.purgaNave);
  const cerrar = useOperacion((s) => s.abrirPurga);
  const planta = usePlantaSi(!!naveId);
  const nave = planta?.naves.find((n) => n.id === naveId);
  const rec = planta?.recomendaciones.find((r) => r.naveId === naveId);

  return (
    <Dialogo
      abierto={!!naveId && !!nave}
      alCerrar={() => cerrar(null)}
      icono={<ArrowDownToLine />}
      titulo={nave ? `Purgar ${nave.nombre}` : 'Purgar'}
      descripcion={rec ? `Recomendado: ${rec.aperturaCm} cm por ${rec.duracionMin} min · urgencia ${rec.urgencia}` : undefined}
      ancho="sm:max-w-2xl"
    >
      {planta && naveId && nave && <FormularioPurga planta={planta} naveId={naveId} alConfirmar={() => cerrar(null)} />}
    </Dialogo>
  );
}
