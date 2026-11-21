# MiniPy v4.80 更新说明

本轮补上格式规格的最后两块常用能力：**`!r`/`!s`/`!a` 转换**与 **`,`/`_` 千分位分组**。补丁 **P153**。

产物 `MiniPy_v4.80.sb3`：Interpreter 20,428 块，合计 **21,857**，`check41` errors=0；
71 个历史版本全部可复现（v4.10…v4.80 MATCH）。

## 1. 问题

| 代码 | v4.79 | **v4.80**（= CPython） |
|---|---|---|
| `'{a!r}'.format(a='xy')` | `KeyError: 'a!r'` | `'xy'` |
| `'{a!s}'.format(a='xy')` | `KeyError: 'a!s'` | `xy` |
| `'{a!r:>10}\|'.format(a='xy')` | `KeyError: 'a!r:>10'` | `      'xy'\|` |
| `'{a!s:^7}\|'.format(a='ab')` | `KeyError` | `  ab   \|` |
| `'{a:,}'.format(a=1234567)` | `1234567` | `1,234,567` |
| `'{a:,.2f}'.format(a=1234567.891)` | `1234567.89` | `1,234,567.89` |
| `'{a:_}'.format(a=1234567)` | `1234567` | `1_234_567` |
| `'{a:15,}'.format(a=1234567)` | `1234567` | `      1,234,567` |
| `'{a:>5}'.format(a=1)` / `'{:05d}'` / f-string | 正常 | **不变** |

字段的文法本来就是 `名字 [ "!" 转换 ] [ ":" 规格 ]`，而 `strfmt` 只在 `:` 处切分，于是 `a!r`
被当成关键字名；`,`/`_` 则被 `fldspec` 直接跳过。

## 2. 做法

* **`!` 转换**：`strfmt` 的字段扫描加一个中间状态（`fwspec` 从 `''` → `'!'` → `'!r'`），
  遇到 `:` 才转为规格。**`flditem` 的函数体整体重建**：先把 `vv`/`vt` 取到 `fwv`/`fwt`，
  若字段以 `!` 开头就按转换符先算一遍（`s` → `strval`，`r`/`a` → `reprval`），
  把结果写回 `fwv`/`fwt` 并把 `fwspec` 改写成剩下的 `:规格` 部分——后面的规格解析与补白原封不动复用
  （转换后的值是字符串，`fldspec` 收到 `fwt = 'S'`，默认对齐自然变成左对齐，与 CPython 一致）。
* **千分位**：`fldspec` 不再丢掉 `,`/`_`，而是记进新变量 `fwcom` 并拼进 `fwbody`；
  `pctitem` 的**标志循环**与**宽度循环**都认这两个字符（Python 的规格里分隔符可以在宽度前
  `,.2f`，也可以在宽度后 `12,.2f`），分别置 `p53c`/`p53u`；在**宽度块之前**调用新过程
  **`group %s %s`**（数字串、分隔符）插入分隔符——放在宽度块之前，补白就会把逗号算进宽度
  （`'{a:15,}'` = `      1,234,567`）。`group` 先摘出符号与小数部分，只对整数部分每三位插一个分隔符。

## 3. 一个很值钱的坑：`"0"` 的影子

`fldspec` 里"零填充"那条分支和普通分支各有一个 `setV('fwbody', …)`。第一版用
`JSON.stringify(inputs.VALUE).includes('"0"')` 区分它们——**结果两条都命中了**：`num()`/`txt()`
是**内联基元**（`[1,[4,'0']]` / `[1,[10,'0']]`），而且 Scratch 每个数字输入都带一个 `[4,'0']` 的
**影子（shadow）**，于是"含 `"0"`"对所有产生数字的连接块都成立。症状很uniform：**凡是带宽度或
精度的用例，补白全变成 `0`**（`'{a:>5}'.format(a=1)` → `00001`、`'{a!s:^7}'` → `00000ab`，
9 条回归一起红）。改成找**内联的字符串 `'0'`**（`[10,'0']`，只有零填充那条有）即可。
**教训**：区分语句不要靠 JSON 子串，要靠结构或语义（内联基元与影子是同一层的东西）。

