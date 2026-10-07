---
name: scaffold-module
description: Crea un módulo nuevo con las 4 capas de Clean Architecture, puertos, adaptador, registro en src/infra/container.ts, doc del módulo y reglas dependency-cruiser; úsala cuando un issue pida un módulo nuevo en src/modules/.
---

# scaffold-module

Rol principal: Architect. Deja contratos e interfaces; el Builder implementa la lógica con TDD. Módulos actuales: `identity`, `store-config`, `catalog`, `storefront`, `checkout`, `orders`, `catalog-agent`, `audit`, `outbox`.

## Cuándo usarla

- Un issue aprobado requiere un módulo que no existe.
- No la uses para agregar un caso de uso a un módulo existente (eso es `implement-use-case` del Builder).

## Entradas

- Issue `VIT-xxx` con el propósito del módulo y sus casos de uso.
- Aplica la regla central de AGENTS.md §12: confirma que no se resuelve con un módulo existente o configuración.
- ADR si el módulo implica diseño nuevo (skill `write-adr`).

## Pasos

1. Nombre en inglés, kebab-case, singular o plural coherente con los demás. Rama `feat/VIT-xxx-scaffold-<module>`.
2. Crea el árbol (ejemplo `orders`):

```
src/modules/orders/
├── domain/
│   ├── order.ts                  # entity with invariants
│   ├── order-status.ts           # value object
│   └── errors.ts                 # typed domain errors
├── application/
│   ├── ports/order-repository.ts # interface; all methods receive StoreId
│   ├── create-order.ts           # use case returning Result<T,E>
│   └── index.ts                  # ONLY public surface of the module
├── infrastructure/
│   ├── drizzle-order-repository.ts   # adapter; runs inside tx with SET LOCAL app.store_id
│   └── schema.ts                 # Drizzle table (see schema-change)
└── presentation/
    └── create-order.action.ts    # Zod parse -> use case -> response
```

3. Dominio: solo TypeScript puro, cero imports externos (ni Zod, ni Drizzle, ni Next). Usa `Money`, `StoreId` y `Result` del shared kernel; no los modifiques.
4. Aplicación: define los puertos como interfaces y los casos de uso. Cada caso de uso recibe `StoreId` y lo verifica contra la sesión. Exporta solo lo público desde `application/index.ts`.
5. Infraestructura: un adaptador por puerto, con stub que falla con `NotImplemented` y `TODO(VIT-xxx)` con issue abierto.
6. Presentación: valida entradas con Zod en el borde y llama al caso de uso; nunca importa `infrastructure` directo.
7. Registra en `src/infra/container.ts` la instancia del adaptador y la inyección de los casos de uso. Es el único lugar que conoce las implementaciones.
8. Reglas dependency-cruiser: añade el módulo al patrón de `.dependency-cruiser.cjs` (skill `arch-rules`); corre `pnpm depcruise src`.
9. Crea `docs/arquitectura/modulos/<module>.md` en español: propósito, casos de uso, puertos, tablas, eventos, zona sensible, decisiones (ADRs). Incluye un diagrama Mermaid.
10. Crea tests vacíos con nombre por caso de uso en `tests/` y deja el módulo compilando: `pnpm typecheck && pnpm lint`.

## Salida

PR con el scaffold, doc del módulo, registro en container y reglas de dependencia; HANDOFF al Builder con la lista de casos de uso a implementar.

## Checklist de verificación

- [ ] Existen las 4 carpetas y `application/index.ts` es la única entrada pública.
- [ ] `grep -rn "import" src/modules/<m>/domain` no muestra paquetes externos.
- [ ] `pnpm depcruise src` pasa sin violaciones.
- [ ] El container registra puertos y adaptadores.
- [ ] La doc existe y se indica si el módulo es zona sensible.

## Errores comunes a evitar

- Lógica de negocio en `presentation` o en el adaptador.
- Importar `infrastructure` de otro módulo o saltarse `application/index.ts`.
- Puertos sin `StoreId`, que abren la puerta al cruce de tiendas.
- Implementar integraciones prohibidas antes de su gatillo (pagos, ledger).
- Dejar el módulo sin doc: el Reviewer lo trata como BLOCKER.
