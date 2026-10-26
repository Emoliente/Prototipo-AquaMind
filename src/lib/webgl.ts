let cache: boolean | null = null;

/** ¿El navegador puede dibujar en 3D? Se prueba una sola vez, sin cargar three.js. */
export function hayWebGL(): boolean {
  if (cache !== null) return cache;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    cache = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cache = false;
  }
  return cache;
}
