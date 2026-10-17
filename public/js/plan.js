// План по неделям: вуз + направление + дедлайн → совет сайта → ручная правка → «Добавить в календарь?» (да / нет / частично)
// План хранится на сервере (/api/plan), события календаря — отдельно (/api/events).
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const T3 = (ru, en, uz) => tx({ ru, en, uz });
let PLAN = null, mode = 'setup', showAll = false;
let SETUP = { uni: null, field: '', deadline: '', eng: 'b1', hours: 10 };

// ---------- даты ----------
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const today = () => fromIso(iso(new Date()));
const fmt = (d, long) => d.toLocaleDateString(locale(), long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });

// Европейские страны подают и через общие европейские сроки (Erasmus и т. п.)
const EU_CC = ['DE', 'AT', 'CH', 'NL', 'BE', 'SE', 'FI', 'FR', 'IT', 'ES', 'HU', 'PL', 'CZ', 'IE'];
const ccMatch = (dl, cc) => dl.cc === cc || (dl.cc === 'EU' && EU_CC.includes(cc)) || (dl.cc === 'US' && cc === 'CA');

// Подсказки дедлайна: сроки подачи для страны вуза, не раньше чем через 6 недель
function deadlineHints(cc) {
  const from = addDays(today(), 42);
  return DEADLINES.filter(dl => dl.type === 'apply' && ccMatch(dl, cc))
    .map(dl => ({ dl, d: nextDate(dl, from) })).sort((a, b) => a.d - b.d).slice(0, 4);
}

// ---------- совет: план из вуза, направления и срока ----------
const STAGES = [
  { p: .06, k: 'diag', n: L('Диагностика', 'Diagnosis') },
  { p: .45, k: 'base', n: L('База', 'Foundation') },
  { p: .7, k: 'exams', n: L('Экзамены', 'Exams') },
  { p: .85, k: 'docs', n: L('Документы', 'Documents') },
  { p: 1, k: 'apply', n: L('Подача и гранты', 'Applications & grants') },
];

