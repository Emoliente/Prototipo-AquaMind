// Mide la fluidez de la app: navegación entre pantallas, cuadros por segundo y cuánto
// trabaja el hilo principal en reposo (planta en vivo a 1 s = 1 min).
// Uso: npm run dev (o npm run preview) y luego `node scripts/medir-rendimiento.mjs [url] [--lento]`
//   --lento simula un procesador 4 veces más lento (laptop de oficina).
import { chromium } from 'playwright';

const base = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? process.env.URL_BASE ?? 'http://localhost:5173';
const lento = process.argv.includes('--lento');
const RUTAS = [
  ['Panel de monitoreo', 'Desarenador Miraflores'],
  ['Purgas', 'Purgas'],
  ['Bombeo de lodos', 'Bombeo de lodos'],
  ['Alertas', 'Alertas'],
  ['Pronóstico y temporada', 'Pronóstico y temporada'],
  ['Bitácora', 'Bitácora'],
  ['Informes', 'Informes'],
];

const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(() => {
  localStorage.setItem('aquamind.perfil', 'jefatura');
  localStorage.setItem('aquamind.vista', '2d');
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
if (lento) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

async function metricas() {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

async function reposo(ms = 5000) {
  const a = await metricas();
  const fps = await page.evaluate(
    (dur) =>
      new Promise((res) => {
        let n = 0;
        let peor = 0;
        let prev = performance.now();
        const t0 = prev;
        const f = (t) => {
          n++;
          peor = Math.max(peor, t - prev);
          prev = t;
          if (t - t0 < dur) requestAnimationFrame(f);
          else res({ fps: Math.round((n * 1000) / (t - t0)), peorCuadroMs: Math.round(peor) });
        };
        requestAnimationFrame(f);
      }),
    ms,
  );
  const b = await metricas();
  const ocupado = (k) => ((b[k] - a[k]) / (ms / 1000)) * 100;
  return {
    ...fps,
    script: ocupado('ScriptDuration').toFixed(0) + '%',
    estilo: ocupado('RecalcStyleDuration').toFixed(0) + '%',
    layout: ocupado('LayoutDuration').toFixed(0) + '%',
    total: ocupado('TaskDuration').toFixed(0) + '%',
  };
}

async function navegar(enlace, titulo) {
  const t0 = Date.now();
  await page.getByRole('link', { name: enlace }).first().click();
  await page.waitForFunction(
    (t) => document.querySelector('main h2')?.textContent === t && !document.querySelector('main .esqueleto'),
    titulo,
    { timeout: 30000 },
  );
  return Date.now() - t0;
}

await page.goto(`${base}/#/panel`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]') && !document.querySelector('main .esqueleto'), null, { timeout: 30000 });
await page.waitForTimeout(1500);

if (lento) console.log('(procesador 4× más lento)');
console.log('pantalla                 | 1.ª visita | 2.ª visita | fps | peor cuadro | hilo ocupado (script/estilo/layout)');
const filas = [];
for (const [enlace, titulo] of RUTAS) {
  const primera = enlace === 'Panel de monitoreo' ? null : await navegar(enlace, titulo);
  await page.waitForTimeout(800);
  const r = await reposo();
  filas.push({ enlace, titulo, primera, r });
}
// segunda vuelta: navegación ya con las pantallas cargadas
for (const f of filas) {
  f.segunda = await navegar(f.enlace, f.titulo);
  await page.waitForTimeout(300);
}
for (const f of filas) {
  const { fps, peorCuadroMs, script, estilo, layout, total } = f.r;
  console.log(
    `${f.enlace.padEnd(24)} | ${String(f.primera ?? '—').padStart(7)} ms | ${String(f.segunda).padStart(7)} ms | ${String(fps).padStart(3)} | ${String(peorCuadroMs).padStart(8)} ms | ${total} (${script}/${estilo}/${layout})`,
  );
}

// Abrir el diálogo de purga desde una nave (lo que el usuario notó)
await navegar('Panel de monitoreo', 'Desarenador Miraflores');
await page.waitForTimeout(800);
const t0 = Date.now();
await page.locator('#nave-N2 > div').first().click({ position: { x: 200, y: 20 } });
await page.getByRole('dialog').waitFor();
console.log(`\nabrir purga desde la nave: ${Date.now() - t0} ms hasta ver el diálogo`);
await page.waitForTimeout(400);
console.log('con el diálogo abierto:', JSON.stringify(await reposo(3000)));
await navegador.close();
