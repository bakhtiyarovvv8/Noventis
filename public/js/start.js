// «С чего начать»: направление → страны → топ-3 вуза → общий шаблон требований → курсы → запись.
// Данные: start-data.js (window.START). Тексты {ru,en,uz} показываем через tx(); свои надписи — через X(ru, en, uz).
const X = (ru, en, uz) => tx({ ru, en, uz });
const app = document.getElementById('app');

const ST = {
  field: '',            // id направления (ключ FIELDS)
  alts: [],             // запасные направления
  countries: [],        // выбранные коды стран, в порядке выбора
  started: false,       // нажали «С чего начать»
  testFields: [],       // [{id, pct}] из последнего теста (если есть) — для заявки
};
let TOPS = [];          // top3-результаты по выбранным странам
let TPL = null;         // общий шаблон требований
let CRS = [];           // курсы по пунктам
let COURSE_BY_ID = {};

const usd = v => '$' + Math.round(v).toLocaleString(locale());
const uzs = v => Math.round(v).toLocaleString(locale()) + ' ' + t('sum');
const flag = cc => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
const fname = id => FIELDS[id] ? tx(FIELDS[id].name) : id;
const cname = cc => tx((START.NAMES[cc]) || { ru: cc, en: cc, uz: cc });

// ---------- адрес ----------
function readUrl() {
  const p = new URLSearchParams(location.search);
  const f = p.get('field');
  if (f && FIELDS[f]) ST.field = f;
  ST.alts = (p.get('alt') || '').split(',').filter(a => FIELDS[a] && a !== ST.field).slice(0, 4);
  const valid = new Set(START.countries().map(c => c.cc));
  ST.countries = (p.get('cc') || '').split(',').filter(c => valid.has(c)).slice(0, 12);
}
function saveUrl() {
  const u = new URL(location.href);
  ST.field ? u.searchParams.set('field', ST.field) : u.searchParams.delete('field');
  ST.alts.length ? u.searchParams.set('alt', ST.alts.join(',')) : u.searchParams.delete('alt');
  ST.countries.length ? u.searchParams.set('cc', ST.countries.join(',')) : u.searchParams.delete('cc');
  history.replaceState(null, '', u);
}

// ---------- расчёт ----------
function compute() {
  TOPS = ST.field ? ST.countries.map(cc => START.top3(cc, ST.field)) : [];
  const list = TOPS.flatMap(tp => tp.unis.map(u => ({ name: u.name, cc: u.cc })));
  TPL = ST.started && list.length ? START.requirementsTemplate(list, { fieldId: ST.field }) : null;
  CRS = TPL ? START.coursesFor(TPL) : [];
  COURSE_BY_ID = {};
  CRS.forEach(g => g.courses.forEach(c => { COURSE_BY_ID[c.id] = c; }));
}
const shownUnis = () => TOPS.flatMap(tp => tp.unis);

// ---------- блоки ----------
function fieldBlock() {
  const ids = ST.field ? [ST.field, ...ST.alts] : [];
  const chips = ids.length ? `<div class="chips-pick st-chips" id="st-fields">${ids.map(id =>
    `<button type="button" class="chip-btn ${id === ST.field ? 'on' : ''}" data-field="${id}">${escapeHtml(fname(id))}</button>`).join('')}</div>` : '';
  return `<div class="st-block"><h2 class="st-h"><span class="st-n">1</span>${X('Твоё направление', 'Your field', 'Sizning yoʻnalishingiz')}</h2>
    ${ST.field ? `<p class="note" style="margin-top:0">${X('Нажми на запасное направление — вузы и требования пересчитаются.', 'Tap a backup field — universities and requirements will be recalculated.', 'Zaxira yoʻnalishni bosing — oliygohlar va talablar qayta hisoblanadi.')}</p>` : `<p class="note" style="margin-top:0">${X('Выбери направление, чтобы подобрать вузы. Лучше — сначала пройти тест.', 'Pick a field to find universities. Better still, take the test first.', 'Oliygohlarni tanlash uchun yoʻnalishni tanlang. Yaxshisi, avval testdan oʻting.')}</p>`}
    ${chips}
    <label class="calc-field st-pick"><span>${ST.field ? X('Другое направление', 'Another field', 'Boshqa yoʻnalish') : X('Направление', 'Field', 'Yoʻnalish')}</span>
      <select class="select" id="st-field-sel">${fieldOptions('', X('— выбрать —', '— choose —', '— tanlang —'))}</select></label>
    ${ST.field ? '' : `<div class="more-row" style="justify-content:flex-start"><a class="btn btn-gold" href="/test">${t('start')} →</a></div>`}</div>`;
}