function buildPlan(s) {
  const start = today(), end = fromIso(s.deadline);
  const W = Math.min(104, Math.max(2, Math.ceil((end - start) / (7 * 864e5))));
  const u = s.uni ? findUni(s.uni[0], s.uni[1]) : null;
  const cc = u ? u[1] : 'UZ';
  const uniName = u ? nm(u[0]) : T3('вуз', 'the university', 'oliygoh');
  const reqI = u ? u[2] : null, needSat = u && (u[6].includes('sat') || u[3]), ru = u && u[6].includes('ru');
  const uzState = cc === 'UZ' && !reqI;
  const foreign = cc !== 'UZ';
  const engOk = s.eng === 'ielts' || (s.eng === 'c1' && (!reqI || reqI <= 7));
  const needEng = !!reqI && !engOk;
  const [s1, s2] = s.field ? subjectsOf(s.field).map(tx) : [T3('Профильный предмет', 'Core subject', 'Profil fan'), T3('Второй предмет', 'Second subject', 'Ikkinchi fan')];
  const per = Math.max(1, Math.round(s.hours / 6));
  const exams = [reqI && `IELTS ${reqI.toFixed(1)}`, needSat && `SAT${u[3] ? ' ' + u[3] : ''}`, uzState && 'uzbmb', ru && T3('экзамен вуза на русском', 'entrance exam in Russian', 'rus tilida kirish imtihoni')].filter(Boolean);
  const examTxt = exams.join(' + ') || T3('экзамен вуза', 'entrance exam', 'kirish imtihoni');

  const weeks = [];
  let prev = '';
  for (let w = 1; w <= W; w++) {
    // первая неделя — всегда диагностика, даже при длинном плане
    const st = w === 1 ? STAGES[0] : STAGES.find(x => w / W <= x.p + 1e-9) || STAGES[STAGES.length - 1];
    const first = st.k !== prev; prev = st.k;
    const tasks = [];
    const add = (...xs) => xs.forEach(x => x && tasks.push({ t: x, done: false }));
    if (st.k === 'diag') add(T3(`Пробный тест: ${examTxt}`, `Mock test: ${examTxt}`, `Sinov testi: ${examTxt}`),
      T3('Записать баллы и разрыв до цели', 'Write down your scores and the gap to your target', 'Ballaringizni va maqsadgacha farqni yozib qoʻying'),
      T3(`Изучить сайт ${uniName}: требования и документы`, `Study the ${uniName} website: requirements and documents`, `${uniName} saytini oʻrganish: talablar va hujjatlar`));
    if (st.k === 'base') {
      add(T3(`${s1}: 3 занятия по ${per} ч`, `${s1}: 3 sessions × ${per} h`, `${s1}: ${per} soatdan 3 ta mashgʻulot`),
        T3(`${s2}: 2 занятия по ${per} ч`, `${s2}: 2 sessions × ${per} h`, `${s2}: ${per} soatdan 2 ta mashgʻulot`),
        needEng ? T3('IELTS: 2 Reading + 2 Listening, 20 новых слов в день', 'IELTS: 2 Reading + 2 Listening, 20 new words a day', 'IELTS: 2 Reading + 2 Listening, kuniga 20 ta yangi soʻz')
          : T3('Решить 30 задач из прошлых экзаменов', 'Solve 30 past-exam problems', 'Oʻtgan imtihonlardan 30 ta masala yechish'));
      if (needSat) add(T3('SAT Math: 1 модуль в Bluebook', 'SAT Math: 1 module in Bluebook', 'SAT Math: Bluebookda 1 modul'));
      if (w % 4 === 0) add(T3('Пробный тест и разбор ошибок', 'Mock test and error review', 'Sinov testi va xatolar tahlili'));
    }
    if (st.k === 'exams') {
      if (first) add(T3(`Зарегистрироваться на экзамен: ${examTxt}`, `Register for the exam: ${examTxt}`, `Imtihonga roʻyxatdan oʻtish: ${examTxt}`));
      add(T3('Полный пробный тест на время', 'Full timed mock test', 'Vaqtga qarab toʻliq sinov testi'),
        T3('Тетрадь ошибок: разобрать все ошибки недели', 'Error log: review all of this week’s mistakes', 'Xatolar daftari: haftaning barcha xatolarini tahlil qilish'));
      if (needEng) add(T3('Writing: 2 эссе, Speaking: 3 записи себя', 'Writing: 2 essays, Speaking: record yourself 3 times', 'Writing: 2 ta insho, Speaking: oʻzingizni 3 marta yozib oling'));
    }
    if (st.k === 'docs') {
      if (foreign) add(T3('Мотивационное письмо: черновик или правка', 'Motivation letter: draft or edit', 'Motivatsion xat: qoralama yoki tahrir'));
      if (first) add(foreign ? T3('Попросить 2 рекомендации у учителей', 'Ask 2 teachers for recommendation letters', 'Oʻqituvchilardan 2 ta tavsiyanoma soʻrash') : T3('Регистрация на my.gov.uz', 'Register on my.gov.uz', 'my.gov.uz da roʻyxatdan oʻtish'),
        foreign && T3('Перевод и апостиль аттестата', 'Translate and apostille your diploma', 'Attestat tarjimasi va apostili'));
      if (s.field && needsPortfolio(s.field)) add(T3('Портфолио: 2 новые работы', 'Portfolio: 2 new pieces', 'Portfolio: 2 ta yangi ish'));
    }
    if (st.k === 'apply') {
      add(T3(`Заполнить заявку в ${uniName}`, `Fill in the ${uniName} application`, `${uniName} arizasini toʻldirish`),
        T3('Подать заявку на грант', 'Apply for a grant', 'Grantga ariza berish'));
      if (w === W) add(T3('Проверить, что всё отправлено, и сохранить подтверждения', 'Check everything is submitted and save confirmations', 'Hammasi yuborilganini tekshirish va tasdiqlarni saqlash'));
    }
    weeks.push({ stage: st.k, tasks });
  }

  // ключевые даты — их можно добавить в календарь
  const at = p => iso(addDays(start, Math.round((W * 7 - 1) * p)));
  const marks = [];
  const mark = (title, date, kind, note = '', url = '') => marks.push({ title, date, kind, note, url });
  mark(T3(`Пробный тест: ${examTxt}`, `Mock test: ${examTxt}`, `Sinov testi: ${examTxt}`), at(.02), 'task');
  if (exams.length) {
    mark(T3(`Регистрация на экзамен: ${examTxt}`, `Exam registration: ${examTxt}`, `Imtihonga roʻyxatdan oʻtish: ${examTxt}`), at(.43), 'exam');
    mark(T3(`Сдать экзамен: ${examTxt}`, `Take the exam: ${examTxt}`, `Imtihon topshirish: ${examTxt}`), at(.62), 'exam');
  }
  if (u && u[6].includes('f')) mark(T3('Выбрать Foundation / подготовительный год', 'Choose a Foundation / prep year', 'Foundation / tayyorlov yilini tanlash'), at(.5), 'task', T3('После 11 классов вуз просит Foundation или 1 курс вуза', 'After 11-year school the university asks for Foundation or 1 year of university', '11 yillik maktabdan keyin oliygoh Foundation yoki 1-kursni soʻraydi'));
  if (u && u[6].includes('s')) mark(T3('Заявка в Studienkolleg (uni-assist)', 'Studienkolleg application (uni-assist)', 'Studienkollegga ariza (uni-assist)'), at(.75), 'deadline', '', 'https://www.uni-assist.de');
  if (foreign) mark(T3('Мотивационное письмо и рекомендации готовы', 'Motivation letter and references ready', 'Motivatsion xat va tavsiyanomalar tayyor'), at(.85), 'task');
  mark(T3(`Подача в ${uniName}`, `Apply to ${uniName}`, `${uniName}ga hujjat topshirish`), s.deadline, 'deadline', '', '');
  // гранты страны вуза на бакалавриат, срок которых попадает в план (магистерские не берём)
  const MASTER_ONLY = ['chevening', 'gks_g', 'daad', 'em', 'eyuf', 'au_awards'];
  DEADLINES.filter(dl => dl.type === 'grant' && !MASTER_ONLY.includes(dl.id) && ccMatch(dl, cc)).forEach(dl => {
    const d = nextDate(dl);
    if (d <= addDays(end, 60)) mark(tx(dl.n), iso(d), 'grant', tx(dl.note), dl.url);
  });
  marks.sort((a, b) => a.date.localeCompare(b.date));
  return { uni: s.uni, field: s.field, deadline: s.deadline, eng: s.eng, hours: s.hours, start: iso(start), lang: LANG, weeks, marks };
}

