const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "      setV('p4list', txt('')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "      LOGX(JX(txt('DF lo='), argOf('lo'), txt(' hi='), argOf('hi'), txt(' mkend='), VAR('mkend'), txt(' mkhi='), VAR('mkhi'), txt(' mkklo='), VAR('mkklo'), txt(' mkkhi='), VAR('mkkhi'), txt(' mkdef='), VAR('mkdef'))),",
  "      setV('p4list', txt('')),"
].join('\n'));
s = s.split('P405').join('P464');
fs.writeFileSync('_work/v41/p464.txt', s);
console.log('wrote p464.txt');