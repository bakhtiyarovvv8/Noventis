// Калькулятор стоимости учёбы за рубежом: доллары + сумы по курсу ЦБ, гранты. Вуз и направление — по желанию.
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let RATE = { rate: null, date: null };
let UNI = params.get('name') ? findUni(params.get('name'), params.get('cc')) || null : null;   // выбранный вуз или null
let last = null;
const T3 = (ru, en, uz) => tx({ ru, en, uz });

const usd = v => '$' + Math.round(v).toLocaleString(locale());
// суммы в сумах округляем до тысяч; больше миллиона — «млн»
const uzs = v => {
  if (!RATE.rate) return '';
  const s = v * RATE.rate;
  return s >= 1e6
    ? (s / 1e6).toLocaleString(locale(), { maximumFractionDigits: 1 }) + tx({ ru: ' млн ', en: 'M ', uz: ' mln ' }) + t('sum')
    : Math.round(s / 1000).toLocaleString(locale()) + tx({ ru: ' тыс. ', en: 'k ', uz: ' ming ' }) + t('sum');
};
const range = (a, b) => a === b ? usd(a) : `${usd(a)} – ${usd(b)}`;
const rangeUzs = (a, b) => RATE.rate ? (a === b ? uzs(a) : `${uzs(a)} – ${uzs(b)}`) : '';

function fillForm() {
  const keep = UNI ? UNI[1] : $('cc').value || params.get('cc') || 'KR';
  $('cc').innerHTML = COUNTRIES.map(c => [c.cc, placeName(c.cc)]).sort((a, b) => a[1].localeCompare(b[1], LANG))
    .map(([cc, n]) => `<option value="${cc}">${escapeHtml(n)}</option>`).join('');
  $('cc').value = COUNTRIES.some(c => c.cc === keep) ? keep : 'KR';
  const ty = $('type').value || 'pub';
  $('type').innerHTML = `<option value="pub">${t('co_pub')}</option><option value="priv">${t('co_priv')}</option>`;
  $('type').value = ty;
  $('type').disabled = !!UNI;
  const st = $('style').value || '1';
  $('style').innerHTML = [['0', 'co_eco'], ['1', 'co_mid'], ['2', 'co_comf']].map(([v, k]) => `<option value="${v}">${t(k)}</option>`).join('');
  $('style').value = st;
  $('field').innerHTML = fieldOptions($('field').value || params.get('field') || '', T3('Не выбрано', 'Not selected', 'Tanlanmagan'));
  $('uniBox').innerHTML = UNI
    ? `<span class="chip gold">${escapeHtml(nm(UNI[0]))} · ${money(uniTuition(UNI))} ${T3('в год', 'per year', 'yiliga')}<button type="button" id="uniClear" aria-label="${t('delete')}">×</button></span>
       <button type="button" class="btn btn-ghost" id="uniPick">${T3('Другой вуз', 'Another university', 'Boshqa oliygoh')}</button>`
    : `<button type="button" class="btn btn-ghost" id="uniPick">+ ${T3('Выбрать вуз', 'Choose a university', 'Oliygoh tanlash')}</button>
       <span class="note" style="margin:0">${T3('необязательно: без вуза считаем по средним ценам страны', 'optional: without one we use the country’s average prices', 'ixtiyoriy: oliygohsiz mamlakat oʻrtacha narxlari olinadi')}</span>`;
}

