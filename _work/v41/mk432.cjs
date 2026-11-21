const fs = require('fs');
let s = fs.readFileSync('_work/v41/p431.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    insertBeforeStmt(setSelf, [\n      IF(AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf('clo'), argOf('chi')))), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "    insertBeforeStmt(setSelf, [",
  "      LOGX(JX(txt('CC narg=['), VAR('narg'), txt('] clo='), argOf('clo'), txt(' chi='), argOf('chi'), txt(' vmOn='), VAR('vmOn'), txt(' cfull=['), VAR('cfull'), txt(']'))),",
  "      IF(AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf('clo'), argOf('chi')))), ["
].join('\n'));
s = s.split('P431').join('P432');
fs.writeFileSync('_work/v41/p432.txt', s);
console.log('wrote p432.txt');