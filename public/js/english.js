// Мини-тест английского: 30 вопросов, 10 минут, уровень CEFR и примерный IELTS
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const LIMIT = 10 * 60;
let view = 'intro', answers = {}, order = [], left = LIMIT, timer = null, result = null;

// варианты перемешиваются, чтобы верный ответ не стоял всегда на одном месте
const shuffle = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function renderIntro() {
  app.innerHTML = `<div class="intro">
    <span class="kicker">${t('nav_tools')} · 10 min</span>
    <h1>${t('en_title')}</h1><p>${t('en_lead')}</p>
    <button class="btn btn-gold btn-lg" id="go">${t('en_start')} <span class="arrow">→</span></button></div>`;
  document.getElementById('go').onclick = start;
  gsap.from('.intro > *', { y: 40, opacity: 0, stagger: .1, duration: 1.1, ease: 'expo.out' });
}

function start() {
  view = 'quiz'; answers = {}; left = LIMIT;
  order = EN_Q.map(q => shuffle(q.o.length));
  renderQuiz();
  clearInterval(timer);
  timer = setInterval(() => {
    left--;
    const el = document.getElementById('clock');
    if (el) { el.textContent = mmss(Math.max(0, left)); el.classList.toggle('late', left <= 60); }
    if (left <= 0) finish();
  }, 1000);
  scrollTo(0, 0);
}

function renderQuiz() {
  let lastText = '';
  const blocks = EN_Q.map((q, i) => {
    let text = '';
    if (q.t && q.t !== lastText) { text = `<div class="en-text"><h4>${t('en_text')}</h4><p lang="en">${EN_TEXTS[q.t]}</p></div>`; lastText = q.t; }
    return text + `<div class="en-q" id="q${i}"><b>${i + 1}. <span lang="en">${escapeHtml(q.q)}</span></b>
      <div class="en-opts">${order[i].map(k => `<button type="button" class="opt ${answers[i] === k ? 'on' : ''}" data-i="${i}" data-k="${k}" lang="en">${escapeHtml(q.o[k])}</button>`).join('')}</div></div>`;
  }).join('');
  const done = Object.keys(answers).length;
  app.innerHTML = `
    <div class="en-bar"><span>${t('en_time')}: <b id="clock">${mmss(left)}</b></span><span>${done} / ${EN_Q.length}</span>
      <button class="btn btn-gold" id="fin">${t('en_finish')}</button></div>
    <article class="card">${blocks}</article>
    <div class="more-row"><button class="btn btn-gold btn-lg" id="fin2">${t('en_finish')} <span class="arrow">→</span></button></div>`;
  document.getElementById('fin').onclick = finish;
  document.getElementById('fin2').onclick = finish;
}

app.addEventListener('click', e => {
  const b = e.target.closest('.en-opts .opt');
  if (!b || view !== 'quiz') return;
  const i = +b.dataset.i;
  answers[i] = +b.dataset.k;
  b.parentElement.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
  document.querySelector('.en-bar span:nth-child(2)').textContent = `${Object.keys(answers).length} / ${EN_Q.length}`;
});

async function finish() {
  if (view !== 'quiz') return;
  clearInterval(timer);
  view = 'result';
  const parts = { g: [0, 0], v: [0, 0], r: [0, 0] };
  EN_Q.forEach((q, i) => { parts[q.p][1]++; if (answers[i] === q.a) parts[q.p][0]++; });
  const score = parts.g[0] + parts.v[0] + parts.r[0];
  const lvl = enLevel(score);
  result = { score, total: EN_Q.length, cefr: lvl.cefr, band: lvl.band, parts, seconds: LIMIT - Math.max(0, left) };
  renderResult();
  if (ME) {
    const r = await api('/api/results', { method: 'POST', body: { category: 'english', answers, summary: result } });
    if (r.ok) toast(t('saved'));
  }
}

function renderResult() {
  const s = result;
  const tip = s.score < 14 ? 'en_tip_low' : s.score < 24 ? 'en_tip_mid' : 'en_tip_high';
  const pct = v => Math.round(v[0] / v[1] * 100);
  app.innerHTML = `
    <div class="result-head"><span class="kicker">${t('en_title')}</span><h1>${t('en_result')}: ${s.cefr}</h1></div>
    <article class="card">
      <div class="cost-grid">
        <div class="cost-cell big"><small>CEFR</small><b>${s.cefr}</b><span>${s.score} / ${s.total} ${t('en_correct')}</span></div>
        <div class="cost-cell big"><small>${t('en_band')}</small><b>${s.band}</b><span>${mmss(s.seconds)}</span></div>
      </div>
      <div class="mini-bars" style="margin-top:24px">${Object.entries(s.parts).map(([k, v]) =>
        `<div><span>${tx(EN_PARTS[k])}</span><i><span style="width:${pct(v)}%"></span></i><b>${v[0]}/${v[1]}</b></div>`).join('')}</div>
      <p class="note">${t('en_note')}</p>
    </article>
    <article class="card"><h4 class="rank" style="margin:0 0 14px">${t('en_next')}</h4><ul class="list"><li>${t(tip)}</li></ul></article>
    <div class="result-actions">
      <button class="btn btn-gold" id="again">${t('en_retake')}</button>
      <a class="btn btn-ghost" href="/resources?exam=ielts">${t('en_resources')} →</a>
      <a class="btn btn-ghost" href="/chances">${t('ch_title')} →</a>
      ${ME ? `<a class="btn btn-ghost" href="/profile">${t('to_profile')}</a>` : ''}
    </div>`;
  document.getElementById('again').onclick = start;
  gsap.from('.result-head > *, .card', { y: 30, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out' });
  scrollTo(0, 0);
}

document.addEventListener('langchange', () => { if (view === 'intro') renderIntro(); else if (view === 'quiz') renderQuiz(); else renderResult(); });

document.addEventListener('DOMContentLoaded', async () => {
  await loadMe();
  const rid = params.get('result');
  if (ME && /^\d{1,12}$/.test(rid || '')) {
    const r = await api('/api/results/' + rid);
    if (r.ok && r.data.category === 'english') { view = 'result'; result = r.data.summary; return renderResult(); }
  }
  renderIntro();
});
