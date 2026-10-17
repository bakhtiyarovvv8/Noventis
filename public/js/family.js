// Родители и учителя: код ученика, дети родителя, классы учителя, просмотр результатов (?student=id)
const app = document.getElementById('app');
let FAM = null, tab = 'student';

const when = s => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(LANG === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const catName = c => c === 'english' ? t('en_title') : tx(CATEGORIES[c].title);

// одна строка о результате: топ-направление, план или уровень английского
function resLine(r) {
  const s = r.summary;
  if (r.category === 'english') return `${s.cefr} · IELTS ≈ ${s.band}`;
  if (r.category === 'prep') return FIELDS[s.field] ? tx(FIELDS[s.field].name) : '';
  return (s.fields || []).slice(0, 2).filter(f => FIELDS[f.id]).map(f => `${tx(FIELDS[f.id].name)} ${f.pct}%`).join(' · ');
}
const resHref = (sid, r) => r.category === 'english' ? null : `/test?result=${r.id}&student=${sid}`;

// последняя запись каждого типа — для карточки ребёнка и строки ученика в классе
function latest(sid, results) {
  const seen = new Set(), rows = [];
  for (const r of results) if (!seen.has(r.category)) { seen.add(r.category); rows.push(r); }
  if (!rows.length) return `<p class="note">${t('fm_no_res')}</p>`;
  return `<ul class="list">${rows.map(r => {
    const href = resHref(sid, r);
    return `<li><span><b>${catName(r.category)}</b> — ${resLine(r)} <span class="note" style="margin:0">· ${when(r.created_at)}</span></span>
      ${href ? `<a class="tag" href="${href}" style="color:var(--gold)">${t('open')} →</a>` : ''}</li>`;
  }).join('')}</ul>`;
}

function renderStudent() {
  return `
    <article class="card">
      <h4 class="rank" style="margin:0 0 14px">${t('fm_my_code')}</h4>
      ${FAM.code ? `<div class="code-box"><b id="code">${FAM.code.slice(0, 4)}-${FAM.code.slice(4)}</b>
        <button class="btn btn-ghost" data-act="copy">${t('fm_copy')}</button><button class="btn btn-ghost" data-act="code">${t('fm_new_code')}</button></div>`
        : `<button class="btn btn-gold" data-act="code">${t('fm_make_code')}</button>`}
      <p class="note">${t('fm_code_hint')}</p>
    </article>
    <article class="card">
      <h4 class="rank" style="margin:0 0 14px">${t('fm_who')}</h4>
      ${FAM.watchers.length ? `<div class="uni-list">${FAM.watchers.map(w => `<div class="uni"><div class="meta"><b>${escapeHtml(w.name)}</b></div>
        <button class="btn btn-ghost" data-act="revoke" data-id="${w.id}">${t('fm_revoke')}</button></div>`).join('')}</div>` : `<p class="note">${t('fm_nobody')}</p>`}
    </article>
    <article class="card">
      <h4 class="rank" style="margin:0 0 14px">${t('fm_join')}</h4>
      <form class="code-form" data-act="join"><input class="input" name="code" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off" required><button class="btn btn-gold">${t('fm_add')}</button></form>
      ${FAM.joined.length ? `<h4 class="rank" style="margin:22px 0 12px">${t('fm_my_classes')}</h4><div class="uni-list">${FAM.joined.map(c => `<div class="uni">
        <div class="meta"><b>${escapeHtml(c.name)}</b><span>${t('fm_teacher_of')}: ${escapeHtml(c.owner)}</span></div>
        <button class="btn btn-ghost" data-act="leave" data-id="${c.id}">${t('fm_leave')}</button></div>`).join('')}</div>` : ''}
    </article>`;
}

function renderParent() {
  return `
    <article class="card">
      <h4 class="rank" style="margin:0 0 14px">${t('fm_add_kid')}</h4>
      <form class="code-form" data-act="watch"><input class="input" name="code" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off" required><button class="btn btn-gold">${t('fm_add')}</button></form>
    </article>
    <span class="kicker" style="margin:30px 0 18px">${t('fm_kids')}</span>
    ${FAM.kids.length ? FAM.kids.map(k => `<article class="card">
      <div class="plan-head"><b>${escapeHtml(k.name)}</b><span>${t('fm_latest')}</span>
        <button class="btn btn-ghost" style="margin-left:auto;height:36px;font-size:13px" data-act="unwatch" data-id="${k.id}">${t('fm_remove')}</button></div>
      ${latest(k.id, k.results)}
      <p class="note"><a href="/family?student=${k.id}" style="color:var(--gold)">${t('fm_all_res')}</a></p></article>`).join('')
      : `<div class="empty">${t('fm_no_kids')}</div>`}`;
}

function renderTeacher() {
  return `
    <article class="card">
      <form class="code-form" data-act="class"><input class="input" name="name" maxlength="60" placeholder="${t('fm_new_class')}" required><button class="btn btn-gold">${t('fm_create')}</button></form>
    </article>
    ${FAM.classes.map(c => `<article class="card">
      <div class="plan-head"><b>${escapeHtml(c.name)}</b><span>${c.members.length} ${t('fm_members')}</span>
        <button class="btn btn-ghost" style="margin-left:auto;height:36px;font-size:13px" data-act="delclass" data-id="${c.id}">${t('fm_delete_class')}</button></div>
      <p class="note" style="margin:0 0 14px">${t('fm_class_code')}: <b class="code-inline">${c.code.slice(0, 4)}-${c.code.slice(4)}</b></p>
      ${c.members.length ? `<div class="class-table">${c.members.map(m => {
        const uni = m.results.find(r => r.category === 'university' || r.category === 'work');
        const en = m.results.find(r => r.category === 'english');
        return `<div class="class-row"><b>${escapeHtml(m.name)}</b><span>${uni ? resLine(uni) : '—'}</span><span>${en ? resLine(en) : '—'}</span>
          <a href="/family?student=${m.id}" style="color:var(--gold)">${t('fm_all_res')}</a></div>`;
      }).join('')}</div>` : `<p class="note">${t('fm_no_members')}</p>`}
    </article>`).join('')}`;
}

function render() {
  const tabs = [['student', 'fm_student'], ['parent', 'fm_parent'], ['teacher', 'fm_teacher']];
  app.innerHTML = `
    <div class="page-head"><span class="kicker">${t('nav_tools')}</span><h1>${t('fm_title')}</h1><p>${t('fm_lead')}</p></div>
    <div class="chips-pick" style="margin-bottom:20px">${tabs.map(([k, key]) => `<button type="button" class="chip-btn ${tab === k ? 'on' : ''}" data-tab="${k}">${t(key)}</button>`).join('')}</div>
    ${{ student: renderStudent, parent: renderParent, teacher: renderTeacher }[tab]()}`;
}

// все результаты одного ученика (для родителя или учителя)
async function renderOne(sid) {
  const r = await api(`/api/view/${sid}/results`);
  if (!r.ok) { app.innerHTML = `<div class="empty">${t('cmp_none')}</div>`; return; }
  const { student, results } = r.data;
  app.innerHTML = `
    <a class="note" href="/family" style="color:var(--gold)">${t('fm_back')}</a>
    <div class="page-head" style="margin-top:16px"><span class="kicker">${t('fm_results_of')}</span><h1>${escapeHtml(student.name)}</h1></div>
    <div class="res-list">${results.length ? results.map(x => {
      const href = resHref(sid, x);
      return `<div class="res-item"><div class="meta"><b>${catName(x.category)}</b><span>${when(x.created_at)} · ${resLine(x)}</span></div>
        ${href ? `<div class="actions"><a class="btn btn-gold" href="${href}">${t('open')}</a></div>` : ''}</div>`;
    }).join('') : `<div class="empty">${t('fm_no_res')}</div>`}</div>`;
}

async function reload() { const r = await api('/api/family'); if (r.ok) FAM = r.data; render(); }
const errText = e => t({ bad_code: 'err_bad_code', own_code: 'err_own_code', too_many: 'err_too_many', name_short: 'err_name_short' }[e] || 'err_server');

app.addEventListener('click', async e => {
  const tb = e.target.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; history.replaceState(null, '', '/family?tab=' + tab); render(); return; }
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const id = Number(b.dataset.id);
  if (b.dataset.act === 'copy') { navigator.clipboard.writeText(FAM.code).then(() => toast(t('fm_copied'))).catch(() => {}); return; }
  const calls = {
    code: () => api('/api/family/code', { method: 'POST' }),
    revoke: () => api('/api/family/watch', { method: 'DELETE', body: { viewer: id } }),
    unwatch: () => api('/api/family/watch', { method: 'DELETE', body: { student: id } }),
    leave: () => api('/api/classes/' + id, { method: 'DELETE' }),
    delclass: () => api('/api/classes/' + id, { method: 'DELETE' }),
  };
  if (!calls[b.dataset.act]) return;
  b.disabled = true;
  const r = await calls[b.dataset.act]();
  if (!r.ok) toast(errText(r.data.error));
  reload();
});
app.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, act = f.dataset.act, v = f.elements[0].value;
  const r = act === 'class' ? await api('/api/classes', { method: 'POST', body: { name: v } })
    : await api(act === 'join' ? '/api/classes/join' : '/api/family/watch', { method: 'POST', body: { code: v } });
  if (!r.ok) return toast(errText(r.data.error));
  reload();
});
document.addEventListener('langchange', () => { const sid = new URLSearchParams(location.search).get('student'); sid ? renderOne(sid) : render(); });

document.addEventListener('DOMContentLoaded', async () => {
  if (!await loadMe()) { location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search); return; }
  const p = new URLSearchParams(location.search);
  if (/^\d{1,12}$/.test(p.get('student') || '')) return renderOne(p.get('student'));
  if (['student', 'parent', 'teacher'].includes(p.get('tab'))) tab = p.get('tab');
  await reload();
  gsap.from('.page-head > *', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
});
