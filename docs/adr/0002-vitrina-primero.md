# ADR-0002: Vitrina primero — orden de construcción de la POC

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — define scope y orden de entrega de la POC)
- Issue: — (orden de sprints; ver docs/sprints/sprint-01.md)
- Zona sensible: no directamente (es una decisión de secuencia); los módulos que ordena sí lo son y tienen sus propios ADRs

## Contexto

- La POC dura un mes en 4 sprints de una semana (§3.5): 1) Fundaciones y marca, 2) Vitrina y pedidos, 3) Pide tu tienda, 4) MCP y demo.
- La Puerta A (§3.2) exige 5 tiendas reales, una creada sin ayuda en < 15 min, pedidos registrados al hacer clic en WhatsApp y una demo con guion.
- El objetivo de la POC es triple (§3.1): que funcione de punta a punta, que convenza a inversionistas con tiendas que se ven profesionales y que un vendedor pida su tienda solo.
- §7.1 exige capturar eventos de compradores desde el Sprint 2: "un evento que no se capturó no se recupera".
- El pre-mortem 2026-10-08 identifica el scope creep (P3) y las vitrinas con aspecto de plantilla (P2) como riesgos altos.

## Decisión

Construiremos **primero la vitrina multi-tenant y el registro de pedidos (Sprint 2)**, y después el onboarding "Pide tu tienda", login y panel (Sprint 3), y al final el servidor MCP e import de Instagram (Sprint 4). Las tiendas del Sprint 2 se crean con un *seed* versionado de Store Config (no un panel). Si el plan se atrasa, se recorta desde el final: primero el import de Instagram, después el alcance del MCP; nunca la vitrina ni los pedidos.

## Alternativas consideradas

1. **Vitrina primero (elegida)**
   - Pros: lo que ve el comprador y el inversionista existe desde la semana 2 y se itera 3 semanas; la analítica empieza a acumular datos lo antes posible (§7.1); valida ADR-0003 (host + RLS) y ADR-0004 (Store Config) con tráfico real temprano; el onboarding (Sprint 3) produce algo ya probado.
   - Contras: hasta el Sprint 3 las tiendas se crean por seed (trabajo manual del equipo); el criterio "1 tienda sin ayuda en < 15 min" se prueba tarde.
2. **Onboarding primero ("Pide tu tienda" → vitrina)**
   - Pros: valida pronto la métrica de 15 minutos; sigue el orden del recorrido del vendedor.
   - Contras: el formulario produce un Store Config que todavía no se renderiza; se diseña el contrato sin feedback visual; se pierden 1–2 semanas de eventos; a la demo llega una vitrina con poca iteración.
3. **MCP primero (diferenciador ante inversionistas)**
   - Pros: muestra lo que la competencia no tiene (§1.1).
   - Contras: administra un catálogo que nadie ve; es la zona de mayor riesgo de seguridad (§8.3) y conviene construirla sobre módulos `catalog` y `audit` ya estables; no aporta a ningún criterio de la Puerta A salvo la demo.
4. **Todo en paralelo (vertical delgada de cada cosa por sprint)**
   - Pros: siempre hay un flujo de punta a punta.
   - Contras: con un solo Builder y sprints de una semana multiplica cambios de contexto y PRs a medias; es la forma más probable de llegar a la demo con todo a medias (P3).

## Consecuencias

- Positivas:
  - La demo de cierre de cada sprint muestra valor visible (§3.5).
  - El Store Config se valida con vitrinas reales antes de que el formulario y el MCP escriban sobre él.
  - Analítica y pedidos (GMV estimado) acumulan datos desde la semana 2.
- Negativas / deuda:
  - Los seeds del Sprint 2 son código o datos que el onboarding reemplaza; deben quedar como fixtures de test, no como camino paralelo de creación de tiendas.
  - El riesgo de onboarding > 15 min (pre-mortem P1) se descubre recién en el Sprint 3.
  - El MCP queda en la última semana, con poca holgura para su revisión de seguridad.
- Reversibilidad: **reversible** hasta el inicio del Sprint 2; después, reordenar cuesta un sprint.
- Seguridad: sin impacto directo. Positivo: el MCP se construye sobre `audit` y `catalog` ya revisados por Security.
- OPEX: neutro (todo local, USD 0).

## Pendiente para Aceptado

- OK de Cesar sobre el orden y sobre la regla de recorte (import de Instagram primero).
