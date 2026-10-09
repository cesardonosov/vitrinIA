# Design tokens

Fuente única de verdad: `src/shared/design/tokens.ts` (marca "Instantánea", provisional; ver `docs/design/brand.md`). Todo lo demás se deriva de ahí. **Cambiar de marca = editar los valores de este archivo** (y los assets); los componentes no cambian.

## Cómo fluyen

```
tokens.ts  --pnpm tokens:build-->  tokens.css (@theme static de Tailwind v4 + modo oscuro)  -->  utilidades (bg-primary, text-h1, min-h-touch...)
    |--> contrast.ts (contrastRatio, pickOnColor, deriveTheme)
    |--> tokens.test.ts (todos los pares AA + sincronía de tokens.css)
```

- `src/shared/design/tokens.css` es **generado**; no se edita a mano (un test falla si se desincroniza: corre `pnpm tokens:build`). Biome lo ignora.
- `src/app/globals.css` importa Tailwind y `tokens.css`. Se resetean la paleta, fuentes, pesos, radios, sombras y breakpoints por defecto de Tailwind (`initial`), así que solo existen utilidades de tokens.
- Modo oscuro: `[data-theme="dark"]` sobreescribe solo las variables que cambian (`colorDark`). Variante Tailwind `dark:`.

## Tokens

| Grupo | Tokens (utilidad Tailwind) |
|---|---|
| Color | `primary`, `primary-hover`, `on-primary`, `accent`, `on-accent`, `link`, `link-hover`, `bg`, `surface`, `surface-warm`, `surface-tint`, `text`, `text-secondary`, `text-tertiary`, `border`, `border-strong`, `neutral-50..900`, `success/warning/danger/info` (`-50`, `-700`), `on-danger`. Ej.: `bg-primary text-on-primary`. |
| Tipografía | familias `font-display` (Gabarito), `font-body` (Albert Sans), `font-system-sans/serif/mono`; tamaños `text-h1/h2/h3/body/small` con line-height incluido. `h1` y `h2` crecen desde el breakpoint `lg` (mobile first). Cuerpo nunca menor a 16 px. |
| Espaciado | base 4 px (`p-4` = 16 px), `min-h-touch` = 44 px (área táctil mínima). |
| Radios | `rounded-none/sm/md/lg/full` |
| Sombras | `shadow-sm/md/lg` |
| Breakpoints | `sm` 40rem, `md` 48rem, `lg` 64rem (se diseña primero a 375 px) |

`border-strong` (#7c8b95) es el borde de campos e iconos de UI: 3,51:1 sobre blanco y 3,28:1 sobre nieve (WCAG 1.4.11). No usarlo sobre `neutral-100` (2,97:1). `neutral-300` y `border` son decorativos.

## Contraste AA automático

- `contrastRatio(fg, bg)`: WCAG 2.x (luminancia con sRGB linealizado).
- `pickOnColor(bg)`: blanco o casi negro (`#111111`), el de mayor contraste.
- `tokenPairs` (en `tokens.ts`): 32 pares texto/fondo (claro y oscuro), con mínimo 4,5 o 3. `tokens.test.ts` falla si alguno baja.
- **Color del vendedor:** `deriveTheme(color, { background })` devuelve `{ primary, onPrimary, adjusted }`. Garantiza `onPrimary`/`primary` >= 4,5:1 y `primary`/`background` >= 3:1 (los pares de ADR-0004 v3). El 3:1 sirve para bordes, foco e iconos: **la vitrina no debe usar `primary` como color de texto** (para texto solo se garantiza 4,5:1 con `onPrimary` sobre `primary`). Si el color no cumple, ajusta la luminosidad (HSL) conservando el tono hasta cumplir; **nunca rechaza ni muestra error técnico** al vendedor. Salida siempre `#rrggbb` en minúsculas (forma canónica de ADR-0004). Test de propiedades: 1000 colores aleatorios sobre blanco y 500 sobre fondos aleatorios.
- Pendiente de integración (Builder, módulo `store-config`): llamar `deriveTheme` antes de persistir el tema, y validar `text`/`background` con `contrastRatio`. **ADR-0008 prohíbe que el dominio y la aplicación de `store-config` importen `src/shared/design`**: mover `contrast.ts` (función pura) a `src/shared/kernel` es un seguimiento del Architect; hasta entonces `store-config` no puede llamar a `deriveTheme` desde esas capas.

## Lint: solo tokens

`biome/no-hardcoded-design-values.grit` (plugin de Biome, corre con `pnpm lint`) marca como error cualquier string, atributo JSX (`className="..."`) o fragmento de template literal con un hex (`#fff`), `rgb()/hsl()` o valor arbitrario de Tailwind (`p-[13px]`, `bg-[#fff]`). Excepciones: `src/shared/design/`, `*.test.*`, `*.stories.*`, `.storybook/`, `src/modules/store-config/domain/` y `src/modules/store-config/infrastructure/zod/`. Estas dos últimas guardan colores que son datos del vendedor (presets, valores por defecto, migraciones), no estilos: no deben apuntar a los tokens de la marca VitrinIA, porque un cambio de marca no debe cambiar las vitrinas. Cualquier otra capa de `modules/` (por ejemplo un adaptador que genere correos HTML) sigue controlada; `lint-rule.test.ts` lo verifica. `lint-rule.test.ts` mantiene fixtures que **deben fallar** (string, JSX, template, `rgb()`) y uno que debe pasar, ejecutando `biome lint`. Además `tokens.test.ts` recorre `src/` buscando fugas (incluye CSS). Limitaciones: no ve números sueltos en `style={{}}`; un hex de 3 dígitos legítimo en texto (p. ej. `#add`) se marca como falso positivo.

## Storybook

- `pnpm storybook` (puerto 6006) y `pnpm build-storybook` (`storybook-static/`, ignorado por git). Framework oficial `@storybook/nextjs` 10.6, addon `@storybook/addon-a11y`.
- Story `Tokens/Overview` con variantes `Mobile375` y `Desktop` (viewport global): colores con su ratio, pares AA, `deriveTheme` con colores de ejemplo, escala tipográfica, radios, sombras, botón y foco.

## Tipografía y ADR-0004

La marca usa Gabarito y Albert Sans (Google Fonts), pero ADR-0004 v3 limita las vitrinas a fuentes de sistema. Resolución (manda el ADR): los tokens exponen `font-display`/`font-body` con variables `--font-gabarito`/`--font-albert-sans` **con fallback dentro del `var()`** (`var(--font-albert-sans, system-ui)`; sin él, una variable indefinida invalida `font-family` y el navegador cae a Times New Roman); **solo el portal/marketing** debe cargarlas con `next/font/google` (layout del portal, tarea del Builder) y las vitrinas usan `font-system-*`. Hoy no se carga ninguna fuente web, así que todo cae al fallback. Cuando se empaqueten, se agregan ids al enum `theme.font` (cambio aditivo).

## Cambiar un token

1. Editar `tokens.ts`; 2. `pnpm tokens:build`; 3. `pnpm test` (pares AA); 4. revisar Storybook a 375 px y desktop (`visual-review`); 5. actualizar este documento.
