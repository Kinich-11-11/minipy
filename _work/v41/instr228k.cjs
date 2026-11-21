// 临时调试：捷径标记 + unpackto 分段分派标记
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const a1 = "        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),";
const a2 = "        callProc('listitem %s %s', [ENC(), VAR('unk')]),";
if (!s.includes(a1)) { console.log('MISS shortcut'); process.exit(1); }
if (!s.includes(a2)) { console.log('MISS dispatch'); process.exit(1); }
s = s.replace(a1, "        callProc('fail %s', [JOIN(txt('SC<'), JOIN(VAR('augnames'), txt('>')))]),\n" + a1);
s = s.replace(a2, "        callProc('fail %s', [JOIN(txt('D<'), JOIN(VAR('unseg'), txt('>')))]),\n" + a2);
fs.writeFileSync(p, s);
console.log('instrumented');
