// Тест: вопросы → расчёт → рекомендации
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const CAT = CATEGORIES[params.get('cat')] ? params.get('cat') : 'university';
const cat = CATEGORIES[CAT];
const QIDS = cat.questions;

let idx = -1;              // -1 = экран-приветствие
let answers = {};
let view = 'quiz';         // quiz | result
let current = null;        // { category, answers, summary } для рендера результата

const loadProfile = () => { try { return JSON.parse(localStorage.getItem('kj_profile') || '{}'); } catch { return {}; } };
const saveProfile = () => {
  const p = {}; PROFILE.forEach(k => { if (answers[k] !== undefined) p[k] = answers[k]; });
  try { localStorage.setItem('kj_profile', JSON.stringify(p)); } catch {}
};

// ---------- экран вопросов ----------
function sectionLabel(qid) {
  if (qid.startsWith('p_')) return t('section_profile');
  return t({ university: 'section_main', work: 'section_work', prep: 'section_prep' }[CAT]);
}

function isAnswered(qid) {
  const a = answers[qid], q = Q[qid];
  if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
  return a !== undefined && a !== null;
}

function renderIntro() {
  app.innerHTML = `
    <div class="intro">
      <span class="kicker">${tx(cat.title)} · ${t('minutes')}</span>
      <h1>${tx(cat.title)}</h1>
      <p>${tx(cat.lead)}</p>
      <button class="btn btn-gold btn-lg" id="go">${t('start')} <span class="arrow">→</span></button>
    </div>`;
  document.getElementById('go').onclick = () => go(1);
  gsap.from('.intro > *', { y: 40, opacity: 0, stagger: .1, duration: 1.1, ease: 'expo.out' });
}

function renderQuestion() {
  const qid = QIDS[idx], q = Q[qid];
  const total = QIDS.length;
  let body = '';
  if (q.type === 'range') {
    if (answers[qid] === undefined) answers[qid] = q.def;
    body = `<div class="range-box">
      <div class="range-val"><span id="rv">${answers[qid]}</span><small>${tx(q.unit)}</small></div>
      <input type="range" id="range" min="${q.min}" max="${q.max}" value="${answers[qid]}">
    </div>`;
  } else {
    const sel = q.type === 'multi' ? (answers[qid] || []) : [answers[qid]];
    const full = q.max && sel.length >= q.max;
    body = `<div class="options">${q.options.map(o => {
      const on = sel.includes(o.v);
      return `<button class="opt ${q.type === 'multi' ? 'multi' : ''} ${on ? 'on' : ''} ${full && !on ? 'dim' : ''}" data-v="${o.v}">${tx(o.t)}</button>`;
    }).join('')}</div>`;
  }
  const last = idx === total - 1;
  app.innerHTML = `
    <div class="progress-row"><span class="sect">${sectionLabel(qid)}</span><span>${t('q_of')} ${idx + 1} / ${total}</span></div>
    <div class="progress"><span style="width:${(idx / total) * 100}%"></span></div>
    <div class="q-card">
      <h2>${tx(q.q)}</h2>
      <p class="hint">${q.hint ? tx(q.hint) : ''}</p>
      ${body}
    </div>
    <div class="q-nav">
      <button class="btn btn-ghost" id="back">← ${t('back')}</button>
      <button class="btn btn-gold" id="next" ${isAnswered(qid) ? '' : 'disabled'}>${last ? t('finish') : t('next')} <span class="arrow">→</span></button>
    </div>`;
  requestAnimationFrame(() => { const bar = app.querySelector('.progress span'); if (bar) bar.style.width = `${((idx + 1) / total) * 100}%`; });

  if (q.type === 'range') {
    const r = document.getElementById('range');
    r.oninput = () => { answers[qid] = +r.value; document.getElementById('rv').textContent = r.value; };
  } else {
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(qid, b.dataset.v));
  }
  document.getElementById('back').onclick = () => go(-1);
  document.getElementById('next').onclick = () => go(1);
  gsap.fromTo('.q-card h2, .q-card .hint', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .06, ease: 'expo.out' });
  gsap.fromTo('.opt, .range-box', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .025, ease: 'expo.out', delay: .1 });
}

