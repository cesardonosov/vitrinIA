---
name: bug-report
description: Plantilla y reglas para reportar un bug de VitrinIA como issue reproducible con severidad S1-S4, y convertirlo en test; úsala cada vez que QA o el Explorer encuentren un comportamiento incorrecto.
---

# bug-report

Fuente: AGENTS.md §6, §7, §11; VITRINIA.md §11.2. Un bug que otro no puede reproducir en 2 minutos no está reportado.

## Cuándo usarla

- Falla un test E2E/adversarial/a11y/perf, o una exploración o smoke-crawl muestra algo raro.
- Detectas trabajo de otro rol: no lo arregles en silencio, crea el issue y asígnalo.

## Entradas

- Evidencia cruda: traza de Playwright, captura, error de consola, respuesta HTTP, filas de BD.
- Commit/rama probada (`git rev-parse --short HEAD`).

## Pasos

1. Busca duplicados: `gh issue list --label bug --search "<palabras clave>"`. Si existe, comenta con la nueva evidencia.
2. Reproduce 2 veces desde cero (BD de test limpia, tienda nueva). Si es intermitente, anota la tasa (ej. 3 de 10).
3. Reduce a los pasos mínimos y numerados. Sin "navegué un rato".
4. Asigna severidad:
   - **S1:** bloquea el flujo crítico (crear tienda, comprar, registrar pedido), pérdida/fuga de datos, cruce entre tiendas, secreto expuesto. Detiene el merge/demo.
   - **S2:** función principal rota con workaround difícil, error 500 en flujo común, overflow que tapa un botón de compra en móvil.
   - **S3:** función secundaria rota o defecto visual/UX con workaround.
   - **S4:** cosmético, copy, mejora menor.
5. Identifica rol dueño según el área (Builder código, Designer estilos/presets, DevOps infra/CI, Security si es zona sensible: auth, tenancy, MCP, secretos, datos personales, pedidos, pagos, infra).
6. Crea el issue con `gh issue create --label bug --label "sev:S2" --label "owner:builder" --title "..." --body-file bug.md`. El título es en español, `[S2] <área>: <síntoma>`, y lleva `VIT-xxx` al asignarse el ID.
7. Adjunta evidencia: captura en móvil y/o desktop, `trace.zip`, texto de consola. Sin datos personales ni secretos reales.
8. Todo bug S1/S2 (y los S3 repetibles) se convierte en test que falla antes del fix, en `tests/e2e/regressions/VIT-xxx.spec.ts` o `tests/integration/regressions/`. No se cierra el issue sin el test verde.
9. Enlaza el issue en el HANDOFF (`Tasks created: VIT-xxx`).

## Salida

```
Título: [S2] Carrito: botón "Pedir por WhatsApp" no registra pedido en móvil
Etiquetas: bug, sev:S2, owner:builder · ID: VIT-xxx
Entorno: commit abc1234 · Chromium/WebKit · viewport 375x812 · tienda demo-xyz.localhost:3000 · BD de test
Pasos:
 1. ...
 2. ...
Esperado: se crea 1 fila en orders con snapshot y se abre wa.me
Actual: se abre wa.me pero orders queda vacía (3/3 intentos)
Evidencia: captura.png, trace.zip, consola
Impacto / workaround:
Test de regresión: tests/e2e/regressions/VIT-xxx.spec.ts
```

## Checklist

- [ ] Reproducido 2 veces; tasa si es intermitente.
- [ ] Pasos mínimos, esperado vs actual separados.
- [ ] Severidad justificada con los criterios.
- [ ] Rol dueño asignado; etiqueta `bug`; VIT-xxx en el título.
- [ ] Evidencia sin datos personales ni secretos.
- [ ] Test de regresión escrito (S1/S2).

## Errores comunes

- Mezclar varios síntomas en un issue.
- Describir la causa supuesta en vez de lo observable.
- Marcar todo S1 o todo S3: usa los criterios.
- Reportar sin viewport ni commit.
- Arreglar el bug tú mismo cuando eres QA o Explorer.
