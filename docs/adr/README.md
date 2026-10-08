# Architecture Decision Records (ADR) — VitrinIA

Registro de decisiones técnicas relevantes. Cómo escribir uno: skill `write-adr` (`.claude/skills/write-adr/SKILL.md`).

- Estados: `Propuesto` → `Aceptado` | `Rechazado` → `Reemplazado por ADR-NNNN`.
- Un ADR aceptado no se edita: se reemplaza por uno nuevo.
- Si toca zona sensible (auth, RLS/tenancy, MCP, secretos, datos personales, pedidos, pagos, infraestructura), requiere threat-model o revisión de Security antes de pasar a `Aceptado`.
- Si requiere a Cesar, sigue `Propuesto` hasta su OK y figura en `docs/STATUS.md` → "Esperando a Cesar".

## Índice

| Nº | Título | Estado | Fecha | Aprobación Cesar | Security antes de Aceptado |
|---|---|---|---|---|---|
| [0001](0001-stack-tecnico.md) | Stack técnico de la POC | Propuesto | 2026-10-08 | Sí (aprobado 2026-10-07; Security APROBADO en threat model de tenancy §9, salvo Auth.js que se revisa en Sprint 3) | Threat-model (auth, infra) |
| [0002](0002-vitrina-primero.md) | Vitrina primero: orden de construcción de la POC | Aceptado | 2026-10-08 | Sí (aprobado 2026-10-07) | No |
| [0003](0003-multi-tenant-por-host-con-rls.md) | Multi-tenant por host con RLS y triple aislamiento | Propuesto | 2026-10-08 | Sí (aprobado 2026-10-07; Security pidió cambios, incorporados; falta re-verificación) | Threat-model (tenancy, cookies) |
| [0004](0004-store-config-driven.md) | Tiendas config-driven (Store Config versionado) | Propuesto | 2026-10-08 | Sí (aprobado 2026-10-07; Security pidió cambios, incorporados; falta re-verificación) | Revisión de render (URLs, textos) |
| [0005](0005-checkout-whatsapp-y-link-de-pago.md) | Checkout por WhatsApp y link de pago del vendedor | Propuesto | 2026-10-08 | Sí | Threat-model (pedidos, pagos) |
| [0006](0006-analitica-first-party.md) | Analítica first-party de vitrinas | Propuesto | 2026-10-08 | Sí | Threat-model (datos personales) |
| [0007](0007-equipo-de-9-agentes.md) | Equipo de 9 agentes con flujo y guardrails | Propuesto | 2026-10-08 | Sí (aprobado 2026-10-07; Security pidió cambios, incorporados; falta re-verificación) | Threat-model (secretos, infra) |
| [0008](0008-reglas-de-dependencia-con-dependency-cruiser.md) | Reglas de dependencia verificadas con dependency-cruiser | Aceptado | 2026-10-08 | No requerida | No (apoya G6 del threat model de tenancy) |

Relacionado: `docs/pre-mortem-2026-10-08.md` (riesgos altos T1, T2, T3, S1, P3, P5 y C1 apuntan a estos ADRs).
