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
const PROXY_KEY = (process.env.PROXY_KEY || '').trim();
const PROD = process.env.NODE_ENV === 'production';

// Без TURSO_DATABASE_URL работаем с локальным файлом — удобно для разработки.
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = createClient({
  url: (process.env.TURSO_DATABASE_URL || '').trim() || 'file:' + path.join(__dirname, 'data', 'noventis.db').replace(/\\/g, '/'),
  authToken: (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined,
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
  // личный план по неделям: один на пользователя, data — JSON (вуз, направление, дедлайн, недели с задачами)
  `CREATE TABLE IF NOT EXISTS plans (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // календарь: только то, что пользователь добавил сам (из плана или вручную)
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'task',
    url TEXT NOT NULL DEFAULT '',
    UNIQUE (user_id, title, date)
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
  // заявки на курсы учебных центров (лиды). user_id пустой, если человек не входил.
  // test_summary / countries / unis — JSON-текст. status: new | sent | done | rejected
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    course_id TEXT NOT NULL,
    center_id TEXT NOT NULL,
    course_title TEXT NOT NULL DEFAULT '',
    center_name TEXT NOT NULL DEFAULT '',
    field TEXT NOT NULL DEFAULT '',
    test_summary TEXT NOT NULL DEFAULT '',
    countries TEXT NOT NULL DEFAULT '',
    unis TEXT NOT NULL DEFAULT '',
    lang TEXT NOT NULL DEFAULT 'ru',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'new',
    ip TEXT NOT NULL DEFAULT ''
  )`,
  'CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at)',
  'CREATE INDEX IF NOT EXISTS leads_phone ON leads(phone)',
  'CREATE INDEX IF NOT EXISTS leads_user ON leads(user_id)',
], 'write').then(async () => {
  // миграция для баз, где leads уже есть: поле is_demo (1 — курс-пример)
  const cols = await db.execute('PRAGMA table_info(leads)');
  if (!cols.rows.some(c => c.name === 'is_demo')) await db.execute('ALTER TABLE leads ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0');
  await db.execute('CREATE INDEX IF NOT EXISTS leads_ip_created ON leads(ip, created_at)');
});

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

// --- заявки на курсы
const LEAD_STATUSES = ['new', 'sent', 'done', 'rejected'];
const LEAD_MSG = {
  ru: { too_many_leads: 'Слишком много заявок с вашего адреса. Попробуйте позже.', duplicate_lead: 'Вы уже оставили заявку на этот курс. Пока это пример центра — заявка сохранена у нас.' },
  en: { too_many_leads: 'Too many requests from your address. Please try again later.', duplicate_lead: 'You have already applied for this course. This is a sample center for now — your request is saved with us.' },
  uz: { too_many_leads: 'Manzilingizdan juda koʻp ariza yuborildi. Keyinroq urinib koʻring.', duplicate_lead: 'Siz bu kursga allaqachon ariza qoldirgansiz. Hozircha bu markaz namuna — ariza bizda saqlangan.' },
};

// Каталог курсов/центров и направления берём из public/js (как scripts/check-start-data.js); грузим один раз при первой заявке
let catalogCache = null;
function catalog() {
  if (catalogCache) return catalogCache;
  const vm = require('node:vm');
  const js = path.join(PUBLIC, 'js');
  const read = f => fs.readFileSync(path.join(js, f), 'utf8');
  const ctx = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(read('data.js') + '\n' + read('abroad.js').replace(/^const GRANT_INFO/m, 'var GRANT_INFO') + '\n' + read('unis-data.js') +
    ';this.UNIS=UNIS;this.FIELDS=FIELDS;this.AREAS=AREAS;this.COUNTRIES=COUNTRIES;this.uniFits=uniFits;this.findUni=findUni;', ctx, { filename: 'base' });
  vm.runInContext(read('start-data.js'), ctx, { filename: 'start-data.js' });
  const S = ctx.window.START;
  catalogCache = {
    courses: new Map(S.COURSES.map(c => [c.id, { id: c.id, centerId: c.centerId, title: str(c.title && c.title.ru), demo: !!c.demo }])),
    centers: new Map(S.CENTERS.map(c => [c.id, { id: c.id, name: str(c.name && c.name.ru) }])),
    fields: new Set(Object.keys(ctx.FIELDS)),
  };
  return catalogCache;
}
// убираем невидимые и управляющие символы, затем trim
const cleanText = v => str(v).replace(/[\p{Cc}\p{Cf}​-‏⁠﻿]/gu, '').trim();
// +998 и 9 цифр; пробелы, дефисы, скобки допускаются; возвращает +998XXXXXXXXX или ''
function normPhone(v) {
  const s = str(v).trim();
  if (s.length > 25 || /[^\d\s\-()+]/.test(s) || s.indexOf('+', 1) > 0) return '';
  const d = s.replace(/\D/g, '');
  return /^998\d{9}$/.test(d) ? '+' + d : '';
}
// JSON-поле (объект или массив) → текст до 4 КБ; null — слишком большое или неверное
function jsonField(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'object') return null;
  const t = JSON.stringify(v);
  return t.length <= 4096 ? t : null;
}
const parseJson = t => { try { return t ? JSON.parse(t) : null; } catch { return null; } };
const leadOut = r => ({ ...r, test_summary: parseJson(r.test_summary), countries: parseJson(r.countries), unis: parseJson(r.unis) });

