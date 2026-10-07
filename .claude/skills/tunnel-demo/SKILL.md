---
name: tunnel-demo
description: Expone la POC local con Cloudflare Tunnel para demos a vendedores e inversionistas, con subdominios de vitrinas, seguridad y checklist previo; úsala antes de cada demo y para cerrar el túnel después.
---

# tunnel-demo

## Cuándo usarla
- Demos de cierre de sprint, sesiones con vendedores reales e inversionistas (VITRINIA.md §3.3).
- Pruebas de las vitrinas desde un celular real fuera de la red local.
- Costo: USD 0 (Cloudflare Tunnel gratis). Requiere el dominio en Cloudflare (pendiente registrar vitrinia.cl; mientras tanto, dominio de prueba propio).

## Entradas
- Stack local arriba y sano (`pnpm dev:up`, skill `docker-setup`).
- Cuenta Cloudflare con la zona del dominio; `cloudflared` instalado en Windows (`winget install Cloudflare.cloudflared`) o dentro de WSL2.
- Lista de tiendas de demo y datos semilla.

## Pasos
1. Una sola vez: `cloudflared tunnel login` → `cloudflared tunnel create vitrinia-demo` → guarda el UUID; credenciales en `infra/cloudflare/` fuera de git (`.gitignore`) o cifradas con dotenvx.
2. `infra/cloudflare/config.yml` (plantilla versionada, sin credenciales):
   ```yaml
   tunnel: <UUID>
   credentials-file: ~/.cloudflared/<UUID>.json
   ingress:
     - hostname: app.vitrinia.cl        # portal
       service: http://localhost:3000
     - hostname: "*.vitrinia.cl"        # vitrinas (tutienda.vitrinia.cl)
       service: http://localhost:3000
     - service: http_status:404
   ```
3. DNS: `cloudflared tunnel route dns vitrinia-demo app.vitrinia.cl` y CNAME proxied `*` al túnel (los subdominios de tiendas llegan a la misma app; el host se resuelve por la tabla `domains`).
4. Cookies `__Host-` exigen HTTPS y host exacto: probar siempre por el hostname público, no por `localhost`. Configura `APP_URL` y `ALLOWED_HOSTS` del ambiente demo.
5. Seguridad: WAF y Bot Fight Mode activos; regla de rate limit en `/api/*` y flujos públicos; Turnstile real (no la clave de test) en "Pide tu tienda". Cloudflare Access (gratis hasta 50 usuarios) delante de `app.vitrinia.cl/admin` y de herramientas de desarrollo; Mailpit (8025) **nunca** se expone. Solo la app, nunca Postgres.
6. Datos: BD de demo separada (`vitrinia_demo`) con tiendas ficticias o con permiso escrito del vendedor; sin datos reales de clientes finales. Cuentas de demo con contraseñas únicas.
7. Levanta solo durante la demo: `cloudflared tunnel --config infra/cloudflare/config.yml run vitrinia-demo`. Al terminar, `Ctrl+C`, confirma que `curl -sI https://tutienda.vitrinia.cl` ya no responde 200, y opcionalmente `cloudflared tunnel cleanup`.
8. Después: revisa los logs y Sentry de la sesión; rota cualquier credencial compartida; anota hallazgos como issues.

## Salida
`docs/runbooks/demo-tunnel.md` y, por demo, una nota en `docs/qa/demos/<fecha>.md` con tiendas usadas, incidentes y feedback.

## Checklist antes de una demo (T-24 h y T-30 min)
- [ ] Explorer hizo una pasada completa en móvil y desktop; sin P0/P1 abiertos.
- [ ] CI de `main` verde; el commit demo está etiquetado.
- [ ] Datos de demo cargados: 3+ tiendas con fotos reales, pedidos de ejemplo, un onboarding limpio para crear en vivo.
- [ ] Probado desde un celular con datos móviles (no el Wi-Fi local).
- [ ] Correo de verificación llega (Mailpit local o SMTP de demo) y el flujo completo dura < 15 min.
- [ ] PC enchufado, sin suspensión, antivirus/VPN revisados; plan B grabado en video.
- [ ] Túnel cerrado al terminar y registrado.

## Errores comunes
- Dejar el túnel abierto toda la noche con la BD de desarrollo.
- Probar por `localhost` y descubrir en vivo que `__Host-` falla por HTTPS.
- Wildcard sin ingress de respaldo `http_status:404`.
- Exponer Mailpit o Storybook por comodidad.
- Usar datos reales de vendedores sin permiso.
- Windows entra en suspensión y el túnel cae a mitad de la demo.
