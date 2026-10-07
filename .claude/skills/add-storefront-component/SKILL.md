---
name: add-storefront-component
description: Agrega un componente de vitrina al registro (esquema Zod de props, componente server-first, story y test) sin HTML libre del vendedor y mobile first; úsala cuando una spec visual aprobada pide un componente nuevo.
---

# add-storefront-component

## Cuándo usarla
- Existe `docs/design/componentes/<nombre>.md` aprobada (skill `component-spec`).
- Verificado que no se resuelve con config, preset ni componente existente (AGENTS.md §12).

## Entradas
- Spec del componente, `src/shared/design/tokens.ts`, `src/modules/storefront/components.registry.ts`.
- Issue VIT-xxx y rama `feat/VIT-xxx-<nombre>`.

## Pasos
1. **Esquema Zod primero** `src/modules/storefront/components/<name>/<name>.schema.ts`: `z.object({...}).strict()`, límites explícitos (`z.string().max(80)`, `z.array().max(8)`), enums para variantes, `Money` para precios. Prohibidos `html`, `dangerouslySetInnerHTML`, `style` y `className` provenientes de datos del vendedor. URLs de imagen solo vía `ImageStorage` (no URLs externas arbitrarias).
2. **Test del esquema (rojo)** `<name>.schema.test.ts`: acepta caso válido; rechaza campo extra, texto > límite, `<script>` en texto (se renderiza escapado, nunca interpretado), precio negativo.
3. **Componente** `<name>.tsx`: React Server Component por defecto. Agrega `"use client"` solo para interacción (carrito, galería) y en el hijo más pequeño posible. Textos con React (escapado automático). Estilos solo con clases Tailwind de tokens; sin valores arbitrarios.
4. **Mobile first**: base a 375px, luego `md:` y `lg:`. Targets ≥ 44px, `focus-visible` con anillo de token, `line-clamp` y `break-words` para textos largos, `next/image` con `sizes` y dimensiones para evitar CLS. Sin imagen → placeholder con iniciales.
5. **Estados**: normal, vacío, cargando (skeleton), error, agotado, según la spec. Dinero formateado desde `Money` con `Intl` es-CL.
6. **Registro** en `components.registry.ts`: `register("<name>", { schema, component, version: 1 })`. El renderizador de Store Config valida props con el schema antes de renderizar; si falla, omite la sección y registra el error sin datos personales.
7. **Story** `<name>.stories.tsx` con una story por estado y caso extremo (nombre de 80 caracteres, emojis, sin imagen, agotado, 0 y 100 ítems) en viewport 375px por defecto. Activa addon a11y.
8. **Test de componente** (Vitest + Testing Library): renderiza, texto escapado, estados, roles ARIA, label accesible en botones de ícono.
9. **Presupuesto**: confirma que el componente no agrega > 5 KB gzip de JS cliente (`pnpm build` + analyzer). Vitrina total < 100 KB.
10. Documenta en `docs/design/componentes/<name>.md` el estado "implementado" y corre `visual-review`.

## Salida
```
COMPONENTE <name> v1
Archivos: schema, componente, story, tests, registro
Server/Client: server (client: <hijos>)
Peso JS cliente añadido: <N> KB
Stories: <lista>
axe: 0 violaciones
```

## Checklist
- [ ] Schema `.strict()` con límites; sin HTML ni estilos libres.
- [ ] Registrado y validado antes de renderizar.
- [ ] Server-first; `"use client"` justificado.
- [ ] Mobile first, 44px, foco visible, alt/aria.
- [ ] Story por estado + test + axe.
- [ ] Solo tokens; sin `any`.

## Errores comunes
- Marcar todo `"use client"` "por si acaso".
- Aceptar `string` libre donde debería ir un enum.
- Renderizar descripción del vendedor con `dangerouslySetInnerHTML` (si hace falta formato, markdown restringido por ADR).
- Olvidar `sizes` en imágenes y romper el LCP.
- Cambiar el schema sin subir `version` ni migrar el Store Config.
