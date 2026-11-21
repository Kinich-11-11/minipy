const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(p, 'utf8');
const a = "    poolKeyOf[s] = (hats && hats.size === 1) ? [...hats][0] : s;";
const b = "    poolKeyOf[s] = process.env.V5_NOPOOL ? s : ((hats && hats.size === 1) ? [...hats][0] : s);";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.slice(0, i) + b + s.slice(i + a.length));
console.log('toggle added');