// ---------- вид: настройка ----------
const ENG = [['none', L('Не учил(а)', 'Haven’t studied')], ['a2', L('Начальный (A1–A2)', 'Beginner (A1–A2)')], ['b1', L('Средний (B1)', 'Intermediate (B1)')],
  ['b2', L('Выше среднего (B2)', 'Upper-intermediate (B2)')], ['c1', L('Продвинутый (C1+)', 'Advanced (C1+)')], ['ielts', L('IELTS уже сдан', 'Already have IELTS')]];

function renderSetup() {
  const u = SETUP.uni ? findUni(SETUP.uni[0], SETUP.uni[1]) : null;
  const hints = u ? deadlineHints(u[1]) : [];
  const favs = FAVS ? [...FAVS.values()].map(f => findUni(f.name, /^[A-Z]{2}$/.test(f.place) ? f.place : null)).filter(Boolean) : [];
  app.innerHTML = `
    <div class="page-head"><span class="kicker">${t('nav_tools')}</span><h1>${t('pl_title')}</h1><p>${t('pl_lead')}</p></div>
    <article class="card">
      <h4 class="rank" style="margin:0 0 14px">1 · ${T3('Вуз', 'University', 'Oliygoh')}</h4>
      <div class="pick-uni" style="margin-top:0">${u
        ? `<span class="chip gold">${escapeHtml(nm(u[0]))} · ${escapeHtml(placeName(u[1]))}<button type="button" id="uniClear" aria-label="${t('delete')}">×</button></span>
           <button type="button" class="btn btn-ghost" id="uniPick">${T3('Другой вуз', 'Another university', 'Boshqa oliygoh')}</button>`
        : `<button type="button" class="btn btn-gold" id="uniPick">+ ${T3('Выбрать вуз', 'Choose a university', 'Oliygoh tanlash')}</button>`}</div>
      ${!u && favs.length ? `<p class="note">${T3('Из избранного', 'From your saved', 'Saralanganlardan')}:</p><div class="chips-pick">${favs.slice(0, 8).map(f =>
        `<button type="button" class="chip-btn" data-fav="${escapeHtml(uniKey(f))}">${escapeHtml(nm(f[0]))}</button>`).join('')}</div>` : ''}
      <h4 class="rank" style="margin:28px 0 14px">2 · ${T3('Направление', 'Field', 'Yoʻnalish')}</h4>
      <select class="select" id="field" style="max-width:420px">${fieldOptions(SETUP.field, T3('Ещё не выбрал(а)', 'Not chosen yet', 'Hali tanlanmagan'))}</select>
      <h4 class="rank" style="margin:28px 0 14px">3 · ${T3('Дедлайн подачи', 'Application deadline', 'Topshirish muddati')}</h4>
      <input class="input" type="date" id="deadline" value="${SETUP.deadline}" min="${iso(addDays(today(), 14))}" style="max-width:240px">
      ${hints.length ? `<p class="note">${T3('Подсказка — сроки для этой страны', 'Suggested — deadlines for this country', 'Maslahat — bu mamlakat muddatlari')}:</p>
        <div class="chips-pick">${hints.map(h => `<button type="button" class="chip-btn ${iso(h.d) === SETUP.deadline ? 'on' : ''}" data-dl="${iso(h.d)}">${escapeHtml(tx(h.dl.n))} — ${fmt(h.d, true)}</button>`).join('')}</div>` : ''}
      <div class="calc-form" style="margin-top:28px">
        <label class="calc-field"><span>${T3('Английский сейчас', 'Your English now', 'Hozirgi ingliz tili')}</span><select class="select" id="eng">${ENG.map(([v, n]) => `<option value="${v}" ${v === SETUP.eng ? 'selected' : ''}>${tx(n)}</option>`).join('')}</select></label>
        <label class="calc-field"><span>${T3('Часов в неделю', 'Hours per week', 'Haftasiga soat')}: <b id="hoursV">${SETUP.hours}</b></span><input type="range" id="hours" min="4" max="30" step="1" value="${SETUP.hours}"></label>
      </div>
      <div class="more-row" style="justify-content:flex-start;margin-top:26px">
        <button class="btn btn-gold btn-lg" id="build">${T3('Составить план', 'Build my plan', 'Reja tuzish')} →</button>
        ${PLAN ? `<button class="btn btn-ghost" id="toView">${T3('Вернуться к моему плану', 'Back to my plan', 'Rejamga qaytish')}</button>` : ''}
      </div>
      <p class="note">${T3('Сайт сам распределит подготовку по неделям до дедлайна. Потом план можно поправить вручную.', 'We’ll spread your prep over the weeks until the deadline. You can edit the plan afterwards.', 'Sayt tayyorgarlikni muddatgacha haftalarga taqsimlaydi. Keyin rejani qoʻlda tahrirlash mumkin.')}</p>
    </article>`;
}

