const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let s = fs.readFileSync(C, 'utf8');
const a = ["      ...pushT('j', E.str('NEXT'), E.var('lx')),",
  "      ...pushT('j', E.str('NCHK'), E.var('lx')),"].join(NL);
const b = ["      ...pushT('j', E.str('NCHK'), E.var('lx')),",
  "      ...pushT('j', E.str('NEXT'), E.var('lx')),"].join(NL);
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(C, s.slice(0, i) + b + s.slice(i + a.length));
console.log('nchk now runs after next');