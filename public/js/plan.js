// Личный план по неделям из результата «Подготовка к вузу». Галочки сохраняются на сервере.
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
let RES = null, PLAN = [], CHECKS = new Set(), showAll = false;

const T = (ru, en) => ({ ru, en });

// Этапы — те же доли срока, что в дорожной карте результата
const STAGES = [
  { p: .06, k: 'diag', n: T('Диагностика', 'Diagnosis') },
  { p: .45, k: 'base', n: T('База', 'Foundation') },
  { p: .7, k: 'exams', n: T('Экзамены', 'Exams') },
  { p: .85, k: 'docs', n: T('Документы', 'Documents') },
  { p: 1, k: 'apply', n: T('Подача и гранты', 'Applications & grants') },
];

function buildPlan(s) {
  const W = Math.max(4, Math.round(s.when * 4.33));
  const targets = s.targets.length ? s.targets : ['uz'];
  const foreign = targets.some(x => x !== 'uz');
  const needEng = foreign && !['c1', 'ielts'].includes(s.eng);
  const [s1, s2] = subjectsOf(s.field).map(x => x);
  const per = Math.max(1, Math.round(s.hours / 6));
  const mocks = [foreign && 'IELTS', targets.includes('us') && 'SAT', targets.includes('uz') && 'uzbmb'].filter(Boolean).join(' + ') || 'uzbmb';
  const weeks = [];
  let prevStage = '';
  for (let w = 1; w <= W; w++) {
    const st = STAGES.find(x => w / W <= x.p + 1e-9) || STAGES[STAGES.length - 1];
    const first = st.k !== prevStage;
    prevStage = st.k;
    const tasks = [];
    if (st.k === 'diag') {
      tasks.push(T(`Пробный тест: ${mocks}`, `Mock test: ${mocks}`),
        T('Записать баллы и разрыв до цели', 'Write down your scores and the gap to your target'),
        T('Выбрать 8–10 вузов в каталоге и отметить ♡', 'Pick 8–10 universities in the catalogue and save them ♡'),
        T('Отметить нужные дедлайны в календаре', 'Follow the deadlines you need in the calendar'));
    }
    if (st.k === 'base') {
      tasks.push(T(`${s1.ru}: 3 занятия по ${per} ч`, `${s1.en}: 3 sessions × ${per} h`),
        T(`${s2.ru}: 2 занятия по ${per} ч`, `${s2.en}: 2 sessions × ${per} h`),
        needEng ? T('IELTS: 2 Reading + 2 Listening, 20 новых слов в день', 'IELTS: 2 Reading + 2 Listening, 20 new words a day')
          : T('Решить 30 задач из прошлых экзаменов', 'Solve 30 past-exam problems'));
      if (w % 4 === 0) tasks.push(T('Пробный тест и разбор ошибок', 'Mock test and error review'));
      if (s.weak.includes('math')) tasks.push(T('Khan Academy: 1 тема + 10 задач в день', 'Khan Academy: 1 topic + 10 problems a day'));
      if (s.weak.includes('motiv')) tasks.push(T('5 дней подряд по Pomodoro', 'Pomodoro 5 days in a row'));
    }
    if (st.k === 'exams') {
      if (first) tasks.push(T(`Зарегистрироваться на экзамен: ${mocks}`, `Register for the exam: ${mocks}`));
      tasks.push(T('Полный пробный тест на время', 'Full timed mock test'), T('Тетрадь ошибок: разобрать все ошибки недели', 'Error log: review all of this week’s mistakes'));
      if (needEng) tasks.push(T('Writing: 2 эссе, Speaking: 3 записи себя', 'Writing: 2 essays, Speaking: record yourself 3 times'));
    }
    if (st.k === 'docs') {
      tasks.push(T('Мотивационное письмо: черновик или правка', 'Motivation letter: draft or edit'));
      if (first) tasks.push(T('Попросить 2 рекомендации у учителей', 'Ask 2 teachers for recommendation letters'),
        foreign ? T('Перевод и апостиль аттестата', 'Translate and apostille your diploma') : T('Регистрация на my.gov.uz', 'Register on my.gov.uz'));
      if (needsPortfolio(s.field)) tasks.push(T('Портфолио: 2 новые работы', 'Portfolio: 2 new pieces'));
      if (s.weak.includes('docs')) tasks.push(T('Показать письмо 2 людям и переписать', 'Show your letter to 2 people and rewrite it'));
    }
    if (st.k === 'apply') {
      tasks.push(T('Подать заявки в 2 вуза', 'Apply to 2 universities'), T('Подать заявку на грант', 'Apply for a grant'));
      if (w === W) tasks.push(T('Проверить статусы и письма от вузов', 'Check application statuses and emails'));
    }
    weeks.push({ w, stage: st, tasks });
  }
  return weeks;
}

