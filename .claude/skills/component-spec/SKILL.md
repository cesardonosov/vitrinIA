---
name: component-spec
description: Escribe la spec visual de un componente antes de construirlo (propósito, props, estados, mobile first, accesibilidad y casos extremos); úsala siempre que una tarea incluya UI nueva.
---

# component-spec

## Cuándo usarla
- Antes de que el Builder implemente cualquier componente de vitrina o del portal.
- Cuando se modifica sustancialmente un componente existente.
- No se construye UI sin spec aprobada en el issue.

## Entradas
- Issue VIT-xxx con historia y criterios de aceptación.
- `docs/design/brand.md`, `docs/design/tokens.md`, registro de componentes.
- Reglas de AGENTS.md §12 (¿ya existe? ¿preset? ¿configuración?).

## Pasos
1. Busca en el registro y en Storybook si ya existe algo equivalente. Si existe, la spec es un cambio; documenta qué se reutiliza.
2. Escribe el propósito en una frase: qué decisión o acción habilita para el cliente final o el vendedor.
3. Define props como esquema Zod (nombres en inglés, textos en es-CL): tipos, obligatorios, límites (`name` máx. 80 caracteres, `images` máx. 8), defaults. Incluye `variant` si hay más de una apariencia. Sin prop `html` ni `className` libre.
4. Define estados con boceto o descripción por cada uno: normal, vacío (mensaje + acción), cargando (skeleton con mismas dimensiones, sin salto de layout), error (mensaje humano + reintentar), deshabilitado/agotado.
5. Mobile first: diseña a 375px (una columna, pulgar). Luego indica qué cambia en 768px y 1280px. Usa solo tokens (`space-4`, `radius-md`); nada de px sueltos.
6. Accesibilidad: objetivos táctiles ≥ 44x44px; foco visible (≥ 3:1); orden de tab lógico; roles/`aria-label` en botones de ícono; `alt` real en imágenes (o `alt=""` si decorativa); estados anunciados con `aria-live="polite"`; no depender solo del color; respeta `prefers-reduced-motion`.
7. Casos extremos obligatorios: nombre de 80 caracteres sin espacios (truncar con `line-clamp-2`, `break-words`), emojis y ZWJ, tildes y `ñ`, precio de 8 dígitos (`$12.345.678`), sin imagen (placeholder con iniciales), imagen rota, 0 y 500 ítems, RTL no aplica.
8. Dinero: se muestra desde `Money` con formateo es-CL (`Intl.NumberFormat("es-CL", {style:"currency", currency})`), nunca desde floats.
9. Datos de Storybook requeridos: una story por estado y por caso extremo.
10. Publica la spec en `docs/design/componentes/<nombre>.md` y enlázala en el issue.

## Salida
```
# <NombreComponente>
Propósito:
Props (Zod):
Variantes:
Estados: normal | vacío | cargando | error | agotado
Layout: 375 / 768 / 1280
Accesibilidad: táctil 44px, foco, aria, alt, live regions
Casos extremos: texto largo, emojis, sin imagen, precio grande
Tokens usados:
Stories requeridas:
Criterios de aceptación visual:
```

## Checklist
- [ ] Revisé el registro antes de proponer algo nuevo.
- [ ] Todos los estados tienen descripción.
- [ ] Props no permiten HTML libre.
- [ ] 44px y foco especificados.
- [ ] Casos extremos listados con valor concreto.
- [ ] Solo tokens.

## Errores comunes
- Especificar solo el estado feliz.
- Spec desktop-first con "adaptar a móvil" al final.
- Props ambiguas ("color" libre) que rompen el contraste AA.
- Ignorar el carrito y el botón de WhatsApp al alcance del pulgar.
- Omitir qué pasa cuando no hay imagen: es el caso más común en vendedores de Instagram.
