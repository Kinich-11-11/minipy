// p360 = p357，但站点第三实参换成**全新**的 SUB(argOf('hi'),1)（不引用 p344end，也不复用旧块）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p357.txt', 'utf8');
const from = "    b.inputs[keys[2]] = B.REP(SUB(VAR('p344end'), num(1)), [4, '0']);";
const to = "    b.inputs[keys[2]] = B.REP(SUB(argOf('hi'), num(1)), [4, '0']);   // 全新块，避免共用/悬空";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p360.txt', s.replace(from, to).split('P357').join('P360'));
console.log('wrote p360.txt (fresh SUB(hi,1) per site)');
