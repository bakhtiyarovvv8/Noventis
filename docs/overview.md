# Noventis — обзор

Профориентация для молодёжи Узбекистана: адаптивный тест → направление → страны → топ-3 вуза → «С чего начать» (общий шаблон требований) → курсы учебных центров → заявка на нашем сайте.
Доход — от учебных центров за приведённых клиентов (заявки).

## Где что
- Сайт: https://noventis.pages.dev — Cloudflare Pages (`public/`, `functions/api` пересылает `/api/*`).
- Сервер: Render (`render.yaml`, `server.js`), база — Turso (libSQL).
- Код: GitHub `bakhtiyarovvv8/Noventis`, ветка `main`.
- Локально: `start.bat` → http://localhost:3000 (база — `data/noventis.db`).

## Главные файлы
- `public/js/adaptive-tree.js` — дерево вопросов теста (`node scripts/check-tree.js`).
- `public/js/start-data.js` — топ-3 вузов, требования, центры и курсы (`node scripts/check-start-data.js`).
- `public/js/start.js` — страница «С чего начать» и форма записи.
- `public/js/common.js` — переводы интерфейса, `HIDDEN_SECTIONS` (скрытые разделы).
- `server.js` — API: вход, результаты, избранное, расчёты, заявки (`/api/leads`, `/api/leads/mine`), админ по `ADMIN_TOKEN`.

## Состояние (2026-10-26)
- Учебные центры и курсы — демо (6 центров, 19 курсов, `demo: true`). Реальные — после договоров с центрами.
- Заявки хранятся у нас; передача центрам — позже.
