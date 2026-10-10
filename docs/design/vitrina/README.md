# Vitrina: capturas de referencia

Capturas de las stories de `src/modules/storefront/presentation/storefront.stories.tsx` (Storybook, VIT-180), tomadas con Playwright el 2026-10-10. Tienda Kanuwiñ con el preset `aves` y el catálogo semilla.

| Archivo | Qué muestra |
|---|---|
| `kanuwin-home-375.webp` | Home a 375 px |
| `kanuwin-home-1280.webp` | Home en desktop |
| `kanuwin-producto-375.webp` | Página de producto con dos formatos a 375 px |

Revisión (skill `visual-review`): sin overflow horizontal a 375 y 1280 px; axe-core 4.14 (WCAG 2.1 AA) con 0 violaciones en 6 stories (home móvil y desktop, producto, sin número de WhatsApp, preset ropa y textos largos).

Reglas de color: el texto solo usa los pares que el validador garantiza en AA (`text` sobre `background` y `onPrimary` sobre `primary`). Los colores derivados (`surface`, `border`) quedan detrás de imágenes o como líneas, nunca bajo texto.
