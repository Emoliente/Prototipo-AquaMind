// Recorre el flujo principal en el Panel y guarda capturas de cada estado.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-panel.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
const foto = (n) => page.screenshot({ path: `${salida}/${n}.png` });
const paso = (t) => console.log(`→ ${t}`);

await page.goto(`${base}/#/panel`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });

paso('Escenario Lluvias a ×60');
await page.selectOption('aside select', 'lluvias');
await page.getByRole('button', { name: '×60', exact: true }).click();
// Se espera «Purgar la Nave …». Si la simulación entra antes a la hora punta (18:00), la
// recomendación pasa a «Programar después de la hora punta» y el botón es «Preparar purga …»:
// abre el mismo formulario, así el flujo no depende de la hora del día en que se corre.
const abrirPurga = page.getByRole('button', { name: /^(Purgar la Nave|Preparar purga de la Nave)/ });
await page.getByRole('button', { name: /Purgar la Nave/ }).waitFor({ timeout: 40000 }).catch(() => {});
await page.getByRole('button', { name: '×1', exact: true }).click();
await page.waitForTimeout(800);
await foto('1-recomendacion');

paso('Toque 1: abrir purga');
await abrirPurga.first().click();
// En hora punta el formulario propone programarla: se elige purgar ahora.
const ahora = page.getByRole('dialog').getByRole('radio', { name: 'Ahora' });
if (await ahora.count()) await ahora.click();
await page.waitForTimeout(600);
await foto('2-dialogo-purga');

paso('Toque 2: mantener 2 s');
const confirmar = page.getByRole('dialog').getByRole('button', { name: /Mantén presionado/ });
const caja = await confirmar.boundingBox();
await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
await page.mouse.down();
await page.waitForTimeout(1000);
await foto('3-manteniendo');
await page.waitForTimeout(1300);
await page.mouse.up();
await page.waitForTimeout(2500);
await foto('4-purga-en-curso');

paso('Esperar fin de purga a ×10');
await page.getByRole('button', { name: '×10', exact: true }).click();
await page.getByText('Purga terminada', { exact: false }).first().waitFor({ timeout: 90000 });
await page.getByRole('button', { name: '×1', exact: true }).click();
await page.waitForTimeout(1200);
await foto('5-purga-terminada');

paso('Iniciar bombeo');
await page.getByRole('button', { name: /Iniciar bombeo|Bombear ahora/ }).click();
await page.waitForTimeout(2500);
await foto('6-bombeo-en-curso');

paso('Mando manual');
await page.getByRole('button', { name: 'Abrir mando manual' }).first().click();
await page.waitForTimeout(700);
await foto('7-mando-manual');
await page.keyboard.press('Escape');

paso('Perfil Gerencia');
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: /Gerencia/ }).click();
await page.waitForTimeout(1200);
await foto('8-gerencia');

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo completo');
