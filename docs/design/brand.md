# Marca VitrinIA: "Instantánea"

> **Estado: elegida por Cesar el 8 de octubre de 2026 (ronda 2, camino 3). PROVISIONAL**: Cesar indicó que más adelante podría venir otra marca. Por eso todo lo de este documento debe llegar al código **solo a través de design tokens** (VIT-112, `docs/design/tokens.md`): cambiar de marca = cambiar los tokens y los assets de `docs/design/brand/instantanea/`, sin tocar componentes.
> Las alternativas descartadas (ronda 1 A "Escaparate" y B "Gema"; ronda 2 "Etiqueta" y "Percha") están archivadas en `docs/design/brand-archivo.md`. No se borran.
> La marca **no está registrada** (INAPI pendiente, ver `docs/PENDIENTES.md`) y el dominio vitrinia.cl está por registrar.

## Esencia

**Qué es:** la vitrina online gratis del vendedor chileno de Instagram/WhatsApp, lista en minutos y que se ve profesional.

- **3 adjetivos:** cercana, ordenada, ágil.
- **3 anti-adjetivos:** corporativa, infantil, genérica (plantilla).
- **Concepto:** cada prenda es una foto con marco. La vitrina es el álbum de tu Instagram convertido en tienda. El producto del vendedor es el protagonista; VitrinIA es el borde discreto.
- **Qué NO haremos parecido a la competencia** (Take App, Kyte, Tiendanube): no usar sus colores dominantes de marca, ni logos con forma de bolsa de compras o carrito, ni sus tipografías de identidad. Tampoco usamos colores de redes sociales (ni el degradado de Instagram ni el verde de WhatsApp) en la marca.

## Logo

Assets en `docs/design/brand/instantanea/`. Pasan a `public/brand/` en la tarea de implementación (con los nombres de la skill `brand`).

| Variante | Archivo | Nombre en `public/brand/` |
|---|---|---|
| Horizontal, fondo claro | `logo-light.svg` | `logo.svg` |
| Horizontal, fondo oscuro | `logo-dark.svg` | `logo-dark.svg` |
| Horizontal, monocromo (`currentColor`) | `logo-mono.svg` | `logo-mono.svg` |
| Ícono cuadrado 512, a sangre (foto de perfil, sin esquinas redondeadas) | `icono.svg` | `isotipo.svg` |
| Favicon (tile redondeado 512) | `favicon.svg` | `favicon.svg` |
| Imagen para redes (1200x630) | `og-image.svg` | `og-image.svg` |
| Vista previa de la propuesta | `preview.png` | no se publica |

- **Isotipo:** foto instantánea inclinada 8 grados (marco crema, ventana celeste) con una polera en silueta, sobre un tile cacao. Una barra en la base del marco evoca la banda de la foto. En fondo oscuro el tile pasa a celeste y la ventana a cacao, para que no se pierda.
- **Wordmark:** "vitrinia" en minúsculas, glifos de Gabarito 700 convertidos a trazados `<path>` (sin texto SVG ni fuente embebida). Los puntos de las "i" van en celeste en la versión oscura.
- **Colores por versión (máx. 3):** clara = cacao, crema, celeste; oscura = cacao (fondo), crema, celeste; mono = solo `currentColor` (el marco y la polera quedan calados, transparentes).
- **Tamaño mínimo:** isotipo 16 px (favicon); logo horizontal 96 px de ancho. Bajo 24 px usar solo el isotipo. A 32 px se lee como "foto con prenda oscura" (verificado en `preview.png`).
- **Zona de respeto:** alrededor del logo, el alto de la "i" sin punto (x-height, aprox. 1/3 del alto del logo) por todos los lados.
- **Foto de perfil circular (Instagram):** el motivo cabe en un círculo de radio ~180 sobre 512; usar `icono.svg`.
- **Prohibido:** estirar o rotar el logo completo; cambiar los colores fuera de las versiones oficiales; poner el logo claro sobre fondo claro (usar la versión oscura o la mono); añadir sombras, degradados o contornos; reemplazar el wordmark por una fuente; cambiar la polera por otra prenda en el logo oficial (en material de un rubro concreto sí se admite una variante aprobada por el Designer).
- **Peso:** todos los SVG pesan menos de 8 KB, sin `<image>`, sin fuentes embebidas.

## Paleta

Cacao y celeste son neutros: dejan respirar cualquier paleta de prendas o productos del vendedor. En tokens se mapean así (ver `docs/design/tokens.md`):

