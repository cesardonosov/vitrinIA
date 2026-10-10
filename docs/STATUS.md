# Estado de VitrinIA
Actualizado: 2026-10-10 12:30 (America/Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-14 · 15/16 issues cerrados (solo VIT-114 abierto, espera tu `pnpm dev:up`) · plan aprobado por Cesar el 2026-10-07
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.
Plan: `docs/sprints/sprint-01.md`. Cierre (borrador): `docs/sprints/sprint-01-cierre.md`.

## En curso
Mergeados en `main` el 2026-10-08 con el OK de Cesar: VIT-101 (#32), VIT-106 (#34), VIT-104 (#41), VIT-105 CI (#53), VIT-107 esquema con RLS (#46), VIT-109 arnés de cruce (#56), VIT-110 Store Config v1 (#66, reemplaza a #55) y VIT-115 headers y CSP (#42). El plan y los docs (#31) también. El 2026-10-09: #69, #70, #71, #72 y #73.

Mergeados el 2026-10-10 con el OK de Cesar: #38 (VIT-102, `4cdf4a1`), #39 (VIT-108, `d79c4e0`) y #75 (README, runbook e informe de QA, `c3f150d`, Refs #14). VIT-113 cerrado tal como está.

- VIT-114 Verificación de la demo (qa) — abierto. Criterio 2 pasa; criterio 1 espera tu `pnpm dev:up`; criterio 3 parcial (bugs D1–D10 en `docs/qa/sprint-01-demo.md`)
- VIT-174 (#74) ADR-0003: las particiones no heredan RLS (architect) — nuevo, sin PR
- Cierre del Sprint 1 (orchestrator) — borrador en PR #76 (`docs/sprints/sprint-01-cierre.md`), se finaliza tras tu corrida de `dev:up`

Ya no están en curso: VIT-102, VIT-103, VIT-108, VIT-111, VIT-112, VIT-113 y VIT-116 (todos cerrados).

## Seguimientos por crear como issue
La creación de estos issues desde la sesión fue denegada por un permiso; quedan aquí para no perderlos.
- Builder (P2): los tests de integración nunca deben poder apuntar a la BD de desarrollo; exigir un marcador de BD de test antes de truncar (review de Security sobre #56).
- Designer + Security (P3): decidir si los textos de la tienda admiten emojis con ZWJ, solo entre emojis (#66).
- Builder (P2): cargar Gabarito y Albert Sans en el portal con `next/font` y aplicar `deriveTheme` al guardar el tema; depende de #68 (#65).
- DevOps + Security (P3): agregar `build-storybook` y axe de las stories al CI (#65).
- Builder + Security (P1, Sprint 2): tabla `order_contacts` con RLS por tienda, formulario de checkout por opción (despacho, retiro, factura) y job diario de retención (ADR-0005 y ADR-0010).
- Builder (P2, Sprint 2): medios de pago múltiples en Store Config (Mercado Pago, Flow, transferencia) con lista de hosts permitidos (ADR-0005).
- Orchestrator (P2, Sprint 3): estado "pendiente de aprobación" para tiendas nuevas y cola de moderación para Cesar.

- Orchestrator (P2, Sprint 2): D9 (aviso `middleware` -> `proxy`) ya está cubierto por VIT-135 (#35); no hace falta un issue nuevo. D6 (`main` sin protección) es acción de Cesar, ver "Esperando a Cesar" 11.
- Orchestrator (P2): crear los issues de los bugs de documentación de QA que #75 no corrige (D10: instalar gitleaks y semgrep con versión fijada) y un issue nuevo del Sprint 2 con la story y las capturas a 375 px de VIT-113 (cerrado sin ellas).

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
11. Acciones tuyas (no son decisiones), en este orden:
   a) Correr `cp .env.example .env.local`, completar los 4 secretos y `pnpm dev:up` en tu máquina; confirmar 4 servicios `healthy` y `http://localhost:3000`, y anotar el tiempo (cierra el criterio 1 de VIT-114 y el Sprint 1).
   b) Aplicar el ruleset de `main` con los checks requeridos (13 pasos en `docs/runbooks/ci.md`); hoy `main` no tiene protección (D6).
   c) Pendientes anteriores: crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`); instalar la app de Renovate; delegar el DNS de `vitrinia.cl` a Cloudflare antes del Sprint 2 (dominio ya registrado, confirmado el 2026-10-09).
12. ADR-0009 (VIT-116): resuelta (2026-10-09). Reglas deny y ask completas; se aplican en `.claude/settings.json` con revisión de Security.
13. Store Config (ADR-0004 v3): resuelta (2026-10-09). Cesar confirmó todos los desvíos, incluido `onPrimary`.
14. Mantenedor de tiendas para administradores: resuelta (2026-10-09). Queda en `docs/PENDIENTES.md` como desarrollo futuro, sin sprint asignado. Mientras no exista, las tiendas se aprueban a mano.

## Últimos cambios
- 2026-10-10 · VIT-102/108/114 · Cesar dio el OK: #38, #39 y #75 en main; VIT-102 cerrado, VIT-114 sigue abierto hasta tu `dev:up`
- 2026-10-10 · VIT-113 · Cerrado tal como está; story y capturas a 375 px pasan al Sprint 2
- 2026-10-10 · Sprint 1 · Cesar retomó el trabajo; borrador de cierre en `docs/sprints/sprint-01-cierre.md`; #38, #39 y #75 esperan merge
- 2026-10-10 · VIT-103 · #45 cerrado: su contenido ya estaba en main; VIT-103 y VIT-116 salen de "En curso"
- 2026-10-10 · VIT-114 · QA: criterio 2 pasa; criterio 1 espera `pnpm dev:up` de Cesar; bugs D1–D10 en #75 (D6 y D9 siguen abiertos)
- 2026-10-10 · VIT-174 · Nuevo (#74): ADR-0003, las particiones no heredan RLS
- 2026-10-09 · VIT-116 · ADR-0009 mergeado (#72): deny de secretos; Security debe correr la matriz de §5 en sesión fresca
- 2026-10-09 · — · Mergeados #71 (decisiones de Cesar y términos de la demo Kanuwiñ) y #73 (dominio `vitrinia.cl` confirmado)
- 2026-10-09 · — · Cesar pausó el trabajo durante el día
- 2026-10-09 · — · Cesar dijo "ok merge": #69 (decisiones de datos) y #70 (preset aves y catálogo Kanuwiñ) en main
