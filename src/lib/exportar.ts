import { descargarBlob } from './descarga';
import type { Hoja } from './excel';
import { useTelemetria } from '@/store/useTelemetria';

/**
 * Arma un Excel y lo descarga, avisando en pantalla cómo terminó. Cada paso que puede fallar
 * tiene su mensaje: traer el módulo de Excel (red), armar el libro (datos) y descargarlo
 * (navegador). Nunca lanza.
 */
/** Trae el módulo de Excel en segundo plano (al abrir Informes), para que exportar sea inmediato. */
export function precargarExcel() {
  const traer = () => void import('./excel').catch(() => {});
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(traer, { timeout: 3000 });
  else setTimeout(traer, 1000);
}

export async function exportarExcel(nombre: string, armar: () => Hoja[], propiedades: { titulo: string; autor: string }): Promise<boolean> {
  const { avisar } = useTelemetria.getState();
  let excel: typeof import('./excel');
  try {
    excel = await import('./excel');
  } catch (e) {
    console.error('[excel] no se pudo cargar el módulo', e);
    // El navegador recuerda el fallo de carga: hace falta recargar la página para reintentar.
    avisar({ ok: false, mensaje: 'No se pudo preparar el Excel. Revisa la conexión y recarga la página para intentarlo de nuevo.' });
    return false;
  }
  let datos: Uint8Array;
  try {
    datos = excel.crearLibro(armar(), propiedades);
  } catch (e) {
    console.error('[excel] no se pudo armar el libro', nombre, e);
    avisar({ ok: false, mensaje: 'No se pudo armar el informe en Excel. Inténtalo de nuevo; si sigue fallando, exporta otro mes para comprobar.' });
    return false;
  }
  try {
    descargarBlob(nombre, new Blob([datos as BlobPart], { type: excel.TIPO_XLSX }));
  } catch (e) {
    console.error('[excel] no se pudo descargar', nombre, e);
    avisar({ ok: false, mensaje: 'No se pudo descargar el archivo. Revisa si el navegador bloqueó la descarga e inténtalo de nuevo.' });
    return false;
  }
  avisar({ ok: true, mensaje: `Archivo descargado: ${nombre}` });
  return true;
}
