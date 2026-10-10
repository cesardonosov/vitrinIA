# ADR-0004: Tiendas config-driven (Store Config versionado)

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — arquitectura fundamental: define qué es una tienda)
- Aprobación de Cesar: sí, 2026-10-07 (plan del Sprint 1). Aprobación de Cesar registrada; revisión de Security pendiente de re-verificación (threat model `docs/security/threat-models/tenancy.md` §9 pidió cambios el 2026-10-08; incorporados en esta versión, a la espera de que Security los re-verifique y el ADR pase a Aceptado).
- Desvíos de la v3 (páginas como `pages.home.sections[]`, Zod como adaptador, hex en minúsculas, solo fuentes de sistema, lectura tolerante por sección, `primary` ≥ 3:1 y `onPrimary` ≥ 4.5:1): confirmados por Cesar el 2026-10-09 (opción A).
- Issue: VIT-110
- Zona sensible: parcial. No está en la lista de §9.1, pero el contenido del vendedor se renderiza en vitrinas públicas y el MCP escribirá sobre él. Se pide a Security una revisión del render de URLs y textos (sin threat-model completo obligatorio)

## Contexto

- §6.1.3: "una tienda es datos (Store Config), no código. La IA nunca genera HTML". §8.2: las vitrinas nunca aceptan HTML libre del vendedor; CSP estricta.
- §7: Store Config con `schemaVersion` y migraciones de configuración; feature flags dentro del Store Config (§6.5).
- El Store Config lo escribirán tres fuentes: seeds (Sprint 2), formulario de onboarding (Sprint 3) y la IA del comercio vía MCP (Sprint 4).
- Presupuesto de vitrina: LCP < 2,5 s en 4G y JS < 100 KB.
- Pre-mortem 2026-10-08: T2 (configs viejas que dejan de validar) es riesgo alto.

## Decisión

Usaremos **un Store Config JSON validado con Zod, versionado y renderizado solo mediante un registro de componentes**:

1. **Esquema.** `StoreConfig` es un **tipo del dominio** (`src/modules/store-config/domain/store-config.ts`) con `schemaVersion` (entero), `theme` (tokens: colores, tipografía de una lista cerrada, radios), `contact` (WhatsApp en E.164, link de pago), `pages` (objeto de páginas con nombre; cada página tiene `sections[]`, lista ordenada de secciones `{ type, props }`) y `features` (flags). Se guarda en `jsonb` en una tabla con `store_id`, `version` (concurrencia optimista) y RLS (ADR-0003).
   **El contrato es del dominio; Zod es un adaptador.** ADR-0008 prohíbe importar paquetes npm en `domain` y `application`, así que el esquema Zod no puede ser la fuente del tipo. El dominio declara el tipo `StoreConfig` y el puerto `StoreConfigValidator` (`parseStoreConfig(input: unknown): Result<StoreConfig, StoreConfigError>`); el esquema Zod vive en `src/modules/store-config/infrastructure/zod/` como adaptador de ese puerto. Un guard de tipos en compilación (`z.infer<typeof storeConfigSchema>` debe ser asignable a `StoreConfig` y viceversa) garantiza que el esquema y el tipo del dominio no diverjan: si alguien cambia uno sin el otro, falla `tsc`, no un test de runtime. Justificación: el dominio queda puro y testeable sin dependencias, Zod es reemplazable (valibot, JSON Schema) sin tocar casos de uso, y el guard evita el riesgo clásico de "dos fuentes de verdad".
   **Páginas con nombre, no lista.** `pages` es `{ home: { sections: [...] } }` en lugar de `pages[]`. Justificación: en la POC solo existe `home`; agregar una página nueva (`about`, `faq`) es agregar una clave opcional al tipo, lo que es aditivo y **no requiere subir `schemaVersion`** ni migración. Con `pages[]` habría que decidir hoy un campo `slug`/`kind` por página y cualquier cambio en ese contrato sería incompatible. Cada página es `.strict()` y sus `sections[]` siguen la regla del registro (punto 2).
   **Esquema cerrado.** Todos los objetos del esquema (raíz, `theme`, `contact`, cada página, cada `props` del registro) son `.strict()`: una clave desconocida rechaza la escritura, no se ignora. Cada campo tiene una lista cerrada de tipos permitidos; no existen campos `z.any()`, `z.unknown()` ni `z.record()` abiertos. Tipos admitidos por campo:

   | Campo | Tipo permitido |
   |---|---|
   | `schemaVersion` | entero positivo |
   | `theme.colors.*` | color hex `#rrggbb` **solo en minúsculas** (regex `^#[0-9a-f]{6}$`), lista cerrada de claves |
   | `theme.font` | enum de la lista cerrada de **fuentes de sistema** (ver nota) |
   | `theme.radius` | enum (`none`, `sm`, `md`, `lg`) |
   | `contact.whatsapp` | string E.164 |
   | `contact.paymentLink` | URL con allowlist (ver punto 3) o ausente |
   | `pages.<name>` | clave de una lista cerrada de páginas (hoy solo `home`); objeto `.strict()` con `sections[]` |
   | `pages.<name>.sections[].type` | enum de los `type` del registro de componentes |
   | `pages.<name>.sections[].props` | el `propsSchema` `.strict()` del `type` |
   | textos (`title`, `description`, …) | string con largo máximo por campo, texto plano |
   | imágenes | ID de `ImageStorage` (UUID v7), nunca URL |
   | `features.*` | boolean, lista cerrada de claves |

   **Colores hex solo en minúsculas.** Se rechaza `#FFAA00`; se acepta `#ffaa00`. Justificación: una forma canónica única hace que la comparación de configs, el diff de `audit_log` (punto 7) y los fixtures de migración (punto 4) sean byte a byte, sin normalización en lectura; no hay motivo para aceptar dos representaciones del mismo valor. Los productores (formulario, MCP, presets) normalizan antes de escribir; el validador no normaliza, rechaza.
   **Solo fuentes de sistema hasta que haya fuentes empaquetadas.** El enum inicial de `theme.font` es una lista corta de pilas de sistema (`system-sans`, `system-serif`, `system-mono`); no se admiten nombres de fuentes web ni URLs. Justificación: no hay fuentes empaquetadas en el repo todavía y el presupuesto de vitrina (LCP < 2,5 s, JS < 100 KB) no tolera cargar fuentes de terceros. Cuando se empaqueten fuentes (decisión del Designer, sin ADR nuevo), sus ids se **agregan** al enum: el cambio es aditivo, no sube `schemaVersion` y las configs existentes siguen validando. Nunca se elimina un id del enum sin migración.
