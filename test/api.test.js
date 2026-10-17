// Тесты API. Запуск: npm test
// Поднимают сервер на временной копии базы — рабочие данные не трогают.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');

const KEY = 'test-proxy-key';
const servers = [];

async function startServer(port, env = {}) {
  const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'noventis-')), 'test.db');
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), TURSO_DATABASE_URL: 'file:' + dbFile.replace(/\\/g, '/'), PROXY_KEY: '', NODE_ENV: '', ...env },
    stdio: 'ignore',
  });
  servers.push(proc);
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${port}/api/health`); return `http://localhost:${port}`; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('сервер не запустился');
}

const call = async (base, p, { method = 'GET', body, cookie = '', headers = {} } = {}) => {
  const r = await fetch(base + p, {
    method, headers: { 'content-type': 'application/json', cookie, ...headers },
    body: typeof body === 'string' ? body : body && JSON.stringify(body),
  });
  let data = null; try { data = await r.json(); } catch { }
  return { status: r.status, data, cookie: (r.headers.get('set-cookie') || '').split(';')[0], rawCookie: r.headers.get('set-cookie') || '' };
};
const uniq = p => `${p}${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.uz`;

let LOCAL, PROXIED;
before(async () => {
  LOCAL = await startServer(3301);
  PROXIED = await startServer(3302, { PROXY_KEY: KEY, NODE_ENV: 'production' });
});
after(() => servers.forEach(p => p.kill()));

// через «Cloudflare»: с секретом и IP посетителя
const via = ip => ({ 'x-noventis-proxy-key': KEY, 'x-noventis-client-ip': ip });

test('без входа: /api/me → user=null, закрытые адреса → 401', async () => {
  assert.equal((await call(LOCAL, '/api/me')).data.user, null);
  assert.equal((await call(LOCAL, '/api/results')).status, 401);
  assert.equal((await call(LOCAL, '/api/results/1')).status, 401);
  assert.equal((await call(LOCAL, '/api/results', { method: 'POST', body: { category: 'work' } })).status, 401);
});

test('чужие результаты не видны и не удаляются', async () => {
  const a = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест А', email: uniq('a'), password: '12345678' } });
  const b = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест Б', email: uniq('b'), password: '12345678' } });
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  const saved = await call(LOCAL, '/api/results', { method: 'POST', cookie: a.cookie, body: { category: 'work', answers: { q: 1 }, summary: { top: 'it' } } });
  assert.equal(saved.status, 201);
  const id = saved.data.id;
  assert.equal((await call(LOCAL, `/api/results/${id}`, { cookie: a.cookie })).data.summary.top, 'it');
  assert.equal((await call(LOCAL, `/api/results/${id}`, { cookie: b.cookie })).status, 404);
  await call(LOCAL, `/api/results/${id}`, { method: 'DELETE', cookie: b.cookie });
  assert.equal((await call(LOCAL, `/api/results/${id}`, { cookie: a.cookie })).status, 200, 'Б не должен удалить результат А');
  assert.equal((await call(LOCAL, '/api/results', { cookie: b.cookie })).data.results.length, 0);
});

test('избранные вузы: свои, без дублей, только http(s)-ссылки', async () => {
  assert.equal((await call(LOCAL, '/api/favorites')).status, 401);
  const a = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест А', email: uniq('fa'), password: '12345678' } });
  const b = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест Б', email: uniq('fb'), password: '12345678' } });
  const uni = { name: 'Inha University in Tashkent', place: 'UZ', web: 'https://inha.uz' };
  assert.equal((await call(LOCAL, '/api/favorites', { method: 'POST', cookie: a.cookie, body: uni })).status, 201);
  await call(LOCAL, '/api/favorites', { method: 'POST', cookie: a.cookie, body: uni });
  await call(LOCAL, '/api/favorites', { method: 'POST', cookie: a.cookie, body: { name: 'KAIST', place: 'kr', web: 'javascript:alert(1)' } });
  const list = (await call(LOCAL, '/api/favorites', { cookie: a.cookie })).data.favorites;
  assert.equal(list.length, 2);
  assert.equal(list.find(f => f.name === 'KAIST').web, '');
  assert.equal((await call(LOCAL, '/api/favorites', { cookie: b.cookie })).data.favorites.length, 0);
  await call(LOCAL, '/api/favorites', { method: 'DELETE', cookie: b.cookie, body: uni });
  assert.equal((await call(LOCAL, '/api/favorites', { cookie: a.cookie })).data.favorites.length, 2, 'Б не удаляет избранное А');
  await call(LOCAL, '/api/favorites', { method: 'DELETE', cookie: a.cookie, body: uni });
  assert.equal((await call(LOCAL, '/api/favorites', { cookie: a.cookie })).data.favorites.length, 1);
  assert.equal((await call(LOCAL, '/api/favorites', { method: 'POST', cookie: a.cookie, body: { name: '', place: 'UZ' } })).status, 400);
});

