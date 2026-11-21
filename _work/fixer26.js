
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const idx = s.indexOf('// ============ PATCH 11a');
if (idx >= 0) s = s.slice(0, idx);
const parts = ['p11a.txt', 'p11b.txt'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n');
s = s.replace('// ---- write ----', parts + '\n// ---- write ----');
fs.writeFileSync(bp, s);
console.log('patch11 applied (length ' + s.length + ')');
