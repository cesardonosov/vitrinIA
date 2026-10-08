# Fixtures del Store Config por versión

Cada carpeta `vN/` contiene configs reales de esa `schemaVersion`. CI (`src/modules/store-config/infrastructure/zod/fixtures.test.ts`) migra cada uno con `migrateToCurrent` y lo valida contra el esquema actual: si una migración rompe un config histórico, falla aquí.

Reglas:
- Nunca se edita un fixture de una versión ya superada (es evidencia histórica); se agrega otro.
- Al subir `schemaVersion`, se crea `v<N+1>/` con al menos un fixture mínimo y uno completo.
- `v1/ropa.json` debe ser idéntico a `ROPA_PRESET` (`domain/presets/ropa.ts`); hay un test que lo verifica.
