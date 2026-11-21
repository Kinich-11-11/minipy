const fs = require('fs');
const p = '_work/v41/p290.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 去掉诊断行
const diagLine = "    FAIL(JOIN(JOIN(JOIN(JOIN(JOIN(txt('PZ67 asnm='), VAR('asnm')), txt(' ascp=')), VAR('ascp')), txt(' err=')), VAR('error'))),\n";
if (!s.includes(diagLine)) { console.log('MISS diag'); process.exit(1); }
s = s.replace(diagLine, '');
// 2) 类名从 tlast 里切（周围代码用的就是 tlast；用 error 时 ascp 还是 0，substr(s,1,-1) 会失败）
const from = "callProc('substr %s %s %s', [VAR('error'), num(1), ADD(VAR('ascp'), num(-1))]),";
const to = "callProc('substr %s %s %s', [VAR('tlast'), num(1), ADD(VAR('ascp'), num(-1))]),";
if (!s.includes(from)) { console.log('MISS var'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync(p, s);
console.log('ok');
