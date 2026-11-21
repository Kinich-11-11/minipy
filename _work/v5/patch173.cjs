const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const a = "      ...vpush(E.var('tobj'))," + NL + "      ...vpush(E.num(0)),";
const b = ["      S.If(E.eq(E.letter(E.num(1), E.var('src')), E.str('G')), [",
  "        S.set('gstop', E.num(0)),",
  "        ...vpush(E.var('src')),",
  "      ], [",
  "        ...vpush(E.var('tobj')),",
  "      ]),",
  "      ...vpush(E.num(0)),"].join(NL);
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, s.slice(0, i) + b + s.slice(i + a.length));
console.log('ok iter gen');