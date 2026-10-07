---
name: write-spec
description: Escribe un issue VIT-xxx con Definition of Ready completa (objetivo, historia, criterios Given/When/Then, fuera de scope, dependencias, riesgos, zona sensible, rol asignado); úsala al convertir un objetivo de sprint en trabajo ejecutable.
---

# write-spec

Rol principal: Orchestrator. Un issue que no cumple Ready no se asigna ni se trabaja (AGENTS.md §6).

## Cuándo usarla

- Al planificar un sprint, por cada objetivo que baje a tareas.
- Cuando un agente detecta trabajo de otro rol y debe crear el issue.
- Cuando un issue existente vuelve con "falta información".

## Entradas

- Objetivo del sprint (VITRINIA.md §3.5) y `docs/STATUS.md`.
- ADRs y docs de módulo relacionados.
- Decisiones ya tomadas por Cesar.

## Pasos

1. Busca duplicados: `gh issue list --search "<palabras>" --state all`. Si existe, actualízalo.
2. Define un solo objetivo medible, entregable en un PR chico (si necesita más de 2 días, divídelo).
3. Escribe la historia: "Como <vendedor|comprador|Cesar|agente>, quiero <acción>, para <beneficio>".
4. Escribe criterios de aceptación Given/When/Then, verificables y con valores concretos (no "rápido", sino "LCP < 2,5 s en 4G"). Incluye al menos un criterio de error y, si hay datos de tienda, uno de aislamiento entre tiendas.
5. Escribe "Fuera de scope" explícito para frenar el crecimiento (revisa VITRINIA.md §3.4).
6. Lista dependencias como `VIT-xxx` existentes o ADR necesarios; si bloquea, dilo.
7. Lista riesgos (técnico, seguridad, producto) con una mitigación por cada uno.
8. Marca zona sensible (auth, RLS/tenancy, MCP, secretos, datos personales, pedidos, pagos, infra). Si es sí: añade "Requiere threat-model de Security antes de construir".
9. Asigna un solo rol responsable y las etiquetas `rol:<rol>`, `sprint-NN`, `P0..P3`, y el milestone del sprint.
10. Crea con `gh issue create --title "<verbo + objeto>" --body-file spec.md --label ... --milestone "Sprint N"`. Título en español, imperativo.

## Salida

```
## Objetivo
<una frase>
## Historia
Como ..., quiero ..., para ...
## Criterios de aceptación
1. Given <contexto> When <acción> Then <resultado medible>
2. Given <entrada inválida> When <acción> Then <error tipado y mensaje en UI>
3. Given una sesión de la tienda A When pide datos de la tienda B Then recibe 404 (si aplica)
## Fuera de scope
- ...
## Dependencias
- VIT-xxx / ADR-NNNN / ninguna
## Riesgos
- <riesgo> — mitigación: ...
## Zona sensible
No | Sí: <cuál> -> threat-model requerido
## Rol asignado
builder | architect | designer | devops | qa | security
## Docs a actualizar
- docs/arquitectura/modulos/<modulo>.md
```

## Checklist de verificación

- [ ] Las 7 partes de Ready están presentes (objetivo, historia, criterios, fuera de scope, dependencias, riesgos, zona sensible) más rol.
- [ ] Cada criterio se puede convertir en un test sin interpretación.
- [ ] Hay al menos un criterio de error o borde.
- [ ] No hay decisiones de negocio, pagos o scope sin respuesta de Cesar (si las hay, van a STATUS.md "Esperando a Cesar").
- [ ] Tiene milestone, prioridad y un solo responsable.

## Errores comunes a evitar

- Criterios vagos ("debe verse bien").
- Issues épicos que mezclan dominio, UI y migración sin dividir por rol.
- Olvidar la zona sensible y saltarse a Security.
- Omitir "Fuera de scope" y dejar entrar features de la POC excluidas (Jumpseller, pagos integrados, asistente IA).
- Crear el issue en inglés o con TODO sueltos en su descripción.