// ---------- вид: ручная правка ----------
function renderEdit() {
  const start = fromIso(PLAN.start);
  app.innerHTML = `
    <div class="page-head"><span class="kicker">${t('pl_title')}</span><h1>${T3('Настрой план под себя', 'Make the plan yours', 'Rejani oʻzingizga moslang')}</h1>
      <p>${T3('Это совет сайта. Измени задачи, удали лишнее, добавь своё. Ключевые даты ниже можно потом добавить в календарь.', 'This is our suggestion. Change tasks, remove what you don’t need, add your own. The key dates below can go to your calendar.', 'Bu saytning maslahati. Vazifalarni oʻzgartiring, keraksizini oʻchiring, oʻzingiznikini qoʻshing. Pastdagi asosiy sanalarni keyin taqvimga qoʻshish mumkin.')}</p></div>
    <article class="card"><h4 class="rank" style="margin:0 0 16px">${T3('Ключевые даты', 'Key dates', 'Asosiy sanalar')}</h4>
      <div class="ed-marks">${PLAN.marks.map((m, i) => `<div class="ed-row" data-m="${i}">
        <input class="input" type="date" data-f="date" value="${m.date}"><input class="input" data-f="title" value="${escapeHtml(m.title)}" maxlength="200">
        <button type="button" class="ed-del" data-del-m="${i}" aria-label="${t('delete')}">×</button></div>`).join('')}</div>
      <button type="button" class="btn btn-ghost" id="addMark" style="margin-top:12px">+ ${T3('Дата', 'Date', 'Sana')}</button></article>
    ${PLAN.weeks.map((wk, w) => `<article class="card plan-week">
      <div class="plan-head"><b>${t('pl_week')} ${w + 1}</b><span>${fmt(addDays(start, w * 7))} – ${fmt(addDays(start, w * 7 + 6))} · ${tx(STAGES.find(s => s.k === wk.stage).n)}</span></div>
      ${wk.tasks.map((task, i) => `<div class="ed-row" data-w="${w}" data-i="${i}"><input class="input" data-f="task" value="${escapeHtml(task.t)}" maxlength="200">
        <button type="button" class="ed-del" data-del-t="${w}:${i}" aria-label="${t('delete')}">×</button></div>`).join('')}
      <button type="button" class="btn btn-ghost ed-add" data-add="${w}">+ ${T3('Задача', 'Task', 'Vazifa')}</button></article>`).join('')}
    <div class="ed-bar"><button class="btn btn-gold btn-lg" id="savePlan">${T3('Сохранить план', 'Save plan', 'Rejani saqlash')}</button>
      <button class="btn btn-ghost" id="toSetup">← ${T3('Настройки', 'Settings', 'Sozlamalar')}</button></div>`;
}

