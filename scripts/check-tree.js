// Проверка дерева адаптивного теста (public/js/adaptive-tree.js).
// Запуск: node scripts/check-tree.js — код выхода 1, если есть ошибки.
// Проверяет: ссылки next, id направлений (только из FIELDS), тексты ru/en/uz, отсутствие циклов,
// длину путей (12–18), окончание каждого пути, достижимость каждого направления как итога №1.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const js = p => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', p), 'utf8');
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(js('data.js') + ';window.FIELDS = FIELDS; window.AREAS = AREAS;', ctx);
vm.runInContext(js('adaptive-tree.js'), ctx);
const { FIELDS } = ctx;
const A = ctx.ADAPTIVE;
const { NODES, GROUPS, DUELS } = A;
const FIDS = Object.keys(FIELDS);
const MIN = 12, MAX = 18;

const errors = [];
const err = m => errors.push(m);
const RULES = ['@lead', '@final', '@end'];

// ---- 1. Статика: тексты, ключи весов, ссылки ----
const txt = (o, where) => { if (!o || ['ru', 'en', 'uz'].some(l => typeof o[l] !== 'string' || !o[l].trim())) err(`${where}: нет текста ru/en/uz`); };
for (const [id, n] of Object.entries(NODES)) {
  txt(n.q, `${id}.q`);
  if (n.hint) txt(n.hint, `${id}.hint`);
  if (!n.dynamic && !n.options.length) err(`${id}: нет вариантов`);
  const seen = new Set();
  for (const o of n.dynamic ? [n.extra] : n.options) {
    if (seen.has(o.v)) err(`${id}: повтор v=${o.v}`);
    seen.add(o.v);
    txt(o.t, `${id}.${o.v}`);
    for (const [f, w] of Object.entries(o.w || {})) {
      if (!FIELDS[f]) err(`${id}.${o.v}: нет направления «${f}» в FIELDS`);
      if (typeof w !== 'number' || w <= 0) err(`${id}.${o.v}: вес ${f}=${w}`);
    }
    if (o.next && !NODES[o.next] && !RULES.includes(o.next)) err(`${id}.${o.v}: next → «${o.next}» не существует`);
  }
  if (!n.next && n.options.some(o => !o.next)) err(`${id}: нет next`);
  if (n.next && !NODES[n.next] && !RULES.includes(n.next)) err(`${id}: next → «${n.next}» не существует`);
}
for (const [k, g] of Object.entries(GROUPS)) {
  g.fields.forEach(f => FIELDS[f] || err(`GROUPS.${k}: нет «${f}»`));
  g.nodes.forEach(id => NODES[id] || err(`GROUPS.${k}: нет узла ${id}`));
}
for (const [k, fs] of Object.entries(DUELS)) fs.forEach(f => FIELDS[f] || err(`DUELS.${k}: нет «${f}»`));
const inGroups = new Set(Object.values(GROUPS).flatMap(g => g.fields));
FIDS.filter(f => !inGroups.has(f)).forEach(f => err(`направление ${f} не входит ни в одну группу`));

// ---- 2. Граф со всеми возможными переходами правил: циклы и длины ----
const edges = id => {
  const n = NODES[id], out = new Set();
  const add = nx => {
    if (nx === '@end') out.add(null);
    else if (nx === '@lead') Object.values(GROUPS).forEach(g => out.add(g.nodes[0]));
    else if (nx === '@final') { Object.keys(DUELS).forEach(d => out.add(d)); out.add('d_pick'); }
    else out.add(nx);
  };
  (n.dynamic ? [] : n.options).forEach(o => add(o.next || n.next));
  if (n.dynamic || n.type === 'multi') add(n.next);
  return [...out];
};
const memo = {}, state = {};
function span(id) { // [min, max] вопросов от узла до конца
  if (id === null) return [0, 0];
  if (state[id] === 1) { err(`цикл через ${id}`); return [0, 0]; }
  if (memo[id]) return memo[id];
  state[id] = 1;
  let lo = Infinity, hi = 0;
  for (const nx of edges(id)) { const [a, b] = span(nx); lo = Math.min(lo, a + 1); hi = Math.max(hi, b + 1); }
  state[id] = 2;
  return (memo[id] = [lo, hi]);
}
const [lo, hi] = span('start');
if (lo < MIN || hi > MAX) err(`длина пути ${lo}–${hi}, нужно ${MIN}–${MAX}`);
const reach = new Set(), stack = ['start'];
while (stack.length) { const id = stack.pop(); if (id === null || reach.has(id)) continue; reach.add(id); edges(id).forEach(x => stack.push(x)); }
Object.keys(NODES).filter(id => !reach.has(id)).forEach(id => err(`узел ${id} недостижим`));

