const fs = require('fs');
const p = '_work/v41/p281.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  for (const id of reach(branch)) {";
const to = "  for (const id of reach(BL()[branch].inputs.SUBSTACK[1])) {   // 只看分支体，别顺着 next 跑到 eval 其余部分";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
