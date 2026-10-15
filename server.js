// Noventis — сервер без внешних зависимостей: http + node:sqlite + crypto.scrypt
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const SESSION_DAYS = 30;

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new DatabaseSync(path.join(__dirname, 'data', 'noventis.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    answers TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');

// --- простая защита от перебора паролей: 10 попыток за 15 минут с одного IP
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 15 * 60 * 1000) { rec.n = 0; rec.t = now; }
  rec.n++;
  attempts.set(ip, rec);
  return rec.n > 10;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function currentUser(req) {
  const token = parseCookies(req).kj_session;
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?`).get(token, Date.now());
  return row || null;
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  res.setHeader('Set-Cookie',
    `kj_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 200_000) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
      catch { reject(new Error('bad_json')); }
    });
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const ip = req.socket.remoteAddress;

  if (route === 'POST /api/register') {
    const { name = '', email = '', password = '' } = await readBody(req);
    if (rateLimited(ip)) return json(res, 429, { error: 'too_many' });
    if (name.trim().length < 2) return json(res, 400, { error: 'name_short' });
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'email_invalid' });
    if (password.length < 8) return json(res, 400, { error: 'password_short' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim()))
      return json(res, 409, { error: 'email_taken' });
    const salt = crypto.randomBytes(16).toString('hex');
    const r = db.prepare('INSERT INTO users (name, email, pass_hash, salt) VALUES (?, ?, ?, ?)')
      .run(name.trim().slice(0, 60), email.trim().toLowerCase(), hashPassword(password, salt), salt);
    createSession(res, Number(r.lastInsertRowid));
    return json(res, 201, { ok: true });
  }

  if (route === 'POST /api/login') {
    const { email = '', password = '' } = await readBody(req);
    if (rateLimited(ip)) return json(res, 429, { error: 'too_many' });
    const u = db.prepare('SELECT id, pass_hash, salt FROM users WHERE email = ?').get(email.trim());
    const ok = u && crypto.timingSafeEqual(
      Buffer.from(hashPassword(password, u.salt), 'hex'), Buffer.from(u.pass_hash, 'hex'));
    if (!ok) return json(res, 401, { error: 'bad_credentials' });
    attempts.delete(ip);
    createSession(res, u.id);
    return json(res, 200, { ok: true });
  }

  if (route === 'POST /api/logout') {
    const token = parseCookies(req).kj_session;
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.setHeader('Set-Cookie', 'kj_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  const user = currentUser(req);

  if (route === 'GET /api/me') return json(res, 200, { user });

  if (!user) return json(res, 401, { error: 'unauthorized' });

  if (route === 'GET /api/results') {
    const rows = db.prepare(
      'SELECT id, category, summary, created_at FROM results WHERE user_id = ? ORDER BY id DESC').all(user.id);
    return json(res, 200, { results: rows.map(r => ({ ...r, summary: JSON.parse(r.summary) })) });
  }

  if (route === 'POST /api/results') {
    const { category, answers, summary } = await readBody(req);
    if (!['university', 'work', 'prep'].includes(category)) return json(res, 400, { error: 'bad_category' });
    const r = db.prepare('INSERT INTO results (user_id, category, answers, summary) VALUES (?, ?, ?, ?)')
      .run(user.id, category, JSON.stringify(answers || {}), JSON.stringify(summary || {}));
    return json(res, 201, { id: Number(r.lastInsertRowid) });
  }

  const m = url.pathname.match(/^\/api\/results\/(\d+)$/);
  if (m && req.method === 'GET') {
    const r = db.prepare('SELECT * FROM results WHERE id = ? AND user_id = ?').get(Number(m[1]), user.id);
    if (!r) return json(res, 404, { error: 'not_found' });
    return json(res, 200, { ...r, answers: JSON.parse(r.answers), summary: JSON.parse(r.summary) });
  }
  if (m && req.method === 'DELETE') {
    db.prepare('DELETE FROM results WHERE id = ? AND user_id = ?').run(Number(m[1]), user.id);
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
      'Cache-Control': ext === '.jpg' ? 'public, max-age=604800' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'server_error' });
  }
}).listen(PORT, () => console.log(`\n  Noventis запущен →  http://localhost:${PORT}\n`));

// чистка просроченных сессий раз в час
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 36e5).unref();