## 4. 实测

| 套件 | v4.79 | **v4.80** |
|---|---|---|
| `d231.json`（本轮新写 **36 条**：`!r`/`!s` 10 条（含带规格、位置参数、混用）、千分位/下划线 15 条（含宽度/左对齐/零填充/负数/小数/自定义填充）、11 条既有能力回归） | 13/36 | **36/36** |
| `d230` 59 · `d229` 44 · `d227` 26 · `d228` 25 · `d226` 8 · `pct` 8 · `fstr` 8 · `str` 12 | — | **全绿** |
| 快照 | — | **100 套：97 套逐例相同**；3 处差异 = `d231` 的 **23 条由红转绿**（`ref false` 23 / `ref true` 0）+ `t113`（`for x in {'a','b'}` 的 CPython 集合哈希序——差异在参考侧 `py:` 上，MiniPy 侧稳定）+ `featprobe3`（地址）⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,730 块 errors=0 | **21,857 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.79 共 70 版全 MATCH | **v4.10…v4.80 共 71 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 12 个变量（`fwv` `fwt` `fwcom` `p53c` `p53u` `p53a` `p53b` `p53d` `p53e` `p53f` `p53g` `p53h`）、
1 个过程（`group %s %s`）。

## 5. 前后对比

```
print('{a!r}'.format(a='xy'))        v4.79: KeyError        v4.80: 'xy'
print('{a!r:>10}|'.format(a='xy'))   v4.79: KeyError        v4.80:       'xy'|
print('{a:,}'.format(a=1234567))     v4.79: 1234567         v4.80: 1,234,567
print('{a:,.2f}'.format(a=1234567.891))  v4.79: 1234567.89 v4.80: 1,234,567.89
print('{a:>5}'.format(a=1))          不变：    1
print('{:05d}'.format(-42))          不变：-0042
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `f'{x!r}'`（**f-string** 里的 `!r`） | 不支持：`fstr`（P77）把 `!` 当表达式的一部分交给 `eval`，报 `SyntaxError`。`.format` 已可用 |
| `'{a:#x}'` / `'{a:#b}'` / `'{a:#o}'` 前缀 | `#` 仍被跳过（得到 `ff` 而不是 `0xff`） |
| `'{a.b}'` / `'{a[0]}'`（字段里的属性/下标） | 仍不支持（同 v4.77–v4.79） |
| 嵌套规格 `'{:{w}}'` | 不支持 |
| 类型不匹配的报错文案 | `'{a:b}'.format(a=1.5)` 复用 `%x format: an integer is required`（CPython 是 `ValueError: Unknown format code 'b' …`） |
| 少参数、显式索引越界、自动/显式编号混用 | 仍静默（为不动既有快照而保留） |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.80.sb3
node _work/v41/run.mjs MiniPy_v4.80.sb3 _work/cmp47/d231.json  # !r/!s + 千分位 共 36 条
node _work/v41/run.mjs MiniPy_v4.80.sb3 _work/cmp47/d230.json  # g/G + b + % 59 条（v4.79）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.80.sb3 -tag v480 -ref v479
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v480 -ref v479
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.80.sb3 -tag v480
node _work/v41/check41.cjs MiniPy_v4.80.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.79 还原： $env:V41_SKIP='P153'; $env:V41_OUT='…/MiniPy_v4.79.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.81）候选

1. `'{a:#x}'`/`#b`/`#o` 前缀（把 `#` 也做成 `pctitem` 的标志位）
2. **f-string 里的 `!r`/`!s`**（`fstr` 的规格切分处先切 `!`）
3. `'{a.b}'` / `'{a[0]}'` 字段里的属性/下标
4. 少参数 / 显式索引越界 / 自动-显式混用的报错文案
5. 类型不匹配的 `ValueError: Unknown format code …`
