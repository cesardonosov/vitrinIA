# Runbook: secretos y variables de entorno

Zona sensible. Cualquier cambio a este flujo pasa por Security. Fuente: `docs/VITRINIA.md` §8.2 y skill `env-secrets`.

## Reglas

- Nunca un secreto en el repo, en logs, en errores ni en Sentry.
- Nunca el prefijo `NEXT_PUBLIC_` en un nombre que contenga `SECRET`, `KEY`, `TOKEN` o `PASSWORD`: la variable queda en el bundle del cliente. La validación Zod lo rechaza al arrancar.
- Todo `process.env.X` vive solo en `src/infra/env.ts`.

## Variables

El listado completo está en `.env.example` (sin valores). Para agregar una variable:

1. Añadirla a `.env.example` con un comentario (tipo, consumidor, rotación), sin valor.
2. Añadirla al esquema Zod de `src/infra/env.ts` (`z.string().min(32)` para secretos).
3. Agregar un caso en `src/infra/env.test.ts`.

## Desarrollo local

```bash
cp .env.example .env.local   # completar los valores a mano
pnpm dev
```

`.env.local` no se versiona. Si falta o es inválida una variable, la app termina con código 1 y escribe solo los nombres, por ejemplo: `Invalid environment variables: DATABASE_URL`. Nunca imprime valores.

## Cifrado local con dotenvx

dotenvx cifra los valores de un archivo `.env` y guarda la clave privada aparte en `.env.keys`.

```bash
pnpm dotenvx set SESSION_SECRET "<valor>" -f .env.staging   # cifra y genera .env.keys
pnpm dotenvx run -f .env.staging -- pnpm dev                # ejecuta con las variables descifradas
```

- `.env.keys` nunca se commitea ni se copia a otro lugar del repo; la clave privada de cada ambiente (`DOTENV_PRIVATE_KEY_<AMBIENTE>`) se guarda en el gestor de secretos del hosting y en el gestor de contraseñas de Cesar.
- Staging y producción no comparten clave.
- Hoy `.gitignore` excluye todo `.env*` (salvo `.env.example`) y el hook rechaza cualquier `.env*`, incluso cifrado. Versionar archivos cifrados queda pendiente de la decisión de secretos en hosting (D4) y requerirá ajustar `.gitignore` y `lefthook.yml` con aprobación de Security.

## Archivos ignorados

`.env*` (excepto `.env.example`), `.env.keys` e `infra/cloudflare/*.json` (credenciales de cloudflared).

## Hook pre-commit (lefthook + gitleaks)

`lefthook.yml` ejecuta en cada commit:

1. Bloqueo de archivos `.env*` (salvo `.env.example`) y `.env.keys`.
2. `gitleaks protect --staged --redact`.

Instalación (una vez por clon): `pnpm install` ejecuta `lefthook install` vía el script `prepare`. Si pnpm bloquea el script, correr `pnpm lefthook install`.

gitleaks es un binario aparte y debe estar en el `PATH`:

- macOS: `brew install gitleaks`
- Linux: descargar el binario desde las releases de gitleaks, o `go install github.com/zricethezav/gitleaks/v8@latest`.

Sin el binario el hook falla (no se omite en silencio). Saltarse el hook con `--no-verify` está prohibido; gitleaks también corre en CI (VIT-105) y ese chequeo no se puede omitir.

## Si se filtra un secreto (P0)

1. Revocar el secreto de inmediato en el proveedor.
2. Generar uno nuevo y desplegarlo (skill `deploy`, con OK de Cesar para producción).
3. Ubicar el alcance con `git log -S "<fragmento>" --all` (no pegar el valor completo en tickets ni chats).
4. Avisar a Security y registrar el incidente.
5. Limpiar el historial solo con aprobación de Cesar.

## Verificación

- `pnpm test`: pruebas de `src/infra/env.test.ts` (variable faltante, valores no impresos, `NEXT_PUBLIC_*` con SECRET/KEY/TOKEN/PASSWORD).
- Arrancar sin `DATABASE_URL` debe terminar con error que nombra la variable.
- Commit de prueba con un token falso debe ser bloqueado por el hook.