function pick(qid, v) {
  const q = Q[qid];
  if (q.type === 'single') {
    answers[qid] = v;
    renderQuestionState(qid);
    clearTimeout(pick._t);
    pick._t = setTimeout(() => go(1), 320);
    return;
  }
  let arr = [...(answers[qid] || [])];
  if (arr.includes(v)) arr = arr.filter(x => x !== v);
  else {
    if (v === 'none') arr = [];                 // «ничего» исключает остальные
    else arr = arr.filter(x => x !== 'none');
    if (q.max && arr.length >= q.max) return;
    arr.push(v);
  }
  answers[qid] = arr;
  renderQuestionState(qid);
}

function renderQuestionState(qid) {
  const q = Q[qid];
  const sel = q.type === 'multi' ? (answers[qid] || []) : [answers[qid]];
  const full = q.max && sel.length >= q.max;
  app.querySelectorAll('.opt').forEach(b => {
    const on = sel.includes(b.dataset.v);
    b.classList.toggle('on', on);
    b.classList.toggle('dim', !!full && !on);
  });
  document.getElementById('next').disabled = !isAnswered(qid);
}

function go(dir) {
  if (dir > 0 && idx >= 0 && !isAnswered(QIDS[idx])) return;
  const nextIdx = idx + dir;
  if (nextIdx < -1) return;
  if (nextIdx >= QIDS.length) return finish();
  gsap.to(app.children, {
    opacity: 0, y: dir > 0 ? -20 : 20, duration: .25, ease: 'power2.in',
    onComplete: () => { idx = nextIdx; idx === -1 ? renderIntro() : renderQuestion(); scrollTo(0, 0); },
  });
}

document.addEventListener('keydown', e => {
  if (view !== 'quiz') return;
  if (e.key === 'Enter') go(1);
  if (e.key === 'ArrowLeft' && idx >= 0) go(-1);
});

// ---------- расчёт ----------
function scoreFields(ans) {
  const s = Object.fromEntries(Object.keys(FIELDS).map(k => [k, 0]));
  for (const qid of Object.keys(ans)) {
    const q = Q[qid];
    if (!q || !q.options) continue;
    const vals = Array.isArray(ans[qid]) ? ans[qid] : [ans[qid]];
    for (const v of vals) {
      const o = q.options.find(o => o.v === v);
      if (o && o.w) for (const [f, w] of Object.entries(o.w)) s[f] += w;
    }
  }
  const max = Math.max(1, ...Object.values(s));
  return Object.entries(s)
    .map(([id, v]) => ({ id, pct: Math.max(8, Math.round((v / (max * 1.04)) * 100)) }))
    .sort((a, b) => b.pct - a.pct);
}

function buildSummary() {
  const base = { age: answers.p_age, status: answers.p_status, langs: answers.p_langs || [], eng: answers.p_eng, subjects: answers.p_subjects || [] };
  if (CAT === 'university') return { ...base, fields: scoreFields(answers), regions: answers.u_where || [], budget: answers.u_budget };
  if (CAT === 'work') return { ...base, fields: scoreFields(answers), where: answers.w_where || [], exp: answers.w_exp, format: answers.w_format };
  // prep: если направление выбрано — используем его, иначе считаем по предметам
  const f = answers.r_field !== 'none' ? answers.r_field : scoreFields(answers)[0].id;
  return { ...base, field: f, fieldGuessed: answers.r_field === 'none', when: +answers.r_when, targets: answers.r_target || [],
           grades: answers.r_grades, exams: answers.r_exams || [], hours: +answers.r_hours, weak: answers.r_weak || [] };
}

async function finish() {
  saveProfile();
  view = 'result';
  app.innerHTML = `<div class="loader"><div class="orbit"></div><p>${t('analyzing')}</p></div>`;
  const summary = buildSummary();
  current = { category: CAT, answers, summary };
  const [r] = await Promise.all([api('/api/results', { method: 'POST', body: current }), new Promise(r => setTimeout(r, 1600))]);
  renderResult();
  if (r.ok) toast(t('saved'));
}

