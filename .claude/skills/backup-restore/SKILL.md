---
name: backup-restore
description: Configura respaldos programados de Postgres con pg_dump, retención y pruebas de restauración periódicas documentadas; úsala al montar respaldos, antes del primer deploy y en cada prueba de restore.
---

# backup-restore

> **Un backup sin restore probado no existe.** Un respaldo solo cuenta cuando su restauración fue ejecutada y documentada.

## Cuándo usarla
- Antes del primer deploy (VITRINIA.md §6.5: respaldos probados desde el primer deploy).
- Cada vez que cambia el hosting, la versión de Postgres o el esquema de roles.
- Mensualmente para la prueba de restore.

## Entradas
- Cadena de conexión con rol de solo lectura para respaldo (`backup_user`, con `pg_read_all_data`).
- Destino de almacenamiento fuera del servidor de la BD (R2/S3 gratis o disco externo en POC).
- Clave de cifrado (age/gpg) guardada aparte del backup.

## Pasos
1. Dump en formato custom: `pg_dump --format=custom --no-owner --no-acl --file=vitrinia-$(date -u +%Y%m%dT%H%M%SZ).dump "$BACKUP_DATABASE_URL"`.
2. Cifra antes de subir: `age -r <clave-publica> -o archivo.dump.age archivo.dump`; borra el dump en claro. La clave privada vive en el gestor de contraseñas de Cesar, no junto al backup.
3. Programa: POC con Task Scheduler/cron en WSL2 o servicio `backup` en compose (`profiles: [tools]`); producción con scheduled job del proveedor o GitHub Actions `schedule` (un dump diario, sin secretos de producción en logs).
4. Sube y verifica: `sha256sum` guardado junto al archivo y `pg_restore --list` sin error.
5. Retención: 7 diarios, 4 semanales, 6 mensuales; poda automática con script versionado y en modo `--dry-run` primero. Cuenta el costo: debe caber en el OPEX (< USD 50/mes en total).
6. Restore de prueba (mensual, y antes del primer deploy):
   ```bash
   createdb vitrinia_restore_test
   age -d -i key.txt archivo.dump.age | pg_restore --no-owner --dbname=vitrinia_restore_test
   psql vitrinia_restore_test -c "SELECT count(*) FROM stores;"
   ```
   Verifica conteos contra producción (tiendas, productos, pedidos), que las políticas RLS existan (`SELECT count(*) FROM pg_policies`) y que `app_user` siga sin `BYPASSRLS`. Mide el tiempo total (RTO) y la antigüedad del dato (RPO).
7. Registra la prueba en `docs/runbooks/restore-log.md`: fecha, backup usado, duración, resultado, problemas, responsable.
8. Alerta: si no hay backup nuevo en 26 h, notificación (monitor de heartbeat gratuito, ver `observability-setup`).
9. Archivos subidos (fotos): respaldar el bucket o volumen `uploads` con el mismo ciclo; documentar cómo se restaura.

## Salida
`docs/runbooks/backup.md`, `docs/runbooks/restore.md` (skill `write-runbook`) y `docs/runbooks/restore-log.md` con una entrada por prueba:
```
| 2026-11-03 | vitrinia-20261103T030000Z.dump.age | 4 min | OK | conteos coinciden | devops |
```

## Checklist
- [ ] Backup diario automático corriendo y alertando si falla.
- [ ] Cifrado verificado; clave fuera del backup.
- [ ] Restore ejecutado en una BD vacía, nunca sobre producción.
- [ ] RTO/RPO medidos y anotados.
- [ ] Fotos incluidas en el plan.
- [ ] Prueba del último mes registrada en `restore-log.md`.

## Errores comunes
- Respaldar con el mismo servidor/volumen que la BD.
- Dumps sin cifrar con datos personales (Ley 21.719).
- Nunca restaurar y descubrir el fallo en el incidente.
- Restaurar sobre la BD real "para probar".
- Olvidar extensiones (`unaccent`, `pg_trgm`) en la BD de destino.
- Ignorar que `--no-owner` exige reaplicar `GRANT` a `app_user`.
