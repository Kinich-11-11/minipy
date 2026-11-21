const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz94.txt', 'utf8');
const from = "    if (!condHasEvtypeList(b.inputs.CONDITION[1], 0)) continue;";
const to = "    // 只按 SUBSTACK 里是否有 >=2 个 Tok 写回来挑（不依赖条件形状）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync('_work/v41/pz94.txt', s);
console.log('ok');