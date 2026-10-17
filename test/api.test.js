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

test('дедлайны и план: только свои данные, проверка ключей', async () => {
  const a = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест А', email: uniq('pa'), password: '12345678' } });
  const b = await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест Б', email: uniq('pb'), password: '12345678' } });
  await call(LOCAL, '/api/deadlines', { method: 'POST', cookie: a.cookie, body: { id: 'gks_u' } });
  assert.deepEqual((await call(LOCAL, '/api/deadlines', { cookie: a.cookie })).data.follows, ['gks_u']);
  assert.deepEqual((await call(LOCAL, '/api/deadlines', { cookie: b.cookie })).data.follows, []);
  assert.equal((await call(LOCAL, '/api/deadlines', { method: 'POST', cookie: a.cookie, body: { id: 'Bad Id!' } })).status, 400);

  const prep = await call(LOCAL, '/api/results', { method: 'POST', cookie: a.cookie, body: { category: 'prep', answers: {}, summary: { field: 'it' } } });
  const work = await call(LOCAL, '/api/results', { method: 'POST', cookie: a.cookie, body: { category: 'work', answers: {}, summary: {} } });
  const P = `/api/plan/${prep.data.id}`;
  assert.equal((await call(LOCAL, P, { method: 'PUT', cookie: a.cookie, body: { checks: ['1:0', '2:1', '1:0'] } })).status, 200);
  assert.deepEqual((await call(LOCAL, P, { cookie: a.cookie })).data.checks, ['1:0', '2:1']);
  assert.equal((await call(LOCAL, P, { cookie: b.cookie })).status, 404, 'чужой план не виден');
  assert.equal((await call(LOCAL, `/api/plan/${work.data.id}`, { cookie: a.cookie })).status, 404, 'план только у «Подготовки»');
  assert.equal((await call(LOCAL, P, { method: 'PUT', cookie: a.cookie, body: { checks: ['<script>'] } })).status, 400);
});

