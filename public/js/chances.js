// Калькулятор шансов: баллы + направление → «с запасом / реально / мечта», выводы, переход в калькулятор стоимости
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const CCS = [...new Set(UNIS.map(u => u[1]))];
let picked = new Set(params.get('cc') ? [params.get('cc')] : []);   // пусто — все страны
let openKey = params.get('name') && params.get('cc') ? params.get('cc') + '|' + params.get('name') : '';
let last = null;   // последний расчёт — для сохранения

// форма запоминается в браузере, чтобы не вводить заново
const STORE = 'kj_chances';
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } })();
const T3 = (ru, en, uz) => tx({ ru, en, uz });

function fillForm() {
  const ielts = $('ielts').value || saved.ielts || '';
  $('ielts').innerHTML = `<option value="">${t('ch_no_ielts')}</option>`
    + [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4].map(v => `<option value="${v}">${v.toFixed(1)}</option>`).join('');
  $('ielts').value = ielts;
  const ol = $('olymp').value || saved.olymp || '0';
  $('olymp').innerHTML = [0, 1, 2, 3].map(v => `<option value="${v}">${t('ch_ol' + v)}</option>`).join('');
  $('olymp').value = ol;
  const fid = $('field').value || params.get('field') || saved.field || '';
  $('field').innerHTML = fieldOptions(fid, T3('Любое направление', 'Any field', 'Istalgan yoʻnalish'));
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
    field: $('field').value,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Оценка одного вуза. Возвращает категорию, пометки и чего не хватает.
function judge(u, me) {
  const [, , reqI, reqS, reqG, tier, flags] = u;
  const notes = [], gaps = [];
  let blocked = false;
  if (reqI && (me.ielts == null || me.ielts < reqI)) { notes.push(`${t('ch_need_ielts')} ${reqI.toFixed(1)}`); gaps.push('ielts'); blocked = true; }
  if (flags.includes('ru') && !me.ru) { notes.push(t('ch_need_ru')); gaps.push('ru'); blocked = true; }
  if (flags.includes('sat') && me.sat == null) { notes.push(t('ch_need_sat')); gaps.push('sat'); blocked = true; }
  if (flags.includes('f')) notes.push(t('ch_found'));
  if (flags.includes('s')) notes.push(t('ch_kolleg'));
  if (tier === 1) notes.push(t('ch_lottery'));

  let m = (me.gpa - reqG) * 2 + [0, .3, .8, 1.5][me.olymp];
  if (reqI && me.ielts != null) m += clamp(me.ielts - reqI, -2, 1.5);
  if (reqS) m += me.sat != null ? clamp((me.sat - reqS) / 100, -3, 1.5) : (tier <= 2 ? -.5 : 0);
  if (!blocked && m < -1) gaps.push('gpa');

  let cat;
  if (blocked || tier === 1) cat = 'reach';
  else if (tier === 2) cat = m >= 1 ? 'match' : 'reach';
  else if (tier === 3) cat = m >= 1 ? 'safe' : m >= -.3 ? 'match' : 'reach';
  else cat = m >= 0 ? 'safe' : m >= -1 ? 'match' : 'reach';
  return { cat, m, notes, gaps };
}

// Выводы: сколько подходит, лучший реальный вариант, самый дешёвый, чего не хватает
function conclusions(me, unis, groups) {
  const ok = [...groups.safe, ...groups.match];
  const F = me.field && FIELDS[me.field];
  const items = [];
  items.push(F
    ? T3(`По направлению «${tx(F.name)}» подходит ${unis.length} вузов из нашего списка.`, `${unis.length} universities on our list are strong in “${tx(F.name)}”.`, `«${tx(F.name)}» yoʻnalishi boʻyicha roʻyxatimizdagi ${unis.length} ta oliygoh mos keladi.`)
    : T3(`Оценено ${unis.length} вузов. Выбери направление — выводы станут точнее.`, `${unis.length} universities assessed. Pick a field for sharper advice.`, `${unis.length} ta oliygoh baholandi. Yoʻnalishni tanlang — xulosalar aniqroq boʻladi.`));
  items.push(T3(`С запасом — <b>${groups.safe.length}</b>, реально — <b>${groups.match.length}</b>, мечта — <b>${groups.reach.length}</b>.`,
    `Safe — <b>${groups.safe.length}</b>, realistic — <b>${groups.match.length}</b>, dream — <b>${groups.reach.length}</b>.`,
    `Zaxira — <b>${groups.safe.length}</b>, real — <b>${groups.match.length}</b>, orzu — <b>${groups.reach.length}</b>.`));
  if (ok.length) {
    const best = [...ok].sort((a, b) => a.u[5] - b.u[5] || b.u[4] - a.u[4])[0].u;
    const cheap = [...ok].sort((a, b) => a.u[7] - b.u[7])[0].u;
    items.push(T3(`Самый сильный реальный вариант — <b>${escapeHtml(nm(best[0]))}</b> (${escapeHtml(placeName(best[1]))}).`,
      `Strongest realistic option — <b>${escapeHtml(nm(best[0]))}</b> (${escapeHtml(placeName(best[1]))}).`,
      `Eng kuchli real variant — <b>${escapeHtml(nm(best[0]))}</b> (${escapeHtml(placeName(best[1]))}).`));
    if (cheap !== best) items.push(T3(`Самый недорогой из реальных — <b>${escapeHtml(nm(cheap[0]))}</b>: ${money(uniTuition(cheap))} в год за обучение.`,
      `Most affordable realistic one — <b>${escapeHtml(nm(cheap[0]))}</b>: ${money(uniTuition(cheap))} tuition per year.`,
      `Realdan eng arzoni — <b>${escapeHtml(nm(cheap[0]))}</b>: yiliga ${money(uniTuition(cheap))} oʻqish.`));
  } else {
    items.push(T3('Реальных вариантов пока нет — смотри, чего не хватает, ниже.', 'No realistic options yet — see what’s missing below.', 'Hozircha real variant yoʻq — pastda nima yetishmasligini koʻring.'));
  }
  // главное, чего не хватает: чаще всего встречающаяся причина «мечты»
  const gapCount = {};
  groups.reach.forEach(x => x.gaps.forEach(g => gapCount[g] = (gapCount[g] || 0) + 1));
  const top = Object.entries(gapCount).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const why = {
      ielts: T3('не хватает IELTS', 'IELTS is too low', 'IELTS yetarli emas'), sat: T3('нужен SAT', 'SAT is required', 'SAT kerak'),
      ru: T3('нужен русский язык', 'Russian is required', 'rus tili kerak'), gpa: T3('нужен средний балл выше', 'a higher school average is needed', 'yuqoriroq oʻrtacha baho kerak'),
    }[top[0]];
    items.push(T3(`Главное, что мешает: ${why} — так у ${top[1]} вузов из «мечты».`, `Main obstacle: ${why} — for ${top[1]} of your “dream” universities.`, `Asosiy toʻsiq: ${why} — «orzu»dagi ${top[1]} ta oliygohda.`));
  }
  return `<article class="card ch-sum"><h4 class="rank" style="margin:0 0 14px">${T3('Выводы', 'Conclusions', 'Xulosalar')}</h4>
    <ul class="list">${items.map(i => `<li>${i}</li>`).join('')}</ul>
    <div class="more-row" style="justify-content:flex-start;margin-top:18px"><button class="btn btn-gold" id="save">${T3('Сохранить расчёт в кабинет', 'Save to dashboard', 'Hisobni kabinetga saqlash')}</button></div></article>`;
}

