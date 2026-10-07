---
name: conventions
description: Aplica las convenciones de VitrinIA (ramas, commits semánticos, idioma, TODO(VIT-xxx), PRs chicos, archivos protegidos); úsala antes de crear una rama, commitear, abrir un PR o tocar archivos sensibles.
---

# conventions

Fuente: VITRINIA.md §11.2 y AGENTS.md §5, §6, §13. Las barreras viven en commitlint, lefthook, Biome y CI; esta skill dice cómo cumplirlas a la primera.

## Cuándo usarla

- Antes de empezar una tarea (rama), antes de cada commit y antes de abrir el PR.
- Cuando vayas a tocar un archivo que podría estar protegido.
- Cuando quieras dejar un TODO.

## Entradas

- Issue `VIT-xxx` que cumple Definition of Ready.
- Lista de archivos que planeas modificar.

## Pasos

1. Rama desde `main` actualizada: `git switch -c feat/VIT-123-add-cart-totals` o `fix/VIT-123-...`. Descripción en inglés, kebab-case, máx. 5 palabras. Nunca trabajes en `main`.
2. Revisa los archivos protegidos (ver lista abajo). Si tu cambio los toca, detente: necesitas un ADR aprobado por Cesar (skill `write-adr`).
3. Código, identificadores, comentarios y mensajes de commit en inglés. Documentación (`docs/`, README, issues, PR description) en español. Textos de UI en es-CL.
4. Commits semánticos validados por commitlint: `tipo(scope): descripción en imperativo`, tipos `feat|fix|docs|refactor|test|chore|ci|perf|build`. El scope es el módulo (`catalog`, `orders`, `store-config`...). Ejemplo: `feat(orders): snapshot product name and price on checkout`. Referencia el issue en el cuerpo: `Refs VIT-123`.
5. Para dejar deuda, escribe solo `// TODO(VIT-456): reason`. El issue VIT-456 debe existir y estar abierto; créalo antes con `gh issue create`. TODO, FIXME o HACK sueltos fallan el CI.
6. Mantén el PR chico: un issue, un objetivo, idealmente menos de 400 líneas netas y sin refactors ajenos. Si crece, divídelo y crea issues.
7. Antes del push: `pnpm lint && pnpm typecheck && pnpm test` y lefthook pasa (gitleaks incluido). Push a tu rama, nunca a `main`; abre el PR con `gh pr create` en español.
8. Cada PR actualiza la documentación que toca (módulo en `docs/arquitectura/modulos/`, ADR, data-model si aplica).

## Archivos protegidos (requieren ADR aprobado por Cesar)

- `docs/VITRINIA.md`, `AGENTS.md`, `.claude/settings.json`
- `.github/workflows/*` (solo DevOps, con review de Security)
- `drizzle/migrations/*` ya aplicadas: nunca se editan, se crea una migración nueva
- `src/shared/kernel/*` (solo Architect)

## Salida

Rama, commits y PR que pasan commitlint y CI. Descripción del PR:

```
## Qué
<resumen en español> — Cierra VIT-123
## Cómo verificar
<comandos o pasos>
## Docs actualizadas
<rutas>
```

## Checklist de verificación

- [ ] `git branch --show-current` sigue el patrón `feat|fix/VIT-xxx-desc`.
- [ ] `git log main..HEAD --format=%s` cumple el formato semántico y está en inglés.
- [ ] `git diff main...HEAD | grep -E "TODO|FIXME|HACK"` solo muestra `TODO(VIT-xxx)` existentes.
- [ ] `git diff --name-only main...HEAD` no incluye archivos protegidos (o hay ADR aprobado).
- [ ] El PR cierra un solo issue y tiene docs actualizadas.

## Errores comunes a evitar

- Editar una migración ya aplicada "porque es chiquito".
- Commits `wip`, `fix stuff` o en español.
- `TODO(VIT-xxx)` apuntando a un issue cerrado o inexistente.
- Mezclar refactor y feature en el mismo PR.
- `git push --force`, `reset --hard` o push directo a `main`: prohibidos.
