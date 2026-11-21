const fs = require('fs');
const p = '_work/v41/p264.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  insertBeforeStmt(failId, [\n    IF(EQ(VAR('smmeth'), txt('__name__')), [";
const to = [
  "  insertBeforeStmt(failId, [",
  "    // [PZ53] 临时探针：看看这一处的\"方法名\"到底在哪个变量里",
  "    callProc('fail %s', [JOIN(txt('PZ53 smmeth=['), JOIN(VAR('smmeth'), JOIN(txt('] tok2=['), JOIN(item('Tok', ADD(argOf('lo'), num(2))), txt(']')))))]),",
  "    IF(EQ(VAR('smmeth'), txt('__name__')), ["
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
