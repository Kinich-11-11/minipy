const fs = require('fs');
const p = '_work/v41/p235.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  if (!targets.length) throw new Error('[P235] no wrapper strip sites');\n  const all = targets;";
const to = "  if (!targets.length) throw new Error('[P235] no wrapper strip sites');\n  const all = targets.slice(0, 1);   // 只改第一个站点（实验：看回归是否来自第二个）";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
