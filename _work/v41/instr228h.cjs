// 临时调试：assignlist 捷径标记 + unpackto 分组分支标记
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const a1 = "        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),";
const a2 = "          callProc('substr %s %s %s', [VAR('unseg'), num(2), SUB(lenOf(VAR('unseg')), num(1))]),";
if (!s.includes(a1)) { console.log('MISS shortcut'); process.exit(1); }
if (!s.includes(a2)) { console.log('MISS group'); process.exit(1); }
s = s.replace(a1, "        callProc('fail %s', [JOIN(txt('SC['), JOIN(VAR('augnames'), txt(']')))]),\n" + a1);
s = s.replace(a2, "          callProc('fail %s', [JOIN(txt('GRP['), JOIN(VAR('unseg'), txt(']')))]),\n" + a2);
fs.writeFileSync(p, s);
console.log('instrumented');
