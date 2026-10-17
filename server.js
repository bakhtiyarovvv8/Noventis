// Noventis — сервер: http + база Turso (libSQL, тот же SQLite) + crypto.scrypt
const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@libsql/client');

// --- настройки из .env (локально) или из переменных окружения (на Render)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* .env нет — берём переменные окружения */ }

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const SESSION_DAYS = 30;
// Секрет, который знает только прокси на Cloudflare. Задан → сервер принимает /api только через Cloudflare.
const PROXY_KEY = process.env.PROXY_KEY || '';
const PROD = process.env.NODE_ENV === 'production';

// Без TURSO_DATABASE_URL работаем с локальным файлом — удобно для разработки.
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:' + path.join(__dirname, 'data', 'noventis.db').replace(/\\/g, '/'),
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const one = async (sql, ...args) => (await db.execute({ sql, args })).rows[0] || null;
const all = async (sql, ...args) => (await db.execute({ sql, args })).rows;
const run = (sql, ...args) => db.execute({ sql, args });

const ready = db.batch([
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    answers TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS results_user ON results(user_id)',
  // избранные вузы: place — код страны (UZ) или региона (us)
  `CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    place TEXT NOT NULL,
    web TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, name, place)
  )`,
  // дедлайны, за которыми следит пользователь (id из public/js/deadlines-data.js)
  `CREATE TABLE IF NOT EXISTS deadline_follows (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    did TEXT NOT NULL,
    PRIMARY KEY (user_id, did)
  )`,
  // галочки личного плана по неделям: checks — JSON-массив ключей «неделя:задача»
  `CREATE TABLE IF NOT EXISTS plan_progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    result_id INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
    checks TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (user_id, result_id)
  )`,
  // сохранённые расчёты калькуляторов: kind — chances | cost, data — JSON с вводом и итогом
  `CREATE TABLE IF NOT EXISTS calcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS calcs_user ON calcs(user_id)',
], 'write');

const hashPassword = (password, salt) => new Promise((resolve, reject) =>
  crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key.toString('hex'))));

// --- откуда пришёл запрос
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const viaCloudflare = req => !!PROXY_KEY && safeEqual(req.headers['x-noventis-proxy-key'] || '', PROXY_KEY);

// Реальный IP посетителя. Прокси на Cloudflare кладёт в x-noventis-client-ip значение CF-Connecting-IP.
// Доверяем ему, только если запрос подписан секретом PROXY_KEY, иначе любой мог бы подставить чужой IP.
function clientIp(req) {
  if (viaCloudflare(req)) {
    const ip = String(req.headers['x-noventis-client-ip'] || '').trim();
    if (net.isIP(ip)) return ip;
  }
  return req.socket.remoteAddress || 'unknown';
}

// --- лимиты запросов: окно 15 минут
const WINDOW = 15 * 60 * 1000;
// вход/регистрация: 10 попыток на связку IP + email. За одним IP в Узбекистане часто сидят
// сотни людей (мобильные операторы, школы), поэтому один IP целиком не блокируем.
const authHits = new Map();
const authKey = (ip, email) => ip + '|' + str(email).trim().toLowerCase();
const apiHits = new Map();   // все запросы к API: 300
function overLimit(map, ip, max) {
  const now = Date.now();
  const rec = map.get(ip);
  if (!rec || now - rec.t > WINDOW) { map.set(ip, { n: 1, t: now }); return false; }
  return ++rec.n > max;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

async function currentUser(req) {
  const token = parseCookies(req).kj_session;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return one(`
    SELECT u.id, u.name, u.email, u.created_at FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?`, token, Date.now());
}

const cookie = (value, maxAge) =>
  `kj_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${PROD ? '; Secure' : ''}`;

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    token, userId, Date.now() + SESSION_DAYS * 864e5);
  res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86400));
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

class HttpError extends Error { constructor(status, code) { super(code); this.status = status; } }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 200_000) { reject(new HttpError(413, 'too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw 0;
        resolve(body);
      } catch { reject(new HttpError(400, 'bad_json')); }
    });
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = v => (typeof v === 'string' ? v : '');
const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

let rateCache = { t: 0, data: { rate: null, date: null } };
async function usdRate() {
  if (Date.now() - rateCache.t < 6 * 36e5) return rateCache.data;
  try {
    const r = await fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD/', { signal: AbortSignal.timeout(5000) });
    const [usd] = await r.json();
    const rate = Number(usd.Rate);
    if (!(rate > 0)) throw new Error('bad rate');
    rateCache = { t: Date.now(), data: { rate, date: String(usd.Date) } };
  } catch (e) {
    // ЦБ недоступен — отдаём последний известный курс, повторим через 10 минут
    rateCache.t = Date.now() - 6 * 36e5 + 6e5;
    console.error('Курс ЦБ:', e.message);
  }
  return rateCache.data;
}

async function api(req, res, url) {
  // Если сервер стоит за Cloudflare, напрямую на Render к API не пускаем.
  if (PROXY_KEY && !viaCloudflare(req)) return json(res, 403, { error: 'forbidden' });

  const route = `${req.method} ${url.pathname}`;
  const ip = clientIp(req);
  if (overLimit(apiHits, ip, 300)) return json(res, 429, { error: 'too_many' });

  if (route === 'GET /api/health') return json(res, 200, { ok: true });

  // курс доллара ЦБ Узбекистана для калькулятора стоимости, кэш 6 часов
  if (route === 'GET /api/rate') return json(res, 200, await usdRate());

  if (route === 'POST /api/register') {
    const body = await readBody(req);
    if (overLimit(authHits, authKey(ip, body.email), 10)) return json(res, 429, { error: 'too_many' });
    const name = str(body.name).trim(), email = str(body.email).trim().toLowerCase(), password = str(body.password);
    if (name.length < 2) return json(res, 400, { error: 'name_short' });
    if (email.length > 254 || !EMAIL_RE.test(email)) return json(res, 400, { error: 'email_invalid' });
    if (password.length < 8) return json(res, 400, { error: 'password_short' });
    if (password.length > 200) return json(res, 400, { error: 'bad_json' });
    if (await one('SELECT 1 FROM users WHERE email = ?', email)) return json(res, 409, { error: 'email_taken' });
    const salt = crypto.randomBytes(16).toString('hex');
    const r = await run('INSERT INTO users (name, email, pass_hash, salt) VALUES (?, ?, ?, ?)',
      name.slice(0, 60), email, await hashPassword(password, salt), salt);
    await createSession(res, Number(r.lastInsertRowid));
    return json(res, 201, { ok: true });
  }

  if (route === 'POST /api/login') {
    const body = await readBody(req);
    if (overLimit(authHits, authKey(ip, body.email), 10)) return json(res, 429, { error: 'too_many' });
    const email = str(body.email).trim(), password = str(body.password);
    if (!email || !password || password.length > 200) return json(res, 401, { error: 'bad_credentials' });
    const u = await one('SELECT id, pass_hash, salt FROM users WHERE email = ?', email);
    const ok = u && safeEqual(await hashPassword(password, u.salt), u.pass_hash);
    if (!ok) return json(res, 401, { error: 'bad_credentials' });
    authHits.delete(authKey(ip, email));
    await createSession(res, Number(u.id));
    return json(res, 200, { ok: true });
  }

  if (route === 'POST /api/logout') {
    const token = parseCookies(req).kj_session;
    if (token) await run('DELETE FROM sessions WHERE token = ?', token);
    res.setHeader('Set-Cookie', cookie('', 0));
    return json(res, 200, { ok: true });
  }

  const user = await currentUser(req);

  if (route === 'GET /api/me') return json(res, 200, { user });

  if (!user) return json(res, 401, { error: 'unauthorized' });

  // Все запросы ниже ищут только по user_id вошедшего — чужие результаты не видны и не удаляются.
  if (route === 'GET /api/results') {
    const rows = await all(
      'SELECT id, category, summary, created_at FROM results WHERE user_id = ? ORDER BY id DESC', user.id);
    return json(res, 200, { results: rows.map(r => ({ ...r, summary: JSON.parse(r.summary) })) });
  }

  if (route === 'POST /api/results') {
    const { category, answers = {}, summary = {} } = await readBody(req);
    if (!['university', 'work', 'prep'].includes(category)) return json(res, 400, { error: 'bad_category' });
    if (!isPlainObject(answers) || !isPlainObject(summary)) return json(res, 400, { error: 'bad_json' });
    const n = await one('SELECT COUNT(*) AS c FROM results WHERE user_id = ?', user.id);
    if (Number(n.c) >= 200) return json(res, 400, { error: 'too_many' });
    const r = await run('INSERT INTO results (user_id, category, answers, summary) VALUES (?, ?, ?, ?)',
      user.id, category, JSON.stringify(answers), JSON.stringify(summary));
    return json(res, 201, { id: Number(r.lastInsertRowid) });
  }

  if (route === 'GET /api/favorites') {
    const rows = await all('SELECT name, place, web, created_at FROM favorites WHERE user_id = ? ORDER BY id DESC', user.id);
    return json(res, 200, { favorites: rows });
  }

  if (route === 'POST /api/favorites' || route === 'DELETE /api/favorites') {
    const body = await readBody(req);
    const name = str(body.name).trim().slice(0, 200), place = str(body.place).trim().slice(0, 20);
    if (!name || !place) return json(res, 400, { error: 'bad_json' });
    if (req.method === 'DELETE') {
      await run('DELETE FROM favorites WHERE user_id = ? AND name = ? AND place = ?', user.id, name, place);
      return json(res, 200, { ok: true });
    }
    // ссылку храним, только если это http(s)
    const web = /^https?:\/\/[^\s"'<>]{1,300}$/i.test(str(body.web)) ? str(body.web) : '';
    const n = await one('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?', user.id);
    if (Number(n.c) >= 300) return json(res, 400, { error: 'fav_limit' });
    await run('INSERT OR IGNORE INTO favorites (user_id, name, place, web) VALUES (?, ?, ?, ?)', user.id, name, place, web);
    return json(res, 201, { ok: true });
  }

  if (route === 'GET /api/calcs') {
    const rows = await all('SELECT id, kind, data, created_at FROM calcs WHERE user_id = ? ORDER BY id DESC', user.id);
    return json(res, 200, { calcs: rows.map(r => ({ ...r, data: JSON.parse(r.data) })) });
  }

  if (route === 'POST /api/calcs') {
    const { kind, data } = await readBody(req);
    if (!['chances', 'cost'].includes(kind) || !isPlainObject(data)) return json(res, 400, { error: 'bad_json' });
    const text = JSON.stringify(data);
    if (text.length > 20_000) return json(res, 413, { error: 'too_large' });
    const n = await one('SELECT COUNT(*) AS c FROM calcs WHERE user_id = ?', user.id);
    if (Number(n.c) >= 100) return json(res, 400, { error: 'too_many' });
    const r = await run('INSERT INTO calcs (user_id, kind, data) VALUES (?, ?, ?)', user.id, kind, text);
    return json(res, 201, { id: Number(r.lastInsertRowid) });
  }

  const cc = url.pathname.match(/^\/api\/calcs\/(\d{1,12})$/);
  if (cc && req.method === 'DELETE') {
    await run('DELETE FROM calcs WHERE id = ? AND user_id = ?', Number(cc[1]), user.id);
    return json(res, 200, { ok: true });
  }

  if (route === 'GET /api/deadlines') {
    const rows = await all('SELECT did FROM deadline_follows WHERE user_id = ?', user.id);
    return json(res, 200, { follows: rows.map(r => r.did) });
  }

  if (route === 'POST /api/deadlines' || route === 'DELETE /api/deadlines') {
    const did = str((await readBody(req)).id);
    if (!/^[a-z0-9_]{1,30}$/.test(did)) return json(res, 400, { error: 'bad_json' });
    if (req.method === 'DELETE') await run('DELETE FROM deadline_follows WHERE user_id = ? AND did = ?', user.id, did);
    else {
      const n = await one('SELECT COUNT(*) AS c FROM deadline_follows WHERE user_id = ?', user.id);
      if (Number(n.c) >= 100) return json(res, 400, { error: 'too_many' });
      await run('INSERT OR IGNORE INTO deadline_follows (user_id, did) VALUES (?, ?)', user.id, did);
    }
    return json(res, 200, { ok: true });
  }

  const pm = url.pathname.match(/^\/api\/plan\/(\d{1,12})$/);
  if (pm && (req.method === 'GET' || req.method === 'PUT')) {
    const rid = Number(pm[1]);
    if (!await one("SELECT 1 FROM results WHERE id = ? AND user_id = ? AND category = 'prep'", rid, user.id)) return json(res, 404, { error: 'not_found' });
    if (req.method === 'GET') {
      const row = await one('SELECT checks FROM plan_progress WHERE user_id = ? AND result_id = ?', user.id, rid);
      return json(res, 200, { checks: row ? JSON.parse(row.checks) : [] });
    }
    const { checks } = await readBody(req);
    if (!Array.isArray(checks) || checks.length > 3000 || !checks.every(k => typeof k === 'string' && /^\d{1,3}:\d{1,2}$/.test(k))) return json(res, 400, { error: 'bad_json' });
    await run(`INSERT INTO plan_progress (user_id, result_id, checks) VALUES (?, ?, ?)
      ON CONFLICT (user_id, result_id) DO UPDATE SET checks = excluded.checks`, user.id, rid, JSON.stringify([...new Set(checks)]));
    return json(res, 200, { ok: true });
  }

  const m = url.pathname.match(/^\/api\/results\/(\d{1,12})$/);
  if (m && req.method === 'GET') {
    const r = await one('SELECT * FROM results WHERE id = ? AND user_id = ?', Number(m[1]), user.id);
    if (!r) return json(res, 404, { error: 'not_found' });
    return json(res, 200, { ...r, answers: JSON.parse(r.answers), summary: JSON.parse(r.summary) });
  }
  if (m && req.method === 'DELETE') {
    await run('DELETE FROM results WHERE id = ? AND user_id = ?', Number(m[1]), user.id);
    await run('DELETE FROM plan_progress WHERE result_id = ? AND user_id = ?', Number(m[1]), user.id);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'not_found' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};

// Страницы отдаёт Cloudflare Pages; здесь — для запуска на своём компьютере.
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(path.join(PUBLIC, 'index.html')).pipe(res);
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.jpg' || ext === '.webp' ? 'public, max-age=604800' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

ready.then(() => {
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return json(res, e.status, { error: e.message });
      console.error(e);
      json(res, 500, { error: 'server_error' });
    }
  }).listen(PORT, () => console.log(`\n  Noventis запущен →  http://localhost:${PORT}\n`));
}).catch(e => { console.error('Не удалось подключиться к базе:', e.message); process.exit(1); });

// раз в час: чистим просроченные сессии и старые записи лимитов
setInterval(() => {
  run('DELETE FROM sessions WHERE expires_at < ?', Date.now()).catch(e => console.error(e));
  const now = Date.now();
  for (const map of [authHits, apiHits]) for (const [key, rec] of map) if (now - rec.t > WINDOW) map.delete(key);
}, 36e5).unref();
