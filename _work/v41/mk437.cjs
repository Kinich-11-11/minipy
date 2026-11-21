const fs = require('fs');
let s = fs.readFileSync('_work/v41/p435.txt', 'utf8');
const from = "    const pLo = names[0], pHi = names[1];";
const to = "    const pLo = names[1], pHi = names[2];   // 形参是 fn, lo, hi ⇒ 取第 2、3 个";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P435').join('P437');
fs.writeFileSync('_work/v41/p437.txt', s);
console.log('param indices fixed');