// ---------- рендер результата ----------
const optLabel = (qid, v) => { const o = Q[qid].options.find(o => o.v === v); return o ? tx(o.t) : v; };
const li = (items, cls = '') => `<ul class="list">${items.map(i => `<li class="${cls}">${i}</li>`).join('')}</ul>`;

function profileChips(s) {
  const chips = [];
  if (s.age) chips.push(`${s.age} ${tx(Q.p_age.unit)}`);
  if (s.status) chips.push(optLabel('p_status', s.status));
  if (s.eng) chips.push('EN: ' + optLabel('p_eng', s.eng));
  s.langs.forEach(l => chips.push(optLabel('p_langs', l)));
  s.subjects.forEach(x => chips.push(`<span class="chip gold">${optLabel('p_subjects', x)}</span>`));
  return `<div class="profile-chips">${chips.map(c => c.startsWith('<span') ? c : `<span class="chip">${c}</span>`).join('')}</div>`;
}

const lowEnglish = s => ['a', 'b1'].includes(s.eng);

function langTips(s) {
  const map = {
    ko: L('Ты знаешь корейский — большой плюс для GKS и вузов Кореи', 'You know Korean — a big plus for GKS and Korean universities'),
    tr: L('Турецкий открывает обучение в Турции на родном языке страны — и Türkiye Bursları', 'Turkish opens studying in Turkey in the local language — and Türkiye Bursları'),
    de: L('Немецкий — путь в бесплатные государственные вузы Германии', 'German is the path to tuition-free public universities in Germany'),
    zh: L('Китайский даёт преимущество для стипендии CSC', 'Chinese gives an edge for the CSC scholarship'),
    ja: L('Японский усиливает заявку на MEXT', 'Japanese strengthens a MEXT application'),
    ru: L('Русский позволяет поступать в вузы России по квоте', 'Russian lets you apply to Russian universities via the quota'),
    fr: L('Французский — плюс для Sciences Po и вузов Франции', 'French is a plus for Sciences Po and French universities'),
    ar: L('Арабский ценится в дипломатии и в странах Залива', 'Arabic is valued in diplomacy and the Gulf states'),
  };
  return s.langs.filter(l => map[l]).map(l => tx(map[l]));
}

function head(titleKey, s) {
  return `<div class="result-head">
    <span class="kicker">${t('res_kicker')} · ${tx(CATEGORIES[current.category].title)}</span>
    <h1>${t(titleKey)}</h1>
    ${profileChips(s)}
  </div>`;
}

function fieldCard(f, rank, inner) {
  const F = FIELDS[f.id];
  return `<article class="card field-card">
    <div class="top">
      <div class="glyph">${F.glyph}</div>
      <div><div class="rank">#${rank}</div><h3>${tx(F.name)}</h3></div>
    </div>
    <div class="meter"><div class="bar"><span data-w="${f.pct}"></span></div><b>${f.pct}%</b></div>
    <p class="desc">${tx(F.desc)}</p>
    ${inner}
  </article>`;
}

function otherFields(list) {
  return `<article class="card"><h4 class="rank" style="margin:0 0 18px">${LANG === 'ru' ? 'Остальные направления' : 'Other fields'}</h4>
    <div class="mini-bars">${list.map(f => `<div><span>${tx(FIELDS[f.id].name)}</span><i><span style="width:${f.pct}%"></span></i><b>${f.pct}%</b></div>`).join('')}</div></article>`;
}

