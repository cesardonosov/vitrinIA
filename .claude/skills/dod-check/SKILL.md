---
name: dod-check
description: Verifica la Definition of Done de VitrinIA (VITRINIA.md §11.3) punto por punto con evidencia; úsala antes de entregar un PR o de cerrar un issue VIT-xxx.
---

# dod-check

Un issue no está terminado hasta que los 13 puntos de Done tienen evidencia. Cada rol la corre sobre su propio trabajo; Orchestrator la corre de nuevo antes de cerrar.

## Cuándo usarla

- Builder, Designer, DevOps y Architect: antes del handoff final.
- Orchestrator: antes de mover el issue a Done y en `sprint-close`.
- Cualquier rol que revise trabajo ajeno y deba decidir si falta algo.

## Entradas

- Issue `VIT-xxx` con criterios de aceptación Given/When/Then.
- PR o rama con el cambio.
- Si aplica: threat model, spec visual y veredictos de Reviewer, Security y QA.

## Pasos

Verifica en orden y anota la evidencia de cada punto:

1. **Criterios cumplidos**: cada Given/When/Then del issue tiene un test o una demostración. Marca cada uno.
2. **Tipos correctos**: `pnpm typecheck` sin errores; `grep -rn "any" src --include=*.ts` sin `any` nuevos ni `@ts-ignore`.
3. **Tests**: `pnpm test` verde; dominio y aplicación con cobertura >= 90% (`pnpm test --coverage`); integración contra Postgres de test aislada; E2E Playwright si hay flujo de usuario (`pnpm test:e2e`, móvil primero).
4. **Estados de error**: cada caso de uso devuelve `Result` con errores tipados; la UI muestra mensaje de error, vacío y carga. Prueba un fallo real.
5. **Mobile first**: revisado a 375px (botones >= 44px, sin scroll horizontal), luego desktop.
6. **Accesibilidad**: axe sin violaciones (`pnpm test:e2e --grep a11y`), foco visible, contraste AA, etiquetas en formularios.
7. **Sin secretos**: `gitleaks detect --no-banner` limpio; nada fuera de `.env.local`/dotenvx; env validadas con Zod.
8. **Logs adecuados**: logs estructurados con `storeId` y sin datos personales ni secretos; `grep` de email/teléfono/tokens en los `logger.*` nuevos.
9. **Docs actualizadas**: módulo en `docs/arquitectura/modulos/`, ADR, `data-model` si hubo esquema, `docs/qa/` si hubo flujo nuevo.
10. **Review aprobado**: veredicto `APROBADO` del Reviewer en el PR.
11. **Security aprobado si aplica**: si el issue marca zona sensible (auth, tenancy, MCP, secretos, datos personales, pedidos, pagos, infra), veredicto `APROBADO` de Security y sin `VETO`.
12. **QA aprobado**: `QA APROBADO` con los bugs previos convertidos en tests.
13. **Sin blockers**: no hay issues abiertos con etiqueta `blocker` enlazados; `TODO(VIT-xxx)` nuevos tienen issue abierto; CI en verde.

## Salida

Pega en el PR o en el issue:

```
## DoD VIT-123
| # | Punto | Estado | Evidencia |
|---|---|---|---|
| 1 | Criterios cumplidos | OK | tests/e2e/cart.spec.ts |
| 11 | Security (si aplica) | N/A | no es zona sensible |
Veredicto: DONE / NO DONE (faltan: #3, #9)
```

## Checklist de verificación

- [ ] Los 13 puntos tienen estado OK o N/A justificado (N/A solo para E2E, Security y UI en cambios sin esas partes).
- [ ] Cada OK enlaza a un comando, archivo o veredicto real.
- [ ] El veredicto final es coherente con la tabla.

## Errores comunes a evitar

- Marcar OK por memoria sin correr el comando.
- Usar N/A para saltarte Security en una zona sensible.
- Dar Done con CI en rojo o con review pendiente.
- Olvidar la documentación: el Reviewer la trata como BLOCKER.
- Dejar un bug de QA sin su test de regresión.
