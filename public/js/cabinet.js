// Кабинет: всё своё в одном месте — попытки тестов, сохранённые расчёты, план, ближайшие события, избранные вузы
const app = document.getElementById('app');
const T3 = (ru, en, uz) => tx({ ru, en, uz });
let RESULTS = [], CALCS = [], EVENTS = [], PLAN = null, LEADS = [];

const when = s => new Date(s.replace(' ', 'T') + 'Z').toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });
const day = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const section = (id, title, body, more = '') => `<section class="cab-sec" id="${id}"><div class="cab-head"><span class="kicker">${title}</span>${more}</div>${body}</section>`;

function resultTitle(r) {
  const s = r.summary;
  if (r.category === 'prep') return FIELDS[s.field] ? tx(FIELDS[s.field].name) : '';
  return (s.fields || []).slice(0, 3).map(f => FIELDS[f.id] ? `${tx(FIELDS[f.id].name)} ${f.pct}%` : '').filter(Boolean).join(' · ');
}

// «К вузам» у результата адаптивного теста (в нём есть summary.top)
function startLink(r) {
  const s = r.summary || {};
  // у старых результатов нет summary.top — берём направления из summary.fields
  const src = Array.isArray(s.top) && s.top.length ? s.top : Array.isArray(s.fields) ? s.fields : [];
  const top = src.filter(f => FIELDS[f.id]).slice(0, 3);
  if (!top.length) return '';
  const alt = top.slice(1).map(f => f.id).join(',');
  return `<a class="btn btn-ghost" href="/start?field=${top[0].id}${alt ? '&alt=' + alt : ''}">${T3('К вузам', 'To universities', 'Oliygohlarga')} →</a>`;
}

// Тесты: по каждому из трёх — все попытки, новые сверху, с номером попытки
function testsBlock() {
  return Object.entries(CATEGORIES).filter(([k]) => !isHidden(k)).map(([k, c]) => {
    const mine = RESULTS.filter(r => r.category === k);
    return `<article class="card cab-test">
      <div class="cab-test-head"><img src="${c.img}" alt=""><div><b>${catTitle(k)}</b><span>${t('rt_count')}: ${mine.length}</span></div>
        <a class="btn ${mine.length ? 'btn-ghost' : 'btn-gold'}" href="/test?cat=${k}">${mine.length ? t('home_again') : t('start_track')} →</a></div>
      ${mine.length ? `<div class="res-list">${mine.map((r, i) => `<div class="res-item" data-id="${r.id}">
          <div class="glyph">${mine.length - i}</div>
          <div class="meta"><b>${t('attempt')} ${mine.length - i} · ${when(r.created_at)}</b><span>${resultTitle(r)}</span></div>
          <div class="actions"><a class="btn btn-gold" href="/test?result=${r.id}">${t('open')}</a>${startLink(r)}<button class="btn btn-ghost del-res">${t('delete')}</button></div>
        </div>`).join('')}</div>` : ''}
    </article>`;
  }).join('');
}

// Сохранённые расчёты калькуляторов
function calcTitle(c) {
  const d = c.data;
  if (c.kind === 'chances') {
    const f = d.field && FIELDS[d.field] ? tx(FIELDS[d.field].name) : T3('любое направление', 'any field', 'istalgan yoʻnalish');
    return { head: `${t('ch_title')} · ${f}`, sub: `${t('ch_safe')} ${d.safe} · ${t('ch_match')} ${d.match} · ${t('ch_reach')} ${d.reach}${d.ielts ? ' · IELTS ' + d.ielts : ''}` };
  }
  const place = [d.uni ? nm(d.uni) : '', placeName(d.cc)].filter(Boolean).join(' · ');
  const range = (a, b) => Math.round(a) === Math.round(b) ? money(a) : `${money(a)} – ${money(b)}`;
  return { head: `${t('co_title')} · ${place}`, sub: `${t('co_year')}: ${range(d.yearMin, d.yearMax)} · ${t('co_total')} (${d.years}): ${range(d.totalMin, d.totalMax)}` };
}
function calcsBlock() {
  if (!CALCS.length) return `<div class="empty">${T3('Здесь появятся расчёты, которые ты сохранишь в калькуляторах шансов и стоимости.', 'Calculations you save in the chances and cost calculators will appear here.', 'Imkoniyat va narx kalkulyatorlarida saqlagan hisoblaringiz shu yerda paydo boʻladi.')}
    <div class="more-row"><a class="btn btn-ghost" href="/chances">${t('ch_title')}</a><a class="btn btn-ghost" href="/cost">${t('co_title')}</a></div></div>`;
  return `<div class="res-list">${CALCS.map(c => {
    const x = calcTitle(c);
    return `<div class="res-item" data-calc="${c.id}"><div class="glyph">${c.kind === 'cost' ? '$' : '◎'}</div>
      <div class="meta"><b>${escapeHtml(x.head)}</b><span>${when(c.created_at)} · ${x.sub}</span></div>
      <div class="actions"><button class="btn btn-gold open-calc">${t('open')}</button><button class="btn btn-ghost del-calc">${t('delete')}</button></div></div>`;
  }).join('')}</div>`;
}