test('проверка входящих данных: 400 вместо падения', async () => {
  assert.equal((await call(LOCAL, '/api/login', { method: 'POST', body: '{oops' })).status, 400);
  assert.equal((await call(LOCAL, '/api/register', { method: 'POST', body: { name: { a: 1 }, email: 5, password: [1] } })).status, 400);
  const a = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест', email: uniq('v'), password: '12345678' } });
  assert.equal((await call(LOCAL, '/api/results', { method: 'POST', cookie: a.cookie, body: { category: 'hack' } })).status, 400);
  assert.equal((await call(LOCAL, '/api/results', { method: 'POST', cookie: a.cookie, body: { category: 'work', answers: 'x' } })).status, 400);
});

test('лимит входа считается по IP + email: один IP с разными email не блокируется', async () => {
  const school = '203.0.113.10';
  const victim = uniq('victim');
  let last;
  for (let i = 0; i < 11; i++)
    last = await call(PROXIED, '/api/login', { method: 'POST', headers: via(school), body: { email: victim, password: 'wrongpass' } });
  assert.equal(last.status, 429, '11-я попытка на один email с одного IP → 429');

  // другой ученик в той же школе (тот же IP) спокойно входит со своим email
  const other = await call(PROXIED, '/api/login', { method: 'POST', headers: via(school), body: { email: uniq('other'), password: 'wrongpass' } });
  assert.equal(other.status, 401, 'другой email с того же IP — обычный ответ, не 429');

  // тот же email с другого IP — тоже не заблокирован
  const elsewhere = await call(PROXIED, '/api/login', { method: 'POST', headers: via('198.51.100.20'), body: { email: victim, password: 'wrongpass' } });
  assert.equal(elsewhere.status, 401);

  // регистрация на тот же IP с новым email работает
  const reg = await call(PROXIED, '/api/register', { method: 'POST', headers: via(school), body: { name: 'Новичок', email: uniq('new'), password: '12345678' } });
  assert.equal(reg.status, 201);
});

test('лимит входа не обойти, меняя регистр букв в email', async () => {
  const ip = '203.0.113.11';
  const email = uniq('case');
  for (let i = 0; i < 10; i++)
    await call(PROXIED, '/api/login', { method: 'POST', headers: via(ip), body: { email, password: 'wrongpass' } });
  const r = await call(PROXIED, '/api/login', { method: 'POST', headers: via(ip), body: { email: email.toUpperCase(), password: 'wrongpass' } });
  assert.equal(r.status, 429);
});

test('общий лимит 300 запросов считается по IP', async () => {
  const ip = '203.0.113.12';
  let last;
  for (let i = 0; i < 301; i++) last = await call(PROXIED, '/api/me', { headers: via(ip) });
  assert.equal(last.status, 429, '301-й запрос с одного IP → 429');
  assert.equal((await call(PROXIED, '/api/me', { headers: via('203.0.113.13') })).status, 200, 'другой IP не затронут');
});

test('за Cloudflare: без секрета или с неверным — 403, подделать IP нельзя', async () => {
  assert.equal((await call(PROXIED, '/api/me')).status, 403);
  assert.equal((await call(PROXIED, '/api/me', { headers: { 'x-noventis-proxy-key': 'wrong', 'x-noventis-client-ip': '1.1.1.1' } })).status, 403);
  assert.equal((await call(PROXIED, '/api/health', { headers: via('203.0.113.14') })).status, 200);
});

test('в продакшене кука входа с флагом Secure', async () => {
  const r = await call(PROXIED, '/api/register', { method: 'POST', headers: via('203.0.113.15'), body: { name: 'Тест', email: uniq('s'), password: '12345678' } });
  assert.match(r.rawCookie, /HttpOnly/);
  assert.match(r.rawCookie, /Secure/);
});
