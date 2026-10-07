---
name: create-preset
description: Crea un preset de vitrina por rubro (ropa, comida, cosmética...) como configuración validada contra el Store Config schema, con story y capturas; úsala cuando un rubro nuevo necesita verse profesional sin tocar nada.
---

# create-preset

## Cuándo usarla
- Sprint 1 (preset 1) y Sprint 2 (preset 2 según el rubro de la primera tienda real).
- Un rubro nuevo no se resuelve bien con los presets existentes.
- Aplica antes la regla central de `AGENTS.md` §12: si basta ajustar un preset existente, ajústalo.

## Entradas
- Rubro y 3 a 5 tiendas reales de Instagram del rubro como referencia de necesidades (se traducen a componentes propios, nunca se copian textos, fotos ni código).
- Registro: `src/modules/storefront/components.registry.ts` y sus esquemas de props.
- Store Config schema vigente (`schemaVersion`) y `docs/design/tokens.md`.

## Pasos
1. Define qué necesita comprar el cliente del rubro (ej. ropa: tallas y colores; comida: horarios y pedido mínimo; cosmética: ingredientes). Anótalo en el spec del preset.
2. Elige solo componentes que ya existan en el registro. Si falta uno, abre issue para `add-storefront-component` con tu `component-spec`; no inventes HTML.
3. Crea `src/modules/store-config/presets/<rubro>.ts` exportando un objeto tipado `StoreConfigPreset`: `id`, `label`, `schemaVersion`, `theme` (solo referencias a tokens), `pages.home.sections[]` (orden fijo con `component` + `props` + `variant`), `catalog` (columnas 2 en 375px), `checkout` (WhatsApp visible siempre), `flags`.
4. Orden recomendado de home: header con WhatsApp, hero, categorías, destacados, confianza/envíos, footer. Máximo 7 secciones.
5. Validación: `StoreConfigSchema.parse(preset.config)` en un test Vitest (`<rubro>.preset.test.ts`) que además verifica: todos los `component` existen en el registro, cada `props` pasa su esquema Zod, `schemaVersion` es el actual, y no hay colores/px sueltos.
6. Textos por defecto en es-CL con tono de `brand.md`, con placeholders claros ("Tu producto aquí"), nunca lorem ipsum.
7. Contraste: corre `deriveTheme` sobre la paleta del preset y 5 colores de vendedor de prueba; todos ≥ AA.
8. Story `Presets/<Rubro>` en Storybook que renderiza la vitrina completa con datos semilla del rubro (12 productos, uno con nombre largo, uno sin imagen, uno agotado).
9. Capturas con Playwright desde la story o `/__preview`: `docs/design/presets/<rubro>-375.png` y `<rubro>-1280.png`. Verifica sin scroll horizontal a 375px.
10. Corre `visual-review` sobre el preset y documenta en `docs/design/presets/<rubro>.md`: rubro, componentes, orden, variantes, tokens, capturas.

## Salida
```
PRESET <rubro>
Archivo: src/modules/store-config/presets/<rubro>.ts
Componentes: <lista ordenada>
Validación schema: OK (schemaVersion N)
Contraste AA: OK
Story: Presets/<Rubro>
Capturas: 375px, 1280px
Componentes faltantes: <issues VIT-xxx o ninguno>
```

## Checklist
- [ ] Solo componentes del registro; cero HTML libre.
- [ ] Parsea con el schema actual (test verde).
- [ ] Mobile first: 375px primero, botón WhatsApp visible.
- [ ] Datos semilla incluyen casos raros (texto largo, sin imagen, agotado).
- [ ] Capturas y doc del preset commiteados.

## Errores comunes
- Copiar la estructura exacta de una tienda real de referencia.
- Dejar un preset "bonito" que solo funciona con fotos perfectas.
- Hardcodear colores en vez de tokens.
- Olvidar subir `schemaVersion` cuando cambia la forma del config (y su migración).
- Preset de 12 secciones: el vendedor no lo va a editar y la página pesa.