function renderUniversity(s) {
  const regions = s.regions.filter(r => r !== 'uz');
  const alerts = [];
  if (s.age && s.age < 15) alerts.push(t('age_note_young'));
  if (regions.length && lowEnglish(s)) alerts.push(t('eng_warn'));
  const top = s.fields.slice(0, 3).map((f, i) => {
    const F = FIELDS[f.id];
    const pref = F.world.filter(([, r]) => regions.includes(r));
    const rest = F.world.filter(([, r]) => !regions.includes(r));
    const unis = [...pref, ...rest].slice(0, 7)
      .map(([n, r]) => `<li class="${regions.includes(r) ? 'pref' : ''}">${n}<span class="tag">${tx(REGIONS[r])}</span>${heart(n, r)}</li>`).join('');
    return fieldCard(f, i + 1, `<div class="cols">
      <div><h4>${t('where_strong')}</h4>${li(F.hubs.map(tx))}</div>
      <div><h4>${t('unis_world')}${pref.length ? ` · <span style="color:var(--gold)">${t('your_regions')}</span>` : ''}</h4><ul class="list">${unis}</ul></div>
      <div><h4>${t('unis_uz')}</h4><ul class="list">${F.uz.map(n => `<li>${n}<span class="tag"></span>${heart(n, 'uz')}</li>`).join('')}</ul>
        <p class="note"><a href="/catalog" style="color:var(--gold)">${t('cat_all_link')}</a></p></div>
    </div>`);
  }).join('');

  const gKeys = [...new Set([...(s.regions.length ? s.regions : ['uz']), 'all'])];
  const grants = gKeys.flatMap(k => (GRANTS[k] || []).map(tx));
  const tips = langTips(s);
  return head('res_uni_title', s)
    + alerts.map(a => `<div class="alert">${a}</div>`).join('')
    + top
    + `<article class="card"><div class="cols">
        <div><h4>${t('grants')}</h4>${li(grants)}</div>
        ${tips.length ? `<div><h4>${LANG === 'ru' ? 'Твои языки — твой козырь' : 'Your languages are your edge'}</h4>${li(tips)}</div>` : ''}
      </div>${s.budget === 'grant' || s.budget === 'low' ? `<p class="note">${LANG === 'ru' ? 'С твоим бюджетом делай ставку на гранты: Германия, Венгрия, Турция, Корея, Китай и государственный грант в Узбекистане.' : 'With your budget, focus on grants: Germany, Hungary, Turkey, Korea, China and the state grant in Uzbekistan.'}</p>` : ''}</article>`
    + otherFields(s.fields.slice(3, 9));
}

const PLATFORMS = {
  uz: 'hh.uz · Telegram: UzDev Jobs, Ishbor · olx.uz', remote: 'LinkedIn · Upwork · Wellfound · Toptal',
  uae: 'LinkedIn · Bayt.com · GulfTalent', eu: 'LinkedIn · EURES · StepStone', us: 'LinkedIn · Indeed · Handshake',
  kr: 'Saramin · JobKorea · LinkedIn Japan', tr: 'Kariyer.net · LinkedIn', ru: 'hh.ru · hh.kz',
};

function renderWork(s) {
  const top = s.fields.slice(0, 3).map((f, i) => {
    const F = FIELDS[f.id];
    const jobs = F.jobs.map(j => `<div class="job"><span class="n">${tx(j.n)}</span>
      <span class="s">${tx(j.uz)}<small>${t('salary_uz')}</small></span>
      <span class="s">${tx(j.w)}<small>${t('salary_w')}</small></span></div>`).join('');
    return fieldCard(f, i + 1, `<div class="jobs">${jobs}</div>
      <div class="cols" style="margin-top:24px">
        <div><h4>${t('where_strong')}</h4>${li(F.hubs.map(tx))}</div>
        <div><h4>${t('first_steps')}</h4>${li(F.start.map(tx))}</div>
      </div>`);
  }).join('');
  const where = s.where.length ? s.where : ['uz', 'remote'];
  const plats = where.map(w => `${optLabel('w_where', w)} — ${PLATFORMS[w]}`);
  const expTip = {
    none: L('Начни со стажировок и пет-проектов — работодатели в Узбекистане охотно берут джунов с портфолио.', 'Start with internships and pet projects — employers in Uzbekistan hire juniors with a portfolio.'),
    part: L('Оформи фриланс-опыт в портфолио с цифрами и отзывами — это засчитывается как опыт.', 'Turn freelance work into a portfolio with numbers and reviews — it counts as experience.'),
    y1: L('Ты готов(а) к позиции Junior+/Middle. Подтяни английский для зарубежных вакансий.', 'You’re ready for Junior+/Middle roles. Improve English for foreign vacancies.'),
    y3: L('С опытом 3+ года — целься в Middle/Senior и релокацию: ОАЭ, Европа, удалёнка.', 'With 3+ years — aim for Middle/Senior and relocation: UAE, Europe, remote.'),
  }[s.exp];
  return head('res_work_title', s)
    + (where.some(w => w !== 'uz') && lowEnglish(s) ? `<div class="alert">${t('eng_warn')}</div>` : '')
    + top
    + `<article class="card"><div class="cols">
        <div><h4>${t('platforms')}</h4>${li(plats)}</div>
        ${expTip ? `<div><h4>${LANG === 'ru' ? 'Совет по опыту' : 'Experience tip'}</h4>${li([tx(expTip)])}</div>` : ''}
      </div><p class="note">${t('salary_note')}</p></article>`
    + otherFields(s.fields.slice(3, 9));
}

