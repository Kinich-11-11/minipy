// p355 = p347 + 链式分支内的**可执行**探针（作为积木插进分支数组，而不是补丁期 JS）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [
    anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
  ].join('\n'));
}
// 1) 第一次 callfn 之前
const a1 = "          callProc('callfn %s %s %s', [\n            item('Tok', argOf('lo')),";
if (!s.includes(a1)) { console.log('MISS a1'); process.exit(1); }
s = s.replace(a1, "          LOGX(JX(txt('S1 lo='), argOf('lo'), txt(' close='), VAR('p344close'), txt(' hi='), argOf('hi'))),\n" + a1);
// 2) 第一次 callfn 之后（p345fn 赋值之前）
const a2 = "          setV('p345fn', item('FnName', VAR('ev'))),";
if (!s.includes(a2)) { console.log('MISS a2'); process.exit(1); }
s = s.replace(a2, "          LOGX(JX(txt('S2 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n" + a2);
// 3) 第二次 callfn 之后（stopThis 之前）
const a3 = "          stopThis()";
if (!s.includes(a3)) { console.log('MISS a3'); process.exit(1); }
s = s.replace(a3, "          LOGX(JX(txt('S3 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n          stopThis()");
s = s.split('P347').join('P355');
fs.writeFileSync('_work/v41/p355.txt', s);
console.log('wrote p355.txt (executable chain probes)');