| Token | Nombre | Hex | Uso |
|---|---|---|---|
| `primary` | cacao | **#2B1A12** | marca, botón primario (texto nieve), texto principal |
| `primary-hover` | cacao-700 | #44342C | hover/pressed del primario |
| `accent` | celeste | **#8CCBEA** | acento, CTA secundario (texto cacao), puntos del wordmark. **Nunca como texto sobre fondo claro** (1,66:1) |
| `link` | azul | **#17658F** | links, estados activos, foco |
| `link-hover` | azul-700 | #0F5278 | hover de links |
| `bg` | nieve | #F3F8FB | fondo de página |
| `surface-warm` | crema | #FBF6EC | tarjetas cálidas, marco del logo |
| `surface-tint` | cielo | #E3F2FA | chips, fondos suaves |
| `surface-dark` | cacao | #2B1A12 | fondo en modo oscuro |
| `surface-dark-raised` | cacao-elevado | #3A261C | tarjetas en modo oscuro |

**Escala de neutros** (fondos y bordes fríos, textos cálidos):

| Paso | Hex | Uso |
|---|---|---|
| 50 | #F3F8FB | fondo (nieve) |
| 100 | #E6EDF1 | fondos de campos, separadores suaves |
| 200 | #D3DCE2 | bordes |
| 300 | #B5C0C7 | bordes fuertes |
| 400 | #8C979E | iconos deshabilitados (**no usar como texto**, 2,79:1) |
| 500 | #7A6B63 | texto terciario, leyendas (4,78:1 sobre nieve) |
| 600 | #5A4A42 | texto secundario (tierra) |
| 700 | #44342C | texto fuerte, hover |
| 800 | #35231B | texto sobre blanco |
| 900 | #2B1A12 | texto principal (cacao) |

**Semánticos** (700 sobre 50): success #17663C / #E7F5EC; warning #7A4F00 / #FFF3D6; danger #B42318 / #FDECEA; info #1D5FA8 / #E8F1FB.

### Contraste WCAG 2.x

Fórmula: luminancia relativa sRGB y ratio (L1+0,05)/(L2+0,05), calculada con script (no a ojo). AA = 4,5:1 texto normal, 3:1 texto grande y elementos de UI. Los tokens de VIT-112 repiten esta verificación en tests automáticos.

| Par | Texto / elemento | Fondo | Ratio | Resultado |
|---|---|---|---|---|
| Texto principal | cacao #2B1A12 | nieve #F3F8FB | 15,59:1 | AA AAA |
| Texto sobre blanco | cacao #2B1A12 | blanco #FFFFFF | 16,68:1 | AA AAA |
| Texto secundario | tierra #5A4A42 | nieve #F3F8FB | 7,87:1 | AA AAA |
| Texto terciario | neutral-500 #7A6B63 | nieve #F3F8FB | 4,78:1 | AA |
| Botón primario | nieve #F3F8FB | cacao #2B1A12 | 15,59:1 | AA AAA |
| Link sobre fondo | azul #17658F | nieve #F3F8FB | 5,96:1 | AA |
| Link sobre blanco | azul #17658F | blanco #FFFFFF | 6,37:1 | AA |
| Link hover | azul-700 #0F5278 | nieve #F3F8FB | 7,86:1 | AA AAA |
| Botón de acento | cacao #2B1A12 | celeste #8CCBEA | 9,41:1 | AA AAA |
| Chip | azul #17658F | cielo #E3F2FA | 5,57:1 | AA |
| Chip, texto secundario | tierra #5A4A42 | cielo #E3F2FA | 7,36:1 | AA AAA |
| Tarjeta cálida | cacao #2B1A12 | crema #FBF6EC | 15,48:1 | AA AAA |
| Modo oscuro, texto | nieve #F3F8FB | cacao #2B1A12 | 15,59:1 | AA AAA |
| Modo oscuro, acento / link | celeste #8CCBEA | cacao #2B1A12 | 9,41:1 | AA AAA |
| Modo oscuro, secundario | #B9A99F | cacao #2B1A12 | 7,34:1 | AA AAA |
| Modo oscuro, tarjeta | nieve #F3F8FB | cacao-elevado #3A261C | 13,32:1 | AA AAA |
| Éxito | success-700 #17663C | success-50 #E7F5EC | 6,22:1 | AA |
| Alerta | warning-700 #7A4F00 | warning-50 #FFF3D6 | 6,46:1 | AA |
| Error | danger-700 #B42318 | danger-50 #FDECEA | 5,75:1 | AA |
| Info | info-700 #1D5FA8 | info-50 #E8F1FB | 5,66:1 | AA |

Reglas: el texto sobre celeste es siempre cacao; el celeste no es color de texto sobre fondo claro; el azul sobre celeste (3,6:1) no se usa para texto.

## Tipografía

