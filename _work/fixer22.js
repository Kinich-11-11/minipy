
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const idx = s.indexOf('// ============ PATCH 10a');
if (idx >= 0) { s = s.slice(0, idx); console.log('removed previous patch10 attempt'); }
fs.writeFileSync(bp, s);
