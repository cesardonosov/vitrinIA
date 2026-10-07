---
name: implement-use-case
description: Implementa un caso de uso con TDD de adentro hacia afuera (dominio, aplicación, adaptador Drizzle, presentación, container) en Clean Architecture; úsala para cualquier feature con lógica de negocio.
---

# implement-use-case

## Cuándo usarla
- Cualquier issue VIT-xxx que agregue o cambie comportamiento de negocio.
- Antes: aplica la regla central de `AGENTS.md` §12 y lee el threat model si es zona sensible.

## Entradas
Issue con criterios de aceptación, doc del módulo en `docs/arquitectura/modulos/`, ADRs, y rama `feat/VIT-xxx-desc`.

## Pasos (ejemplo: CreateProduct en `catalog`)
1. **Test de dominio (rojo)** `domain/product.test.ts`: nombre vacío o > 80 → error; precio `Money` negativo → error; `Product.create` devuelve `Result<Product, ProductError>`.
2. **Entidad/VO (verde)** `domain/product.ts`: sin imports externos salvo `@/shared/kernel` (`Result`, `Money`, `StoreId`). Errores tipados: `{ type: "InvalidName" } | { type: "InvalidPrice" }`.
3. **Puerto** `application/ports.ts`: `interface ProductRepository { insert(p: Product): Promise<Result<void, RepoError>>; }` y `Clock`, `IdGenerator` (UUID v7).
4. **Test del caso de uso (rojo)** con puertos falsos en memoria (`application/create-product.test.ts`): éxito; `StoreId` distinto al de la sesión → `Forbidden` y el repo NO se llama; nombre inválido → `Err`; repo falla → `Err`.
5. **Caso de uso (verde)**:
   ```ts
   export const createProduct = (deps: Deps) =>
     async (session: Session, input: CreateProductInput): Promise<Result<ProductId, CreateProductError>> => {
       if (!session.storeId.equals(input.storeId)) return err({ type: "Forbidden" });
       const product = Product.create({ id: deps.ids.next(), ...input, now: deps.clock.now() });
       if (!product.ok) return product;
       const saved = await deps.products.insert(product.value);
       return saved.ok ? ok(product.value.id) : saved;
     };
   ```
   Siempre `StoreId` verificado contra la sesión (nunca contra headers del middleware).
6. **Adaptador Drizzle + test de integración** `infrastructure/drizzle-product-repository.ts`: transacción con `SET LOCAL app.store_id`; mapea fila a dominio; precio como entero + `currency`. Test contra Postgres de test con `app_user`: inserta, lee, y prueba que otra tienda NO ve el producto (RLS).
7. **Presentación** `presentation/create-product.action.ts` (server action o route handler): `Zod.safeParse` del input, resuelve sesión, llama al caso de uso, mapea `Result` a respuesta (`400` validación, `403` forbidden, `500` genérico sin detalles internos). Delgada: cero reglas de negocio.
8. **Registro** en `src/infra/container.ts`: instancia el repo, `Clock`, `IdGenerator` y expone `createProduct`.
9. **Docs**: actualiza `docs/arquitectura/modulos/catalog.md`.
10. Ejecuta `pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration && pnpm depcruise`. Cobertura de dominio y aplicación ≥ 90%.

## Salida
PR chico con commits semánticos (`feat(catalog): add CreateProduct use case`) y HANDOFF con archivos tocados, tests agregados y deuda encontrada.

## Checklist
- [ ] Cada test se vio fallar antes de implementar.
- [ ] `Result<T,E>`; sin `throw` para errores de negocio.
- [ ] `Money` entero + currency; UUID v7; `timestamptz`.
- [ ] `StoreId` verificado en el caso de uso + test de cruce de tiendas.
- [ ] Zod en el borde; presentación sin lógica.
- [ ] dependency-cruiser en verde; docs del módulo actualizadas.
- [ ] Logs sin datos personales; sin `any`; `TODO(VIT-xxx)` solo con issue.

## Errores comunes
- Empezar por la server action y dejar el dominio anémico.
- Que el caso de uso importe `drizzle-orm` o `next/*`.
- Probar el caso de uso contra BD real en vez de puertos falsos.
- Confiar en `store_id` del body sin compararlo con la sesión.
- Usar `number` decimal para precios.
