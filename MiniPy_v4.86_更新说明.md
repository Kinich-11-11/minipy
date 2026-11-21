# MiniPy v4.86 更新说明

本轮**支持 TAB 字符**：TAB 缩进能跑，行尾 TAB 与字符串里的 TAB 也不再报错。补丁 **P159**。

产物 `MiniPy_v4.86.sb3`：Interpreter 20,888 块，合计 **22,317**，`check41` errors=0；
77 个历史版本全部可复现（v4.10…v4.86 MATCH）。

## 1. 问题

TAB 以前一出现就 `SyntaxError: ASCII text required`。原因有三层，缺一层都不行：

| 代码 | v4.85 | **v4.86**（= CPython） |
|---|---|---|
| `if True:` + TAB + `print('tab')` | `SyntaxError: ASCII text required` | `tab` |
| TAB 嵌套 / `for` / `while` / `def` / `class` / `try` / `if-else` | 同上 | 正常 |
| `print(1)` + TAB + `# tail` | 同上 | `1` |
| `'a\tb'` 这种**字符串里**的 TAB | 同上 | 正常（转义写法本来也行） |
| 4 空格 / 2 空格缩进（v4.85 已支持） | 正常 | **不变** |
| 非 ASCII 字符（中文等） | `SyntaxError: ASCII text required` | **不变**（仍报错） |

## 2. 做法（三层，都在的）

1. **字符合法性**：`checkASCII` 判断"字符是否合法"的办法是**切到以该字符命名的造型**再问造型号有没有变
   （那套造型就是 95 个可打印 ASCII 字符），TAB 没有造型 ⇒ 报错。现在那个 `AND(造型号没变, 字符不是空格)`
   后面再串一个 **`且字符不是 TAB`**，TAB 直接放行。
2. **缩进计数**：`prepare` 数"前导空白"时只跳空格 ⇒ TAB 缩进的行看起来是顶格的。跳过条件改成
   **空格或 TAB**（每个算 1 个宽度；`indent` 只当"层级"用，v4.85 P158 已放开宽度要求）。
3. **词法跳过**：`tokenize` 只把空格当空白 ⇒ TAB 会变成一个 token，行内直接 `SyntaxError: expression`，
   而且"上一行的第一个 token"（`prevhead`）会变成 TAB，于是"意外缩进"的判据也失配。空格判据改成
   **空格或 TAB**。

三个锚点各一处：`checkASCII` 的守卫（`AND` 的第二个操作数）、`prepare` 的前导空白循环（比的是
`letter(ej, es)`）、`tokenize` 的空白跳过（比的是变量 `ec`）。

## 3. 实测

| 套件 | v4.85 | **v4.86** |
|---|---|---|
| `d237.json`（本轮新写 **18 条**：TAB 缩进/嵌套/`for`/`while`/`def`/`class`/`try`/`if-else`、两个 TAB 的层级、行尾 TAB、字符串里的 TAB、TAB 缩进的多行函数与嵌套循环、4 空格与 2 空格回归、非 ASCII 仍报错） | 5/18 | **18/18** |
| `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 · `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **106 套：102 套逐例相同**；4 处差异 = `d237` 的 **13 条由红转绿** + **featprobe2 的"TAB 缩进"由红转绿** + `t113`（CPython 集合哈希序，差异在参考侧 `py:` 上）+ `featprobe3`（地址）——`ref false` 14 / `ref true` 只有 `t113` 那一处噪声 ⇒ **零回归** |
| 6 个 featprobe（259 条） | 247/259 | **248/259**（featprobe2 只剩 `import os`） |
| `check41.cjs` | 22,307 块 errors=0 | **22,317 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.85 共 76 版全 MATCH | **v4.10…v4.86 共 77 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

没有新增变量、没有新增过程（三处都是把已有判据放宽）。

**一个坑**：`tokenize` 里的空白判据比的是**变量** `ec`（`ec = letter(ep, source)`），不是内联的
`letter_of` 积木——第一版按"OPERAND1 是 letter_of"去找，锚点落空（`tokenize space test = 0`）。

## 4. 前后对比

```
if True:
	print('tab')          v4.85: SyntaxError: ASCII text required   v4.86: tab
def f(x):
	return x + 1          v4.85: SyntaxError: ASCII text required   v4.86: 正常
print('a	b')             v4.85: SyntaxError: ASCII text required   v4.86: a	b
if True:
    print('four')         不变
print('中')                不变：SyntaxError: ASCII text required（非 ASCII 仍不支持）
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 非 ASCII（注释/标识符/字符串） | 仍 `SyntaxError: ASCII text required`（ASCII 字符串模型；渲染字库也只有 ASCII） |
| TAB 与空格**混用**缩进 | CPython 报 `TabError`；MiniPy 把 TAB 记 1 个宽度（与 1 个空格等价），所以 `\t` 与 `     `（4 空格）是**不同**层级——能跑但不报错，比 CPython 宽松 |
| TAB 的显示宽度 | 记 1（CPython 制表位按 8 展开）；因为只用"相对层级"，不影响能否运行 |
| 缩进一致性检查 | 比 CPython 宽松（同 v4.85） |
| `dict(映射, 关键字)` 记录顺序 / `f(**d)` | 同 v4.84 |
| 嵌套规格 `'{:{w}}'` / `%c` 语义 / `'{a!a}'` | 同 v4.83–v4.84 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.86.sb3
node _work/v41/run.mjs MiniPy_v4.86.sb3 _work/cmp47/d237.json  # TAB 18 条
node _work/v41/run.mjs MiniPy_v4.86.sb3 _work/cmp47/d236.json  # 缩进宽度 20 条（v4.85）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.86.sb3 -tag v486 -ref v485
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v486 -ref v485
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.86.sb3 -tag v486
node _work/v41/check41.cjs MiniPy_v4.86.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.85 还原： $env:V41_SKIP='P159'; $env:V41_OUT='…/MiniPy_v4.85.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.87）候选

1. TAB 的制表位宽度（按 8 展开）与 `TabError`（TAB/空格混用）
2. 缩进一致性检查（对齐 CPython 的 `unexpected indent`）
3. `dict(映射, 关键字)` 的记录顺序
4. `f(**d)`（用户函数与内建的关键字解包）
5. 嵌套规格 `'{:{w}}'` / `%c` 的语义与文案
