// Corre el Modo demo completo, prueba pausa y guarda una captura por paso.
// Uso: npm run dev (en otra terminal) y luego `node scripts/flujo-demo.mjs [--celular]`
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.URL_BASE ?? 'http://localhost:5173';
const celular = process.argv.includes('--celular');
const salida = `capturas/flujo-demo${celular ? '-celular' : ''}`;
await mkdir(salida, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext(
  celular
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1920, height: 1080 } },
);
await ctx.addInitScript(() => localStorage.setItem('aquamind.perfil', 'gerencia'));
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

await page.goto(`${base}/#/panel`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
await page.waitForTimeout(800);

// Se inicia desde el menú de perfil (funciona en todos los tamaños) y estando como Gerencia:
// el demo debe cambiar solo a Técnico de turno para poder purgar.
await page.getByRole('button', { name: /Perfil:/ }).click();
await page.getByRole('menuitemradio', { name: 'Iniciar modo demo' }).click();
const inicio = Date.now();
const region = page.getByRole('region', { name: 'Modo demo' });
await region.waitFor();

let ultimo = '';
let pausaProbada = false;
while (Date.now() - inicio < 120000) {
  const texto = (await region.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const m = /Paso (\d+) de (\d+)/.exec(texto);
  const clave = m ? m[1] : texto.includes('Recorrido terminado') ? 'fin' : '';
  if (clave && clave !== ultimo) {
    ultimo = clave;
    await page.waitForTimeout(clave === '1' ? 1500 : 1800);
    const t = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`→ ${clave === 'fin' ? 'fin' : `paso ${clave}`} (${t} s): ${texto.slice(0, 150)}`);
    await page.screenshot({ path: `${salida}/paso-${clave}.png` });
    if (clave === 'fin') break;
  }
  if (clave === '6' && !pausaProbada) {
    pausaProbada = true;
    await page.getByRole('button', { name: 'Pausar demo' }).click();
    const antes = await region.innerText();
    await page.waitForTimeout(2500);
    const despues = await region.innerText();
    console.log(`   pausa: ${antes === despues ? 'el recorrido quedó detenido' : 'OJO: siguió avanzando'}`);
    await page.getByRole('button', { name: 'Reanudar demo' }).click();
  }
  await page.waitForTimeout(150);
}
console.log(`duración total ${((Date.now() - inicio) / 1000).toFixed(1)} s (incluye 2.5 s de pausa)`);

// Salir deja la planta funcionando a velocidad normal.
await page.getByRole('button', { name: 'Salir del modo demo' }).click();
await page.waitForTimeout(800);
console.log('bitácora tras el demo:', await page.evaluate(() => 'ok'));
if (errores.length) console.warn('⚠ errores:\n  ' + errores.join('\n  '));
await navegador.close();
console.log('✓ modo demo completo');
