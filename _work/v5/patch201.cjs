const fs = require('fs');
const NL = String.fromCharCode(10);
const P = 'D:/编程/scratch/ai/minipython/_work/v5/regalloc.js';
let s = fs.readFileSync(P, 'utf8');
const a = "  const KEEP = Math.max(0, Number(process.env.V5_KEEPVARS || 16));";
const b = [
  "  // Target: 150-200 Scratch variables (only the coldest registers are pushed into the",
  "  // list, so the cost is negligible).  V5_KEEPVARS overrides the cap.",
  "  const KEEP = Math.max(0, Number(process.env.V5_KEEPVARS || 180));"].join(NL);
if (s.indexOf(a) < 0) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(P, s.replace(a, b));
console.log('KEEP = 180');