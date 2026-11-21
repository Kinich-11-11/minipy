const fs = require('fs');
const p = '_work/v41/pz61.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    if (!refsVar(b.inputs.VALUE, 'ev', 0)) continue;   // 只要追加点（值里用到 ev 的）";
const to = [
  "    // 只要\"拼接型\"的追加点：值是 JOIN；初始化（值 0 或空串）跳过",
  "    const v = b.inputs.VALUE;",
  "    const vb = v && typeof v[1] === 'string' ? BL()[v[1]] : null;",
  "    if (!vb || vb.opcode !== 'operator_join') continue;"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
// 探针内容加长：ev/evtype/pps/pi/pi2
const from2 = s.slice(s.indexOf('    insertBeforeStmt(s, ['), s.indexOf('  console.log(\'[PZ61] probes installed\');'));
const to2 = [
  "    insertBeforeStmt(s, [",
  "      callProc('fail %s', [JOIN(txt('PZ61 #' + (sites.indexOf(s) + 1) + ' et=['), JOIN(VAR('evtype'), JOIN(txt('] ev=['), JOIN(VAR('ev'), JOIN(txt('] pps=['), JOIN(VAR('pps'), JOIN(txt('] ppi=['), JOIN(VAR('ppi'), JOIN(txt('] pi=['), JOIN(VAR('pi'), txt(']'))))))))))))])",
  "    ]);",
  ""
].join('\n');
if (!from2) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
