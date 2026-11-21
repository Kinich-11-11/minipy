const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/perf.cjs';
let s = fs.readFileSync(p, 'utf8');
const a = "  sv('ticket').value = 1;";
const b = "  sv('ticket').value = 1;" + NL + "  sv('running').value = 1;";
if (s.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(a, b));
console.log('fixed running');