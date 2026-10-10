# VitrinIA

Vitrinas online gratis para vendedores de Instagram/WhatsApp en Chile. Definiciones en `docs/VITRINIA.md`; reglas para agentes en `AGENTS.md`.

## Requisitos

- Node 22.22.0 (fijado en `.nvmrc`; `engine-strict` rechaza otras versiones). Cualquier gestor sirve (nvm, fnm, Volta, paquete del sistema); `nvm` no es obligatorio.
- pnpm 10.28.0 (fijado en `packageManager`; actívalo con `corepack enable`).
- Docker con Compose v2, con el **daemon corriendo** (`docker info` debe responder). Solo para el entorno completo, los tests de integración y `docker build`.
- Acceso a internet: `pnpm install` y `docker build` descargan paquetes (corepack baja pnpm; la imagen ejecuta `pnpm install`). Detrás de un proxy, el builder de Docker no lo hereda de tu shell: hay que configurarlo en Docker.
- `openssl` para generar secretos locales.
- Opcionales, solo para reproducir en local los checks `gitleaks` y `semgrep` de CI: [gitleaks](https://github.com/gitleaks/gitleaks) (`gitleaks detect --redact`) y semgrep 1.180.0, la versión de CI (`pipx install "semgrep==1.180.0"`). Detalle en `docs/runbooks/ci.md`.

## Cómo levantar

```bash
# Con Node 22.22.0 activo (con nvm: `nvm use`, que toma .nvmrc)
corepack enable
pnpm install
pnpm dev             # desarrollo en http://localhost:3000
```

`pnpm install` imprime `Ignored build scripts: core-js-pure, esbuild, lefthook`. Es intencional: `pnpm.onlyBuiltDependencies` está vacío para que ninguna dependencia ejecute scripts al instalar (control de cadena de suministro, ver `docs/runbooks/ci.md`). No es un error y no hay que correr `pnpm approve-builds`. Permitir uno requiere justificación en un PR y review de Security.

### Entorno completo con Docker

Levanta Postgres, Mailpit, app y worker (placeholder: aún no procesa jobs). **No es un solo comando desde cero**: hay un paso humano previo, porque los secretos los genera una persona y nunca se versionan (ADR-0009). Los agentes no leen `.env.local`.

1. Verifica que el daemon de Docker corre (`docker info`) y que hay internet (el build baja pnpm y dependencias).
2. Copia la plantilla (no se versiona):
   ```bash
   cp .env.example .env.local
   ```
3. Edita `.env.local` y completa `APP_ENV=development`, `LOG_LEVEL=info` y los 4 secretos. Genera cada valor con un comando por secreto y pégalo en su línea:
   ```bash
   openssl rand -hex 24   # SESSION_SECRET (mínimo 32 caracteres)
   openssl rand -hex 24   # POSTGRES_ADMIN_PASSWORD
   openssl rand -hex 24   # MIGRATOR_PASSWORD
   openssl rand -hex 24   # APP_USER_PASSWORD
   ```
   Usa un valor distinto para cada uno. Hex o alfanumérico: las contraseñas van dentro de URLs `postgres://`. Nunca los pegues en issues, chats ni commits.
4. Ahora sí, un comando:
   ```bash
   pnpm dev:up                  # docker compose --env-file .env.local up -d --build --wait
   pnpm dev:down                # detiene; los datos persisten en el volumen pgdata
   ```

App en http://localhost:3000, correos en http://localhost:8025.

Tienda de demo (Kanuwiñ), después de `pnpm db:migrate:compose`:
```bash
pnpm db:seed:demo            # crea la tienda y su host local; se puede repetir
```
Y se abre en http://kanuwin.localhost:3000 (Chrome, Edge y Firefox resuelven `*.localhost` sin tocar nada).

Detalle, roles `migrator`/`app_user` y problemas comunes en `docs/runbooks/levantar-entorno-local.md`.

## Scripts

Cada check de CI y cómo reproducirlo está en `docs/runbooks/ci.md`.

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, compilación de producción y servidor del build |
| `pnpm dev:up` / `pnpm dev:down` | Levanta / detiene el entorno Docker local |
| `pnpm typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`) |
| `pnpm lint` | Biome; `any` explícito es error |
| `pnpm commitlint` | Valida mensajes de commit, p. ej. `pnpm commitlint --from origin/main --to HEAD` |
| `pnpm test` / `pnpm test:coverage` | Tests unitarios / con cobertura (umbral 90 %) |
| `pnpm arch` | Reglas de capas con dependency-cruiser |
| `pnpm arch:fixtures` | Corre las reglas sobre fixtures; sale con código 32 por diseño (violaciones a propósito) |
| `pnpm arch:graph` | Regenera `docs/arquitectura/dependencias.mmd` |
| `pnpm todo-check` | Formato de `TODO(VIT-xxx)` (modo offline) |
| `pnpm semgrep:test` | Fixtures de las reglas propias de Semgrep (requiere semgrep) |
| `pnpm test:db:up` / `pnpm test:db:down` | Levanta / destruye el Postgres de test (`docker-compose.test.yml`; `down` borra el volumen) |
| `pnpm db:migrate:test` | Aplica migraciones al Postgres de test (usa `TEST_MIGRATOR_DATABASE_URL`) |
| `pnpm test:integration` | Tests de integración contra el Postgres de test |
| `pnpm test:tenant-isolation` / `pnpm test:tenant-isolation:mutations` | Arnés de cruce de tiendas y su mutation check |
| `pnpm db:generate` / `pnpm db:migrate` | Genera migración con drizzle-kit / aplica migraciones (`DATABASE_URL`) |
| `pnpm db:migrate:compose` | Aplica migraciones dentro de Docker (perfil `tools`) |
| `pnpm db:seed:demo` | Crea la tienda de demo Kanuwiñ en `kanuwin.localhost:3000` (como `app_user`, idempotente; solo Docker local) |
| `pnpm tokens:build` | Genera los tokens de diseño |
| `pnpm storybook` / `pnpm build-storybook` | Storybook en :6006 / build estático |
| `pnpm docs:store-config-schema` | Regenera `docs/arquitectura/store-config.schema.json` |

## Estructura

`src/app/(portal)`, `src/app/(vitrina)`, `src/modules`, `src/shared`, `src/infra` y `src/proxy.ts` (pone el CSP y enruta por host: portal o vitrina, ADR-0011). Detalle en `docs/VITRINIA.md` §6.4.
