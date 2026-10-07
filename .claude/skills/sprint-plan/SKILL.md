---
name: sprint-plan
description: Propone el sprint semanal a Cesar (capacidad, objetivos, issues, dependencias, riesgos) en formato legible desde el celular y crea el milestone; úsala al iniciar cada sprint.
---

# sprint-plan

Rol principal: Orchestrator. Los sprints son de 1 semana (VITRINIA.md §3.5). El plan se propone a Cesar; no se ejecuta sin su OK.

## Cuándo usarla

- Al inicio de cada sprint, después de `sprint-close` del anterior.
- Si Cesar cambia el scope y hay que replanificar.

## Entradas

- Objetivo y demo de cierre del sprint según VITRINIA.md §3.5.
- `docs/STATUS.md`, `docs/sprints/sprint-NN.md` anterior (retro y TODO restantes), `docs/PENDIENTES.md`.
- Issues abiertos: `gh issue list --state open`.

## Pasos

1. Lee el sprint anterior: velocidad real (issues cerrados vs. planeados), retro y tendencia de `TODO(VIT-xxx)`.
2. Define la capacidad: nº de issues por rol que cabe en la semana. Regla: no más de 1 issue en curso por rol; Security y Reviewer cuentan como cuellos de botella si hay zonas sensibles.
3. Fija 2 a 3 objetivos del sprint, medibles, derivados de la demo de cierre. Todo lo que no sirva a un objetivo se difiere.
4. Crea los issues faltantes con la skill `write-spec` (todos cumplen Ready antes de entrar).
5. Ordena por dependencias: ADR/esquema (Architect) -> threat model (Security) -> spec visual (Designer) -> Builder -> Reviewer -> Security -> QA. Marca la ruta crítica.
6. Anticipa riesgos del sprint (máx. 5) con mitigación y un plan de recorte: qué issue se saca primero si falta tiempo.
7. Crea el milestone: `gh api repos/{owner}/{repo}/milestones -f title="Sprint N" -f due_on=<ISO8601> -f description="<objetivos>"` y asígnalo a cada issue.
8. Escribe el plan en `docs/sprints/sprint-NN.md` (sección Plan) y publícalo en STATUS.md bajo "Esperando a Cesar" con opciones: aprobar / ajustar scope / diferir.
9. Corto: el mensaje a Cesar cabe en una pantalla de celular, sin tablas anchas.

## Salida

Mensaje para Cesar (listas cortas, sin tablas):

```
SPRINT N — <nombre>  (lun DD – dom DD)
Objetivo: <1 frase>
Demo de cierre: <qué verás>

Capacidad: 8 issues (builder 4, architect 1, designer 1, devops 1, qa 1)

Issues
1. VIT-101 Crear módulo orders (architect) P0
2. VIT-102 ... (builder) P1 — depende de 101

Riesgos
- <riesgo> -> <mitigación>

Si falta tiempo, se recorta: VIT-1xx, VIT-1yy

Decisión que necesito: ¿apruebas este plan?
A) Sí  B) Sí, sacando VIT-1xx  C) Ajustar objetivo
Recomiendo: A
```

## Checklist de verificación

- [ ] Todos los issues del plan cumplen Definition of Ready.
- [ ] Cada issue tiene un rol, prioridad y milestone `Sprint N`.
- [ ] Las dependencias no forman ciclos y la ruta crítica está marcada.
- [ ] Hay plan de recorte explícito.
- [ ] El plan respeta el techo de OPEX (USD 50/mes) y la lista "Fuera de la POC".
- [ ] El mensaje se lee sin scroll horizontal y la pregunta tiene opciones y recomendación.

## Errores comunes a evitar

- Planear más de lo que cabe por arrastrar optimismo en lugar de usar la velocidad real.
- Meter issues sin Ready "para refinar durante el sprint".
- Olvidar tiempo de review, Security y QA en zonas sensibles.
- Presentar tablas anchas ilegibles en el celular.
- Cambiar scope por cuenta propia: el scope lo decide Cesar.
