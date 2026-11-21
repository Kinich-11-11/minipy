const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/parse.js';
let s = fs.readFileSync(P, 'utf8');
const a = "      ])," + NL + "    ];" + NL + "  }" + NL + NL + "  function contIf(kw) {";
const b = "      ])," + NL + "      ])," + NL + "    ];" + NL + "  }" + NL + NL + "  function contIf(kw) {";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(P, s.slice(0, i) + b + s.slice(i + a.length));
console.log('closer added');