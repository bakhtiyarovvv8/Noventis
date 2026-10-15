// Главная: дрон-пролёт, параллакс, горизонтальный скролл
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const target = document.querySelector(a.getAttribute('href'));
  if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20, duration: 1.8 }); }
}));

// --- треки
function renderTracks() {
  const grid = document.getElementById('tracks-grid');
  grid.innerHTML = Object.entries(CATEGORIES).map(([id, c], i) => `
    <a class="track reveal" href="/test?cat=${id}">
      <img src="${c.img}" alt="" loading="lazy">
      <span class="idx">0${i + 1}</span>
      <h3>${tx(c.title)}</h3>
      <p>${tx(c.lead)}</p>
      <div class="go"><span>${t('start_track')}</span><span class="circle">→</span></div>
    </a>`).join('');
  grid.querySelectorAll('.track').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// --- заголовок героя построчно
function splitHero() {
  const h = document.querySelector('.hero-title');
  h.innerHTML = t('hero_title').split('<br>').map(l => `<span class="line"><span>${l}</span></span>`).join('');
  return h.querySelectorAll('.line > span');
}

function intro() {
  const lines = splitHero();
  gsap.timeline({ delay: .3 })
    .from(lines, { yPercent: 110, duration: 1.4, stagger: .12, ease: 'expo.out' })
    .from('.hero-anim', { y: 30, opacity: 0, duration: 1.1, stagger: .12, ease: 'expo.out' }, '-=1.0')
    .from('.nav', { y: -30, opacity: 0, duration: 1, ease: 'expo.out' }, '-=1.1');
  // уход героя при скролле: камера «взлетает»
  gsap.to('.hero-media img', { scale: 1.35, yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-content', { y: -120, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
}

// --- дрон-пролёт
function flight() {
  const scenes = gsap.utils.toArray('.flight .scene');
  const imgs = scenes.map(s => s.querySelector('img'));
  const caps = gsap.utils.toArray('.flight .caption');
  const N = scenes.length;

  // движение камеры в каждой сцене: [from, to]
  const moves = [
    [{ scale: 1, rotate: 0 }, { scale: 2.4, rotate: 8 }],                 // космос → ныряем к Земле
    [{ scale: 1.25, yPercent: -6 }, { scale: 1.05, yPercent: 6 }],        // над облаками, летим вперёд
    [{ scale: 1.15, rotate: -2, xPercent: 3 }, { scale: 1.5, rotate: 3, xPercent: -3 }], // облёт Лондона
    [{ scale: 1.25, xPercent: -6 }, { scale: 1.25, xPercent: 6 }],        // боковой пролёт Гонконга
    [{ scale: 1.05, yPercent: 4 }, { scale: 1.45, yPercent: -2 }],        // подлёт к кампусу
    [{ scale: 1.6, yPercent: -4 }, { scale: 1.02, yPercent: 0 }],         // отлёт назад: выпускной
  ];
  imgs.forEach((img, i) => gsap.set(img, { transformOrigin: '50% 55%', ...moves[i][0] }));
  gsap.set(scenes, { opacity: 0 });
  gsap.set(scenes[0], { opacity: 1 });
  gsap.set(caps, { opacity: 0, y: 50, filter: 'blur(10px)' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.flight', start: 'top top', end: `+=${N * 110}%`, pin: true, scrub: 1.2,
      onUpdate: self => updateHud(self.progress * N),
    },
  });

  for (let i = 0; i < N; i++) {
    tl.to(imgs[i], { ...moves[i][1], duration: 1.2 }, i);
    tl.to(caps[i], { opacity: 1, y: 0, filter: 'blur(0px)', duration: .25, ease: 'power2.out' }, i + .12);
    if (i < N - 1) {
      tl.to(caps[i], { opacity: 0, y: -50, filter: 'blur(10px)', duration: .2, ease: 'power2.in' }, i + .72);
      // переход «сквозь» кадр: старый уходит в блюр, новый проявляется
      tl.to(scenes[i], { opacity: 0, filter: 'blur(14px) brightness(1.6)', duration: .3 }, i + .85);
      tl.fromTo(scenes[i + 1], { opacity: 0, filter: 'blur(14px) brightness(1.6)' },
        { opacity: 1, filter: 'blur(0px) brightness(1)', duration: .3 }, i + .85);
    }
  }
  tl.to('.flight-progress span', { scaleX: 1, duration: N + .2 }, 0);
}

const HUD = [
  { loc: 'ORBIT · TASHKENT', c: '41.2995° N  69.2401° E', alt: 408000, spd: 27600 },
  { loc: 'TIAN SHAN', c: '42.0000° N  70.5000° E', alt: 5200, spd: 140 },
  { loc: 'LONDON', c: '51.5072° N  0.1276° W', alt: 450, spd: 72 },
  { loc: 'HONG KONG', c: '22.3193° N  114.1694° E', alt: 520, spd: 64 },
  { loc: 'CAMPUS', c: '40.8075° N  73.9626° W', alt: 60, spd: 28 },
  { loc: 'GRADUATION', c: '1.2838° N  103.8591° E', alt: 12, spd: 9 },
];
const hudEls = {};
function updateHud(p) {
  hudEls.loc ||= document.getElementById('hud-loc');
  hudEls.coord ||= document.getElementById('hud-coord');
  hudEls.alt ||= document.getElementById('hud-alt');
  hudEls.spd ||= document.getElementById('hud-spd');
  const i = Math.min(HUD.length - 1, Math.floor(p));
  const f = Math.min(1, p - i), next = HUD[Math.min(HUD.length - 1, i + 1)], cur = HUD[i];
  // высота падает логарифмически — ощущение снижения дрона
  const alt = Math.exp(Math.log(cur.alt) + (Math.log(next.alt) - Math.log(cur.alt)) * Math.max(0, (f - .7) / .3));
  const spd = cur.spd + (next.spd - cur.spd) * Math.max(0, (f - .7) / .3);
  hudEls.loc.textContent = cur.loc;
  hudEls.coord.textContent = cur.c;
  hudEls.alt.textContent = Math.round(alt).toLocaleString('ru-RU');
  hudEls.spd.textContent = Math.round(spd).toLocaleString('ru-RU');
}

// --- горизонтальный пролёт по городам
function world() {
  const track = document.querySelector('.world-track');
  const dist = () => track.scrollWidth - innerWidth + 32;
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.world', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
  });
  gsap.utils.toArray('.city img').forEach(img => {
    gsap.fromTo(img, { xPercent: -16 }, {
      xPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
    });
  });
}

function reveals() {
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: .12, ease: 'expo.out', overwrite: true }),
  });
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, plus = el.hasAttribute('data-plus') ? '+' : '';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to({ v: 0 }, { v: end, duration: 2, ease: 'power3.out', onUpdate() { el.textContent = Math.round(this.targets()[0].v) + plus; } }),
    });
  });
  gsap.fromTo('.cta .bg', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
}

document.addEventListener('DOMContentLoaded', () => {
  loadMe();
  renderTracks();
  intro();
  flight();
  world();
  reveals();
  addEventListener('load', () => ScrollTrigger.refresh());
});

document.addEventListener('langchange', () => {
  renderTracks();
  document.querySelectorAll('#tracks-grid .reveal').forEach(el => gsap.set(el, { opacity: 1, y: 0 }));
  splitHero();
  ScrollTrigger.refresh();
});