// доступ админа: заголовок x-admin-token или Authorization: Bearer; без ADMIN_TOKEN (≥16 символов) в .env — всегда 403
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
function isAdmin(req) {
  if (ADMIN_TOKEN.length < 16) return false;
  const bearer = str(req.headers.authorization).replace(/^Bearer\s+/i, '');
  const t = str(req.headers['x-admin-token']) || bearer;
  return !!t && safeEqual(t, ADMIN_TOKEN);
}
const csvCell = v => {
  let s = String(v ?? '');
  if ((/^[=+\-@\t\r]/.test(s) || /^[=+\-@]/.test(s.replace(/^[\s ]+/, ''))) && !/^\+998\d{9}$/.test(s)) s = "'" + s;   // защита от формул в Excel
  return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const LEAD_COLS = ['id', 'created_at', 'status', 'name', 'phone', 'city', 'course_id', 'course_title', 'center_id', 'center_name',
  'field', 'is_demo', 'test_summary', 'countries', 'unis', 'lang', 'user_id'];

let rateCache ={ t: 0, data: { rate: null, date: null } };
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

  // ---------- админ: заявки (по ADMIN_TOKEN, не по входу пользователя) ----------
  if (url.pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) {
      overLimit(authHits, ip + '|admin', 10);   // считаем попытки; после 10 неудач — 429
      return json(res, authHits.get(ip + '|admin').n > 10 ? 429 : 403, { error: authHits.get(ip + '|admin').n > 10 ? 'too_many' : 'forbidden' });
    }
    const status = url.searchParams.get('status') || '';
    if (status && !LEAD_STATUSES.includes(status)) return json(res, 400, { error: 'bad_status' });
    const where = status ? 'WHERE status = ?' : '';
    const args = status ? [status] : [];

    if (route === 'GET /api/admin/leads') {
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 50));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset'), 10) || 0);
      const total = await one(`SELECT COUNT(*) AS c FROM leads ${where}`, ...args);
      const rows = await all(`SELECT * FROM leads ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
      return json(res, 200, { total: Number(total.c), limit, offset, leads: rows.map(leadOut) });
    }
    if (route === 'GET /api/admin/leads.csv') {
      const rows = await all(`SELECT ${LEAD_COLS.join(', ')} FROM leads ${where} ORDER BY id DESC LIMIT 5000`, ...args);
      const csv = '﻿' + [LEAD_COLS.join(','), ...rows.map(r => LEAD_COLS.map(c => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="noventis-leads.csv"',
      });
      return res.end(csv);
    }
    const lm = url.pathname.match(/^\/api\/admin\/leads\/(\d{1,12})$/);
    if (lm && req.method === 'PATCH') {
      const body = await readBody(req);
      if (!LEAD_STATUSES.includes(body.status)) return json(res, 400, { error: 'bad_status' });
      const r = await run('UPDATE leads SET status = ? WHERE id = ?', body.status, Number(lm[1]));
      if (!r.rowsAffected) return json(res, 404, { error: 'not_found' });
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'not_found' });
  }

  const user = await currentUser(req);

  // Заявка на курс: можно без входа; если вошёл — привязываем user_id
  if (route === 'POST /api/leads') {
    const b = await readBody(req);
    const lang = ['ru', 'en', 'uz'].includes(b.lang) ? b.lang : 'ru';
    const name = cleanText(b.name), city = cleanText(b.city), phone = normPhone(b.phone);
    if (name.length < 2 || name.length > 60) return json(res, 400, { error: 'name_invalid' });
    if (!phone) return json(res, 400, { error: 'phone_invalid' });
    if (city.length < 2 || city.length > 60) return json(res, 400, { error: 'city_invalid' });
    const idOf = v => (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : '';
    const courseId = idOf(b.course_id), centerId = idOf(b.center_id);
    if (!courseId || courseId.length > 80) return json(res, 400, { error: 'course_required' });
    if (!centerId || centerId.length > 80) return json(res, 400, { error: 'center_required' });
    const summary = jsonField(b.test_summary), countries = jsonField(b.countries), unis = jsonField(b.unis);
    if (summary === null || countries === null || unis === null) return json(res, 400, { error: 'field_too_large' });
    const msg = LEAD_MSG[lang];
    // курс и центр сверяем с каталогом на сервере; названия берём оттуда, присланные клиентом игнорируем
    const cat = catalog();
    const course = cat.courses.get(courseId), center = cat.centers.get(centerId);
    if (!course || !center || course.centerId !== center.id) return json(res, 400, { error: 'course_invalid' });
    const fieldId = idOf(b.field);
    const field = cat.fields.has(fieldId) ? fieldId : null;
    // на пару IP + телефон — 5 в час; на IP целиком — мягкий потолок 60 в час (за одним IP сидят сотни людей)
    const n = await one(`SELECT COUNT(*) AS c, SUM(phone = ?) AS p FROM leads WHERE ip = ? AND created_at > datetime('now', '-1 hour')`, phone, ip);
    if (Number(n.p || 0) >= 5 || Number(n.c) >= 60) return json(res, 429, { error: 'too_many_leads', message: msg.too_many_leads });
    // одна и та же пара телефон+курс — раз в сутки (проверка и вставка одним запросом)
    const r = await run(`INSERT INTO leads (user_id, name, phone, city, course_id, center_id, course_title, center_name, field,
        test_summary, countries, unis, lang, ip, is_demo)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM leads WHERE phone = ? AND course_id = ? AND created_at > datetime('now', '-1 day'))`,
      user ? user.id : null, name, phone, city, course.id, center.id,
      course.title, center.name, field ?? '',
      summary, countries, unis, lang, ip, course.demo ? 1 : 0, phone, course.id);
    if (!r.rowsAffected) return json(res, 429, { error: 'duplicate_lead', message: msg.duplicate_lead });
    return json(res, 201, { ok: true, id: Number(r.lastInsertRowid) });
  }

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

  if (route === 'GET /api/leads/mine') {
    const rows = await all(`SELECT id, name, phone, city, course_id, center_id, course_title, center_name, field, lang, status, created_at
      FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 100`, user.id);
    return json(res, 200, { leads: rows });
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

  // ---------- план по неделям ----------
  if (route === 'GET /api/plan') {
    const row = await one('SELECT data, updated_at FROM plans WHERE user_id = ?', user.id);
    return json(res, 200, { plan: row ? JSON.parse(row.data) : null, updated_at: row ? row.updated_at : null });
  }
  if (route === 'PUT /api/plan') {
    const { plan } = await readBody(req);
    if (!isPlainObject(plan) || !Array.isArray(plan.weeks) || plan.weeks.length > 160) return json(res, 400, { error: 'bad_json' });
    const text = JSON.stringify(plan);
    if (text.length > 150_000) return json(res, 413, { error: 'too_large' });
    await run(`INSERT INTO plans (user_id, data) VALUES (?, ?)
      ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`, user.id, text);
    return json(res, 200, { ok: true });
  }
  if (route === 'DELETE /api/plan') {
    await run('DELETE FROM plans WHERE user_id = ?', user.id);
    return json(res, 200, { ok: true });
  }

  // ---------- календарь ----------
  if (route === 'GET /api/events') {
    const rows = await all('SELECT id, title, date, note, kind, url FROM events WHERE user_id = ? ORDER BY date, id', user.id);
    return json(res, 200, { events: rows });
  }
  if (route === 'POST /api/events') {
    const { items } = await readBody(req);
    if (!Array.isArray(items) || !items.length || items.length > 60) return json(res, 400, { error: 'bad_json' });
    const clean = [];
    for (const it of items) {
      if (!isPlainObject(it)) return json(res, 400, { error: 'bad_json' });
      const title = str(it.title).trim().slice(0, 200), date = str(it.date);
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return json(res, 400, { error: 'bad_json' });
      clean.push([title, date, str(it.note).slice(0, 500), ['deadline', 'exam', 'grant', 'task'].includes(it.kind) ? it.kind : 'task',
        /^https?:\/\/[^\s"'<>]{1,300}$/i.test(str(it.url)) ? str(it.url) : '']);
    }
    const n = await one('SELECT COUNT(*) AS c FROM events WHERE user_id = ?', user.id);
    if (Number(n.c) + clean.length > 300) return json(res, 400, { error: 'too_many' });
    for (const c of clean) await run('INSERT OR IGNORE INTO events (user_id, title, date, note, kind, url) VALUES (?, ?, ?, ?, ?, ?)', user.id, ...c);
    return json(res, 201, { ok: true });
  }
  const em = url.pathname.match(/^\/api\/events\/(\d{1,12})$/);
  if (em && req.method === 'DELETE') {
    await run('DELETE FROM events WHERE id = ? AND user_id = ?', Number(em[1]), user.id);
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
