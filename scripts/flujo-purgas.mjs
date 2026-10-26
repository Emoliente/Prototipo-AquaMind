// Recorre la pantalla de Purgas y guarda capturas de cada estado.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-purgas.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-purgas';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(() => localStorage.setItem('aquamind.perfil', 'tecnico'));
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
const foto = (n, completa = false) => page.screenshot({ path: `${salida}/${n}.png`, fullPage: completa });
const paso = (t) => console.log(`→ ${t}`);
const velocidad = (v) => page.getByRole('button', { name: `×${v}`, exact: true }).click();

async function mantener(locator, ms = 2300) {
  const caja = await locator.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

await page.goto(`${base}/#/purgas`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1200);
paso('Preparar purga');
await foto('1-preparar', true);

paso('Confirmar purga (mantener 2 s)');
await mantener(page.getByRole('button', { name: /Purgar Nave .* Mantén presionado/ }));
await velocidad(10);
await page.waitForTimeout(2500);
await velocidad(1);
await page.waitForTimeout(800);
await foto('2-seguimiento');

paso('Esperar el fin de la purga');
await velocidad(60);
await page.getByText('Última purga').waitFor({ timeout: 90000 });
await velocidad(1);
await page.waitForTimeout(1000);
await page.getByText('Última purga').scrollIntoViewIfNeeded();
await foto('3-resultado');

paso('Programar una purga');
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole('radio', { name: /Programar/ }).click();
await page.waitForTimeout(400);
await mantener(page.getByRole('button', { name: /Programar Nave .* Mantén presionado/ }));
await page.waitForTimeout(1200);
await foto('4-programada');

paso('Jefatura: límites del Automático');
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: /Jefatura/ }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Apertura máxima: menos' }).click();
await page.waitForTimeout(400);
await page.getByText('Modo Automático', { exact: true }).first().scrollIntoViewIfNeeded();
await foto('5-jefatura-limites');
await page.getByRole('button', { name: 'Guardar límites' }).click();
await page.getByRole('button', { name: 'Activar modo Automático' }).click();
await page.waitForTimeout(700);
await foto('6-activar-automatico');

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo de purgas completo');