function render() {
  const me = readForm();
  $('gpaV').textContent = me.gpa.toFixed(1);
  try { localStorage.setItem(STORE, JSON.stringify({ ielts: $('ielts').value, sat: $('sat').value, gpa: $('gpa').value, olymp: $('olymp').value, ru: me.ru, field: me.field })); } catch {}
  const unis = UNIS.filter(u => (!picked.size || picked.has(u[1])) && uniFits(u, me.field));
  const groups = { safe: [], match: [], reach: [] };
  unis.forEach(u => { const j = judge(u, me); groups[j.cat].push({ u, ...j }); });
  Object.values(groups).forEach(g => g.sort((a, b) => a.u[5] - b.u[5] || b.m - a.m));

  // подсказка: сколько вузов станут реальнее, если поднять IELTS
  const realistic = who => unis.filter(u => judge(u, who).cat !== 'reach').length;
  const next = [6, 6.5, 7, 7.5].find(v => me.ielts == null || v > me.ielts);
  const gain = next ? realistic({ ...me, ielts: next }) - realistic(me) : 0;
  $('tip').innerHTML = conclusions(me, unis, groups)
    + (gain > 0 ? `<div class="alert">${t('ch_tip')} <b>${next.toFixed(1)}</b> ${t('ch_tip2')} <b>${gain}</b></div>` : '');
  last = { ...me, countries: [...picked], safe: groups.safe.length, match: groups.match.length, reach: groups.reach.length,
    best: [...groups.safe, ...groups.match].slice(0, 5).map(x => [x.u[0], x.u[1]]) };

  // по нажатию на вуз — подробности и кнопка «Калькулятор стоимости»
  const item = x => {
    const [name, cc, reqI, reqS, reqG] = x.u;
    const key = cc + '|' + name, open = key === openKey;
    const req = [reqI ? 'IELTS ' + reqI.toFixed(1) : '', reqS ? 'SAT ' + reqS : '', tx({ ru: 'балл ', en: 'GPA ', uz: 'baho ' }) + reqG.toFixed(1)].filter(Boolean).join(' · ');
    const q = `name=${encodeURIComponent(name)}&cc=${cc}${me.field ? '&field=' + me.field : ''}`;
    return `<div class="uni ch-uni ${open ? 'open' : ''}" data-key="${escapeHtml(key)}"><div class="meta"><b>${escapeHtml(nm(name))}</b><span>${escapeHtml(placeName(cc))} · ${req}</span>
      ${x.notes.length ? `<div class="ch-notes">${x.notes.map(n => `<em>${n}</em>`).join('')}</div>` : ''}
      ${open ? `<div class="ch-more"><span>${T3('Обучение', 'Tuition', 'Oʻqish')}: <b>${money(uniTuition(x.u))}</b> ${T3('в год', 'per year', 'yiliga')}</span>
        <div class="uni-tags">${uniAreas(x.u).map(a => `<em>${tx(AREA_SHORT[a])}</em>`).join('')}</div>
        <a class="btn btn-gold" href="/cost?${q}">${t('co_title')} →</a></div>` : ''}</div>${heart(name, cc)}</div>`;
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
$('out').addEventListener('click', e => {
  if (e.target.closest('.heart, a')) return;
  const row = e.target.closest('.ch-uni');
  if (!row) return;
  openKey = openKey === row.dataset.key ? '' : row.dataset.key;
  render();
});
$('tip').addEventListener('click', async e => {
  if (!e.target.closest('#save')) return;
  if (!ME) { toast(T3('Войди, чтобы сохранять расчёты', 'Log in to save calculations', 'Hisoblarni saqlash uchun kiring')); setTimeout(() => location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search), 900); return; }
  const r = await api('/api/calcs', { method: 'POST', body: { kind: 'chances', data: last } });
  toast(r.ok ? T3('Расчёт сохранён в кабинете', 'Saved to your dashboard', 'Hisob kabinetda saqlandi') : t(r.data.error === 'too_many' ? 'err_too_many' : 'err_server'));
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
  // пришли из списка вузов — показываем этот вуз
  const row = openKey && document.querySelector(`.ch-uni[data-key="${CSS.escape(openKey)}"]`);
  if (row) setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
});
