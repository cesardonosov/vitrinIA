# Runbook: levantar el entorno local

Zona sensible (infraestructura, roles de base de datos). Cambios a este flujo pasan por Security. Fuentes: ADR-0003, `docs/VITRINIA.md` §8.1, skill `docker-setup`.

## Qué levanta

| Servicio | Qué es | Puerto (solo `127.0.0.1`) |
|---|---|---|
| `postgres` | Postgres 16.15 con volumen nombrado `pgdata` | 5432 |
| `mailpit` | SMTP de pruebas + UI para leer correos | 1025 (SMTP), 8025 (UI) |
| `app` | Next.js (build de la imagen local) | 3000 |
| `worker` | **Placeholder**: arranca y emite heartbeat; **no procesa jobs** ni toca la BD. pg-boss/outbox llegan en un issue posterior | no publica |
| `migrate` | Solo bajo `--profile tools`; único servicio que usa el rol `migrator` | no publica |

La imagen del `Dockerfile` es de desarrollo local, no la de producción.

## Requisitos

- Docker con Compose v2 (en Windows: Docker Desktop con backend WSL2 y el repo dentro de WSL2, p. ej. `~/vitrinia`, no en `/mnt/c`).
- Node/pnpm según el README (solo para el atajo `pnpm dev:up`).

## Primera vez

1. Crear el archivo de variables (no se versiona):
   ```bash
   cp .env.example .env.local
   ```
2. Completar a mano `SESSION_SECRET`, `POSTGRES_ADMIN_PASSWORD`, `MIGRATOR_PASSWORD` y `APP_USER_PASSWORD`. Generar cada valor con `openssl rand -hex 24`. Usar hex o alfanumérico: las contraseñas van dentro de URLs `postgres://`. Nunca pegar estos valores en issues, chats ni commits.
3. Levantar:
   ```bash
   pnpm dev:up
   # equivale a: docker compose --env-file .env.local up -d --build --wait
   ```
   Compose solo lee `.env` por defecto; por eso hay que pasar `--env-file .env.local`. Sin las variables, Compose falla con el nombre de la que falta.
4. Verificar: `docker compose --env-file .env.local ps` debe mostrar los 4 servicios `healthy`. App en http://localhost:3000, correos en http://localhost:8025.

## Roles de base de datos (ADR-0003)

`infra/docker/postgres/init/01-roles.sh` ejecuta `roles.psql` (extensión `.psql` a propósito: el entrypoint de Postgres ejecuta todo `*.sql` del directorio y lo correría dos veces, sin variables) y crea, **solo con el volumen vacío**:

- `migrator`: dueño de la base y del esquema `public` (y de las tablas que cree VIT-107). Lo usa solo `migrate`. `NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB`.
- `app_user`: lo usan `app` y `worker` (`DATABASE_URL`). `NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB`, no es dueño de nada y no puede crear objetos. Los permisos sobre cada tabla los da la migración correspondiente.
- `host_resolver`: `NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`, sin contraseña. Dueño de `resolve_host()` (VIT-107). `migrator` es miembro con `INHERIT FALSE, SET TRUE`: puede asignarle la propiedad de la función pero no hereda sus permisos. Se crea aquí porque `migrator` no puede crear roles.
- `vitrinia_admin`: superusuario de arranque del contenedor, solo administración. Ningún servicio lo usa.

**`DATABASE_URL` fuera de Docker** (por ejemplo `pnpm dev` en tu máquina) es siempre la URL de `app_user` (`postgres://app_user:$APP_USER_PASSWORD@127.0.0.1:5432/vitrinia`), nunca la del superusuario ni la de `migrator`. Postgres corre con `log_connections=on`: una conexión inesperada de `migrator` fuera de `migrate` aparece en `docker compose logs postgres`.

El `worker` placeholder se niega a arrancar si `DATABASE_URL` no usa `app_user`.

