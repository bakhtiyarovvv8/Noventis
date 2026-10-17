// Калькулятор шансов: баллы → «с запасом / реально / мечта»
const $ = id => document.getElementById(id);
const CCS = [...new Set(UNI_REQ.map(u => u[1]))];
let picked = new Set();   // пусто — все страны

// форма запоминается в браузере, чтобы не вводить заново
const STORE = 'kj_chances';
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } })();

function fillForm() {
  const ielts = $('ielts').value || saved.ielts || '';
  $('ielts').innerHTML = `<option value="">${t('ch_no_ielts')}</option>`
    + [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4].map(v => `<option value="${v}">${v.toFixed(1)}</option>`).join('');
  $('ielts').value = ielts;
  const ol = $('olymp').value || saved.olymp || '0';
  $('olymp').innerHTML = [0, 1, 2, 3].map(v => `<option value="${v}">${t('ch_ol' + v)}</option>`).join('');
  $('olymp').value = ol;
  $('countries').innerHTML = `<button type="button" class="chip-btn ${picked.size ? '' : 'on'}" data-cc="">${t('ch_all')}</button>`
    + CCS.map(cc => [cc, placeName(cc)]).sort((a, b) => a[1].localeCompare(b[1], LANG))
      .map(([cc, n]) => `<button type="button" class="chip-btn ${picked.has(cc) ? 'on' : ''}" data-cc="${cc}">${escapeHtml(n)}</button>`).join('');
}

function readForm() {
  const sat = parseInt($('sat').value, 10);
  return {
    ielts: $('ielts').value ? Number($('ielts').value) : null,
    sat: sat >= 400 && sat <= 1600 ? sat : null,
    gpa: Number($('gpa').value),
    olymp: Number($('olymp').value),
    ru: $('ru').checked,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Оценка одного вуза. Возвращает категорию и пометки.
function judge(u, me) {
  const [, , reqI, reqS, reqG, tier, flags] = u;
  const notes = [];
  let blocked = false;
  if (reqI && (me.ielts == null || me.ielts < reqI)) { notes.push(`${t('ch_need_ielts')} ${reqI.toFixed(1)}`); blocked = true; }
  if (flags.includes('ru') && !me.ru) { notes.push(t('ch_need_ru')); blocked = true; }
  if (flags.includes('sat') && me.sat == null) { notes.push(t('ch_need_sat')); blocked = true; }
  if (flags.includes('f')) notes.push(t('ch_found'));
  if (flags.includes('s')) notes.push(t('ch_kolleg'));
  if (tier === 1) notes.push(t('ch_lottery'));

  let m = (me.gpa - reqG) * 2 + [0, .3, .8, 1.5][me.olymp];
  if (reqI && me.ielts != null) m += clamp(me.ielts - reqI, -2, 1.5);
  if (reqS) m += me.sat != null ? clamp((me.sat - reqS) / 100, -3, 1.5) : (tier <= 2 ? -.5 : 0);

  let cat;
  if (blocked || tier === 1) cat = 'reach';
  else if (tier === 2) cat = m >= 1 ? 'match' : 'reach';
  else if (tier === 3) cat = m >= 1 ? 'safe' : m >= -.3 ? 'match' : 'reach';
  else cat = m >= 0 ? 'safe' : m >= -1 ? 'match' : 'reach';
  return { cat, m, notes };
}

function render() {
  const me = readForm();
  $('gpaV').textContent = me.gpa.toFixed(1);
  try { localStorage.setItem(STORE, JSON.stringify({ ielts: $('ielts').value, sat: $('sat').value, gpa: $('gpa').value, olymp: $('olymp').value, ru: me.ru })); } catch {}
  const unis = UNI_REQ.filter(u => !picked.size || picked.has(u[1]));
  const groups = { safe: [], match: [], reach: [] };
  unis.forEach(u => { const j = judge(u, me); groups[j.cat].push({ u, ...j }); });
  Object.values(groups).forEach(g => g.sort((a, b) => a.u[5] - b.u[5] || b.m - a.m));

  // подсказка: сколько вузов станут реальнее, если поднять IELTS
  const realistic = who => unis.filter(u => judge(u, who).cat !== 'reach').length;
  const next = [6, 6.5, 7, 7.5].find(v => me.ielts == null || v > me.ielts);
  const gain = next ? realistic({ ...me, ielts: next }) - realistic(me) : 0;
  $('tip').innerHTML = gain > 0 ? `<div class="alert">${t('ch_tip')} <b>${next.toFixed(1)}</b> ${t('ch_tip2')} <b>${gain}</b></div>` : '';

  const item = x => {
    const [name, cc, reqI, reqS, reqG] = x.u;
    const req = [reqI ? 'IELTS ' + reqI.toFixed(1) : '', reqS ? 'SAT ' + reqS : '', (LANG === 'ru' ? 'балл ' : 'GPA ') + reqG.toFixed(1)].filter(Boolean).join(' · ');
    return `<div class="uni"><div class="meta"><b>${escapeHtml(name)}</b><span>${escapeHtml(placeName(cc))} · ${req}</span>
      ${x.notes.length ? `<div class="ch-notes">${x.notes.map(n => `<em>${n}</em>`).join('')}</div>` : ''}</div>${heart(name, cc)}</div>`;
  };
  $('out').innerHTML = [['safe', 'ch_safe'], ['match', 'ch_match'], ['reach', 'ch_reach']].map(([k, key]) => `
    <section class="ch-col ch-${k}">
      <h3>${t(key)} <span>${groups[k].length}</span></h3><p class="note">${t(key + '_d')}</p>
      <div class="uni-list">${groups[k].map(item).join('') || '<div class="empty">—</div>'}</div>
    </section>`).join('');
}

document.addEventListener('input', e => { if (e.target.closest('.calc-form, #ru')) render(); });
document.addEventListener('change', e => { if (e.target.closest('.calc-form, #ru')) render(); });
$('countries').addEventListener('click', e => {
  const b = e.target.closest('.chip-btn');
  if (!b) return;
  const cc = b.dataset.cc;
  if (!cc) picked.clear(); else picked.has(cc) ? picked.delete(cc) : picked.add(cc);
  fillForm(); render();
});
document.addEventListener('langchange', () => { fillForm(); render(); });
document.addEventListener('favchange', render);

document.addEventListener('DOMContentLoaded', async () => {
  await loadMe(); await loadFavs();
  fillForm();
  if (saved.sat) $('sat').value = saved.sat;
  if (saved.gpa) $('gpa').value = saved.gpa;
  $('ru').checked = !!saved.ru;
  render();
  gsap.from('.page-head > *, .card', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
});
