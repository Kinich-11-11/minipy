const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/head.txt', 'utf8');
s = s.split('MiniPy_v4.204.sb3').join('MiniPy_v4.205.sb3');
s = s.split('MiniPy v4.204 - built 2026-10-29').join('MiniPy v4.205 - built 2026-10-29');
s = s.split('v4.204 (newest)').join('v4.205 (newest)');
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/head.txt', s);
console.log('version bumped');