// ---------- вид: мой план ----------
let EVENTS = [];
const inCal = m => EVENTS.some(e => e.title === m.title && e.date === m.date);
function currentWeek() { return Math.min(PLAN.weeks.length, Math.max(1, Math.floor((today() - fromIso(PLAN.start)) / (7 * 864e5)) + 1)); }

function renderView() {
  const start = fromIso(PLAN.start), cur = currentWeek();
  const u = PLAN.uni ? findUni(PLAN.uni[0], PLAN.uni[1]) : null;
  const total = PLAN.weeks.reduce((n, wk) => n + wk.tasks.length, 0);
  const done = PLAN.weeks.reduce((n, wk) => n + wk.tasks.filter(x => x.done).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  const left = Math.max(0, Math.ceil((fromIso(PLAN.deadline) - today()) / (7 * 864e5)));
  const visible = PLAN.weeks.map((wk, w) => ({ wk, w })).filter(x => showAll || (x.w + 1 >= cur - 1 && x.w + 1 <= cur + 3));
  app.innerHTML = `
    <div class="page-head"><span class="kicker">${[u ? nm(u[0]) : '', PLAN.field ? tx(FIELDS[PLAN.field].name) : ''].filter(Boolean).map(escapeHtml).join(' · ') || t('nav_tools')}</span>
      <h1>${t('pl_title')}</h1><p>${T3('Дедлайн', 'Deadline', 'Muddat')}: <b>${fmt(fromIso(PLAN.deadline), true)}</b></p></div>
    <article class="card">
      <div class="cost-grid">
        <div class="cost-cell big"><small>${t('pl_left')}</small><b>${left} ${t('pl_weeks')}</b><span>${t('pl_week')} ${cur} / ${PLAN.weeks.length}</span></div>
        <div class="cost-cell big"><small>${t('pl_done')}</small><b>${pct}%</b><span>${done} / ${total}</span></div>
      </div>
      <div class="meter" style="margin:20px 0 0"><div class="bar"><span style="width:${pct}%"></span></div></div>
      <div class="more-row" style="justify-content:flex-start"><button class="btn btn-ghost" id="toEdit">${T3('Изменить план', 'Edit plan', 'Rejani tahrirlash')}</button>
        <button class="btn btn-ghost" id="toCal">${T3('Добавить в календарь', 'Add to calendar', 'Taqvimga qoʻshish')}</button>
        <button class="btn btn-ghost" id="newPlan">${T3('Новый план', 'New plan', 'Yangi reja')}</button></div>
    </article>
    <article class="card"><h4 class="rank" style="margin:0 0 14px">${T3('Ключевые даты', 'Key dates', 'Asosiy sanalar')}</h4>
      <ul class="list">${PLAN.marks.map(m => `<li><div><b>${fmt(fromIso(m.date), true)}</b> — ${escapeHtml(m.title)}${inCal(m) ? ` <span class="chip gold" style="margin-left:6px">${T3('в календаре', 'in calendar', 'taqvimda')} ✓</span>` : ''}</div></li>`).join('')}</ul></article>
    ${visible.map(({ wk, w }) => {
      const all = wk.tasks.length && wk.tasks.every(x => x.done);
      return `<article class="card plan-week ${w + 1 === cur ? 'now' : ''} ${all ? 'done' : ''}">
        <div class="plan-head"><b>${t('pl_week')} ${w + 1}</b><span>${fmt(addDays(start, w * 7))} – ${fmt(addDays(start, w * 7 + 6))} · ${tx(STAGES.find(s => s.k === wk.stage).n)}</span>
          ${w + 1 === cur ? `<em>${t('pl_now')}</em>` : ''}</div>
        ${wk.tasks.map((task, i) => `<label class="plan-task"><input type="checkbox" data-k="${w}:${i}" ${task.done ? 'checked' : ''}><span>${escapeHtml(task.t)}</span></label>`).join('')}
      </article>`;
    }).join('')}
    <div class="more-row"><button class="btn btn-ghost" id="toggle">${t(showAll ? 'pl_hide' : 'pl_show_all')}</button></div>`;
}

function render() {
  if (mode === 'edit' && PLAN) renderEdit();
  else if (mode === 'view' && PLAN) renderView();
  else renderSetup();
}

// ---------- выбор вуза ----------
function pickUni() {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${T3('Выбери вуз', 'Choose a university', 'Oliygohni tanlang')}</h3>
    <input class="input" type="search" placeholder="${t('cat_search')}" autocomplete="off">
    <div class="pick-list"></div><div class="row"><button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button></div></div>`;
  const $in = back.querySelector('input'), $list = back.querySelector('.pick-list');
  const draw = () => {
    const q = $in.value.trim().toLowerCase();
    $list.innerHTML = UNIS.filter(u => uniFits(u, SETUP.field) && (!q || u[0].toLowerCase().includes(q) || placeName(u[1]).toLowerCase().includes(q)))
      .sort((a, b) => a[5] - b[5] || b[4] - a[4]).slice(0, 60)
      .map(u => `<button type="button" data-k="${escapeHtml(uniKey(u))}">${escapeHtml(nm(u[0]))}<span>${escapeHtml(placeName(u[1]))}</span></button>`).join('') || `<div class="empty">${t('cat_empty')}</div>`;
  };
  back.addEventListener('click', e => {
    if (e.target === back || e.target.closest('[data-close]')) return back.remove();
    const b = e.target.closest('[data-k]');
    if (!b) return;
    setUni(UNIS.find(u => uniKey(u) === b.dataset.k));
    back.remove();
  });
  $in.addEventListener('input', draw);
  document.body.appendChild(back);
  draw(); $in.focus();
}
function setUni(u) {
  SETUP.uni = u ? [u[0], u[1]] : null;
  // дедлайн не задан — берём ближайший срок подачи для страны вуза
  if (u && !SETUP.deadline) { const h = deadlineHints(u[1])[0]; if (h) SETUP.deadline = iso(h.d); }
  renderSetup();
}

// ---------- сохранение и календарь ----------
async function savePlan() {
  const r = await api('/api/plan', { method: 'PUT', body: { plan: PLAN } });
  if (!r.ok) { toast(t('err_server')); return false; }
  return true;
}

// «Вставить план в календарь?» — да / нет / частично (выбрать даты)
async function offerCalendar() {
  const v = await ask(T3('Добавить план в календарь?', 'Add the plan to your calendar?', 'Rejani taqvimga qoʻshasizmi?'),
    T3(`В календарь попадут ключевые даты плана (${PLAN.marks.length}). В календаре будет только то, что ты добавишь сам.`, `The plan’s key dates (${PLAN.marks.length}) will go to your calendar. Your calendar only shows what you add yourself.`, `Rejaning asosiy sanalari (${PLAN.marks.length}) taqvimga tushadi. Taqvimda faqat siz qoʻshgan narsalar boʻladi.`),
    [{ v: 'all', label: T3('Да, всё', 'Yes, all', 'Ha, hammasi'), gold: true }, { v: 'some', label: T3('Частично', 'Some of it', 'Qisman') }, { v: null, label: T3('Нет', 'No', 'Yoʻq') }]);
  if (!v) return;
  let items = PLAN.marks;
  if (v === 'some') {
    items = await pickMarks();
    if (!items || !items.length) return;
  }
  const r = await api('/api/events', { method: 'POST', body: { items } });
  if (!r.ok) return toast(t(r.data.error === 'too_many' ? 'err_too_many' : 'err_server'));
  await loadEvents();
  render();
  toast(T3(`Добавлено в календарь: ${items.length}`, `Added to calendar: ${items.length}`, `Taqvimga qoʻshildi: ${items.length}`));
}

// Окно с галочками: какие даты добавить
function pickMarks() {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${T3('Что добавить в календарь?', 'What to add to the calendar?', 'Taqvimga nimani qoʻshish kerak?')}</h3>
      <div class="pick-marks">${PLAN.marks.map((m, i) => `<label class="plan-task"><input type="checkbox" value="${i}" ${inCal(m) ? 'disabled' : ''}>
        <span><b>${fmt(fromIso(m.date), true)}</b> — ${escapeHtml(m.title)}${inCal(m) ? ` · ${T3('уже в календаре', 'already in calendar', 'allaqachon taqvimda')}` : ''}</span></label>`).join('')}</div>
      <div class="row" style="margin-top:18px"><button type="button" class="btn btn-gold" data-ok>${T3('Добавить выбранное', 'Add selected', 'Tanlanganini qoʻshish')}</button>
        <button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button></div></div>`;
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) { back.remove(); return resolve(null); }
      if (e.target.closest('[data-ok]')) {
        const items = [...back.querySelectorAll('input:checked')].map(c => PLAN.marks[c.value]);
        back.remove(); resolve(items);
      }
    });
    document.body.appendChild(back);
  });
}

