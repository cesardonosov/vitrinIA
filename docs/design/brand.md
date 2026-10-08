# Marca VitrinIA

> Estado: **dos propuestas (A y B) para que Cesar elija**. Issue VIT-111. Fecha: 8 de octubre de 2026.
> Hasta que Cesar elija, nada de esto se traduce a tokens en código (eso es VIT-112). La marca **no está registrada** (INAPI pendiente, ver `docs/PENDIENTES.md`) y el dominio vitrinia.cl está por registrar.

## Esencia (común a ambas propuestas)

Qué es: la vitrina online gratis del vendedor chileno de Instagram/WhatsApp, lista en minutos y que se ve profesional.

- **3 adjetivos:** cercana, ordenada, ágil.
- **3 anti-adjetivos:** corporativa, infantil, genérica (plantilla).
- **Idea central:** una vitrina bien iluminada. El producto del vendedor es el protagonista; la marca VitrinIA es el marco discreto.
- **Qué NO haremos parecido a la competencia** (Take App, Kyte, Tiendanube): no usar sus colores dominantes de marca ni logos con forma de bolsa de compras o carrito, y no usar sus tipografías de identidad. Ambas propuestas parten de la metáfora "vitrina + chispa" y de un wordmark geométrico dibujado a mano, no de un icono de carrito.

Archivos: `docs/design/brand/` (SVG) y `docs/design/brand/previews/` (PNG 512x512). Los 10 SVG pesan menos de 2 KB cada uno, sin `<image>`, sin fuentes embebidas (el texto "vitrinia" son trazos `<path>`/`<circle>`), máximo 3 colores por versión y la versión mono usa `currentColor`.

---

# Propuesta A: "Escaparate"

**Resumen.** Un toldo de local de barrio con una chispa coral en la vitrina: cálido, comercial y reconocible a 16px. Verde petróleo profundo + coral: se siente tienda de barrio con oficio, no startup fría.

## Logo A

| Variante | Archivo |
|---|---|
| Horizontal, fondo claro | `docs/design/brand/a-logo-light.svg` |
| Horizontal, fondo oscuro | `docs/design/brand/a-logo-dark.svg` |
| Horizontal, monocromo (`currentColor`) | `docs/design/brand/a-logo-mono.svg` |
| Isotipo, fondo claro / oscuro | `a-isotipo-light.svg` / `a-isotipo-dark.svg` |
| Vistas previas 512px | `docs/design/brand/previews/a-*.png` |

- **Isotipo:** toldo escalonado (3 festones) sobre un marco de vitrina; dentro, una chispa de 4 puntas en coral = "tu producto brilla".
- **Wordmark:** "vitrinia" en minúsculas, trazo redondeado de 6 unidades, las tres "i" con punto coral. Geométrico, dibujado a mano.
- **Tamaño mínimo:** isotipo 16px (favicon), logo horizontal 96px de ancho. Bajo 24px usar solo el isotipo.
- **Zona de respeto:** alrededor del logo, el alto de la "i" sin punto (x-height, 28/64 del alto del logo) por todos los lados.
- **Prohibido:** estirar o rotar; cambiar la chispa a otro color que no sea el acento; poner el logo claro sobre fondo claro; añadir sombras, degradados o contornos; reemplazar el wordmark por una fuente.

## Paleta A

| Token | Hex | Uso |
|---|---|---|
| primary-50 / 100 / 300 | #E6F4F3 / #C2E6E3 / #5FB8B3 | fondos suaves, chips, bordes activos |
| primary-500 / 600 | #1F8A8A / #0E6F73 | iconos, hover |
| **primary-700** | **#0B5563** | marca, botón primario, links |
| primary-800 / 900 | #083F4B / #052A33 | fondo oscuro, texto sobre claro |
| **accent-500** (coral) | **#FF6B4A** | chispa, CTA secundario, acentos (nunca texto sobre blanco) |
| neutral-50 / 100 / 200 / 300 | #F6F8F7 / #ECF0EF / #D8DFDD / #BAC5C2 | fondos, bordes |
| neutral-400 / 500 | #8E9C98 / #66736F | iconos deshabilitados (no usar como texto) |
| neutral-600 / 700 / 800 / 900 | #4B5753 / #343E3B / #222A28 / #131817 | texto secundario a principal |
| success / warning / danger / info (700 sobre 50) | #17663C / #7A4F00 / #B42318 / #1D5FA8 sobre #E7F5EC / #FFF3D6 / #FDECEA / #E8F1FB | estados |

