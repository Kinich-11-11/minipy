const fs = require('fs');
const f = '_work/v41/支持范围与限制.md';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const idx = lines.findIndex((l) => l.includes('raise MyErr') && l.includes('except MyErr as e'));
if (idx < 0) throw new Error('not found');
lines.splice(idx, 0, '* **自定义异常类（v4.56）**：`class MyErr(Exception): ...`（13 个内建异常名都能当父类）、');
fs.writeFileSync(f, lines.join('\n'));
console.log(lines.slice(idx - 3, idx + 5).map((x, i) => (idx - 2 + i) + ': ' + x).join('\n'));
