---
name: arch-rules
description: Configura y mantiene las reglas de dependency-cruiser (capas, prohibición de imports entre módulos salvo application público, shared kernel) y explica cómo agregar reglas; úsala al crear módulos, ante violaciones en CI o al endurecer la arquitectura.
---

# arch-rules

Rol principal: Architect. La arquitectura se verifica con máquinas, no con buena voluntad (VITRINIA.md §6.2). El job de CI ejecuta `pnpm depcruise src`; `.github/workflows/*` lo toca solo DevOps.

## Cuándo usarla

- Un módulo nuevo (junto con `scaffold-module`).
- El CI falla por una violación de dependencias.
- Se decide una regla nueva por ADR (ej. restringir un paquete a `infrastructure`).

## Entradas

- `.dependency-cruiser.cjs` en la raíz y script `depcruise` en `package.json`.
- Árbol de `src/modules/`, `src/shared/`, `src/infra/`, `src/app/`.

## Reglas obligatorias

1. **Capas**: `presentation -> application -> domain`; `infrastructure -> application, domain`. `domain` no importa de `application`, `infrastructure`, `presentation` ni de paquetes externos (excepto tipos del shared kernel).
2. **Entre módulos**: un módulo solo puede importar de otro `src/modules/<otro>/application/index.ts`. Prohibido importar `domain`, `infrastructure`, `presentation` ajenos.
3. **Shared kernel** (`src/shared/kernel`): no importa de `modules/`, `infra/` ni `app/`. Solo lo modifica el Architect.
4. **Composition root**: solo `src/infra/container.ts` importa `infrastructure/` de varios módulos.
5. **`src/app/`** (Next.js) importa `presentation` y `application`, nunca `infrastructure` ni `domain` directo.
6. **Sin ciclos** (`no-circular`) y sin huérfanos relevantes.

## Pasos

1. Ejemplo de regla en `.dependency-cruiser.cjs`:
   ```js
   {
     name: 'no-cross-module-internals',
     severity: 'error',
     from: { path: '^src/modules/([^/]+)/' },
     to: {
       path: '^src/modules/([^/]+)/(domain|infrastructure|presentation)/',
       pathNot: '^src/modules/$1/'
     }
   },
   {
     name: 'domain-is-pure',
     severity: 'error',
     from: { path: '^src/modules/[^/]+/domain' },
     to: { pathNot: ['^src/modules/[^/]+/domain', '^src/shared/kernel'] }
   }
   ```
2. Para agregar una regla: escribe primero un caso que la viole (fixture en `tests/arch/`), verifica que `pnpm depcruise src` falla, luego añade la regla con `severity: 'error'` y confirma que el repo actual pasa. Sin excepciones silenciosas: un `pathNot` nuevo exige comentario con `VIT-xxx` y ADR si debilita una regla.
3. Para un módulo nuevo: no hace falta regla propia si los patrones son genéricos; verifica con `pnpm depcruise src --output-type err`.
4. Genera el grafo para la doc: `pnpm depcruise src --output-type mermaid > docs/arquitectura/dependencias.mmd` y enlázalo en `docs/arquitectura/ARCHITECTURE.md`.
5. Ante una violación del Builder: no la silencies; si el diseño necesita la dependencia, abre ADR; si no, pide mover la lógica al puerto correcto.
6. Si la regla requiere cambiar el workflow de CI, crea un issue para DevOps con revisión de Security.

## Salida

PR con `.dependency-cruiser.cjs` actualizado, test de la regla, grafo regenerado y nota en ARCHITECTURE.md; HANDOFF a Reviewer.

## Checklist de verificación

- [ ] `pnpm depcruise src` termina con 0 errores.
- [ ] Cada regla nueva tiene un fixture que la hace fallar.
- [ ] No se añadieron excepciones sin ADR y `VIT-xxx`.
- [ ] El job de CI ejecuta depcruise (verificar con DevOps, no editar el workflow).
- [ ] La doc de arquitectura refleja las reglas actuales.

## Errores comunes a evitar

- Bajar a `warn` para "destrabar" un PR.
- Permitir `domain` importar Zod "solo por los tipos".
- Compartir tipos entre módulos copiando `infrastructure`; exponerlos desde `application/index.ts`.
- Usar rutas relativas que escapan del módulo para esquivar el patrón.
- Meter lógica de módulo en `shared/` para evitar la regla.
