// Abre la vista 3D del Panel, comprueba que dibuja sin errores y guarda capturas.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-3d.mjs`
// Nota: Chromium sin pantalla dibuja WebGL por software; los fps reales se miden en un navegador con GPU.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-3d';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const tema of ['dark', 'light']) {
  const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('aquamind.tema', t);
    localStorage.setItem('aquamind.perfil', 'tecnico');
    localStorage.setItem('aquamind.vista', '2d');
  }, tema);
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto(`${base}/#/panel`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
  await page.getByRole('radio', { name: /Vista 3D/ }).click();
  await page.waitForFunction(() => window.__fps3d !== undefined, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  const fps = await page.evaluate(() => window.__fps3d ?? null);
  console.log(`→ ${tema}: canvas listo · fps (software) ${fps}`);
  await page.screenshot({ path: `${salida}/escritorio-${tema}.png` });
  if (tema === 'dark') {
    // Purga en curso: la compuerta sube, la tubería se ilumina y el lodo baja.
    await page.getByRole('button', { name: /Purgar la Nave|Preparar purga de la Nave/ }).click();
    const boton = page.getByRole('dialog').getByRole('button', { name: /Mantén presionado/ });
    const caja = await boton.boundingBox();
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2300);
    await page.mouse.up();
    await page.getByRole('button', { name: '×10', exact: true }).click();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: '×1', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${salida}/escritorio-purga.png` });
  }
  if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
  await ctx.close();
}
await navegador.close();
console.log('✓ vista 3D dibujada');