2. **Registro de componentes.** Cada `type` se mapea a `{ propsSchema, Component }` en el módulo `storefront`. Un `type` desconocido o props inválidas se rechazan al escribir.
   **Dos modos de lectura, con dueños distintos.** `parseStoreConfig` (puerto `StoreConfigValidator`, módulo `store-config`) es **estricto**: cualquier sección inválida hace fallar el parse completo con `Result.err`; es el único camino de escritura (seed, onboarding, MCP) y el que usa el worker de migraciones. La **lectura tolerante por sección** —omitir la sección que no valida contra el registro, registrar un error con `store_id`, `page`, índice y `type`, y renderizar el resto— **no la implementa `store-config`**: queda a cargo del módulo `storefront` en el Sprint 2, al construir el render a partir de la config ya persistida. Justificación: en escritura queremos rechazar todo lo inválido (un error silencioso ahí es deuda que se descubre en producción); en render queremos que un componente retirado o un bug de migración no tumbe la vitrina entera. Hasta el Sprint 2 no existe lectura tolerante: lo que no pasa `parseStoreConfig` no se persiste y, por tanto, no llega a la vitrina.
3. **Sin HTML.** Los textos son texto plano (escapado por React); el formato enriquecido, si llega, será un subconjunto estructurado (no markdown con HTML). Las imágenes son IDs de `ImageStorage`, no URLs arbitrarias.
   **URLs con allowlist por campo.** No basta "`https:` y sin `javascript:`/`data:`": cada campo URL declara su propia allowlist de esquema **y de host**, y el validador rechaza todo lo que no esté en ella (incluidos `http:`, IPs, puertos, userinfo y hosts con `xn--` salvo que el campo lo permita). Allowlists iniciales:

   | Campo | Esquema | Hosts permitidos | Mantiene |
   |---|---|---|---|
   | `contact.paymentLink` | `https:` | Lista cerrada de proveedores de link de pago chilenos; la lista concreta depende de la decisión E1 de Cesar (`docs/STATUS.md`) | Architect (ADR o cambio de allowlist con revisión de Security) |
   | `checkout.paymentMethods[].url` con `type: mercado-pago-link` (fila `checkout.mercadoPagoLink`) | `https:` | `mpago.la`, `link.mercadopago.cl`, `www.mercadopago.cl` (VIT-185, decisión E1 respondida el 2026-10-08 en ADR-0005 §4) | Architect, con revisión de Security |
   | `checkout.paymentMethods[].url` con `type: flow-link` (fila `checkout.flowLink`) | `https:` | `www.flow.cl` (VIT-185) | Architect, con revisión de Security |
   | `contact.whatsapp` | no es URL: se guarda E.164 y la vitrina construye `https://wa.me/<E.164>` | `wa.me` (fijo en código) | — |
   | Redes sociales (si entran) | `https:` | Host exacto por red (`instagram.com`, `www.instagram.com`, …) | Architect |
   | Cualquier otro campo URL | prohibido hasta tener fila en esta tabla | — | — |

   La allowlist vive en código (`src/modules/store-config/domain/url-allowlist.ts`), tiene test por fila y cambiarla pasa por Security (`security-review`); nunca es configurable por tienda ni por MCP.
   **Colores y fuentes por CSS variables.** `theme` se traduce a CSS variables (`--color-primary`, `--font-body`, …) a partir de valores que ya pasaron el esquema (hex con regex, fuente de la lista cerrada). Nunca se concatena un valor del Store Config dentro de un atributo `style` ni de un `<style>` en bruto; la hoja de estilos de la vitrina es estática y solo lee variables. Se valida contraste AA al escribir.
   **Pares de contraste validados.** Hoy el validador solo comprueba `text` contra `background` (≥ 4.5:1, WCAG AA para texto normal). Eso deja sin cubrir los componentes de UI (botones, enlaces, badges) que usan `primary`. Pares propuestos, todos con la fórmula de luminancia relativa de WCAG 2.x:

   | Par | Mínimo | Criterio |
   |---|---|---|
   | `text` / `background` | 4.5:1 | AA texto normal (ya implementado) |
   | `primary` / `background` | 3:1 | AA componentes UI y bordes (SC 1.4.11) |
   | `onPrimary` / `primary` | 4.5:1 | AA texto sobre botones y badges primarios |

   `onPrimary` es un token **nuevo** en `theme.colors` (texto que va sobre `primary`): sin él, la vitrina tendría que elegir blanco o negro en render, es decir, decidir contraste fuera del validador. Agregarlo es aditivo si se declara opcional con default (`#ffffff`) en el esquema; los presets lo fijan explícitamente. Este cambio **se implementa en el PR de VIT-110 antes de persistir la primera config** (seed del Sprint 2), para no tener que migrar configs que ya pasaron una validación más débil.
