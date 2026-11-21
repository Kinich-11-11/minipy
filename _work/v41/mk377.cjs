const fs = require('fs');
let s = fs.readFileSync('_work/v41/p376.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// regdef 末尾探针
s = s.replace("  console.log('[P376] regdef: captured at ' + 'CloN/CloV');",
  "  spliceAfter(0, chain([]));\n  console.log('[P377] probes');");
// 在 regdef 链条最后插入日志：放在 addTo('CloL'...) 之后
s = s.replace("    addTo('CloL', num(0)),",
  "    addTo('CloL', num(0)),\n    LOGX(JX(txt('R cdepth='), VAR('cdepth'), txt(' nNames='), llen('Names'), txt(' cloN='), llen('CloN'), txt(' fi='), VAR('cloFi'))),");
// calluser 之前探针
s = s.replace("  insertBeforeStmt(body, [\n    IF(GT(llen('CloL'), num(0)), [",
  "  insertBeforeStmt(body, [\n    LOGX(JX(txt('C fi='), VAR('fi'), txt(' lenCloL='), llen('CloL'), txt(' nNames='), llen('Names'))),\n    IF(GT(llen('CloL'), num(0)), [");
s = s.split('P376').join('P377');
fs.writeFileSync('_work/v41/p377.txt', s);
console.log('wrote p377.txt');