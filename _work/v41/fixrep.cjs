const fs = require('fs');
const P = '_work/v41/收尾报告.md';
let t = fs.readFileSync(P, 'utf8');
t = t.split('| 用例总数 | **963** |').join('| 用例总数 | **942**（v4.195 的 937 + 新增 `_h1`–`_h5` 共 5 例） |');
t = t.split('| 通过 / 失败 | **847 / 116** |').join('| 通过 / 失败 | **820 / 122** |');
fs.writeFileSync(P, t);
console.log('totals corrected');