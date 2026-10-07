---
name: e2e-flow
description: Escribe un test E2E de Playwright por cada criterio de aceptación, primero en móvil (375x812) y luego en desktop; úsala cuando un issue VIT-xxx tenga criterios de aceptación o toque un flujo crítico.
---

# e2e-flow

Fuente: AGENTS.md §11, VITRINIA.md §3.2 y flujos críticos del agente `qa`.

## Cuándo usarla

- Un issue con criterios de aceptación llega a QA.
- Cambia un flujo crítico: Landing → formulario → verificación de email → tienda publicada; Vitrina → producto → carrito → pedido registrado → WhatsApp; Login → panel → crear/editar producto; MCP prepare → confirm → cambio + audit.
- Un bug importante necesita su test de regresión.

## Entradas

- Issue `VIT-xxx` con criterios de aceptación y zona sensible marcada.
- App corriendo local (`pnpm dev`) con Postgres de test aislada y Mailpit.
- Factories en `tests/e2e/factories/` (`makeStore`, `makeProduct`, `makeOrder`).

## Pasos

1. Lista los criterios del issue y asigna un `test()` por criterio, nombrado `AC1: <criterio en español>`. Un criterio sin test es un criterio sin cumplir.
2. Crea el archivo `tests/e2e/<feature>.spec.ts`. Define dos projects en `playwright.config.ts`: `mobile` (`viewport: { width: 375, height: 812 }`, `isMobile: true`, `hasTouch: true`) y `desktop` (1280x800). Mobile corre primero; si falla, no se mira desktop.
3. Aísla por tienda: cada test crea su propia tienda con un slug único (`makeStore({ slug: \`t-${test.info().workerIndex}-${Date.now()}\` })`) y navega a `http://<slug>.localhost:3000`. Nunca compartas tienda entre tests ni dependas del orden.
4. Siembra datos por API/factory contra la BD de test (`DATABASE_URL_TEST`), nunca por UI salvo que el flujo sea lo que se prueba. Limpia en `afterEach` solo lo de tu tienda.
5. Selectores accesibles: `getByRole('button', { name: 'Agregar al carrito' })`, `getByLabel`, `getByText` como último recurso. `data-testid` solo si no hay rol ni etiqueta, y se anota por qué. Prohibido CSS y XPath.
6. Cero sleeps. Prohibido `waitForTimeout`. Usa aserciones con auto-espera: `await expect(page.getByRole('status')).toHaveText(/pedido registrado/i)` y `page.waitForResponse` para red.
7. Verifica efectos, no solo pantalla: tras el clic en WhatsApp, consulta la tabla `orders` y comprueba el snapshot (nombre y precio al comprar) y que la URL `https://wa.me/569...` lleve el texto del pedido. Intercepta la navegación con `context.route`; no abras WhatsApp real.
8. Verifica el correo con la API de Mailpit (`http://localhost:8025/api/v1/messages`), no con sleeps.
9. Cubre estados de error y vacíos del criterio (carrito vacío, producto agotado, 500 simulado con `page.route`).
10. Corre: `pnpm exec playwright test --project=mobile` y luego `--project=desktop`. Repite 3 veces con `--repeat-each=3` para detectar flakiness; un test intermitente se arregla o se elimina, no se reintenta.

## Salida

Spec(s) en `tests/e2e/`, y en el HANDOFF:

```
E2E <VIT-xxx>
Criterios: N · Tests: N · mobile: pass/fail · desktop: pass/fail · repeat-each=3: ok
Cobertura de criterios: AC1 ✔ AC2 ✔ ...
Bugs encontrados: VIT-xxx (S?)
```

## Checklist

- [ ] Un test por criterio, nombre trazable al AC.
- [ ] Mobile 375x812 verde antes de desktop.
- [ ] Solo `getByRole`/`getByLabel`; sin `waitForTimeout`.
- [ ] Tienda y datos propios por test; BD de test aislada.
- [ ] Efectos verificados en BD (pedido, audit) y no solo en UI.
- [ ] Estados de error y vacío cubiertos.
- [ ] 3 repeticiones sin fallos.

## Errores comunes

- Usar la tienda "demo" compartida: un test rompe a otro en paralelo.
- Probar solo desktop y olvidar que el menú móvil cambia los roles accesibles.
- Esperar con `sleep` tras el clic en vez de esperar la respuesta o el estado.
- Afirmar solo que aparece un toast sin comprobar que el pedido existe.
- Apuntar a la BD de desarrollo o a datos reales.
- Editar código de la app para que el test pase: se reporta al Builder (skill `bug-report`).
