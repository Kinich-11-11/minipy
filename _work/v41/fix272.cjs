const fs = require('fs');
const p = '_work/v41/p272.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    IF(AND(EQ(argOf('fn'), txt('pow')), NOT(callProcExpr('hascomma %s %s', [argOf('lo'), argOf('hi')]))), [";
const to = "    // 兜底只会被 0/1 个实参的调用走到（2 个走 builtin2、用户函数走 calluser），所以直接按名字判断即可\n    IF(EQ(argOf('fn'), txt('pow')), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
