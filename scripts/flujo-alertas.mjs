// Recorre la pantalla de Alertas: llega una alerta crítica, se ve en pantalla y en la
// vista previa de Telegram, y se reconoce desde el "celular".
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-alertas.mjs`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = 'capturas/flujo-alertas';
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

await page.goto(`${base}/#/alertas`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(1200);
paso('Alertas al abrir');
await foto('1-inicio');

paso('Lluvias ×60 hasta que llegue una crítica');
await page.selectOption('aside select', 'lluvias');
await velocidad(60);
await page.getByRole('main').getByText(/llegará al nivel crítico|está al .* del nivel crítico/).first().waitFor({ timeout: 90000 });
await velocidad(1);
await page.waitForTimeout(1500);
await foto('2-llega-critica');

paso('Reconocer desde la vista previa de Telegram');
const vista = page.getByRole('region', { name: /Vista previa de los mensajes/ });
await vista.getByRole('button', { name: '✅ Reconocer' }).last().click();
await page.waitForTimeout(1800);
await foto('3-reconocida-telegram');

paso('Filtrar críticas');
await page.getByRole('radio', { name: /Críticas/ }).click();
await page.waitForTimeout(600);
await foto('4-filtro-criticas');

paso('En otra pantalla, la alerta nueva entra deslizándose');
await page.getByRole('link', { name: 'Panel de monitoreo' }).first().click();
await page.waitForTimeout(500);
await velocidad(60);
await page.getByRole('alert').first().waitFor({ timeout: 90000 });
await velocidad(1);
await page.waitForTimeout(1000);
await foto('5-otra-pantalla');

if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ flujo de alertas completo');
