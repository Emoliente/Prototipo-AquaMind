// Recorre Calibración y laboratorio (jefatura): cargar un resultado, validar entradas,
// aprobar calibraciones y comprobar que el sensor queda corregido.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-calibracion.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-calibracion';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
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

const pendientes = () => page.locator('li').filter({ has: page.getByRole('button', { name: 'Descartar' }) });
const aviso = (texto) => page.getByText(texto).first().waitFor({ timeout: 5000 });

await page.goto(`${base}/#/calibracion`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1200);

paso('Pantalla con 2 calibraciones por aprobar');
verificar((await pendientes().count()) === 2, 'hay 2 pendientes (sólidos de entrada y nivel de la Nave 2)');
await foto('1-calibracion', true);

paso('Resultado de laboratorio: valor fuera de rango');
await page.getByRole('button', { name: 'Resultado de laboratorio' }).click();
const dialogo = page.getByRole('dialog');
await dialogo.getByPlaceholder('Ej.: 0.085').fill('25');
verificar(await dialogo.getByText('Escribe un valor entre 0 y 10 g/L.').isVisible(), 'avisa del valor imposible');
verificar(await dialogo.getByRole('button', { name: 'Guardar y comparar' }).isDisabled(), 'no deja guardar');

paso('Resultado de laboratorio: igual al sensor → conforme');
await dialogo.getByPlaceholder('Ej.: 0.085').fill('0.1');
await page.waitForTimeout(200);
const marcaba = await dialogo.getByText(/El sensor marcaba/).innerText();
const valorSensor = marcaba.match(/marcaba ([\d.]+)/)[1];
await dialogo.getByPlaceholder('Ej.: 0.085').fill(valorSensor);
await page.waitForTimeout(200);
verificar(await dialogo.getByText('Dentro de la tolerancia').isVisible(), `con ${valorSensor} g/L queda dentro de la tolerancia`);
await foto('2-dialogo-laboratorio');
await dialogo.getByRole('button', { name: 'Guardar y comparar' }).click();
await aviso('el sensor está dentro de la tolerancia');
verificar(true, 'aviso de guardado');
await page.waitForTimeout(600);

paso('Aprobar la calibración de sólidos (mantener 2 s)');
const solidos = pendientes().filter({ hasText: 'Sólidos en suspensión · entrada' });
await mantener(solidos.getByRole('button', { name: /Aprobar calibración/ }));
await aviso('Calibración aplicada');
await page.waitForTimeout(600);
verificar((await pendientes().count()) === 1, 'queda 1 pendiente');
const tarjetaSolidos = page.getByRole('heading', { name: 'Sólidos en suspensión · entrada', exact: true }).locator('xpath=ancestor::div[.//dl][1]');
verificar(await tarjetaSolidos.getByText('hoy', { exact: true }).isVisible(), 'el sensor figura calibrado hoy');

paso('Aprobar el nivel de la Nave 2 con las miras');
await mantener(pendientes().first().getByRole('button', { name: /Aprobar calibración/ }));
await aviso('Calibración aplicada');
await page.waitForTimeout(1500);
verificar((await pendientes().count()) === 0, 'no quedan pendientes');
const nave2 = page.locator('li').filter({ has: page.getByText('Nave 2', { exact: true }) }).filter({ hasText: 'Miras' }).first();
verificar(await nave2.getByText('Coincide').isVisible(), 'sensor y miras de la Nave 2 ya coinciden');
await foto('3-calibrado', true);

paso('Batimetría de la Nave 1 muy distinta → por aprobar');
await page.getByRole('button', { name: 'Batimetría' }).click();
await dialogo.getByRole('radio', { name: 'Nave 1' }).click();
await dialogo.getByPlaceholder('Ej.: 150').fill('20');
await page.waitForTimeout(200);
verificar(await dialogo.getByText(/Fuera de tolerancia|Diferencia muy grande/).isVisible(), 'la comparación avisa antes de guardar');
await dialogo.getByRole('button', { name: 'Guardar y comparar' }).click();
await aviso('queda para aprobación de jefatura');
await page.waitForTimeout(600);
verificar((await pendientes().count()) === 1, 'aparece en Por aprobar');
await pendientes().first().getByRole('button', { name: 'Descartar' }).click();
await aviso('Muestra descartada');
verificar(true, 'se puede descartar');

paso('Queda en la bitácora');
await page.getByRole('link', { name: 'Bitácora' }).first().click();
await page.waitForTimeout(1200);
verificar((await page.getByText('Calibración aprobada').count()) >= 2, 'las dos calibraciones están en la bitácora');

paso('El técnico no ve Calibración');
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: /Técnico/ }).click();
await page.waitForTimeout(500);
verificar((await page.getByRole('link', { name: 'Calibración y laboratorio' }).count()) === 0, 'no aparece en su menú');

console.log(errores.length ? `⚠ errores en consola:\n${errores.join('\n')}` : '✓ flujo de calibración completo');
await navegador.close();