const SUBJECTS = {
  it: [L('Математика', 'Math'), L('Информатика', 'Computer science')], data: [L('Математика', 'Math'), L('Статистика', 'Statistics')],
  eng: [L('Математика', 'Math'), L('Физика', 'Physics')], med: [L('Биология', 'Biology'), L('Химия', 'Chemistry')],
  bio: [L('Химия', 'Chemistry'), L('Биология', 'Biology')], biz: [L('Математика', 'Math'), L('Экономика', 'Economics')],
  fin: [L('Математика', 'Math'), L('Экономика', 'Economics')], law: [L('История', 'History'), L('Право / общество', 'Law / society')],
  ir: [L('История', 'History'), L('Второй язык', 'Second language')], design: [L('Портфолио', 'Portfolio'), L('Рисунок', 'Drawing')],
  arch: [L('Рисунок', 'Drawing'), L('Математика', 'Math')], psy: [L('Биология', 'Biology'), L('Обществознание', 'Social studies')],
  media: [L('Литература', 'Literature'), L('Портфолио', 'Portfolio')],
};
// у новых направлений предметы и портфолио записаны в FIELDS
const subjectsOf = id => SUBJECTS[id] || FIELDS[id].subj;
const needsPortfolio = id => ['design', 'arch', 'media'].includes(id) || !!FIELDS[id].portfolio;