// ---- 3. Живые прохождения через nextQuestion ----
function walk(pick) {
  const ans = [];
  for (let node = A.nextQuestion(ans); node; node = A.nextQuestion(ans)) {
    if (ans.length > 40) { err('бесконечный путь'); break; }
    if (!NODES[node.id]) { err(`nextQuestion вернул несуществующий ${node.id}`); break; }
    ans.push({ id: node.id, v: pick(node, ans) });
  }
  return ans;
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const randomPick = node => node.type === 'multi'
  ? node.options.filter(() => rnd() < 0.4).map(o => o.v).concat(node.options[0].v).filter((v, i, a) => a.indexOf(v) === i)
  : node.options[Math.floor(rnd() * node.options.length)].v;

const examples = {}; // направление → пример пути, где оно итог №1
const N = 50000, lens = {}, top1 = Object.fromEntries(FIDS.map(f => [f, 0])), groupsHit = {};
let sum = 0;
for (let i = 0; i < N; i++) {
  const ans = walk(randomPick);
  const L = ans.length;
  lens[L] = (lens[L] || 0) + 1; sum += L;
  if (L < MIN || L > MAX) err(`путь длиной ${L}: ${ans.map(a => a.id).join(' → ')}`);
  const r = A.result(ans);
  if (r.top.length !== 3 || r.fields.length !== FIDS.length) err('result: неверный формат');
  if (!r.eng || !r.budget) err('result: нет eng/budget');
  if (!top1[r.top[0].id]) examples[r.top[0].id] = ans.map(a => a.id).join('→');
  top1[r.top[0].id]++;
  const g = Object.keys(GROUPS).find(k => GROUPS[k].nodes[0] === ans[4].id);
  groupsHit[g] = (groupsHit[g] || 0) + 1;
}

// ---- 4. Целевые прохождения: каждое направление может стать итогом №1 ----
// Поиск в глубину: если у вопроса есть варианты с весом f — берём лучший из них, иначе перебираем все варианты.
const unreachable = [];
function seek(f, ans, budget) {
  const node = A.nextQuestion(ans);
  if (!node) return A.result(ans).top[0].id === f ? ans : null;
  if (budget.n-- <= 0) return null;
  if (node.type === 'multi') return seek(f, [...ans, { id: node.id, v: [node.options[0].v] }], budget);
  const score = o => (o.w[f] || 0) * 10 - Math.max(0, ...Object.entries(o.w).filter(([k]) => k !== f).map(([, w]) => w));
  const withF = node.options.filter(o => o.w[f] > 0);
  const cands = withF.length ? [withF.reduce((b, o) => (score(o) > score(b) ? o : b))] : node.options;
  for (const o of cands) { const r = seek(f, [...ans, { id: node.id, v: o.v }], budget); if (r) return r; }
  return null;
}
for (const f of FIDS) {
  if (examples[f]) continue; // уже встретилось при случайных ответах
  const ans = seek(f, [], { n: 20000 });
  if (ans) examples[f] = ans.map(a => a.id).join('→');
  else unreachable.push(f);
}
unreachable.forEach(u => err(`направление недостижимо как №1: ${u}`));

// ---- Отчёт ----
console.log(`Узлов: ${Object.keys(NODES).length} (широких 10, в группах ${Object.values(GROUPS).length * 5}, дуэлей ${Object.keys(DUELS).length + 1}, для вузов 3)`);
console.log(`Длина пути по графу: ${lo}–${hi}; случайных прохождений: ${N}, средняя ${(sum / N).toFixed(1)}, распределение ${JSON.stringify(lens)}`);
console.log(`Направлений: ${FIDS.length}, достижимы как №1 целевым путём: ${FIDS.length - unreachable.length}`);
console.log(`Группы после широких вопросов (случайные ответы): ${JSON.stringify(groupsHit)}`);
console.log(`Итог №1 при случайных ответах: ${Object.entries(top1).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(errors.length ? `ОШИБКИ (${errors.length}):\n  ` + [...new Set(errors)].slice(0, 50).join('\n  ') : 'Ошибок нет');
process.exit(errors.length ? 1 : 0);
