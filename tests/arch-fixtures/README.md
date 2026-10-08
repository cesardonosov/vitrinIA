# Fixtures de reglas de arquitectura

Árbol **falso** que viola a propósito cada regla de `.dependency-cruiser.cjs`.
No es código de la app: está fuera de `src/`, excluido de `tsconfig.json` y no se
importa desde ningún lado. `tests/arch/rules.test.ts` lo recorre y afirma que cada
archivo dispara la regla que dice violar (y que los controles positivos no disparan
ninguna).

Para verlo a mano: `pnpm arch:fixtures` (debe terminar con un código distinto de 0, igual al número de violaciones, y listar las
violaciones). Cómo agregar una regla: `docs/arquitectura/ARCHITECTURE.md` §3.4.
