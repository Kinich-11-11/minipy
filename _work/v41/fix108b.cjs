const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz108.txt', 'utf8');
const from = '  let loop = null;\n  for (const id of Object.keys(BB)) {\n    const b = BB[id];\n    if (b.opcode !== "control_repeat_until" || !b.inputs || !b.inputs.CONDITION) continue;\n    const nm = namesIn(b.inputs.CONDITION, 0, []);\n    if (nm.indexOf("cpi") < 0 || nm.indexOf("cpe") < 0 || nm.indexOf("#hi") < 0) continue;\n    loop = id; break;\n  }';
const to = [
  '  const loops = [];',
  '  for (const id of Object.keys(BB)) {',
  '    const b = BB[id];',
  '    if (b.opcode !== "control_repeat_until" || !b.inputs || !b.inputs.CONDITION) continue;',
  '    const nm = namesIn(b.inputs.CONDITION, 0, []);',
  '    if (nm.indexOf("cpi") < 0 || nm.indexOf("cpe") < 0 || nm.indexOf("#hi") < 0) continue;',
  '    loops.push(id);',
  '  }',
  '  const loop = loops[0];'
].join('\n');
if (!s.includes(from)) { console.log('MISS loops'); process.exit(1); }
s = s.replace(from, to);
// 安装改成对所有 loops
const from2 = "  insertBeforeStmt(loop, [";
const to2 = "  for (const lp of loops) {\n  try {\n  insertBeforeStmt(lp, [";
if (!s.includes(from2)) { console.log('MISS install'); process.exit(1); }
s = s.replace(from2, to2);
const from3 = "  ]);\n  console.log('[PZ108] probe installed before ' + loop);";
const to3 = "  ]);\n  console.log('[PZ108] probe installed before ' + lp);\n  } catch (e) { console.log('[PZ108] skip ' + lp + ' : ' + e.message); }\n  }\n  console.log('[PZ108] loops=' + loops.length);";
if (!s.includes(from3)) { console.log('MISS tail'); process.exit(1); }
s = s.replace(from3, to3);
fs.writeFileSync('_work/v41/pz108.txt', s);
console.log('pz108 now patches all matching loops');
