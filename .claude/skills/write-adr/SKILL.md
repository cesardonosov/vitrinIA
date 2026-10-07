---
name: write-adr
description: Redacta un ADR (estado, contexto, decisión, alternativas, consecuencias) en docs/adr/NNNN-titulo.md con índice y decide si requiere aprobación de Cesar; úsala ante toda decisión técnica relevante o cambio a archivos protegidos.
---

# write-adr

Rol principal: Architect. Decisión importante igual ADR (AGENTS.md §10). Cambiar algo de `docs/VITRINIA.md` exige un ADR aprobado por Cesar.

## Cuándo usarla

- Elegir o cambiar tecnología, patrón, límite entre módulos o contrato de datos.
- Modificar archivos protegidos (VITRINIA.md, AGENTS.md, `.claude/settings.json`, workflows, `src/shared/kernel/*`).
- Activar un componente "preparado" por su gatillo (webhook_inbox, ledger, CatalogSearch...).
- Cuando una decisión de pre-mortem se vuelve permanente.
- No hace falta para detalles locales reversibles dentro de un módulo.

## Entradas

- Problema o issue `VIT-xxx` que origina la decisión.
- ADRs previos (`ls docs/adr/`) y VITRINIA.md §5 a §8.
- Restricciones: OPEX techo USD 50/mes, POC con USD 0, prohibido Kafka/K8s/microservicios.

## Pasos

1. Busca ADRs relacionados con `grep -ril "<tema>" docs/adr/`. Si ya hay uno, crea uno nuevo que lo reemplaza y marca el anterior como `Reemplazado por ADR-NNNN`.
2. Número: siguiente correlativo de 4 dígitos (`ls docs/adr | sort | tail -1`). Archivo `docs/adr/NNNN-titulo-en-kebab-case.md`.
3. Contexto: hechos, restricciones y fuerzas en juego, sin opinar. Enlaza issue y secciones de VITRINIA.md.
4. Alternativas: al menos 2 reales, con pros y contras; incluye "no hacer nada" cuando aplique.
5. Decisión: una frase en voz activa ("Usaremos...") y justificación ligada a las restricciones.
6. Consecuencias: positivas, negativas, deuda aceptada, costo de revertir (reversible o irreversible), impacto en seguridad y OPEX.
7. Estado inicial `Propuesto`. Pasa a `Aceptado` al aprobarse; luego `Reemplazado` o `Rechazado`. Si toca zona sensible, pide threat-model a Security antes de aceptarlo.
8. Aprobación de Cesar: obligatoria si afecta modelo de negocio, pagos, datos sensibles, scope, arquitectura fundamental, vendor lock-in irreversible, deploy a producción o un archivo protegido. En ese caso, añádelo a STATUS.md "Esperando a Cesar" con opciones y recomendación. El resto lo acepta el Architect.
9. Actualiza `docs/adr/README.md` (índice) con una fila: número, título, estado, fecha, enlace.
10. Si el ADR cambia un módulo o esquema, actualiza `docs/arquitectura/`. Diagramas en Mermaid.

## Salida

```
# ADR-0007: <título corto>
- Estado: Propuesto | Aceptado | Rechazado | Reemplazado por ADR-NNNN
- Fecha: AAAA-MM-DD
- Decide: Architect | Cesar (aprobación requerida: sí/no)
- Issue: VIT-xxx

## Contexto
## Decisión
## Alternativas consideradas
1. <opción> — pros / contras
2. <opción> — pros / contras
## Consecuencias
- Positivas:
- Negativas / deuda:
- Reversibilidad:
```

## Checklist de verificación

- [ ] Numeración correlativa sin huecos ni duplicados.
- [ ] Hay 2 o más alternativas y consecuencias negativas explícitas.
- [ ] El índice `docs/adr/README.md` está actualizado.
- [ ] Si requiere Cesar, está en STATUS.md y el estado sigue `Propuesto` hasta su OK.
- [ ] Está escrito en español, identificadores en inglés.

## Errores comunes a evitar

- ADR escrito después de implementar para justificar lo hecho.
- Una sola alternativa o alternativas de paja.
- Editar un ADR aceptado en vez de reemplazarlo.
- Proceder con la implementación mientras el ADR esperaba aprobación de Cesar.
- Documentar infraestructura inexistente ("prohibida la documentación ficticia").
