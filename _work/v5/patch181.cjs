const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(V, 'utf8');
const i = s.indexOf('        ...L.outLine(E.join(E.str(\'PROBE');
if (i < 0) { console.log('MISS probe'); process.exit(1); }
const j = s.indexOf(NL, i);
const probe = [
  "        ...L.outLine(E.join(E.str('PROBE fid='), E.var('fid'))),",
  "        ...L.outLine(E.join(E.str('PROBE flag=['), E.join(E.item('FnFlags', E.var('fid')), E.str(']')))),",
  "        ...L.outLine(E.join(E.str('PROBE kind=['), E.join(E.item('FnKind', E.var('fid')), E.str(']')))),"].join(NL);
fs.writeFileSync(V, s.slice(0, i) + probe + s.slice(j));
console.log('probe v3');