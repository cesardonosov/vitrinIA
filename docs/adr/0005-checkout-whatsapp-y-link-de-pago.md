# ADR-0005: Checkout por WhatsApp y link de pago del vendedor, con snapshot del pedido

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — pagos y modelo de negocio)
- Aprobación de Cesar: respondió pagos y datos del comprador el 2026-10-08 (puntos 4 y 5, versión 2 de este ADR); falta su OK al ADR completo.
- Issue: VIT-127
- Zona sensible: sí (pedidos, pagos, posibles datos personales del comprador) — requiere threat-model de Security antes de pasar a Aceptado

## Contexto

- §2.3: VitrinIA nunca toca fondos en V1; el comercio es titular de sus cuentas de pago. §3.3: checkout por WhatsApp + link de Mercado Pago del vendedor. §3.4: pagos integrados fuera de la POC.
- §3.2: la Puerta A exige pedidos registrados en la BD al hacer clic en WhatsApp. §7: pedidos con snapshot inmutable (nombre y precio al comprar), dinero en entero + `currency`.
- §2.1: el GMV estimado es la materia prima de la monetización futura (fee, PSP) y de la conversación con inversionistas.
- Componentes preparados con gatillo: `webhook_inbox` (primer cobro real) y ledger (antes de tocar dinero) (§6.5).
- Pre-mortem 2026-10-08: P5 (GMV no creíble) es riesgo alto; C6 (contracargos si se toca dinero) es medio.

## Decisión

Usaremos **checkout sin manejo de fondos**: el carrito vive en el cliente y, al apretar "Pedir por WhatsApp" o "Pagar con link", el servidor crea un pedido con snapshot y devuelve la URL de destino.

1. El caso de uso `placeOrder` recibe solo `productId` y cantidad; **recalcula precios y nombres desde la BD** (nunca confía en el precio del cliente) y verifica que los productos sean de la tienda del host (ADR-0003).
2. Guarda `orders` + `order_items` con snapshot (nombre, precio unitario, cantidad, `currency`, totales), canal (`whatsapp` | `payment_link`) y estado inicial `intent`. Los ítems son inmutables: `app_user` no tiene `UPDATE` ni `DELETE` sobre `order_items`.
3. Clave de idempotencia generada en el cliente para evitar pedidos duplicados por doble clic; rate limit por IP y tienda.
4. Devuelve `https://wa.me/<E.164>?text=...` con el detalle y un código corto del pedido, o el medio de pago elegido. El cliente navega en la misma pestaña (abrir ventanas después de un `await` lo bloquean navegadores móviles).
   - **Medios de pago (Cesar, 2026-10-08: "pueden ser varias opciones")**: una tienda puede ofrecer varios a la vez. (a) Link de Mercado Pago, (b) link de Flow, (c) transferencia bancaria (banco, tipo y número de cuenta, titular, RUT y correo del vendedor, mostrados como texto). Los links se validan al guardarse en el Store Config: `https:` y hosts de Mercado Pago o Flow en lista permitida. Cambiar medios de pago solo desde el portal con re-verificación, nunca por MCP (recomendación C de STATUS, se mantiene salvo que Cesar diga otra cosa).
   - Amplía `VITRINIA.md` §3.3 ("link de Mercado Pago"); al aceptarse este ADR se actualiza ese párrafo (archivo protegido).
5. **Datos del comprador (Cesar, 2026-10-08: "todo lo necesario")**: el checkout pide lo que piden los comercios chilenos, minimizado por la Ley 21.719 y condicionado a la opción elegida:
   - Siempre: nombre y teléfono (WhatsApp).
   - Opcional: correo (resumen del pedido) y nota para el vendedor.
   - Si elige despacho: región, comuna (selector en cascada), calle y número, depto o referencia. Si elige retiro: nada más.
   - Si pide factura: RUT con validación módulo 11, razón social y giro. Nunca RUT por defecto.
   - Nunca datos de tarjeta. Los datos del comprador viven en una tabla aparte (`order_contacts`) con RLS por tienda, fuera de eventos y logs.
   - Plazos de retención en ADR-0010.
6. El vendedor puede marcar el pedido como `confirmed` o `cancelled` desde el panel (Sprint 3). Se reportan dos métricas separadas: **GMV de intención** (todos los pedidos) y **GMV confirmado**.
7. Se definen los puertos `PaymentGateway` y `webhook_inbox` solo como interfaces; no se implementan hasta su gatillo.

## Alternativas consideradas

1. **Pedido con snapshot + redirección a WhatsApp o link del vendedor (elegida)**
   - Pros: cero riesgo financiero, regulatorio y de contracargos; GMV medible desde el día 1; es el canal que el vendedor ya usa.
   - Contras: un clic no es una venta; el pago ocurre fuera y no se puede verificar.
2. **Solo link `wa.me` sin registrar pedido**
   - Pros: trivial de construir.
   - Contras: no cumple la Puerta A ni genera GMV; se pierde el activo de datos (§7.1).
3. **Mercado Pago Checkout Pro integrado con cuenta del vendedor (OAuth / marketplace)**
   - Pros: GMV real y confirmado; base del fee de marketplace (§2.1 paso 3).
   - Contras: fuera de la POC (§3.4); exige `webhook_inbox`, manejo de credenciales de terceros y conciliación; disponibilidad del fee en Chile pendiente (§12).
4. **VitrinIA cobra y liquida al vendedor**
   - Pros: máximo control del checkout (tesis PSP).
   - Contras: toca fondos (prohibido en V1); exige ledger, KYC y gestión de contracargos; decisión de la Puerta C con inversionistas.

## Consecuencias

- Positivas: Puerta A cumplible con mínima complejidad; el snapshot deja el modelo listo para un futuro pago integrado sin migrar datos; sin responsabilidad sobre fondos.
- Negativas / deuda:
  - El GMV de intención sobreestima ventas; depende de que el vendedor confirme pedidos.
  - Los pedidos son un formulario público: spam y pedidos falsos inflan métricas (mitigar con rate limit y Turnstile si aparece abuso).
  - En desktop `wa.me` abre WhatsApp Web, con más fricción.
  - El link de pago del vendedor puede quedar desactualizado; VitrinIA no lo puede verificar.
- Reversibilidad: **reversible**. Agregar pago integrado es un nuevo adaptador de `PaymentGateway` más un ADR.
- Seguridad: precios recalculados en servidor, idempotencia y aislamiento por tienda reducen la superficie. Al guardar datos del comprador, los pedidos pasan a ser zona de datos personales: Security debe revisar `order_contacts`, su RLS y su borrado. El texto del mensaje de WhatsApp se construye con datos validados (sin inyección de URL).
- OPEX: neutro (sin pasarelas ni webhooks).

## Pendiente para Aceptado

- Threat-model de Security (pedidos públicos, idempotencia, link de pago, PII).
- OK de Cesar al ADR completo (definición de métrica GMV y lista de hosts permitidos).
