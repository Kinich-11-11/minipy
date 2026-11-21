const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const sv = reach(defIdOf('strval %s %s'));";
const ins = [
  "  const CONTAINS = (hay, val) => I('operator_contains', { inputs: { STRING1: B.REP(txt(hay), [10, '']), STRING2: B.REP(val, [10, '']) } });",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins));
console.log('ok');