Contraste WCAG 2.x medido con script (luminancia relativa sRGB; AA = 4.5:1 texto normal, 3:1 texto grande/UI):

| Par | Texto / elemento | Fondo | Ratio | Resultado |
|---|---|---|---|---|
| Texto principal | neutral-900 #131817 | neutral-50 #F6F8F7 | 16.82:1 | AA AAA |
| Texto secundario | neutral-600 #4B5753 | neutral-50 #F6F8F7 | 7.06:1 | AA AAA |
| Texto sobre blanco | neutral-800 #222A28 | blanco #FFFFFF | 14.69:1 | AA AAA |
| Boton primario | blanco #FFFFFF | primary-700 #0B5563 | 8.42:1 | AA AAA |
| Link / primario sobre fondo | primary-700 #0B5563 | neutral-50 #F6F8F7 | 7.90:1 | AA AAA |
| Boton acento (texto oscuro) | neutral-900 #131817 | accent-500 #FF6B4A | 6.37:1 | AA |
| Texto claro sobre fondo oscuro | neutral-50 #F6F8F7 | primary-900 #052A33 | 14.21:1 | AA AAA |
| Acento sobre fondo oscuro | accent-500 #FF6B4A | primary-900 #052A33 | 5.38:1 | AA |
| Exito | success-700 #17663C | success-50 #E7F5EC | 6.22:1 | AA |
| Alerta | warning-700 #7A4F00 | warning-50 #FFF3D6 | 6.46:1 | AA |
| Error | danger-700 #B42318 | danger-50 #FDECEA | 5.75:1 | AA |
| Info | info-700 #1D5FA8 | info-50 #E8F1FB | 5.66:1 | AA |

Regla: el texto sobre coral es siempre oscuro (neutral-900). El coral sobre blanco da menos de 4.5:1, por eso no se usa como color de texto sobre fondo claro.

## Tipografía A

- **Títulos:** Bricolage Grotesque, peso 700. Carácter propio, curvas amables, soporta ñ, tildes y ¿¡.
- **Texto:** Figtree, pesos 400, 500 y 600. Legible en móvil, soporta ñ, tildes y ¿¡.
- Total 4 pesos, `next/font/google` con `display: "swap"`.
- Escala (móvil / desktop): H1 32/44 px, H2 24/32, H3 20/26, cuerpo 16/24 (nunca menos de 16 en móvil), pequeño 14/20. Line-height cuerpo 1.5, títulos 1.15 a 1.25.

## Tono de voz A

Reglas: tuteo siempre, frases cortas, voz activa, cercano pero que lo entienda un adulto mayor; sin groserías ni jerga que excluya; "tú" nunca "usted" ni "vos". Cálido de barrio: "tu tienda", "dale", con medida.

Microtextos (10):
1. Botón primario: "Crea tu tienda gratis"
2. Subtítulo del formulario: "Cuéntanos qué vendes y armamos tu vitrina en minutos."
3. Catálogo vacío: "Tu vitrina está vacía. Sube tu primer producto y empieza a vender."
4. Error de red: "Se cortó la conexión. Revisa tu internet y vuelve a intentarlo."
5. Éxito al publicar: "¡Listo! Tu tienda ya está online. Compártela con tus clientes."
6. WhatsApp (botón del cliente): "Pedir por WhatsApp"
7. Carrito vacío: "Aún no has agregado nada. Mira los productos y elige lo que te guste."
8. Verificar email: "Te enviamos un correo. Haz clic en el enlace para publicar tu tienda."
9. Error de campo: "Falta tu número de WhatsApp para que te puedan escribir."
10. Sin stock: "Se agotó. Escríbenos y te avisamos cuando vuelva."

| Decimos | No decimos |
|---|---|
| tu tienda, tu vitrina | tu e-commerce, tu plataforma |
| gratis | sin costo asociado |
| pedir por WhatsApp | iniciar proceso de compra |
| algo salió mal, intenta de nuevo | error 500 / excepción |
| ¿Te ayudamos? | ¿Desea asistencia? |

---

# Propuesta B: "Gema"

