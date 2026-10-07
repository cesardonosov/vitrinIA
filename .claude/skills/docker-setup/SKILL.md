---
name: docker-setup
description: Configura docker-compose local (Postgres con app_user sin BYPASSRLS, Mailpit, app, worker) y el Dockerfile multi-stage de producción; úsala al crear o modificar la infraestructura local o la imagen de la app.
---

# docker-setup

## Cuándo usarla
- Sprint 1: dejar que todo levante con un comando.
- Al agregar un servicio, cambiar versiones de Postgres/Node o tocar el `Dockerfile`.
- Cuando "en mi máquina Windows no levanta".

## Entradas
- Versiones fijadas de Node y pnpm (`.nvmrc`, campo `packageManager` en `package.json`).
- `.env.example` vigente (ver skill `env-secrets`).
- Ruta de migraciones `drizzle/migrations/` y entrypoint del worker `worker/`.

## Pasos
1. Crea `infra/docker/postgres/init/01-roles.sql` (solo corre en volumen vacío):
   ```sql
   CREATE ROLE migrator LOGIN PASSWORD :'migrator_pw';   -- dueño del esquema, corre migraciones
   CREATE ROLE app_user LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pw';
   GRANT CONNECT ON DATABASE vitrinia TO app_user;
   ```
   `app_user` nunca es dueño de tablas ni superusuario; las políticas RLS usan `FORCE ROW LEVEL SECURITY`. Las migraciones dan `GRANT` mínimos a `app_user`.
2. `docker-compose.yml` con 4 servicios: `postgres` (imagen `postgres:16-alpine` fijada), `mailpit` (SMTP 1025, UI 8025), `app` y `worker` (build del mismo Dockerfile, targets distintos).
3. Healthchecks: postgres `pg_isready -U migrator -d vitrinia`; mailpit `wget -q --spider http://localhost:8025/livez`; app `wget -q --spider http://localhost:3000/api/health`; worker con chequeo propio del heartbeat de pg-boss. `depends_on: condition: service_healthy`.
4. Volúmenes nombrados: `pgdata` (Postgres) y `uploads` (fotos en disco tras el puerto `ImageStorage`). Nada de bind mounts para `node_modules`.
5. Servicio efímero `migrate` (`profiles: [tools]`) que ejecuta `pnpm drizzle-kit migrate` con rol `migrator`; `app` y `worker` conectan con `app_user`.
6. Puertos solo en `127.0.0.1` (`"127.0.0.1:5432:5432"`); Cloudflare Tunnel entra por la app, nunca por Postgres.
7. Dockerfile multi-stage: `deps` (pnpm fetch + install con lockfile congelado) → `build` (`next build` con `output: "standalone"`) → `runner` (`node:XX-alpine`, usuario no root, `HEALTHCHECK`, copia solo `standalone`, `static`, `public`). Target `worker` desde la misma base. Sin secretos en `ARG`/`ENV` de build.
8. Scripts en `package.json`: `"dev:up": "docker compose up -d --build --wait"`, `"dev:down"`, `"dev:reset"` (este último pide confirmación y documenta que borra volúmenes). `pnpm dev:up` es el único comando oficial.
9. Windows: `.gitattributes` con `* text=auto eol=lf` y `*.sh text eol=lf`; repo clonado dentro de WSL2 (`~/vitrinia`, no `/mnt/c`); Docker Desktop con backend WSL2; Biome `lineEnding: "lf"`.
10. Verifica: `pnpm dev:up` → `docker compose ps` todo `healthy` → `curl -f localhost:3000/api/health` → UI Mailpit en `localhost:8025`.

## Salida
Archivos: `docker-compose.yml`, `Dockerfile`, `infra/docker/postgres/init/01-roles.sql`, `.dockerignore`, `.gitattributes`, runbook `docs/runbooks/levantar-entorno-local.md`.

## Checklist
- [ ] `docker compose config` sin errores ni warnings.
- [ ] `SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'` devuelve `f`.
- [ ] Todos los servicios `healthy` en menos de 90 s desde cero.
- [ ] Imagen de producción corre como no root y pesa < 300 MB.
- [ ] `.dockerignore` excluye `.env*`, `.git`, `node_modules`, `tests`.
- [ ] Imágenes con versión fija, no `latest`.
- [ ] Sin secretos en el compose; variables vienen de `.env.local`/dotenvx.

## Errores comunes
- Shell scripts con CRLF: `exec ./entrypoint.sh: no such file or directory`.
- Repo en `/mnt/c` con WSL2: build y HMR lentísimos.
- Conectar la app con el rol dueño de tablas: RLS no se aplica (error silencioso).
- Olvidar que `init/*.sql` solo corre con volumen vacío; para recrearlo, `dev:reset`.
- Exponer 5432 en `0.0.0.0` o usar `latest`.
- Healthcheck que depende de `curl` ausente en alpine.