// Заявки на курсы
const LEAD_STATUS = {
  new: () => T3('Принята', 'Received', 'Qabul qilindi'),
  sent: () => T3('Передана в центр', 'Sent to the centre', 'Markazga yuborildi'),
  done: () => T3('Обработана', 'Completed', 'Bajarildi'),
  rejected: () => T3('Отклонена', 'Rejected', 'Rad etildi'),
};
// Название курса/центра на языке сайта по id из каталога; русское из базы — запасной вариант
function leadName(list, id, fallback) {
  const it = window.START && START[list].find(x => x.id === id);
  const t = it && (it.title || it.name);
  return t ? tx(t) : (fallback || '');
}
function leadsBlock() {
  if (!LEADS.length) return `<div class="empty">${T3('Заявок пока нет. Выбери курс на странице «С чего начать».', 'No requests yet. Pick a course on the “Where to start” page.', 'Hozircha arizalar yoʻq. «Nimadan boshlash» sahifasida kursni tanlang.')}
    <div class="more-row"><a class="btn btn-gold" href="/start">${T3('С чего начать', 'Where to start', 'Nimadan boshlash')} →</a></div></div>`;
  return `<div class="res-list">${LEADS.map(l => `<div class="res-item"><div class="glyph">✉</div>
    <div class="meta"><b>${escapeHtml(leadName('COURSES', l.course_id, l.course_title))}</b><span>${escapeHtml(leadName('CENTERS', l.center_id, l.center_name))} ·${when(l.created_at)}</span></div>
    <div class="actions"><span class="chip gold">${(LEAD_STATUS[l.status] || (() => escapeHtml(l.status || '')))()}</span></div></div>`).join('')}</div>`;
}

