const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(C, 'utf8');
const a = '  // ---------------- sorted(x, key=f) ----------------';
const b = '  // ---------------- next(gen) ----------------';
const i = s.indexOf(a), j = s.indexOf(b, i);
if (i < 0 || j < 0) { console.log('MISS compKeySort ' + i + ' ' + j); process.exit(1); }
s = s.slice(0, i) + '%%KS%%' + s.slice(j);
fs.writeFileSync(C, s.split('%%KS%%').join(JSON.stringify(compKeysort).slice(1, -1)));
console.log('compKeySort rewritten');
// remove the debug probe from the VM
let v = fs.readFileSync(V, 'utf8');
const probeStart = v.indexOf("        ...L.outLine(E.join(E.str('SPDBG a1=[')");
if (probeStart < 0) { console.log('MISS probe'); process.exit(1); }
const probeEnd = v.indexOf("        S.set('rvs', E.num(0)),", probeStart);
if (probeEnd < 0) { console.log('MISS probe end'); process.exit(1); }
v = v.slice(0, probeStart) + v.slice(probeEnd);
fs.writeFileSync(V, v);
console.log('probe removed');