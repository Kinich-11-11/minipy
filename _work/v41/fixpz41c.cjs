const fs = require('fs');
const p = '_work/v41/pz41.txt';
let s = fs.readFileSync(p, 'utf8');
// 把探针从"绑定循环之前"改成"绑定调用之前"，打印 aui / evtype / ev / AName[aui]
const from = s.slice(s.indexOf("  // 在绑定循环之前打印"), s.indexOf("  console.log('[PZ41] probe installed"));
const to = [
  "  // 在绑定调用之前打印（每次绑定都打一次）",
  "  insertBeforeStmt(bindCall, [",
  "    setV('dbg', txt('BIND aui=')),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('aui'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' name='))),",
  "    setV('dbg', JOIN(VAR('dbg'), item('AName', VAR('aui')))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' vt='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('evtype'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' v='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('ev'))),",
  "    callProc('fail %s', [VAR('dbg')])",
  "  ]);",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
