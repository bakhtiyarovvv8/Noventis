// Каталог «Все вузы мира»: поиск по названию и стране прямо в браузере
const PAGE = 40;
const $q = document.getElementById('q'), $cc = document.getElementById('cc');
const $list = document.getElementById('list'), $count = document.getElementById('count'), $more = document.getElementById('more');
const params = new URLSearchParams(location.search);

let ROWS = [];        // [name, cc, web]
let found = [];
let shown = 0;

// поиск без учёта регистра и диакритики: «Universität» находится по «universitat»
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function fillCountries() {
  const counts = {};
  ROWS.forEach(r => { counts[r[1]] = (counts[r[1]] || 0) + 1; });
  const list = Object.keys(counts).map(cc => [cc, placeName(cc)]).sort((a, b) => a[1].localeCompare(b[1], LANG));
  const cur = $cc.value || params.get('cc') || '';
  $cc.innerHTML = `<option value="">${t('cat_all')} (${ROWS.length.toLocaleString(LANG)})</option>`
    + list.map(([cc, n]) => `<option value="${cc}">${escapeHtml(n)} (${counts[cc]})</option>`).join('');
  $cc.value = counts[cur] ? cur : '';
}

function search() {
  const q = fold($q.value.trim()), cc = $cc.value;
  found = ROWS.filter(r => (!cc || r[1] === cc) && (!q || r[3].includes(q)));
  shown = 0;
  $list.innerHTML = '';
  $count.textContent = `${t('cat_found')}: ${found.length.toLocaleString(LANG)}`;
  if (!found.length) $list.innerHTML = `<div class="empty">${t('cat_empty')}</div>`;
  more();
  // фильтры — в адресе, чтобы ссылкой можно было поделиться
  const u = new URL(location.href);
  $q.value.trim() ? u.searchParams.set('q', $q.value.trim()) : u.searchParams.delete('q');
  cc ? u.searchParams.set('cc', cc) : u.searchParams.delete('cc');
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
$q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
$cc.addEventListener('change', search);
$more.addEventListener('click', more);
document.addEventListener('langchange', () => { fillCountries(); search(); });

document.addEventListener('DOMContentLoaded', async () => {
  $list.innerHTML = `<div class="loader" style="min-height:30vh"><div class="orbit"></div></div>`;
  const [, data] = await Promise.all([loadMe().then(loadFavs), fetch('/data/universities.json').then(r => r.json())]);
  // к строке добавляем «свёрнутое» название для быстрого поиска
  ROWS = data.rows.map(r => [r[0], r[1], r[2], fold(r[0])]);
  $q.value = params.get('q') || '';
  fillCountries();
  search();
  gsap.from('.page-head > *, .filters', { y: 30, opacity: 0, stagger: .07, duration: 1, ease: 'expo.out' });
});
