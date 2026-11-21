
const fs = require('fs');
const s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/build.js', 'utf8');
const lines = s.split('\n');
console.log('total lines', lines.length);
console.log(lines.slice(-6).join('\n'));
console.log('has write marker:', s.includes('// ---- write ----'));
console.log('has zipWrite:', s.includes('zipWrite(outEntries'));