Verificar los roles (dentro del contenedor, por el socket local: no hace falta contraseña ni se expande en tu shell):

```bash
docker compose --env-file .env.local exec -T postgres psql -U vitrinia_admin -d vitrinia <<'SQL'
select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcanlogin
  from pg_roles where rolname in ('app_user','migrator','host_resolver');
select c.relname from pg_class c join pg_roles o on o.oid = c.relowner
  where o.rolname = 'app_user' and c.relnamespace = 'public'::regnamespace;
SQL
```

Resultado esperado: los tres roles con `f` en `rolsuper`, `rolbypassrls` y `rolcreaterole`; `host_resolver` con `rolcanlogin = f`; la segunda consulta (relaciones de las que `app_user` es dueño) devuelve 0 filas.

**Volúmenes existentes:** `host_resolver` y el `GRANT ... WITH INHERIT FALSE, SET TRUE` solo se crean con el volumen vacío. Si tu volumen `pgdata` es anterior a este cambio, hay que recrearlo (`docker compose --env-file .env.local down -v`, destructivo: borra la base local) o la migración de VIT-107 fallará con `role host_resolver is missing`.

## Migraciones

```bash
docker compose --env-file .env.local --profile tools run --rm migrate
```

Aplica `drizzle/migrations` con `drizzle-kit` como `migrator` (atajo: `pnpm db:migrate:compose`). La imagen `migrate` se construye con `pnpm install`, por lo que necesita acceso a npm al hacer `build`.

### Postgres de test aislada (integración)

```bash
# variables de test (solo en tu shell; nunca en el repo)
export POSTGRES_ADMIN_PASSWORD=... MIGRATOR_PASSWORD=... APP_USER_PASSWORD=...   # hex
export TEST_MIGRATOR_DATABASE_URL=postgres://migrator:$MIGRATOR_PASSWORD@127.0.0.1:55432/vitrinia
export TEST_DATABASE_URL=postgres://app_user:$APP_USER_PASSWORD@127.0.0.1:55432/vitrinia
pnpm test:db:up && pnpm db:migrate:test && pnpm test:integration
pnpm test:db:down   # borra el contenedor y sus datos (tmpfs)
```

Usa el puerto 55432 y un proyecto compose distinto (`vitrinia-test`): no toca la base de desarrollo. Los tests leen solo `TEST_*` y rechazan hosts no locales.

## Operación diaria

```bash
pnpm dev:down          # detiene y quita contenedores; los datos quedan en el volumen pgdata
pnpm dev:up            # vuelve a levantar con los mismos datos
docker compose --env-file .env.local logs -f app
```

## Reiniciar la base desde cero (destructivo)

Los scripts de `init/` solo corren con volumen vacío. Si cambias `roles.psql` o una contraseña de rol, hay que recrear el volumen, lo que **borra todos los datos locales**. No es un paso de rutina: hazlo solo si aceptas perder la base local, y avisa antes si hay datos que importen.

```bash
docker compose --env-file .env.local down -v
```

## Problemas comunes

- `required variable ... is missing`: falta la variable en `.env.local` o no pasaste `--env-file`.
- Puerto ocupado (5432, 3000, 1025, 8025): detén el servicio local que lo usa; no se publican en `0.0.0.0`.
- `exec ... no such file or directory` en un `.sh`: terminaciones CRLF; `.gitattributes` fuerza LF, vuelve a clonar.
- Cambié una contraseña y no pasa nada: el rol ya existe en el volumen; ver sección destructiva.
- El healthcheck de `app` consulta `/` porque `/api/health` aún no existe.

## Limitaciones conocidas

- `worker` es un placeholder (ver tabla).
- `app` aún no abre conexiones a la BD; que use `app_user` está garantizado por la configuración (`DATABASE_URL`), y el test que falla si `current_user` tiene `BYPASSRLS` pertenece al chequeo de RLS en CI (VIT-109).
