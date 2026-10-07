---
name: explore-session
description: Sesión de exploración con misión y tiempo acotado (charter, notas, hallazgos priorizados e issues); úsala después del smoke-crawl, tras cada merge a main y antes de una demo para encontrar lo que nadie pensó.
---

# explore-session

Fuente: agente `explorer`. Exploración guiada por charter (session-based testing): curiosidad con límites, evidencia y salida accionable.

## Cuándo usarla

- Después de `smoke-crawl`, para investigar lo raro que el script no entiende.
- Antes de cada demo y en la pasada del Explorer del Sprint 4.

## Entradas

- App local con BD de test y una tienda sembrada (`http://explora.localhost:3000`).
- Resultado del último `smoke-crawl` (`tests/smoke/output/`).
- Cambios recientes en `main` (`git log --oneline -10`).

## Pasos

1. Escribe el charter antes de empezar, en `docs/qa/sesiones/YYYY-MM-DD-<mision>.md`:
   ```
   Misión: Explorar <área> con el fin de descubrir <riesgo>
   Duración: 15 min (alarma; al terminar se corta)
   Áreas: <rutas/pantallas>
   Dispositivo: móvil 375x812 primero; luego desktop
   Datos: tienda explora, usuario de prueba
   ```
2. Empieza en móvil con DevTools abiertas (consola y red). Cronometra; no extiendas la sesión, abre otra.
3. Aplica ideas de usuario real, al menos 8 por sesión:
   - Volver atrás a mitad del checkout y avanzar de nuevo.
   - Recargar con carrito lleno, y con el formulario a medias (¿se pierde lo escrito?).
   - Girar el celular (`page.setViewportSize` 812x375) con el carrito o un modal abierto.
   - Doble clic y toque rápido en "Agregar" y "Pedir por WhatsApp" (¿dos pedidos?).
   - Carrito vacío: ir al checkout, abrir el link directo `/carrito`, WhatsApp sin productos.
   - Abrir la misma vitrina en dos pestañas y comprar en ambas.
   - Producto agotado, sin foto, con nombre larguísimo o con emojis.
   - Pegar texto con saltos de línea en el teléfono; teléfono sin +56.
   - Cerrar la pestaña después del clic en WhatsApp y volver; sesión expirada en el panel.
   - Zoom de texto grande, modo oscuro del sistema, red lenta/offline (`context.setOffline(true)`).
4. Toma notas con marcas de tiempo mientras exploras: `[04:12] QUÉ hice → QUÉ pasó (ok/raro/bug)`. Guarda capturas en `tests/smoke/output/sesiones/`.
5. Al terminar el tiempo, prioriza hallazgos: S1-S4 según la skill `bug-report`; separa "bug", "pregunta de producto" (va a Orchestrator) y "idea".
6. Crea un issue por hallazgo con `bug-report` (reproducible en 2 min); incluye el charter y el minuto de la nota.
7. Marca áreas pendientes para la próxima sesión; no las explores ahora.

## Salida

```
SESIÓN <fecha> · Misión: ... · Duración real: 15 min
Cubierto: ... · No cubierto: ...
Hallazgos: S1 0 · S2 1 · S3 2 · S4 1
Issues: VIT-xxx, VIT-xxx
Preguntas para Orchestrator/Cesar: ...
```

## Checklist

- [ ] Charter escrito antes y límite de tiempo respetado.
- [ ] Móvil primero, luego desktop.
- [ ] Al menos 8 ideas de usuario real probadas.
- [ ] Notas con marcas de tiempo y evidencia.
- [ ] Hallazgos priorizados y convertidos en issues; no se arregló nada.
- [ ] Nada contra producción ni datos reales.

## Errores comunes

- Explorar sin misión y sin cortar a tiempo.
- Anotar "se ve raro" sin pasos ni captura.
- Probar solo el camino feliz en desktop.
- Arreglar el problema en vez de reportarlo (el Explorer no edita archivos).
- Reportar sospechas no reproducidas como S1.