const weekStart = w => new Date(new Date(RES.created_at.replace(' ', 'T') + 'Z').getTime() + (w - 1) * 7 * 864e5);
const currentWeek = () => Math.min(PLAN.length, Math.max(1, Math.floor((Date.now() - weekStart(1)) / (7 * 864e5)) + 1));

function render() {
  if (!RES) {
    app.innerHTML = `<div class="page-head"><span class="kicker">${t('nav_tools')}</span><h1>${t('pl_title')}</h1></div>
      <div class="empty">${t('pl_none')}<div class="more-row"><a class="btn btn-gold" href="/test?cat=prep">${tx(CATEGORIES.prep.title)} →</a></div></div>`;
    return;
  }
  const cur = currentWeek();
  const total = PLAN.reduce((n, wk) => n + wk.tasks.length, 0);
  const done = PLAN.reduce((n, wk) => n + wk.tasks.filter((_, i) => CHECKS.has(`${wk.w}:${i}`)).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  const visible = showAll ? PLAN : PLAN.filter(wk => wk.w >= cur - 1 && wk.w <= cur + 3);
  const fmt = d => d.toLocaleDateString(LANG === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' });
  app.innerHTML = `
    <div class="page-head">
      <span class="kicker">${tx(FIELDS[RES.summary.field].name)}</span>
      <h1>${t('pl_title')}</h1>
      <p>${t('pl_lead')}</p>
    </div>
    <article class="card">
      <div class="cost-grid">
        <div class="cost-cell big"><small>${t('pl_left')}</small><b>${PLAN.length - cur + 1} ${t('pl_weeks')}</b><span>${t('pl_week')} ${cur} / ${PLAN.length}</span></div>
        <div class="cost-cell big"><small>${t('pl_done')}</small><b>${pct}%</b><span>${done} / ${total}</span></div>
      </div>
      <div class="meter" style="margin:20px 0 0"><div class="bar"><span style="width:${pct}%"></span></div></div>
    </article>
    ${visible.map(wk => {
      const all = wk.tasks.every((_, i) => CHECKS.has(`${wk.w}:${i}`));
      return `<article class="card plan-week ${wk.w === cur ? 'now' : ''} ${all ? 'done' : ''}">
        <div class="plan-head"><b>${t('pl_week')} ${wk.w}</b><span>${fmt(weekStart(wk.w))} – ${fmt(new Date(weekStart(wk.w).getTime() + 6 * 864e5))} · ${tx(wk.stage.n)}</span>
          ${wk.w === cur ? `<em>${t('pl_now')}</em>` : ''}</div>
        ${wk.tasks.map((task, i) => `<label class="plan-task"><input type="checkbox" data-k="${wk.w}:${i}" ${CHECKS.has(`${wk.w}:${i}`) ? 'checked' : ''}><span>${escapeHtml(tx(task))}</span></label>`).join('')}
      </article>`;
    }).join('')}
    <div class="more-row"><button class="btn btn-ghost" id="toggle">${t(showAll ? 'pl_hide' : 'pl_show_all')}</button></div>`;
  document.getElementById('toggle').onclick = () => { showAll = !showAll; render(); };
}

let saveTimer;
app.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.k;
  if (!k) return;
  e.target.checked ? CHECKS.add(k) : CHECKS.delete(k);
  render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const r = await api('/api/plan/' + RES.id, { method: 'PUT', body: { checks: [...CHECKS] } });
    if (!r.ok) toast(t('err_server'));
  }, 400);
});
document.addEventListener('langchange', render);

document.addEventListener('DOMContentLoaded', async () => {
  if (!await loadMe()) { location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search); return; }
  let rid = params.get('result');
  if (!/^\d{1,12}$/.test(rid || '')) {
    const r = await api('/api/results');
    const last = (r.data.results || []).find(x => x.category === 'prep');
    rid = last ? last.id : null;
  }
  if (rid) {
    const [r, p] = await Promise.all([api('/api/results/' + rid), api('/api/plan/' + rid)]);
    if (r.ok && r.data.category === 'prep') {
      RES = r.data;
      PLAN = buildPlan(RES.summary);
      CHECKS = new Set(p.ok ? p.data.checks : []);
    }
  }
  render();
  gsap.from('.page-head > *, .card', { y: 30, opacity: 0, stagger: .05, duration: 1, ease: 'expo.out' });
});
