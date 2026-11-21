const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(P, 'utf8');
if (s.indexOf('module.exports') >= 0) { console.log('already exported'); process.exit(0); }
fs.writeFileSync(P, s.replace(/\s*$/, '') + NL + 'module.exports = { optimize };' + NL);
console.log('export restored');