---
name: brand
description: Crea la marca VitrinIA (logo SVG propio, paleta, tipografía de Google Fonts y tono de voz chileno cercano); úsala en el Sprint 1 o cuando cambie la identidad visual.
---

# brand

## Cuándo usarla
- Sprint 1: primera versión de la marca.
- Cambios de logo, paleta, tipografía o tono aprobados por Cesar.
- Antes de `design-tokens` y `create-preset` (ambas leen `docs/design/brand.md`).

## Entradas
- `docs/VITRINIA.md` §1 (propuesta de valor, Chile, es-CL, free first).
- `docs/producto/COMPETENCIA.md` (para diferenciarse, nunca para copiar).
- Issue VIT-xxx con restricciones (ej. dominio `vitrinia.cl`, pendiente INAPI).

## Pasos
1. Lee `docs/design/` y `docs/producto/COMPETENCIA.md`. Anota 3 marcas competidoras (Take App, Kyte, Tiendanube) y qué NO harás parecido: colores dominantes, formas, nombres de tipografía.
2. Define personalidad en 3 adjetivos y 3 anti-adjetivos (ej. cercana, ordenada, ágil / corporativa, infantil, genérica). Escríbelos en `brand.md`.
3. Diseña el logo desde cero como SVG a mano: isotipo (idea: vitrina/ventana + chispa) y versión horizontal. Reglas: `viewBox` definido, sin `<image>` ni fuentes embebidas (texto convertido a `<path>`), `fill="currentColor"` en la versión monocroma, máximo 3 colores.
4. Guarda assets en `public/brand/`: `logo.svg`, `logo-mono.svg`, `isotipo.svg`, `favicon.svg`, `og-image.svg`. Verifica que cada uno pese < 8 KB y se vea nítido a 16px, 32px y 256px.
5. Paleta: 1 color primario, 1 acento, neutros (escala 50–900), y semánticos (success, warning, danger, info). Cada par texto/fondo declarado debe cumplir WCAG AA (4.5:1 texto normal, 3:1 texto grande). Calcula con el script de `design-tokens`, no a ojo.
6. Tipografía: una fuente de títulos y una de texto desde Google Fonts, ambas con soporte de `ñ`, tildes y `¿¡`. Usa `next/font/google` con `display: "swap"` y solo los pesos usados (máx. 4). Define escala y line-height.
7. Tono de voz: guía en español de Chile, tuteo, frases cortas, sin modismos que excluyan ni groserías. Incluye 10 microtextos de ejemplo (botón primario, vacío de catálogo, error de red, éxito al publicar, WhatsApp) y una lista "decimos / no decimos".
8. Escribe `docs/design/brand.md` con: esencia, logo (uso mínimo, zona de respeto, prohibidos), paleta con ratios de contraste, tipografía, tono, y sección "Originalidad" que lista qué se verificó para no copiar.
9. Propón los valores a `design-tokens` como issue o PR enlazado; no los escribas tú en `src/` si no es tu alcance.

## Salida
`docs/design/brand.md` con la plantilla:
```
# Marca VitrinIA
## Esencia (3 adjetivos / 3 anti-adjetivos)
## Logo (variantes, tamaños mínimos, zona de respeto, prohibidos)
## Paleta (token, hex, uso, ratio AA)
## Tipografía (familia, pesos, escala)
## Tono de voz (reglas + 10 microtextos + decimos/no decimos)
## Originalidad (qué se revisó, fecha)
```
Más los SVG en `public/brand/`. Cierra con HANDOFF.

## Checklist
- [ ] SVG propios, sin raster ni fuentes embebidas.
- [ ] Legible a 16px.
- [ ] Todos los pares de color con ratio AA documentado.
- [ ] Fuentes con `ñ` y tildes, vía `next/font`.
- [ ] Tono con ejemplos reales, en es-CL.
- [ ] Sección "Originalidad" completa.
- [ ] Pendiente INAPI/Instagram anotado en `docs/PENDIENTES.md`, no resuelto por ti.

## Errores comunes
- Inspirarse tanto en un competidor que el logo se parece (revisa lado a lado).
- Elegir color de marca bonito pero con texto blanco a 3:1.
- Cargar 8 pesos de fuente y romper el presupuesto de JS/LCP.
- Tono "gringo" traducido (usted/vos mezclados) o jerga que no entiende un adulto mayor.
- Prometer la marca como registrada: aún no lo está.
