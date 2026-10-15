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
