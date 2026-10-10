# Estado de VitrinIA
Actualizado: 2026-10-10 (America/Santiago)

## Sprint actual
Sprint 2 — Vitrina y pedidos · 2026-10-10 a 2026-10-17 · milestone "Sprint 2" (#2) · Cesar pidió avanzar el 2026-10-10
Demo: Kanuwiñ se ve profesional en el celular vía túnel y registra pedidos.
Estado: en curso; el catálogo, la vitrina por host, el carrito y los pedidos están en main, y no hay PRs abiertos. El milestone sigue abierto hasta que Cesar apruebe el cierre.
Plan: `docs/sprints/sprint-02.md`. Sprint 1 cerrado 16/16 (`docs/sprints/sprint-01.md`).

## Hecho en main (Sprint 2)
Cesar, 2026-10-10: Claude mezcla sin preguntar los PRs con CI verde y aprobación de Security; el cierre del sprint y el entregable pasan por él.
- VIT-179 (#79) módulo `catalog` con semilla de Kanuwiñ: PR #89
- VIT-180 (#80, #77) componentes de vitrina y stories de `aves`: PR #90
- VIT-181/182 (#81, #82), VIT-135/137 (#35, #37): `proxy.ts`, rewrite por host a `/s/<host>`, `pnpm db:seed:demo`, ADR-0011: PR #93
- VIT-183 (#83) tablas de catálogo con RLS forzada y adaptador Drizzle: PR #99
- VIT-184 (#84) carrito en el navegador: PR #96
- VIT-185 (#85) medios de pago y despacho en el Store Config: PR #95
- VIT-126 (#26) logs con pino y redacción de datos personales: PR #97
- VIT-186 (#86) módulo `orders`: threat model (#98) y checkout con Turnstile y pedido por WhatsApp (#103, #104, #105)
- Plan del sprint: PR #94

Cerrados hoy: #79, #80, #83, #84, #85, #35, #37 (más #26, #77 y #86 antes).

## En curso
- VIT-181 (#81): falta el E2E automatizado de la vitrina por host a 375 px y desktop (hoy solo verificación manual)
- VIT-182 (#82): falta que `db:seed:demo` se niegue a correr contra producción y revisar que el contacto del PDF no esté en el repo
- Seguimientos de Security sobre `orders` y carrito: #100 (`Object.hasOwn` en el carrito), #101 (rollback de 0001 por hash), #106 (arnés ve grants UPDATE por columna), #107 (confiar en `cf-connecting-ip` solo con flag de proxy de confianza), #108 (contacto en la huella de idempotencia), #109 (secretos y fixtures E2E, métrica de desafío fallido, `orders.md` v1.1)
- VIT-191 (#91): Store Config persistido en la base de datos (hoy sale de memoria, solo Kanuwiñ)
- VIT-192 (#92): caché host a tienda con TTL e invalidación
- Pendientes del sprint sin empezar: VIT-187 (#87), VIT-188 (#88, puede pasar al Sprint 3), VIT-125 (#25), VIT-174 (#74), VIT-140 (#40), VIT-152 (#52), VIT-119 (#19) y la deuda de seguridad del Sprint 1
- First-load JS de la vitrina (~176 KB gzip) sobre el presupuesto de 100 KB: decide QA

## Seguimientos por crear como issue
La creación de estos issues desde la sesión fue denegada por un permiso; quedan aquí para no perderlos.
- Builder (P2): los tests de integración nunca deben poder apuntar a la BD de desarrollo; exigir un marcador de BD de test antes de truncar (review de Security sobre #56).
- Designer + Security (P3): decidir si los textos de la tienda admiten emojis con ZWJ, solo entre emojis (#66).
- Builder (P2): cargar Gabarito y Albert Sans en el portal con `next/font` y aplicar `deriveTheme` al guardar el tema; depende de #68 (#65).
- DevOps + Security (P3): agregar `build-storybook` y axe de las stories al CI (#65).
- Builder + Security (P1, Sprint 2): `order_contacts`, checkout por opción y job de retención: creados como VIT-186 (#86) y VIT-188 (#88).
- Builder (P2, Sprint 2): medios de pago múltiples en Store Config: creado como VIT-185 (#85).
- Orchestrator (P2, Sprint 3): estado "pendiente de aprobación" para tiendas nuevas y cola de moderación para Cesar.

- Orchestrator (P2, Sprint 2): D9 (aviso `middleware` -> `proxy`) ya está cubierto por VIT-135 (#35); no hace falta un issue nuevo. D6 (`main` sin protección) es acción de Cesar, ver "Esperando a Cesar" 11.
- Orchestrator (P2): crear los issues de los bugs de documentación de QA que #75 no corrige (D10: instalar gitleaks y semgrep con versión fijada) y un issue nuevo del Sprint 2 con la story y las capturas a 375 px de VIT-113 (cerrado sin ellas): ya creado como #77. README con volumen `pgdata` viejo: #78.

## Bloqueos
- ninguno

## Esperando a Cesar
1. Pagos: resuelta (2026-10-08). Varias opciones por tienda: link de Mercado Pago, link de Flow y transferencia. Cambios solo desde el portal, nunca por MCP. En ADR-0005.
2. Datos del comprador: resuelta (2026-10-08). "Todo lo necesario": nombre y teléfono siempre; correo opcional; dirección solo con despacho; RUT, razón social y giro solo con factura. En ADR-0005.
3. Retención: resuelta (2026-10-08). Pedido 6 años y contacto del comprador anonimizado a los 24 meses; no existe un plazo legal de 5 años. En ADR-0010, falta revisión de Security.
4. Aviso de privacidad: resuelta (2026-10-08). Borrador provisorio redactado por IA, no revisado por abogado, en un Claude Doc. No había skill legal disponible. Revisión de abogado antes del piloto público.
5. Moderación: resuelta (2026-10-08). Aprobación manual antes de publicar; revisa Cesar.
6. Gasto en IA: resuelta (2026-10-08). Tope de USD 100 al mes para el Claude del administrador. Las tiendas usan su propia IA vía MCP, así que VitrinIA no paga IA por tienda.
7. Marca: resuelta. Instantánea como provisoria (2026-10-08).
8. Riesgo residual R3: resuelta (2026-10-09). Se acepta en la POC; rol de solo lectura auditado antes del piloto.
9. `middleware.ts` → `proxy.ts`: resuelta (2026-10-09). Se migra con ADR en el Sprint 2 (VIT-135); al aceptarse ese ADR se actualiza VITRINIA.md §6.4.
10. Rubro de la primera tienda real: resuelta. Kanuwiñ, mezclas de semillas para aves; preset `aves` y catálogo semilla en main (#70). Despacho y pagos de demo, inventados a pedido de Cesar; faltan 2 fotos reales.
11. Acciones tuyas (no son decisiones), en este orden:
   a) Aplicar el ruleset de `main` con los checks requeridos (13 pasos en `docs/runbooks/ci.md`); hoy `main` no tiene protección (D6). Recomiendo hacerlo antes de la demo.
   b) Pendientes anteriores: crear el tablero de GitHub Projects (comandos en `docs/sprints/sprint-01.md`); instalar la app de Renovate; delegar el DNS de `vitrinia.cl` a Cloudflare antes del Sprint 2 (dominio ya registrado, confirmado el 2026-10-09).
   c) Tras mezclar #76: autorizar el cierre del milestone "Sprint 1".
12. ADR-0009 (VIT-116): resuelta (2026-10-09). Reglas deny y ask completas; se aplican en `.claude/settings.json` con revisión de Security.
13. Store Config (ADR-0004 v3): resuelta (2026-10-09). Cesar confirmó todos los desvíos, incluido `onPrimary`.
14. Mantenedor de tiendas para administradores: resuelta (2026-10-09). Queda en `docs/PENDIENTES.md` como desarrollo futuro, sin sprint asignado. Mientras no exista, las tiendas se aprueban a mano.

15. Claves reales de Turnstile por entorno (desarrollo, staging, producción): sin ellas el checkout solo corre con la clave de prueba. Las crea Cesar en Cloudflare y las carga como secretos (dotenvx), nunca en el repo.
16. DNS de `vitrinia.cl` delegado a Cloudflare: bloquea el túnel y la demo en un subdominio (plan B: `kanuwin.localhost` en el PC de Cesar).
17. Datos reales de Kanuwiñ: medios de pago (link de Mercado Pago o Flow, datos de transferencia), zonas y precios de despacho, número de WhatsApp definitivo y las 2 fotos reales. Hoy son datos de demo marcados como provisorios.
18. Ruleset de `main` con los checks requeridos (13 pasos en `docs/runbooks/ci.md`); sigue sin protección. Ver 11a.

## Últimos cambios
- 2026-10-10 · Sprint 2 · Reconciliación: #79, #80, #83, #84, #85, #35 y #37 cerrados; #81 y #82 siguen abiertos con lo que falta. TODO: 1
- 2026-10-10 · VIT-186 · Pedidos por WhatsApp con Turnstile en main (PR #103, #104, #105); seguimientos #100, #101, #106–#109
- 2026-10-10 · VIT-179/180/181/183/184/185 · En main (PR #89, #90, #93, #99, #96, #95); VIT-126 en #97
- 2026-10-10 · VIT-181 · Kanuwiñ visible en `kanuwin.localhost` con `proxy.ts` y semilla local (PR #93, borrador)
- 2026-10-10 · Sprint 2 · Plan, milestone y 12 issues nuevos (#79–#88, #91, #92); 19 abiertos movidos al sprint
- 2026-10-10 · Sprint 1 · Cerrado 16/16; cierre en `docs/sprints/sprint-01.md` (PR #76), TODO: 2
- 2026-10-10 · VIT-114 · Cerrado: `compose up --build --wait` desde cero en 3 min 22 s, 4 servicios sanos, FORCE RLS y roles sin bypass; seguimientos #77 y #78
- 2026-10-10 · VIT-102/108 · Cesar dio el OK: #38, #39 y #75 en main; VIT-102 y VIT-108 cerrados
- 2026-10-10 · VIT-113 · Cerrado tal como está; story y capturas a 375 px pasan al Sprint 2
- 2026-10-10 · — · Cesar retomó el trabajo tras la pausa del 2026-10-09
- 2026-10-10 · VIT-103 · #45 cerrado: su contenido ya estaba en main; VIT-103 y VIT-116 salen de "En curso"
- 2026-10-10 · VIT-174 · Nuevo (#74): ADR-0003, las particiones no heredan RLS
- 2026-10-09 · VIT-116 · ADR-0009 mergeado (#72): deny de secretos; Security debe correr la matriz de §5 en sesión fresca
