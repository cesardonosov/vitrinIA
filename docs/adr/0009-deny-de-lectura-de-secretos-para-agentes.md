# ADR-0009: Negar a los agentes la lectura de `.env.keys` y de archivos `.env*` (ampliación de `deny` en `.claude/settings.json`)

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — modifica el archivo protegido `.claude/settings.json`, AGENTS.md §5)
- Issue: VIT-116
- Zona sensible: sí (secretos). Requiere `threat-model` o revisión explícita de Security **antes** de pasar a Aceptado, y la prueba documentada del punto 5 después de aplicarlo.
- Relacionados: ADR-0007 (capa 1 de guardrails: "la capa 1 no se considera implementada hasta que VIT-116 esté mezclado"), pre-mortem de seguridad S6, threat model de tenancy A15, VIT-106 (barrera de secretos en repo y CI).

## Contexto

- Los secretos de VitrinIA viven en `.env.local` (desarrollo, sin cifrar), `.env.test` (sin cifrar) y en `.env.staging` / `.env.production` **cifrados con dotenvx**. La clave privada que los descifra está en `.env.keys` (nunca versionado) o en la variable `DOTENV_PRIVATE_KEY_<AMBIENTE>` (skill `env-secrets`, VIT-106).
- `.claude/settings.json` hoy niega solo `Read(.env)`, `Read(.env.local)` y `Read(.env.*.local)`. No niega `.env.keys`, `.env.test`, ni ninguna lectura por Bash: `cat .env.keys`, `grep PRIVATE .env.keys`, `sed -n p .env.local`, `head .env.test` o `dotenvx get -f .env.production` devuelven el secreto al contexto del agente y, desde ahí, a logs, PRs, issues o a un tercero por inyección de prompt (pre-mortem S6, threat model A15).
- Nueve agentes trabajan en el mismo checkout, con sesiones paralelas y worktrees. Ninguno necesita leer una clave privada: el que deploya es Cesar (capa 4 de ADR-0007) y DevOps opera dotenvx con `dotenvx set` (escribe cifrado) sin ver la clave.
- Las reglas de permisos de Claude Code son patrones sobre la herramienta (`Read(...)`, `Edit(...)`, `Bash(...)`) con comodines `*`. `deny` prevalece sobre `allow` y `ask`; no existe "deny salvo esta excepción", así que una regla demasiado amplia no se puede perforar para el caso legítimo (p. ej. `.env.example`).
- Restricción explícita del issue: no bloquear el trabajo legítimo de DevOps (`env-secrets`): editar `.env.example`, `dotenvx set` sobre archivos cifrados, `pnpm dev:up` (que pasa `--env-file .env.local` por dentro de un script de pnpm), `grep process.env src`.
- Fuera de scope: cualquier otra regla de permisos; el endurecimiento a nivel de sistema operativo (dueño/permisos de archivo) se propone como seguimiento, no aquí.

## Decisión

Usaremos **reglas `deny` por archivo y por comando para `.env.keys` y para los archivos `.env*` sin cifrar, más `ask` para los archivos cifrados y para los comandos que vuelcan el entorno**, asumiendo que son **fricción y tripwire, no barrera** (ADR-0007 §4): la barrera real sigue siendo que la clave privada no esté en el disco que ven los agentes.

### 1. Reglas `deny` a agregar (texto exacto)

Lectura y escritura directa por herramienta:

```json
"Read(.env.keys)",
"Read(**/.env.keys)",
"Edit(.env.keys)",
"Edit(**/.env.keys)",
"Write(.env.keys)",
"Write(**/.env.keys)",
"Read(.env.test)",
"Read(**/.env)",
"Read(**/.env.local)",
"Read(**/.env.test)",
"Read(**/.env.*.local)"
```

Bash: cualquier comando cuyo texto nombre la clave privada o la variable que la transporta:

```json
"Bash(*.env.keys*)",
"Bash(*DOTENV_PRIVATE_KEY*)",
"Bash(dotenvx get*)",
"Bash(dotenvx decrypt*)",
"Bash(dotenvx keypair*)",
"Bash(*dotenvx get*)",
"Bash(*dotenvx decrypt*)"
```

Bash: lectura de los archivos `.env*` **sin cifrar** por los lectores habituales y por redirección (el patrón exige el nombre del archivo como argumento separado, para no atrapar `process.env` ni `src/infra/env.ts`):

```json
"Bash(* .env)",
"Bash(* .env *)",
"Bash(* .env.local*)",
"Bash(* .env.test*)",
"Bash(* .env.*.local*)",
"Bash(* ./.env)",
"Bash(* ./.env *)",
"Bash(* ./.env.local*)",
"Bash(* ./.env.test*)",
"Bash(* ./.env.*.local*)",
"Bash(*< .env*)",
"Bash(*<.env*)",
"Bash(source .env*)",
"Bash(. .env*)"
```

