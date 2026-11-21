
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
const marker = "  console.log('[patch6] backdrop rewritten:', oldName, '->', newName, '(' + before + ' -> ' + svg.length + ' bytes)');";
if (!s.includes(marker)) { console.log('MARKER NOT FOUND'); process.exit(1); }
s = s.replace(marker, marker + "\n  const pruned2 = pruneUnreachable(project);\n  console.log('[patch6] pruned', pruned2, 'orphan blocks left by the removed handlers');");
fs.writeFileSync(bp, s);
console.log('patch6 now prunes its own orphans');
