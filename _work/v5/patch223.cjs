const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(C, 'utf8');
function rep(x, a, b, tag) {
  const i = x.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); return x; }
  console.log('ok ' + tag);
  return x.slice(0, i) + b + x.slice(i + a.length);
}
// 1. drop the wrap calls
s = rep(s, '[...lcWrap(compDict(), [2])]', '[...compDict()]', 'dc');
s = rep(s, '[...lcWrap(compNest(), [2, 4])]', '[...compNest()]', 'lc2');
s = rep(s, '[...lcWrap(compIfStmt(), [2])], [...lcWrap(compStmt(), [2])]', '[...compIfStmt()], [...compStmt()]', 'lc');
// 2. drop the helpers block
const h0 = s.indexOf('  // ---------------- comprehension scope ----------------');
const h1 = s.indexOf('  // ---------------- list comprehension ----------------');
if (h0 < 0 || h1 < 0 || h1 < h0) { console.log('MISS helper region'); } else { s = s.slice(0, h0) + s.slice(h1); console.log('helpers removed'); }
fs.writeFileSync(C, s);
// 3. drop the __lcbound builtin
let v = fs.readFileSync(V, 'utf8');
v = v.replace(", '__sortpairs', '__lcbound'];", ", '__sortpairs'] ;".replace(' ;', ';'));
const b0 = v.indexOf("      S.If(E.eq(bn(), E.str(key('__lcbound'))), [");
const b1 = v.indexOf("      S.If(E.eq(bn(), E.str(sortKeyName())), [");
if (b0 < 0 || b1 < 0 || b1 < b0) { console.log('MISS bound builtin'); }
else { let e = b1; while (e > b0 && v[e - 1] !== NL) e--; v = v.slice(0, b0) + v.slice(e); console.log('bound builtin removed'); }
fs.writeFileSync(V, v);