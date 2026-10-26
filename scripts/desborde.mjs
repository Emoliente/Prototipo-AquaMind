// Lista los elementos que se salen de 390 px de ancho (revisión de diseño en celular).
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:5173/#/' + (process.argv[2] ?? 'diseno'), { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const r = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const rc = el.getBoundingClientRect();
    if (rc.right > 375 && rc.width > 0) out.push(`${el.tagName}.${(el.className?.baseVal ?? el.className).toString().slice(0,80)} right=${Math.round(rc.right)} w=${Math.round(rc.width)}`);
  }
  return out.slice(0, 15);
});
console.log(r.join('\n'));
await b.close();
