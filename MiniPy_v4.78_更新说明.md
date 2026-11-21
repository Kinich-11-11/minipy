# MiniPy v4.78 更新说明

本轮做 **格式规格**（format spec），即 `'{a:>5}'.format(a=1)` 里冒号后面那段。补丁 **P151**。
一次改动同时覆盖 `.format` 字段与 **f-string**（`f'{n:>5}'` 以前也不生效）。

产物 `MiniPy_v4.78.sb3`：Interpreter 20,085 块，合计 **21,514**，`check41` errors=0；
69 个历史版本全部可复现（v4.10…v4.78 MATCH）。

## 1. 问题

以前 `strfmt` 读字段只认"数字或空"：`'{a:>5}'` 里规格中的 `5` 被当成**显式位置索引 5**，
取不到值就整个替换消失（打出空行）；`f'{n:>5}'`（P77）则把规格的**最后一个字符**当转换符，
`>` 当规格、`5` 当转换符——同样什么都不发生。

| 代码 | v4.77 | **v4.78**（= CPython） |
|---|---|---|
| `'{a:>5}'.format(a=1)` | 空行 | `    1` |
| `'{:>5}'.format(1)` | 空行 | `    1` |
| `'{a:8.3f}'.format(a=3.14159)` | ` 3.14159` | `   3.142` |
| `'{:*<6}'.format('ab')` | 空行 | `ab****` |
| `'{:^7}'.format('ab')` | 空行 | `  ab   ` |
| `'{:05d}'.format(-42)` | `-42` | `-0042` |
| `f'{n:>5}'` | `7` | `    7` |
| `f'{x:8.3f}'` | `3.14159` | `   3.142` |
| `'{} {}'.format(1, 2)` / `'{a}'.format(a=3)` | 正常 | **不变** |

## 2. 做法

CPython 的规格是 `[[fill]align][sign][#][0][width][,][.precision][type]`。P77/P145 的 **`pctitem`**
早就认识 `-`/`0`/`+`/空格 标志、宽度、`.` 精度和 `d/f/s/r/c/x/X/o` 转换符，所以本轮的活主要是
**把 CPython 的写法翻译成 pctitem 的写法**：

* 新过程 **`fldspec %s %s`**（规格文本 + 值类型）逐位解析：`[[fill]align]`（对齐 `<>^=`，
  带填充字符的两字符形式也认）、`[sign]`（`+`/空格进 `pctitem`，`-` 与 `#` 跳过）、`[0]`、`[width]`
  （顺手跳过 `,`/`_` 分组符）、`[.precision]`、`[type]`；产出的 `fwbody`/`fwconv` 就是 `pctitem` 的
  两个入参。**零填充交给 `pctitem`**（它会把 0 插在符号之后，`'{:05d}'.format(-42)` = `-0042`），
  其余填充由新过程 **`flditem %s %s`** 收尾（算空格数、按 `L`/`R`/`C`/`E` 摆放）。
  **对齐默认值取决于值类型**（字符串左、数字右），这就是 `fldspec` 需要 `vt` 的原因。
  `E` 是 `=` 对齐（`'{:=5}'.format(-42)` = `-  42`）：先把开头的符号摘下来，填充完再放回去。
* `strfmt` 只在**第一个 `:`** 处把字段切成"名字/索引"与"规格"两段——所以 `'{a:>5}'` 的 `a` 是关键字名、
  `5` 不再污染显式索引。
* **f-string 也走同一套**：P77 的 `fstr` 把规格最后一位当转换符，现在改成用 `fz3 + fz4` 还原完整规格文本，
  交给 `flditem`（进出前后保存/恢复字段规格变量，免得参数里嵌的 f-string 冲掉外层规格）。
* **两个坑**：①**精度扫描多走一步**——`REPEATU(fwi > len, [if 是数字则追加; fwi++])` 会把转换符也吃掉
  （`.2f` 的 `f` 被跳过 ⇒ `fwconv` 为空 ⇒ 退回 `strval`，`'{a:.2f}'` 打出 `3.14159`）；
  要写成"当前字符不是数字就停"（与宽度扫描同一写法）。②**锚点撞车**——P150 在 `strfmt` 里加了第二个
  `or` 条件的循环（关键字查表），所以 P151 找字段扫描循环时必须再加一条"条件子树里有 `letter_of`"。

