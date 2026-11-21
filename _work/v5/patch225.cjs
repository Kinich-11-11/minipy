const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
const lines = fs.readFileSync(C, 'utf8').split(NL);
let a = -1, b = -1;
for (let i = 0; i < lines.length; i++) {
  if (a < 0 && lines[i].indexOf('const lcTmp = (nd) =>') >= 0) a = i;
  if (a >= 0 && b < 0 && lines[i].indexOf('function compDict() {') >= 0) b = i;
}
if (a < 0 || b < 0) { console.log('MISS ' + a + ' ' + b); process.exit(1); }
let start = a;
while (start > 0) {
  const t = lines[start - 1].trim();
  if (t.startsWith('//') || t === '') start--; else break;
}
const out = lines.slice(0, start).concat(lines.slice(b));
fs.writeFileSync(C, out.join(NL));
console.log('removed lines ' + start + '..' + (b - 1));