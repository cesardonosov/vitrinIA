# Módulo storefront: resolución host → tienda

Estado: Sprint 2 (VIT-181, VIT-192). Contrato de seguridad: [`threat-models/tenancy.md`](../../security/threat-models/tenancy.md) C8 y C12, ADR-0003 §1 y ADR-0011.

## Caché host → tienda (VIT-192)

| Ruta | Qué es |
|---|---|
| `src/modules/storefront/application/ports/store-host-resolver.ts` | Puerto `StoreHostResolver` (`resolve(host)`) |
| `src/modules/storefront/application/ports/store-host-cache.ts` | Puerto `StoreHostCache`: `invalidateHost`, `invalidateStore`, `clear` |
| `src/modules/storefront/infrastructure/db-store-host-resolver.ts` | Sin caché: `resolve_host()` en Postgres |
| `src/modules/storefront/infrastructure/cached-store-host-resolver.ts` | `createCachedHostResolver(inner, opciones)`: la caché delante de cualquier resolvedor |
| `src/infra/container.ts` | Cablea `createCachedHostResolver(dbStoreHostResolver)` y exporta `storeHostCache` |

Reglas:

- **TTL**: positivos 30 s por defecto, **máximo 60 s** (`MAX_HOST_CACHE_TTL_MS`; el constructor lanza `RangeError` si se pide más). Los hosts que no resuelven se recuerdan solo 5 s.
- **Tamaño acotado**: 1000 hosts resueltos y 256 no resueltos, en mapas separados. Cualquiera puede mandar cualquier `Host`, así que un barrido de hosts al azar solo rota el mapa negativo y nunca expulsa una tienda real. Al llenarse se expulsa la entrada más antigua.
- **Clave exacta**: el host canónico. Un host que `normalizeHost` cambiaría (mayúsculas, puerto, punto final, caracteres raros) no se cachea y va directo a la base, que lo normaliza igual; dos grafías nunca comparten entrada. No hay comodines ni coincidencia por sufijo.
- **Un host nuevo nunca hereda otra tienda** (C12): solo se sirve lo que el resolvedor interno contestó para ese mismo host. Tests con reasignación en `cached-store-host-resolver.test.ts` y contra Postgres en `tests/integration/host-cache.test.ts`.
- **Carrera**: una consulta que empezó antes de una invalidación no guarda su respuesta (contador de época), así que una consulta lenta no resucita el mapeo recién invalidado. Los errores del resolvedor interno no se cachean.
- **Por proceso, no distribuida**: con varias instancias, otro proceso ve el cambio a lo más tras el TTL. La caché distribuida está fuera de scope.
- **No es una barrera de seguridad**: el servidor sigue resolviendo la tienda desde el header `Host` y los casos de uso siguen verificando `StoreId` contra la sesión; la caché solo ahorra la consulta.

### Invalidación: obligación de los casos de uso

Todo caso de uso que cambie lo que un host significa recibe `StoreHostCache` y la invalida **después del commit**, para **cada** host involucrado: renombrar o cambiar el subdominio (el host viejo y el nuevo), despublicar o liberar un host, reasignarlo a otra tienda, agregar o verificar un dominio (puede haber una respuesta negativa en caché). Hoy no existe ninguno de esos casos de uso (VIT-121 los crea); `storeHostCache` ya está disponible en el contenedor. El TTL es la red de seguridad si una invalidación falta o ocurre en otro proceso, no un reemplazo.
