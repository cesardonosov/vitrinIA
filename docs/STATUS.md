# Estado de VitrinIA
Actualizado: 2026-10-09 01:40 UTC (2026-10-08 22:40 en Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-14 · 11/16 issues mergeados en main (VIT-113 parcial) · plan aprobado por Cesar el 2026-10-07
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.
Plan: `docs/sprints/sprint-01.md`.

## En curso
Mergeados en `main` el 2026-10-08 con el OK de Cesar: VIT-101 (#32), VIT-106 (#34), VIT-104 (#41), VIT-105 CI (#53), VIT-107 esquema con RLS (#46), VIT-109 arnés de cruce (#56), VIT-110 Store Config v1 (#66, reemplaza a #55) y VIT-115 headers y CSP (#42). El plan y los docs (#31) también.

- VIT-102 Shared kernel (architect) — PR #38, draft
- VIT-103 Reglas de capas (architect) — PR #45, sobre #38
- VIT-108 Threat model de tenancy (security) — PR #39, draft
- VIT-111 Marca y VIT-112 Design tokens (designer) — en main (#65); Instantánea como marca provisoria
- VIT-113 Preset (designer) — preset `aves` y catálogo de Kanuwiñ en main (#70); falta la story y las capturas a 375 px, que esperan los componentes de vitrina del Sprint 2
- VIT-114 Verificación de la demo (qa) — pendiente
- VIT-116 Deny de secretos para agentes (architect) — aprobado por Cesar; aplicándose con revisión de Security

## Seguimientos por crear como issue
La creación de estos issues desde la sesión fue denegada por un permiso; quedan aquí para no perderlos.
- Builder (P2): los tests de integración nunca deben poder apuntar a la BD de desarrollo; exigir un marcador de BD de test antes de truncar (review de Security sobre #56).
- Designer + Security (P3): decidir si los textos de la tienda admiten emojis con ZWJ, solo entre emojis (#66).
- Builder (P2): cargar Gabarito y Albert Sans en el portal con `next/font` y aplicar `deriveTheme` al guardar el tema; depende de #68 (#65).
- DevOps + Security (P3): agregar `build-storybook` y axe de las stories al CI (#65).
- Builder + Security (P1, Sprint 2): tabla `order_contacts` con RLS por tienda, formulario de checkout por opción (despacho, retiro, factura) y job diario de retención (ADR-0005 y ADR-0010).
- Builder (P2, Sprint 2): medios de pago múltiples en Store Config (Mercado Pago, Flow, transferencia) con lista de hosts permitidos (ADR-0005).
- Orchestrator (P2, Sprint 3): estado "pendiente de aprobación" para tiendas nuevas y cola de moderación para Cesar.

## Bloqueos
- ninguno

## Esperando a Cesar
1. Pagos: resuelta (2026-10-08). Varias opciones por tienda: link de Mercado Pago, link de Flow y transferencia. Cambios solo desde el portal, nunca por MCP. En ADR-0005.
2. Datos del comprador: resuelta (2026-10-08). "Todo lo necesario": nombre y teléfono siempre; correo opcional; dirección solo con despacho; RUT, razón social y giro solo con factura. En ADR-0005.
3. Retención: resuelta (2026-10-08). Pedido 6 años y contacto del comprador anonimizado a los 24 meses; no existe un plazo legal de 5 años. En ADR-0010, falta revisión de Security.
4. Aviso de privacidad: resuelta (2026-10-08). Borrador provisorio redactado por IA, no revisado por abogado, en un Claude Doc. No había skill legal disponible. Revisión de abogado antes del piloto público.
5. Moderación: resuelta (2026-10-08). Aprobación manual antes de publicar; revisa Cesar.
6. Gasto en IA: resuelta (2026-10-08). Tope de USD 100 al mes para el Claude del administrador. Las tiendas usan su propia IA vía MCP, así que VitrinIA no paga IA por tienda.
7. Marca: resuelta. Instantánea como provisoria (2026-10-08).
8. Riesgo residual R3: resuelta (2026-10-09). Se acepta en la POC; rol de solo lectura auditado antes del piloto.
9. `middleware.ts` → `proxy.ts`: resuelta (2026-10-09). Se migra con ADR en el Sprint 2 (VIT-135); al aceptarse ese ADR se actualiza VITRINIA.md §6.4.
10. Rubro de la primera tienda real: resuelta. Kanuwiñ, mezclas de semillas para aves; preset `aves` y catálogo semilla en main (#70). Despacho y pagos de demo, inventados a pedido de Cesar; faltan 2 fotos reales.
11. Acciones tuyas (no son decisiones): crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`); aplicar el ruleset de `main` con los checks requeridos (13 pasos en `docs/runbooks/ci.md`); instalar la app de Renovate; delegar el DNS del dominio a Cloudflare antes del Sprint 2. Dominio: `vitrinia.cl`, ya registrado (confirmado por Cesar el 2026-10-09).
12. ADR-0009 (VIT-116): resuelta (2026-10-09). Reglas deny y ask completas; se aplican en `.claude/settings.json` con revisión de Security.
13. Store Config (ADR-0004 v3): resuelta (2026-10-09). Cesar confirmó todos los desvíos, incluido `onPrimary`.
14. Mantenedor de tiendas para administradores: resuelta (2026-10-09). Queda en `docs/PENDIENTES.md` como desarrollo futuro, sin sprint asignado. Mientras no exista, las tiendas se aprueban a mano.

## Últimos cambios
- 2026-10-09 · — · Cesar dijo "ok merge": #69 (decisiones de datos) y #70 (preset aves y catálogo Kanuwiñ) en main
- 2026-10-09 · — · Cesar aprobó las recomendaciones de R3, proxy.ts en Sprint 2, ADR-0009 completo y desvíos de ADR-0004
- 2026-10-09 · — · Mantenedor de tiendas para administradores anotado en PENDIENTES como desarrollo futuro
- 2026-10-08 · — · Cesar respondió pagos, datos del comprador, aviso, moderación y gasto en IA; retención propuesta en ADR-0010
- 2026-10-08 · VIT-113 · Catálogo de Kanuwiñ confirmado: vende directo, precios PVP definitivos, fichas correctas; el contacto de ventas del PDF no se publica
- 2026-10-08 · ADR-0010 · Cesar aprobó la retención: pedido 6 años, contacto del comprador 24 meses
- 2026-10-08 · — · Cesar dijo "Mergea": 9 PRs en main; #55 reemplazado por #66 para que el CI corriera completo
- 2026-10-08 · VIT-111 · Cesar eligió Instantánea (ronda 2, camino 3) como marca provisoria; tokens en PR #65
- 2026-10-08 · VIT-113 · Primera tienda real: semillas para aves exóticas
- 2026-10-07 · VIT-105 · Primera corrida de CI en verde (11 jobs); Security pide job de integración, regla set_config estricta y chequeo de WITH CHECK
- 2026-10-07 · VIT-107/109 · RLS aprobado por Security tras 40+ ataques; arnés genérico de cruce con 8 mutaciones detectadas
- 2026-10-08 · VIT-111 · Cesar descartó la ronda 2; ronda 3 espera su pista
- 2026-10-08 · VIT-105 · Security pidió 2 cambios más en el CI; mejoras menores en VIT-160 a VIT-163
- 2026-10-07 · VIT-111 · Cesar descartó las marcas A y B; ronda 2 con tres caminos nuevos
- 2026-10-07 · — · Seguimientos de los reviews creados: #43, #44, #48–#52, #54, #57–#59
- 2026-10-07 · VIT-108 · Threat model de tenancy listo; brechas G1–G9 agregadas a VIT-103/104/105/107/109
- 2026-10-07 · VIT-101 · Review aprobado; TypeScript fijado en 6.0.3 por compatibilidad con dependency-cruiser
- 2026-10-07 · — · Cesar aprobó el plan del Sprint 1 y los ADR 0001–0004 y 0007 (0002 Aceptado; 0001, 0003, 0004 y 0007 esperan la revisión de Security). Preset 1 parte con rubro ropa.
- 2026-10-07 · VIT-101..116 · Creados los 16 issues del Sprint 1 con Definition of Ready, labels de rol, prioridad y riesgo, y milestone "Sprint 1"
- 2026-10-07 · VIT-117..130 · Creado backlog desde los riesgos altos del pre-mortem
- 2026-10-07 · ADR-0001..0007 · Propuestos los ADRs iniciales (Architect)
- 2026-10-07 · — · Pre-mortem del inicio de la POC (Architect + Security)