function countriesBlock() {
  if (!ST.field) return '';
  const list = START.countries();
  return `<div class="st-block"><h2 class="st-h"><span class="st-n">2</span>${X('В каких странах хочешь учиться?', 'Which countries do you want to study in?', 'Qaysi davlatlarda oʻqishni xohlaysiz?')}</h2>
    <p class="note" style="margin-top:0">${X('Выбери одну или несколько стран. Рядом — сколько вузов у нас в базе.', 'Pick one or more countries. Next to each — how many universities we have.', 'Bir yoki bir nechta davlatni tanlang. Yonida — bazamizdagi oliygohlar soni.')}</p>
    <div class="chips-pick st-countries" id="st-ccs">${list.map(c =>
      `<button type="button" class="chip-btn ${ST.countries.includes(c.cc) ? 'on' : ''}" data-cc="${c.cc}" aria-pressed="${ST.countries.includes(c.cc)}">${flag(c.cc)} ${escapeHtml(tx(c.name))} <small>${c.count}</small></button>`).join('')}</div>
    ${ST.countries.length ? '' : `<p class="note">${X('Выбери хотя бы одну страну.', 'Pick at least one country.', 'Kamida bitta davlatni tanlang.')}</p>`}</div>`;
}

function uniCardHtml(u) {
  const q = `name=${encodeURIComponent(u.name)}&cc=${u.cc}&field=${ST.field}`;
  const fitTag = u.fit === 'direct' ? X('профильный', 'strong in this field', 'profilli')
    : u.fit === 'area' ? X('близкая область', 'related area', 'yaqin soha') : X('не профильный', 'not specialised', 'profilsiz');
  return `<div class="uni uni-top ${u.profile ? '' : 'st-off'}">
    <div class="meta"><b>${escapeHtml(nm(u.name))}</b>
      <span>${escapeHtml(tx(u.summary))}</span>
      <div class="uni-tags"><em class="${u.profile ? 'st-ok' : 'st-warn'}">${fitTag}</em></div></div>
    <div class="uni-price"><b>${usd(u.tuitionUsd)}</b><small>${X('обучение в год', 'tuition / year', 'yillik oʻqish')}</small></div>
    <div class="uni-acts"><a class="btn btn-ghost" href="/cost?${q}">${X('Стоимость', 'Cost', 'Narx')}</a>
      <a class="btn btn-ghost" href="/chances?${q}">${X('Шансы', 'Chances', 'Imkoniyat')}</a>${heart(u.name, u.cc)}</div>
  </div>`;
}

function unisBlock() {
  if (!ST.field || !TOPS.length) return '';
  return `<div class="st-block"><h2 class="st-h"><span class="st-n">3</span>${X('Топ-3 вуза в каждой стране', 'Top 3 universities in each country', 'Har bir davlatda 3 ta eng yaxshi oliygoh')}</h2>
    ${TOPS.map(tp => `<div class="st-country"><h3>${flag(tp.cc)} ${escapeHtml(tx(tp.countryName))}</h3>
      ${tp.unis.length ? `<div class="uni-list">${tp.unis.map(uniCardHtml).join('')}</div>` : `<div class="empty">${X('Для этой страны пока нет вузов в базе.', 'No universities in the database for this country yet.', 'Bu davlat uchun bazada hozircha oliygoh yoʻq.')}</div>`}
      ${tp.note ? `<p class="note st-warn-note">${escapeHtml(tx(tp.note))}</p>` : ''}</div>`).join('')}
    <p class="note">${X('Цены и баллы — ориентир 2026, без грантов и скидок.', 'Prices and scores are 2026 benchmarks, before grants and discounts.', 'Narx va ballar — 2026-yil mezoni, grant va chegirmalarsiz.')}</p>
    <div class="more-row"><button type="button" class="btn btn-gold btn-lg" id="st-go">${X('С чего начать', 'Where to start', 'Nimadan boshlash kerak')} →</button></div></div>`;
}

