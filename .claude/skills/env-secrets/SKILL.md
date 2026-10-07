---
name: env-secrets
description: Gestiona variables de entorno y secretos por ambiente con dotenvx cifrado, `.env.example` sin valores, validación Zod al arrancar, rotación y hook pre-commit con gitleaks; úsala al agregar, rotar o auditar cualquier variable.
---

# env-secrets

## Cuándo usarla
- Al agregar una variable o un proveedor nuevo (Sentry, Turnstile, Mercado Pago, SMTP real).
- Al preparar un ambiente nuevo (staging/producción) o rotar una clave.
- Tras cualquier sospecha de filtración (P0 de seguridad).

## Entradas
- Lista de variables con: nombre, ambiente(s), si es secreta, quién la consume (app, worker, CI).
- Módulo `src/infra/env.ts` (esquema Zod).

## Pasos
1. Ambientes y archivos: `.env.local` (dev, no versionado), `.env.test`, `.env.staging`, `.env.production`. Los de staging/producción se versionan **cifrados** con dotenvx; la clave privada (`.env.keys`) nunca entra al repo.
2. Registra la variable en `.env.example` sin valor ni ejemplo real: `SESSION_SECRET=` y un comentario `# secreto · app+worker · rotación 90 d`.
3. Agrégala al esquema Zod de `src/infra/env.ts`: `z.string().min(32)` para secretos, `z.url()` para URLs, `z.enum` para `APP_ENV`. Nada de `process.env.X` fuera de ese módulo (regla de dependency-cruiser/Biome).
4. Validación al arrancar: `app` y `worker` llaman `parseEnv()` en el primer import; si falla, imprimen **solo los nombres** de las variables inválidas y salen con código 1 (nunca el valor).
5. Cifra y carga: `pnpm dotenvx set NOMBRE "valor" -f .env.production` y ejecución con `dotenvx run -f .env.production -- node server.js`. La clave privada de cada ambiente se guarda en el gestor de secretos del proveedor (variable `DOTENV_PRIVATE_KEY_PRODUCTION`) y en el gestor de contraseñas de Cesar.
6. CI: secretos de GitHub Actions solo para lo que el pipeline necesita (`GITHUB_TOKEN`, claves de test); nada de producción en CI.
7. Hook pre-commit (lefthook): `gitleaks protect --staged --redact` y bloqueo de archivos `.env*` sin cifrar y de `.env.keys`. CI repite gitleaks sobre el historial.
8. Rotación: calendario en `docs/runbooks/rotar-secretos.md` (sesión y MCP 90 d, API keys de terceros según proveedor). Procedimiento: crear nueva → `dotenvx set` → deploy (skill `deploy`) → revocar la anterior → verificar.
9. Filtración: revocar de inmediato, rotar, `git log -S` para ubicar el alcance, reportar a Security, documentar en el runbook de incidentes. Limpiar historial solo con aprobación de Cesar.
10. Verifica: arranque con una variable faltante debe fallar con mensaje claro; `git grep -nE "(sk_|AKIA|BEGIN PRIVATE)"` sin resultados; los logs no contienen valores.

## Salida
Tabla en `docs/runbooks/variables-de-entorno.md`: variable · ambientes · secreta · consumidor · rotación · dueño.

## Checklist
- [ ] `.env.example` actualizado, sin valores.
- [ ] Esquema Zod actualizado y probado con un test unitario.
- [ ] `.env.keys` y `.env.local` en `.gitignore`.
- [ ] Hook gitleaks instalado (`pnpm lefthook install`) y CI activo.
- [ ] Ningún secreto en `NEXT_PUBLIC_*`.
- [ ] Secretos nunca en logs, errores ni Sentry (`beforeSend` limpia).

## Errores comunes
- Prefijo `NEXT_PUBLIC_` en una clave privada: queda en el bundle del cliente.
- Compartir la misma clave entre staging y producción.
- Loguear `process.env` o la config completa al arrancar.
- Pasar secretos como `ARG` en el Dockerfile: quedan en las capas de la imagen.
- Guardar `.env.keys` "temporalmente" en el repo.
- Validar con `z.string()` sin longitud mínima: un secreto vacío pasa.
