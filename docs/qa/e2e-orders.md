# E2E del checkout (VIT-186)

Playwright, primero móvil (375 x 812) y después escritorio (1280). Cubre carrito -> pedido -> botón de WhatsApp en la tienda demo Kanuwiñ.

```bash
# Postgres de test migrada y sus URL exportadas (ver tenant-isolation.md)
pnpm test:db:up && pnpm db:migrate:test
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers   # o el caché por defecto de Playwright
pnpm test:e2e
```

- `tests/e2e/global-setup.ts` siembra tienda y catálogo demo (`infra/seed/demo.sql`, `demo-catalog.sql` y `demo-config.sql`) con `psql` como `app_user`; es idempotente.
- La app corre con `next dev` en el puerto 3100 y se visita como `kanuwin.localhost:3100`.
- Cloudflare no es alcanzable desde los tests: el script del widget se reemplaza en el navegador (`page.route`) y el servidor verifica contra `tests/e2e/fake-siteverify.mjs` mediante `TURNSTILE_VERIFY_URL` (variable prohibida en staging y production). La verificación del servidor sí se ejecuta.
- El límite de 5 pedidos / 10 min por IP y tienda vive en memoria del servidor: si repites la suite varias veces seguidas con el mismo servidor, el 6.º pedido recibe 429. Reinicia el servidor.
- Qué afirma: la respuesta es `private, no-store` (O17); el carrito con un precio editado en `localStorage` igual se cobra con el precio del catálogo (O1); tras el pedido el carrito queda vacío y `localStorage`/`sessionStorage` no contienen datos del comprador (O16); el botón lleva a `https://wa.me/<número del vendedor>` con el código y la frase "Verifica el pedido con este código" (O19, O21); doble toque = un pedido (O11); sin desborde horizontal a 375 px.
- Pendiente para DevOps: job de CI para `test:e2e` (Playwright, Chromium, Postgres de test).
