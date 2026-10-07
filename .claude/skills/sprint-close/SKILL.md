---
name: sprint-close
description: Cierra el sprint con guion de demo, verificación DoD por issue, retro de 3 líneas, conteo y tendencia de TODO(VIT-xxx), resumen corto para Cesar y docs/sprints/sprint-NN.md; úsala el último día de cada sprint.
---

# sprint-close

Rol principal: Orchestrator. Se ejecuta después de que el Explorer haya pasado por `main` (VITRINIA.md §9.1: antes de cada demo).

## Cuándo usarla

- Último día del sprint, antes de la demo a Cesar.
- Al cerrar anticipadamente un sprint por cambio de scope.

## Entradas

- Milestone `Sprint N` y sus issues: `gh issue list --milestone "Sprint N" --state all --json number,title,state`.
- `docs/STATUS.md`, plan en `docs/sprints/sprint-NN.md`.
- Resultado del Explorer y de QA sobre `main`.

## Pasos

1. Corre la skill `dod-check` sobre cada issue cerrado o por cerrar. Un issue sin DoD completa vuelve a "In Progress" o pasa al siguiente sprint con motivo.
2. Confirma que `main` está verde en CI y que el Explorer corrió `smoke-crawl` sobre el último merge; sus issues quedan en el sprint o priorizados.
3. Escribe el guion de demo (máx. 8 pasos) que reproduce la "Demo de cierre" de VITRINIA.md §3.5, con datos de prueba, URLs locales o del túnel, resultado esperado y plan B si algo falla. Ensáyalo completo una vez en viewport móvil.
4. Cuenta los TODO: `grep -rnE "TODO\(VIT-[0-9]+\)" src worker tests | wc -l`. Compara con el sprint anterior (`docs/sprints/sprint-(NN-1).md`) y anota tendencia: sube, baja o estable. Verifica que ninguno apunte a un issue cerrado. Si sube dos sprints seguidos, crea un issue de deuda.
5. Retro de exactamente 3 líneas: qué funcionó, qué no, qué cambiamos.
6. Mueve lo no terminado: reasigna issues abiertos al próximo milestone y cierra el actual con `gh api -X PATCH repos/{owner}/{repo}/milestones/<n> -f state=closed`.
7. Crea `docs/sprints/sprint-NN.md` con la plantilla y actualiza `docs/STATUS.md` (skill `status-update`).
8. Envía a Cesar el resumen corto, con la demo agendada y la decisión que necesitas (aprobar demo, scope del siguiente sprint).

## Salida

`docs/sprints/sprint-NN.md`:

```
# Sprint N — <nombre>
Fechas: AAAA-MM-DD a AAAA-MM-DD
## Resultado
Objetivo: cumplido | parcial | no cumplido — <1 frase>
Issues: 7 cerrados de 9. Movidos: VIT-120 (motivo), VIT-121 (motivo)
## DoD por issue
| Issue | DoD | Pendiente |
|---|---|---|
## Guion de demo
1. ... (resultado esperado) · Plan B: ...
## Retro
- Funcionó: ...
- No funcionó: ...
- Cambiamos: ...
## Deuda
TODO(VIT-xxx): 12 (sprint anterior: 15) — baja
## Próximo sprint
<objetivo sugerido>
```

Resumen a Cesar (cabe en un celular): objetivo logrado, 3 viñetas de lo visible, riesgo principal, TODO con tendencia, hora de demo y la pregunta con opciones y recomendación.

## Checklist de verificación

- [ ] Todos los issues del milestone están cerrados o movidos con motivo.
- [ ] El conteo de TODO y su tendencia están en el documento y en el resumen.
- [ ] La retro tiene 3 líneas, no más.
- [ ] La demo se ensayó en móvil y tiene plan B.
- [ ] `sprint-NN.md` está en español y no contiene secretos ni datos reales de vendedores.

## Errores comunes a evitar

- Contar como "hecho" un issue sin review, QA o Security cuando aplica.
- Demo sin ensayo o con datos reales de vendedores.
- Retro larga o genérica ("mejorar comunicación").
- Ignorar TODO huérfanos (issue cerrado) que el CI debería haber rechazado.
- Arrastrar issues en silencio al siguiente sprint sin decirlo a Cesar.
