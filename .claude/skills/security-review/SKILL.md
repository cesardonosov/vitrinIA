---
name: security-review
description: Checklist de revisión de seguridad de PRs en zona sensible (authn/authz, aislamiento de tiendas, RLS, cookies, CSP, Zod, archivos, secretos, PII, rate limit, dependencias) con veredicto APROBADO o VETO; úsala en todo PR que toque auth, tenancy, MCP, secretos, datos personales, pedidos, pagos o infra.
---

# security-review

## Cuándo usarla
- Después de Reviewer y antes de QA, en PRs de zona sensible (VITRINIA.md §9.1).
- Cambios a `.github/workflows/*`, Dockerfile, compose, Cloudflare o `middleware.ts`.
- Rol Security: solo lectura; puedes correr tests y escáneres, no editar.

## Entradas
- PR/diff completo, issue y threat model (`docs/security/threat-models/<feature>.md`).
- Resultados de CI (Semgrep, gitleaks, integración).
- Código en la rama del PR (`gh pr checkout <n>`).

## Pasos
1. Contrasta el diff con los controles exigidos del threat model: cada control debe tener código y test; faltante = VETO.
2. Recorre el checklist de abajo con evidencia (archivo:línea o comando).
3. Ejecuta: `pnpm test:integration`, `pnpm test tenant-isolation`, `semgrep ci`, `gitleaks detect --redact`, `pnpm audit --prod`.
4. Intenta romperlo: cambia el id/`StoreId` por el de otra tienda, quita la cookie, repite el request, sube un archivo manipulado.
5. Clasifica hallazgos: Crítico/Alto = VETO; Medio = VETO si es zona de aislamiento o pagos, si no condición con issue `VIT-xxx` y fecha; Bajo = issue.
6. Emite veredicto en HANDOFF con motivo y control requerido. Crea issues para el dueño; no corrijas el código.

## Checklist
- [ ] **AuthN**: sesión Auth.js validada en el servidor; magic link de un solo uso y con expiración corta.
- [ ] **AuthZ**: cada caso de uso recibe `StoreId` y lo compara con la sesión; ningún `storeId` viene del body/query sin verificación.
- [ ] **Middleware no es barrera**: ninguna decisión de acceso depende de headers que ponga `middleware.ts`.
- [ ] **RLS**: tabla nueva con `ENABLE` + `FORCE ROW LEVEL SECURITY`, política por `app.store_id`, `SET LOCAL` por transacción, conexión con `app_user` sin `BYPASSRLS`.
- [ ] **Cookies**: prefijo `__Host-`, `Secure`, `HttpOnly`, `SameSite`, sin `Domain=`.
- [ ] **CSP** estricta intacta; ningún HTML libre del vendedor en vitrinas; sin `dangerouslySetInnerHTML` con datos de usuario.
- [ ] **Zod** en todo borde (actions, route handlers, tools MCP, env, webhooks).
- [ ] **Archivos**: tipo real por magic bytes, límite de tamaño, EXIF/GPS eliminado, nombres generados, sin path traversal.
- [ ] **Secretos**: ninguno en código, `NEXT_PUBLIC_*`, Dockerfile ni workflows; gitleaks limpio.
- [ ] **PII en logs/Sentry**: sin emails, teléfonos, direcciones ni tokens.
- [ ] **Abuso**: rate limit y cuotas por tienda; Turnstile en flujos públicos; respuestas que no enumeran usuarios ni tiendas.
- [ ] **Dependencias**: `pnpm audit --prod` sin Altas; paquetes nuevos justificados, mantenidos y con licencia compatible.
- [ ] **Auditoría**: acciones sensibles registradas en `audit` (append-only).
- [ ] **Infra** (si aplica): permisos mínimos en workflows, puertos solo en `127.0.0.1`, acciones fijadas por SHA.

## Salida
```
SECURITY REVIEW — PR #<n> (VIT-xxx)
Alcance: <qué zona sensible>
Controles del threat model: <n/n cumplidos>
Hallazgos: [Crítico|Alto|Medio|Bajo] <archivo:línea> — <descripción> → <control requerido> (VIT-xxx)
Pruebas ejecutadas: <comando → resultado>
VEREDICTO: APROBADO | VETO — <motivo y control requerido>
```

## Errores comunes
- Aprobar porque el E2E pasa con una sola tienda en la BD.
- Confiar en que la UI oculta el botón.
- Revisar solo el diff y no las políticas RLS resultantes tras la migración.
- Aceptar `any`/`as` para esquivar Zod.
- Dar "APROBADO con observaciones" a un problema de aislamiento.
- Corregir el código uno mismo, rompiendo la independencia del rol.
