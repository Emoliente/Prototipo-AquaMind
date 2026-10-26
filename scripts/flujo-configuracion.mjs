// Recorre Configuración y seguridad (jefatura): validaciones, guardar con motivo, ver el cambio
// en el Panel y en la auditoría, exportar la auditoría a Excel y comprobar que el técnico no entra.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-configuracion.mjs`
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { strFromU8, unzipSync } from 'fflate';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-configuracion';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem('aquamind.perfil', 'jefatura'));
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
const foto = (n, completa = false) => page.screenshot({ path: `${salida}/${n}.png`, fullPage: completa });
const paso = (t) => console.log(`→ ${t}`);
const verificar = (cond, texto) => {
  if (!cond) throw new Error(`Falló: ${texto}`);
  console.log(`   ✓ ${texto}`);
};
async function mantener(locator, ms = 2300) {
  await locator.scrollIntoViewIfNeeded();
  const caja = await locator.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

const nave2 = page.locator('label').filter({ hasText: 'Nave 2' }).locator('input');
const guardar = page.getByRole('button', { name: /Guardar cambios/ });

await page.goto(`${base}/#/configuracion`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1000);

paso('Sin cambios no hay botón de guardar');
verificar((await guardar.count()) === 0, 'el botón aparece solo cuando hay cambios');
await foto('1-configuracion', true);

paso('Valores imposibles');
await nave2.fill('50');
verificar(await page.getByText('Entre 100 y 380 cm.').isVisible(), 'nivel crítico de 50 cm: avisa el rango');
await page.getByLabel('Empieza').selectOption('23');
await page.getByLabel('Termina').selectOption('18');
verificar(await page.getByText(/debe terminar después de empezar/).isVisible(), 'hora punta al revés: avisa');
verificar(await guardar.isDisabled(), 'no deja guardar con errores');

paso('Cambios válidos: nivel de la Nave 2, hora punta y tarifa');
await nave2.fill('220');
await page.getByLabel('Empieza').selectOption('17');
await page.getByLabel('Termina').selectOption('22');
await page.getByLabel('Soles por kWh').fill('0.50');
const resumen = page.getByText('Se va a cambiar:').locator('..');
verificar(await resumen.getByText('Nivel crítico Nave 2: 250 → 220 cm').isVisible(), 'resume el cambio de nivel');
verificar(await resumen.getByText('Hora punta: 18:00–23:00 → 17:00–22:00').isVisible(), 'resume el cambio de hora punta');
verificar(await resumen.getByText('Tarifa: S/ 0.45 → S/ 0.50 por kWh').isVisible(), 'resume el cambio de tarifa');
verificar(await guardar.isDisabled(), 'sin motivo no deja guardar');
await page.getByPlaceholder(/nuevo pliego tarifario/).fill('Nuevo pliego tarifario y batimetría de la Nave 2');
await foto('2-cambios');

paso('Guardar (mantener 2 s)');
await mantener(guardar);
await page.getByText('Guardados 3 cambios').first().waitFor({ timeout: 5000 });
await page.waitForTimeout(800);
verificar((await guardar.count()) === 0, 'tras guardar ya no hay cambios pendientes');
const primera = page.locator('tbody tr').filter({ hasText: 'Cambiar configuración' }).first();
verificar(await primera.getByText('Nuevo pliego tarifario y batimetría de la Nave 2').isVisible(), 'la auditoría registra la orden con su motivo');
verificar(await primera.getByText('Ana Torres').isVisible(), 'y con quién la dio');
await foto('3-guardado', true);

paso('Filtrar rechazadas y exportar a Excel');
await page.getByRole('radio', { name: 'Rechazadas' }).click();
await page.waitForTimeout(300);
verificar((await page.locator('tbody tr').filter({ hasText: 'Rechazada' }).count()) >= 1, 'muestra las rechazadas');
const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
await d.saveAs(`${salida}/auditoria.xlsx`);
const zip = unzipSync(new Uint8Array(await readFile(`${salida}/auditoria.xlsx`)));
const hoja = strFromU8(zip['xl/worksheets/sheet1.xml']);
verificar(hoja.includes('Rechazada') && !hoja.includes('>Aceptada<'), `${d.suggestedFilename()}: solo las rechazadas`);

paso('El cambio llega al Panel');
await page.getByRole('link', { name: 'Panel de monitoreo' }).first().click();
await page.waitForTimeout(1500);
verificar((await page.getByText('Crítico · 220 cm').count()) >= 1, 'la Nave 2 muestra el nuevo nivel crítico');

paso('El técnico no entra');
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: /Técnico/ }).click();
await page.waitForTimeout(400);
verificar((await page.getByRole('link', { name: 'Configuración y seguridad' }).count()) === 0, 'no aparece en su menú');
await page.goto(`${base}/#/configuracion`);
await page.waitForTimeout(800);
verificar(page.url().endsWith('#/panel'), 'si escribe la dirección, vuelve al Panel');

console.log(errores.length ? `⚠ errores en consola:\n${errores.join('\n')}` : '✓ flujo de configuración completo');
await navegador.close();
