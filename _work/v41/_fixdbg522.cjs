const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v41/_dbg522.js';
let s = fs.readFileSync(p, 'utf8');
const oldBlock = "  insertAfterStmt2(assigns[0], [\n    callProc('lookup %s', [txt('self')]),\n    log([t('CM inst='), argOf('inst'), t(' lookup(self) found='), VAR('found'), t(' val='), item('Values', VAR('found'))])\n  ]);";
const newBlock = "  insertAfterStmt2(assigns[0], [\n    log([t('CM inst='), argOf('inst'), t(' gself='), VAR('self')])\n  ]);";
if (!s.includes(oldBlock)) { console.error('OLD BLOCK NOT FOUND'); process.exit(1); }
s = s.replace(oldBlock, newBlock);
fs.writeFileSync(p, s);
console.log('patched: ' + s.includes('gself='));
