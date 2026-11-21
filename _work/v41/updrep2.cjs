const fs = require('fs');
const P = '_work/v41/收尾报告.md';
let t = fs.readFileSync(P, 'utf8');
const reps = [
  ['> 当前发布版：**`MiniPy_v4.195.sb3`**（231 parts、32,192 块、`check41` errors = 0）',
   '> 当前发布版：**`MiniPy_v4.196.sb3`**（231 parts、32,237 块、`check41` errors = 0）'],
  ['## 一、总体验证（v4.195）', '## 一、总体验证（v4.196）'],
  ['| 回归套件 | **85 个**（含新的单用例 `_g4`–`_g8`） |', '| 回归套件 | **91 个**（含新的单用例 `_g4`–`_g8`、`_h1`–`_h5`） |'],
  ['| 用例总数 | **937** |', '| 用例总数 | **963** |'],
  ['| 通过 / 失败 | **816 / 121** |', '| 通过 / 失败 | **847 / 116** |'],
  ['| 旧版重建（跳过表） | v4.194 = **MATCH** |', '| 旧版重建（跳过表） | v4.195 = **MATCH** |'],
  ['全套件均 **≥ 上一版基线**（v4.166 → v4.195 期间每一步都有"零回归"或"净增益"记录）。',
   '全套件均 **≥ 上一版基线**（v4.166 → v4.196 期间每一步都有"零回归"或"净增益"记录）；v4.196 一次净增 **14 例**（`_r4`/`_r1`/`_p8`/`_kw`/`_doc`/`_p7`/`_cov5`/`_ch`）。'],
  ['| 7 | `pow` 单参 ✅ / `max·min(default=)` | 后半**暂缓**（9 轮未通，落点与失败点全部留档） | v4.186 |',
   '| 7 | `pow` 单参 ✅ / `max·min(default=)` ✅ | **全部完成**（`default=` v4.196；真实失败原因是当年自己写的 `mkhi = lo+1` 让后续 `eval(lo+2, mkhi)` 成为空区间） | v4.186 / **v4.196** |'],
  ['**结论**：14 条中 **12 条完全完成**（#14 新增 `yield from`）；#6 为文档已注明的值模型差异；\n**#7 后半、#9、`sorted`+`__lt__`** 为明确"暂缓 / 已知限制"；',
   '**结论**：14 条中 **13 条完全完成**（v4.196 补上 #7 的 `default=`）；#6 为文档已注明的值模型差异；\n**#9、`sorted`+`__lt__`** 为明确"暂缓 / 已知限制"；'],
  ['| #7 `max/min(default=)` | `SyntaxError` / 忽略 default | 落点（关键字路径）、算法（值槽）均已打通并留档；失败点为"路径后续 `ev/evtype` 分派"（`p405`/`p402`） |',
   '| ~~#7 `max/min(default=)`~~ | ~~`SyntaxError`~~ | **✅ v4.196 已修** |']
];
let ok = 0; const miss = [];
for (const [a, b] of reps) {
  if (t.indexOf(a) >= 0) { t = t.split(a).join(b); ok++; } else miss.push(a.slice(0, 34));
}
fs.writeFileSync(P, t);
console.log('replaced=' + ok + '/' + reps.length + ' missing=' + miss.length);
if (miss.length) console.log(miss.join('\n'));
