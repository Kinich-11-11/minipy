const fs = require('fs');
let s = fs.readFileSync('_work/v41/p440.txt', 'utf8');
const from = "      callProc('calluser %s %s %s', [VAR('cfull'), B.REP(num(1), [4, '0']), B.REP(num(0), [4, '0'])]),";
const to = "      callProc('calluser %s %s %s', [VAR('cfull'), B.REP(VAR('lcscan'), [10, '']), B.REP(VAR('lcscan'), [10, ''])]),   // 用一个"数字字面量"的位置当区间（值槽随后覆盖第 1 个实参）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
// 在武装段之前插入"找一个 N 型 token"的扫描
const anchor = "    IF(AND(EQ(VAR('lcat'), txt('O')), hasLt), [";
if (!s.includes(anchor)) { console.log('MISS2'); process.exit(1); }
s = s.replace(anchor, [
  "    setV('lcscan', num(1)),",
  "    REPEATU(OR(GT(VAR('lcscan'), llen('Tok')), EQ(item('Kind', VAR('lcscan')), txt('N'))), [chgV('lcscan', num(1))]),",
  "    IF(AND(EQ(VAR('lcat'), txt('O')), hasLt), ["
].join('\n'));
s = s.split('P440').join('P441');
fs.writeFileSync('_work/v41/p441.txt', s);
console.log('numeric-literal scan installed');