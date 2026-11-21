
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
s = s.replace("  const step = iIfElse(cmp('gt', B.VAR('macc'), B.num(12)), stepDown, [\n    iIf(cmp('lt', B.VAR('macc'), B.num(-12)), stepUp)\n  ]);",
              "  const step = ifElse(cmp('gt', B.VAR('macc'), B.num(12)), stepDown, [\n    ifB(cmp('lt', B.VAR('macc'), B.num(-12)), stepUp)\n  ]);");
fs.writeFileSync(bp, s);
console.log('helper names fixed');
