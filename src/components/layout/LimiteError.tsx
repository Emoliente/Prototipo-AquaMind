import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Boton } from '@/components/ui/Boton';

interface Props {
  children: ReactNode;
  /**
   * - `pantalla`: aviso dentro de la pantalla, con reintentar (el menú sigue disponible).
   * - `global`: la app entera falló; página de aviso con recargar.
   * - `silencioso`: no muestra nada; avisa con `alFallar` y vuelve a intentar (para diálogos).
   */
  variante?: 'pantalla' | 'global' | 'silencioso';
  alFallar?: (error: Error) => void;
}

interface Estado {
  error: Error | null;
}

/** Los archivos de una versión anterior ya no existen: solo recargar lo arregla. */
const esCargaFallida = (e: Error) => /dynamically imported module|Importing a module script failed|Loading chunk/i.test(e.message);

/** Si algo falla al dibujarse, se muestra un aviso en vez de dejar la pantalla en blanco. */
export class LimiteError extends Component<Props, Estado> {
  state: Estado = { error: null };
  private fallosRecientes: number[] = [];

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[AquaMind] error en ${this.props.variante ?? 'pantalla'}`, error, info.componentStack);
    this.props.alFallar?.(error);
    if (this.props.variante === 'silencioso') {
      // Se reintenta solo, salvo que falle más de 3 veces en 10 s (así no queda en bucle).
      const ahora = Date.now();
      this.fallosRecientes = [...this.fallosRecientes.filter((t) => ahora - t < 10_000), ahora];
      if (this.fallosRecientes.length <= 3) setTimeout(() => this.setState({ error: null }), 0);
    }
  }

  private reintentar = () => {
    const { error } = this.state;
    if (error && esCargaFallida(error)) location.reload();
    else this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { variante = 'pantalla' } = this.props;
    if (variante === 'silencioso') return null;

    if (variante === 'global') {
      return (
        <div role="alert" className="grid min-h-dvh place-items-center bg-base p-6">
          <div className="flex max-w-md flex-col items-start gap-4 rounded-card border border-line bg-surface-1 p-6 shadow-2">
            <span className="grid size-12 place-items-center rounded-card bg-warn-soft text-warn">
              <TriangleAlert className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-title font-semibold text-fg">AquaMind tuvo un problema</h1>
              <p className="text-label text-fg-muted">
                La interfaz no pudo seguir. La planta y sus automatismos no dependen de esta pantalla. Recarga para volver.
              </p>
            </div>
            <Boton variante="primario" icono={<RefreshCw />} onClick={() => location.reload()}>
              Recargar
            </Boton>
          </div>
        </div>
      );
    }

    return (
      <Tarjeta relleno="lg" role="alert" className="flex flex-col items-start gap-4">
        <span className="grid size-12 place-items-center rounded-card bg-warn-soft text-warn">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-title font-semibold text-fg">No se pudo mostrar esta pantalla</h2>
          <p className="text-label text-fg-muted">
            {esCargaFallida(error)
              ? 'No llegó el contenido de la pantalla (¿se cortó la conexión?). La planta sigue funcionando.'
              : 'La planta sigue funcionando. Puedes reintentar o ir a otra pantalla desde el menú.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Boton variante="primario" icono={<RotateCcw />} onClick={this.reintentar}>
            Reintentar
          </Boton>
          {!esCargaFallida(error) && (
            <Boton variante="secundario" icono={<RefreshCw />} onClick={() => location.reload()}>
              Recargar página
            </Boton>
          )}
        </div>
      </Tarjeta>
    );
  }
}
