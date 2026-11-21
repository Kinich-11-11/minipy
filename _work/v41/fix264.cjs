const fs = require('fs');
const p = '_work/v41/p264.txt';
let s = fs.readFileSync(p, 'utf8');
const from = s.slice(s.indexOf('  // 找那条 str 属性错误消息'), s.indexOf("  if (!failId) throw new Error"));
const to = [
  "  // 找那条 str 属性错误消息（消息是嵌套 join，要沿块树找那个字面量）",
  "  const deepHas = (id, pred, depth) => {",
  "    if (!id || depth > 40 || typeof id !== 'string') return false;",
  "    const b = BL()[id];",
  "    if (!b) return false;",
  "    if (pred(b)) return true;",
  "    if (Object.values(b.inputs || {}).some((v) => v && typeof v[1] === 'string' && deepHas(v[1], pred, depth + 1))) return true;",
  "    return deepHas(b.next, pred, depth + 1);",
  "  };",
  "  let failId = null;",
  "  for (const id of ev) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') continue;",
  "    const v = b.inputs[Object.keys(b.inputs)[0]];",
  "    if (!deepHas(v && v[1], (x) => x.opcode === 'text' && String(x.fields.TEXT[0]).indexOf(\"AttributeError: 'str' object has no attribute\") === 0, 0)) continue;",
  "    failId = id;",
  "    break;",
  "  }",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
