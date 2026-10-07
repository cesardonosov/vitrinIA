---
name: ci-pipeline
description: Define el pipeline de GitHub Actions con todas las barreras en orden, branch protection y el job semanal de TODOs huérfanos; úsala al crear o modificar `.github/workflows/`.
---

# ci-pipeline

## Cuándo usarla
- Sprint 1 (CI completo) y cada vez que se agrega o cambia una barrera.
- Cuando un PR llega a `main` sin una verificación que debería haber corrido.

## Entradas
- Versiones fijadas de Node y pnpm; `pnpm-lock.yaml`.
- Configs: `biome.json`, `commitlint.config.*`, `.dependency-cruiser.cjs`, `.gitleaks.toml`, `.semgrep/`, `playwright.config.ts`.
- Cambios en `.github/workflows/*` requieren review de Security (AGENTS.md §5).

## Pasos
1. `.github/workflows/ci.yml` con `on: pull_request` y `push` a `main`, `concurrency` con cancel-in-progress y `permissions: contents: read` por defecto.
2. Jobs en este orden (cada uno `needs` del anterior; falla rápido y barato primero):
   1. `install`: `pnpm/action-setup` con versión del `packageManager`, `actions/setup-node` con `node-version-file: .nvmrc`, caché de pnpm, `pnpm install --frozen-lockfile`.
   2. `typecheck`: `pnpm tsc --noEmit`.
   3. `lint`: `pnpm biome ci .`.
   4. `commitlint`: `pnpm commitlint --from origin/main --to HEAD`.
   5. `architecture`: `pnpm depcruise src --config .dependency-cruiser.cjs`.
   6. `todo-check`: script que busca `TODO|FIXME|HACK`; solo acepta `TODO(VIT-\d+)` y valida con `gh issue view <n> --json state` que exista y esté `OPEN` (`GH_TOKEN: ${{ github.token }}`, `issues: read`).
   7. `gitleaks`: `gitleaks/gitleaks-action` con `fetch-depth: 0`.
   8. `semgrep`: `semgrep ci --config p/typescript --config p/owasp-top-ten --config .semgrep/` (falla con severidad ERROR).
   9. `unit`: `pnpm vitest run --coverage` con umbral 90% en `src/modules/*/domain` y `application` (`coverage.thresholds` por glob).
   10. `integration`: `services: postgres:16` con roles de `infra/docker/postgres/init/`, migrar con `migrator`, correr tests con `app_user`; incluye `tenant-isolation`.
   11. `e2e`: `playwright install --with-deps chromium`, proyecto móvil primero (`--project=mobile`), luego desktop; sube `playwright-report` como artifact si falla.
   12. `perf-budget`: LCP < 2,5 s (4G simulado) y JS < 100 KB en vitrina.
   13. `build`: `pnpm build` y `docker build --target runner` sin push.
3. Rama protegida (`gh api -X PUT repos/{owner}/{repo}/branches/main/protection`): checks requeridos = todos los jobs, 1 review, dismiss stale reviews, linear history, sin force push, sin bypass de admins. Documentarlo en `docs/runbooks/branch-protection.md`.
4. `.github/workflows/todo-huerfanos.yml` con `schedule: cron "0 12 * * 1"` (+ `workflow_dispatch`): lista TODOs cuyo issue está cerrado o no existe; si hay, abre/actualiza un issue `chore: TODOs huérfanos` asignado a Orchestrator.
5. Acciones de terceros fijadas por SHA de commit; Renovate las actualiza.
6. Verifica: abre un PR de prueba con un `TODO` suelto y confirma que `todo-check` falla; luego revierte.

## Salida
`ci.yml`, `todo-huerfanos.yml`, `docs/runbooks/ci.md` con tabla job → qué protege → cómo reproducirlo local.

## Checklist
- [ ] El orden de jobs coincide con la lista del paso 2.
- [ ] Cada job se reproduce local con un `pnpm` script.
- [ ] Tiempo total < 15 min; minutos de Actions dentro del plan gratis.
- [ ] Sin secretos en logs ni `pull_request_target`.
- [ ] Branch protection activa y verificada con un PR de prueba.

## Errores comunes
- `pnpm install` sin `--frozen-lockfile`; versión de pnpm sin fijar.
- `fetch-depth` por defecto: gitleaks y commitlint no ven el historial.
- Cobertura global 90% en vez de por capa; o contando `presentation`.
- Integración contra el Postgres de desarrollo en lugar de un service aislado.
- Permisos `write-all` por defecto en el workflow.
- Marcar checks requeridos por nombre y luego renombrar el job (el merge queda bloqueado).
