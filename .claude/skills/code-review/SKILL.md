---
name: code-review
description: Revisa un PR con checklist de corrección, tipos, errores, tests, performance, accesibilidad y docs, y emite hallazgos BLOCKERS/IMPORTANT/NICE TO HAVE/TECH DEBT con veredicto; úsala antes de mezclar cualquier PR.
---

# code-review

## Cuándo usarla
- Todo PR del Builder, DevOps o Designer antes de merge.
- Solo lectura: puedes correr tests, typecheck y lint, pero nunca editas archivos.

## Entradas
Issue VIT-xxx y criterios de aceptación, spec visual, ADRs, diff completo (`git diff main...HEAD`), aprobación de Security si es zona sensible.

## Pasos
1. Lee el issue y la spec; el PR debe resolver eso, nada más (scope creep es hallazgo).
2. Corre: `pnpm typecheck && pnpm lint && pnpm test && pnpm depcruise`. Un rojo es BLOCKER.
3. **Corrección y casos borde**: lista vacía, null/undefined, strings con emojis/tildes/80+ caracteres, montos 0 y máximos, doble submit, concurrencia (`version`), zona horaria (UTC vs `America/Santiago`).
4. **Tipos**: sin `any`, sin `as` injustificado ni `!`; uniones discriminadas; Zod en bordes; `Money` y `StoreId` en vez de `number`/`string`.
5. **Duplicación**: busca con `rg` si ya existía (regla central AGENTS.md §12). Código copiado de otro módulo es IMPORTANT.
6. **Nombres**: inglés, intención clara, consistentes con `docs/producto/GLOSSARY.md`.
7. **Errores**: negocio con `Result<T,E>`, no `throw`; sin `catch` vacío; mensajes al usuario sin detalles internos; logs sin datos personales ni secretos.
8. **Tests significativos**: ¿fallarían si rompo la lógica? Revisa aserciones reales, caso de cruce de `StoreId`, casos de error; sin snapshots gigantes ni mocks de lo que se prueba. Cobertura dominio/aplicación ≥ 90%.
9. **Performance**: N+1, consultas sin índice por `store_id`, `"use client"` innecesario, imágenes sin `sizes`, JS de vitrina > 100 KB.
10. **Accesibilidad y mobile first**: 44px, foco, `alt`, aria, 375px sin overflow.
11. **Docs**: módulo en `docs/arquitectura/modulos/` actualizado; si falta, BLOCKER. ADR si hubo decisión.
12. **TODO**: solo `TODO(VIT-xxx)` con issue abierto: `rg "TODO|FIXME|HACK" -n` y valida cada uno.
13. Corre `arch-conformity`. Si toca zona sensible sin aprobación de Security, no apruebes.
14. Lo que no es de este PR va como issue nuevo (TECH DEBT), no como bloqueo.

## Salida
```
REVIEW PR #<n> · VIT-xxx
BLOCKERS
 - src/modules/catalog/application/create-product.ts:42 — <problema>. Sugerencia: <cambio>
IMPORTANT
 - archivo:línea — ...
NICE TO HAVE
 - archivo:línea — ...
TECH DEBT
 - archivo:línea — ... (issue VIT-xxx creado)
Comandos corridos: typecheck ✔ lint ✔ test ✔ depcruise ✔
VEREDICTO: APROBADO | CAMBIOS REQUERIDOS
```
Cierra con HANDOFF. Cada hallazgo lleva `archivo:línea` y una sugerencia accionable.

## Checklist
- [ ] Probé que cumple los criterios de aceptación.
- [ ] CI local en verde.
- [ ] Revisé borde, tipos, errores, tests, performance, a11y.
- [ ] Docs y TODOs verificados.
- [ ] Zona sensible con OK de Security.
- [ ] Veredicto explícito.

## Errores comunes
- Comentar estilo que Biome ya cubre.
- Aprobar tests que solo verifican que "no explota".
- Reescribir el código en el comentario en vez de explicar el problema.
- Mezclar hallazgos ajenos al PR como BLOCKERS.
- Olvidar revisar el SQL de migraciones y la política RLS.
