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
const bot = require('./bot');   // после .env — бот читает токен из переменных окружения
const PROXY_KEY = process.env.PROXY_KEY || '';
const TG_SECRET = process.env.TG_WEBHOOK_SECRET || '';   // заголовок, которым Telegram подписывает вебхук
const CRON_KEY = process.env.CRON_KEY || '';             // ключ для ежедневной рассылки напоминаний
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
  // доступ родителей и учителей: ученик сам выдаёт код и может отозвать доступ
  `CREATE TABLE IF NOT EXISTS share_codes (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS watchers (
    viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (viewer_id, student_id)
  )`,
  `CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS class_members (
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, user_id)
  )`,
  // Telegram: привязанный чат и одноразовые коды для ссылки t.me/бот?start=код
  `CREATE TABLE IF NOT EXISTS tg_links (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL UNIQUE,
    lang TEXT NOT NULL DEFAULT 'ru'
  )`,
  `CREATE TABLE IF NOT EXISTS tg_codes (
    code TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lang TEXT NOT NULL DEFAULT 'ru',
    expires INTEGER NOT NULL
  )`,
], 'write');

// Коды доступа: 8 символов без похожих (0/O, 1/I/L)
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.randomBytes(8), b => CODE_ABC[b % CODE_ABC.length]).join('');
const normCode = v => str(v).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

// Может ли viewer смотреть результаты student: родитель по коду или учитель его класса
async function canView(viewerId, studentId) {
  if (viewerId === studentId) return true;
  return !!(await one(`SELECT 1 FROM watchers WHERE viewer_id = ? AND student_id = ?
    UNION SELECT 1 FROM class_members m JOIN classes c ON c.id = m.class_id WHERE c.owner_id = ? AND m.user_id = ?`,
    viewerId, studentId, viewerId, studentId));
}

