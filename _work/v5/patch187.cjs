const fs = require('fs');
const V = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let v = fs.readFileSync(V, 'utf8');
const a = 'module.exports = { build: build, setup: setup, key: key, BUILTINS: BUILTINS };';
const b = 'module.exports = { build: build, setup: setup, key: key, BUILTINS: BUILTINS, EXCNAMES: EXCNAMES };';
const i = v.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(V, v.slice(0, i) + b + v.slice(i + a.length));
console.log('EXCNAMES exported');