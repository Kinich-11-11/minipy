const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const from = "      setV('error', txt('')),\n      setV('mkhi', ADD(argOf('lo'), num(1)))";
const to = "      setV('error', txt(''))\n      // 不把 mkhi 收窄（收窄会让后续某处 eval(lo+2, mkhi) 变成空区间 ⇒ SyntaxError: missing expression）\n      // 收集循环照常跑，结果由 minkey 的提前返回改用 mkdfv/mkdft。";
if (!s.includes(from)) { console.log('MISS'); return; }
fs.writeFileSync('_work/v41/p465.txt', s.replace(from, to).split('P405').join('P465'));
console.log('p465 written');