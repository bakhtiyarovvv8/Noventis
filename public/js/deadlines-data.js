// Ежегодные дедлайны для поступающих из Узбекистана. Даты — ориентир (обычный срок прошлых лет), точные — на сайте по ссылке.
// type: grant — грант, apply — подача в вуз, exam — экзамен
const DEADLINES = [
  { id: 'ucas_oxb', m: 10, d: 15, type: 'apply', cc: 'GB', url: 'https://www.ucas.com',
    n: L('UCAS: Оксфорд, Кембридж, медицина', 'UCAS: Oxford, Cambridge, medicine'), note: L('Ранний срок для Oxbridge и медицинских программ', 'Early deadline for Oxbridge and medicine') },
  { id: 'gks_u', m: 10, d: 1, type: 'grant', cc: 'KR', url: 'https://www.studyinkorea.go.kr',
    n: L('GKS — бакалавриат', 'GKS — undergraduate'), note: L('Подача через посольство Кореи, объявление в сентябре', 'Apply via the Korean embassy, call opens in September') },
  { id: 'sat_oct', m: 10, d: 3, type: 'exam', cc: 'US', url: 'https://satsuite.collegeboard.org',
    n: L('SAT — октябрьская сессия', 'SAT — October session'), note: L('Последний удобный SAT для Early Decision / Early Action', 'Last convenient SAT for Early Decision / Early Action') },
  { id: 'us_early', m: 11, d: 1, type: 'apply', cc: 'US', url: 'https://www.commonapp.org',
    n: L('США: Early Decision / Early Action', 'USA: Early Decision / Early Action'), note: L('Common App, ранняя подача', 'Common App, early round') },
  { id: 'chevening', m: 11, d: 5, type: 'grant', cc: 'GB', url: 'https://www.chevening.org',
    n: L('Chevening (магистратура в Великобритании)', 'Chevening (UK master’s)'), note: L('Нужны 2 года опыта работы', 'Requires 2 years of work experience') },
  { id: 'sat_dec', m: 12, d: 5, type: 'exam', cc: 'US', url: 'https://satsuite.collegeboard.org',
    n: L('SAT — декабрьская сессия', 'SAT — December session'), note: L('Последний SAT для Regular Decision', 'Last SAT for Regular Decision') },
  { id: 'us_regular', m: 1, d: 1, type: 'apply', cc: 'US', url: 'https://www.commonapp.org',
    n: L('США: Regular Decision', 'USA: Regular Decision'), note: L('У многих вузов 1–15 января', 'Most universities: January 1–15') },
  { id: 'sh', m: 1, d: 15, type: 'grant', cc: 'HU', url: 'https://stipendiumhungaricum.hu',
    n: 'Stipendium Hungaricum', note: L('Полный грант в Венгрию, бакалавриат и магистратура', 'Full grant to Hungary, BA & MA') },
  { id: 'ca_toronto', m: 1, d: 15, type: 'apply', cc: 'CA', url: 'https://future.utoronto.ca',
    n: L('Канада: University of Toronto и др.', 'Canada: University of Toronto etc.'), note: L('Рекомендуемый срок — ноябрь', 'Recommended date — November') },
  { id: 'ru_quota', m: 1, d: 15, type: 'grant', cc: 'RU', url: 'https://education-in-russia.com',
    n: L('Квота «Образование в России»', '“Education in Russia” quota'), note: L('Бесплатное обучение, подача на сайте', 'Free tuition, apply online') },
  { id: 'em', m: 1, d: 15, type: 'grant', cc: 'EU', url: 'https://erasmus-plus.ec.europa.eu',
    n: L('Erasmus Mundus (магистратура)', 'Erasmus Mundus (master’s)'), note: L('Сроки у каждой программы свои: октябрь–январь', 'Each programme has its own date: October–January') },
  { id: 'de_summer', m: 1, d: 15, type: 'apply', cc: 'DE', url: 'https://www.uni-assist.de',
    n: L('Германия: летний семестр (uni-assist)', 'Germany: summer semester (uni-assist)'), note: L('Для многих вузов через uni-assist', 'Many universities via uni-assist') },
  { id: 'ucas', m: 1, d: 29, type: 'apply', cc: 'GB', url: 'https://www.ucas.com',
    n: L('UCAS: основной срок', 'UCAS: main deadline'), note: L('Равное рассмотрение для большинства программ', 'Equal consideration for most programmes') },
  { id: 'tr_burs', m: 2, d: 20, type: 'grant', cc: 'TR', url: 'https://www.turkiyeburslari.gov.tr',
    n: 'Türkiye Bursları', note: L('Подача обычно с 10 января по 20 февраля', 'Usually open January 10 – February 20') },
  { id: 'sg_nus', m: 2, d: 28, type: 'apply', cc: 'SG', url: 'https://www.nus.edu.sg',
    n: L('Сингапур: NUS и NTU', 'Singapore: NUS and NTU'), note: L('Подача для международных абитуриентов', 'International applicants') },
  { id: 'gks_g', m: 3, d: 1, type: 'grant', cc: 'KR', url: 'https://www.studyinkorea.go.kr',
    n: L('GKS — магистратура', 'GKS — graduate'), note: L('Объявление в феврале', 'Call opens in February') },
  { id: 'kz_nu', m: 3, d: 1, type: 'apply', cc: 'KZ', url: 'https://nu.edu.kz',
    n: 'Nazarbayev University', note: L('Полный грант для иностранцев, тест NUET', 'Full grant for international students, NUET test') },
  { id: 'csc', m: 3, d: 31, type: 'grant', cc: 'CN', url: 'https://www.campuschina.org',
    n: L('CSC — стипендия Китая', 'CSC — Chinese Government Scholarship'), note: L('Сроки зависят от вуза: декабрь–апрель', 'Dates vary by university: December–April') },
  { id: 'eyuf', m: 4, d: 15, type: 'grant', cc: 'UZ', url: 'https://eyuf.uz',
    n: 'El-Yurt Umidi', note: L('Магистратура и PhD за рубежом, весенний набор', 'Master’s and PhD abroad, spring call') },
  { id: 'au_awards', m: 4, d: 30, type: 'grant', cc: 'AU', url: 'https://www.dfat.gov.au/people-to-people/australia-awards',
    n: 'Australia Awards', note: L('Магистратура в Австралии', 'Master’s in Australia') },
  { id: 'mext', m: 5, d: 31, type: 'grant', cc: 'JP', url: 'https://www.uz.emb-japan.go.jp',
    n: L('MEXT — стипендия Японии', 'MEXT — Japanese Government Scholarship'), note: L('Через посольство Японии, экзамен в июне', 'Via the Japanese embassy, exam in June') },
  { id: 'kr_fall', m: 5, d: 31, type: 'apply', cc: 'KR', url: 'https://www.studyinkorea.go.kr',
    n: L('Корея: осенний набор', 'Korea: fall intake'), note: L('Большинство вузов принимают заявки весной', 'Most universities take applications in spring') },
  { id: 'uz_apply', m: 7, d: 15, type: 'apply', cc: 'UZ', url: 'https://uzbmb.uz',
    n: L('Узбекистан: приём документов в вузы', 'Uzbekistan: university applications'), note: L('Регистрация на my.gov.uz, тесты uzbmb — июль–август', 'Register on my.gov.uz, uzbmb tests — July–August') },
  { id: 'de_winter', m: 7, d: 15, type: 'apply', cc: 'DE', url: 'https://www.uni-assist.de',
    n: L('Германия: зимний семестр (uni-assist)', 'Germany: winter semester (uni-assist)'), note: L('Главный набор в Германии', 'The main intake in Germany') },
  { id: 'it_dsu', m: 9, d: 1, type: 'grant', cc: 'IT', url: 'https://www.universitaly.it',
    n: L('Италия: региональная стипендия DSU', 'Italy: DSU regional scholarship'), note: L('Сроки по регионам: август–сентябрь', 'Dates by region: August–September') },
  { id: 'daad', m: 10, d: 15, type: 'grant', cc: 'DE', url: 'https://www.daad.de',
    n: L('DAAD — магистратура в Германии', 'DAAD — master’s in Germany'), note: L('Сроки у программ: август–октябрь', 'Programme dates: August–October') },
];

