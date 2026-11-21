const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS('.', VAR('ev'))), [stripBody])";
const to = "    IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS('.', VAR('ev'))), [stripBody, callProc('fail %s', [JOIN(txt('PZ59 ev=['), JOIN(VAR('ev'), txt(']'))])])";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
