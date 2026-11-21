const fs = require('fs');
let s = fs.readFileSync('_work/v41/p453.txt', 'utf8');
const start = s.indexOf('  // 直接找 evtype == "Y" 的 IF');
const end = s.indexOf("  if (!yIf) throw new Error('[P453] the evtype==\"Y\" IF inside the list handler not found');");
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
const repl = `  // 与 dv6 同路：先找 equals[fn,"list"]，它的 parent 就是处理体 IF，其 SUBSTACK 首条即 evtype=="Y" 的 IF
  let listIf = null, yIf = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode !== 'operator_equals' || !q.inputs) continue;
    const o = [];
    items(q.inputs, o);
    if (o.indexOf('list') < 0 || o.indexOf('fn') < 0) continue;
    const par = q.parent;
    const w = par ? BB[par] : null;
    if (!w || w.opcode !== 'control_if' || !w.inputs || !w.inputs.SUBSTACK) continue;
    const first = w.inputs.SUBSTACK[1];
    const f = first ? BB[first] : null;
    if (!f || f.opcode !== 'control_if' || !f.inputs || !f.inputs.CONDITION) continue;
    const fo = [];
    items(f.inputs.CONDITION, fo);
    if (fo.indexOf('Y') >= 0 && fo.indexOf('evtype') >= 0) { listIf = par; yIf = first; break; }
  }
`;
s = s.slice(0, start) + repl + s.slice(end);
fs.writeFileSync('_work/v41/p453.txt', s);
console.log('finder uses the condition-parent route');