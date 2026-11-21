
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const startMarker = '  // ---- hat script: track pointer movement over a panel ----';
const endMarker = "  console.log('[patch2] pointer scrolling installed');";
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0 || end < start) { console.log('MARKERS NOT FOUND', start, end); process.exit(1); }
const repl = fs.readFileSync(dir + 'p2new.txt', 'utf8');
s = s.slice(0, start) + repl + s.slice(end);
// only mzone is still needed
s = s.replace("  B.addVar('Controller', 'mpx', 0);\n  B.addVar('Controller', 'mpy', 0);\n  B.addVar('Controller', 'macc', 0);\n  B.addVar('Controller', 'mzone', 0);\n  B.addVar('Controller', 'mzone2', 0);\n  B.addVar('Controller', 'mchg', 0);",
              "  B.addVar('Controller', 'mzone', 0);");
fs.writeFileSync(bp, s);
console.log('patch2 rewritten for keyboard-driven scrolling');
