// «Вузы мира»: сверху топ по фильтру (страна, бюджет, направление), ниже — все 10 000+ вузов с теми же страной и бюджетом
const PAGE = 40;
const $q = document.getElementById('q');
const $list = document.getElementById('list'), $count = document.getElementById('count'), $more = document.getElementById('more');
const params = new URLSearchParams(location.search);

let ROWS = [];        // [name, cc, web, свёрнутое название]
let found = [];
let shown = 0;
let FD = null;        // фильтр из finder.js

// поиск без учёта регистра и диакритики: «Universität» находится по «universitat»
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Бюджет для всего списка — по средней цене государственного вуза в стране (у этих вузов нет своих цен)
function countryFits(cc, st) {
  if (!st.budget) return true;
  const c = COUNTRY(cc);
  if (!c) return false;
  const year = c.pub[0] + (st.life ? (c.live[0] + c.live[1]) / 2 * 12 + c.once : 0);
  return year <= st.budget;
}

function search() {
  const st = FD.state, q = fold($q.value.trim());
  found = ROWS.filter(r => (!st.cc || r[1] === st.cc) && (!q || r[3].includes(q)) && countryFits(r[1], st));
  shown = 0;
  $list.innerHTML = '';
  $count.innerHTML = `${t('cat_found')}: ${found.length.toLocaleString(locale())}`
    + (st.budget ? ` · <span class="note">${t('cat_budget_note')}</span>` : '')
    + (st.field ? ` · <span class="note">${t('cat_field_note')}</span>` : '');
  if (!found.length) $list.innerHTML = `<div class="empty">${t('cat_empty')}</div>`;
  more();
  const u = new URL(location.href);
  $q.value.trim() ? u.searchParams.set('q', $q.value.trim()) : u.searchParams.delete('q');
  history.replaceState(null, '', u);
}

function more() {
  const part = found.slice(shown, shown + PAGE);
  shown += part.length;
  $list.insertAdjacentHTML('beforeend', part.map(([name, cc, web]) => {
    const link = web
      ? `<a class="site" href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer">${t('cat_site')} ↗</a>`
      : `<a class="site" href="https://www.google.com/search?q=${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">${t('cat_google')} ↗</a>`;
    return `<div class="uni"><div class="meta"><b>${escapeHtml(name)}</b><span>${escapeHtml(placeName(cc))}</span></div>${link}${heart(name, cc, web)}</div>`;
  }).join(''));
  $more.classList.toggle('hidden', shown >= found.length);
}

let timer;
$q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { FD.setQuery($q.value); search(); }, 180); });
$more.addEventListener('click', more);
document.addEventListener('langchange', () => { if (FD) search(); });

document.addEventListener('DOMContentLoaded', async () => {
  $list.innerHTML = `<div class="loader" style="min-height:30vh"><div class="orbit"></div></div>`;
  $q.value = params.get('q') || '';
  await loadMe(); await loadFavs();
  FD = mountFinder(document.getElementById('finder'), { onChange: () => ROWS.length && search(), limit: 15 });
  FD.setQuery($q.value);
  const data = await fetch('/data/universities.json').then(r => r.json());
  ROWS = data.rows.map(r => [r[0], r[1], r[2], fold(r[0])]);
  search();
  gsap.from('.page-head > *, .filters, .fd', { y: 30, opacity: 0, stagger: .07, duration: 1, ease: 'expo.out' });
});
