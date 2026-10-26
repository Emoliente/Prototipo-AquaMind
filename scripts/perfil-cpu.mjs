// Perfil del hilo principal en una pantalla en reposo: qué funciones de JS y qué tareas
// del navegador (estilo, pintado, recolección de basura) se llevan el tiempo.
// Uso: npm run dev y luego `node scripts/perfil-cpu.mjs [ruta] [--lento] [--dialogo] [--perfil=jefatura]`
//   Para medir la versión de producción: npm run build && npm run preview, con URL_BASE=http://localhost:4173
//   Experimentos: --pausa (datos congelados), --sinanim, --apagar=<selector>, --css=<reglas>.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const ruta = args.find((a) => !a.startsWith('--')) ?? 'panel';
const lento = args.includes('--lento');
const conDialogo = args.includes('--dialogo');
// Experimentos: --sinanim apaga animaciones CSS; --pausa congela los datos de planta.
const sinAnim = args.includes('--sinanim');
const pausa = args.includes('--pausa');
// --apagar=<selector CSS>: apaga las animaciones solo de esos elementos.
// --css=<reglas>: CSS extra para probar variantes sin tocar el código.
const cssExtra = args.find((a) => a.startsWith('--css='))?.slice('--css='.length);
const apagar = args.find((a) => a.startsWith('--apagar='))?.slice('--apagar='.length);
const SEG = 6;

const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
const perfil = args.find((a) => a.startsWith('--perfil='))?.split('=')[1] ?? 'tecnico';
await ctx.addInitScript((p) => localStorage.setItem('aquamind.perfil', p), perfil);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(`${process.env.URL_BASE ?? 'http://localhost:5173'}/#/${ruta}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !document.querySelector('main [aria-busy]'), null, { timeout: 20000 });
if (conDialogo) {
  await page.locator('#nave-N2').click();
  await page.getByRole('dialog').waitFor();
}
if (sinAnim) await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important}' });
if (cssExtra) await page.addStyleTag({ content: cssExtra });
if (apagar) await page.addStyleTag({ content: `${apagar}{animation:none!important}` });
if (pausa) await page.getByRole('button', { name: /pausar/i }).first().click();
await page.waitForTimeout(2000);
if (lento) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

// Traza: tareas del navegador por tipo.
const eventos = [];
cdp.on('Tracing.dataCollected', (d) => eventos.push(...d.value));
const fin = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Tracing.start', {
  categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8',
  transferMode: 'ReportEvents',
});
await cdp.send('Profiler.start');
await page.waitForTimeout(SEG * 1000);
const { profile } = await cdp.send('Profiler.stop');
await cdp.send('Tracing.end');
await fin;

// Tareas de nivel superior del hilo principal (renderer main thread).
const hilo = eventos.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const tipos = new Map();
for (const e of eventos) {
  if (!hilo || e.tid !== hilo.tid || e.ph !== 'X' || !e.dur) continue;
  const n = e.name;
  if (!['FunctionCall', 'TimerFire', 'EventDispatch', 'UpdateLayoutTree', 'RecalculateStyles', 'Layout', 'Paint', 'PrePaint', 'Layerize', 'UpdateLayer', 'CompositeLayers', 'MinorGC', 'MajorGC', 'V8.GC_SCAVENGER', 'RunTask', 'FireAnimationFrame', 'HitTest', 'IntersectionObserverController::computeIntersections', 'Commit'].includes(n)) continue;
  tipos.set(n, (tipos.get(n) ?? 0) + e.dur / 1000);
}
console.log(`\n${ruta}${conDialogo ? ' + diálogo' : ''}${lento ? ' · CPU 4×' : ''} · ${SEG} s`);
console.log('tareas del hilo principal (ms totales; RunTask incluye a las demás):');
for (const [n, ms] of [...tipos].sort((a, b) => b[1] - a[1])) console.log(`  ${n.padEnd(40)} ${ms.toFixed(0).padStart(6)} ms  (${((ms / (SEG * 1000)) * 100).toFixed(1)} %)`);

// Funciones de JS con más tiempo propio.
const porId = new Map(profile.nodes.map((n) => [n.id, n]));
const propio = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = porId.get(id);
  const f = n.callFrame;
  const url = f.url.replace(/^.*\/(node_modules\/\.vite\/deps|src)\//, '$1/').replace(/\?.*$/, '');
  const clave = `${f.functionName || '(anónima)'}  ${url}:${f.lineNumber + 1}`;
  propio.set(clave, (propio.get(clave) ?? 0) + (dt[i] ?? 0) / 1000);
});
console.log('\nfunciones con más tiempo propio (ms):');
for (const [k, ms] of [...propio].filter(([k]) => !k.startsWith('(idle)') && !k.startsWith('(program)')).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${ms.toFixed(0).padStart(6)}  ${k}`);
}
await navegador.close();