Estas reglas cubren `cat`, `head`, `tail`, `less`, `more`, `sed`, `awk`, `grep`, `rg`, `cut`, `sort`, `strings`, `xxd`, `od`, `base64`, `cp`, `mv`, `tee`, `tar`, `zip`, `curl -d @`, etc., porque no dependen del nombre del lector sino del archivo como argumento. No se agrega `Bash(*.env*)` ni `Bash(* .env*)` genérico: bloquearían `grep process.env`, `cat .env.example` y `dotenvx set ... -f .env.production`.

### 2. Reglas `ask` a agregar

```json
"Bash(dotenvx *)",
"Bash(* .env.example*)",
"Bash(* .env.staging*)",
"Bash(* .env.production*)",
"Bash(printenv*)",
"Bash(env)",
"Bash(env |*)",
"Bash(env >*)",
"Bash(export -p*)",
"Bash(set | *)"
```

`.env.staging` y `.env.production` contienen solo texto cifrado y la clave pública; verlos no revela secretos, pero `dotenvx set` sobre ellos y cualquier `dotenvx run` deben quedar a la vista de Cesar o DevOps (`ask`, no `deny`). `.env.example` nunca lleva valores: `ask` por si algún día alguien pega uno. Los volcados del entorno del proceso (`printenv`, `env`) pueden exponer variables exportadas en la shell de Cesar; `ask` porque `env | grep PATH` es uso legítimo.

### 3. Lo que estas reglas **no** cubren (y por qué igual sirven)

Un patrón sobre el texto del comando se evade con `cat .en?.keys`, `cat "$(printf '.env.keys')"`, `python3 -c "print(open('.env.keys').read())"`, `node -e`, `find . -name '.env.keys' -exec cat {} +`, `tar c . | ...`, `git stash` sobre un archivo no ignorado, un script del repo que lo lea, o un `pnpm` script que imprima el entorno. Por eso:

- Las reglas son **tripwire**: un agente bien comportado no cae en ellas; un intento de evasión es, por definición, una violación de guardrail que se registra en `docs/STATUS.md` (ADR-0007 §4) y motivo de parar la sesión.
- La **barrera** es organizativa y de sistema: `.env.keys` **no debe existir** en el checkout que usan los agentes. La clave privada vive en el gestor de contraseñas de Cesar y, en deploy, en `DOTENV_PRIVATE_KEY_<AMBIENTE>` del proveedor (skill `env-secrets` paso 5). Si Cesar necesita descifrar localmente, lo hace desde una shell propia, no desde una sesión de agente, y borra `.env.keys` al terminar.
- Complemento recomendado (fuera de este ADR, issue para DevOps con revisión de Security): correr los agentes con un usuario del sistema distinto al dueño de `.env.keys` y `.env.local` con permisos `600`, o en un sandbox que monte el repo sin esos archivos. Esa capa sí es barrera.

### 4. Precedencia y mantenimiento

- `deny` gana a `allow` y a `ask`. Las reglas se agregan al final de la lista existente sin tocar las demás (fuera de scope).
- Cualquier regla nueva sobre secretos pasa por un ADR que reemplace a este (un ADR aceptado no se edita).
- La lista de reglas es contrato con la prueba del punto 5: cambiar una sin re-correr la matriz es violación del DoD.

### 5. Prueba documentada (criterio de aceptación 2 del issue)

Tras aplicar el cambio, Security ejecuta en una sesión de agente nueva la matriz siguiente y guarda la salida en `docs/security/verificaciones/VIT-116-deny-secretos.md` (comando, resultado esperado, resultado obtenido, fecha, SHA de `settings.json`). Para la prueba se crea un `.env.keys` **falso** cuyo único contenido es la línea de la variable de producción con un texto marcador inocuo (por ejemplo la frase "marcador de prueba VIT-116", sin formato de clave), y se borra al terminar; nunca se usa la clave real.

| Debe ser **denegado** | Debe seguir **permitido** (o `ask`) |
|---|---|
| `Read` de `.env.keys`, `.env`, `.env.local`, `.env.test` | `Read` de `.env.example`, `src/infra/env.ts`, `.env.staging` |
| `cat .env.keys` · `cat ./.env.keys` · `cat infra/.env.keys` | `cat .env.example` (ask) · `cat src/infra/env.ts` |
| `grep PRIVATE .env.keys` · `grep -r DOTENV_PRIVATE_KEY .` | `grep -rn "process.env" src` · `grep -rn "env" src/infra` |
| `head -c 100 .env.local` · `tail .env.test` · `sed -n p .env.local` · `awk 1 .env.local` | `pnpm dev:up` · `pnpm test` · `pnpm lint` |
| `cat < .env.local` · `cat<.env.keys` · `source .env.local` · `. .env.local` | `dotenvx set NOMBRE valor -f .env.production` (ask) |
| `dotenvx get DATABASE_URL -f .env.production` · `dotenvx decrypt` | `dotenvx encrypt -f .env.production` (ask) |
| `cp .env.keys /tmp/x` · `base64 .env.keys` · `xxd .env.local` | `env \| grep PATH` (ask) · `printenv HOME` (ask) |
| `echo $DOTENV_PRIVATE_KEY_PRODUCTION` | `git status` · `git diff` · `ls -la` |

