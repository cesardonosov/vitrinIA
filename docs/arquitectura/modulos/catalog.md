# Módulo catalog

Estado: Sprint 2 (VIT-179). Categorías, productos y variantes con precio de cada tienda, de solo lectura para la vitrina. Las tablas con RLS y el adaptador Drizzle llegan con VIT-183; mientras tanto el catálogo sale de archivos semilla versionados.

## Archivos

| Ruta | Qué es |
|---|---|
| `src/modules/catalog/domain/catalog.ts` | Tipos `Catalog`, `Category`, `Product`, `Variant`, `ProductImage`, `NutritionFact` y `EMPTY_CATALOG` |
| `src/modules/catalog/domain/price.ts` | `createPrice` (`Money` entero y positivo) y `lowestPrice` ("Desde") |
| `src/modules/catalog/domain/selection.ts` | `selectProducts` para las grillas (`featured`, `latest`, `all`) y `findProductBySlug` |
| `src/modules/catalog/application/ports/catalog-reader.ts` | Puerto `CatalogReader.getCatalog(storeId)`: solo devuelve productos de esa tienda |
| `src/modules/catalog/application/storefront-catalog.ts` | Casos de uso `getStorefrontCatalog` y `getStorefrontProduct` (otra tienda = no encontrado, 404) |
| `src/modules/catalog/application/index.ts` | Única superficie pública del módulo |
| `src/modules/catalog/infrastructure/seed/seed-catalog.ts` | `parseSeedCatalog` y `createSeedCatalogReader` (adaptador semilla, mapa `StoreId` → catálogo) |
| `src/modules/catalog/infrastructure/seed/kanuwin.json` + `kanuwin.ts` | Catálogo de Kanuwiñ, su `StoreId` fijo de demo y el mapa de imágenes |
| `public/demo/kanuwin/*.webp` | Fotos de producto de la demo, WebP sin metadatos |

## Reglas

- Precios en `Money` del shared kernel, enteros en CLP, con IVA y siempre positivos.
- Todo texto del catálogo es texto plano del vendedor: la vitrina lo escapa y nunca lo interpreta como HTML.
- Una tienda nunca ve el catálogo de otra: el puerto recibe `StoreId` y el adaptador de BD lo repetirá con RLS (VIT-183).
- Las imágenes son rutas del mismo origen hasta que exista `ImageStorage` (VIT-123).
