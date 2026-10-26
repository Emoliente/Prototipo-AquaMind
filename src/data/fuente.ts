import type { DataSource } from './DataSource';
import { SimuladorDataSource } from './SimuladorDataSource';

/**
 * Fuente de datos única de la app. Para conectar la planta real basta con
 * devolver aquí otra implementación de DataSource (WebSocket, MQTT…).
 */
let instancia: DataSource | null = null;

export function fuenteDatos(): DataSource {
  instancia ??= new SimuladorDataSource();
  return instancia;
}
