# Presets de vitrina

Un preset es un Store Config v1 válido (`StoreConfigV1`) que una tienda nueva usa como punto de partida. Es configuración pura: ni HTML ni código. Los textos son es-CL, con placeholders claros.

| Preset | Archivo | Fixture | Estado |
|---|---|---|---|
| `ropa` | `src/modules/store-config/domain/presets/ropa.ts` | `tests/fixtures/store-config/v1/ropa.json` | Sprint 1 |
| `aves` | `src/modules/store-config/domain/presets/aves.ts` | `tests/fixtures/store-config/v1/aves.json` | VIT-113, primera tienda real (Kanuwiñ) |

Cada fixture debe ser idéntico a su constante (`fixtures.test.ts`). Los tests viven junto al preset (`ropa.test.ts`, `aves.test.ts`).

## Preset `aves`

Rubro: alimento premium para aves (mezclas de semillas, snacks). Lo que necesita comprar el cliente: elegir la mezcla según su especie, ver el tamaño de la bolsa y el precio, y pedir por WhatsApp.

Orden de la home (6 secciones, máximo 7):

1. `hero`: "Mezclas de semillas formuladas por veterinarios".
2. `product-grid` "Nuestras mezclas" (destacados, 8).
3. `product-grid` "Todo el catálogo" (todos, 24).
4. `text` "Cómo elegir tu mezcla".
5. `text` "Cómo pedir" (contiene la frase placeholder `REEMPLAZAR:` para plazos, zonas de despacho y formas de pago; no se conocen).
6. `whatsapp-cta`.

Contacto: el preset usa `PLACEHOLDER_WHATSAPP`, porque sirve a cualquier tienda del rubro. El número real de pedidos de Kanuwiñ está en el catálogo semilla (`src/modules/catalog/infrastructure/seed/kanuwin.json`, `contact.whatsapp`) y se aplica al crear la tienda. Los datos de la persona de ventas del PDF no se copiaron a ningún lado.

### Tema: oscuro

Elegí tema **oscuro** porque la marca del PDF es azul marino con acento dorado, y el esquema lo permite: solo exige tres pares de contraste, no que el fondo sea claro. Un tema claro habría borrado la identidad de Kanuwiñ.

| Token | Valor | Origen |
|---|---|---|
| `background` | `#0f1b2d` | azul marino del fondo del PDF |
| `text` | `#f4efe3` | blanco cálido |
| `primary` | `#d4a63a` | dorado de las etiquetas |
| `onPrimary` | `#0f1b2d` | marino sobre el dorado |
| `accent` | `#9db08b` | verde salvia (Insectívoros) |

Fuente `system-sans`, radio `md`. Los colores por producto del PDF (verde, morado, rojo, salvia, dorado) no se usan como tokens: el esquema solo tiene un set cerrado; se verán en las fotos de los empaques.

### Contraste (WCAG 2.x)

| Par | Ratio | Mínimo | Resultado |
|---|---|---|---|
| `text` / `background` | 15,06 | 4,5 | pasa |
| `primary` / `background` | 7,67 | 3 | pasa |
| `onPrimary` / `primary` | 7,67 | 4,5 | pasa |
| `accent` / `background` (extra) | 7,42 | 4,5 | pasa |

Los tres primeros los exige el validador y `aves.test.ts`; el cuarto lo verifica además `aves.test.ts`.

### Catálogo semilla

`src/modules/catalog/infrastructure/seed/kanuwin.json`: 5 productos, 7 variantes, precios en CLP. Las fotos, en WebP sin metadatos, están en `public/demo/kanuwin/` (VIT-179).

## Pendiente

- **Componentes de vitrina** (Sprint 2): no existen todavía. Por eso no hay story `Presets/Aves` ni capturas 375/1280 (`create-preset` pasos 8 y 9), ni la revisión visual `visual-review`. Los criterios 2 de VIT-113 (Storybook a 375 px, sin scroll horizontal, WhatsApp visible) quedan **sin cumplir** hasta entonces.
- **Fotos reales**: Insectívoros (solo hay una etiqueta/arte) y Snack de gusanos (solo una bolsa kraft genérica sin logo) usan imágenes provisorias. Faltan 2 de 5.
- **Plazos y formas de entrega y pago**: reemplazar la frase `REEMPLAZAR:` de "Cómo pedir" antes de publicar.
- El link de Mercado Pago no se puede usar aún (allowlist vacía, decisión E1 de Cesar).
- Imágenes en la tienda: el hero no lleva imagen (`imageId` requiere subida a ImageStorage, no hay).
