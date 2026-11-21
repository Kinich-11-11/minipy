const fs = require('fs');
let s = fs.readFileSync('_work/v41/p443.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "      setV('lcres', VAR('ev')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "      LOGX(JX(txt('LT scan='), VAR('lcscan'), txt(' cfull=['), VAR('cfull'), txt('] ev=['), VAR('ev'), txt('] et='), VAR('evtype'), txt(' err=['), VAR('error'), txt(']'))),",
  "      setV('lcres', VAR('ev')),"
].join('\n'));
const from2 = "      setV('cmp', num(1)),\n      IF(EQ(VAR('lcres'), num(1)), [setV('cmp', num(-1))]),";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
s = s.replace(from2, "      LOGX(JX(txt('LT end lcres=['), VAR('lcres'), txt('] cmp-before='), VAR('cmp'))),\n      setV('cmp', num(1)),\n      IF(EQ(VAR('lcres'), num(1)), [setV('cmp', num(-1))]),");
s = s.split('P443').join('P444');
fs.writeFileSync('_work/v41/p444.txt', s);
console.log('wrote p444.txt');