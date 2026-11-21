const fs = require('fs');
const p = '_work/v41/p281.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  setV('mpisId', num(0));\n  insertBeforeStmt(host, [\n    IF(AND(EQ(item('Tok', ADD(argOf('lo'), num(2))), txt('None')),";
const to = "  insertBeforeStmt(host, [\n    setV('mpisId', num(0)),   // 必须**放进插入的代码里**，否则只是一块游离积木、从不执行（第 93 轮的状态泄漏 bug）\n    IF(AND(EQ(item('Tok', ADD(argOf('lo'), num(2))), txt('None')),";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