function renderPrep(s) {
  const F = FIELDS[s.field];
  const foreign = s.targets.some(x => x !== 'uz');
  const needEng = foreign && !['c1', 'ielts'].includes(s.eng);
  const M = s.when;
  const alerts = [];
  if (M <= 6) alerts.push(LANG === 'ru' ? 'Сжатые сроки: сосредоточься на одном главном экзамене и документах. Остальное — по возможности.' : 'Tight timeline: focus on one main exam and documents. Everything else is optional.');
  if (needEng && lowEnglish(s) && M <= 12) alerts.push(t('eng_warn'));
  if (s.fieldGuessed) alerts.push(LANG === 'ru' ? `Направление ещё не выбрано — по твоим предметам ближе всего «${tx(F.name)}». Пройди тест «Университет», чтобы уточнить.` : `No field chosen yet — based on your subjects, “${tx(F.name)}” fits best. Take the “University” test to confirm.`);

  // экзамены
  const exams = (s.targets.length ? s.targets : ['uz']).map(k => `<li><div><b>${tx(REGIONS[k] || { ru: 'Узбекистан (междунар. вузы)', en: 'Uzbekistan (international unis)' })}:</b>&nbsp;${tx(EXAMS[k].n)}<br><span style="color:var(--ink-3);font-size:13px">${tx(EXAMS[k].d)}</span></div></li>`);

  // дорожная карта: этапы распределяются по доступным месяцам
  const subj = subjectsOf(s.field).map(tx).join(', ');
  const ru = LANG === 'ru';
  const stages = [
    { p: .06, h: ru ? 'Диагностика' : 'Diagnosis', d: ru ? `Пробный тест${foreign ? ' IELTS' : ''}${s.targets.includes('us') ? ' и SAT' : ''}${s.targets.includes('uz') ? ' и пробник uzbmb' : ''}. Определи разрыв до нужного балла.` : `Mock test${foreign ? ' IELTS' : ''}${s.targets.includes('us') ? ' and SAT' : ''}${s.targets.includes('uz') ? ' and uzbmb mock' : ''}. Find the gap to your target score.` },
    { p: .45, h: ru ? 'База' : 'Foundation', d: ru ? `Профильные предметы: ${subj}.${needEng ? ' Английский каждый день — цель IELTS 6.5.' : ''}` : `Core subjects: ${subj}.${needEng ? ' English daily — target IELTS 6.5.' : ''}` },
    { p: .7, h: ru ? 'Экзамены' : 'Exams', d: ru ? `Сдача: ${(s.targets.length ? s.targets : ['uz']).map(k => tx(EXAMS[k].n)).join('; ')}. Оставь время на пересдачу.` : `Take: ${(s.targets.length ? s.targets : ['uz']).map(k => tx(EXAMS[k].n)).join('; ')}. Leave time for a retake.` },
    { p: .85, h: ru ? 'Документы' : 'Documents', d: ru ? `${foreign ? 'Мотивационное письмо, 2 рекомендации, перевод и апостиль аттестата' : 'Аттестат, паспорт, фото, регистрация на my.gov.uz'}${needsPortfolio(s.field) ? ', портфолио' : ''}.` : `${foreign ? 'Motivation letter, 2 recommendations, translated & apostilled diploma' : 'Diploma, passport, photos, registration on my.gov.uz'}${needsPortfolio(s.field) ? ', portfolio' : ''}.` },
    { p: 1, h: ru ? 'Подача и гранты' : 'Applications & grants', d: ru ? 'Подай в 5–8 вузов: 2 мечты, 3 реальных, 2 запасных. Параллельно — заявки на гранты.' : 'Apply to 5–8 universities: 2 dream, 3 match, 2 safety. Apply for grants in parallel.' },
  ];
  let prev = 0;
  const unit = ru ? 'мес.' : 'mo';
  const tl = stages.map(st => {
    const from = Math.max(1, Math.round(prev * M) + (prev ? 1 : 0)), to = Math.max(from, Math.round(st.p * M));
    prev = st.p;
    return `<div class="tl-item"><div class="when">${from === to ? `${from} ${unit}` : `${from}–${to} ${unit}`}</div><h4>${st.h}</h4><p>${st.d}</p></div>`;
  }).join('');

  // неделя
  const H = s.hours, per = Math.max(1, Math.round(H / 6 * 10) / 10);
  const [s1, s2] = subjectsOf(s.field).map(tx);
  const engL = needEng ? (ru ? 'Английский' : 'English') : (ru ? 'Практика задач' : 'Practice problems');
  const days = ru ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const plan = [[s1, engL], [engL, s2], [s1, engL], [s2, engL], [s1, ru ? 'Документы' : 'Documents'], [ru ? 'Пробный тест' : 'Mock test', ru ? 'Разбор ошибок' : 'Review'], [ru ? 'Отдых' : 'Rest']];
  const week = plan.map((p, i) => `<div class="day ${i === 6 ? 'rest' : ''}"><b>${days[i]}${i < 6 ? ` · ${per}${ru ? 'ч' : 'h'}` : ''}</b>${p.map(x => `<span>${x}</span>`).join('')}</div>`).join('');

  const WEAK = {
    eng: L('Английский: 30 минут в день, подкасты BBC Learning English, пробные тесты IELTS раз в 2 недели.', 'English: 30 min a day, BBC Learning English podcasts, mock IELTS every 2 weeks.'),
    math: L('Математика: Khan Academy по темам + 10 задач в день; веди тетрадь ошибок.', 'Math: Khan Academy by topic + 10 problems a day; keep an error log.'),
    motiv: L('Дисциплина: техника Pomodoro, маленькие ежедневные цели, учись с другом или в Telegram-группе.', 'Discipline: Pomodoro, small daily goals, study with a friend or a Telegram group.'),
    docs: L('Документы: начни мотивационное письмо за 3 месяца, покажи 2–3 людям, перепиши минимум 4 раза.', 'Documents: start your motivation letter 3 months early, show it to 2–3 people, rewrite 4+ times.'),
    money: L('Финансы: целься в полные гранты (Türkiye Bursları, GKS, Stipendium Hungaricum) и бесплатные вузы Германии.', 'Money: aim for full grants (Türkiye Bursları, GKS, Stipendium Hungaricum) and tuition-free German universities.'),
    choice: L('Выбор: пройди тест «Университет» в Noventis и поговори с 2–3 студентами выбранной сферы.', 'Choice: take Noventis’s “University” test and talk to 2–3 students in that field.'),
  };
  const grants = [...new Set([...s.targets.filter(x => x !== 'uzp'), 'all'])].flatMap(k => (GRANTS[k] || []).map(tx));
  const res = ['Khan Academy — ' + (ru ? 'математика, наука' : 'math, science'), 'British Council / IELTS Liz — IELTS',
               ...(s.targets.includes('us') ? ['College Board Bluebook — SAT'] : []), ...(s.targets.includes('uz') ? ['uzbmb.uz — ' + (ru ? 'официальные тесты' : 'official tests')] : []),
               ...(s.targets.includes('kr') ? ['TOPIK Guide, Study in Korea'] : []), 'Coursera / edX — ' + (ru ? 'курсы по направлению' : 'field courses')];

  return head('res_prep_title', s)
    + alerts.map(a => `<div class="alert">${a}</div>`).join('')
    + `<article class="card field-card"><div class="top"><div class="glyph">${F.glyph}</div><div><div class="rank">${ru ? 'Направление' : 'Field'}</div><h3>${tx(F.name)}</h3></div></div>
        <h4 class="rank" style="margin:8px 0 14px">${t('exams_needed')}</h4><ul class="list">${exams.join('')}</ul></article>`
    + `<article class="card"><h4 class="rank" style="margin:0 0 24px">${t('roadmap')}</h4><div class="timeline">${tl}</div></article>`
    + `<article class="card"><h4 class="rank" style="margin:0 0 18px">${t('week_plan')} · ${H}${ru ? ' ч/нед' : ' h/wk'}</h4><div class="week">${week}</div></article>`
    + `<article class="card"><div class="cols">
        ${s.weak.length ? `<div><h4>${t('weak_tips')}</h4>${li(s.weak.map(w => tx(WEAK[w])))}</div>` : ''}
        <div><h4>${t('grants')}</h4>${li(grants)}</div>
        <div><h4>${t('resources')}</h4>${li(res)}</div>
      </div></article>`;
}

