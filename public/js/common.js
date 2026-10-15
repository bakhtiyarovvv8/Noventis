// Общие утилиты: язык, API, навигация
const UI = {
  nav_how: L('Как это работает', 'How it works'), nav_tracks: L('Треки', 'Tracks'), nav_world: L('Мир', 'World'),
  nav_login: L('Войти', 'Log in'), nav_profile: L('Кабинет', 'Dashboard'), nav_logout: L('Выйти', 'Log out'),
  start: L('Пройти тест', 'Take the test'), start_track: L('Начать', 'Start'), minutes: L('≈ 5 минут', '≈ 5 minutes'),

  hero_kicker: L('Профориентация для молодёжи Узбекистана', 'Career guidance for the youth of Uzbekistan'),
  hero_title: L('Твоё будущее<br>начинается <em>здесь</em>', 'Your future<br>starts <em>here</em>'),
  hero_sub: L('Пройди тест о своих способностях — и узнай, куда поступить, кем работать и где в мире твоя сфера развита сильнее всего.',
              'Take a test about your abilities — and find out where to study, what to work as and where in the world your field thrives.'),
  scroll: L('Листай вниз', 'Scroll down'),

  fly_1t: L('Мир огромен', 'The world is vast'), fly_1s: L('Тысячи вузов, сотни профессий. С чего начать?', 'Thousands of universities, hundreds of careers. Where to start?'),
  fly_2t: L('Поднимись над шумом', 'Rise above the noise'), fly_2s: L('Советы родственников, мнения друзей. Посмотри на себя сверху.', 'Advice from relatives, opinions of friends. Look at yourself from above.'),
  fly_3t: L('Лондон. Финансы. Право.', 'London. Finance. Law.'), fly_3s: L('В каждом городе мира развита своя сфера.', 'Every city in the world has its own strength.'),
  fly_4t: L('Гонконг. Бизнес. Технологии.', 'Hong Kong. Business. Tech.'), fly_4s: L('Мы покажем, где твоя сфера сильнее всего.', 'We’ll show you where your field is strongest.'),
  fly_5t: L('Твой кампус', 'Your campus'), fly_5s: L('Подберём вузы в Узбекистане и по всему миру.', 'We’ll match universities in Uzbekistan and worldwide.'),
  fly_6t: L('Твой выпускной', 'Your graduation'), fly_6s: L('Осталось сделать первый шаг.', 'All that’s left is the first step.'),

  tracks_kicker: L('Три трека', 'Three tracks'), tracks_title: L('Выбери, с чего начать', 'Choose where to begin'),
  how_kicker: L('Как это работает', 'How it works'), how_title: L('Три шага до ясности', 'Three steps to clarity'),
  how_1t: L('Расскажи о себе', 'Tell us about you'), how_1s: L('Возраст, языки, любимые предметы, навыки и мечты.', 'Age, languages, favourite subjects, skills and dreams.'),
  how_2t: L('Ответь на вопросы', 'Answer questions'), how_2s: L('Короткие вопросы о способностях — без правильных и неправильных ответов.', 'Short questions about your abilities — no right or wrong answers.'),
  how_3t: L('Получи план', 'Get your plan'), how_3s: L('Направления, вузы, страны, зарплаты и пошаговый план подготовки.', 'Fields, universities, countries, salaries and a step-by-step prep plan.'),
  stat_fields: L('направлений', 'fields'), stat_unis: L('вузов мира', 'universities'), stat_countries: L('стран и регионов', 'countries & regions'), stat_grants: L('программ грантов', 'grant programs'),
  world_kicker: L('Где развиты сферы', 'Where fields thrive'), world_title: L('Мир как карта возможностей', 'The world as a map of opportunity'),
  city_tokyo: L('Токио — робототехника, анимация, игры', 'Tokyo — robotics, animation, games'),
  city_london: L('Лондон — финансы, право, дизайн', 'London — finance, law, design'),
  city_chicago: L('Чикаго — экономика, архитектура', 'Chicago — economics, architecture'),
  city_hk: L('Гонконг — бизнес и торговля', 'Hong Kong — business & trade'),
  city_seoul: L('Сеул — IT, медицина, K-контент', 'Seoul — IT, medicine, K-content'),
  cta_title: L('Готов узнать, кем станешь?', 'Ready to find out who you’ll become?'),
  cta_sub: L('Регистрация бесплатная. Результаты сохраняются в твоём кабинете.', 'Sign-up is free. Your results are saved in your dashboard.'),
  footer: L('Kelajak — «будущее» по-узбекски. Сделано для тех, кто ищет свой путь.', 'Kelajak means “future” in Uzbek. Made for those finding their way.'),

  // auth
  auth_quote: L('«Кто знает, куда идёт, — тому и ветер попутный»', '“If you know where you’re going, every wind is fair”'),
  auth_welcome: L('С возвращением', 'Welcome back'), auth_join: L('Создай аккаунт', 'Create your account'),
  auth_login_sub: L('Войди, чтобы продолжить тест и увидеть результаты.', 'Log in to continue and see your results.'),
  auth_reg_sub: L('Сохраняй результаты тестов и возвращайся к ним в любой момент.', 'Save your test results and come back anytime.'),
  tab_login: L('Вход', 'Log in'), tab_register: L('Регистрация', 'Sign up'),
  f_name: L('Имя', 'Name'), f_email: L('Email', 'Email'), f_password: L('Пароль', 'Password'),
  f_password_hint: L('Минимум 8 символов', 'At least 8 characters'),
  btn_login: L('Войти', 'Log in'), btn_register: L('Создать аккаунт', 'Create account'),
  pw_weak: L('Слабый', 'Weak'), pw_ok: L('Нормальный', 'Fair'), pw_strong: L('Надёжный', 'Strong'),
  err_name_short: L('Имя слишком короткое', 'Name is too short'), err_email_invalid: L('Неверный email', 'Invalid email'),
  err_password_short: L('Пароль — минимум 8 символов', 'Password must be at least 8 characters'),
  err_email_taken: L('Этот email уже зарегистрирован', 'This email is already registered'),
  err_bad_credentials: L('Неверный email или пароль', 'Wrong email or password'),
  err_too_many: L('Слишком много попыток. Подожди 15 минут.', 'Too many attempts. Wait 15 minutes.'),
  err_server: L('Ошибка сервера. Попробуй ещё раз.', 'Server error. Try again.'),

  // test
  q_of: L('Вопрос', 'Question'), back: L('Назад', 'Back'), next: L('Далее', 'Next'), finish: L('Показать результат', 'Show result'),
  section_profile: L('О тебе', 'About you'), section_main: L('Способности и интересы', 'Abilities & interests'),
  section_work: L('Навыки и цели', 'Skills & goals'), section_prep: L('Твоя подготовка', 'Your preparation'),
  analyzing: L('Анализируем ответы…', 'Analysing your answers…'),
  res_kicker: L('Твой результат', 'Your result'),
  res_uni_title: L('Тебе подходят эти направления', 'These fields suit you'),
  res_work_title: L('Профессии, которые тебе подходят', 'Careers that suit you'),
  res_prep_title: L('Твой план подготовки', 'Your preparation plan'),
  match: L('совпадение', 'match'), where_strong: L('Где сфера развита', 'Where it thrives'),
  unis_world: L('Сильные вузы мира', 'Top universities worldwide'), unis_uz: L('В Узбекистане', 'In Uzbekistan'),
  your_regions: L('в выбранных странах', 'in your chosen regions'),
  grants: L('Гранты и стипендии для тебя', 'Grants & scholarships for you'),
  salary_uz: L('Узбекистан, в месяц', 'Uzbekistan, monthly'), salary_w: L('США/Европа, в год', 'USA/Europe, yearly'),
  first_steps: L('Первые шаги', 'First steps'), platforms: L('Где искать работу', 'Where to find jobs'),
  salary_note: L('Зарплаты ориентировочные (2026), зависят от опыта и компании.', 'Salaries are approximate (2026) and depend on experience and company.'),
  exams_needed: L('Экзамены и требования', 'Exams & requirements'), roadmap: L('Дорожная карта', 'Roadmap'),
  week_plan: L('Неделя подготовки', 'Your study week'), weak_tips: L('Как прокачать слабые места', 'How to fix weak spots'),
  resources: L('Бесплатные ресурсы', 'Free resources'),
  saved: L('Результат сохранён в кабинете', 'Result saved to your dashboard'),
  retake: L('Пройти заново', 'Retake'), to_profile: L('В кабинет', 'To dashboard'), other_tracks: L('Другие треки', 'Other tracks'),
  profile_note: L('Твой профиль', 'Your profile'),
  eng_warn: L('Для зарубежных вузов подтяни английский до B2+ / IELTS 6.0+', 'For universities abroad, raise your English to B2+ / IELTS 6.0+'),
  age_note_young: L('Тебе ещё рано поступать — отлично! Есть время спокойно подготовиться и попробовать олимпиады.', 'You’re still young — great! You have time to prepare calmly and try olympiads.'),

  // profile
  hello: L('Привет', 'Hi'), member_since: L('С нами с', 'Member since'),
  my_results: L('Мои результаты', 'My results'), no_results: L('Пока нет результатов. Пройди первый тест!', 'No results yet. Take your first test!'),
  open: L('Открыть', 'Open'), delete: L('Удалить', 'Delete'), new_test: L('Новый тест', 'New test'),
};

let LANG = (() => { try { return localStorage.getItem('kj_lang') || 'ru'; } catch { return 'ru'; } })();
const tx = v => (v && typeof v === 'object' ? (v[LANG] ?? v.ru) : v ?? '');
const t = key => tx(UI[key]) || key;

function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}

function setLang(l) {
  LANG = l;
  try { localStorage.setItem('kj_lang', l); } catch {}
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange'));
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

let ME = null;
async function loadMe() {
  const r = await api('/api/me');
  ME = r.data.user || null;
  renderNavAuth();
  return ME;
}

function renderNavAuth() {
  const box = document.querySelector('.nav-auth');
  if (!box) return;
  if (ME) {
    box.innerHTML = `<a class="btn btn-ghost" href="/profile"><span class="avatar">${escapeHtml(ME.name[0] || '?').toUpperCase()}</span><span data-i18n="nav_profile">${t('nav_profile')}</span></a>`;
  } else {
    box.innerHTML = `<a class="btn btn-ghost" href="/auth" data-i18n="nav_login">${t('nav_login')}</a>`;
  }
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  location.href = '/';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  applyI18n();
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
});
