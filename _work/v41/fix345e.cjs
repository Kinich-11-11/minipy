const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
// 在第一次 callfn 之后、第二次 callfn 之后各加一条日志
const a1 = "      setV('p345fn', VAR('ev')),";
const a2 = "      callProc('callfn %s %s %s', [\n        VAR('p345fn'),";
if (!s.includes(a1) || !s.includes(a2)) { console.log('MISS'); process.exit(1); }
s = s.replace(a1, [
  "      callProc('log %s', [JOIN(txt('A1 ev=['), JOIN(VAR('ev'), JOIN(txt('] t='), VAR('evtype')))]),",
  a1
].join('\n'));
s = s.replace(a2, [
  "      callProc('log %s', [JOIN(txt('A2 fn=['), JOIN(VAR('p345fn'), txt(']'))]),",
  a2
].join('\n'));
const a3 = "      stopThis()\n    ])";
if (!s.includes(a3)) { console.log('MISS3'); process.exit(1); }
s = s.replace(a3, [
  "      callProc('log %s', [JOIN(txt('A3 ev=['), JOIN(VAR('ev'), JOIN(txt('] t='), VAR('evtype')))]),",
  "      stopThis()",
  "    ])"
].join('\n'));
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('chain probes added');