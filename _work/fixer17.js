
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const startMarker = "  // ---- custom block: scrollone (dir) ----";
const endMarker = "  console.log('[patch2] pointer scrolling installed');";
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0 || end < start) { console.log('MARKERS NOT FOUND', start, end); process.exit(1); }
s = s.slice(0, start) + fs.readFileSync(dir + 'p2v2.txt', 'utf8') + s.slice(end);
// mzone is no longer used at all
s = s.replace("\n  B.addVar('Controller', 'mzone', 0);", "");
fs.writeFileSync(bp, s);
console.log('patch2 rewritten: zone passed as an argument (length ' + s.length + ')');
