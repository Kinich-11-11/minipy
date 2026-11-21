const fs = require('fs');
const p = '_work/v41/p291.txt';
let s = fs.readFileSync(p, 'utf8');
// (1) 输入识别：内联变量是 [12, 名字, 块id]
const fromDet = s.slice(s.indexOf('  let vvKey = null, vtKey = null;'), s.indexOf('  if (!vvKey || !vtKey) throw'));
const toDet = [
  "  let vvKey = null, vtKey = null, vtLit = null;",
  "  for (const k of keys) {",
  "    const v = b.inputs[k];",
  "    if (Array.isArray(v) && Array.isArray(v[1]) && v[1][0] === 12) {",
  "      if (v[1][1] === 'asmsg') vvKey = k;",
  "      if (v[1][1] === 'asnm') vtLit = k;",
  "    } else if (litOf(v) === 'S') { vtKey = k; }",
  "  }",
  ""
].join('\n');
if (!fromDet) { console.log('MISS det'); process.exit(1); }
s = s.replace(fromDet, toDet);
// (2) 替换：用内联变量 [3,[12,名字,块id],[10,""]]
const fromSet = "  b.inputs[vvKey] = B.REP(VAR('eid'), [10, '']);\n  b.inputs[vtKey] = B.REP(VAR('evt2'), [10, '']);";
const toSet = [
  "  const varIdOf = (n) => Object.keys(T(IT).variables).find((k) => T(IT).variables[k][0] === n);",
  "  const eidId = varIdOf('eid'), evt2Id = varIdOf('evt2');",
  "  if (!eidId || !evt2Id) throw new Error('[P291] variable ids: eid=' + eidId + ' evt2=' + evt2Id);",
  "  b.inputs[vvKey] = [3, [12, 'eid', eidId], [10, '']];",
  "  b.inputs[vtKey] = [3, [12, 'evt2', evt2Id], [10, '']];"
].join('\n');
if (!s.includes(fromSet)) { console.log('MISS set'); process.exit(1); }
s = s.replace(fromSet, toSet);
fs.writeFileSync(p, s);
console.log('ok');