const groups = () => [
  ['language', X('Язык', 'Language', 'Til')], ['exam', X('Экзамены', 'Exams', 'Imtihonlar')], ['prep', X('Подготовка', 'Preparation', 'Tayyorgarlik')],
  ['grades', X('Оценки', 'Grades', 'Baholar')], ['docs', X('Документы', 'Documents', 'Hujjatlar')],
];
function checkNote(it) {
  if (!it.check) return '';
  return `<span class="st-check">${X('уточнить на сайте вуза', 'check on the university website', 'oliygoh saytida aniqlang')}${it.src ? ` · <a href="${escapeHtml(it.src)}" target="_blank" rel="noopener noreferrer">${X('источник', 'source', 'manba')} ↗</a>` : ''}</span>`;
}
function itemHtml(it, total) {
  const all = it.unis.length >= total;
  const per = Object.entries(it.perUni || {});
  return `<div class="st-item"><b>${escapeHtml(tx(it.title))}</b>
    ${tx(it.text) ? `<p>${escapeHtml(tx(it.text))}</p>` : ''}
    ${per.length > 1 ? `<div class="uni-tags">${per.map(([n, v]) => `<em>${escapeHtml(nm(n))}: ${escapeHtml(String(v))}</em>`).join('')}</div>` : ''}
    <div class="st-for">${all ? X('Нужно для всех показанных вузов', 'Needed for all shown universities', 'Barcha koʻrsatilgan oliygohlar uchun kerak')
      : X('Нужно для', 'Needed for', 'Kerak') + ': ' + escapeHtml(it.unis.map(nm).join(', '))}</div>
    ${checkNote(it)}</div>`;
}

function reqBlock() {
  if (!TPL) return '';
  const total = TPL.unis.length;
  const body = groups().map(([g, title]) => {
    const its = TPL.items.filter(i => i.group === g);
    return its.length ? `<div class="st-group"><h3>${title}</h3>${its.map(i => itemHtml(i, total)).join('')}</div>` : '';
  }).join('');
  const dl = `<div class="st-group"><h3>${X('Сроки подачи по странам', 'Application deadlines by country', 'Davlatlar boʻyicha topshirish muddatlari')}</h3>
    ${TPL.deadlines.map(d => `<div class="st-item"><b>${flag(d.cc)} ${escapeHtml(tx(d.country))}</b><p>${escapeHtml(tx(d.text))}</p>
      ${d.check ? `<span class="st-check">${X('уточнить на сайте вуза', 'check on the university website', 'oliygoh saytida aniqlang')}${d.src ? ` · <a href="${escapeHtml(d.src)}" target="_blank" rel="noopener noreferrer">${X('источник', 'source', 'manba')} ↗</a>` : ''}</span>` : ''}</div>`).join('')}</div>`;
  const c = TPL.cost;
  const cost = c ? `<div class="st-group"><h3>${X('Стоимость', 'Cost', 'Narx')}</h3><div class="st-item">
    <b>${usd(c.tuitionUsd.min)} – ${usd(c.tuitionUsd.max)} <small>${X('обучение в год', 'tuition / year', 'yillik oʻqish')}</small></b><p>${escapeHtml(tx(c.text))}</p>
    <span class="st-check">${X('уточнить на сайте вуза', 'check on the university website', 'oliygoh saytida aniqlang')}</span></div></div>` : '';
  return `<div class="st-block" id="st-req"><h2 class="st-h"><span class="st-n">4</span>${X('С чего начать: что нужно для твоих вузов', 'Where to start: what your universities need', 'Nimadan boshlash: oliygohlaringiz uchun nima kerak')}</h2>
    <p class="note" style="margin-top:0">${X('Один общий список на все показанные вузы: сначала самое важное и долгое.', 'One shared list for all shown universities: the most important and slowest items first.', 'Barcha koʻrsatilgan oliygohlar uchun bitta umumiy roʻyxat: avval eng muhim va uzoq davom etadigani.')}</p>
    ${body}${dl}${cost}</div>`;
}