async function loadEvents() {
  const r = await api('/api/events');
  EVENTS = r.ok ? r.data.events : [];
}

// ---------- события ----------
app.addEventListener('input', e => {
  const f = e.target.dataset.f;
  if (e.target.id === 'hours') { SETUP.hours = +e.target.value; document.getElementById('hoursV').textContent = SETUP.hours; return; }
  if (!f || mode !== 'edit') return;
  const row = e.target.closest('.ed-row');
  if (f === 'task') PLAN.weeks[row.dataset.w].tasks[row.dataset.i].t = e.target.value;
  else PLAN.marks[row.dataset.m][f] = e.target.value;
});
app.addEventListener('change', e => {
  if (e.target.id === 'field') { SETUP.field = e.target.value; return; }
  if (e.target.id === 'deadline') { SETUP.deadline = e.target.value; return; }
  if (e.target.id === 'eng') { SETUP.eng = e.target.value; return; }
  const k = e.target.dataset && e.target.dataset.k;
  if (!k || mode !== 'view') return;
  const [w, i] = k.split(':').map(Number);
  PLAN.weeks[w].tasks[i].done = e.target.checked;
  renderView();
  clearTimeout(app._t);
  app._t = setTimeout(savePlan, 500);
});
app.addEventListener('click', async e => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.id === 'uniPick') return pickUni();
  if (el.id === 'uniClear') return setUni(null);
  if (el.dataset.fav) return setUni(UNIS.find(u => uniKey(u) === el.dataset.fav));
  if (el.dataset.dl) { SETUP.deadline = el.dataset.dl; return renderSetup(); }
  if (el.id === 'build') {
    if (!SETUP.deadline || fromIso(SETUP.deadline) < addDays(today(), 14)) return toast(T3('Выбери дедлайн — хотя бы через 2 недели', 'Pick a deadline at least 2 weeks away', 'Kamida 2 hafta keyingi muddatni tanlang'));
    PLAN = buildPlan(SETUP); mode = 'edit'; render(); scrollTo(0, 0); return;
  }
  if (el.id === 'toView') { mode = 'view'; return render(); }
  if (el.id === 'toSetup') { mode = 'setup'; render(); return scrollTo(0, 0); }
  if (el.id === 'toEdit') { mode = 'edit'; render(); return scrollTo(0, 0); }
  if (el.id === 'toggle') { showAll = !showAll; return renderView(); }
  if (el.id === 'toCal') return offerCalendar();
  if (el.id === 'newPlan') {
    const v = await ask(T3('Составить новый план?', 'Build a new plan?', 'Yangi reja tuzasizmi?'), T3('Текущий план заменится после сохранения нового. События в календаре останутся.', 'Your current plan is replaced once you save the new one. Calendar events stay.', 'Yangisini saqlaganingizda joriy reja almashtiriladi. Taqvimdagi voqealar qoladi.'),
      [{ v: 'yes', label: T3('Да', 'Yes', 'Ha'), gold: true }, { v: null, label: t('cancel') }]);
    if (v) { mode = 'setup'; render(); }
    return;
  }
  if (el.dataset.add != null) { PLAN.weeks[el.dataset.add].tasks.push({ t: '', done: false }); renderEdit(); app.querySelector(`.ed-row[data-w="${el.dataset.add}"]:last-of-type input`)?.focus(); return; }
  if (el.dataset.delT) { const [w, i] = el.dataset.delT.split(':').map(Number); PLAN.weeks[w].tasks.splice(i, 1); return renderEdit(); }
  if (el.dataset.delM != null) { PLAN.marks.splice(+el.dataset.delM, 1); return renderEdit(); }
  if (el.id === 'addMark') { PLAN.marks.push({ title: '', date: PLAN.deadline, kind: 'task', note: '', url: '' }); return renderEdit(); }
  if (el.id === 'savePlan') {
    // пустые задачи и даты без названия не сохраняем
    PLAN.weeks.forEach(wk => wk.tasks = wk.tasks.filter(x => x.t.trim()));
    PLAN.marks = PLAN.marks.filter(m => m.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(m.date)).sort((a, b) => a.date.localeCompare(b.date));
    if (!await savePlan()) return;
    mode = 'view'; render(); scrollTo(0, 0);
    toast(T3('План сохранён', 'Plan saved', 'Reja saqlandi'));
    return offerCalendar();
  }
});
document.addEventListener('langchange', render);

