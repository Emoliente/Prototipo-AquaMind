"""
Calibra el gemelo digital con los registros que entregó H2Olmos para el hackatón.

  R2  Concentraciones SST.xlsx      sólidos diarios (g/L): marzo 2026 (lluvias), setiembre 2026 (seca)
  R4  Caudales en sistema.xlsx      caudal diario captado en la bocatoma (m³/s), mismos meses
  R3  Registro limpieza Desarenador purgas por nave: fecha, horas y volumen de sedimento (m³)

Qué calcula:
  1. Los escenarios «Época seca» y «Lluvias» (valor típico y rango de sólidos y caudal).
  2. Cuánto sube el lodo por tonelada de sedimento que entra: para cada par de purgas
     seguidas de una nave, el volumen purgado se compara con el sedimento que entró entre
     ambas (sólidos × caudal). Supone que cada purga deja la nave a un nivel parecido.
  3. Cuánto lodo saca una purga por hora (volumen ÷ horas de purga).

Uso:  python scripts/calibrar_gemelo.py "<carpeta con los Excel>"   (por defecto, la carpeta de arriba)
Requiere openpyxl.
"""
import datetime as dt
import statistics as st
import sys
from pathlib import Path

import openpyxl

AREA_NAVE_M2 = 260  # 6.5 m × 40 m (config/planta.ts)
carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[2])


def hoja(nombre, cual=0):
    wb = openpyxl.load_workbook(carpeta / nombre, data_only=True)
    return wb[cual] if isinstance(cual, str) else wb.worksheets[cual]


def es_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def serie_diaria(ws, col, anio, mes):
    """Valores de la bocatoma por día (columna `col`), desde la fila 4."""
    out = {}
    for fila in ws.iter_rows(min_row=4, values_only=True):
        etiqueta, v = fila[col - 1], fila[col]
        if isinstance(etiqueta, str) and es_num(v):
            out[dt.date(anio, mes, int(etiqueta.split('-')[0]))] = v
    return out


ws_sst, ws_q = hoja('R2_ Concentraciones SST.xlsx'), hoja('R4_Caudales en sistema.xlsx')
# Columna 1 = Bocatoma Miraflores en marzo; columna 5 = Bocatoma Miraflores en setiembre.
sst = {**serie_diaria(ws_sst, 1, 2026, 3), **serie_diaria(ws_sst, 5, 2026, 9)}
caudal = {**serie_diaria(ws_q, 1, 2026, 3), **serie_diaria(ws_q, 5, 2026, 9)}


def resumen(valores):
    v = sorted(valores)
    return {'mediana': st.median(v), 'media': st.mean(v), 'min': v[0], 'max': v[-1], 'n': len(v)}


print('== Escenarios (Bocatoma Miraflores)')
for nombre, mes in (('Lluvias (marzo 2026)', 3), ('Época seca (setiembre 2026)', 9)):
    s = resumen([v for d, v in sst.items() if d.month == mes])
    q = resumen([v for d, v in caudal.items() if d.month == mes and v > 0])
    print(f'  {nombre}: sólidos mediana {s["mediana"]:.3f} g/L (media {s["media"]:.3f}, {s["min"]:.3f}–{s["max"]:.3f}, {s["n"]} días)'
          f' · caudal mediana {q["mediana"]:.2f} m³/s ({q["min"]:.2f}–{q["max"]:.2f})')

# ── Purgas por nave (R3 «Resumen Naves»): bloques de 6 columnas desde la B
ws_p = hoja('R3_ Registro limpieza Desarenador.xlsx', 'Resumen Naves')
purgas = {'N1': [], 'N2': [], 'N3': []}
for fila in ws_p.iter_rows(min_row=4, values_only=True):
    for i, nave in enumerate(purgas):
        fecha, horas, vol = fila[1 + 6 * i], fila[4 + 6 * i], fila[5 + 6 * i]
        if isinstance(fecha, dt.datetime) and es_num(vol):
            h = horas.hour + horas.minute / 60 if isinstance(horas, dt.time) else None
            purgas[nave].append((fecha.date(), h, vol))

todas = [p for ps in purgas.values() for p in ps]
print(f'\n== Purgas registradas: {len(todas)} ({min(p[0] for p in todas)} a {max(p[0] for p in todas)})')
for nave, ps in purgas.items():
    print(f'  {nave}: {len(ps)} purgas, {sum(p[2] for p in ps):.0f} m³ en total')
vol = resumen([p[2] for p in todas])
ritmo = resumen([p[2] / p[1] for p in todas if p[1]])
dur = resumen([p[1] for p in todas if p[1]])
print(f'  Volumen por purga: mediana {vol["mediana"]:.0f} m³ ({vol["min"]:.0f}–{vol["max"]:.0f})')
print(f'  Duración: mediana {dur["mediana"]:.2f} h ({dur["min"]:.2f}–{dur["max"]:.2f})')
print(f'  Lodo retirado por hora de purga: mediana {ritmo["mediana"]:.0f} m³/h')

