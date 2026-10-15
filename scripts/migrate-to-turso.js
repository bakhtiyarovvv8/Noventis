// Перенос данных из локальной базы data/noventis.db в Turso (адрес и токен — из .env).
// Запуск: node scripts/migrate-to-turso.js
// Переносит пользователей, сессии и результаты с теми же id. Если в Turso уже есть пользователи — останавливается.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .split(/\r?\n/).map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('В .env нет TURSO_DATABASE_URL или TURSO_AUTH_TOKEN');

const local = createClient({ url: 'file:' + path.join(__dirname, '..', 'data', 'noventis.db').replace(/\\/g, '/') });
const remote = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const TABLES = ['users', 'sessions', 'results'];

(async () => {
  // схема — та же, что создаёт server.js
  const schema = (await local.execute(
    "SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL")).rows
    .map(r => r.sql.replace(/^CREATE (TABLE|INDEX)/, 'CREATE $1 IF NOT EXISTS'));
  await remote.batch(schema, 'write');

  const existing = Number((await remote.execute('SELECT COUNT(*) AS c FROM users')).rows[0].c);
  if (existing > 0) { console.log(`В Turso уже ${existing} пользователей — перенос остановлен, чтобы ничего не задвоить.`); return; }

  const stmts = [];
  for (const t of TABLES) {
    const { rows, columns } = await local.execute(`SELECT * FROM ${t}`);
    for (const r of rows)
      stmts.push({ sql: `INSERT INTO ${t} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, args: columns.map(c => r[c]) });
  }
  await remote.batch(stmts, 'write'); // всё или ничего

  for (const t of TABLES) {
    const a = Number((await local.execute(`SELECT COUNT(*) AS c FROM ${t}`)).rows[0].c);
    const b = Number((await remote.execute(`SELECT COUNT(*) AS c FROM ${t}`)).rows[0].c);
    console.log(`${a === b ? '✅' : '❌'} ${t}: локально ${a}, в Turso ${b}`);
  }
})().catch(e => { console.error('Ошибка:', e.message); process.exit(1); });