// Окно выбора вуза: поиск по названию, по направлению и стране из формы
function pickUni() {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${T3('Выбери вуз', 'Choose a university', 'Oliygohni tanlang')}</h3>
    <input class="input" type="search" placeholder="${t('cat_search')}" autocomplete="off">
    <label class="pick" style="margin-top:12px"><input type="checkbox" checked><span>${T3('Только страна из формы', 'Only the country from the form', 'Faqat formadagi mamlakat')}: ${escapeHtml(placeName($('cc').value))}</span></label>
    <div class="pick-list"></div><div class="row"><button type="button" class="btn btn-ghost" data-close>${t('cancel')}</button></div></div>`;
  const $in = back.querySelector('input[type=search]'), $only = back.querySelector('input[type=checkbox]'), $list = back.querySelector('.pick-list');
  const field = $('field').value;
  const draw = () => {
    const q = $in.value.trim().toLowerCase();
    const list = UNIS.filter(u => COUNTRY(u[1]) && (!$only.checked || u[1] === $('cc').value) && uniFits(u, field) && (!q || u[0].toLowerCase().includes(q)))
      .sort((a, b) => a[5] - b[5] || b[4] - a[4]).slice(0, 60);
    $list.innerHTML = list.map(u => `<button type="button" data-k="${escapeHtml(uniKey(u))}">${escapeHtml(nm(u[0]))}<span>${escapeHtml(placeName(u[1]))} · ${money(uniTuition(u))} ${T3('в год', 'per year', 'yiliga')}</span></button>`).join('')
      || `<div class="empty">${t('cat_empty')}</div>`;
  };
  const close = () => back.remove();
  back.addEventListener('click', e => {
    if (e.target === back || e.target.closest('[data-close]')) return close();
    const b = e.target.closest('[data-k]');
    if (!b) return;
    UNI = UNIS.find(u => uniKey(u) === b.dataset.k);
    close(); fillForm(); render();
  });
  $in.addEventListener('input', draw);
  $only.addEventListener('change', draw);
  document.body.appendChild(back);
  draw(); $in.focus();
}

function render() {
  const c = COUNTRIES.find(x => x.cc === $('cc').value);
  if (UNI && UNI[1] !== c.cc) UNI = null;   // сменили страну — вуз сбрасываем
  const years = Number($('years').value), style = Number($('style').value);
  $('yearsV').textContent = years;
  const [tMin, tMax] = UNI ? [uniTuition(UNI), uniTuition(UNI)] : c[$('type').value];
  // эконом — нижняя граница, комфорт — верхняя, средний — середина
  const month = c.live[0] + (c.live[1] - c.live[0]) * style / 2;
  const living = month * 12;
  const yMin = tMin + living + c.once, yMax = tMax + living + c.once;

  const cell = (label, main, sub, big) => `<div class="cost-cell ${big ? 'big' : ''}"><small>${label}</small><b>${main}</b><span>${sub}</span></div>`;
  const grants = [...c.grants, ...(c.cc !== 'UZ' ? ['el_yurt'] : [])].map(id => {
    const g = GRANT_INFO[id];
    // сколько останется платить при этом гранте
    const left = g.covers === 'full' ? c.once : g.covers === 'tuition' ? living + c.once : (tMin + tMax) / 4 + living + c.once;
    const what = { full: 'co_full', tuition: 'co_tuit', partial: 'co_part' }[g.covers];
    return `<li><div><b>${tx(g.n)}</b> — ${t(what)}<br><span class="note" style="margin:0">${tx(g.lvl)} · ${t('co_left')}: <b style="color:var(--gold-2)">${usd(left)}</b>${RATE.rate ? ' (' + uzs(left) + ')' : ''}</span></div></li>`;
  });
  const fid = $('field').value;
  const fieldNote = fid && UNI && !uniFits(UNI, fid)
    ? `<div class="alert">${T3(`«${tx(FIELDS[fid].name)}» — не самая сильная сторона этого вуза. Посмотри другие в «Избранных вузах» по фильтру.`, `“${tx(FIELDS[fid].name)}” isn’t this university’s strongest area. Check others in “Saved universities”.`, `«${tx(FIELDS[fid].name)}» bu oliygohning eng kuchli tomoni emas. «Saralangan oliygohlar»da boshqalarini koʻring.`)}</div>` : '';

  last = { cc: c.cc, uni: UNI ? UNI[0] : '', field: fid, type: UNI ? '' : $('type').value, years, style, yearMin: yMin, yearMax: yMax, totalMin: yMin * years, totalMax: yMax * years };
  $('out').innerHTML = fieldNote + `
    <article class="card">
      <h3 style="margin-bottom:18px">${UNI ? escapeHtml(nm(UNI[0])) + ' · ' : ''}${escapeHtml(placeName(c.cc))}</h3>
      <div class="cost-grid">
        ${cell(t('co_tuition'), range(tMin, tMax), rangeUzs(tMin, tMax))}
        ${cell(t('co_living'), usd(living), `${usd(month)} ${t('co_month')}${RATE.rate ? ' · ' + uzs(month) : ''}`)}
        ${cell(t('co_once'), usd(c.once), uzs(c.once))}
        ${cell(t('co_year'), range(yMin, yMax), rangeUzs(yMin, yMax), true)}
        ${cell(`${t('co_total')} · ${years}`, range(yMin * years, yMax * years), rangeUzs(yMin * years, yMax * years), true)}
      </div>
      ${RATE.rate ? `<p class="note">${t('co_rate')}: 1 $ = ${RATE.rate.toLocaleString(locale())} ${t('sum')} · ${RATE.date}</p>` : ''}
      <div class="more-row" style="justify-content:flex-start"><button class="btn btn-gold" id="save">${T3('Сохранить расчёт в кабинет', 'Save to dashboard', 'Hisobni kabinetga saqlash')}</button>
        ${UNI ? `<a class="btn btn-ghost" href="/chances?name=${encodeURIComponent(UNI[0])}&cc=${UNI[1]}${fid ? '&field=' + fid : ''}">${t('ch_title')} →</a>` : ''}</div>
    </article>
    <article class="card">
      <h4 class="rank" style="margin:0 0 16px">${t('co_grants')}</h4>
      ${grants.length ? `<ul class="list" style="gap:14px">${grants.join('')}</ul>` : `<p class="note">${t('co_no_grants')}</p>`}
    </article>`;
  const u = new URL(location.href);
  u.searchParams.set('cc', c.cc);
  UNI ? u.searchParams.set('name', UNI[0]) : u.searchParams.delete('name');
  fid ? u.searchParams.set('field', fid) : u.searchParams.delete('field');
  history.replaceState(null, '', u);
}

document.addEventListener('input', e => { if (e.target.closest('.calc-form')) render(); });
document.addEventListener('change', e => {
  if (!e.target.closest('.calc-form')) return;
  if (e.target.id === 'cc') { UNI = null; fillForm(); }
  render();
});
document.addEventListener('click', async e => {
  if (e.target.closest('#uniPick')) return pickUni();
  if (e.target.closest('#uniClear')) { UNI = null; fillForm(); return render(); }
  if (!e.target.closest('#save')) return;
  if (!ME) { toast(T3('Войди, чтобы сохранять расчёты', 'Log in to save calculations', 'Hisoblarni saqlash uchun kiring')); setTimeout(() => location.href = '/auth?next=' + encodeURIComponent(location.pathname + location.search), 900); return; }
  const r = await api('/api/calcs', { method: 'POST', body: { kind: 'cost', data: last } });
  toast(r.ok ? T3('Расчёт сохранён в кабинете', 'Saved to your dashboard', 'Hisob kabinetda saqlandi') : t(r.data.error === 'too_many' ? 'err_too_many' : 'err_server'));
});
document.addEventListener('langchange', () => { fillForm(); render(); });

document.addEventListener('DOMContentLoaded', async () => {
  loadMe();
  fillForm();
  render();
  gsap.from('.page-head > *, .card', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
  const r = await api('/api/rate');
  if (r.ok && r.data.rate) { RATE = r.data; render(); }
});
