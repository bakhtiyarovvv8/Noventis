// Telegram-бот Noventis: привязка аккаунта и напоминания о дедлайнах.
// Работает, только если задан TG_BOT_TOKEN. Сообщения приходят через вебхук /api/tg/webhook,
// напоминания рассылает /api/cron/daily — его раз в день вызывает внешний планировщик.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const TOKEN = process.env.TG_BOT_TOKEN || '';
const API = (process.env.TG_API || 'https://api.telegram.org') + '/bot' + TOKEN;
const SITE = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const enabled = () => !!TOKEN;

// Дедлайны — из того же файла, что показывает сайт
const ctx = { L: (ru, en) => ({ ru, en }) };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'public', 'js', 'deadlines-data.js'), 'utf8')
  + '\n;this.DEADLINES = DEADLINES; this.nextDate = nextDate;', ctx);
const { DEADLINES, nextDate } = ctx;
const tr = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.ru : v);
const daysLeft = dl => Math.round((nextDate(dl) - new Date(new Date().toDateString())) / 864e5);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const TEXT = {
  hello: { ru: 'Привет! Я бот Noventis. Подключи меня в кабинете на сайте — и я буду напоминать о дедлайнах грантов, экзаменов и подачи в вузы.', en: 'Hi! I’m the Noventis bot. Connect me in your dashboard and I’ll remind you about grant, exam and application deadlines.' },
  linked: { ru: 'Готово! Аккаунт подключён. Напомню о дедлайнах за 30, 7 и 1 день. Команды: /deadlines — мои дедлайны, /stop — отключить.', en: 'Done! Your account is connected. I’ll remind you 30, 7 and 1 day before deadlines. Commands: /deadlines, /stop.' },
  bad_code: { ru: 'Ссылка устарела. Открой кабинет на сайте и нажми «Подключить Telegram» ещё раз.', en: 'This link has expired. Open your dashboard and tap “Connect Telegram” again.' },
  stopped: { ru: 'Бот отключён. Подключить снова можно в кабинете.', en: 'The bot is disconnected. You can reconnect in your dashboard.' },
  none: { ru: 'Ты пока не следишь ни за одним дедлайном. Отметь нужные:', en: 'You’re not following any deadlines yet. Pick some here:' },
  mine: { ru: 'Твои ближайшие дедлайны:', en: 'Your upcoming deadlines:' },
  remind: { ru: '⏰ Напоминание о дедлайнах:', en: '⏰ Deadline reminder:' },
  days: { ru: 'дн.', en: 'days' }, today: { ru: 'сегодня!', en: 'today!' },
  week: { ru: '📅 Новая неделя подготовки. Открой план и отметь задачи:', en: '📅 A new study week. Open your plan and tick off tasks:' },
  help: { ru: 'Команды: /deadlines — мои дедлайны, /stop — отключить напоминания.', en: 'Commands: /deadlines — my deadlines, /stop — turn off reminders.' },
};

async function send(chatId, text) {
  if (!enabled()) return false;
  try {
    const r = await fetch(API + '/sendMessage', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch (e) { console.error('Telegram:', e.message); return false; }
}

const line = (dl, lang) => {
  const n = daysLeft(dl);
  return `• <b>${esc(tr(dl.n, lang))}</b> — ${n === 0 ? TEXT.today[lang] : `${n} ${TEXT.days[lang]}`}`;
};

// Входящее сообщение от Telegram. db — { one, all, run } из server.js
async function handleUpdate(u, db) {
  const msg = u && u.message;
  if (!msg || !msg.chat || typeof msg.text !== 'string') return;
  const chat = String(msg.chat.id);
  const [cmd, arg] = msg.text.trim().split(/\s+/);
  const link = await db.one('SELECT user_id, lang FROM tg_links WHERE chat_id = ?', chat);
  const lang = link ? link.lang : (String(msg.from && msg.from.language_code).startsWith('ru') ? 'ru' : 'en');

  if (cmd === '/start') {
    if (!arg) return send(chat, TEXT.hello[lang] + '\n' + SITE + '/profile');
    const c = /^[A-Za-z0-9]{6,20}$/.test(arg) && await db.one('SELECT user_id, lang FROM tg_codes WHERE code = ? AND expires > ?', arg, Date.now());
    if (!c) return send(chat, TEXT.bad_code[lang]);
    await db.run('DELETE FROM tg_codes WHERE code = ?', arg);
    // один чат — один аккаунт: старую привязку этого чата снимаем
    await db.run('DELETE FROM tg_links WHERE chat_id = ? OR user_id = ?', chat, c.user_id);
    await db.run('INSERT INTO tg_links (user_id, chat_id, lang) VALUES (?, ?, ?)', c.user_id, chat, c.lang);
    return send(chat, TEXT.linked[c.lang]);
  }
  if (cmd === '/stop') {
    await db.run('DELETE FROM tg_links WHERE chat_id = ?', chat);
    return send(chat, TEXT.stopped[lang]);
  }
  if (cmd === '/deadlines' && link) {
    const ids = (await db.all('SELECT did FROM deadline_follows WHERE user_id = ?', link.user_id)).map(r => r.did);
    const list = DEADLINES.filter(d => ids.includes(d.id)).sort((a, b) => nextDate(a) - nextDate(b)).slice(0, 8);
    if (!list.length) return send(chat, TEXT.none[lang] + '\n' + SITE + '/deadlines');
    return send(chat, TEXT.mine[lang] + '\n' + list.map(d => line(d, lang)).join('\n') + '\n\n' + SITE + '/deadlines');
  }
  return send(chat, link ? TEXT.help[lang] : TEXT.hello[lang] + '\n' + SITE + '/profile');
}

// Ежедневная рассылка: дедлайны через 30, 7 и 1 день; по понедельникам — напоминание о плане
async function daily(db, now = new Date()) {
  const links = await db.all('SELECT user_id, chat_id, lang FROM tg_links');
  let sent = 0;
  for (const l of links) {
    const ids = (await db.all('SELECT did FROM deadline_follows WHERE user_id = ?', l.user_id)).map(r => r.did);
    const soon = DEADLINES.filter(d => ids.includes(d.id) && [30, 7, 1].includes(daysLeft(d)));
    const parts = [];
    if (soon.length) parts.push(TEXT.remind[l.lang] + '\n' + soon.map(d => `${line(d, l.lang)}\n  ${d.url}`).join('\n'));
    if (now.getDay() === 1 && await db.one("SELECT 1 FROM results WHERE user_id = ? AND category = 'prep'", l.user_id)) {
      parts.push(TEXT.week[l.lang] + '\n' + SITE + '/plan');
    }
    if (parts.length && await send(l.chat_id, parts.join('\n\n'))) sent++;
  }
  return { users: links.length, sent };
}

module.exports = { enabled, handleUpdate, daily, botName: () => process.env.TG_BOT_NAME || '' };
