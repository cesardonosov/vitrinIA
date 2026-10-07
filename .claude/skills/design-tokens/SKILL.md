---
name: design-tokens
description: Define y mantiene los design tokens como única fuente de verdad (color, tipografía, espaciado, radios, sombras) en código y Tailwind, con contraste AA verificado automáticamente incluso para colores elegidos por el vendedor.
---

# design-tokens

## Cuándo usarla
- Al crear o cambiar cualquier valor visual (color, fuente, espacio, radio, sombra).
- Cuando una vitrina permite al vendedor elegir un color de marca.
- Si encuentras un hex, `px` o `rgb()` suelto en un componente.

## Entradas
- `docs/design/brand.md` (paleta y tipografía aprobadas).
- Store Config schema (`src/modules/store-config/domain/`), campo del color del vendedor.

## Pasos
1. Crea/actualiza `src/shared/design/tokens.ts` como única fuente, tipada con `as const`: `color`, `font`, `fontSize`, `space`, `radius`, `shadow`, `breakpoint`. Sin dependencias de React.
2. Tailwind consume los tokens: en `tailwind.config.ts` importa `tokens` y mapea `theme.extend`. Prohibido valores arbitrarios (`bg-[#ff0000]`, `p-[13px]`); configura Biome o una regla de lint para detectarlos.
3. Para temas de vitrina expón tokens como CSS variables (`--color-primary`, `--color-on-primary`...) generadas desde `tokens.ts` o desde el Store Config validado; los componentes usan solo `bg-primary`, `text-on-primary`.
4. Escribe `src/shared/design/contrast.ts` (función pura): `contrastRatio(fg, bg): number` según WCAG 2.1 (luminancia relativa) y `pickOnColor(bg): "#fff" | "#111"`.
5. Color del vendedor: al guardar el Store Config, `deriveTheme(sellerColor)` calcula `on-primary` y, si ningún texto llega a 4.5:1, ajusta la luminosidad del primario (HSL) hasta cumplir y devuelve el color corregido. Nunca se persiste un tema con ratio < 4.5:1 (3:1 solo para texto grande ≥ 24px o 18.66px bold).
6. Tests con Vitest (`contrast.test.ts`): ratio conocido (negro/blanco = 21), casos límite (`#767676` sobre blanco = 4.54), property test con 1000 colores aleatorios: `deriveTheme` siempre produce ratio ≥ 4.5 para texto y ≥ 3 para bordes/foco.
7. Test de tokens de marca: recorre todos los pares declarados en `tokenPairs` (texto/fondo) y falla si alguno baja de AA. Corre en CI con `pnpm test`.
8. Storybook: story `Tokens/Overview` que renderiza colores con su ratio, escala tipográfica, espaciado, radios y sombras; usa el addon a11y.
9. Busca fugas: `rg "#[0-9a-fA-F]{3,8}\b|\[[0-9]+px\]" src --glob '!**/tokens.ts'` debe dar 0 resultados (salvo SVGs de marca).
10. Si cambia un token, documenta en `docs/design/tokens.md` y revisa con `visual-review` a 375px.

## Salida
- `tokens.ts`, `contrast.ts`, tests, story y `docs/design/tokens.md`.
- Resumen:
```
TOKENS
Cambiados: <lista>
Pares AA verificados: N/N
Colores de vendedor: property test OK (1000 casos)
Fugas detectadas: 0
```

## Checklist
- [ ] Un solo archivo de verdad; Tailwind y CSS vars derivan de él.
- [ ] Cero valores arbitrarios en componentes.
- [ ] `deriveTheme` corrige y nunca persiste un color ilegible.
- [ ] Foco visible con contraste ≥ 3:1 contra el fondo.
- [ ] Tests y story actualizados.

## Errores comunes
- Duplicar el hex en `globals.css` "por rapidez".
- Calcular contraste con luminancia sin linealizar sRGB.
- Verificar solo el modo claro del tema, o solo el estado normal (hover/disabled también cuentan).
- Rechazar el color del vendedor en vez de corregirlo: el vendedor no debe ver un error técnico.
- Olvidar texto sobre imagen: exige overlay con ratio garantizado.