**Resumen.** Una gema ámbar sobre una "V" que la sostiene, dentro de una app-tile índigo: moderna, digital y distintiva, pensada para verse bien como icono de app y en redes. Índigo + ámbar: más tecnológica y premium, menos de barrio.

## Logo B

| Variante | Archivo |
|---|---|
| Horizontal, fondo claro | `docs/design/brand/b-logo-light.svg` |
| Horizontal, fondo oscuro | `docs/design/brand/b-logo-dark.svg` |
| Horizontal, monocromo (`currentColor`; V y gema en blanco) | `docs/design/brand/b-logo-mono.svg` |
| Isotipo, fondo claro / oscuro | `b-isotipo-light.svg` / `b-isotipo-dark.svg` |
| Vistas previas 512px | `docs/design/brand/previews/b-*.png` |

- **Isotipo:** "V" blanca de trazo grueso a modo de pedestal de exhibición que sostiene una gema (rombo) ámbar, sobre un cuadrado redondeado índigo. En fondo oscuro el cuadrado sube a índigo claro (#6C63F0) para no perderse.
- **Wordmark:** "vitrinia" en minúsculas, trazo más grueso (7 unidades), con rombos ámbar como puntos de las "i".
- **Tamaño mínimo:** isotipo 16px, logo horizontal 100px de ancho.
- **Zona de respeto:** la altura de la gema (20/64 del alto del logo) por todos los lados.
- **Prohibido:** gema en otro color; la V sin su cuadrado; estirar o rotar; degradados o sombras; logo claro en fondo claro.

## Paleta B

| Token | Hex | Uso |
|---|---|---|
| primary-50 / 100 | #EEECFF / #DAD7FF | fondos suaves, chips |
| primary-300 | #A5A0FF | primario sobre fondo oscuro |
| primary-500 | #6C63F0 | isotipo en oscuro, iconos |
| **primary-600** | **#4338CA** | marca, botón primario, links |
| primary-700 / 900 | #3730A3 / #1E1B6B | hover, fondos intensos |
| **accent-400** (ámbar) | **#FFB400** | gema, CTA secundario, acentos |
| neutral-50 / 100 / 200 / 300 | #F8F7FC / #EFEDF7 / #DDDAEC / #BFBBD6 | fondos, bordes |
| neutral-400 / 500 | #918DAF / #6E6A8C | iconos deshabilitados (no usar como texto) |
| neutral-600 / 700 / 800 / 900 | #54506F / #3A3659 / #25223F / #14122B | texto secundario a principal, fondo oscuro |
| success / warning / danger / info (700 sobre 50) | iguales a la propuesta A | estados |

Contraste WCAG 2.x medido con script:

| Par | Texto / elemento | Fondo | Ratio | Resultado |
|---|---|---|---|---|
| Texto principal | neutral-900 #14122B | neutral-50 #F8F7FC | 17.11:1 | AA AAA |
| Texto secundario | neutral-600 #54506F | neutral-50 #F8F7FC | 7.15:1 | AA AAA |
| Texto sobre blanco | neutral-800 #25223F | blanco #FFFFFF | 15.23:1 | AA AAA |
| Boton primario | blanco #FFFFFF | primary-600 #4338CA | 7.90:1 | AA AAA |
| Link / primario sobre fondo | primary-600 #4338CA | neutral-50 #F8F7FC | 7.41:1 | AA AAA |
| Boton acento (texto oscuro) | neutral-900 #14122B | accent-400 #FFB400 | 10.23:1 | AA AAA |
| Texto claro sobre fondo oscuro | neutral-50 #F8F7FC | neutral-900 #14122B | 17.11:1 | AA AAA |
| Acento sobre fondo oscuro | accent-400 #FFB400 | neutral-900 #14122B | 10.23:1 | AA AAA |
| Primario claro sobre fondo oscuro | primary-300 #A5A0FF | neutral-900 #14122B | 7.88:1 | AA AAA |
| Exito | success-700 #17663C | success-50 #E7F5EC | 6.22:1 | AA |
| Alerta | warning-700 #7A4F00 | warning-50 #FFF3D6 | 6.46:1 | AA |
| Error | danger-700 #B42318 | danger-50 #FDECEA | 5.75:1 | AA |
| Info | info-700 #1D5FA8 | info-50 #E8F1FB | 5.66:1 | AA |

El ámbar sobre blanco no cumple como texto: se usa solo como relleno con texto oscuro encima, o como acento sobre fondos oscuros.

## Tipografía B

- **Títulos:** Fraunces (serif con carácter), pesos 600 y 700. Aporta "boutique" y se aleja de las plantillas sans genéricas. Soporta ñ, tildes y ¿¡.
- **Texto:** DM Sans, pesos 400 y 500. Soporta ñ, tildes y ¿¡.
- Total 4 pesos, `next/font/google` con `display: "swap"`.
- Escala (móvil / desktop): H1 32/42 px, H2 24/32, H3 20/26, cuerpo 16/24, pequeño 14/20. Line-height cuerpo 1.5, títulos 1.15.

## Tono de voz B

Reglas: tuteo, frases cortas, voz activa; más pulido y seguro que A: habla de "tienda profesional", "se ve bien", sin diminutivos. Sin groserías ni jerga excluyente.

Microtextos (10):
1. Botón primario: "Pide tu tienda"
2. Subtítulo del formulario: "Una tienda que se ve profesional, lista en minutos y sin costo."
3. Catálogo vacío: "Aquí van tus productos. Agrega el primero."
4. Error de red: "No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez."
5. Éxito al publicar: "Tu tienda está publicada. Ya puedes compartir el enlace."
6. WhatsApp (botón del cliente): "Comprar por WhatsApp"
7. Carrito vacío: "Tu carrito está vacío. Explora la tienda y suma productos."
8. Verificar email: "Revisa tu correo y confirma tu cuenta para publicar la tienda."
9. Error de campo: "Necesitamos tu WhatsApp para que tus clientes te contacten."
10. Sin stock: "Producto agotado. Escríbenos para consultar reposición."

| Decimos | No decimos |
|---|---|
| tu tienda profesional | tu sitio web transaccional |
| gratis, sin letra chica | freemium |
| comprar por WhatsApp | realizar pedido vía mensajería |
| no pudimos / inténtalo otra vez | falló la operación |
| publicar | deployar |

---

## Comparación rápida

| | A "Escaparate" | B "Gema" |
|---|---|---|
| Sensación | cálida, de barrio, comercial | moderna, premium, digital |
| Isotipo | toldo + chispa (más descriptivo) | V + gema en tile (más icónico, mejor como icono de app) |
| Riesgo | la silueta de local/toldo es un recurso común en iconos de tienda; la ejecución propia lo diferencia pero conviene revisión | índigo+ámbar menos "chileno"; Fraunces tiene más peso visual en móvil |
| Legibilidad 16px | buena (silueta simple) | muy buena (bloque sólido) |

## Originalidad

Revisado el 8 de octubre de 2026:
- Ambos isotipos y el wordmark se dibujaron desde cero, a mano, en SVG con primitivas geométricas (trazos y arcos). No se usó ningún archivo, vector ni fuente de terceros, ni se trazó sobre otras marcas.
- Los wordmarks no usan ninguna fuente: cada letra es un trazo propio; no hay texto SVG.
- Revisión visual de memoria contra Take App, Kyte y Tiendanube: no replicamos sus colores de marca, formas ni tipografías de identidad. **Limitación:** no se hizo comparación lado a lado con los logos reales ni búsqueda en INAPI; queda pendiente para quien registre la marca.
- Los toldos en iconografía de tiendas son un motivo genérico; la propuesta A usa una construcción propia (festones, chispa interna). Se recomienda búsqueda de anterioridad antes de registrar.
- Tipografías: Bricolage Grotesque, Figtree, Fraunces y DM Sans son de Google Fonts bajo licencia OFL (uso libre).
- Pendiente de negocio (no resuelto aquí): registro INAPI y dominio vitrinia.cl.
- Cómo se calcularon los contrastes: fórmula WCAG 2.x de luminancia relativa (sRGB) y ratio (L1+0,05)/(L2+0,05); script de apoyo no versionado, reproducible con esa fórmula.

## Próximos pasos (tras elegir Cesar)

1. Cesar elige A o B (o pide mezcla).
2. VIT-112 convierte la paleta y tipografía elegidas en design tokens.
3. Copiar assets elegidos a `public/brand/` (`logo.svg`, `logo-mono.svg`, `isotipo.svg`, `favicon.svg`, `og-image.svg`) en la tarea de implementación; `og-image.svg` y `favicon.svg` se producen entonces.
