// Профессии: список, «день из жизни» (?f=id) и сравнение двух (?a=id&b=id)
const app = document.getElementById('app');
let query = '', area = '', picked = [];

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const go = qs => { history.pushState(null, '', '/careers' + qs); route(); scrollTo(0, 0); };
const li = items => `<ul class="list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

function renderList() {
  const q = fold(query);
  const ids = Object.keys(FIELDS).filter(id => (!area || AREAS[area].f.includes(id))
    && (!q || fold(tx(FIELDS[id].name) + ' ' + FIELDS[id].jobs.map(j => tx(j.n)).join(' ')).includes(q)));
  app.innerHTML = `
    <div class="page-head"><span class="kicker">${t('nav_tools')}</span><h1>${t('cr_title')}</h1><p>${t('cr_lead')}</p></div>
    <div class="filters" style="grid-template-columns:1fr"><input class="input" id="q" type="search" autocomplete="off" placeholder="${t('cr_search')}" value="${escapeHtml(query)}"></div>
    <div class="chips-pick" style="margin-bottom:20px">
      <button type="button" class="chip-btn ${area ? '' : 'on'}" data-area="">${t('ch_all')}</button>
      ${Object.entries(AREAS).map(([k, a]) => `<button type="button" class="chip-btn ${area === k ? 'on' : ''}" data-area="${k}">${tx(a.t)}</button>`).join('')}
    </div>
    <div class="cmp-bar-row"><button class="btn btn-gold" id="cmpGo" ${picked.length === 2 ? '' : 'disabled'}>${t('cr_cmp_go')}</button><span class="note" style="margin:0">${t('cr_pick2')}</span></div>
    <div class="tools-grid" id="grid">${ids.map(id => {
      const F = FIELDS[id], j = F.jobs[0];
      return `<div class="tool career">
        <div class="glyph">${escapeHtml(F.glyph)}</div><b>${tx(F.name)}</b>
        <span>${tx(j.n)} · ${tx(j.uz)} / ${t('co_month')}</span>
        <div class="career-actions"><a href="/careers?f=${id}" class="more" data-go="?f=${id}">${t('cr_more')}</a>
          <label class="pick"><input type="checkbox" class="pk" value="${id}" ${picked.includes(id) ? 'checked' : ''}>${t('cr_cmp')}</label></div>
      </div>`;
    }).join('') || `<div class="empty">${t('cat_empty')}</div>`}</div>`;
  const $q = document.getElementById('q');
  $q.oninput = () => { query = $q.value; renderList(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
}

function detail(id) {
  const F = FIELDS[id], C = CAREERS[id];
  const unis = F.world.slice(0, 6).map(([n, r]) => `${escapeHtml(nm(n))}<span class="tag">${tx(REGIONS[r])}</span>${heart(n, r)}`);
  app.innerHTML = `
    <a class="note" href="/careers" data-go="" style="color:var(--gold)">${t('cr_back')}</a>
    <div class="page-head" style="margin-top:16px"><span class="kicker">${tx(AREAS[Object.keys(AREAS).find(a => AREAS[a].f.includes(id))].t)}</span>
      <h1>${tx(F.name)}</h1><p>${tx(F.desc)}</p></div>
    <article class="card"><h4 class="rank" style="margin:0 0 20px">${t('cr_day')} · ${tx(F.jobs[0].n)}</h4>
      <div class="timeline">${C.day.map((d, i) => `<div class="tl-item"><div class="when">${DAY_TIMES[i]}</div><p>${tx(d)}</p></div>`).join('')}</div></article>
    <article class="card"><h4 class="rank" style="margin:0 0 16px">${t('cr_jobs')}</h4>
      <div class="jobs">${F.jobs.map(j => `<div class="job"><span class="n">${tx(j.n)}</span>
        <span class="s">${tx(j.uz)}<small>${t('salary_uz')}</small></span><span class="s">${tx(j.w)}<small>${t('salary_w')}</small></span></div>`).join('')}</div>
      <p class="note">${t('salary_note')}</p></article>
    <article class="card"><div class="cols">
      <div><h4>${t('cr_years')}</h4><p class="big-num">${C.years} <small>${t('cr_years_u')}</small></p>
        <h4 style="margin-top:18px">${t('cr_subj')}</h4>${li(subjectsOf(id).map(tx))}</div>
      <div><h4>${t('cr_path')}</h4>${li(F.start.map(tx))}</div>
      <div><h4>${t('cr_pros')}</h4><ul class="list pros">${C.pros.map(x => `<li>${tx(x)}</li>`).join('')}</ul>
        <h4 style="margin-top:18px">${t('cr_cons')}</h4><ul class="list cons">${C.cons.map(x => `<li>${tx(x)}</li>`).join('')}</ul></div>
    </div></article>
    <article class="card"><div class="cols">
      <div><h4>${t('where_strong')}</h4>${li(F.hubs.map(tx))}</div>
      <div><h4>${t('cr_unis')}</h4>${li(unis)}</div>
      <div><h4>${t('unis_uz')}</h4>${li(F.uz.map(n => escapeHtml(nm(n))))}</div>
    </div></article>
    <div class="result-actions">
      <a class="btn btn-gold" href="/test?cat=university">${tx(CATEGORIES.university.title)} →</a>
      <a class="btn btn-ghost" href="/chances">${t('ch_title')}</a><a class="btn btn-ghost" href="/cost">${t('co_title')}</a>
      <a class="btn btn-ghost" href="/resources?area=${Object.keys(AREAS).find(a => AREAS[a].f.includes(id))}">${t('rs_title')}</a>
    </div>`;
  document.title = `Noventis — ${tx(F.name)}`;
}

function compare(a, b) {
  const A = FIELDS[a], B = FIELDS[b], CA = CAREERS[a], CB = CAREERS[b];
  const row = (label, fa, fb) => `<div class="vs-row"><h4>${label}</h4><div>${fa}</div><div>${fb}</div></div>`;
  const sal = (F, k) => tx(F.jobs[0][k]);
  app.innerHTML = `
    <a class="note" href="/careers" data-go="" style="color:var(--gold)">${t('cr_back')}</a>
    <div class="page-head" style="margin-top:16px"><span class="kicker">${t('cr_cmp')}</span><h1>${tx(A.name)} <span style="color:var(--gold)">vs</span> ${tx(B.name)}</h1></div>
    <article class="card vs">
      ${row('', `<div class="glyph">${escapeHtml(A.glyph)}</div><b>${tx(A.jobs[0].n)}</b>`, `<div class="glyph">${escapeHtml(B.glyph)}</div><b>${tx(B.jobs[0].n)}</b>`)}
      ${row(t('salary_uz'), `<b class="big-num">${sal(A, 'uz')}</b>`, `<b class="big-num">${sal(B, 'uz')}</b>`)}
      ${row(t('salary_w'), `<b class="big-num">${sal(A, 'w')}</b>`, `<b class="big-num">${sal(B, 'w')}</b>`)}
      ${row(t('cr_years'), `${CA.years} ${t('cr_years_u')}`, `${CB.years} ${t('cr_years_u')}`)}
      ${row(t('cr_subj'), subjectsOf(a).map(tx).join(', '), subjectsOf(b).map(tx).join(', '))}
      ${row(t('cr_day'), li(CA.day.map((d, i) => `<b>${DAY_TIMES[i]}</b>&nbsp;${tx(d)}`)), li(CB.day.map((d, i) => `<b>${DAY_TIMES[i]}</b>&nbsp;${tx(d)}`)))}
      ${row(t('cr_pros'), `<ul class="list pros">${CA.pros.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`, `<ul class="list pros">${CB.pros.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`)}
      ${row(t('cr_cons'), `<ul class="list cons">${CA.cons.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`, `<ul class="list cons">${CB.cons.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`)}
      ${row(t('where_strong'), li(A.hubs.slice(0, 3).map(tx)), li(B.hubs.slice(0, 3).map(tx)))}
      ${row(t('cr_unis'), li(A.world.slice(0, 4).map(([n]) => escapeHtml(nm(n)))), li(B.world.slice(0, 4).map(([n]) => escapeHtml(nm(n)))))}
      ${row('', `<a class="btn btn-ghost" href="/careers?f=${a}" data-go="?f=${a}">${t('cr_more')}</a>`, `<a class="btn btn-ghost" href="/careers?f=${b}" data-go="?f=${b}">${t('cr_more')}</a>`)}
    </article>
    <p class="note">${t('salary_note')}</p>`;
  document.title = `Noventis — ${tx(A.name)} vs ${tx(B.name)}`;
}

function route() {
  const p = new URLSearchParams(location.search);
  const f = p.get('f'), a = p.get('a'), b = p.get('b');
  document.title = 'Noventis — ' + t('cr_title').toLowerCase();
  if (FIELDS[a] && FIELDS[b] && a !== b) compare(a, b);
  else if (FIELDS[f]) detail(f);
  else renderList();
}

app.addEventListener('click', e => {
  const link = e.target.closest('[data-go]');
  if (link) { e.preventDefault(); go(link.dataset.go); return; }
  const ar = e.target.closest('[data-area]');
  if (ar) { area = ar.dataset.area; renderList(); return; }
  if (e.target.id === 'cmpGo' && picked.length === 2) go(`?a=${picked[0]}&b=${picked[1]}`);
});
app.addEventListener('change', e => {
  if (!e.target.classList.contains('pk')) return;
  const id = e.target.value;
  if (e.target.checked) { picked.push(id); if (picked.length > 2) picked.shift(); } else picked = picked.filter(x => x !== id);
  app.querySelectorAll('.pk').forEach(c => { c.checked = picked.includes(c.value); });
  document.getElementById('cmpGo').disabled = picked.length !== 2;
});
addEventListener('popstate', route);
document.addEventListener('langchange', route);
document.addEventListener('DOMContentLoaded', async () => {
  await loadMe(); await loadFavs();
  route();
  gsap.from('.page-head > *', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
});
