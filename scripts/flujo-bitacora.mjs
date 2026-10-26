// Recorre Bitácora (técnico) e Informes (gerencia), incluida la descarga de los CSV.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-bitacora.mjs`
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { strFromU8, unzipSync } from 'fflate';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-bitacora';
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await ctx.addInitScript(() => localStorage.setItem('aquamind.perfil', 'tecnico'));
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
const foto = (n, completa = false) => page.screenshot({ path: `${salida}/${n}.png`, fullPage: completa });
const paso = (t) => console.log(`→ ${t}`);
const listo = () => page.waitForFunction(() => document.querySelector('main') && !document.querySelector('main .esqueleto'), null, { timeout: 20000 });

/** Descarga el Excel, lo abre (un .xlsx es un zip) y muestra sus hojas y filas. */
async function descargarExcel(archivo, hojasEsperadas) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
  await d.saveAs(`${salida}/${archivo}`);
  const zip = unzipSync(new Uint8Array(await readFile(`${salida}/${archivo}`)));
  const hojas = [...strFromU8(zip['xl/workbook.xml']).matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  const filas = (strFromU8(zip['xl/worksheets/sheet1.xml']).match(/<row /g) ?? []).length;
  console.log(`   ${archivo} (${d.suggestedFilename()}): hojas ${hojas.join(', ')} · ${filas} filas en «${hojas[0]}»`);
  if (hojas.join('|') !== hojasEsperadas.join('|')) throw new Error(`Hojas inesperadas en ${archivo}: ${hojas.join(', ')}`);
  await page.getByText('Archivo descargado').first().waitFor({ timeout: 5000 });
}

await page.goto(`${base}/#/bitacora`, { waitUntil: 'networkidle' });
await listo();
await page.waitForTimeout(1200);
paso('Bitácora, últimos 7 días');
await foto('1-bitacora-7d');

paso('30 días, solo purgas');
await page.getByRole('radio', { name: '30 días' }).click();
await page.getByLabel('Tipo de registro').selectOption('purga');
await page.waitForTimeout(500);
await foto('2-purgas-30d');
await descargarExcel('bitacora.xlsx', ['Bitácora', 'Resumen']);

paso('Registrar lectura de miras');
await page.getByLabel('Tipo de registro').selectOption('todos');
await page.getByRole('button', { name: 'Lectura de miras' }).click();
const valores = [212, 205, 201, 196, 190, 186, 181];
for (let i = 0; i < 7; i++) await page.getByLabel(`Mira ${i + 1} en centímetros`).fill(String(valores[i]));
await page.waitForTimeout(300);
await foto('3-dialogo-miras');
await page.getByRole('button', { name: 'Guardar en la bitácora' }).click();
await page.waitForTimeout(1000);
await foto('4-lectura-registrada');

paso('Gerencia: informe mensual');
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: /Gerencia/ }).click();
await page.getByRole('link', { name: 'Informes' }).first().click();
await listo();
await page.waitForTimeout(1500);
await foto('5-informe', true);
await descargarExcel('informe.xlsx', ['Resumen', 'Por día', 'Por nave']);

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo de bitácora e informes completo');
