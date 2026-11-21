const fs = require('fs');
const f = '_work/v41/支持范围与限制.md';
let t = fs.readFileSync(f, 'utf8');
const bad = t.split('\n').find((l) => l.includes('v4.59') && l.includes('xcept'));
if (!bad) throw new Error('line not found');
const good = '* **多个 `except` 子句依次匹配（v4.59）**：`try/except A/except B/except:` 会按顺序试，裸 `except` 与\n  `Exception` 照旧兜底，用户异常类按 `ClsPar` 匹配基类；探针 `_work/cmp47/d187.json` 10/10。';
t = t.replace(bad, good);
// the two lines that follow it belong to the class bullet that got split
t = t.replace('\n* **自定义异常类（v4.56）**：`class MyErr(Exception): ...`（13 个内建异常名都能当父类）、', '\n* **自定义异常类（v4.56）**：`class MyErr(Exception): ...`（13 个内建异常名都能当父类）、');
fs.writeFileSync(f, t);
const lines = fs.readFileSync(f, 'utf8').split('\n');
console.log(lines.slice(96, 106).map((l, i) => (i + 97) + ': ' + l).join('\n'));
