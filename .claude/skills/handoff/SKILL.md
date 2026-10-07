---
name: handoff
description: Cierra cualquier tarea con el bloque HANDOFF obligatorio (Completed, Evidence, Findings, Open issues, Tasks created, Next owner, Required input, Priority); úsala al terminar o al pausar el trabajo de cualquier rol.
---

# handoff

Ningún agente termina con "listo". Todo cierre de tarea, pausa o traspaso lleva el bloque HANDOFF (AGENTS.md §7). Es lo que lee el siguiente rol y lo que Orchestrator copia a `docs/STATUS.md`.

## Cuándo usarla

- Al terminar una tarea (siempre, incluso si fue chica).
- Al detenerte por un bloqueo o por falta de input.
- Al devolver un PR (Reviewer, Security, QA) con veredicto.
- Nunca antes de haber corrido los comandos de verificación que citas como evidencia.

## Entradas

- Issue `VIT-xxx` de la tarea y su rama `feat/VIT-xxx-desc` o `fix/VIT-xxx-desc`.
- Lista de archivos tocados (`git diff --stat main...HEAD`).
- Resultado de tests, typecheck y lint de esta sesión.

## Pasos

1. Corre `git diff --stat main...HEAD` y `git status`; confirma que no hay cambios sin commit ni archivos ajenos a tu rol.
2. Corre las verificaciones de tu rol (`pnpm test`, `pnpm typecheck`, `pnpm lint`, o las del skill que aplicaste) y copia el resultado real.
3. Completa cada campo de la plantilla. Un campo sin contenido se escribe `- ninguno`, nunca se omite.
4. Por cada trabajo de otro rol que detectaste, crea el issue (`gh issue create`), asígnalo y lista su ID en `Tasks created`. No lo arregles en silencio.
5. Elige `Next owner` según el flujo de VITRINIA.md §9.1 (Builder → Reviewer → Security si es zona sensible → QA → Orchestrator → Cesar).
6. Si falta una decisión de Cesar, escríbela en `Required input` con pregunta + opciones + recomendación (Orchestrator la sube a STATUS.md).
7. Asigna `Priority` con la escala fija: P0 bloquea el sprint o hay riesgo de seguridad; P1 necesaria para el demo; P2 deseable en el sprint; P3 backlog.

## Salida

```
HANDOFF
Completed:      - <qué quedó hecho, en pasado, una línea por ítem>
Evidence:       - <PR #n, comando + resultado, captura en docs/qa/..., link a CI>
Findings:       - <hallazgos, deuda, riesgos; con severidad>
Open issues:    - <VIT-xxx pendientes que siguen abiertos y por qué>
Tasks created:  - <VIT-xxx nuevos creados en esta sesión, con rol asignado>
Next owner:     - <orchestrator|architect|designer|builder|devops|reviewer|security|qa|explorer|Cesar>
Required input: - <pregunta concreta + opciones + recomendación, o "ninguno">
Priority:       - <P0|P1|P2|P3>
```

Roles con veredicto añaden una línea final: Reviewer `APROBADO / CAMBIOS REQUERIDOS`; Security `APROBADO / VETO (motivo y control requerido)`; QA `QA APROBADO / BUGS ABIERTOS (IDs)`.

## Checklist de verificación

- [ ] Los 8 campos están presentes y en el orden de la plantilla.
- [ ] Cada ítem de `Evidence` es verificable (comando, PR o archivo existente), no una afirmación.
- [ ] Todo hallazgo fuera de tu rol tiene un issue en `Tasks created`.
- [ ] `Next owner` es un solo rol y es coherente con el flujo §9.1.
- [ ] Si hay `Required input`, incluye opciones y recomendación respondibles desde el celular.
- [ ] No hay secretos ni datos personales en el texto.

## Errores comunes a evitar

- Cerrar con "listo" o "todo ok" sin bloque.
- Evidencia vaga ("probé y funciona") en vez de comando y resultado.
- Dejar TODO sueltos como hallazgo: deben ser `TODO(VIT-xxx)` con issue abierto.
- Poner dos `Next owner` o uno inexistente.
- Mezclar prioridades: no todo es P0; P0 solo si bloquea o es de seguridad.
- Escribir el handoff en inglés: el bloque y su contenido van en español (las claves de la plantilla se mantienen).
