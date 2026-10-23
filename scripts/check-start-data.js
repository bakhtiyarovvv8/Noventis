// Проверка public/js/start-data.js: страны, топ-3, общий шаблон требований и курсы для нескольких пар страна × направление.
// Запуск: node scripts/check-start-data.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const js = path.join(__dirname, '..', 'public', 'js');
const ctx = { window: {}, console };
vm.createContext(ctx);
const read = f => fs.readFileSync(path.join(js, f), 'utf8');
// const-переменные не попадают в ctx сами — выносим нужные вручную
vm.runInContext(read('data.js') + '\n' + read('abroad.js').replace(/^const GRANT_INFO/m, 'var GRANT_INFO') + '\n' + read('unis-data.js') +
  ';this.UNIS=UNIS;this.FIELDS=FIELDS;this.AREAS=AREAS;this.COUNTRIES=COUNTRIES;this.uniFits=uniFits;this.findUni=findUni;', ctx, { filename: 'base' });
// start-data.js читает UNIS/FIELDS/AREAS/COUNTRIES как глобальные
vm.runInContext(read('start-data.js'), ctx, { filename: 'start-data.js' });

const S = ctx.window.START;
const t = v => (v && typeof v === 'object' ? v.ru : v);
let bad = 0;
const fail = m => { bad++; console.log('ОШИБКА:', m); };

const cl = S.countries();
console.log('Стран с вузами:', cl.length, '|', cl.map(c => `${c.cc}(${c.count})`).join(' '));

// все три языка заполнены во всех текстах
const walk = (o, p) => {
  if (!o || typeof o !== 'object') return;
  if ('ru' in o && 'en' in o) { if (!o.ru && o.ru !== '' || !('uz' in o)) fail('нет uz: ' + p); return; }
  for (const k of Object.keys(o)) walk(o[k], p + '.' + k);
};

const pairs = [['US', 'it'], ['DE', 'eng'], ['KR', 'med'], ['GB', 'biz'], ['UZ', 'law'], ['TR', 'design']];
for (const [cc, f] of pairs) {
  const r = S.top3(cc, f);
  console.log(`\n=== ${cc} × ${f}: профильных ${r.profileCount} из ${r.total} ===`);
  if (r.unis.length !== Math.min(3, r.total)) fail(`${cc}/${f}: вузов ${r.unis.length}`);
  r.unis.forEach(u => console.log(`  ${u.profile ? '+' : '-'} ${u.name} [${u.fit}] $${u.tuitionUsd} | ${t(u.summary)}`));
  if (r.note) console.log('  примечание:', t(r.note));
  walk({ n: r.note, c: r.countryName, u: r.unis.map(u => u.summary) }, cc); // fieldName берётся из data.js (узбекский — в uz.js)
}

// общий шаблон для вузов из нескольких стран
const picks = [['US', 'it'], ['DE', 'it'], ['KR', 'it']].flatMap(([cc, f]) => S.top3(cc, f).unis);
const tpl = S.requirementsTemplate(picks, { fieldId: 'it' });
console.log('\n=== Шаблон для', picks.map(u => u.name).join('; '));
tpl.items.forEach(i => console.log(` [${i.group}] ${t(i.title)}  <- ${i.unis.length} из ${tpl.unis.length}: ${i.unis.slice(0, 3).join(', ')}${i.unis.length > 3 ? '…' : ''}${i.check ? '  (уточнить)' : ''}`));
tpl.deadlines.forEach(d => console.log(` срок ${d.cc}: ${t(d.text)}${d.check ? ' (уточнить)' : ''}`));
console.log(' стоимость:', t(tpl.cost.text));
walk(tpl, 'tpl');

// проверки логики: IELTS = максимум, документы без повторов
const ielts = tpl.items.find(i => i.id === 'ielts');
const maxI = Math.max(...picks.map(u => S.top3(u.cc, 'it') && ctx.findUni(u.name, u.cc)[2]).filter(Boolean));
if (!ielts || ielts.value !== maxI) fail('IELTS не максимум');
const ids = tpl.items.map(i => i.id);
if (new Set(ids).size !== ids.length) fail('повтор пунктов шаблона');

const cf = S.coursesFor(tpl);
console.log('\n=== Курсы');
cf.forEach(g => { console.log(` ${t(g.itemTitle)} -> ${g.courseKey}`); g.courses.forEach(c => console.log(`    ${c.id} ${t(c.center.name)} (${t(c.center.city)}): ${t(c.title)}, ${t(c.duration)}, ${c.priceUzs.toLocaleString('ru')} сум, ${t(c.formatLabel)}${c.demo ? ' [demo]' : ''}`)); });
walk(cf, 'courses');
if (S.COURSES.some(c => !c.demo) || S.CENTERS.some(c => !c.demo)) fail('центры/курсы без demo:true');

// все страны: top3 не падает и отдаёт до 3 вузов
for (const c of cl) for (const f of ['it', 'med', 'design', 'law']) {
  const r = S.top3(c.cc, f);
  if (r.unis.length !== Math.min(3, c.count)) fail(`${c.cc}/${f}: ${r.unis.length}`);
}
console.log(bad ? `\nОшибок: ${bad}` : '\nВсё в порядке');
process.exit(bad ? 1 : 0);
