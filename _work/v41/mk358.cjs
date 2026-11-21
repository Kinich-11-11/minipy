// p358 = p357 + eval 入口的可执行探针（限前 6 次）：p344ok / p344end / hi / lo / Tok[lo]
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p357.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [
    anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
  ].join('\n'));
}
// 计数器变量
s = s.replace(
  "  const BB = T(IT).blocks;",
  "  if (taken.has('p358n')) throw new Error('[P358] var taken');\n  newVar('p358n', 0);\n  const BB = T(IT).blocks;"
);
// 在 eval 入口插入探针（作为语句，放在 setV('p344close', ...) 之前）
const head = "  insertBeforeStmt(evalHead, [\n    setV('p344close', argOf('hi')),";
if (!s.includes(head)) { console.log('MISS eval head'); process.exit(1); }
const probe = [
  "  insertBeforeStmt(evalHead, [",
  "    chgV('p358n', num(1)),",
  "    IF(LT(VAR('p358n'), num(7)), [",
  "      LOGX(JX(txt('T n='), VAR('p358n'), txt(' lo='), argOf('lo'), txt(' hi='), argOf('hi'), txt(' Tok[lo]=['), item('Tok', argOf('lo')), txt('] ok='), VAR('p344ok'), txt(' end='), VAR('p344end')))",
  "    ]),",
  "    setV('p344close', argOf('hi')),"
].join('\n');
s = s.replace(head, probe);
s = s.split('P357').join('P358');
fs.writeFileSync('_work/v41/p358.txt', s);
console.log('wrote p358.txt (entry probes)');
