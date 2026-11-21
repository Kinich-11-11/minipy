const fs = require('fs');
const p = '_work/v41/p263.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  insertBeforeStmt(evalCall, [\n    // 是否含顶层等号（不是 == / <= / >= / !=）";
const to = "  insertBeforeStmt(evalCall, [\n    // [PZ52] 探针：本分支是否被执行 + 顶层等号扫描结果\n    // 是否含顶层等号（不是 == / <= / >= / !=）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
// 在 kwhas 扫描之后插一个 fail（临时）
const from2 = "    IF(EQ(VAR('kwhas'), num(1)), [";
const to2 = "    callProc('fail %s', [JOIN(txt('PZ52 kw lo='), JOIN(argOf('lo'), JOIN(txt(' hi='), JOIN(argOf('hi'), JOIN(txt(' kwhas='), VAR('kwhas'))))))]),\n    IF(EQ(VAR('kwhas'), num(1)), [";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
