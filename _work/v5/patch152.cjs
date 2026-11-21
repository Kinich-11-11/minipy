const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);
const a = "  item: (list, i) => blk('data_itemoflist', [['INDEX', i, 'rep']], { LIST: list }),";
const b = [
  "  item: (list, i) => {",
  "    if (typeof i === 'string') { console.log('ITEM-STR ' + i + NL + new Error().stack.split(String.fromCharCode(10)).slice(1, 6).join(String.fromCharCode(10))); }",
  "    return blk('data_itemoflist', [['INDEX', i, 'rep']], { LIST: list });",
  "  },"].join(NL);
if (s.indexOf(a) < 0) { console.log('MISS item'); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(p, s);
console.log('instrumented item');