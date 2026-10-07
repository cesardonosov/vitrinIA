# Pendientes y "por hacer" — VitrinIA

> Temas abiertos de negocio, decisiones por tomar e ideas para después. Dueño: Orchestrator. Cada ítem técnico se convierte en issue `VIT-xxx` cuando entra a un sprint.
> Última actualización: 7 de octubre de 2026.

## 1. Decisiones que esperan a Cesar

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Destino de plataforma (Puerta D) | Motor propio "tipo Jumpseller" · Graduación a Jumpseller | Motor propio, coherente con la tesis PST; Jumpseller como puente opcional |
| D2 | Semáforo de riesgo obligatorio (🟢🟡🟠🔴) + skill `risk-assessment` | Sí · No | Sí |
| D3 | Rol de Transbank: ¿solo PST/pagos o también abre puertas con couriers? | — | Aclarar |
| D4 | Hosting definitivo | Railway · Vercel + worker | Decidir antes del piloto público |
| D5 | Nivel de partner Jumpseller | Afiliado · Profesional | Depende de D1 |

## 2. Antes de empezar el Sprint 1

- [ ] Crear carpeta `C:\proyecto_ia\vitrinia`.
- [ ] Crear repo privado vacío `vitrinia` en GitHub y compartir el link.
- [ ] Definir rubro de la primera tienda real del piloto.
- [ ] Registrar vitrinia.cl en NIC Chile.

## 3. Antes del piloto público

- [ ] Empresa / socios.
- [ ] Términos de uso y política de privacidad.
- [ ] Revisar marca VitrinIA en INAPI y usuario de Instagram.
- [ ] Moderación de tiendas y botón de denuncia de abuso.
- [ ] Datos personales (Ley 21.719, vigente dic-2026): retención, exportación y borrado de cuenta.
- [ ] Retención y agregación de eventos de analítica, aprobadas por Security.
- [ ] Respaldos con restauración probada.
- [ ] Validar con vendedores: ¿usan catálogo WhatsApp, Take App o Kyte? ¿Qué los haría cambiarse?

## 4. Por hacer: ideas y capacidades futuras

### Analítica y monitoreo (valor agregado para la tienda)
- [ ] **Captura de todos los eventos de compradores desde el Sprint 2** (ver `VITRINIA.md` §7.1).
- [ ] Panel del vendedor: visitas, origen (Instagram/WhatsApp), productos más vistos, embudo visita → carrito → pedido, carritos abandonados.
- [ ] Panel global VitrinIA: todas las tiendas, GMV estimado, conversión por rubro, tiendas activas.
- [ ] Recomendaciones automáticas al vendedor ("se mira mucho y no se pide", "sube fotos de mejor calidad").
- [ ] Alertas al vendedor (pico de visitas, carrito abandonado alto).
- [ ] Benchmarks anónimos por rubro ("tu conversión vs. tiendas similares").
- [ ] Reportes semanales automáticos por WhatsApp o email.
- [ ] Uso de la analítica como insumo de riesgo y scoring para la ruta PSP.
- [ ] Almacén analítico dedicado (ClickHouse/BigQuery) cuando el volumen lo exija.

### Producto
- [ ] Análisis de URL de referencia → preset.
- [ ] Asistente IA propio (solo si el MCP tiene demasiada fricción).
- [ ] Administración por WhatsApp para vendedores.
- [ ] MCP remoto con OAuth.
- [ ] Dominio propio del cliente.
- [ ] Más presets por rubro.

### Pagos (ruta PST)
- [ ] Mercado Pago integrado (GMV real).
- [ ] Fee de marketplace (verificar disponibilidad en Chile).
- [ ] Ledger de doble partida y `webhook_inbox`.
- [ ] PSP técnico → PSP sub-adquirente con Transbank como adquirente ("acepta tarjetas desde el día 1").
- [ ] Modelo "gratis si cobras con VitrinIA Pagos".

### Logística
- [ ] Despacho básico (zonas, costo fijo, retiro).
- [ ] Integración con agregador (tipo Shipit / Envíame).
- [ ] Tarifas propias negociadas por volumen.

### Motor de comercio propio (si D1 = motor propio)
- [ ] Stock real, órdenes completas, boleta electrónica vía proveedor.
- [ ] Partners de formalización (inicio de actividades, boleta).

### Estrategia
- [ ] `docs/producto/VISION.md`: visión "plataforma de venta y cobro de emprendedores de redes sociales en Chile".
- [ ] `docs/producto/COMPETENCIA.md`.
- [ ] One-pager y deck para inversionistas.
- [ ] Modelo de ingresos: GMV × take rate, con supuestos validados por Cesar.
