const fs = require('fs');
let s = fs.readFileSync('_work/v41/p320.txt', 'utf8');
const from = s.slice(s.indexOf("  let condIf = null, cur = add;"), s.indexOf("  const loopVar"));
const to = [
  "  // 按条件文本找逗号判定：子树里同时含 Tok 与 ','",
  "  const sub = (id, d) => {",
  "    if (!id || d > 10 || typeof id !== 'string') return '';",
  "    const q = BL()[id];",
  "    if (!q) return '';",
  "    let t = JSON.stringify(q);",
  "    for (const v of Object.values(q.inputs || {})) if (Array.isArray(v) && typeof v[1] === 'string') t += sub(v[1], d + 1);",
  "    return t;",
  "  };",
  "  let condIf = null;",
  "  for (const id of ll) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;",
  "    const t = sub(b.inputs.CONDITION[1], 0);",
  "    if (t.indexOf('tok') < 0 && t.indexOf('Tok') < 0) continue;",
  "    if (t.indexOf(',') < 0) continue;",
  "    condIf = id; break;",
  "  }",
  ""
].join('\n');
s = s.replace(from, to);
fs.writeFileSync('_work/v41/p320.txt', s);
console.log('rewrote p320 locator');