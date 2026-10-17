// Проверяет, что у каждой строки L('рус', 'англ') на сайте есть узбекский перевод в public/js/uz.js.
// Запуск: node scripts/check-uz.js — выводит строки без перевода.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = path.join(__dirname, '..', 'public');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'js', 'uz.js'), 'utf8') + ';this.UZ = UZ;', ctx);

const files = [...fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => path.join(dir, f)),
  ...fs.readdirSync(path.join(dir, 'js')).filter(f => f.endsWith('.js') && f !== 'uz.js').map(f => path.join(dir, 'js', f))];
const q = `'((?:[^'\\\\]|\\\\.)*)'`;
const re = new RegExp(`\\bL\\(\\s*${q}\\s*,\\s*${q}\\s*\\)`, 'g');
const missing = new Set();
let total = 0;
for (const f of files) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) {
    total++;
    const ru = m[1].replace(/\\'/g, "'");
    if (!ctx.UZ[ru]) missing.add(`${path.basename(f)}: ${ru}`);
  }
}
console.log(`Строк: ${total}, без перевода: ${missing.size}`);
missing.forEach(s => console.log('  ' + s));
process.exit(missing.size ? 1 : 0);
