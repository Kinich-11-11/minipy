# MiniPy v4.85 更新说明

本轮把**缩进宽度放开**：2 空格、3 空格、6 空格、8 空格…… 只要一致就能跑（CPython 就是这么宽容的），
不再强制"必须 4 空格"。补丁 **P158**。

产物 `MiniPy_v4.85.sb3`：Interpreter 20,878 块，合计 **22,307**，`check41` errors=0；
76 个历史版本全部可复现（v4.10…v4.85 MATCH）。

## 1. 问题

以前只要是"非 4 倍数"的缩进就直接报错，**大量现成的 Python 代码（2 空格缩进）一行都跑不了**：

| 代码 | v4.84 | **v4.85**（= CPython） |
|---|---|---|
| `if True:` + 2 空格 `print(...)` | `IndentationError: use 4 spaces` | `two-space` |
| 3 空格 / 6 空格 / 8 空格缩进 | 同上 | 正常 |
| 2 空格嵌套 / `for` / `while` / `def` / `class` / `try` / `if-elif-else` | 同上 | 正常 |
| 4 空格（既有代码） | 正常 | **不变** |
| 多余的缩进（前一行不是块开头） | `unexpected indent` | `IndentationError: unexpected indent`（不变） |

## 2. 做法

`prepare`（缩进预扫描）里把每行的**前导空格数**算成 `indent`，然后：

* 删掉那句 `if not indent % 4 == 0 → fail('IndentationError: use 4 spaces')`；
* 把"只深四格才算开块"的判据 `indent == previndent + 4` 改成 **`indent > previndent`**。

之所以敢这么改：**全解释器只有这两处**把缩进和数字 4 绑在一起（我把 `prepare`/`execute` 里所有与
`indent`/`Indents` 相关的加减乘除取模都扫了一遍，只有这两处）。`indent` 其它地方**只当"层级"用**
（与上一行比大小、压进 `Indents`、空行/注释行记 `-1`），所以 4 空格代码的行为一字不变，
而 2/3/6/8 空格从此都能开块。**多余缩进**仍然报错（前一行不是 `if`/`for`/`while`/`def`/`class`/
`try`/`except`/`finally`/`else`/`elif` 等块开头时）——只是判据从"深四格"变成"更深"。

**TAB 缩进仍然不行**，原因在另一条线上：字符检查 `checkASCII` 用**造型名**当合法字符表
（纯 ASCII 才能过），TAB 没有对应造型 ⇒ `SyntaxError: ASCII text required`。要支持 TAB 得给那套
造型加一个制表符，属于"ASCII 字符串模型"这一层的事，本轮没动（已记入残留）。

## 3. 实测

| 套件 | v4.84 | **v4.85** |
|---|---|---|
| `d236.json`（本轮新写 **20 条**：2/3/6/8 空格、嵌套、`for`/`while`/`def`/`class`/`try`/`if-elif-else`、注释与空行、多余缩进与不一致缩进的反例、4 空格回归） | 5/20 | **20/20** |
| `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 · `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **105 套：101 套逐例相同**；4 处差异 = `d236` 的 **17 处**（15 条由红转绿 + 2 条 `expectError` 用例的报错文案从 `use 4 spaces` 变成 `unexpected indent`）+ `featprobe2` 的 **1 处由红转绿**（"2 空格缩进"）+ `t113`（CPython 集合哈希序）+ `featprobe3`（地址）——`ref false` 17 / `ref true` **0** ⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **247/259**（featprobe2 的"2 空格缩进"转绿；剩 TAB 缩进与 `import os`） |
| `check41.cjs` | 22,314 块 errors=0 | **22,307 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.84 共 75 版全 MATCH | **v4.10…v4.85 共 76 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

没有新增变量、没有新增过程（只删了一句、改了一个判据）。

## 4. 前后对比

```
if True:
  print('two-space')          v4.84: IndentationError: use 4 spaces    v4.85: two-space
def f(x):
  return x + 1                v4.84: IndentationError: use 4 spaces    v4.85: 正常
if True:
    print('four')             不变
x = 1
  print(x)                    不变：IndentationError: unexpected indent
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| **TAB 缩进** | 仍报 `SyntaxError: ASCII text required`——`checkASCII` 拿"造型名"当合法字符表，TAB 没有造型 |
| 非 ASCII 注释/标识符/字符串 | 同上（ASCII 字符串模型） |
| 缩进风格混用（TAB 与空格） | CPython 报 `TabError`；MiniPy 目前只把"空格数"当层级（TAB 根本进不来） |
| 缩进的**一致性**检查 | 比 CPython 宽松：`if True:` 下先 2 空格再 4 空格会被当成"更深的块"（CPython 报 `IndentationError: unexpected indent`；MiniPy 只有在"前一行不是块开头"时才报） |
| `dict(映射, 关键字)` 记录顺序 / `f(**d)` | 同 v4.84 |
| 嵌套规格 `'{:{w}}'` / `%c` 语义 / `'{a!a}'` | 同 v4.83–v4.84 |
| `print(range(3))` 打印 `[0, 1, 2]` | 立即求值扩展（既有设计） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.85.sb3
node _work/v41/run.mjs MiniPy_v4.85.sb3 _work/cmp47/d236.json  # 缩进宽度 20 条
node _work/v41/run.mjs MiniPy_v4.85.sb3 _work/cmp47/d235.json  # 解包与 sum 19 条（v4.84）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.85.sb3 -tag v485 -ref v484
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v485 -ref v484
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.85.sb3 -tag v485
node _work/v41/check41.cjs MiniPy_v4.85.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.84 还原： $env:V41_SKIP='P158'; $env:V41_OUT='…/MiniPy_v4.84.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.86）候选

1. **TAB 缩进**（给那套"字符造型表"加制表符，或让 `checkASCII` 放行 `\t`）
2. 缩进一致性检查（把 CPython 的 `IndentationError: unexpected indent` / `TabError` 对齐）
3. `dict(映射, 关键字)` 的记录顺序
4. `f(**d)`（用户函数与内建的关键字解包）
5. 嵌套规格 `'{:{w}}'` / `%c` 的语义与文案
