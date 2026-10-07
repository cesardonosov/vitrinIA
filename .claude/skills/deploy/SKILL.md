---
name: deploy
description: Ejecuta un deploy con checklist previo, OK explícito de Cesar para producción, verificación post-deploy y rollback probado; úsala en cada despliegue a staging o producción.
---

# deploy

## Cuándo usarla
- Cada despliegue, sea a staging o a producción.
- Hosting definitivo pendiente (Railway o Vercel + worker): esta skill describe el flujo agnóstico; los comandos del proveedor viven en `docs/runbooks/deploy-<proveedor>.md` cuando se decida (escalar a Cesar, ver `docs/PENDIENTES.md`).

## Entradas
- Commit/tag en `main` con CI verde.
- Lista de migraciones nuevas en `drizzle/migrations/`.
- Fecha y nombre del último backup restaurable (skill `backup-restore`).
- Runbook de rollback vigente.

## Pasos
1. Checklist previo, todo verificable:
   - `gh run list --branch main --limit 1` → conclusión `success` para el SHA a desplegar.
   - Migraciones revisadas por Architect/Security; compatibles hacia atrás (patrón expandir → migrar → contraer; nada de `DROP` en el mismo deploy).
   - Backup de producción de las últimas 24 h y prueba de restore vigente (< 30 días).
   - Plan de rollback escrito: imagen anterior (tag/SHA) y qué pasa con las migraciones.
   - Variables nuevas cargadas en el ambiente destino (skill `env-secrets`).
   - Explorer corrió sobre staging después del último merge.
2. **Pedir OK explícito a Cesar** (solo producción) con el mensaje de la plantilla. Sin respuesta afirmativa, no se despliega. Un OK anterior no vale para otro SHA.
3. Despliega a staging, ejecuta migraciones (`pnpm drizzle-kit migrate` con rol `migrator`) y verifica antes de producción.
4. Despliega a producción: imagen construida por CI (`docker build --target runner`), etiquetada con el SHA; nunca construir desde la máquina local.
5. Verificación post-deploy (< 10 min):
   - `curl -fsS https://app.vitrinia.cl/api/health` → `200` con versión = SHA.
   - Smoke: abrir una vitrina de prueba, agregar al carrito, ver el pedido registrado.
   - Worker vivo: cola pg-boss drenando, sin jobs fallidos nuevos.
   - Sentry sin errores nuevos; monitor externo en verde.
6. Si falla cualquier verificación: rollback inmediato (paso siguiente) y luego diagnóstico.
7. Rollback: redeploy de la imagen anterior; migraciones solo hacia adelante (migración correctiva), o restore si hubo corrupción. El rollback se ensaya en staging al menos una vez antes del primer deploy a producción.
8. Registra el resultado en `docs/STATUS.md` y cierra con HANDOFF.

## Salida
Mensaje a Cesar:
```
DEPLOY a producción — pedido de OK
SHA: <sha> · PR/tag: <...> · Migraciones: <n / ninguna>
CI: verde (<link>) · Backup: <fecha> · Restore probado: <fecha>
Rollback: imagen <sha-anterior>, tiempo estimado <min>
Riesgo: <bajo|medio|alto> — ¿OK para desplegar? (sí / no / esperar)
```

## Checklist
- [ ] CI verde sobre el SHA exacto.
- [ ] OK de Cesar registrado para este SHA.
- [ ] Backup reciente y restore probado.
- [ ] Rollback ensayado y tiempo medido.
- [ ] Health, smoke y worker verificados.
- [ ] STATUS.md actualizado.

## Errores comunes
- Desplegar el viernes sin nadie atento al monitoreo.
- Migración destructiva junto con el código que la necesita: el rollback queda imposible.
- Asumir que "OK de ayer" cubre el deploy de hoy.
- Verificar solo el health y no el worker.
- Construir la imagen localmente: no reproducible.
- Cambiar variables de entorno a mano en el panel del proveedor sin registrarlo.
