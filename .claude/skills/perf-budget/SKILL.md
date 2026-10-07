---
name: perf-budget
description: Mide y hace cumplir el presupuesto de performance de la vitrina (LCP < 2,5 s en 4G simulado, JS < 100 KB, imágenes WebP responsivas); úsala al cambiar la vitrina, imágenes, dependencias de cliente o antes de una demo.
---

# perf-budget

Fuente: agente `qa`, VITRINIA.md §5 y §6.1 (mobile first). Los clientes de los vendedores llegan desde Instagram con celular y datos móviles: la velocidad es producto.

## Cuándo usarla

- PR que toque `src/app/(vitrina)`, componentes de vitrina, imágenes, fuentes o dependencias de cliente.
- Antes de cada demo y cuando Renovate suba una dependencia que llega al bundle.

## Entradas

- App en modo producción: `pnpm build && pnpm start` (nunca `pnpm dev`, distorsiona todo).
- Tienda sembrada con 30 productos con foto (`makeStore({ products: 30 })`) en `http://tienda.localhost:3000`.
- Presupuesto en `tests/perf/budget.json`.

## Pasos

1. Fija el presupuesto en `tests/perf/budget.json`: `{ "lcpMs": 2500, "jsKbGzip": 100, "cls": 0.1, "images": "webp-responsive" }`. Cambiarlo requiere ADR.
2. Mide con Lighthouse móvil (4G lento simulado, CPU x4): `pnpm exec lighthouse http://tienda.localhost:3000 --preset=perf --form-factor=mobile --throttling-method=simulate --output=json --output-path=tests/perf/output/home.json`. Repite en catálogo, ficha de producto y carrito. Corre 3 veces y toma la mediana.
3. Mide en campo local con `web-vitals` en un test Playwright (viewport 375x812, CDP `Network.emulateNetworkConditions` con 1,6 Mbps, 150 ms RTT): inyecta `onLCP`, `onCLS`, `onINP` y lee los valores con `page.evaluate`.
4. JS de la vitrina: suma los `.js` transferidos de la ruta con `page.on('response')` y compara el total gzip/brotli (`content-length`) contra 100 KB. Para diagnosticar, `pnpm exec next experimental-analyze` o `ANALYZE=true pnpm build`.
5. Imágenes: en cada `<img>` verifica `srcset` y `sizes`, formato WebP (`content-type: image/webp`), dimensiones `width`/`height` (evita CLS), `loading="lazy"` salvo la imagen LCP (`fetchpriority="high"`), y que ninguna se descargue a más de 2x su tamaño renderizado.
6. Escribe el test `tests/perf/vitrina.spec.ts` que falle si cualquier métrica supera el presupuesto, para que corra en CI (job `perf` de GitHub Actions, informado a DevOps; no editas `.github/workflows`).
7. Si falla, diagnostica en este orden: (a) imagen LCP sin prioridad o sin variante pequeña; (b) JS de cliente innecesario: mueve a Server Component, `dynamic()` import, elimina librería; (c) fuente web bloqueante: `font-display: swap` o fuente del sistema; (d) consultas lentas del servidor (TTFB > 600 ms): reporta al Builder; (e) terceros (analytics, Turnstile solo debe cargar en formularios).
8. Reporta con `bug-report` si el origen es código; no optimices código de la app (eres QA).

## Salida

```
PERF <ruta> · mobile 4G simulado
LCP: 2.1 s (≤2.5) ✔ · CLS: 0.02 ✔ · INP: 140 ms ✔
JS gzip: 84 KB (≤100) ✔ · Imágenes no WebP/sin srcset: 0 ✔
Fallas: <métrica> → VIT-xxx
```

## Checklist

- [ ] Build de producción, no dev.
- [ ] Mediana de 3 corridas por ruta (home, catálogo, ficha, carrito).
- [ ] LCP < 2,5 s, JS < 100 KB, CLS < 0,1.
- [ ] Todas las imágenes WebP con `srcset`/`sizes` y dimensiones.
- [ ] Test de presupuesto en CI.

## Errores comunes

- Medir en `pnpm dev` o con caché caliente.
- Medir en desktop y sin throttling.
- Contar JS sin comprimir o excluir chunks cargados tras la hidratación.
- Probar con 2 productos: el catálogo real tiene decenas.
- "Arreglar" subiendo el presupuesto sin ADR.