## 3. 实测

| 套件 | v4.77 | **v4.78** |
|---|---|---|
| `d229.json`（本轮新写 44 条：`.format` 规格 30 条 + f-string/`%` 回归 14 条） | 11/44 | **44/44** || `d227` 26 · `d228` 25 · `d226` 8 | — | **全绿** |
| 98 套快照 | — | **96 套逐例相同**；2 处差异 = `d229` 的 **33 条由红转绿** + `featprobe3` 的地址——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,254 块 errors=0 | **21,514 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.77 共 68 版全 MATCH | **v4.10…v4.78 共 69 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 19 个变量（`fwspec` `fwi` `fwfill` `fwaln` `fwsign` `fwzero` `fwwid` `fwprec` `fwconv` `fwbody`
`fwpad` `fwtext` `fwnp` `fwl` `fwr` `fwpl` `fwpr` `fwsg` `fwsave`）、2 个过程（`fldspec %s %s`、
`flditem %s %s`）。

## 4. 前后对比

```
print('{a:>5}'.format(a=1))      v4.77: （空行）      v4.78:     1
print('{a:8.3f}'.format(a=3.14159))  v4.77:  3.14159  v4.78:    3.142
print('{:*<6}'.format('ab'))     v4.77: （空行）      v4.78: ab****
n = 7
print(f'{n:>5}')                 v4.77: 7             v4.78:     7
print('{} {}'.format(1, 2))      不变：1 2
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'{a:%}'` 百分号、`'{a:b}'` 二进制、`'{a:g}'`/`'{a:G}'` 通用格式 | 不支持（`pctitem` 不认识这三个转换符，退回 `str()`，宽度/精度照旧生效）——注意 **`'{a:.2e}'`/`'{a:e}'`/`'{a:x}'`/`'{a:o}'` 本来就可用**（P145/P146 已给 `pctitem` 加了 `e`/`E`/`x`/`X`/`o`/`c`/`r`），本轮的规格解析只是把它们接通到 `.format`/f-string |
| `'{a:,}'.format(1234)` 千分位 | 分组符只是被跳过，不插分隔符（得到 `1234`） |
| `'{a!r}'` / `'{a!s}'`（`!` 转换） | 不支持：整段（含 `!r`）当字段名查 ⇒ `KeyError: 'a!r'` |
| `'{a.b}'` / `'{a[0]}'`（字段里的属性/下标） | 仍不支持（同 v4.77）：`'{a[0]}'` 因含数字被当成显式位置索引 |
| 嵌套规格 `'{:{w}}'.format(1, w=5)` | 不支持 |
| 少参数、显式索引越界、自动/显式编号混用 | 仍静默（同 v4.77，为不动既有快照而保留） |
| `'{a}'` 上给列表/字典套规格 | CPython 报 `TypeError: unsupported format string passed to list.__format__`，MiniPy 按 `str()` 填充 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.78.sb3
node _work/v41/run.mjs MiniPy_v4.78.sb3 _work/cmp47/d229.json  # 格式规格 44 条
node _work/v41/run.mjs MiniPy_v4.78.sb3 _work/cmp47/d227.json  # 关键字形式 26 条（v4.77）
node _work/v41/run.mjs MiniPy_v4.78.sb3 _work/cmp47/d228.json  # 收信者污染 25 条（v4.77）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.78.sb3 -tag v478 -ref v477
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v478 -ref v477
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.78.sb3 -tag v478
node _work/v41/check41.cjs MiniPy_v4.78.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.77 还原： $env:V41_SKIP='P151'; $env:V41_OUT='…/MiniPy_v4.77.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.79）候选

1. `'{a:.2e}'` / `%g` 这类**指数/通用格式**（`pctitem` 里补 `e`/`E`/`g`/`G`；`%e` 已经在 P146 做过，
   可以把那段搬进 `pctitem` 共用）
2. `'{a:.2%}'` 百分号类型与 `'{a:,}'` 千分位
3. `'{a!r}'` / `'{a!s}'` 转换
4. 字段里的属性/下标（`'{a.b}'` / `'{a[0]}'`）
5. 少参数 / 显式索引越界 / 自动-显式混用的报错文案