// Ближайшая дата дедлайна (в этом году или следующем)
function nextDate(dl, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let d = new Date(today.getFullYear(), dl.m - 1, dl.d);
  if (d < today) d = new Date(today.getFullYear() + 1, dl.m - 1, dl.d);
  return d;
}
const daysLeft = dl => Math.round((nextDate(dl) - new Date(new Date().toDateString())) / 864e5);

// Файл календаря .ics: телефон сам напомнит за 30, 7 и 1 день — без интернета и без нашего сервера
function buildIcs(list) {
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  // в .ics запятая, точка с запятой и обратный слэш экранируются
  const esc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = list.map(dl => {
    const d = nextDate(dl), end = new Date(d.getTime() + 864e5);
    return [
      'BEGIN:VEVENT', `UID:${dl.id}-${d.getFullYear()}@noventis`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc('⏰ ' + tx(dl.n))}`, `DESCRIPTION:${esc(tx(dl.note) + '\n' + dl.url)}`, `URL:${dl.url}`,
      ...[30, 7, 1].flatMap(n => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(tx(dl.n))}`, `TRIGGER:-P${n}D`, 'END:VALARM']),
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noventis//Deadlines//RU', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function downloadIcs(list, name = 'noventis-deadlines.ics') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildIcs(list)], { type: 'text/calendar;charset=utf-8' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
