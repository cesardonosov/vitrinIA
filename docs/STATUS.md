# Estado de VitrinIA
Actualizado: 2026-10-07 21:30 (America/Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-14 · 0/16 issues · **plan propuesto, sin aprobar**
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.
Plan: `docs/sprints/sprint-01.md`.

## En curso
- ninguno (ningún agente ejecuta hasta que Cesar apruebe el plan)

## Bloqueos
- Todo el Sprint 1 — espera el OK de Cesar al plan y a los ADR 0001 y 0003 (destraba: Cesar, desde 2026-10-07).

## Esperando a Cesar
1. ¿Apruebas el plan del Sprint 1?
   A) Sí  B) Sí, sacando VIT-113 y VIT-115  C) Ajustar objetivo
   Recomiendo: A (el recorte ya está definido si falta tiempo)
2. ¿Apruebas los ADR 0001 a 0007? (`docs/adr/README.md`)
   A) Todos  B) 0001–0004 y 0007 ahora; 0005 y 0006 después de responder 4, 5 y 6  C) Uno por uno
   Recomiendo: B (el Sprint 1 solo necesita 0001, 0003 y 0004)
3. ¿Rubro de la primera tienda real (preset 1)?
   A) Ropa  B) Comida  C) Cosmética  D) Otro
   Recomiendo: el de la primera tienda que puedas conseguir; por defecto A
4. Pagos: ¿qué links de pago acepta una tienda?
   A) Cualquier https  B) Solo hosts de Mercado Pago  C) B + cambio solo desde el portal con re-verificación, nunca por MCP
   Recomiendo: C
5. Datos personales: ¿qué guarda el pedido del comprador en la POC?
   A) Nada (solo ítems, precios, total, canal)  B) Nombre y teléfono opcionales  C) Nombre, teléfono y dirección
   Recomiendo: A
6. Datos personales: ¿retención de eventos y logs?
   A) Eventos 90 días  B) Eventos 13 meses sin PII, agregados indefinidos, logs 30 días  C) Todo indefinido
   Recomiendo: B
7. Datos personales: ¿aviso de privacidad y datos reales en demos?
   A) Aviso mínimo antes del Sprint 3 y datos reales solo con permiso escrito  B) Sin aviso hasta el piloto, demos ficticias
   Recomiendo: A
8. ¿Moderación de tiendas nuevas en la POC?
   A) Publicación automática tras verificar email + revisión posterior  B) Aprobación manual antes de publicar
   Recomiendo: B mientras haya menos de 20 tiendas
9. ¿Techo mensual de gasto en tokens de los agentes? (los USD 50 de OPEX no lo cubren)
   A) Fijar un monto y medirlo en cada cierre  B) Sin techo por ahora
   Recomiendo: A
10. Acciones tuyas (no son decisiones): registrar vitrinia.cl y delegar DNS a Cloudflare antes del Sprint 2; crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`).

## Últimos cambios
- 2026-10-07 · VIT-101..116 · Creados los 16 issues del Sprint 1 con Definition of Ready, labels de rol, prioridad y riesgo, y milestone "Sprint 1"
- 2026-10-07 · VIT-117..130 · Creado backlog desde los riesgos altos del pre-mortem
- 2026-10-07 · ADR-0001..0007 · Propuestos los ADRs iniciales (Architect)
- 2026-10-07 · — · Pre-mortem del inicio de la POC (Architect + Security)
