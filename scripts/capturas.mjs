// Capturas de revisión visual: 1920×1080 y 390 px de ancho, en modo oscuro y claro.
// Uso: npm run capturas -- [ruta] [--secciones] [--perfil=tecnico|jefatura|gerencia]
//   ruta por defecto: diseno   ·   requiere `npm run dev` en marcha (puerto 5173)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const ruta = args.find((a) => !a.startsWith('--')) ?? 'diseno';
const porSecciones = args.includes('--secciones');
const perfil = args.find((a) => a.startsWith('--perfil='))?.split('=')[1] ?? 'tecnico';
const base = process.env.URL_BASE ?? 'http://localhost:5173';
const salida = `capturas/${ruta}`;
await mkdir(salida, { recursive: true });

const VISTAS = [
  { nombre: 'escritorio', width: 1920, height: 1080, deviceScaleFactor: 1 },
  { nombre: 'celular', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const navegador = await chromium.launch();
for (const tema of ['dark', 'light']) {
  for (const v of VISTAS) {
    const ctx = await navegador.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.deviceScaleFactor,
      isMobile: v.isMobile,
      hasTouch: v.hasTouch,
    });
    await ctx.addInitScript(
      ([t, p]) => {
        localStorage.setItem('aquamind.tema', t);
        localStorage.setItem('aquamind.perfil', p);
      },
      [tema, perfil],
    );
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto(`${base}/#/${ruta}`, { waitUntil: 'networkidle' });
    // Espera a que lleguen los datos de planta (los esqueletos usan aria-busy).
    if (ruta !== 'diseno') {
      await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
    }
    await page.waitForTimeout(1800);

    const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
    if (anchoDoc > v.width) console.warn(`⚠ ${tema}/${v.nombre}: desborde horizontal (${anchoDoc}px > ${v.width}px)`);

    await page.screenshot({ path: `${salida}/${v.nombre}-${tema}-pantalla.png` });
    await page.screenshot({ path: `${salida}/${v.nombre}-${tema}-completa.png`, fullPage: true });

    if (porSecciones) {
      // La barra superior fija taparía el borde de cada sección en los recortes.
      await page.addStyleTag({ content: 'header.sticky{position:static!important}' });
      const ids = await page.$$eval('section[id]', (s) => s.map((x) => x.id));
      for (const id of ids) {
        const el = page.locator(`section#${id}`);
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await el.screenshot({ path: `${salida}/${v.nombre}-${tema}-${id}.png` });
      }
    }
    if (errores.length) console.warn(`⚠ ${tema}/${v.nombre} errores:\n  ${errores.join('\n  ')}`);
    console.log(`✓ ${tema} · ${v.nombre}`);
    await ctx.close();
  }
}
await navegador.close();
