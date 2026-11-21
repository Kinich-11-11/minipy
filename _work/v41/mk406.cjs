const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "      setV('mmsv', VAR('mkhi')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "      LOGX(JX(txt('D lo='), argOf('lo'), txt(' hi='), argOf('hi'), txt(' mkend='), VAR('mkend'), txt(' mkhi='), VAR('mkhi'), txt(' mkklo='), VAR('mkklo'), txt(' mkkhi='), VAR('mkkhi'), txt(' nC='), llen('p4list'))),",
  "      setV('mmsv', VAR('mkhi')),"
].join('\n'));
const from2 = "      setV('mkhi', ADD(argOf('lo'), num(1)))";
s = s.replace(from2, [
  "      LOGX(JX(txt('D2 mkdfv=['), VAR('mkdfv'), txt('] mkdft='), VAR('mkdft'), txt(' ev=['), VAR('ev'), txt('] et='), VAR('evtype'), txt(' err=['), VAR('error'), txt(']'))),",
  "      " + from2
].join('\n'));
s = s.split('P405').join('P406');
fs.writeFileSync('_work/v41/p406.txt', s);
console.log('wrote p406.txt');