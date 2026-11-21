const fs = require('fs');
let s = fs.readFileSync('_work/v41/p321.txt', 'utf8');
const from = s.slice(s.indexOf('  const varNameOf = (input) => {'), s.indexOf('  const ll = reach('));
const to = [
  "  // 把实参表达式描述成 {kind:'var'|'arg', name}",
  "  const argDesc = (input) => {",
  "    const dig = (d) => {",
  "      if (!Array.isArray(d)) return null;",
  "      if (d[0] === 12 && typeof d[1] === 'string') return { kind: 'var', name: d[1] };",
  "      if (Array.isArray(d[1])) return dig(d[1]);",
  "      return null;",
  "    };",
  "    const direct = dig(input);",
  "    if (direct) return direct;",
  "    // 形参：input = [3,\"bargume_xxx\",[10,\"\"]]",
  "    const bid = Array.isArray(input) && typeof input[1] === 'string' ? input[1] : null;",
  "    const q = bid ? BL()[bid] : null;",
  "    if (q && q.opcode === 'argument_reporter_string_number') return { kind: 'arg', name: q.fields.VALUE[0] };",
  "    return null;",
  "  };",
  "  const exprOf = (d) => d.kind === 'arg' ? argOf(d.name) : VAR(d.name);",
  ""
].join('\n');
s = s.replace(from, to);
s = s.replace("    const loE = varNameOf(b.inputs[keys[0]]);\n    const hiE = varNameOf(b.inputs[keys[1]]);\n    if (!loE || !hiE) { console.log('[P321] skip ' + id + ' (args not plain vars)'); continue; }",
  "    const loE = argDesc(b.inputs[keys[0]]);\n    const hiE = argDesc(b.inputs[keys[1]]);\n    if (!loE || !hiE) { console.log('[P321] skip ' + id + ' (args not var/param)'); continue; }");
s = s.replace("const guard = IF(NOT(GT(VAR(loE), VAR(hiE))), [id]);", "const guard = IF(NOT(GT(exprOf(loE), exprOf(hiE))), [id]);");
s = s.replace("console.log('[P321] guarded eval with ' + loE + ' > ' + hiE);", "console.log('[P321] guarded eval with ' + loE.name + ' > ' + hiE.name);");
fs.writeFileSync('_work/v41/p321.txt', s);
console.log('rewrote p321');