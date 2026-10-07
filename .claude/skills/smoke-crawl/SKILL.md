---
name: smoke-crawl
description: Ejecuta o extiende el crawler Playwright sin IA que recorre el portal y una vitrina de prueba en móvil y desktop, aprieta todo y reporta errores; úsala tras cada merge a main y antes de cada demo.
---

# smoke-crawl

Fuente: agente `explorer`. Determinista, barato y sin IA: encuentra lo roto para que las sesiones de exploración se dediquen a lo raro.

## Cuándo usarla

- Después de cada merge a main y siempre antes de una demo.
- Tras cambiar rutas, navegación o formularios.

## Entradas

- App corriendo en local (`pnpm dev` o build de prod) con BD de test aislada; nunca producción ni datos reales.
- Tienda de prueba sembrada: `pnpm seed:test-store smoke` → `http://smoke.localhost:3000`.
- Script: `tests/smoke/crawl.ts`. Salida: `tests/smoke/output/`.

## Pasos

1. Ejecuta: `pnpm exec tsx tests/smoke/crawl.ts --base=http://localhost:3000 --store=http://smoke.localhost:3000`. Corre dos veces: perfil `mobile` (375x812) primero y `desktop` (1280x800).
2. Descubre rutas: parte de `/` y de la home de la tienda, extrae `a[href]` internos (mismo host), normaliza, deduplica y limita a profundidad 4 y 200 páginas. Añade rutas conocidas de `src/app` (login, onboarding, panel, carrito).
3. En cada página: registra `console.error`, `pageerror`, respuestas `>= 400`, `requestfailed`, imágenes con `naturalWidth === 0`, y overflow horizontal (`document.documentElement.scrollWidth > innerWidth`).
4. Aprieta cada `button`, `[role=button]` y link: compara antes/después (URL, DOM hash, diálogos, red). Si no cambia nada, marca "botón sin efecto". Evita acciones destructivas (logout, borrar) y no navegues fuera del host; vuelve con `page.goBack()` o reabre la ruta.
5. Formularios: llena dos juegos de datos, válidos (nombre, email `smoke+n@example.test`, teléfono +56912345678) y raros (emoji, tilde, 5.000 caracteres, `<b>x</b>`, espacios). Envía y registra respuesta y errores de validación visibles; un 500 o éxito con datos basura es hallazgo.
6. Guarda por hallazgo captura `tests/smoke/output/<perfil>/<slug>-<n>.png` y un `report.json` con la forma abajo.
7. Lee `report.json`, descarta falsos positivos (anota por qué), prioriza y reporta con `bug-report`.

## Esqueleto

```ts
import { chromium, devices, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

type Finding = { profile: string; url: string; kind: 'console' | 'http' | 'dead-button'
  | 'broken-image' | 'overflow' | 'form'; detail: string; screenshot?: string };
const out = 'tests/smoke/output';
const profiles = { mobile: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 } } };

async function crawl(profile: keyof typeof profiles, bases: string[]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(profiles[profile]);
  const page = await ctx.newPage();
  const findings: Finding[] = [];
  const seen = new Set<string>(); const queue = [...bases];
  page.on('console', m => m.type() === 'error' && add('console', m.text()));
  page.on('response', r => r.status() >= 400 && add('http', `${r.status()} ${r.url()}`));
  let current = '';
  const add = (kind: Finding['kind'], detail: string) => findings.push({ profile, url: current, kind, detail });
  while (queue.length && seen.size < 200) {
    current = queue.shift()!; if (seen.has(current)) continue; seen.add(current);
    await page.goto(current, { waitUntil: 'networkidle' });
    // TODO: links -> queue, images, overflow, buttons, forms (see steps 2-5)
  }
  mkdirSync(`${out}/${profile}`, { recursive: true });
  writeFileSync(`${out}/report-${profile}.json`, JSON.stringify(findings, null, 2));
  await browser.close();
}
```

(Al implementar, no dejes `TODO` suelto: usa `TODO(VIT-xxx)` con issue abierto.)

## Salida

`tests/smoke/output/report-<perfil>.json` + capturas. Resumen: `rutas: N · hallazgos: N (console X, http Y, dead-button Z, image W, overflow V)`.

## Checklist

- [ ] Ambos perfiles, móvil primero.
- [ ] Portal y vitrina cubiertos; sin salir del host.
- [ ] Formularios con datos válidos y raros.
- [ ] Reporte JSON y capturas guardados; hallazgos triados.
- [ ] Ninguna acción contra producción.

## Errores comunes

- Dejar que el crawler haga clic en logout o borrar y quede sin sesión.
- `waitForTimeout` en vez de esperar red o DOM.
- Contar como error el 404 esperado de `/favicon.ico` sin triar.
- Reportar 40 duplicados: agrupa por causa.
