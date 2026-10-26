// Recorre la pantalla de Bombeo y guarda capturas de cada estado.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-bombeo.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-bombeo';
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
const ir = async (ruta) => {
  await page.getByRole('link', { name: ruta }).first().click();
  await page.waitForTimeout(900);
};

async function mantener(locator, ms = 2300) {
  const caja = await locator.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

await page.goto(`${base}/#/bombeo`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1200);
paso('Quebrada vacía');
await foto('1-vacia', true);

paso('Purgar para llenar la quebrada');
await ir('Purgas');
await mantener(page.getByRole('button', { name: /Purgar Nave .* Mantén presionado/ }));
await velocidad(60);
await page.getByText('Última purga').waitFor({ timeout: 90000 });
await velocidad(1);
await ir('Bombeo de lodos');
await page.waitForTimeout(1000);
await foto('2-plan', true);

paso('Iniciar bombeo');
const programar = page.getByRole('button', { name: /Bombear ahora de todas formas/ });
if (await programar.count()) await programar.click();
else await page.getByRole('button', { name: 'Iniciar bombeo' }).click();
await velocidad(10);
await page.waitForTimeout(2000);
await velocidad(1);
await page.waitForTimeout(1000);
await foto('3-en-curso');

paso('Encender Bomba 1 a mano');
await page.getByRole('button', { name: 'Encender' }).first().click();
await page.waitForTimeout(600);
await foto('4-dialogo-bomba');
await mantener(page.getByRole('dialog').getByRole('button', { name: /Mantén presionado/ }));
await page.waitForTimeout(1500);
await foto('5-dos-bombas', true);

paso('Detener bombeo');
await page.evaluate(() => window.scrollTo(0, 0));
await mantener(page.getByRole('button', { name: /Detener el bombeo/ }));
await page.waitForTimeout(1500);
await foto('6-detenido');

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo de bombeo completo');
