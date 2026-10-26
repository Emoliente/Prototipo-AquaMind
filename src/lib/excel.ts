/**
 * Libro de Excel (.xlsx) mínimo, armado en el navegador: hojas con título, encabezados con
 * estilo, cifras con formato (miles, soles, fechas), fila de totales con fórmulas, filtros y
 * encabezado fijo. Un .xlsx es un zip de archivos XML; `fflate` arma el zip.
 *
 * Se carga solo al exportar (import dinámico), así no pesa en la pantalla.
 */
import { strToU8, zipSync } from 'fflate';

export type Formato = 'texto' | 'entero' | 'decimal1' | 'decimal2' | 'soles' | 'porcentaje' | 'fecha' | 'fechaHora';

/** Una celda: texto, número, vacía, o con formato propio (distinto del de su columna). */
export type Celda = string | number | null | undefined | { v: string | number | null; formato?: Formato };

export interface Columna {
  titulo: string;
  /** Ancho aproximado en caracteres. */
  ancho: number;
  formato?: Formato;
  /** En la fila de totales: suma la columna (con fórmula) o muestra un texto. */
  total?: 'suma' | string;
}

export interface Hoja {
  nombre: string;
  titulo: string;
  subtitulo?: string;
  columnas: Columna[];
  filas: Celda[][];
  /** Notas al pie (fuente de los datos, supuestos). */
  notas?: string[];
  /** Flechas de filtro en el encabezado (por defecto sí). */
  filtro?: boolean;
}

// ───────────────────────── estilos ─────────────────────────

// Índices en <cellXfs> (ver estilos()). Cada formato tiene su versión normal y en negrita.
const FORMATOS: Formato[] = ['texto', 'entero', 'decimal1', 'decimal2', 'soles', 'porcentaje', 'fecha', 'fechaHora'];
const NUMFMT: Record<Formato, number> = { texto: 0, entero: 3, decimal1: 164, decimal2: 4, soles: 165, porcentaje: 166, fecha: 167, fechaHora: 168 };
const XF_TITULO = 1;
const XF_SUBTITULO = 2;
const XF_ENCABEZADO = 3;
const XF_NOTA = 4;
const XF_ENCABEZADO_NUM = 5; // encabezado de una columna de cifras: alineado a la derecha, como ellas
const XF_BASE = 6; // desde aquí: un formato normal, luego el mismo en negrita (totales)
const xf = (f: Formato, negrita = false) => XF_BASE + FORMATOS.indexOf(f) * 2 + (negrita ? 1 : 0);

