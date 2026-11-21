const fs = require('fs');
let s = fs.readFileSync('_work/v41/p373.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [
    anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
  ].join('\n'));
}
// 站点之前加一条：打印 hi / Tok[hi-2] / Tok[hi-3] / p345w
const before = "  insertBeforeStmt(site, [\n    setV('p345w', SUB(argOf('hi'), num(1))),";
if (!s.includes(before)) { console.log('MISS before'); process.exit(1); }
s = s.replace(before, [
  "  insertBeforeStmt(site, [",
  "    LOGX(JX(txt('V hi='), argOf('hi'), txt(' t2=['), item('Tok', SUB(argOf('hi'), num(2))), txt('] t3=['), item('Tok', SUB(argOf('hi'), num(3))), txt(']'))),",
  "    setV('p345w', SUB(argOf('hi'), num(1))),"
].join('\n'));
// 站点之后：打印 p345w / ev / evtype
const after = "  spliceAfter(site, chain([\n    IF(GT(argOf('hi'), num(3)), [";
if (!s.includes(after)) { console.log('MISS after'); process.exit(1); }
s = s.replace(after, [
  "  spliceAfter(site, chain([",
  "    LOGX(JX(txt('W p345w='), VAR('p345w'), txt(' ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),",
  "    IF(GT(argOf('hi'), num(3)), ["
].join('\n'));
s = s.split('P373').join('P374');
fs.writeFileSync('_work/v41/p374.txt', s);
console.log('wrote p374.txt (probes)');