function renderResult() {
  view = 'result';
  const s = current.summary;
  const html = { university: renderUniversity, work: renderWork, prep: renderPrep }[current.category](s);
  const others = Object.keys(CATEGORIES).filter(k => k !== current.category)
    .map(k => `<a class="btn btn-ghost" href="/test?cat=${k}">${tx(CATEGORIES[k].title)} →</a>`).join('');
  app.innerHTML = html + `<div class="result-actions">
      <a class="btn btn-gold" href="/test?cat=${current.category}">${t('retake')}</a>
      <a class="btn btn-ghost" href="/profile">${t('to_profile')}</a>${others}</div>`;
  gsap.from('.result-head > *, .alert, .card', { y: 40, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out' });
  requestAnimationFrame(() => setTimeout(() => app.querySelectorAll('.meter .bar span').forEach(b => b.style.width = b.dataset.w + '%'), 200));
}

// ---------- старт ----------
document.addEventListener('langchange', () => {
  if (view === 'result') return renderResult();
  idx === -1 ? renderIntro() : renderQuestion();
});

document.addEventListener('DOMContentLoaded', async () => {
  const me = await loadMe();
  if (!me) { location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search); return; }
  await loadFavs();
  const rid = params.get('result');
  if (rid) {
    const r = await api('/api/results/' + encodeURIComponent(rid));
    if (r.ok) {
      current = r.data;
      document.getElementById('bg').src = CATEGORIES[current.category].img;
      return renderResult();
    }
  }
  document.getElementById('bg').src = cat.img;
  answers = { ...loadProfile() };
  renderIntro();
});
