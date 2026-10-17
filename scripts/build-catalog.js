// Собирает каталог «Все вузы мира» в public/data/universities.json.
// Источник: открытый список Hipo university-domains-list (лицензия MIT).
// Запуск: node scripts/build-catalog.js [путь к скачанному json]
// Без аргумента скачивает свежую версию с GitHub.
const fs = require('node:fs');
const path = require('node:path');

const SRC = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json';
const OUT = path.join(__dirname, '..', 'public', 'data', 'universities.json');

// В открытом списке мало вузов Узбекистана — дополняем. Сайт указан только там, где адрес проверен.
const UZ_EXTRA = [
  ['Inha University in Tashkent', 'https://inha.uz'], ['Ajou University in Tashkent', 'https://ajou.uz'],
  ['New Uzbekistan University', 'https://newuu.uz'], ['Central Asian University', 'https://centralasian.uz'],
  ['Webster University in Tashkent', 'https://webster.uz'], ['Akfa University', 'https://akfauniversity.org'],
  ['Kimyo International University in Tashkent', 'https://kiut.uz'], ['Amity University Tashkent', 'https://amity.uz'],
  ['Yeoju Technical Institute in Tashkent', 'https://ytit.uz'], ['Tashkent State University of Law', 'https://tsul.uz'],
  ['Tashkent State Dental Institute', 'https://tsdi.uz'], ['Samarkand State Medical University', 'https://sammu.uz'],
  ['Tashkent Pediatric Medical Institute', 'https://tashpmi.uz'], ['Tashkent State Pedagogical University named after Nizami', 'https://tdpu.uz'],
  ['State Conservatory of Uzbekistan', 'https://konservatoriya.uz'], ['Bukhara State University', 'https://buxdu.uz'],
  ['Andijan State University', 'https://adu.uz'], ['Namangan State University', 'https://namdu.uz'],
  ['Fergana State University', 'https://fdu.uz'], ['Urgench State University', 'https://urdu.uz'],
  ['Karakalpak State University', 'https://karsu.uz'], ['Academy of Public Administration under the President of Uzbekistan', 'https://dba.uz'],
  ['National Institute of Fine Arts and Design named after Kamoliddin Behzod', ''], ['Uzbekistan State Institute of Arts and Culture', ''],
  ['University of Journalism and Mass Communications of Uzbekistan', ''], ['Tashkent State University of Uzbek Language and Literature', ''],
  ['Uzbek State University of Physical Education and Sport', ''], ['Tashkent State Transport University', ''],
  ['Tashkent Institute of Chemical Technology', ''], ['Tashkent Institute of Textile and Light Industry', ''],
  ['Navoi State University of Mining and Technologies', ''], ['Branch of Gubkin Russian State University of Oil and Gas in Tashkent', ''],
  ['Almalyk Branch of NUST MISIS', ''], ['Silk Road International University of Tourism and Cultural Heritage', ''],
  ['Samarkand State University of Veterinary Medicine, Livestock and Biotechnologies', ''], ['Chirchik State Pedagogical University', ''],
  ['Jizzakh State Pedagogical University', ''], ['International Islamic Academy of Uzbekistan', ''],
  ['Andijan Institute of Agriculture and Agrotechnologies', ''], ['Bukhara Engineering-Technological Institute', ''],
  ['Tashkent Financial Institute', ''], ['Banking and Finance Academy of Uzbekistan', ''],
];

(async () => {
  const raw = process.argv[2]
    ? fs.readFileSync(process.argv[2], 'utf8')
    : await (await fetch(SRC)).text();
  const list = JSON.parse(raw).concat(UZ_EXTRA.map(([name, web]) => ({ name, alpha_two_code: 'UZ', web_pages: web ? [web] : [] })));

  const seen = new Set();
  const rows = [];
  for (const u of list) {
    const name = String(u.name || '').replace(/\s+/g, ' ').trim();
    const cc = String(u.alpha_two_code || '').toUpperCase();
    if (!name || !/^[A-Z]{2}$/.test(cc)) continue;
    const key = cc + '|' + name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // только http(s)-ссылки, без лишнего «/» в конце
    const web = (u.web_pages || []).find(w => /^https?:\/\//i.test(w)) || '';
    rows.push([name, cc, web.replace(/\/+$/, '')]);
  }
  rows.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ source: 'Hipo university-domains-list (MIT)', built: new Date().toISOString().slice(0, 10), rows }));
  console.log(`Вузов: ${rows.length}, стран: ${new Set(rows.map(r => r[1])).size} → ${path.relative(process.cwd(), OUT)}`);
})().catch(e => { console.error(e); process.exit(1); });
