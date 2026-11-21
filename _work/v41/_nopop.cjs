const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', 'utf8');
const marker = "    insertBeforeStmt(evIid[0], [";
const start = s.indexOf(marker);
if (start < 0) { console.log('pop block not found (already disabled?)'); process.exit(0); }
const end = s.indexOf("    ]);", start);
if (end < 0) throw new Error('pop block end not found');
s = s.slice(0, start) + "    // POP-DISABLED-FOR-TEST" + s.slice(end + "    ]);".length);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p511.txt', s);
console.log('pop disabled');
