const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
// 把链式后半段的**外层 IF 条件**改成恒假（只关 (C)，保留 (A)(B)(D)）
const from = "    // 链式后半段：三层嵌套 IF（**不要**用嵌套 AND）\n    IF(EQ(VAR('p344ok'), num(1)), [";
const to = "    // 【二分实验】链式后半段暂时关闭\n    IF(EQ(num(1), num(2)), [";
if (!s.includes(from)) { console.log('MISS chain head'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P347').join('P348');
s = s.replace("patch('P348 chained call second half'", "patch('P348 bisect: chain disabled'");
fs.writeFileSync('_work/v41/p348.txt', s);
console.log('wrote p348.txt (chain disabled)');
