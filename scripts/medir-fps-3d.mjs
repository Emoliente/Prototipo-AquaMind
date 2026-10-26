// Mide los cuadros por segundo de la vista 3D usando la GPU del equipo (no el render por software).
// Uso: npm run dev (en otra terminal) y luego `node scripts/medir-fps-3d.mjs`
import { chromium } from 'playwright';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
for (const [w, h] of [[1920, 1080], [1366, 768]]) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    localStorage.setItem('aquamind.vista', '3d');
    localStorage.setItem('aquamind.perfil', 'tecnico');
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/#/panel`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fps3d !== undefined, null, { timeout: 60000 });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const d = gl?.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/d';
  });
  const muestras = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1000);
    muestras.push(await page.evaluate(() => window.__fps3d));
  }
  const prom = muestras.reduce((a, b) => a + b, 0) / muestras.length;
  console.log(`${w}×${h} · ${renderer}\n   fps por segundo: ${muestras.join(' ')} · promedio ${prom.toFixed(1)} · mínimo ${Math.min(...muestras)}`);
  await ctx.close();
}
await navegador.close();
