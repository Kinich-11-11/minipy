const fs = require('fs');
const NL = String.fromCharCode(10);
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let lines = fs.readFileSync(V, 'utf8').split(NL);
const before = lines.length;
lines = lines.filter((l) => !/BINDBG|BEFORE%|PCTBRANCH|SFDBG/.test(l));
let v = lines.join(NL);
const s0 = v.indexOf('function strFormat(');
if (s0 >= 0) {
  const c0 = v.lastIndexOf('  //', s0);
  const s1 = v.indexOf('  function binBlock() {');
  v = v.slice(0, c0) + v.slice(s1);
  console.log('strFormat removed');
} else console.log('no strFormat');
fs.writeFileSync(V, v);
console.log('probe lines removed: ' + (before - lines.length));