4. **Versionado.** Cada cambio incompatible sube `schemaVersion` y agrega una función pura `migrate_vN_to_vN+1` en el dominio de `store-config`. Al leer se migra en memoria hasta la versión actual; un job del worker persiste las migradas. CI corre fixtures de **todas** las versiones históricas contra la cadena de migraciones.
5. **IA y onboarding** producen *parches* de config que pasan por el mismo caso de uso y la misma validación; nunca escriben `jsonb` directo.
6. **Presets** por rubro son Store Configs válidos (skill `create-preset`).
7. **Auditoría de toda escritura.** Cualquier escritura del Store Config (formulario del portal, parche del MCP, seed y la persistencia de una migración de `schemaVersion` por el worker) deja una entrada en `audit_log` con `store_id`, actor (`user_id`, `mcp_token_id` o `system:migration`), origen, `schemaVersion` antes y después, `version` optimista y un diff de claves (no el contenido completo si incluye datos personales). La escritura y la entrada de auditoría van en la misma transacción `withStoreTx` (ADR-0003); no hay camino de escritura sin auditoría.
8. **Slug y subdominio.** El slug de tienda (`<slug>.vitrinia.cl`) cumple: minúsculas `[a-z0-9]` con guiones internos, 3–40 caracteres, sin guion inicial ni final ni dobles, sin `xn--`; se rechaza si figura en la **lista reservada** (`www`, `app`, `api`, `admin`, `mail`, `mcp`, `status`, `cdn`, `assets`, `auth`, `login`, marcas y palabras ofensivas; la lista vive en `src/modules/store-config/domain/reserved-slugs.ts` y la mantiene el Architect). Al **renombrar**, el host anterior no se libera: queda como *tombstone* en `domains` (`released_at` no nulo, ADR-0003) y la vitrina responde una **redirección 301 al host nuevo** durante 90 días; después responde 404 y el slug sigue reservado para esa tienda hasta una decisión explícita (no se reasigna a otra tienda en la POC). La lógica de renombrar es del Sprint 3 (VIT-121); la columna y la regla quedan fijadas aquí para no migrar.
9. **Las feature flags no son controles de seguridad.** `features.*` activa o desactiva funcionalidad de producto (p. ej. mostrar stock, habilitar pedidos). Ninguna decisión de acceso, aislamiento, validación de entrada ni CSP depende de una flag: esos controles están siempre activos y se prueban sin leer el Store Config. Una flag apagada tampoco relaja una validación.