La prueba falla si cualquier fila de la columna izquierda devuelve contenido del archivo, o si cualquier fila de la derecha queda denegada (señal de regla demasiado amplia: se corrige la regla y se repite la matriz).

## Alternativas consideradas

1. **Reglas por archivo y por comando con `deny` para lo sin cifrar y `ask` para lo cifrado (elegida)**
   - Pros: cubre `.env.keys` por cualquier lector; no toca el flujo de DevOps; se verifica con una matriz reproducible; cambio pequeño en un archivo ya protegido.
   - Contras: lista larga de patrones; evadible por construcción (punto 3); hay que mantenerla cuando aparezca un archivo nuevo (`.env.ci`, por ejemplo).
2. **Solo `.env.keys` (`Read`, `Edit`, `Write` y `Bash(*.env.keys*)`)**
   - Pros: tres reglas, cero falsos positivos.
   - Contras: deja `.env.local` y `.env.test` legibles por Bash, que contienen `DATABASE_URL` y `SESSION_SECRET` en claro (valores de desarrollo y de test, pero válidos en la máquina de Cesar); no cumple el objetivo del issue ni la condición de ADR-0007.
3. **Patrón genérico `Bash(*.env*)`**
   - Pros: una regla.
   - Contras: bloquea `grep process.env`, `cat .env.example`, `dotenvx set ... -f .env.production`; exactamente el riesgo que el issue pide evitar. Y sigue siendo evadible.
4. **Separación a nivel de sistema operativo (usuario distinto, `chmod 600`, sandbox sin esos archivos)**
   - Pros: es una barrera real, no un patrón sobre texto.
   - Contras: requiere cambiar cómo Cesar lanza los agentes y cómo se monta el repo; no es un cambio de `settings.json`. Se propone como complemento (issue para DevOps), no como sustituto: aun con sandbox, el `deny` sigue siendo útil como tripwire y documentación de intención.
5. **No hacer nada: confiar en `.gitignore`, lefthook y gitleaks (VIT-106)**
   - Pros: ya existe.
   - Contras: esas capas impiden **commitear** el secreto, no **leerlo**; un secreto leído sale por un comentario de PR, un issue, un log del agente o una exfiltración por prompt injection sin pasar por git.

## Consecuencias

- Positivas: la clave privada de dotenvx y los `.env` en claro dejan de estar "a una llamada de Bash" de cualquier agente; la capa 1 de ADR-0007 queda implementada; la matriz de prueba convierte las reglas en algo verificable y repetible.
- Negativas / deuda:
  - Lista de ~30 patrones que hay que mantener a mano; cada archivo `.env.<nuevo>` sin cifrar exige un ADR que reemplace a este.
  - Falsos positivos posibles en comandos legítimos que nombren `.env.local` como argumento separado (p. ej. `ls -la .env.local`): el agente lo verá denegado y deberá usar `ls -la` sin argumento. Es aceptable.
  - Sensación de seguridad superior a la real si alguien lee solo las reglas y no el punto 3. Mitigación: ADR-0007 ya lo declara "fricción, no barrera" y este ADR lo repite.
  - Las reglas `ask` sobre `printenv`/`env` agregan confirmaciones a DevOps en diagnósticos.
- Reversibilidad: **alta**. Son líneas en un JSON; quitarlas es otro ADR.
- Seguridad: reduce la probabilidad de S6 (filtración por lectura de agente) sin cambiar el impacto; no cubre evasión deliberada (riesgo residual que acepta Cesar al aprobar, con el complemento de la alternativa 4 como siguiente paso). Requiere revisión de Security antes de Aceptado y su verificación (punto 5) después de aplicarlo.
- OPEX: USD 0.

## Pendiente para Aceptado

- OK de Cesar (archivo protegido). Pregunta concreta: ¿aprueba las reglas del punto 1 y 2 tal cual, o prefiere la alternativa 2 (solo `.env.keys`) como primer paso?
- Revisión de Security (zona sensible: secretos): validar la lista contra el flujo `env-secrets` y ampliar la matriz del punto 5 si falta un lector.
- Issue para DevOps (seguimiento, no bloquea): separación a nivel de sistema operativo o sandbox sin `.env.keys` (alternativa 4).
- Quién aplica el cambio en `.claude/settings.json`: Cesar, o un agente con el ADR ya Aceptado y en un PR aparte que solo toque ese archivo.
