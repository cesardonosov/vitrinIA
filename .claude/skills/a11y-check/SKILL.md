---
name: a11y-check
description: Auditoría de accesibilidad con axe-core y Playwright en cada pantalla (contraste AA con colores del vendedor, foco, teclado, targets 44px, alt); úsala en toda pantalla nueva o modificada del portal y la vitrina.
---

# a11y-check

Fuente: VITRINIA.md §3, §11.3 (accesibilidad en el DoD). Los colores y textos los elige el vendedor: el contraste no se puede asumir.

## Cuándo usarla

- Pantalla nueva o cambio visual en portal o vitrina; nuevo preset o tokens (coordina con Designer).
- Antes de cada demo y en el DoD de cualquier issue con UI.

## Entradas

- App local, tienda sembrada, y lista de pantallas: landing, formulario "Pide tu tienda", login, panel de productos, y en la vitrina home, catálogo, ficha, carrito y checkout.
- `@axe-core/playwright` instalado.
- Fixtures de colores del vendedor: `tests/a11y/seller-colors.ts` (claro sobre claro, saturados, cercanos a 4.5:1, blanco puro, negro puro).

## Pasos

1. Crea `tests/a11y/<pantalla>.spec.ts` con helper común:
   ```ts
   import AxeBuilder from '@axe-core/playwright';
   const results = await new AxeBuilder({ page })
     .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
     .analyze();
   expect(results.violations).toEqual([]);
   ```
2. Corre cada pantalla en móvil 375x812 y luego desktop, y en sus estados: vacío, con error de formulario, modal/drawer del carrito abierto, producto sin foto.
3. Contraste AA (4,5:1 texto, 3:1 texto grande y componentes UI): ejecuta la vitrina con cada color de `seller-colors.ts` como color primario y de acento. Si el vendedor elige un color que no cumple, el sistema debe corregir (texto sobre color calculado) o rechazarlo; reporta si se publica ilegible.
4. Foco visible: recorre con `page.keyboard.press('Tab')` y verifica que cada elemento interactivo muestre indicador (compara `outline` con `toHaveCSS` o captura). El orden de foco debe seguir el orden visual.
5. Teclado: completa el flujo vitrina → agregar al carrito → pedir solo con teclado (`Tab`, `Enter`, `Space`, `Escape` cierra drawers y devuelve el foco al disparador). Sin trampas de foco.
6. Targets táctiles: mide con `locator.boundingBox()` todos los botones/links/inputs en 375x812; mínimo 44x44 px (incluye cantidad +/- y cerrar).
7. Textos alternativos: toda `<img>` de producto con `alt` significativo (nombre del producto); decorativas con `alt=""`; íconos-botón con `aria-label`. Formularios con `<label>` asociado y errores con `aria-describedby`/`role="alert"`.
8. Zoom 200% y texto grande: sin pérdida de contenido ni scroll horizontal.
9. Clasifica cada hallazgo y crea issues con `bug-report`.

## Severidades

- **S1 crítico:** no se puede comprar/crear tienda con teclado o lector (trampa de foco, botón sin nombre en el checkout).
- **S2 alto:** violación axe `critical/serious`, contraste < 3:1, target < 32 px en acción principal.
- **S3 medio:** contraste entre 3:1 y 4,5:1, foco poco visible, alt genérico.
- **S4 bajo:** `moderate/minor` sin impacto en el flujo.

## Salida

```
A11Y <pantalla> [mobile|desktop]
Violaciones axe: N (critical X, serious Y) · Contraste fallido: N · Targets <44px: N
Teclado: ok/falla · Foco visible: ok/falla
Issues: VIT-xxx (S?)
```

## Checklist

- [ ] Todas las pantallas y estados, en ambos viewports.
- [ ] Colores del vendedor probados.
- [ ] Flujo de compra completo solo con teclado.
- [ ] Targets ≥ 44 px, alt y labels correctos.

## Errores comunes

- Correr axe solo sobre la página cargada sin abrir drawers, modales o errores.
- Dar por bueno el contraste del tema por defecto y no el del vendedor.
- Creer que axe detecta todo: foco y teclado se prueban a mano en el test.
