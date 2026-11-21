const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const a = "        ...L.payInto(E.var('fval'), 'fid')," + NL + "        S.If(E.eq(E.item('FnKind', E.var('fid')), E.str('b')), [";
const b = "        ...L.payInto(E.var('fval'), 'fid')," + NL + "        ...L.outLine(E.join(E.str('PROBE flag=['), E.join(E.item('FnFlags', E.var('fid')), E.str('] body='))))," + NL + "        S.If(E.eq(E.item('FnKind', E.var('fid')), E.str('b')), [";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, s.slice(0, i) + b + s.slice(i + a.length));
console.log('probe added');