document.addEventListener('DOMContentLoaded', async () => {
  if (!await loadMe()) { location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search); return; }
  await loadFavs();
  const [p, results] = await Promise.all([api('/api/plan'), api('/api/results'), loadEvents()]);
  if (p.ok && p.data.plan) { PLAN = p.data.plan; mode = 'view'; }
  // подсказки для настройки: направление и срок из теста «Подготовка» или «Университет»
  const rs = results.ok ? results.data.results : [];
  const rid = params.get('result');
  const prep = rs.find(r => String(r.id) === rid) || rs.find(r => r.category === 'prep');
  const uniRes = rs.find(r => r.category === 'university');
  if (prep && prep.summary.field) {
    SETUP.field = prep.summary.field;
    if (prep.summary.when) SETUP.deadline = iso(addDays(today(), Math.round(prep.summary.when * 30.4)));
    if (prep.summary.hours) SETUP.hours = Math.min(30, Math.max(4, prep.summary.hours));
    if (prep.summary.eng) SETUP.eng = { a: 'a2', b1: 'b1', b2: 'b2', c1: 'c1', ielts: 'ielts' }[prep.summary.eng] || 'b1';
  } else if (uniRes && uniRes.summary.fields) SETUP.field = uniRes.summary.fields[0].id;
  if (params.get('name')) { const u = findUni(params.get('name'), params.get('cc')); if (u) { SETUP.uni = [u[0], u[1]]; mode = 'setup'; } }
  if (rid) mode = 'setup';
  if (SETUP.uni && !SETUP.deadline) { const h = deadlineHints(SETUP.uni[1])[0]; if (h) SETUP.deadline = iso(h.d); }
  render();
  gsap.from('.page-head > *, .card', { y: 30, opacity: 0, stagger: .05, duration: 1, ease: 'expo.out' });
});
