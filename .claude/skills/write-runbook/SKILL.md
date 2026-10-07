---
name: write-runbook
description: Entrega la plantilla de runbook (propósito, prerequisitos, pasos, verificación, rollback, contacto) y la lista mínima de runbooks del proyecto; úsala al crear o revisar procedimientos operativos en `docs/runbooks/`.
---

# write-runbook

## Cuándo usarla
- Al crear cualquier procedimiento operativo repetible (deploy, backup, rotación, incidente).
- Tras un incidente: todo arreglo manual se convierte en runbook.
- Al revisar un runbook que nadie ha ejecutado en 90 días.

## Entradas
- El procedimiento ejecutado al menos una vez, con comandos reales y su salida.
- Dueño (rol) y frecuencia de revisión.
- Skill de origen (`deploy`, `backup-restore`, etc.).

## Pasos
1. Ejecuta el procedimiento en un ambiente seguro (local o staging) y copia los comandos tal cual; nunca documentes de memoria (prohibida la documentación ficticia).
2. Crea `docs/runbooks/<verbo-objeto>.md` (kebab-case, español) con la plantilla de abajo.
3. Cada paso es una acción única con comando exacto y resultado esperado. Comandos para Windows/WSL2 y para el servidor, si difieren.
4. Marca los pasos destructivos o irreversibles con `[DESTRUCTIVO]` y exige confirmación; los agentes no los ejecutan sin OK explícito (AGENTS.md §9).
5. Escribe la verificación como comandos con resultado observable, no como "revisar que funcione".
6. Define el rollback aunque sea "no aplica: idempotente".
7. Pide a otro rol (o a Cesar) que lo ejecute siguiéndolo al pie de la letra; corrige lo que falle. Registra la fecha en el encabezado.
8. Enlázalo desde `docs/runbooks/README.md` y desde la skill relacionada. Sin secretos ni datos personales en el texto.

## Salida
```markdown
# <Título en infinitivo>
> Dueño: <rol> · Última ejecución verificada: <AAAA-MM-DD> · Revisión: cada <90 días>

## Propósito
<Qué resuelve y cuándo se usa, en 2 líneas.>

## Prerequisitos
- Accesos: <...> · Herramientas: <...> · Estado previo: <...>

## Pasos
1. <acción> — `comando` → esperado: <salida>
2. ...

## Verificación
- `comando` → <resultado esperado>

## Rollback
1. <cómo volver atrás> / "No aplica porque ..."

## Contacto
- Primero: <rol/agente> · Escala a: Cesar (<canal>) si afecta producción, datos o pagos.
```
Lista mínima (crear en Sprint 1 salvo indicación):
`levantar-entorno-local` · `ci` y `branch-protection` · `deploy` (antes del primer deploy) · `rollback` · `backup`, `restore` y `restore-log` · `rotar-secretos` · `variables-de-entorno` · `demo-tunnel` · `observabilidad` · `incidente-seguridad` (filtración, cruce de tiendas) · `revocar-token-mcp` · `baja-de-tienda-y-borrado-de-datos` (Ley 21.719).

## Checklist
- [ ] Probado por alguien distinto del autor.
- [ ] Cada paso tiene comando y resultado esperado.
- [ ] Rollback y contacto presentes.
- [ ] Fecha de última verificación actualizada.
- [ ] Enlazado en `docs/runbooks/README.md`.
- [ ] Sin secretos, emails ni teléfonos.

## Errores comunes
- Pasos vagos ("configurar el servidor").
- Comandos que solo funcionan en la máquina del autor (rutas de Windows absolutas).
- Olvidar el rollback o el contacto de escalamiento.
- Runbook escrito antes de ejecutar el procedimiento.
- Copiar valores reales de variables en los ejemplos.
- Dejarlo caducar: sin fecha de verificación, nadie confía en él.
