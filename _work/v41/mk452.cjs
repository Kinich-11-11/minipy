const fs = require('fs');
let s = fs.readFileSync('_work/v41/p451.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    insertBeforeStmt(t.body, [reg()]);";
const to = "    insertBeforeStmt(t.body, [LOGX(JX(txt('LH '), txt(t.id), txt(' et='), VAR('evtype'))), reg()]);";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P451').join('P452');
fs.writeFileSync('_work/v41/p452.txt', s);
console.log('probe added');