# ── Subida del lodo: intervalos entre purgas seguidas con datos de sólidos y caudal todos los días
print('\n== Intervalos entre purgas con datos completos (marzo 2026)')
puntos = []  # (sólidos×caudal medio, cm/h de subida, nave)
for nave, ps in purgas.items():
    ps.sort()
    for (d0, _, _), (d1, _, v1) in zip(ps, ps[1:]):
        dias = [d0 + dt.timedelta(n) for n in range((d1 - d0).days)]
        if not dias or any(d not in sst or d not in caudal for d in dias):
            continue
        carga = st.mean(sst[d] * caudal[d] for d in dias)  # (g/L)·(m³/s)
        subida = v1 / AREA_NAVE_M2 * 100 / (len(dias) * 24)  # cm/h
        toneladas = sum(sst[d] * caudal[d] * 86.4 for d in dias) / 3  # parte de la nave
        puntos.append((carga, subida, nave))
        print(f'  {nave} {d0}→{d1} ({len(dias)} d): sólidos×caudal {carga:5.2f} · {v1:4.0f} m³ · '
              f'{subida:.2f} cm/h · {v1 / toneladas:.2f} m³ por t que entra')

# Peso de cada nave: su lodo por unidad de carga frente al de las tres juntas (cociente de sumas,
# así un intervalo largo pesa lo que dura y no lo que sube).
k0 = sum(s for _, s, _ in puntos) / sum(c for c, _, _ in puntos)
pesos = {}
for nave in purgas:
    mios = [(c, s) for c, s, n in puntos if n == nave]
    pesos[nave] = sum(s for _, s in mios) / sum(c for c, _ in mios) / k0
    print(f'  {nave}: recibe {pesos[nave]:.2f} × el promedio ({len(mios)} intervalos)')

# ── Subida en época seca: purgas de setiembre (supone julio y agosto parecidos a setiembre).
# Da la subida que queda aunque casi no entren sólidos: la ordenada de la recta.
print('\n== Época seca')
carga_seca = st.median(sst[d] * caudal[d] for d in sst if d.month == 9 and d in caudal)
secas = []
for nave, ps in purgas.items():
    for (d0, _, _), (d1, _, v1) in zip(ps, ps[1:]):
        if d1.month == 9:
            subida = v1 / AREA_NAVE_M2 * 100 / ((d1 - d0).days * 24)
            secas.append(subida / pesos[nave])
            print(f'  {nave} {d0}→{d1}: {subida:.3f} cm/h medido')
b = max(0, st.mean(secas) - k0 * carga_seca)
k = (sum(s for _, s, _ in puntos) - len(puntos) * b) / sum(c for c, _, _ in puntos)
print(f'\n== Resultado: subida media por nave (cm/h) = {b:.3f} + {k:.4f} × sólidos(g/L) × caudal(m³/s)')
for nave, ps in purgas.items():
    print(f'   peso {nave}: {pesos[nave]:.2f}')
for nombre, mes in (('lluvias', 3), ('seca', 9)):
    s_med = st.median(v for d, v in sst.items() if d.month == mes)
    q_med = st.median(v for d, v in caudal.items() if d.month == mes and v > 0)
    print(f'   día típico de {nombre}: {b + k * s_med * q_med:.2f} cm/h')

# ── Purga: coeficiente de bajadaPorPurgaCmMin = c · apertura · √(nivel/150), con la apertura típica
# de 20 cm y una purga del 85 % al 20 % de 250 cm, para que saque lodo al ritmo medido.
ALTO, BAJO, APERTURA = 0.85 * 250, 0.20 * 250, 20
cm_min = ritmo['mediana'] / AREA_NAVE_M2 * 100 / 60
c = cm_min * (150 ** 0.5) * 2 * (ALTO ** 0.5 - BAJO ** 0.5) / (APERTURA * (ALTO - BAJO))
print(f'   purga: {cm_min:.2f} cm/min → coeficiente {c:.3f} (purga típica de {ALTO - BAJO:.0f} cm en {(ALTO - BAJO) / cm_min:.0f} min)')

# ── Eficiencia: qué parte de los sólidos que entran se queda en las naves.
# Lodo asentado por tonelada que entra (las 3 naves) × densidad del lodo asentado (supuesto, no medida).
DENSIDAD_LODO = 1.4  # t/m³, sedimento recién depositado
m3_por_t = k * AREA_NAVE_M2 / 100 * 3 / 3.6
print(f'\n== Eficiencia: {m3_por_t:.3f} m³ de lodo por t que entra → retiene ~{m3_por_t * DENSIDAD_LODO:.0%}'
      f' (con {DENSIDAD_LODO} t/m³; {m3_por_t * 1.1:.0%}–{m3_por_t * 1.6:.0%} entre 1.1 y 1.6 t/m³)')
ws_sst = hoja('R2_ Concentraciones SST.xlsx')
for nombre, cb, ce in (('marzo', 1, 2), ('setiembre', 5, 6)):
    pares = [(f[cb], f[ce]) for f in ws_sst.iter_rows(min_row=4, values_only=True) if es_num(f[cb]) and es_num(f[ce])]
    print(f'   R2 {nombre}: salida (Entrada a Embalse Palo Verde) ÷ bocatoma = {sum(b for _, b in pares) / sum(a for a, _ in pares):.2f}'
          ' (la muestra del embalse puede incluir el lodo purgado que baja por la quebrada)')
