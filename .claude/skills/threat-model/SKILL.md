---
name: threat-model
description: Hace un STRIDE-lite de una feature sensible antes de construirla (activos, actores, flujos, amenazas, controles exigidos como criterios de aceptación y riesgo residual); úsala antes de que el Builder empiece auth, tenancy, MCP, secretos, datos personales, pedidos, pagos o infra.
---

# threat-model

## Cuándo usarla
- El issue está marcado como zona sensible y todavía no hay código.
- Cambia un flujo existente en esas zonas (nuevo proveedor, nuevo rol, nueva tool MCP).
- Debe estar listo **antes** de pasar el issue a Builder (VITRINIA.md §9.1).

## Entradas
- Issue `VIT-xxx` con spec y ADRs relacionados.
- `docs/security/SECURITY.md` y threat models previos en `docs/security/threat-models/`.
- Diagrama de flujo de la feature (Mermaid) o descripción del Orchestrator/Architect.

## Pasos
1. Lista **activos** con su sensibilidad: datos de otras tiendas, emails y teléfonos (Ley 21.719), tokens de sesión y MCP, catálogo, pedidos (snapshot), claves de pago, secretos.
2. Lista **actores**: visitante anónimo, comprador, vendedor dueño de tienda A, vendedor malicioso (tienda B), IA del comercio manipulada por contenido, bot/scraper, insider/agente con permisos amplios.
3. Dibuja los **flujos** en Mermaid con fronteras de confianza: navegador → Cloudflare → Next.js → caso de uso → Postgres (RLS) / worker / MCP / terceros.
4. Aplica STRIDE a cada cruce de frontera: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Siempre incluye: cruce de `StoreId`, IDOR, host spoofing, cookies de subdominio, subida de archivos, prompt injection, abuso de onboarding, enumeración.
5. Puntúa cada amenaza: probabilidad × impacto (B/M/A). Descarta con motivo las irrelevantes; no rellenes.
6. Define **controles exigidos**, cada uno redactado como criterio de aceptación verificable (Given/When/Then o checklist) y con dueño. Ejemplo: "Un usuario de la tienda A que pide `GET /api/products/<id de B>` recibe 404 y queda registrado en audit".
7. Indica el test que prueba cada control (unit, integración, `tenant-isolation-test`, E2E, `mcp-security`).
8. Declara **riesgo residual** y quién lo acepta. Riesgos sobre pagos o datos sensibles se escalan a Cesar con opciones y recomendación.
9. Guarda en `docs/security/threat-models/<feature>.md`, enlaza desde el issue y pasa el control de criterios al Orchestrator para que entren a la spec. Termina con HANDOFF.

## Salida
```markdown
# Threat model: <feature> (VIT-xxx)
Fecha · Autor · Estado: borrador|vigente
## Activos / Actores
## Flujo (Mermaid)
## Amenazas
| ID | STRIDE | Amenaza | Prob | Impacto | Control | Test |
## Controles exigidos (criterios de aceptación)
- [ ] C1: ...
## Riesgo residual
| Riesgo | Nivel | Aceptado por |
## Supuestos y preguntas abiertas
```

## Checklist
- [ ] Cada amenaza Alta/Media tiene control y test.
- [ ] Los controles están copiados como criterios de aceptación en el issue.
- [ ] Contempla multi-tenant, PII y abuso sin autenticación.
- [ ] Riesgo residual con responsable.
- [ ] Máximo 2 páginas; sin texto genérico.

## Errores comunes
- Amenazas genéricas ("hackers") sin actor ni flujo concreto.
- Controles sin test asociado: no son exigibles.
- Asumir que el middleware o la UI protegen el acceso.
- Olvidar el actor "contenido del catálogo" como vector de inyección.
- Hacerlo después del código: se convierte en justificación.
- Dejar riesgo residual alto sin escalar a Cesar.