- **Títulos:** Gabarito 700. Redondeada y amable, con ñ, tildes y ¿¡. Es también la base del wordmark (ya convertido a trazados).
- **Texto:** Albert Sans 400, 500 y 600. Legible en móvil, con ñ, tildes y ¿¡.
- Total 4 pesos. Ambas OFL (Google Fonts). Carga con `next/font/google`, `display: "swap"`, solo esos pesos.
- Escala (móvil / desktop): H1 32/40 px y 44/52, H2 24/32 y 30/38, H3 20/26, cuerpo 16/24 (nunca menos de 16 en móvil), pequeño 14/20. Line-height cuerpo 1,5; títulos 1,15 a 1,25.
- **Alcance (ADR-0004 v3):** estas fuentes se usan **solo en el portal, el formulario y el sitio de marketing de VitrinIA**. Las vitrinas de los vendedores usan únicamente fuentes de sistema (`system-sans`, `system-serif`, `system-mono`) por el presupuesto de LCP/JS; ante conflicto manda el ADR. Gabarito y Albert Sans podrán sumarse al enum de `theme.font` cuando se empaqueten en el repo (cambio aditivo, decisión del Designer), no antes.

## Tono de voz

Reglas: español de Chile, **tuteo siempre** ("tú", nunca "usted" ni "vos"), frases cortas, voz activa. Amable y práctico, como una amiga que te ayuda a armar la tienda; habla de fotos, prendas y clientes. Que lo entienda un adulto mayor: sin groserías, sin jerga que excluya, sin anglicismos innecesarios. Humor suave, solo cuando no estorba. Usar "tu cliente" o "quien te compra" cuando no se sabe quién es; "clienta" solo en material de un rubro femenino.

Microtextos (10):
1. Botón primario: "Crea tu tienda gratis"
2. Subtítulo del formulario: "Cuéntanos qué vendes y armamos tu vitrina en minutos."
3. Catálogo vacío: "Tu vitrina está vacía. Sube tu primera foto y empieza a vender."
4. Error de red: "Se cortó la conexión. Revisa tu internet y vuelve a intentarlo."
5. Éxito al publicar: "¡Listo! Tu tienda ya está online. Compártela por WhatsApp o en tu Instagram."
6. WhatsApp (botón del cliente): "Pedir por WhatsApp"
7. Carrito vacío: "Aún no has agregado nada. Mira los productos y elige lo que te guste."
8. Verificar email: "Te enviamos un correo. Haz clic en el enlace para publicar tu tienda."
9. Error de campo: "Falta tu número de WhatsApp para que te puedan escribir."
10. Sin stock: "Se agotó. Escríbenos y te avisamos si vuelve."

Frases de marca: "Tu Instagram, ahora con carrito." · "Usa tus mejores fotos: ellas venden por ti." · "Sube tus fotos, ponles precio y comparte tu tienda por WhatsApp. Gratis, sin letra chica."

| Decimos | No decimos |
|---|---|
| tu tienda, tu vitrina | tu e-commerce, tu plataforma |
| gratis, sin letra chica | freemium, sin costo asociado |
| pedir por WhatsApp | iniciar proceso de compra |
| sube tus fotos | carga tus assets |
| algo salió mal, intenta de nuevo | error 500, excepción |
| ¿Te ayudamos? | ¿Desea asistencia? |
| publicar | deployar |

## Originalidad

Revisado el 8 de octubre de 2026:
- El isotipo (foto instantánea + polera) se dibujó desde cero con primitivas geométricas; no se usó ningún archivo, vector ni marca de terceros ni se trazó sobre otras. Los glifos del wordmark provienen de Gabarito (OFL) convertidos a `<path>`; no hay texto SVG.
- Revisión visual de memoria contra Take App, Kyte y Tiendanube: no replicamos sus colores de marca, formas (bolsa, carrito) ni tipografías de identidad. Tampoco usamos colores de Instagram ni WhatsApp.
- **Limitación:** la foto instantánea (estilo Polaroid) es un motivo común en apps de fotos; la ejecución propia (proporciones, polera en la ventana, tile cacao) la diferencia, pero **no se hizo comparación lado a lado con logos reales ni búsqueda en INAPI**; queda pendiente para quien registre la marca (`docs/PENDIENTES.md`). No usar la palabra "Polaroid" en textos de marca.
- Tipografías Gabarito y Albert Sans: Google Fonts, licencia OFL (uso libre).
- Pendiente de negocio (no resuelto aquí): registro INAPI, dominio vitrinia.cl y usuario de Instagram.

## Cómo cambiar de marca (swappability)

1. El Designer actualiza este documento y los assets de `docs/design/brand/<marca>/`.
2. Se actualizan solo los valores de color y tipografía en los tokens (ver `docs/design/tokens.md`); los tests de contraste fallan si un par nuevo no cumple AA.
3. Se reemplazan los archivos de `public/brand/`. Los componentes no tienen colores ni fuentes escritos a mano, así que no cambian.

## Próximos pasos

1. VIT-112 convierte esta paleta y tipografía en design tokens y Storybook.
2. Copiar los assets a `public/brand/` en la tarea de implementación del portal.
3. Si Cesar trae otra marca, se archiva esta en `brand-archivo.md` y se repite el ciclo.
