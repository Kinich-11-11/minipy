
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
if (s.includes('PATCH 6')) { console.log('already applied'); process.exit(0); }
s = s.replace('// ---- write ----', fs.readFileSync(dir + 'p6.txt', 'utf8') + '\n// ---- write ----');
fs.writeFileSync(bp, s);
console.log('patch6 appended');
