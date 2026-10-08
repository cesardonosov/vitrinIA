# ADR-0004: Tiendas config-driven (Store Config versionado)

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — arquitectura fundamental: define qué es una tienda)
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

1. **Esquema.** `StoreConfig` es un objeto Zod con `schemaVersion` (entero), `theme` (tokens: colores, tipografía de una lista cerrada, radios), `contact` (WhatsApp en E.164, link de pago), `pages` (lista ordenada de secciones `{ type, props }`) y `features` (flags). Se guarda en `jsonb` en una tabla con `store_id`, `version` (concurrencia optimista) y RLS (ADR-0003).
2. **Registro de componentes.** Cada `type` se mapea a `{ propsSchema, Component }` en el módulo `storefront`. Un `type` desconocido o props inválidas se rechazan al escribir; al leer, la sección se omite y se registra un error.
3. **Sin HTML.** Los textos son texto plano (escapado por React); el formato enriquecido, si llega, será un subconjunto estructurado (no markdown con HTML). Las URLs se validan (`https:`, sin `javascript:`/`data:`); las imágenes son IDs de `ImageStorage`, no URLs arbitrarias; los colores se validan y se garantiza contraste AA.
4. **Versionado.** Cada cambio incompatible sube `schemaVersion` y agrega una función pura `migrate_vN_to_vN+1` en el dominio de `store-config`. Al leer se migra en memoria hasta la versión actual; un job del worker persiste las migradas. CI corre fixtures de **todas** las versiones históricas contra la cadena de migraciones.
5. **IA y onboarding** producen *parches* de config que pasan por el mismo caso de uso y la misma validación; nunca escriben `jsonb` directo.
6. **Presets** por rubro son Store Configs válidos (skill `create-preset`).

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
- Seguridad: elimina la clase XSS por contenido del vendedor si se cumplen la validación de URLs y la prohibición de `dangerouslySetInnerHTML` (regla Semgrep). Los textos del catálogo siguen siendo vector de prompt injection hacia el MCP (pre-mortem S3).
- OPEX: neutro.

## Pendiente para Aceptado

- Revisión de Security sobre URLs, textos y colores renderizados.
- OK de Cesar.
