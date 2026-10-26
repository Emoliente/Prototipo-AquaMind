// Recorre Pronóstico como Gerencia: escenario actual, Lluvias, El Niño y vista de 7 días.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-pronostico.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-pronostico';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(() => localStorage.setItem('aquamind.perfil', 'gerencia'));
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
const foto = (n, completa = false) => page.screenshot({ path: `${salida}/${n}.png`, fullPage: completa });
const paso = (t) => console.log(`→ ${t}`);

await page.goto(`${base}/#/pronostico`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1200);
paso('Escenario actual, 24 h');
await foto('1-actual', true);

paso('Qué pasaría con Lluvias');
await page.getByRole('radio', { name: /Lluvias/ }).click();
await page.waitForTimeout(800);
await foto('2-lluvias');

paso('El Niño, 7 días');
await page.getByRole('radio', { name: /El Niño/ }).click();
await page.getByRole('radio', { name: /7 días/ }).click();
await page.waitForTimeout(800);
await foto('3-nino-7d', true);

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo de pronóstico completo');
