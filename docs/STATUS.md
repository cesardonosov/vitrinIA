# Estado de VitrinIA
Actualizado: 2026-10-08 07:30 (America/Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-14 · 9/16 issues mergeados en main · plan aprobado por Cesar el 2026-10-07
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.
Plan: `docs/sprints/sprint-01.md`.

## En curso
Mergeados en `main` el 2026-10-08 con el OK de Cesar: VIT-101 (#32), VIT-106 (#34), VIT-104 (#41), VIT-105 CI (#53), VIT-107 esquema con RLS (#46), VIT-109 arnés de cruce (#56), VIT-110 Store Config v1 (#66, reemplaza a #55) y VIT-115 headers y CSP (#42). El plan y los docs (#31) también.

- VIT-102 Shared kernel (architect) — PR #38, draft
- VIT-103 Reglas de capas (architect) — PR #45, sobre #38
- VIT-108 Threat model de tenancy (security) — PR #39, draft
- VIT-111 Marca (designer) — Instantánea (ronda 2, camino 3), elegida por Cesar como provisoria; va dentro de #65
- VIT-112 Design tokens y Storybook (designer) — PR #65, en re-review
- VIT-113 Preset 1 (designer) — se hace con el catálogo real que trae Cesar (semillas para aves exóticas)
- VIT-114 Verificación de la demo (qa) — pendiente
- VIT-116 Deny de secretos para agentes (architect) — ADR-0009 propuesto, espera a Cesar

## Seguimientos por crear como issue
La creación de estos issues desde la sesión fue denegada por un permiso; quedan aquí para no perderlos.
- Builder (P2): los tests de integración nunca deben poder apuntar a la BD de desarrollo; exigir un marcador de BD de test antes de truncar (review de Security sobre #56).
- Designer + Security (P3): decidir si los textos de la tienda admiten emojis con ZWJ, solo entre emojis (#66).
- Builder (P2): cargar Gabarito y Albert Sans en el portal con `next/font` y aplicar `deriveTheme` al guardar el tema; depende de #68 (#65).
- DevOps + Security (P3): agregar `build-storybook` y axe de las stories al CI (#65).

## Bloqueos
- ninguno

## Esperando a Cesar
1. Pagos: ¿qué links de pago acepta una tienda?
   A) Cualquier https  B) Solo hosts de Mercado Pago  C) B + cambio solo desde el portal con re-verificación, nunca por MCP
   Recomiendo: C
2. Datos personales: ¿qué guarda el pedido del comprador en la POC?
   A) Nada (solo ítems, precios, total, canal)  B) Nombre y teléfono opcionales  C) Nombre, teléfono y dirección
   Recomiendo: A
3. Datos personales: ¿retención de eventos y logs?
   A) Eventos 90 días  B) Eventos 13 meses sin PII, agregados indefinidos, logs 30 días  C) Todo indefinido
   Recomiendo: B
4. Datos personales: ¿aviso de privacidad y datos reales en demos?
   A) Aviso mínimo antes del Sprint 3 y datos reales solo con permiso escrito  B) Sin aviso hasta el piloto, demos ficticias
   Recomiendo: A
5. ¿Moderación de tiendas nuevas en la POC?
   A) Publicación automática tras verificar email + revisión posterior  B) Aprobación manual antes de publicar
   Recomiendo: B mientras haya menos de 20 tiendas
6. ¿Techo mensual de gasto en tokens de los agentes? (los USD 50 de OPEX no lo cubren)
   A) Fijar un monto y medirlo en cada cierre  B) Sin techo por ahora
   Recomiendo: A
7. Marca: resuelta. Instantánea como provisoria (2026-10-08).
8. Riesgo residual R3 (threat model): en la POC, quien tenga credenciales de `migrator` o acceso al PC ve todas las tiendas.
   A) Aceptarlo en la POC; rol de solo lectura auditado antes del piloto  B) Separar ambientes ya en Sprint 1
   Recomiendo: A
9. Next 16 depreca `middleware.ts` en favor de `proxy.ts` (VIT-135). Cambiarlo toca VITRINIA.md §6.4.
   A) Mantener middleware.ts en la POC  B) Migrar con ADR en Sprint 2
   Recomiendo: B
10. Rubro de la primera tienda real: semillas para aves exóticas (Cesar trae el catálogo). El preset de ropa ya existe en Store Config v1.
11. Acciones tuyas (no son decisiones): registrar vitrinia.cl y delegar DNS a Cloudflare antes del Sprint 2; crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`); aplicar el ruleset de `main` con los checks requeridos (13 pasos en `docs/runbooks/ci.md`, PR #53); instalar la app de Renovate.
12. ADR-0009 (VIT-116): negar a los agentes la lectura de `.env.keys` y `.env` sin cifrar.
   A) Reglas deny y ask completas  B) Solo `.env.keys` por ahora
   Recomiendo: A
13. Store Config (ADR-0004 v3, PR #55): ¿confirmas los desvíos? Páginas como `pages.home.sections[]`, Zod como adaptador, colores hex en minúsculas, solo fuentes de sistema, lectura tolerante por sección en la vitrina (Sprint 2), contraste de `primary` contra el fondo ≥ 3:1 y un color nuevo `onPrimary` (texto sobre botones) ≥ 4.5:1.
   A) Todos  B) Todos menos `onPrimary` (la vitrina elige blanco o negro sola)  C) Volver a la v2
   Recomiendo: A

## Últimos cambios
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
