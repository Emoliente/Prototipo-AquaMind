import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CLAVE = 'aquamind.recargaPorVersion';
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `lazy` con reintentos: si la red falla al traer una pantalla, se reintenta dos veces.
 * Algunos navegadores (Chrome) recuerdan el fallo de un import, así que si aun así no llega
 * (corte de red, o una versión nueva cambió el nombre del archivo) se recarga la página una
 * sola vez; si vuelve a fallar, el error llega al límite de errores con su botón Reintentar.
 */
export function cargaDiferida<T extends ComponentType<object>>(importar: () => Promise<{ default: T }>) {
  const componente = lazy(async () => {
    for (let intento = 0; ; intento++) {
      try {
        const modulo = await importar();
        try {
          sessionStorage.removeItem(CLAVE);
        } catch {
          // sin sessionStorage: nada que limpiar
        }
        return modulo;
      } catch (e) {
        if (intento < 2) {
          await espera(400 * (intento + 1));
          continue;
        }
        let yaRecargo = true;
        try {
          yaRecargo = sessionStorage.getItem(CLAVE) === '1';
          if (!yaRecargo) sessionStorage.setItem(CLAVE, '1');
        } catch {
          // Sin sessionStorage no se arriesga un bucle de recargas.
        }
        if (!yaRecargo) {
          location.reload();
          return new Promise<never>(() => {});
        }
        throw e;
      }
    }
  });
  // Precarga en segundo plano: si falla no pasa nada (sin recargas); se reintentará al entrar.
  return Object.assign(componente, { precargar: () => void importar().catch(() => {}) }) as LazyExoticComponent<T> & {
    precargar: () => void;
  };
}

type Precargable = { precargar: () => void };

/**
 * Trae las pantallas cuando el navegador está libre, de a una por vez para no trabar nada:
 * así la primera visita a cada pantalla es casi instantánea.
 */
export function precargarEnReposo(pantallas: Precargable[]) {
  const enReposo = (f: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(f, { timeout: 4000 });
    else setTimeout(f, 300);
  };
  const cola = [...pantallas];
  const siguiente = () => {
    const p = cola.shift();
    if (!p) return;
    p.precargar();
    enReposo(siguiente);
  };
  // Se espera a que la pantalla inicial termine de cargar y pintar.
  setTimeout(() => enReposo(siguiente), 1500);
}