test('родители и учителя: доступ только по коду, отзыв, классы', async () => {
  const reg = async p => (await call(LOCAL, '/api/register', { method: 'POST', body: { name: 'Тест ' + p, email: uniq(p), password: '12345678' } })).cookie;
  const kid = await reg('kid'), mom = await reg('mom'), stranger = await reg('str'), teacher = await reg('tch');
  const kidId = (await call(LOCAL, '/api/me', { cookie: kid })).data.user.id;
  const res = await call(LOCAL, '/api/results', { method: 'POST', cookie: kid, body: { category: 'work', answers: {}, summary: { fields: [{ id: 'it', pct: 90 }] } } });

  // без кода — ничего не видно
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: mom })).status, 404);
  const code = (await call(LOCAL, '/api/family/code', { method: 'POST', cookie: kid })).data.code;
  assert.match(code, /^[A-Z2-9]{8}$/);
  assert.equal((await call(LOCAL, '/api/family/watch', { method: 'POST', cookie: kid, body: { code } })).status, 400, 'свой код нельзя');
  assert.equal((await call(LOCAL, '/api/family/watch', { method: 'POST', cookie: mom, body: { code: 'WRONG123' } })).status, 404);
  assert.equal((await call(LOCAL, '/api/family/watch', { method: 'POST', cookie: mom, body: { code: code.toLowerCase().replace(/(.{4})/, '$1-') } })).status, 200, 'регистр и дефис не мешают');
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: mom })).data.results.length, 1);
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results/${res.data.id}`, { cookie: mom })).data.summary.fields[0].id, 'it');
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: stranger })).status, 404, 'посторонний не видит');
  assert.equal((await call(LOCAL, '/api/family', { cookie: kid })).data.watchers.length, 1);

  // ученик отзывает доступ
  const momId = (await call(LOCAL, '/api/me', { cookie: mom })).data.user.id;
  await call(LOCAL, '/api/family/watch', { method: 'DELETE', cookie: kid, body: { viewer: momId } });
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: mom })).status, 404);

  // класс учителя
  const cls = await call(LOCAL, '/api/classes', { method: 'POST', cookie: teacher, body: { name: '11-А' } });
  assert.equal(cls.status, 201);
  assert.equal((await call(LOCAL, '/api/classes/join', { method: 'POST', cookie: kid, body: { code: cls.data.code } })).status, 200);
  const fam = (await call(LOCAL, '/api/family', { cookie: teacher })).data;
  assert.equal(fam.classes[0].members.length, 1);
  assert.equal(fam.classes[0].members[0].results.length, 1);
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: teacher })).status, 200);
  // посторонний не удалит чужой класс; ученик выходит — доступ пропадает
  await call(LOCAL, `/api/classes/${cls.data.id}`, { method: 'DELETE', cookie: stranger });
  assert.equal((await call(LOCAL, '/api/family', { cookie: teacher })).data.classes.length, 1);
  await call(LOCAL, `/api/classes/${cls.data.id}`, { method: 'DELETE', cookie: kid });
  assert.equal((await call(LOCAL, `/api/view/${kidId}/results`, { cookie: teacher })).status, 404);
});

test('Telegram-бот: привязка по ссылке, подпись вебхука, рассылка, отключение', async () => {
  // поддельный api.telegram.org: запоминает отправленные сообщения
  const sent = [];
  const fake = require('node:http').createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => { sent.push(JSON.parse(b || '{}')); res.end('{"ok":true}'); });
  }).listen(3310);
  try {
    const BOT = await startServer(3303, { TG_BOT_TOKEN: 'T', TG_BOT_NAME: 'noventis_test_bot', TG_API: 'http://localhost:3310', TG_WEBHOOK_SECRET: 'hook', CRON_KEY: 'cron' });
    const hook = (text, secret = 'hook') => call(BOT, '/api/tg/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: { message: { chat: { id: 777 }, from: { language_code: 'ru' }, text } } });
    const u = (await call(BOT, '/api/register', { method: 'POST', body: { name: 'Тест', email: uniq('tg'), password: '12345678' } })).cookie;
    assert.deepEqual((await call(BOT, '/api/tg', { cookie: u })).data, { enabled: true, linked: false });
    const { url } = (await call(BOT, '/api/tg/link', { method: 'POST', cookie: u, body: { lang: 'ru' } })).data;
    assert.match(url, /^https:\/\/t\.me\/noventis_test_bot\?start=[A-Za-z0-9]+$/);
    const code = url.split('=')[1];

    assert.equal((await hook('/start ' + code, 'wrong')).status, 403, 'без подписи Telegram — отказ');
    assert.equal((await hook('/start ' + code)).status, 200);
    assert.match(sent.at(-1).text, /Готово/);
    assert.equal(sent.at(-1).chat_id, '777');
    assert.equal((await call(BOT, '/api/tg', { cookie: u })).data.linked, true);
    await hook('/start ' + code);
    assert.match(sent.at(-1).text, /устарела/, 'код одноразовый');

    // следим за всеми дедлайнами; письмо будет, если у какого-то сегодня осталось 30/7/1 день
    const vm = require('node:vm'), ctx = { L: (ru, en) => ({ ru, en }) };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'deadlines-data.js'), 'utf8') + ';this.D=DEADLINES;this.left=daysLeft;', ctx);
    for (const d of ctx.D) await call(BOT, '/api/deadlines', { method: 'POST', cookie: u, body: { id: d.id } });
    await hook('/deadlines');
    assert.match(sent.at(-1).text, /ближайшие дедлайны/);
    assert.equal((await call(BOT, '/api/cron/daily', { method: 'POST' })).status, 403);
    const daily = await call(BOT, '/api/cron/daily', { method: 'POST', headers: { 'x-cron-key': 'cron' } });
    const due = ctx.D.some(d => [30, 7, 1].includes(ctx.left(d))) || new Date().getDay() === 1;
    assert.equal(daily.data.sent, due ? 1 : 0);

    await hook('/stop');
    assert.equal((await call(BOT, '/api/tg', { cookie: u })).data.linked, false);
    // без токена бот выключен
    assert.equal((await call(LOCAL, '/api/tg/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'hook' }, body: {} })).status, 403);
  } finally { fake.close(); }
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
