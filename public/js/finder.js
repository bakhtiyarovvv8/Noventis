// Подбор вузов: фильтр по стране, бюджету и направлению → топ. Общий для «Вузов мира» и «Избранных вузов».
// Нужны data.js, abroad.js, unis-data.js. mountFinder(box, { onChange }) рисует фильтр и топ в box.
const FINDER_STORE = 'kj_finder';
const BUDGETS = [0, 1000, 3000, 5000, 10000, 20000, 35000];
const COUNTRY = cc => COUNTRIES.find(c => c.cc === cc);

// стоимость года: только обучение или обучение + жизнь (средний образ жизни) + виза и перелёты
function uniYear(u, withLife) {
  const c = COUNTRY(u[1]);
  if (!withLife || !c) return uniTuition(u);
  return uniTuition(u) + (c.live[0] + c.live[1]) / 2 * 12 + c.once;
}
const money = v => v === 0 ? tx({ ru: 'бесплатно', en: 'free', uz: 'bepul' }) : '$' + Math.round(v).toLocaleString(locale());

function finderState() {
  const p = new URLSearchParams(location.search);
  let s = {};
  try { s = JSON.parse(localStorage.getItem(FINDER_STORE) || '{}'); } catch {}
  return {
    cc: p.get('cc') ?? s.cc ?? '', budget: Number(p.get('budget') ?? s.budget ?? 0), field: p.get('field') ?? s.field ?? '',
    life: p.has('life') ? p.get('life') === 'true' : !!s.life, sort: p.get('sort') ?? s.sort ?? 'top', q: p.get('q') ?? '',
  };
}

// Топ по фильтру: сначала сложность (1 — самые сильные), потом вузы, прямо названные в направлении, потом балл
function finderTop(st) {
  const q = st.q.trim().toLowerCase();
  const list = UNIS.filter(u => (!st.cc || u[1] === st.cc) && uniFits(u, st.field)
    && (!st.budget || uniYear(u, st.life) <= st.budget) && (!q || u[0].toLowerCase().includes(q)));
  const named = u => st.field && FIELDS[st.field] && (FIELDS[st.field].world.some(([n]) => n === u[0]) || FIELDS[st.field].uz.includes(u[0])) ? 0 : 1;
  return list.sort(st.sort === 'cheap'
    ? (a, b) => uniYear(a, st.life) - uniYear(b, st.life) || a[5] - b[5]
    : (a, b) => a[5] - b[5] || named(a) - named(b) || b[4] - a[4] || uniYear(a, st.life) - uniYear(b, st.life));
}

const AREA_SHORT = {
  ict: L('IT', 'IT'), eng: L('Инженерия', 'Engineering'), sci: L('Науки', 'Sciences'), health: L('Медицина', 'Medicine'),
  agro: L('Агро', 'Agriculture'), biz: L('Бизнес и право', 'Business & law'), soc: L('Общество', 'Society'), arts: L('Искусство', 'Arts'),
  hum: L('Гуманитарные', 'Humanities'), edu: L('Образование', 'Education'), serv: L('Сервис и спорт', 'Services & sport'),
};

// Карточка вуза из топа: цена, требования, сильные области, ♡, переход в калькуляторы
function uniCard(u, i, st) {
  const [name, cc, ielts, sat, gpa, tier] = u;
  const req = [ielts ? 'IELTS ' + ielts.toFixed(1) : tx({ ru: 'тест uzbmb / экзамен вуза', en: 'uzbmb / entrance exam', uz: 'uzbmb / kirish imtihoni' }), sat ? 'SAT ' + sat : ''].filter(Boolean).join(' · ');
  const tierName = [, L('топ мира', 'world top'), L('очень сильный', 'very strong'), L('сильный', 'strong'), L('доступный', 'accessible')][tier];
  const q = `name=${encodeURIComponent(name)}&cc=${cc}${st && st.field ? '&field=' + st.field : ''}`;
  return `<div class="uni uni-top">
    ${i != null ? `<div class="uni-rank">${i + 1}</div>` : ''}
    <div class="meta"><b>${escapeHtml(nm(name))}</b>
      <span>${escapeHtml(placeName(cc))} · ${tx(tierName)} · ${req}</span>
      <div class="uni-tags">${uniAreas(u).map(a => `<em>${tx(AREA_SHORT[a])}</em>`).join('')}</div></div>
    <div class="uni-price"><b>${money(uniTuition(u))}</b><small>${tx({ ru: 'обучение в год', en: 'tuition / year', uz: 'yillik oʻqish' })}</small>
      ${st && st.life && COUNTRY(cc) ? `<small>${tx({ ru: 'с жизнью', en: 'with living', uz: 'yashash bilan' })}: ${money(uniYear(u, true))}</small>` : ''}</div>
    <div class="uni-acts"><a class="btn btn-ghost" href="/cost?${q}">${tx({ ru: 'Стоимость', en: 'Cost', uz: 'Narx' })}</a>
      <a class="btn btn-ghost" href="/chances?${q}">${tx({ ru: 'Шансы', en: 'Chances', uz: 'Imkoniyat' })}</a>${heart(name, cc)}</div>
  </div>`;
}

