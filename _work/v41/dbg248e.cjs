const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
const marks = [
  ["  // (0) 清空新列表", "step0"],
  ["  // (1) 分组括号判定：只看目标起始 token", "step1"],
  ["  // (2) 简单路径：按顶层逗号切目标", "step2"],
  ["  // (3) 绑定：下标/属性目标走 pathset", "step3"]
];
for (const [anchor, name] of marks) {
  if (!s.includes(anchor)) { console.log('MISS ' + name); process.exit(1); }
  s = s.replace(anchor, "  console.log('[P248] entering " + name + "');\n" + anchor);
}
fs.writeFileSync(p, s);
console.log('ok');