function planBlock() {
  if (!PLAN) return `<div class="empty">${T3('Плана пока нет. Выбери вуз, направление и дедлайн — сайт разложит подготовку по неделям.', 'No plan yet. Pick a university, field and deadline — we’ll spread your prep over the weeks.', 'Hozircha reja yoʻq. Oliygoh, yoʻnalish va muddatni tanlang — sayt tayyorgarlikni haftalarga taqsimlaydi.')}
    <div class="more-row"><a class="btn btn-gold" href="/plan">${T3('Составить план', 'Build my plan', 'Reja tuzish')} →</a></div></div>`;
  const total = PLAN.weeks.reduce((n, w) => n + w.tasks.length, 0);
  const done = PLAN.weeks.reduce((n, w) => n + w.tasks.filter(x => x.done).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  const u = PLAN.uni ? findUni(PLAN.uni[0], PLAN.uni[1]) : null;
  return `<article class="card"><div class="cab-plan">
    <div><b>${escapeHtml([u ? nm(u[0]) : '', PLAN.field && FIELDS[PLAN.field] ? tx(FIELDS[PLAN.field].name) : ''].filter(Boolean).join(' · ') || t('pl_title'))}</b>
      <span>${T3('Дедлайн', 'Deadline', 'Muddat')}: ${day(PLAN.deadline).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })} · ${t('pl_done')}: ${pct}% (${done}/${total})</span></div>
    <a class="btn btn-gold" href="/plan">${t('open')} →</a></div>
    <div class="meter" style="margin:16px 0 0"><div class="bar"><span style="width:${pct}%"></span></div></div></article>`;
}

function eventsBlock() {
  const now = new Date(new Date().toDateString());
  const next = EVENTS.filter(e => day(e.date) >= now).slice(0, 3);
  if (!next.length) return `<div class="empty">${t('dl_none_mine')}</div>`;
  return `<div class="uni-list">${next.map(e => {
    const n = Math.round((day(e.date) - now) / 864e5);
    return `<div class="uni dl ${n <= 30 ? 'soon' : ''}"><div class="dl-left"><b>${n || t('dl_today')}</b>${n ? `<span>${t('dl_days')}</span>` : ''}</div>
      <div class="meta"><b>${escapeHtml(e.title)}</b><span>${day(e.date).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}</span></div></div>`;
  }).join('')}</div>`;
}

// Избранное — только вузы с ♡, без общего списка вузов
function favBlock() {
  const favs = [...FAVS.values()];
  if (!favs.length) return `<div class="empty">${t('fav_empty')}</div>`;
  return `<div class="uni-list">${favs.map(f => {
    const u = findUni(f.name, /^[A-Z]{2}$/.test(f.place) ? f.place : null);
    const q = u ? `name=${encodeURIComponent(u[0])}&cc=${u[1]}` : '';
    return `<div class="uni"><div class="meta"><b>${escapeHtml(nm(f.name))}</b><span>${escapeHtml(placeName(u ? u[1] : f.place))}${u ? ' · ' + money(uniTuition(u)) + ' ' + T3('в год', 'per year', 'yiliga') : ''}</span></div>
      ${u ? `<a class="site" href="/cost?${q}">${T3('Стоимость', 'Cost', 'Narx')}</a><a class="site" href="/chances?${q}">${T3('Шансы', 'Chances', 'Imkoniyat')}</a>` : f.web ? `<a class="site" href="${escapeHtml(f.web)}" target="_blank" rel="noopener noreferrer">${t('cat_site')} ↗</a>` : ''}
      ${heart(f.name, f.place, f.web)}</div>`;
  }).join('')}</div>`;
}

function render(animate) {
  const since = new Date(ME.created_at.replace(' ', 'T') + 'Z').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const all = (href, label) => `<a class="note cab-link" href="${href}">${label} →</a>`;
  app.innerHTML = `
    <div class="profile-top">
      <div class="big-avatar">${escapeHtml(ME.name[0]).toUpperCase()}</div>
      <div><h1>${t('hello')}, ${escapeHtml(ME.name)}</h1><p>${escapeHtml(ME.email)} · ${t('member_since')} ${since}</p></div>
    </div>
    <nav class="cab-nav">${[['tests', t('my_results')], ['calcs', T3('Мои расчёты', 'My calculations', 'Hisoblarim')], ['leads', T3('Мои заявки', 'My requests', 'Arizalarim')], ['plan', t('pl_title')], ['events', t('dl_soon')], ['favorites', t('fav_title')]]
      .filter(([id]) => !isHidden(id === 'events' ? 'deadlines' : id)).map(([id, n]) => `<a href="#${id}">${n}</a>`).join('')}</nav>
    ${section('tests', t('my_results'), testsBlock())}
    ${section('calcs', T3('Мои расчёты', 'My calculations', 'Hisoblarim'), calcsBlock())}
    ${section('leads', T3('Мои заявки', 'My requests', 'Arizalarim'), leadsBlock())}
    ${isHidden('plan') ? '' : section('plan', t('pl_title'), planBlock())}
    ${isHidden('deadlines') ? '' : section('events', t('dl_soon'), eventsBlock(), all('/deadlines', t('dl_open').replace(' →', '')))}
    ${section('favorites', t('fav_title'), favBlock(), all('/favorites', t('fav_find')))}
    <div class="more-row" style="justify-content:flex-start"><a class="btn btn-ghost" href="/tools">${t('nav_tools')} →</a></div>`;
  if (animate) gsap.from('.profile-top, .cab-sec', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
}

app.addEventListener('click', async e => {
  const delRes = e.target.closest('.del-res'), delCalc = e.target.closest('.del-calc'), openCalc = e.target.closest('.open-calc');
  if (delRes || delCalc) {
    const v = await ask(T3('Удалить?', 'Delete?', 'Oʻchirilsinmi?'), T3('Это действие нельзя отменить.', 'This can’t be undone.', 'Buni qaytarib boʻlmaydi.'), [{ v: 'yes', label: t('delete'), gold: true }, { v: null, label: t('cancel') }]);
    if (!v) return;
    const item = (delRes || delCalc).closest('.res-item');
    if (delRes) { await api('/api/results/' + item.dataset.id, { method: 'DELETE' }); RESULTS = RESULTS.filter(r => r.id !== +item.dataset.id); }
    else { await api('/api/calcs/' + item.dataset.calc, { method: 'DELETE' }); CALCS = CALCS.filter(c => c.id !== +item.dataset.calc); }
    return render(false);
  }
  if (openCalc) {
    const c = CALCS.find(x => x.id === +openCalc.closest('.res-item').dataset.calc), d = c.data;
    if (c.kind === 'chances') {
      // калькулятор шансов берёт баллы из браузера — кладём туда сохранённые
      try { localStorage.setItem('kj_chances', JSON.stringify({ ielts: d.ielts == null ? '' : String(d.ielts), sat: d.sat ? String(d.sat) : '', gpa: String(d.gpa), olymp: String(d.olymp), ru: d.ru, field: d.field })); } catch {}
      location.href = '/chances' + (d.countries && d.countries.length === 1 ? '?cc=' + d.countries[0] : '');
    } else {
      location.href = `/cost?cc=${d.cc}${d.uni ? '&name=' + encodeURIComponent(d.uni) : ''}${d.field ? '&field=' + d.field : ''}`;
    }
  }
});
document.addEventListener('favchange', () => render(false));
document.addEventListener('langchange', () => render(false));
document.addEventListener('DOMContentLoaded', async () => {
  if (!await loadMe()) { location.href = '/auth?next=/profile'; return; }
  const [, r, c, ev, p, ld] = await Promise.all([loadFavs(), api('/api/results'), api('/api/calcs'), api('/api/events'), api('/api/plan'), api('/api/leads/mine')]);
  LEADS = ld.ok ? ld.data.leads : [];
  RESULTS = (r.data.results || []).filter(x => CATEGORIES[x.category] && !isHidden(x.category));
  CALCS = c.ok ? c.data.calcs : [];
  EVENTS = ev.ok ? ev.data.events : [];
  PLAN = p.ok ? p.data.plan : null;
  render(true);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
});
