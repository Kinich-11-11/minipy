const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
// 关掉 (D)：仍然数站点，但**不做**第三实参的改写
const from = "    b.inputs[keys[2]] = B.REP(SUB(VAR('p344end'), num(1)), [4, '0']);";
const to = "    // 【二分实验】暂不改写第三实参：// b.inputs[keys[2]] = B.REP(SUB(VAR('p344end'), num(1)), [4, '0']);";
if (!s.includes(from)) { console.log('MISS (D) line'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P347').join('P349');
fs.writeFileSync('_work/v41/p349.txt', s);
console.log('wrote p349.txt ((D) disabled)');
