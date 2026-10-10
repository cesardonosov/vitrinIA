# Sprint 2 — Vitrina y pedidos

Fechas: 2026-10-10 a 2026-10-17. Milestone "Sprint 2" (#2). Cesar pidió avanzar el 2026-10-10 ("ok avanza con el sprint2"); el plan se ejecuta sin esperar aprobación y Cesar decide merges y cambios de producto.

## Objetivo

La tienda real de Kanuwiñ se ve profesional en el celular y registra pedidos.

Demo de cierre (VITRINIA.md §3.5): Kanuwiñ abierta en el celular vía túnel, un pedido de punta a punta que termina en WhatsApp y queda guardado.

## Objetivos medibles

1. Kanuwiñ visible por host: `kanuwin.localhost:3000` en local y un subdominio de `vitrinia.cl` por túnel, con 0 violaciones de axe a 375 px.
2. Pedido de punta a punta: carrito → checkout con datos mínimos → WhatsApp, con el pedido y su contacto guardados con RLS.
3. Los eventos mínimos de analítica (§7.1) quedan registrados desde la primera visita.

## Orden (ruta crítica en negrita)

1. **VIT-179 (#79)** módulo `catalog` con semilla de Kanuwiñ (Builder) P0
2. **VIT-180 (#80)** componentes de vitrina + story de `aves` (cierra #77) (Designer + Builder) P0
3. **VIT-135 (#35) y VIT-137 (#37)** `proxy.ts` y rewrite por host, ADR-0011 (Architect)
4. **VIT-181 (#81)** vitrina por host: home y producto (Builder) P0, zona sensible
5. **VIT-182 (#82)** semilla local `pnpm db:seed:demo` (Builder + DevOps) P0
6. VIT-183 (#83) tablas de catálogo con RLS (Builder) P1, zona sensible
7. VIT-191 (#91) Store Config persistido por tienda (Builder) P1, zona sensible
8. **VIT-184 (#84)** carrito (Builder) P1
9. **VIT-185 (#85)** medios de pago y despacho en el Store Config (Builder) P1, zona sensible
10. **VIT-126 (#26)** logs con pino y redacción de datos personales (DevOps) — antes de pedidos
11. **VIT-186 (#86)** módulo `orders` con threat model previo (Builder + Security) P1, zona sensible
12. VIT-125 (#25) y VIT-174 (#74) retención y particiones de eventos (Architect) → VIT-187 (#87) captura de eventos (P1)
13. VIT-140 (#40) `/api/health`, VIT-152 (#52) CSP en enforce, VIT-192 (#92) caché host → tienda
14. **VIT-119 (#19)** demo por túnel (DevOps)
15. VIT-178 (#78) README con volumen viejo

Deuda de seguridad del Sprint 1 (en el milestone, se recortan primero): #43, #44, #54, #60, #61, #62, #63, #64, #68. VIT-188 (#88) job de retención también puede pasar al Sprint 3: no hay contactos de más de 24 meses.

## Riesgos

- Security es cuello de botella: 7 issues de zona sensible. Mitigación: threat model de `orders` temprano y PRs chicos.
- El túnel depende de que el DNS de `vitrinia.cl` apunte a Cloudflare (acción de Cesar). Plan B: demo en `kanuwin.localhost` en el PC de Cesar.
- First-load JS de la vitrina (≈176 KB gzip, casi todo runtime de Next) sobre el presupuesto de 100 KB. Mitigación: medir con perf-budget y decidir en QA.
- `main` sigue sin protección de rama hasta que Cesar aplique el ruleset.

## Si falta tiempo, se recorta en este orden

Deuda de seguridad del Sprint 1, VIT-188, VIT-192, VIT-187 (captura de eventos), VIT-152.
