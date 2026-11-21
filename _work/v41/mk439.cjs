const fs = require('fs');
let s = fs.readFileSync('_work/v41/p438.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "    IF(EQ(VAR('lcat'), txt('O')), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "    LOGX(JX(txt('LC lcat='), VAR('lcat'), txt(' lca=['), VAR('lca'), txt('] lcbt='), VAR('lcbt'), txt(' lcb=['), VAR('lcb'), txt('] vmOn='), VAR('vmOn'))),",
  "    IF(EQ(VAR('lcat'), txt('O')), ["
].join('\n'));
s = s.split('P438').join('P439');
fs.writeFileSync('_work/v41/p439.txt', s);
console.log('wrote p439.txt');