function courseHtml(c) {
  const ce = c.center;
  return `<div class="st-course">
    <div class="st-course-top"><b>${escapeHtml(tx(c.title))}</b>${c.demo ? `<em class="st-demo">${X('пример', 'example', 'namuna')}</em>` : ''}</div>
    <span>${escapeHtml(tx(ce.name))} · ${escapeHtml(tx(ce.city))}</span>
    <div class="uni-tags"><em>${escapeHtml(tx(c.duration))}</em><em>${escapeHtml(tx(c.formatLabel))}</em></div>
    <div class="st-course-bot"><b>${uzs(c.priceUzs)}</b><button type="button" class="btn btn-gold" data-course="${c.id}">${X('Записаться', 'Sign up', 'Yozilish')}</button></div>
    ${c.demo ? `<small class="st-demo-note">${X('Пример центра', 'Example centre', 'Namuna markaz')}</small>` : ''}
  </div>`;
}
function coursesBlock() {
  if (!TPL) return '';
  if (!CRS.length) return `<div class="st-block"><h2 class="st-h"><span class="st-n">5</span>${X('Курсы', 'Courses', 'Kurslar')}</h2><div class="empty">${X('Для этих пунктов курсов пока нет.', 'No courses for these items yet.', 'Bu bandlar uchun kurslar hozircha yoʻq.')}</div></div>`;
  return `<div class="st-block" id="st-courses"><h2 class="st-h"><span class="st-n">5</span>${X('Курсы учебных центров', 'Courses from learning centres', 'Oʻquv markazlari kurslari')}</h2>
    <p class="note" style="margin-top:0">${X('Пока это примеры: реальные центры и цены появятся позже.', 'For now these are examples: real centres and prices will appear later.', 'Hozircha bular namunalar: haqiqiy markazlar va narxlar keyin paydo boʻladi.')}</p>
    ${CRS.map(g => `<div class="st-group"><h3>${escapeHtml(tx(g.itemTitle))}</h3><div class="st-courses">${g.courses.map(courseHtml).join('')}</div></div>`).join('')}</div>`;
}

function render() {
  compute();
  app.innerHTML = `<div class="page-head"><span class="kicker">${X('Твой путь', 'Your path', 'Sizning yoʻlingiz')}</span>
      <h1>${X('С чего начать', 'Where to start', 'Nimadan boshlash kerak')}</h1>
      <p>${X('Выбери страны — получишь топ-3 вуза в каждой, общий список требований и курсы, которые помогут подготовиться.', 'Pick countries — get the top 3 universities in each, one shared requirements list and courses to help you prepare.', 'Davlatlarni tanlang — har birida 3 ta eng yaxshi oliygoh, umumiy talablar roʻyxati va tayyorlanishga yordam beruvchi kurslarni olasiz.')}</p></div>
    ${fieldBlock()}${countriesBlock()}${unisBlock()}${reqBlock()}${coursesBlock()}`;
  document.title = 'Noventis — ' + X('с чего начать', 'where to start', 'nimadan boshlash');
  const sel = document.getElementById('st-field-sel');
  if (sel) sel.value = '';
  saveUrl();
}

