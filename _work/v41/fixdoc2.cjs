const fs = require('fs');
const f = '_work/v41/支持范围与限制.md';
let t = fs.readFileSync(f, 'utf8');
const bad = '  探针 `_work/cmp47/d187.json` 10/10。\n  `raise MyErr';
const good = '  探针 `_work/cmp47/d187.json` 10/10。\n* **自定义异常类（v4.56）**：`class MyErr(Exception): ...`（13 个内建异常名都能当父类）、\n  `raise MyErr';
if (!t.includes(bad)) throw new Error('anchor');
t = t.replace(bad, good);
fs.writeFileSync(f, t);
console.log(fs.readFileSync(f, 'utf8').split('\n').slice(98, 105).map((x, i) => (i + 99) + ': ' + x).join('\n'));
