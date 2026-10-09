# Catálogo semilla: Kanuwiñ

Datos semilla para la primera tienda real de VitrinIA (Kanuwiñ, mezclas premium de semillas para aves, Chile). Salen del catálogo del dueño, confirmados por Cesar. Para el Sprint 2: sirven para sembrar la tienda y para probar la vitrina con datos reales.

- `kanuwin.json`: 5 categorías, 5 productos, 7 variantes (la variante es el tamaño de la bolsa).
- Precios: enteros en CLP, con IVA, finales (`priceClp` + `currency: "CLP"`).
- `image.file` es el nombre del archivo; las fotos NO están en el repo. Viven fuera, en `/mnt/project-files/kanuwin/images/`. Las marcadas `provisional: true` (Insectívoros y Snack de gusanos) no son fotos reales del empaque y hay que reemplazarlas.
- Passeriformes tiene la misma nutrición que Psitácidas: el dueño confirmó que es correcto.
- No hay datos de contacto de personas. El WhatsApp de la tienda se pide en el onboarding.
- Es un archivo de datos, no define un esquema de base de datos. El modelo real de catálogo lo define el módulo `catalog`.
