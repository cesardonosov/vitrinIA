# ADR-0010: Plazos de retención de datos de pedidos, compradores, eventos y logs

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — datos personales)
- Aprobación de Cesar: pendiente. El 2026-10-08 dijo "revisa lo legal, entiendo que son 5 años"; este ADR contrasta esa cifra con la ley.
- Issue: por crear
- Zona sensible: sí (datos personales) — requiere revisión de Security antes de pasar a Aceptado

## Contexto

- Cesar pidió revisar el plazo legal; él entendía 5 años.
- **Ley 21.719** (reemplaza a la Ley 19.628, plena vigencia el 1 de diciembre de 2026): no fija un plazo en años. Exige conservar los datos solo mientras sean necesarios para su finalidad y luego suprimirlos o anonimizarlos (principio de proporcionalidad), y declarar los plazos o sus criterios en el registro de actividades de tratamiento. Fuentes: [Academia Judicial](https://academiajudicial.cl/recursos/actualizaciones-normativas/ley-21-719-que-regula-la-proteccion-y-el-tratamiento-de-los-datos-personales-y-crea-la-agencia-de-proteccion-de-datos-personales/), [resumen yourdevs](https://www.yourdevs.cl/blog/ley-21719-proteccion-datos-chile). El texto oficial en BCN no se pudo abrir desde la sesión; el artículo exacto queda por verificar.
- **Código Tributario, art. 200**: el SII puede revisar 3 años, o 6 en casos de declaración omitida o maliciosamente falsa. El SII indica conservar los libros contables "durante 6 años, mientras estén vigentes los plazos de prescripción" ([SII](https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_4628.htm)). Esa obligación es del vendedor como contribuyente, no de VitrinIA, y se refiere a montos y documentos, no al contacto del comprador.
- Conclusión: **no hay un plazo legal de 5 años**. El plazo largo que sí existe es de 6 años y aplica al registro de la venta; los datos de contacto del comprador deben durar lo mínimo necesario.
- Con los vendedores, VitrinIA es responsable de los datos. Con los compradores, el vendedor es responsable y VitrinIA, encargado (por validar con abogado).

## Decisión

| Dato | Plazo | Al vencer |
|---|---|---|
| Pedido sin datos personales (ítems, montos, fecha, canal, estado) y datos de factura de empresa | 6 años desde el pedido | Se borra |
| Contacto del comprador (nombre, teléfono, correo, dirección, nota) | 24 meses desde el pedido | Se anonimiza; el pedido queda |
| Eventos de analítica (sin datos personales, `visitor_id` diario) | 13 meses; agregados sin límite | Se borran los crudos |
| Logs de aplicación | 30 días | Se borran |
| Cuenta del vendedor cerrada | 30 días desde el cierre | Se borra o anonimiza, salvo pedidos dentro de su plazo |

- Un job diario aplica los plazos; cada ejecución deja un registro sin datos personales (cuántas filas, qué tabla).
- El vendedor puede exportar sus pedidos antes de cerrar la cuenta.
- El comprador puede pedir supresión antes del plazo; se anonimiza su contacto y el pedido queda.

## Alternativas consideradas

1. **6 años para el pedido y 24 meses para el contacto (elegida)**
   - Pros: cubre la prescripción tributaria del vendedor; minimiza datos personales como pide la Ley 21.719; permite recompra y garantías durante 2 años.
   - Contras: un job de anonimización más que mantener.
2. **5 años para todo (lo que Cesar tenía en mente)**
   - Pros: una sola regla.
   - Contras: no calza con ninguna norma; queda corto para el registro tributario (6 años) y largo para el contacto del comprador.
3. **6 años para todo**
   - Pros: una sola regla, cubre lo tributario.
   - Contras: guarda contacto del comprador sin finalidad durante años; difícil de justificar ante la Agencia.

## Consecuencias

- Positivas: plazos defendibles; el aviso de privacidad borrador ya los usa.
- Negativas / deuda: el job de retención y su test entran al Sprint 2 junto con `order_contacts`.
- Reversibilidad: alargar un plazo es reversible solo hacia adelante; lo ya anonimizado no se recupera.
- OPEX: neutro.

## Pendiente para Aceptado

- OK de Cesar al plazo de 24 meses para el contacto del comprador.
- Revisión de Security.
- Revisión de un abogado antes del piloto público (junto con el aviso de privacidad).