// ---------- события ----------
function setField(id) {
  if (!FIELDS[id]) return;
  const old = ST.field;
  if (old && old !== id && !ST.alts.includes(old)) ST.alts.unshift(old);
  ST.alts = ST.alts.filter(a => a !== id).slice(0, 4);
  ST.field = id;
  render();
}
app.addEventListener('click', e => {
  const f = e.target.closest('[data-field]');
  if (f) { setField(f.dataset.field); return; }
  const c = e.target.closest('[data-cc]');
  if (c) {
    const cc = c.dataset.cc, i = ST.countries.indexOf(cc);
    if (i >= 0) ST.countries.splice(i, 1);
    else if (ST.countries.length >= 12) return toast(X('Не больше 12 стран', 'No more than 12 countries', '12 tadan ortiq davlat boʻlmaydi'));
    else ST.countries.push(cc);
    if (!ST.countries.length) ST.started = false;
    render();
    return;
  }
  if (e.target.closest('#st-go')) {
    ST.started = true; render();
    document.getElementById('st-req')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const b = e.target.closest('[data-course]');
  if (b) openForm(COURSE_BY_ID[b.dataset.course]);
});
app.addEventListener('change', e => { if (e.target.id === 'st-field-sel' && e.target.value) setField(e.target.value); });
document.addEventListener('langchange', () => { if (!document.querySelector('.modal-back')) render(); });
document.addEventListener('favchange', () => paintHearts());

// ---------- запись на курс ----------
const ERR = {
  name_invalid: () => X('Введите имя (от 2 до 60 символов)', 'Enter your name (2 to 60 characters)', 'Ismingizni kiriting (2 dan 60 gacha belgi)'),
  phone_invalid: () => X('Введите номер в формате +998 90 123 45 67', 'Enter a number like +998 90 123 45 67', 'Raqamni +998 90 123 45 67 koʻrinishida kiriting'),
  city_invalid: () => X('Введите город (от 2 до 60 символов)', 'Enter your city (2 to 60 characters)', 'Shaharni kiriting (2 dan 60 gacha belgi)'),
};
const FIELD_OF_ERR = { name_invalid: 'name', phone_invalid: 'phone', city_invalid: 'city' };

function leadPayload(course, v) {
  const unis = shownUnis().map(u => ({ name: u.name, cc: u.cc }));
  // сервер принимает до 4 КБ на поле — режем список вузов, если стран очень много
  while (unis.length && JSON.stringify(unis).length > 3500) unis.pop();
  return {
    name: v.name, phone: v.phone, city: v.city,
    course_id: course.id, center_id: course.centerId,
    course_title: course.title.ru, center_name: course.center.name.ru,
    field: ST.field,
    test_summary: { field: ST.field, fields: (ST.testFields.length ? ST.testFields : [ST.field, ...ST.alts].map(id => ({ id }))).slice(0, 5) },
    countries: ST.countries.slice(), unis, lang: LANG,
  };
}

function openForm(course) {
  if (!course) return;
  const back = document.createElement('div');
  back.className = 'modal-back';
  const auto = [
    [X('Курс', 'Course', 'Kurs'), tx(course.title)], [X('Центр', 'Centre', 'Markaz'), tx(course.center.name)],
    [X('Направление', 'Field', 'Yoʻnalish'), fname(ST.field)],
    [X('Страны', 'Countries', 'Davlatlar'), ST.countries.map(cname).join(', ')],
    [X('Вузы', 'Universities', 'Oliygohlar'), shownUnis().map(u => nm(u.name)).join(', ')],
  ];
  back.innerHTML = `<div class="modal st-modal" role="dialog" aria-modal="true"><h3>${X('Запись на курс', 'Sign up for the course', 'Kursga yozilish')}</h3>
    <form id="st-form" novalidate>
      <label class="calc-field"><span>${X('Имя', 'Name', 'Ism')}</span><input class="input" name="name" autocomplete="name" maxlength="60" value="${escapeHtml(ME ? ME.name : '')}"><small class="st-err" data-e="name"></small></label>
      <label class="calc-field"><span>${X('Телефон', 'Phone', 'Telefon')}</span><input class="input" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="25" placeholder="+998 90 123 45 67" value="+998 "><small class="st-err" data-e="phone"></small></label>
      <label class="calc-field"><span>${X('Город', 'City', 'Shahar')}</span><input class="input" name="city" autocomplete="address-level2" maxlength="60"><small class="st-err" data-e="city"></small></label>
      ${course.demo ? `<p class="note st-demo-note" style="margin:0 0 10px">${X('Пример центра', 'Example centre', 'Namuna markaz')}</p>` : ''}
      <dl class="st-auto">${auto.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>
      <p class="st-err" id="st-gen" role="alert"></p>
      <div class="row"><button type="submit" class="btn btn-gold" id="st-send">${X('Отправить заявку', 'Send request', 'Ariza yuborish')}</button><button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button></div>
    </form></div>`;
  const close = () => { back.remove(); removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.body.appendChild(back);
  const form = back.querySelector('#st-form');
  form.name.focus();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    back.querySelectorAll('.st-err').forEach(el => { el.textContent = ''; });
    const btn = back.querySelector('#st-send');
    btn.disabled = true;
    const r = await api('/api/leads', { method: 'POST', body: leadPayload(course, { name: form.name.value.trim(), phone: form.phone.value.trim(), city: form.city.value.trim() }) });
    btn.disabled = false;
    if (r.ok) {
      back.querySelector('.modal').innerHTML = `<h3>${X('Заявка сохранена', 'Request saved', 'Ariza saqlandi')}</h3>
        <p>${course.demo
          ? X('Заявка сохранена. Это пример центра — настоящие учебные центры подключатся скоро, и мы передадим им вашу заявку.', 'Request saved. This is an example centre — real learning centres will join soon, and we will pass your request on to them.', 'Ariza saqlandi. Bu namuna markaz — haqiqiy oʻquv markazlari tez orada qoʻshiladi va arizangizni ularga topshiramiz.')
          : X('Заявка сохранена, мы передадим её центру.', 'Request saved, we will pass it to the centre.', 'Ariza saqlandi, uni markazga topshiramiz.')}</p>
        <div class="row">${ME ? `<a class="btn btn-ghost" href="/profile#leads">${X('Мои заявки', 'My requests', 'Arizalarim')}</a>` : ''}<button type="button" class="btn btn-gold" data-close>${X('Готово', 'Done', 'Tayyor')}</button></div>`;
      return;
    }
    const code = r.data && r.data.error;
    if (r.status === 429 && r.data.message) { back.querySelector('#st-gen').textContent = r.data.message; return; }
    if (FIELD_OF_ERR[code]) { back.querySelector(`[data-e="${FIELD_OF_ERR[code]}"]`).textContent = ERR[code](); form[FIELD_OF_ERR[code]].focus(); return; }
    back.querySelector('#st-gen').textContent = code === 'field_too_large'
      ? X('Слишком много данных: выбери меньше стран.', 'Too much data: pick fewer countries.', 'Maʼlumot juda koʻp: kamroq davlat tanlang.')
      : code === 'course_invalid'
      ? X('Курс не найден, обновите страницу.', 'Course not found, please refresh the page.', 'Kurs topilmadi, sahifani yangilang.')
      : t(r.status === 429 ? 'err_too_many' : 'err_server');
  });
}

// ---------- запуск ----------
document.addEventListener('DOMContentLoaded', async () => {
  readUrl();
  await loadMe(); await loadFavs();
  // последний результат теста: направление и запасные, если их нет в адресе
  if (ME) {
    const r = await api('/api/results');
    const last = (r.data.results || []).find(x => x.category === 'university' && x.summary && Array.isArray(x.summary.fields) && x.summary.fields.length);
    if (last) {
      const fs = last.summary.fields.filter(f => FIELDS[f.id]);
      ST.testFields = fs.slice(0, 5).map(f => ({ id: f.id, pct: f.pct }));
      if (!ST.field && fs.length) {
        ST.field = fs[0].id;
        ST.alts = fs.slice(1, 3).map(f => f.id);
      }
    }
  }
  render();
  gsap.from('.page-head > *, .st-block', { y: 30, opacity: 0, stagger: .07, duration: 1, ease: 'expo.out' });
});