// Последние 20 результатов каждого ученика — одним запросом, а не по запросу на ученика
async function resultsOfMany(ids) {
  const out = new Map(ids.map(id => [Number(id), []]));
  if (!ids.length) return out;
  const rows = await all(`SELECT id, user_id, category, summary, created_at FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn FROM results
      WHERE user_id IN (${ids.map(() => '?').join(',')})) WHERE rn <= 20 ORDER BY id DESC`, ...ids.map(Number));
  for (const r of rows) out.get(Number(r.user_id)).push({ id: r.id, category: r.category, summary: JSON.parse(r.summary), created_at: r.created_at });
  return out;
}
const resultsOf = async id => (await resultsOfMany([id])).get(Number(id));

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

  // Telegram и планировщик приходят со своих серверов — проверяем секрет, а не лимит по IP
  if (route === 'POST /api/tg/webhook') {
    if (!bot.enabled() || !TG_SECRET || !safeEqual(req.headers['x-telegram-bot-api-secret-token'] || '', TG_SECRET)) return json(res, 403, { error: 'forbidden' });
    await bot.handleUpdate(await readBody(req), { one, all, run });
    return json(res, 200, { ok: true });
  }
  if (route === 'POST /api/cron/daily') {
    if (!CRON_KEY || !safeEqual(req.headers['x-cron-key'] || '', CRON_KEY)) return json(res, 403, { error: 'forbidden' });
    await run('DELETE FROM tg_codes WHERE expires < ?', Date.now());
    return json(res, 200, await bot.daily({ one, all, run }));
  }

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
    if (!['university', 'work', 'prep', 'english'].includes(category)) return json(res, 400, { error: 'bad_category' });
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

  // ---------- Telegram ----------
  if (route === 'GET /api/tg') {
    const link = await one('SELECT 1 FROM tg_links WHERE user_id = ?', user.id);
    return json(res, 200, { enabled: bot.enabled() && !!bot.botName(), linked: !!link });
  }
  if (route === 'POST /api/tg/link') {
    if (!bot.enabled() || !bot.botName()) return json(res, 400, { error: 'tg_off' });
    const lang = str((await readBody(req)).lang) === 'en' ? 'en' : 'ru';
    const code = crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x');
    await run('DELETE FROM tg_codes WHERE user_id = ?', user.id);
    await run('INSERT INTO tg_codes (code, user_id, lang, expires) VALUES (?, ?, ?, ?)', code, user.id, lang, Date.now() + 15 * 60e3);
    return json(res, 200, { url: `https://t.me/${bot.botName()}?start=${code}` });
  }
  if (route === 'DELETE /api/tg') {
    await run('DELETE FROM tg_links WHERE user_id = ?', user.id);
    return json(res, 200, { ok: true });
  }

  // ---------- родители и учителя ----------
  if (route === 'GET /api/family') {
    const code = await one('SELECT code FROM share_codes WHERE user_id = ?', user.id);
    const watchers = await all('SELECT u.id, u.name FROM watchers w JOIN users u ON u.id = w.viewer_id WHERE w.student_id = ?', user.id);
    const kids = await all('SELECT u.id, u.name FROM watchers w JOIN users u ON u.id = w.student_id WHERE w.viewer_id = ?', user.id);
    const joined = await all('SELECT c.id, c.name, u.name AS owner FROM class_members m JOIN classes c ON c.id = m.class_id JOIN users u ON u.id = c.owner_id WHERE m.user_id = ?', user.id);
    const own = await all('SELECT id, name, code FROM classes WHERE owner_id = ? ORDER BY id', user.id);
    const members = own.length ? await all(`SELECT m.class_id, u.id, u.name FROM class_members m JOIN users u ON u.id = m.user_id
      WHERE m.class_id IN (${own.map(() => '?').join(',')}) ORDER BY u.name`, ...own.map(c => c.id)) : [];
    const byUser = await resultsOfMany([...new Set([...kids, ...members].map(x => Number(x.id)))]);
    for (const k of kids) k.results = byUser.get(Number(k.id));
    for (const c of own) c.members = members.filter(m => Number(m.class_id) === Number(c.id))
      .map(m => ({ id: m.id, name: m.name, results: byUser.get(Number(m.id)) }));
    return json(res, 200, { code: code ? code.code : null, watchers, kids, joined, classes: own });
  }

  if (route === 'POST /api/family/code') {
    // новый код — старый перестаёт работать; уже подключённые родители остаются
    for (let i = 0; i < 5; i++) {
      try {
        const code = newCode();
        await run(`INSERT INTO share_codes (user_id, code) VALUES (?, ?)
          ON CONFLICT (user_id) DO UPDATE SET code = excluded.code`, user.id, code);
        return json(res, 200, { code });
      } catch { /* совпал с чужим кодом — пробуем ещё */ }
    }
    return json(res, 500, { error: 'server_error' });
  }

  if (route === 'POST /api/family/watch') {
    const code = normCode((await readBody(req)).code);
    const s = code.length === 8 && await one('SELECT user_id FROM share_codes WHERE code = ?', code);
    if (!s) return json(res, 404, { error: 'bad_code' });
    if (Number(s.user_id) === Number(user.id)) return json(res, 400, { error: 'own_code' });
    const n = await one('SELECT COUNT(*) AS c FROM watchers WHERE viewer_id = ?', user.id);
    if (Number(n.c) >= 30) return json(res, 400, { error: 'too_many' });
    await run('INSERT OR IGNORE INTO watchers (viewer_id, student_id) VALUES (?, ?)', user.id, Number(s.user_id));
    return json(res, 200, { ok: true });
  }

  if (route === 'DELETE /api/family/watch') {
    // родитель убирает ребёнка (student) или ученик отзывает доступ родителя (viewer)
    const { student, viewer } = await readBody(req);
    if (Number.isInteger(student)) await run('DELETE FROM watchers WHERE viewer_id = ? AND student_id = ?', user.id, student);
    if (Number.isInteger(viewer)) await run('DELETE FROM watchers WHERE viewer_id = ? AND student_id = ?', viewer, user.id);
    return json(res, 200, { ok: true });
  }

  if (route === 'POST /api/classes') {
    const name = str((await readBody(req)).name).trim().slice(0, 60);
    if (name.length < 2) return json(res, 400, { error: 'name_short' });
    const n = await one('SELECT COUNT(*) AS c FROM classes WHERE owner_id = ?', user.id);
    if (Number(n.c) >= 20) return json(res, 400, { error: 'too_many' });
    for (let i = 0; i < 5; i++) {
      try {
        const code = newCode();
        const r = await run('INSERT INTO classes (owner_id, name, code) VALUES (?, ?, ?)', user.id, name, code);
        return json(res, 201, { id: Number(r.lastInsertRowid), code });
      } catch { /* код занят — ещё раз */ }
    }
    return json(res, 500, { error: 'server_error' });
  }

  if (route === 'POST /api/classes/join') {
    const code = normCode((await readBody(req)).code);
    const c = code.length === 8 && await one('SELECT id, owner_id FROM classes WHERE code = ?', code);
    if (!c) return json(res, 404, { error: 'bad_code' });
    if (Number(c.owner_id) === Number(user.id)) return json(res, 400, { error: 'own_code' });
    const n = await one('SELECT COUNT(*) AS c FROM class_members WHERE class_id = ?', c.id);
    if (Number(n.c) >= 200) return json(res, 400, { error: 'too_many' });
    await run('INSERT OR IGNORE INTO class_members (class_id, user_id) VALUES (?, ?)', c.id, user.id);
    return json(res, 200, { ok: true });
  }

  const cm = url.pathname.match(/^\/api\/classes\/(\d{1,12})$/);
  if (cm && req.method === 'DELETE') {
    // владелец удаляет класс, ученик — выходит из него
    const id = Number(cm[1]);
    if (await one('SELECT 1 FROM classes WHERE id = ? AND owner_id = ?', id, user.id)) {
      await run('DELETE FROM class_members WHERE class_id = ?', id);
      await run('DELETE FROM classes WHERE id = ?', id);
    } else await run('DELETE FROM class_members WHERE class_id = ? AND user_id = ?', id, user.id);
    return json(res, 200, { ok: true });
  }

  const vm = url.pathname.match(/^\/api\/view\/(\d{1,12})\/results(?:\/(\d{1,12}))?$/);
  if (vm && req.method === 'GET') {
    const sid = Number(vm[1]);
    if (!await canView(Number(user.id), sid)) return json(res, 404, { error: 'not_found' });
    const student = await one('SELECT id, name FROM users WHERE id = ?', sid);
    if (!vm[2]) return json(res, 200, { student, results: await resultsOf(sid) });
    const r = await one('SELECT * FROM results WHERE id = ? AND user_id = ?', Number(vm[2]), sid);
    if (!r) return json(res, 404, { error: 'not_found' });
    return json(res, 200, { ...r, student, answers: JSON.parse(r.answers), summary: JSON.parse(r.summary) });
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
