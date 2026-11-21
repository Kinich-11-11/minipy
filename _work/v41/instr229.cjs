// 临时调试驱动：给 P229 的多目标分支插一个 fail，看它到底有没有被进入
const fs = require('fs');
const path = '_work/v41/p229.txt';
let s = fs.readFileSync(path, 'utf8');
const old = "  insertBeforeStmt(body, [setV('leadBr', CONTAINS('([{', tok1()))]);";
const nw = "  insertBeforeStmt(body, [setV('leadBr', CONTAINS('([{', tok1())), callProc('fail %s', [VAR('leadBr')])]);";
if (!s.includes(old)) { console.log('NOMATCH'); process.exit(1); }
fs.writeFileSync(path, s.replace(old, nw));
console.log('instrumented');
