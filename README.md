# AquaMind · Desarenador Miraflores

Prototipo de interfaz (solo frontend, datos simulados) del sistema de telemetría y control adaptativo del Desarenador Miraflores de H2Olmos.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir http://localhost:5173 → Panel de monitoreo. El sistema de diseño está en `#/diseno`.

**Modo demo:** botón «Modo demo» en la barra lateral (Simulación), en el encabezado (tablet) o en el menú de perfil (celular). Recorre en ~60 s: lluvias → sube el lodo de la Nave 2 → alerta en pantalla y por Telegram → recomendación → purga confirmada → la compuerta abre y el lodo baja → volumen purgado y plan de bombeo → bombeo → energía ahorrada frente a 8 h fijas. Se puede pausar, reiniciar y salir. El guion está en `src/demo/guionDemo.ts`.

## Cómo está armado

- `src/data/DataSource.ts`: interfaz única de datos de planta. Hoy la implementa `SimuladorDataSource` (1 s = 1 min, escenarios Época seca / Lluvias / El Niño); para la planta real basta con otra implementación en `src/data/fuente.ts`.
- `src/logic/`: controlador difuso (urgencia 0–100 y la regla en palabras), gemelo digital (subida del lodo, volumen purgado, agua usada) y plan de bombeo (bomba de menor kWh/m³ primero, evita la hora punta).
- `src/notify/Notifier.ts`: interfaz única de avisos. Hoy la implementa `VistaPreviaNotifier` (vista previa en la pantalla Alertas); `TelegramBotNotifier` ya arma el mensaje con botones para la Bot API y se activa en `src/notify/notificador.ts` (el token debe vivir en un servidor).
- `src/features/vista3d/`: vista 3D (React Three Fiber), **apagada por ahora** (`FUNCIONES.vista3d` en `src/config/funciones.ts`). Al encenderla aparece el botón «Vista 3D»; se descarga solo al pedirla y, si falta WebGL o falla el dibujo, vuelve al plano 2D.
- `src/data/historico.ts`: 30 días de historia previa (purgas, bombeos, lecturas de miras, notas) para que la bitácora y el informe del mes tengan datos desde el inicio.
- `src/logic/pronostico.ts`: horas al crítico y resumen semanal por escenario (purgas, lodo, agua, energía y ahorro) con el mismo gemelo digital.
- `src/app/permisos.ts`: qué ve y qué puede hacer cada perfil (Técnico, Jefatura, Gerencia).
- `src/logic/calibracion.ts` y `src/features/calibracion/`: Calibración y laboratorio (M7). Compara los sensores con laboratorio, miras y batimetrías; si la diferencia pasa la tolerancia, jefatura aprueba la corrección.
- `src/logic/configuracion.ts` y `src/features/configuracion/`: Configuración y seguridad (M8). Niveles críticos, hora punta y tarifa (con motivo obligatorio), usuarios y permisos, y el registro de auditoría de cada orden.
- `src/lib/excel.ts`: arma los Excel (.xlsx) de Bitácora, Informes y Auditoría en el navegador; se descarga solo al exportar.

## Revisión visual

Con `npm run dev` en marcha:

```bash
npm run capturas -- panel
npm run capturas -- pronostico --perfil=gerencia
node scripts/flujo-panel.mjs
node scripts/flujo-purgas.mjs
node scripts/flujo-bombeo.mjs
node scripts/flujo-alertas.mjs
node scripts/flujo-pronostico.mjs
node scripts/flujo-bitacora.mjs
node scripts/flujo-calibracion.mjs
node scripts/flujo-configuracion.mjs
node scripts/flujo-demo.mjs            # añadir --celular para 390 px
```

`capturas` guarda pantallas a 1920×1080 y 390 px, en modo oscuro y claro, en `capturas/<ruta>/` (añadir `--secciones` en `diseno`). `flujo-panel` recorre lluvias → recomendación → purga en 3 toques → volumen → bombeo → mando manual → perfil Gerencia y guarda cada estado en `capturas/flujo/`; `flujo-purgas` hace lo mismo en la pantalla de Purgas (seguimiento en vivo, resultado, programar y límites del Automático) en `capturas/flujo-purgas/`, y `flujo-bombeo` recorre purga → plan → bombeo → encendido manual → detener en `capturas/flujo-bombeo/`, y `flujo-alertas` muestra una alerta crítica que llega, se reconoce desde la vista previa de Telegram y entra deslizándose en otra pantalla (`capturas/flujo-alertas/`). `flujo-pronostico` recorre Pronóstico como Gerencia (escenario actual, Lluvias, El Niño a 7 días). `flujo-bitacora` filtra la bitácora, registra una lectura de miras y descarga los Excel de la bitácora y del informe mensual en `capturas/flujo-bitacora/`. `flujo-calibracion` carga resultados, valida entradas y aprueba calibraciones como Jefatura; `flujo-configuracion` cambia parámetros con motivo, revisa la auditoría y su Excel, y comprueba que el técnico no entra. `flujo-demo` corre el Modo demo completo, prueba la pausa y guarda una captura por paso. (Con la vista 3D encendida, `flujo-3d.mjs` y `medir-fps-3d.mjs` la revisan.) La primera vez hay que instalar el navegador con `npx playwright install chromium`.

## Rendimiento

```bash
node scripts/medir-rendimiento.mjs --lento     # navegación, cuadros por segundo y uso del procesador (CPU 4× más lenta)
node scripts/perfil-cpu.mjs panel --lento      # qué funciones y tareas del navegador consumen el tiempo
```

Para medir la versión de producción: `npm run build && npm run preview` y pasar `http://localhost:4173` (o `URL_BASE=http://localhost:4173` en `perfil-cpu`).
