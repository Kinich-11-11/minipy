// 在链式 IF 之前插入 C1–C5 五条无条件诊断（用辅助函数拼 JOIN，避免括号不配对）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');

const anchor = "patch('P345 chained call second half', () => {";
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [
    anchor,
    '  const LOGX = (expr) => callProc(\'log %s\', [expr]);',
    '  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);'
  ].join('\n'));
}

const marker = "    // ---------- (2) 链式后半段 ----------";
if (!s.includes(marker)) { console.log('MISS chain marker'); process.exit(1); }
const tokExpr = "item('Tok', ADD(VAR('p344close'), num(1)))";
const diag = [
  marker,
  "    LOGX(JX(txt('C1 ok='), VAR('p344ok'))),",
  "    LOGX(JX(txt('C2 close='), VAR('p344close'), txt(' hi='), argOf('hi'))),",
  "    LOGX(JX(txt('C3 tok=['), " + tokExpr + ", txt(']'))),",
  "    LOGX(JX(txt('C4 contains='), isOpen(" + tokExpr + "))),",
  "    LOGX(JX(txt('C5 lt='), LT(VAR('p344close'), argOf('hi')))),",
  "    LOGX(JX(txt('C6 eq='), EQ(VAR('p344ok'), num(1)))),"
].join('\n');
s = s.replace(marker, diag);
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('C1-C6 diagnostics inserted before the chain IF');
