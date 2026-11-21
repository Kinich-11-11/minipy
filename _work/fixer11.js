
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
if (s.includes('const zoneChanged = () =>')) { console.log('already defined'); process.exit(0); }
s = s.replace("  // one line per pointer move:",
  "  const zoneChanged = () => cmp('equals', B.VAR('mchg'), B.num(1));\n  // one line per pointer move:");
fs.writeFileSync(bp, s);
console.log('zoneChanged restored');
