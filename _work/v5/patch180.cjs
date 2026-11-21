const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const a = "        ...L.outLine(E.join(E.str('PROBE flag=['), E.join(E.item('FnFlags', E.var('fid')), E.str('] body=')))),";
const b = "        ...L.outLine(E.join(E.str('PROBE fid='), E.join(E.var('fid'), E.join(E.str(' flag=['), E.join(E.item('FnFlags', E.var('fid')), E.join(E.str('] kind=['), E.join(E.item('FnKind', E.var('fid')), E.join(E.str('] fTop='), E.var('fTop')))))))))),";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, s.slice(0, i) + b + s.slice(i + a.length));
console.log('probe v2');