## Alternativas consideradas

1. **Store Config + registro de componentes (elegida)**
   - Pros: seguridad por construcción (sin XSS por contenido del vendedor); render server-first rápido; la IA opera sobre un contrato pequeño y validable; las tiendas se ven consistentes y profesionales.
   - Contras: expresividad limitada; cada necesidad visual nueva requiere componente y release.
2. **Plantillas con lenguaje de templates (tipo Liquid de Shopify)**
   - Pros: flexibilidad alta para el vendedor avanzado.
   - Contras: superficie de XSS e inyección; los vendedores objetivo no programan; la IA generaría código de plantilla, contrario a §6.1.3.
3. **HTML/CSS generado por IA por tienda**
   - Pros: máxima personalización visual.
   - Contras: prohibido por §6.1.3 y §8.2; imposible de validar, de mantener accesible y de migrar.
4. **Configuración en columnas relacionales (sin jsonb)**
   - Pros: tipado en BD, consultas simples.
   - Contras: cada cambio de diseño es una migración de BD; las secciones anidadas se modelan mal; no aporta sobre Zod.
5. **Page builder de terceros (bloques arbitrarios)**
   - Pros: editor visual listo.
   - Contras: dependencia y peso de JS en la vitrina; bloques libres reabren la puerta al HTML.

## Consecuencias

- Positivas: un solo contrato para seed, onboarding y MCP; vitrinas seguras y rápidas; los presets son datos, sin código.
- Negativas / deuda:
  - Las migraciones de config se mantienen para siempre (o hasta un ADR que fije una versión mínima soportada).
  - `jsonb` es más difícil de consultar para analítica de configuración.
  - Los vendedores que quieran algo fuera del registro deberán esperar un componente nuevo.
  - Dos validaciones (escritura y lectura) por diseño.
- Reversibilidad: **media**. Agregar componentes es barato; cambiar el modelo (p. ej. a plantillas) obliga a migrar todas las tiendas.
- Seguridad: elimina la clase XSS por contenido del vendedor si se cumplen el esquema `.strict()`, la allowlist de URLs por campo, las CSS variables y la prohibición de `dangerouslySetInnerHTML` (regla Semgrep). Los textos del catálogo siguen siendo vector de prompt injection hacia el MCP (pre-mortem S3). La allowlist y la lista reservada son superficie a revisar en cada cambio.
- OPEX: neutro.

## Pendiente para Aceptado

- Revisión de Security sobre URLs, textos y colores renderizados: hecha en el threat model de tenancy (VIT-108) §9; seis cambios incorporados en los puntos 1, 3, 7, 8 y 9 de la decisión. Falta la re-verificación de Security.
- Decisión E1 de Cesar (proveedores de link de pago) para cerrar la allowlist de `contact.paymentLink`.
- OK de Cesar: registrado (2026-10-07) sobre el plan del Sprint 1. Los **desvíos de la v3** respecto a lo aprobado (`pages.home.sections[]` en lugar de `pages[]`; tipo del dominio con Zod como adaptador; hex solo en minúsculas; solo fuentes de sistema; lectura tolerante diferida a `storefront` en Sprint 2; pares de contraste y token `onPrimary`) **esperan la confirmación de Cesar**. El ADR sigue en Propuesto hasta esa confirmación y la re-verificación de Security.

## Historial

- 2026-10-08 · v3: incorpora las decisiones de implementación de VIT-110 pedidas por el Reviewer en el PR #55: `pages` pasa a objeto con páginas con nombre (`pages.home.sections[]`), aditivo sin migración; `StoreConfig` es un tipo del dominio y Zod es un adaptador del puerto `StoreConfigValidator` en `infrastructure/zod` con guard de tipos en compilación (ADR-0008); colores hex solo en minúsculas; `theme.font` limitado a fuentes de sistema con ids aditivos; lectura tolerante por sección asignada a `storefront` (Sprint 2) mientras `parseStoreConfig` es estricto; pares de contraste `primary`/`background` ≥ 3:1 y `onPrimary`/`primary` ≥ 4.5:1 a implementar en el PR antes de persistir configs. Desvíos pendientes de confirmación de Cesar.
- 2026-10-08 · v2: incorpora §9 del threat model de tenancy (esquema `.strict()` con tipos por campo; allowlist de esquema y host por campo URL con dueño; colores y fuentes por CSS variables; reglas de slug, lista reservada, tombstone y redirección; `audit_log` en toda escritura; feature flags no son controles de seguridad).
