// Fixtures for .semgrep/vitrinia.yml. `ruleid:` lines must match, `ok:` lines must not.
declare const sql: { raw(s: string): unknown };
declare const db: { execute(s: unknown): unknown };
declare const userInput: string;
declare const h: { get(n: string): string | null };

// ruleid: vitrinia-set-store-id-without-local
db.execute("SET app.store_id = '123'");
// ruleid: vitrinia-set-store-id-without-local
db.execute("set session app.store_id = '123'");
// ok: vitrinia-set-store-id-without-local
db.execute("SET LOCAL app.store_id = '123'");

// ruleid: vitrinia-set-store-id-without-local
db.execute('SET "app.store_id" = \'123\'');
// ruleid: vitrinia-set-store-id-without-local
db.execute('set session "app.store_id" = \'123\'');
// ok: vitrinia-set-store-id-without-local
db.execute('SET LOCAL "app.store_id" = \'123\'');

// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, false)");
// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, FALSE)");
// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, 'f')");
// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, 'false')");
// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, $2)");
// ruleid: vitrinia-set-config-session-scope
db.execute(`select set_config('app.store_id', ${userInput}, ${userInput})`);
// ruleid: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', coalesce($1, ''), isLocal)");
// ruleid: vitrinia-set-config-session-scope
db.execute(`select set_config(
  'app.store_id',
  $1,
  false
)`);
// ok: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, true)");
// ok: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', $1, TRUE)");
// ok: vitrinia-set-config-session-scope
db.execute("select set_config('app.store_id', coalesce($1, ''), true )");
// ok: vitrinia-set-config-session-scope
db.execute("select set_config('app.other', $1, false)");

// ruleid: vitrinia-sql-raw-interpolation
sql.raw(userInput);
// ruleid: vitrinia-sql-raw-interpolation
sql.raw("select " + userInput);
// ruleid: vitrinia-sql-raw-template-interpolation
sql.raw(`select ${userInput}`);
// ok: vitrinia-sql-raw-interpolation
sql.raw("select 1");

// ruleid: vitrinia-eval-or-new-function
eval(userInput);
// ruleid: vitrinia-eval-or-new-function
new Function("return " + userInput);
// ok: vitrinia-eval-or-new-function
JSON.parse(userInput);

// ruleid: vitrinia-middleware-header-in-authorization
const a = h.get("x-vitrinia-store-id");
// ruleid: vitrinia-middleware-header-in-authorization
const b = h.get("X-Store-Id");
// ruleid: vitrinia-middleware-header-in-authorization
const c = h.get("x-forwarded-host");
// ok: vitrinia-middleware-header-in-authorization
const d = h.get("content-type");
