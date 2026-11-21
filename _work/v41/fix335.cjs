const fs = require('fs');
let s = fs.readFileSync('_work/v41/p335.txt', 'utf8');
// 1) 去掉调试日志
s = s.split("      callProc('log %s', [JOIN(txt('PZ92 meq='), VAR('mzeq'))]),\n").join('');
s = s.split("      callProc('log %s', [JOIN(txt('PZ92 names='), VAR('mznm'))]),\n").join('');
s = s.split("      callProc('log %s', [JOIN(txt('PZ92 n='), VAR('mzn'))]),\n").join('');
s = s.split("      callProc('log %s', [JOIN(txt('PZ92 evtype='), VAR('evtype'))]),\n").join('');
s = s.split("      callProc('log %s', [JOIN(txt('PZ92 ev='), VAR('ev'))]),\n").join('');
// 2) 只统计等号之前的逗号
const from = "      IF(AND(EQ(VAR('mzd'), num(0)), EQ(VAR('mzc'), txt(','))), [addTo('MCom', VAR('mzi'))]),";
const to = "      IF(AND(EQ(VAR('mzd'), num(0)), AND(EQ(VAR('mzc'), txt(',')), EQ(VAR('mzeq'), num(0)))), [addTo('MCom', VAR('mzi'))]),";
if (!s.includes(from)) { console.log('MISS comma rule'); process.exit(1); }
s = s.replace(from, to);
if (s.includes('PZ92')) { console.log('MISS logs'); process.exit(1); }
fs.writeFileSync('_work/v41/p335.txt', s);
console.log('fixed: commas before = only');