function estilos() {
  // Margen interno de un carácter: el texto no queda pegado a la cifra de la columna vecina.
  const xfs = FORMATOS.flatMap((f) => {
    const num = NUMFMT[f];
    const aplica = num ? ' applyNumberFormat="1"' : '';
    const alineacion = `<alignment horizontal="${f === 'texto' ? 'left' : 'right'}" indent="1"/>`;
    return [
      `<xf numFmtId="${num}" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"${aplica}>${alineacion}</xf>`,
      `<xf numFmtId="${num}" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"${aplica}>${alineacion}</xf>`,
    ];
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5">
<numFmt numFmtId="164" formatCode="#,##0.0"/>
<numFmt numFmtId="165" formatCode="&quot;S/ &quot;#,##0.00"/>
<numFmt numFmtId="166" formatCode="0.0%"/>
<numFmt numFmtId="167" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="168" formatCode="dd/mm/yyyy hh:mm"/>
</numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF0B3B5C"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF5B6B7D"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCEAF3"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FF7F98AD"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF7F98AD"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${XF_BASE + xfs.length}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" indent="1"/></xf>
${xfs.join('\n')}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

// ───────────────────────── celdas ─────────────────────────

/** Quita caracteres que el XML no admite y escapa los especiales. */
function xml(texto: string) {
  return texto
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A1, B7, AA3… */
function ref(col: number, fila: number) {
  let s = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return `${s}${fila}`;
}

function celda(r: string, valor: Celda, estilo: number) {
  const v = valor !== null && typeof valor === 'object' ? valor.v : valor;
  if (v === null || v === undefined || v === '') return estilo ? `<c r="${r}" s="${estilo}"/>` : '';
  if (typeof v === 'number') {
    // Un número inválido no rompe el archivo: queda la celda vacía.
    return Number.isFinite(v) ? `<c r="${r}" s="${estilo}"><v>${v}</v></c>` : `<c r="${r}" s="${estilo}"/>`;
  }
  return `<c r="${r}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

/** XML de la hoja y el rango de su filtro (para registrarlo en el libro, como hace Excel). */
function hojaXml(h: Hoja): { xml: string; rangoFiltro: string | null } {
  const filas: string[] = [];
  let n = 1;
  filas.push(`<row r="${n}" ht="22" customHeight="1">${celda(ref(0, n), h.titulo, XF_TITULO)}</row>`);
  n++;
  if (h.subtitulo) filas.push(`<row r="${n++}">${celda(ref(0, n - 1), h.subtitulo, XF_SUBTITULO)}</row>`);
  n++; // fila en blanco
  const filaEncabezado = n;
  filas.push(`<row r="${n}" ht="30" customHeight="1">${h.columnas.map((c, i) => celda(ref(i, n), c.titulo, c.formato && c.formato !== 'texto' ? XF_ENCABEZADO_NUM : XF_ENCABEZADO)).join('')}</row>`);
  n++;
  const primera = n;
  for (const fila of h.filas) {
    const celdas = h.columnas.map((c, i) => {
      const v = fila[i];
      const formato = (v !== null && typeof v === 'object' && v.formato) || c.formato || 'texto';
      return celda(ref(i, n), v, xf(formato));
    });
    filas.push(`<row r="${n}">${celdas.join('')}</row>`);
    n++;
  }
  const ultima = n - 1;
  const conTotales = h.columnas.some((c) => c.total) && h.filas.length > 0;
  if (conTotales) {
    const celdas = h.columnas.map((c, i) => {
      const r = ref(i, n);
      const estilo = xf(c.formato ?? 'texto', true);
      if (c.total === 'suma') {
        // Fórmula con su resultado ya calculado: se ve bien aunque el programa no recalcule.
        const suma = h.filas.reduce((s, f) => {
          const v = f[i];
          const x = v !== null && typeof v === 'object' ? v.v : v;
          return typeof x === 'number' && Number.isFinite(x) ? s + x : s;
        }, 0);
        return `<c r="${r}" s="${estilo}"><f>SUM(${ref(i, primera)}:${ref(i, ultima)})</f><v>${suma}</v></c>`;
      }
      return celda(r, c.total ?? null, estilo);
    });
    filas.push(`<row r="${n}">${celdas.join('')}</row>`);
    n++;
  }
  if (h.notas?.length) {
    n++;
    for (const nota of h.notas) filas.push(`<row r="${n}">${celda(ref(0, n++), nota, XF_NOTA)}</row>`);
  }

  const cols = h.columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(6, c.ancho)}" customWidth="1"/>`).join('');
  const rangoFiltro = h.filtro !== false && h.filas.length ? `${ref(0, filaEncabezado)}:${ref(h.columnas.length - 1, ultima)}` : null;
  const filtro = rangoFiltro ? `<autoFilter ref="${rangoFiltro}"/>` : '';
  const xmlHoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${filaEncabezado}" topLeftCell="A${filaEncabezado + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${filas.join('')}</sheetData>
${filtro}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToHeight="0"/>
</worksheet>`;
  return { xml: xmlHoja, rangoFiltro };
}

/** $A$4:$I$29 */
const absoluto = (rango: string) => rango.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');

/** Nombre de hoja válido para Excel: sin []:*?/\, único y de hasta 31 caracteres. */
function nombresHoja(hojas: Hoja[]) {
  const usados = new Set<string>();
  return hojas.map((h, i) => {
    let base = h.nombre.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Hoja ${i + 1}`;
    for (let k = 2; usados.has(base.toLowerCase()); k++) base = `${base.slice(0, 28)} ${k}`;
    usados.add(base.toLowerCase());
    return base;
  });
}

// ───────────────────────── libro ─────────────────────────

/** Arma el .xlsx. Lanza si los datos no permiten armarlo (lo atiende quien exporta). */
export function crearLibro(hojas: Hoja[], propiedades: { titulo: string; autor: string }): Uint8Array {
  if (!hojas.length) throw new Error('El libro no tiene hojas');
  for (const h of hojas) if (!h.columnas.length) throw new Error(`La hoja «${h.nombre}» no tiene columnas`);
  const nombres = nombresHoja(hojas);
  const piezas = hojas.map(hojaXml);
  const filtros = piezas
    .map((p, i) =>
      p.rangoFiltro
        ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(nombres[i]).replace(/'/g, "''")}'!${absoluto(p.rangoFiltro)}</definedName>`
        : '',
    )
    .join('');
  const ahora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const archivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(propiedades.titulo)}</dc:title>
<dc:creator>${xml(propiedades.autor)}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created>
</cp:coreProperties>`),
    'docProps/app.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>AquaMind</Application></Properties>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nombres.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${filtros ? `<definedNames>${filtros}</definedNames>` : ''}
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(estilos()),
  };
  piezas.forEach((p, i) => (archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(p.xml)));
  return zipSync(archivos, { level: 6 });
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
