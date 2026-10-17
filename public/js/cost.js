// Калькулятор стоимости учёбы за рубежом: доллары + сумы по курсу ЦБ, гранты
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
let RATE = { rate: null, date: null };

const usd = v => '$' + Math.round(v).toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US');
// суммы в сумах округляем до тысяч; больше миллиона — «млн»
const uzs = v => {
  if (!RATE.rate) return '';
  const s = v * RATE.rate;
  return s >= 1e6
    ? (s / 1e6).toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 }) + (LANG === 'ru' ? ' млн ' : 'M ') + t('sum')
    : Math.round(s / 1000).toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US') + (LANG === 'ru' ? ' тыс. ' : 'k ') + t('sum');
};
const range = (a, b) => a === b ? usd(a) : `${usd(a)} – ${usd(b)}`;
const rangeUzs = (a, b) => RATE.rate ? (a === b ? uzs(a) : `${uzs(a)} – ${uzs(b)}`) : '';

function fillForm() {
  const keep = $('cc').value || params.get('cc') || 'KR';
  $('cc').innerHTML = COUNTRIES.map(c => [c.cc, placeName(c.cc)]).sort((a, b) => a[1].localeCompare(b[1], LANG))
    .map(([cc, n]) => `<option value="${cc}">${escapeHtml(n)}</option>`).join('');
  $('cc').value = COUNTRIES.some(c => c.cc === keep) ? keep : 'KR';
  const ty = $('type').value || 'pub';
  $('type').innerHTML = `<option value="pub">${t('co_pub')}</option><option value="priv">${t('co_priv')}</option>`;
  $('type').value = ty;
  const st = $('style').value || '1';
  $('style').innerHTML = [['0', 'co_eco'], ['1', 'co_mid'], ['2', 'co_comf']].map(([v, k]) => `<option value="${v}">${t(k)}</option>`).join('');
  $('style').value = st;
}

function render() {
  const c = COUNTRIES.find(x => x.cc === $('cc').value);
  const years = Number($('years').value), style = Number($('style').value);
  $('yearsV').textContent = years;
  const [tMin, tMax] = c[$('type').value];
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

  $('out').innerHTML = `
    <article class="card">
      <h3 style="margin-bottom:18px">${escapeHtml(placeName(c.cc))}</h3>
      <div class="cost-grid">
        ${cell(t('co_tuition'), range(tMin, tMax), rangeUzs(tMin, tMax))}
        ${cell(t('co_living'), usd(living), `${usd(month)} ${t('co_month')}${RATE.rate ? ' · ' + uzs(month) : ''}`)}
        ${cell(t('co_once'), usd(c.once), uzs(c.once))}
        ${cell(t('co_year'), range(yMin, yMax), rangeUzs(yMin, yMax), true)}
        ${cell(`${t('co_total')} · ${years}`, range(yMin * years, yMax * years), rangeUzs(yMin * years, yMax * years), true)}
      </div>
      ${RATE.rate ? `<p class="note">${t('co_rate')}: 1 $ = ${RATE.rate.toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US')} ${t('sum')} · ${RATE.date}</p>` : ''}
    </article>
    <article class="card">
      <h4 class="rank" style="margin:0 0 16px">${t('co_grants')}</h4>
      ${grants.length ? `<ul class="list" style="gap:14px">${grants.join('')}</ul>` : `<p class="note">${t('co_no_grants')}</p>`}
    </article>`;
  const u = new URL(location.href); u.searchParams.set('cc', c.cc); history.replaceState(null, '', u);
}

document.addEventListener('input', e => { if (e.target.closest('.calc-form')) render(); });
document.addEventListener('change', e => { if (e.target.closest('.calc-form')) render(); });
document.addEventListener('langchange', () => { fillForm(); render(); });

document.addEventListener('DOMContentLoaded', async () => {
  loadMe();
  fillForm();
  render();
  gsap.from('.page-head > *, .card', { y: 30, opacity: 0, stagger: .06, duration: 1, ease: 'expo.out' });
  const r = await api('/api/rate');
  if (r.ok && r.data.rate) { RATE = r.data; render(); }
});
