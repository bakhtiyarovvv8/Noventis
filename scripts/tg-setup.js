// Подключает вебхук Telegram-бота к сайту. Запуск после выкладки: node scripts/tg-setup.js
// Нужны в .env: TG_BOT_TOKEN, TG_WEBHOOK_SECRET, SITE_URL (публичный адрес сайта, https).
const fs = require('node:fs');
const path = require('node:path');

try {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* .env нет — берём переменные окружения */ }

const { TG_BOT_TOKEN: token, TG_WEBHOOK_SECRET: secret, SITE_URL: site } = process.env;
if (!token || !secret || !/^https:\/\//.test(site || '')) {
  console.error('Заполни в .env: TG_BOT_TOKEN, TG_WEBHOOK_SECRET и SITE_URL (https://...)');
  process.exit(1);
}

(async () => {
  const api = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}),
  }).then(r => r.json());
  const me = await api('getMe');
  if (!me.ok) { console.error('Токен не подошёл:', me.description); process.exit(1); }
  const hook = await api('setWebhook', { url: site.replace(/\/+$/, '') + '/api/tg/webhook', secret_token: secret, allowed_updates: ['message'] });
  await api('setMyCommands', { commands: [
    { command: 'deadlines', description: 'Мои ближайшие дедлайны' },
    { command: 'stop', description: 'Отключить напоминания' },
  ] });
  console.log(hook.ok ? `Готово: @${me.result.username} → ${site}/api/tg/webhook` : 'Ошибка: ' + hook.description);
  console.log(`Впиши в .env и на Render: TG_BOT_NAME=${me.result.username}`);
})();
