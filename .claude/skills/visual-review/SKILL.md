---
name: visual-review
description: Revisa pantallas con Playwright en 375px, 768px y desktop (capturas, overflow horizontal, contraste, jerarquía, tokens) y emite veredicto con hallazgos; úsala antes de aprobar cualquier cambio de UI.
---

# visual-review

## Cuándo usarla
- Antes de aprobar un componente, preset o pantalla nueva.
- Tras cambios de tokens o de marca.
- Antes de cada demo (junto al Explorer).

## Entradas
- URL de la pantalla o story (`http://localhost:6006/?path=/story/...` o `http://tutienda.localhost:3000`).
- `component-spec` correspondiente y `docs/design/tokens.md`.
- App y Postgres de test levantados (`docker compose up`).

## Pasos
1. Crea/usa `tests/e2e/visual/<pantalla>.visual.spec.ts` con Playwright. Viewports: `{width:375,height:812}`, `{width:768,height:1024}`, `{width:1280,height:800}`. Siempre empieza por 375.
2. Captura `fullPage` en cada viewport a `docs/qa/visual/<pantalla>-<ancho>.png`; no commitees capturas de datos reales de vendedores.
3. Overflow horizontal, assert automático:
   ```ts
   const overflow = await page.evaluate(
     () => document.documentElement.scrollWidth > document.documentElement.clientWidth
   );
   expect(overflow).toBe(false);
   ```
   Si falla, localiza el elemento culpable (`el.getBoundingClientRect().right > innerWidth`) y repórtalo.
4. Contraste y accesibilidad: corre `@axe-core/playwright` con tags `wcag2aa`; 0 violaciones `color-contrast`. Revisa a mano texto sobre imágenes.
5. Tamaño táctil: verifica que botones y links interactivos midan ≥ 44x44px a 375px con `boundingBox()`.
6. Consistencia con tokens: busca estilos computados fuera de la escala (`getComputedStyle` de colores y `border-radius`) y compáralos con `tokens.ts`; cualquier valor no tokenizado es hallazgo.
7. Datos extremos: renderiza con producto de nombre largo, emojis, sin imagen, agotado, 0 productos y 100 productos. Capturas de cada uno.
8. Jerarquía: ¿se entiende en 3 segundos qué vende la tienda, cuánto cuesta y cómo comprar? ¿El botón de WhatsApp y el carrito están visibles y al alcance del pulgar? ¿Un solo CTA primario por vista?
9. Revisa estados: foco con teclado (Tab), hover solo en desktop, cargando y error.
10. Clasifica hallazgos: BLOQUEANTE (overflow, ilegible, CTA oculto), IMPORTANTE (incoherencia con tokens, jerarquía débil), MENOR (pulido). Cada uno con captura y propuesta.

## Salida
```
VISUAL REVIEW <pantalla> — <fecha>
Veredicto: APROBADO | CAMBIOS REQUERIDOS
Viewports: 375 ✔/✘ · 768 ✔/✘ · 1280 ✔/✘
Overflow horizontal: no | sí (<selector>)
axe color-contrast: 0 violaciones | N
Hallazgos:
 1. [BLOQUEANTE] <qué> — captura <ruta> — sugerencia
Siguiente dueño: Builder | Designer
```

## Checklist
- [ ] Las tres resoluciones capturadas, 375px primero.
- [ ] Sin scroll horizontal en ninguna.
- [ ] axe sin violaciones AA.
- [ ] Botones ≥ 44px.
- [ ] Probado con datos extremos y vacío.
- [ ] Solo tokens; hallazgos con captura.

## Errores comunes
- Revisar solo en desktop y "achicar la ventana" sin emular touch (usa `isMobile: true, hasTouch: true`).
- Capturar con fuentes sin cargar: espera `document.fonts.ready`.
- Aprobar con datos perfectos; el caso real es la foto mala y el texto largo.
- Corregir tú el código: el Designer reporta, el Builder implementa.
- Capturas con animaciones activas: usa `reducedMotion: "reduce"` para que sean estables.
