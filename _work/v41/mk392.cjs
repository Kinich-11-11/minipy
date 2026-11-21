const fs = require('fs');
let s = fs.readFileSync('_work/v41/p391.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// 计数器
s = s.replace("  newVar('imjm', 0);", "  newVar('imjm', 0);\n  if (taken.has('p392n')) throw new Error('[P392] var taken');\n  newVar('p392n', 0);");
// 在循环体第一条语句（setV 之前）插入日志 —— 循环体是 IF(...)，先在其所在的 REPEATU 的 SUBSTACK 头部插
const from = "    REPEATU(NOT(LT(VAR('imjm'), llen('Kind'))), [\n      IF(EQ(kAt(VAR('imjm')), txt('S')), [";
if (!s.includes(from)) { console.log('MISS loop head'); process.exit(1); }
s = s.replace(from, [
  "    REPEATU(NOT(LT(VAR('imjm'), llen('Kind'))), [",
  "      chgV('p392n', num(1)),",
  "      IF(LT(VAR('p392n'), num(41)), [",
  "        LOGX(JX(txt('M i='), VAR('imjm'), txt(' nT='), llen('Tok'), txt(' nK='), llen('Kind'), txt(' k='), kAt(VAR('imjm')), txt(' t='), tAt(VAR('imjm'))))",
  "      ]),",
  "      IF(EQ(kAt(VAR('imjm')), txt('S')), ["
].join('\n'));
s = s.split('P391').join('P392');
fs.writeFileSync('_work/v41/p392.txt', s);
console.log('wrote p392.txt');
