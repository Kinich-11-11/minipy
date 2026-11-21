const fs = require('fs');
let s = fs.readFileSync('_work/v41/p379.txt', 'utf8');
// 在压栈前后各加一条日志
s = s.replace("  insertBeforeStmt(body, [addTo('FnStack', VAR('fi'))]);",
  "  insertBeforeStmt(body, [LOGX(JX(txt('PUSHLOG fi='), VAR('fi'))), addTo('FnStack', VAR('fi'))]);");
s = s.replace("  spliceAfter(body, chain([deleteLast('FnStack')]));",
  "  spliceAfter(body, chain([LOGX(JX(txt('POPLOG n='), llen('FnStack'))), deleteLast('FnStack')]));");
s = s.split('P379').join('P380');
fs.writeFileSync('_work/v41/p380.txt', s);
console.log('wrote p380.txt');