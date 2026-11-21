const fs = require('fs');
let s = fs.readFileSync('_work/v41/p435.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "      IF(AND(NOT(EQ(VAR('iid'), txt(''))), AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf(pLo), argOf(pHi))))), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "      LOGX(JX(txt('CF iid=['), VAR('iid'), txt('] narg='), VAR('narg'), txt(' lo='), argOf(pLo), txt(' hi='), argOf(pHi), txt(' self=['), VAR('self'), txt(']'))),",
  "      IF(AND(NOT(EQ(VAR('iid'), txt(''))), AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf(pLo), argOf(pHi))))), ["
].join('\n'));
s = s.split('P435').join('P436');
fs.writeFileSync('_work/v41/p436.txt', s);
console.log('wrote p436.txt');