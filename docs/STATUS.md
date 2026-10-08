# Estado de VitrinIA
Actualizado: 2026-10-07 21:25 (America/Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-14 · 0/16 issues · plan aprobado por Cesar el 2026-10-07
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.
Plan: `docs/sprints/sprint-01.md`.

## En curso
- VIT-108 Threat model de tenancy y RLS (security) — en desarrollo
- VIT-101 Inicializar la app Next.js (builder) — en desarrollo

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
7. Rubro de la primera tienda real: se parte con ropa; avísame si es otro.
8. Acciones tuyas (no son decisiones): registrar vitrinia.cl y delegar DNS a Cloudflare antes del Sprint 2; crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`).

## Últimos cambios
- 2026-10-07 · — · Cesar aprobó el plan del Sprint 1 y los ADR 0001–0004 y 0007 (0002 Aceptado; 0001, 0003, 0004 y 0007 esperan la revisión de Security). Preset 1 parte con rubro ropa.
- 2026-10-07 · VIT-101..116 · Creados los 16 issues del Sprint 1 con Definition of Ready, labels de rol, prioridad y riesgo, y milestone "Sprint 1"
- 2026-10-07 · VIT-117..130 · Creado backlog desde los riesgos altos del pre-mortem
- 2026-10-07 · ADR-0001..0007 · Propuestos los ADRs iniciales (Architect)
- 2026-10-07 · — · Pre-mortem del inicio de la POC (Architect + Security)
