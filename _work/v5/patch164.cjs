const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let s = fs.readFileSync(p, 'utf8');
const a = "em.defineProc('Interpreter', 'vm_run', [], () => build(), true);";
const b = "// NOT warp: warp threads ignore the explicit Wait 0 yields, which would defeat the time slicing." + NL + "  em.defineProc('Interpreter', 'vm_run', [], () => build(), false);";
const i = s.indexOf(a);
if (i < 0) { console.log('MISS'); process.exit(1); }
s = s.slice(0, i) + b + s.slice(i + a.length);
fs.writeFileSync(p, s);
console.log('warp reverted');