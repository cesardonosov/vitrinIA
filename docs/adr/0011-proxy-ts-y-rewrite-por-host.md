# ADR-0011: `proxy.ts` en lugar de `middleware.ts` y rewrite por host a `/s/<host>`

- Estado: Propuesto
- Fecha: 2026-10-10
- Decide: Cesar (aprobación requerida: sí — cambia `docs/VITRINIA.md` §6.4, archivo protegido)
- Aprobación de Cesar: la migración a `proxy.ts` se decidió el 2026-10-09 ("Esperando a Cesar" 9, recomendación A). Falta su OK a este ADR y al cambio de §6.4, que van en el mismo PR.
- Issues: VIT-135 (#35), VIT-137 (#37); se implementa en VIT-181 (#81)
- Zona sensible: sí (tenancy) — requiere revisión de Security antes de pasar a Aceptado

## Contexto

- Next 16 deprecó la convención `middleware` en favor de `proxy` (mismo comportamiento, otro nombre de archivo y de función). Next 16.4 avisa en cada arranque.
- `(portal)/page.tsx` ya ocupa `/`. Si la vitrina también usara `/`, Next rechaza dos páginas en la misma ruta (VIT-137). Hace falta separar portal y vitrina sin depender del middleware para la seguridad (ADR-0003 §2, CVE-2025-29927).

## Decisión

1. **`src/proxy.ts` reemplaza a `src/middleware.ts`.** Exporta `proxy`. Sigue sin autorizar nada: pone el CSP con nonce y enruta por host.
2. **Rewrite por host.** El proxy normaliza el `Host` con las mismas reglas que `resolve_host()` (`normalizeHost`). Los hosts del portal (`localhost`, `127.0.0.1`, `vitrinia.cl`, `www.vitrinia.cl`, `app.vitrinia.cl`) pasan tal cual. Cualquier otro host se reescribe a `/s/<host>/<ruta>`, donde viven las páginas de la vitrina (`src/app/(vitrina)/s/[host]/...`).
3. **El segmento `/s/` es interno.** Una petición que llega con ruta `/s` o `/s/...` responde 404 en cualquier host. Un host mal formado responde 404.
4. **La página vuelve a resolver la tienda.** `loadStorefront` lee el `Host` de la petición en el servidor, lo normaliza, exige que sea igual al segmento `[host]` y lo resuelve con `resolve_host()`. Host desconocido, no verificado o distinto del segmento: 404 uniforme. Ningún caso de uso lee un header puesto por el proxy.
5. **Archivos públicos y `/api`.** Las rutas con extensión de archivo y las de `/api/` no se reescriben (fotos de `public/` y el endpoint de CSP funcionan en cualquier host).
6. En local, las tiendas se abren en `<slug>.localhost:3000` (los navegadores resuelven `*.localhost` a la máquina sin tocar `hosts`).

## Alternativas consideradas

1. **Mantener `middleware.ts`.** Funciona hoy, pero la convención está deprecada y el aviso confunde. Descartada.
2. **Vitrina por path (`vitrinia.cl/tienda`).** Ya descartada en ADR-0003 (alternativa 5).
3. **Grupo de rutas separado por host sin rewrite.** Next no enruta por host; habría que duplicar la raíz. Descartada.
4. **Rewrite a `/_store/...`.** Las carpetas con `_` son privadas en Next y no se pueden servir. Descartada.

## Consecuencias

- Positivas: sin aviso de deprecación; portal y vitrina conviven en `/`; la seguridad no depende del proxy (la página revalida), y `/s/` no se puede usar para ver otra tienda.
- Negativas: la lista de hosts del portal está en código (`PORTAL_HOSTS`); un dominio nuevo del portal requiere cambiarla. El túnel de demo usa subdominios de `vitrinia.cl`, así que no la toca.
- Se actualiza `docs/VITRINIA.md` §6.4 (`middleware.ts` → `proxy.ts`) y la regla Semgrep de headers del middleware apunta a `src/proxy.ts`.
- Pendiente: caché host → tienda con TTL (VIT-192).
