---
name: status-update
description: Mantiene docs/STATUS.md al día (Sprint actual, En curso, Bloqueos, Esperando a Cesar, Últimos cambios); úsala después de cada handoff, merge o decisión y al menos una vez por jornada.
---

# status-update

Rol principal: Orchestrator. `docs/STATUS.md` es el "daily" del proyecto y lo primero que lee cada agente (AGENTS.md §2) y Cesar desde el celular.

## Cuándo usarla

- Tras cada HANDOFF recibido y cada merge a `main`.
- Cuando aparece un bloqueo o una decisión que espera a Cesar.
- Cuando Cesar responde: mover la decisión a "Últimos cambios" y desbloquear.
- Al abrir y cerrar cada jornada de trabajo.

## Entradas

- Bloques HANDOFF recientes.
- `gh issue list --milestone "Sprint N" --state all`, `gh pr list`.
- Respuestas de Cesar.

## Pasos

1. Lee el STATUS.md actual completo; no sobrescribas secciones sin leerlas.
2. **Sprint actual**: número, objetivo, demo de cierre, avance como `cerrados/total` y fecha de cierre.
3. **En curso**: una línea por issue abierto con rol, rama o PR y estado (`en desarrollo`, `en review`, `en QA`).
4. **Bloqueos**: issue bloqueado, causa, quién lo destraba y desde cuándo. Si no hay: `- ninguno`.
5. **Esperando a Cesar**: cada decisión con pregunta concreta, 2 a 4 opciones y tu recomendación. Debe poder responderse en un minuto desde el celular. Solo decisiones que corresponden a Cesar (modelo de negocio, pagos, datos sensibles, scope, arquitectura fundamental, vendor lock-in irreversible, deploys a producción).
6. **Últimos cambios**: máximo 10 líneas, más reciente primero, con fecha, `VIT-xxx` y una frase. Lo anterior se archiva en `docs/sprints/sprint-NN.md`.
7. Pendientes de negocio que no bloquean van a `docs/PENDIENTES.md`, no a STATUS.
8. Commit en rama `docs/...` con `docs(status): update sprint N progress`; PR chico.
9. Fecha y hora (America/Santiago) en la cabecera.

## Salida

Plantilla de `docs/STATUS.md`:

```
# Estado de VitrinIA
Actualizado: 2026-10-07 18:30 (America/Santiago)

## Sprint actual
Sprint 1 — Fundaciones y marca · cierre 2026-10-13 · 3/9 issues
Demo: el proyecto levanta con un comando y pasa todas las barreras de CI.

## En curso
- VIT-102 Crear esquema stores (builder) — PR #14, en review

## Bloqueos
- ninguno

## Esperando a Cesar
1. ¿Hosting definitivo para el piloto?
   A) Railway  B) Vercel + worker  C) Decidir después de la POC
   Recomiendo: C (no bloquea la POC)

## Últimos cambios
- 2026-10-07 · VIT-101 · Mergeado CI con dependency-cruiser
```

## Checklist de verificación

- [ ] Las 5 secciones existen y están en este orden.
- [ ] El conteo de "Sprint actual" coincide con `gh issue list`.
- [ ] Cada ítem de "Esperando a Cesar" tiene opciones y recomendación.
- [ ] Ningún bloqueo está sin responsable.
- [ ] No hay secretos ni datos personales de vendedores.

## Errores comunes a evitar

- Preguntas abiertas a Cesar ("¿qué hacemos con pagos?").
- Dejar decisiones ya respondidas en "Esperando a Cesar".
- Mentir por optimismo: un issue en review no está "casi listo".
- Convertir STATUS.md en bitácora larga; lo histórico va a `docs/sprints/`.
- Editar STATUS.md sin leerlo y pisar el cambio de otro rol.
