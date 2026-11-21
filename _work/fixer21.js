
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
if (s.includes('PATCH 10a')) { console.log('already applied'); process.exit(0); }
const parts = ['p10a.txt', 'p10b.txt', 'p10c.txt', 'p10d.txt'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n');
s = s.replace('// ---- write ----', parts + '\n// ---- write ----');
fs.writeFileSync(bp, s);
console.log('patch10 appended');
