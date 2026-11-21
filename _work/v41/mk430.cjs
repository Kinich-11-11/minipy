const fs = require('fs');
let s = fs.readFileSync('_work/v41/p429.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    insertBeforeStmt(firstAssign, [\n      IF(EQ(VAR('vmOn'), num(1)), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "    insertBeforeStmt(firstAssign, [",
  "      LOGX(JX(txt('VJ vmOn='), VAR('vmOn'), txt(' nU='), llen('UArgV'), txt(' vmA=['), VAR('vmA'), txt('] vmT='), VAR('vmT'))),",
  "      IF(EQ(VAR('vmOn'), num(1)), ["
].join('\n'));
s = s.split('P429').join('P430');
fs.writeFileSync('_work/v41/p430.txt', s);
console.log('wrote p430.txt');