function mountFinder(box, { onChange, limit = 30 } = {}) {
  const st = finderState();
  let shown = limit;
  const ccs = [...new Set(UNIS.map(u => u[1]))];

  function form() {
    const counts = {};
    UNIS.forEach(u => counts[u[1]] = (counts[u[1]] || 0) + 1);
    box.querySelector('.fd-form').innerHTML = `
      <label class="calc-field"><span>${t('co_country')}</span><select class="select" data-k="cc">
        <option value="">${t('cat_all')} (${UNIS.length})</option>
        ${ccs.map(cc => [cc, placeName(cc)]).sort((a, b) => a[1].localeCompare(b[1], LANG)).map(([cc, n]) => `<option value="${cc}" ${cc === st.cc ? 'selected' : ''}>${escapeHtml(n)} (${counts[cc]})</option>`).join('')}
      </select></label>
      <label class="calc-field"><span>${tx({ ru: 'Бюджет в год, до', en: 'Budget per year, up to', uz: 'Yillik byudjet, gacha' })}</span><select class="select" data-k="budget">
        ${BUDGETS.map(b => `<option value="${b}" ${b === st.budget ? 'selected' : ''}>${b ? money(b) : tx({ ru: 'Любой', en: 'Any', uz: 'Istalgan' })}</option>`).join('')}
      </select></label>
      <label class="calc-field"><span>${tx({ ru: 'Направление', en: 'Field', uz: 'Yoʻnalish' })}</span><select class="select" data-k="field">${fieldOptions(st.field, tx({ ru: 'Любое', en: 'Any', uz: 'Istalgan' }))}</select></label>
      <label class="calc-field"><span>${tx({ ru: 'Сортировка', en: 'Sort', uz: 'Saralash' })}</span><select class="select" data-k="sort">
        <option value="top" ${st.sort === 'top' ? 'selected' : ''}>${tx({ ru: 'Сначала сильные', en: 'Strongest first', uz: 'Avval kuchlilari' })}</option>
        <option value="cheap" ${st.sort === 'cheap' ? 'selected' : ''}>${tx({ ru: 'Сначала дешёвые', en: 'Cheapest first', uz: 'Avval arzonlari' })}</option></select></label>`;
    box.querySelector('[data-k="life"]').checked = st.life;
  }

  function results() {
    const list = finderTop(st);
    const out = box.querySelector('.fd-out');
    out.innerHTML = `<div class="fd-count">${tx({ ru: 'Топ по фильтру', en: 'Top by filter', uz: 'Filtr boʻyicha top' })}: <b>${list.length}</b></div>`
      + (list.length ? `<div class="uni-list">${list.slice(0, shown).map((u, i) => uniCard(u, i, st)).join('')}</div>`
        : `<div class="empty">${tx({ ru: 'Под такие условия вузов нет. Подними бюджет или выбери «Любое» направление.', en: 'No universities match. Raise the budget or pick “Any” field.', uz: 'Bunday shartlarga mos oliygoh yoʻq. Byudjetni oshiring yoki «Istalgan» yoʻnalishni tanlang.' })}</div>`)
      + (list.length > shown ? `<div class="more-row"><button class="btn btn-ghost fd-more">${t('cat_more')}</button></div>` : '');
    // фильтр — в адресе, чтобы ссылкой можно было поделиться, и в браузере, чтобы не выбирать заново
    const u = new URL(location.href);
    for (const k of ['cc', 'budget', 'field', 'sort']) st[k] && st[k] !== 'top' ? u.searchParams.set(k, st[k]) : u.searchParams.delete(k);
    st.life ? u.searchParams.set('life', 'true') : u.searchParams.delete('life');
    history.replaceState(null, '', u);
    try { localStorage.setItem(FINDER_STORE, JSON.stringify({ cc: st.cc, budget: st.budget, field: st.field, life: st.life, sort: st.sort })); } catch {}
    if (onChange) onChange(st, list);
  }

  box.innerHTML = `<article class="card fd">
      <div class="calc-form fd-form"></div>
      <label class="pick" style="margin-top:16px"><input type="checkbox" data-k="life"><span>${tx({ ru: 'Считать бюджет вместе с жизнью, визой и перелётами', en: 'Count living costs, visa and flights in the budget', uz: 'Byudjetga yashash, viza va parvozlarni ham qoʻshish' })}</span></label>
    </article><div class="fd-out"></div>`;
  form();
  box.addEventListener('change', e => {
    const k = e.target.dataset.k;
    if (!k) return;
    st[k] = k === 'budget' ? Number(e.target.value) : k === 'life' ? e.target.checked : e.target.value;
    shown = limit;
    results();
  });
  box.addEventListener('click', e => { if (e.target.closest('.fd-more')) { shown += limit; results(); } });
  document.addEventListener('langchange', () => {
    box.querySelector('[data-k="life"]').nextElementSibling.textContent = tx({ ru: 'Считать бюджет вместе с жизнью, визой и перелётами', en: 'Count living costs, visa and flights in the budget', uz: 'Byudjetga yashash, viza va parvozlarni ham qoʻshish' });
    form(); results();
  });
  document.addEventListener('favchange', () => paintHearts());
  results();
  return { state: st, refresh: results, setQuery: q => { st.q = q; shown = limit; results(); } };
}
