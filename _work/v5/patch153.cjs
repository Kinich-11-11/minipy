const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('+ i + NL +', '+ i + String.fromCharCode(10) +');
fs.writeFileSync(p, s);
console.log('fixed');