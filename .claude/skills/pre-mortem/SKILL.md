---
name: pre-mortem
description: Conduce la sesión "¿cómo fracasa VitrinIA en 6 meses?" (técnico, seguridad, producto, costo), clasifica por probabilidad e impacto y convierte cada riesgo alto en issue o ADR; úsala al inicio del proyecto y de cada fase o puerta.
---

# pre-mortem

Rol principal: Architect (facilita). Sprint 1 incluye el primer pre-mortem; se repite antes de cada puerta (A, B, C, D de VITRINIA.md §4).

## Cuándo usarla

- Sprint 1 y antes de pasar de POC a piloto público (Puerta A), de piloto a monetización (B) y a escala (C).
- Antes de tocar dinero (ledger, webhook_inbox) o de abrir el MCP a terceros.
- Tras un incidente grave.

## Entradas

- `docs/VITRINIA.md` completo (alcance, OPEX USD 50/mes, riesgo principal: lo técnico se copia).
- `docs/producto/COMPETENCIA.md`, `docs/security/SECURITY.md`, ADRs, `docs/PENDIENTES.md`.
- Pre-mortems anteriores en `docs/`.

## Pasos

1. Fija la premisa: "Estamos 6 meses adelante y VitrinIA fracasó. ¿Por qué?". Cada categoría se trabaja por separado y se anotan 5 a 8 causas concretas:
   - **Técnico**: fuga entre tiendas, RLS mal aplicada con el pool, migraciones irreversibles, deuda de `TODO(VIT-xxx)`, worker/outbox que pierde eventos, respaldos nunca restaurados.
   - **Seguridad**: cuenta secuestrada, prompt injection vía catálogo en el MCP, abuso del formulario público (spam de tiendas), EXIF con GPS filtrado, datos personales bajo Ley 21.719.
   - **Producto**: el vendedor no termina el onboarding en 15 minutos, vitrinas que parecen plantilla, Instagram bloquea la importación, la competencia (Take App, Kyte, Tiendanube) copia.
   - **Costo**: OPEX sobre USD 50/mes, almacenamiento de imágenes, correos transaccionales, contracargos y liquidez si se toca dinero.
2. Para cada causa, puntúa **probabilidad** (B/M/A) e **impacto** (B/M/A) y deriva la clase: Alta = A/A, A/M o M/A; Media = M/M, A/B o B/A; Baja = resto.
3. Decide por riesgo: **Alto** -> issue `VIT-xxx` con Definition of Ready (skill `write-spec`) o ADR (skill `write-adr`) con dueño y fecha; **Medio** -> mitigación en backlog y monitoreo; **Bajo** -> aceptar y registrar.
4. Los riesgos de datos sensibles, pagos, scope o lock-in irreversible se escalan a Cesar en STATUS.md con opciones y recomendación. Los de negocio sin bloqueo van a `docs/PENDIENTES.md`.
5. Define para cada riesgo alto una señal temprana medible (ej. "intentos de cruce de tienda detectados en logs > 0").
6. Escribe el documento y enlaza issues y ADRs creados. Sin documentación ficticia: solo riesgos con causa explícita.
7. Cierra con HANDOFF a Orchestrator para ubicar los issues en el sprint.

## Salida

`docs/pre-mortem-AAAA-MM-DD.md`:

```
# Pre-mortem — <fase> (AAAA-MM-DD)
Premisa: estamos en <fecha +6 meses> y el proyecto fracasó.
## Matriz
| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| R1 | Seguridad | Cruce entre tiendas por SET sin LOCAL | M | A | Alta | VIT-140 | test de cruce en CI |
## Altos -> acciones
- R1 -> VIT-140 / ADR-0009
## Medios y bajos
## Escalado a Cesar
```

## Checklist de verificación

- [ ] Las 4 categorías tienen causas concretas.
- [ ] Cada riesgo tiene probabilidad, impacto, clase y acción.
- [ ] Todo riesgo Alto enlaza a un issue VIT-xxx o ADR existente.
- [ ] Hay señal temprana por cada riesgo alto.
- [ ] El archivo está en `docs/` y enlazado desde `docs/README.md`.

## Errores comunes a evitar

- Lista genérica de riesgos ("mala seguridad").
- Quedarse en el análisis sin crear issues ni ADR.
- Ignorar costo y producto por sesgo técnico.
- Mitigar con tecnologías prohibidas (Kafka, Kubernetes, microservicios).
- Decidir por cuenta propia riesgos que corresponden a Cesar.
