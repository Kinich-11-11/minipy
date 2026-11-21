const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz108.txt', 'utf8');
const start = s.indexOf("  let loop = null;");
const end = s.indexOf("  if (!loop) throw new Error('[PZ108] paren loop not found');");
if (start < 0 || end < 0) { console.log('MISS'); process.exit(1); }
const repl = [
  '  // 收集条件子树里出现的**变量名**（含内联变量与 argument_reporter）',
  '  const namesIn = (v, d, out) => {',
  '    if (!Array.isArray(v) || d > 14) return out;',
  '    if (v[0] === 12 && typeof v[1] === "string") { out.push(v[1]); return out; }',
  '    const id = typeof v[1] === "string" ? v[1] : null;',
  '    const q = id ? BB[id] : null;',
  '    if (q) {',
  '      if (q.opcode === "data_variable") out.push(q.fields.VARIABLE[0]);',
  '      if (q.opcode === "argument_reporter_string_number" && q.fields.VALUE) out.push("#" + q.fields.VALUE[0]);',
  '      for (const x of Object.values(q.inputs || {})) namesIn(x, d + 1, out);',
  '    }',
  '    if (Array.isArray(v[1])) namesIn(v[1], d + 1, out);',
  '    return out;',
  '  };',
  '  let loop = null;',
  '  for (const id of Object.keys(BB)) {',
  '    const b = BB[id];',
  '    if (b.opcode !== "control_repeat_until" || !b.inputs || !b.inputs.CONDITION) continue;',
  '    const nm = namesIn(b.inputs.CONDITION, 0, []);',
  '    if (nm.indexOf("cpi") < 0 || nm.indexOf("cpe") < 0 || nm.indexOf("#hi") < 0) continue;',
  '    loop = id; break;',
  '  }',
  ''
].join('\n');
s = s.slice(0, start) + repl + s.slice(end);
fs.writeFileSync('_work/v41/pz108.txt', s);
console.log('locator rewritten');
