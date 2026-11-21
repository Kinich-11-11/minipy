const fs = require('fs');
let s = fs.readFileSync('_work/v41/p399.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// 在 firstEval 之前插探针（放在 (4) 的那段之前）
const from = "  insertBeforeStmt(firstEval, [\n    IF(GT(VAR('mmdf'), num(0)), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "  insertBeforeStmt(firstEval, [",
  "    LOGX(JX(txt('IN lo='), argOf('lo'), txt(' hi='), argOf('hi'), txt(' mmdf='), VAR('mmdf'), txt(' mmdc='), VAR('mmdc'), txt(' mmsent='), VAR('mmsent'), txt(' nC='), llen('MComma'), txt(' cnt='), item('MCnt', llen('MCnt')), txt(' C1='), item('MComma', num(1)), txt(' C2='), item('MComma', num(2)), txt(' C3='), item('MComma', num(3)))),",
  "    IF(GT(VAR('mmdf'), num(0)), ["
].join('\n'));
s = s.split('P399').join('P400');
fs.writeFileSync('_work/v41/p400.txt', s);
console.log('wrote p400.txt');
