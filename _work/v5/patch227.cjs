const fs = require('fs');
const NL = String.fromCharCode(10);
const I = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/index.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
function ed(file, a, b, tag) {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.slice(0, i) + b + s.slice(i + a.length));
  console.log('ok ' + tag);
}
ed(V, "        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.set('halted', E.num(1)),",
   "        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.set('halted', E.num(1)), S.set('bphit', E.num(1)),", 'bphit');
ed(I, "    S.set('bp', E.num(0)),", "    S.set('bp', E.num(0)), S.set('bphit', E.num(0)),", 'reset bphit');
ed(I, "      S.If(E.eq(E.item('Code', E.num(1)), E.str('#!dump')), [], [S.set('status', E.str('Finished'))]),",
   ["      S.If(E.eq(E.item('Code', E.num(1)), E.str('#!dump')), [], [",
    "        S.If(E.eq(E.var('bphit'), E.num(0)), [S.set('status', E.str('Finished'))]),",
    "      ]),"].join(NL), 'status guard');