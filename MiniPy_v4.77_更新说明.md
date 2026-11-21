# MiniPy v4.77 更新说明

本轮两件事，都在 `str.format` 这一条路上。补丁 **P150**。

1. **关键字形式**：`'{a}'.format(a=3)`、`'{a}={b}'.format(a=1, b=2)`（上一轮 v4.76 试过又撤回的那条）。
2. **顺手修好一个更老、更大的 bug**：`'{}'.format(a[1])` 这种**参数里带下标/方法调用**的写法，
   一直把**收信者**当成了参数值——`a[1]` 会打印出整个列表、`'ab'.upper()` 会打印 `ab`。
   v4.76 上这类写法 **25 条里只有 5 条对**，本轮全部修好。

产物 `MiniPy_v4.77.sb3`：Interpreter 19,825 块，合计 **21,254**，`check41` errors=0；
68 个历史版本全部可复现（v4.10…v4.77 MATCH）。

## 1. 问题

| 代码 | v4.76 | **v4.77**（= CPython） |
|---|---|---|
| `'{a}'.format(a=3)` | `SyntaxError: expression` | `3` |
| `'{a}={b}'.format(a=1, b=2)` | `SyntaxError: expression` | `1=2` |
| `'{} {a}'.format(1, a=2)` | `SyntaxError: expression` | `1 2` |
| `'{a}'.format(a=1, a=2)` | `SyntaxError: expression` | `SyntaxError: keyword argument repeated: a` |
| `'{}'.format(a[1])`（a 是列表） | 打印整个列表（原始编码） | `8` |
| `'{}'.format('ab'.upper())` | `ab` | `AB` |
| `'{} {}'.format(1, 2)` / `'{0} {1}'.format(3, 4)` | 正常 | **不变** |

## 2. 做法

P82 给 `format` 配了自己的一套实参扫描：按顶层逗号把 `(` 与 `)` 之间的片段切开，每片交给
`eval`，结果进 `FmtV`/`FmtT`；再由 `strfmt` 逐个替换 `{}`、`{2}`、`{{`、`}}`。

* **(a) 关键字**：新增过程 **`fmtarg`** 接替"每片各自 eval"。它先扫这片有没有顶层 `=`（`==`/`<=`/`>=`/`!=`
  在词法上就是**一个** token，所以只要判断 `tok == '='`），有就按 `名字 = 值` 处理：名字是 `=` 左边
  token 的拼接，值走 eval，名字进新列表 **`FmtK`**，重复名字报 CPython 的
  `SyntaxError: keyword argument repeated: <名字>`，**位置参数跟在关键字后面**报
  `SyntaxError: positional argument follows keyword argument`。
  位置参数照旧先进 `FmtV`/`FmtT`，关键字值排在它们后面，新变量 `fwpos` 记位置参数个数 ⇒
  关键字值的下标恒为 `fwpos + 它在关键字里的序号`，位置编号永远不会撞上关键字。
* **(b) `{名字}`**：`strfmt` 扫字段时把原始文本累加进 `fwname`，字段"没有数字但非空"就当名字，
  在 `FmtK` 里找，找不到报 `KeyError: 'a'`（CPython 同措辞）；找到就取
  `FmtV[fwpos + 序号]`。**具名字段不参与自动编号**，所以 `'{} {a}'.format(1, a=2)` 与
  `'{a} {}'.format(1, a=2)` 都对齐。
* **(c) 收信者**（顺手修的旧 bug）：P82 是**先把所有参数 eval 完**，最后才 `strfmt(xa)` —— 而 `xa`
  是全局量，`a[1]` 会经过 `indexget`（它的形参就叫 `xa`/`xb`）、`'ab'.upper()` 会经过 `methodcall`
  （重新给 `xa` 赋值），于是"格式串"变成了参数值。现在扫描一开始就 `fwrec = xa`，交给 `strfmt` 的是
  `fwrec`。**诊断过程**：给 `fmtarg` 临时塞 `log` 调试（`DBG-A flo=7 fhi=10 lo=a hi=]`、
  `DBG-C ... ev=8 t=N`）——`fmtarg` 拿到的值明明是对的，坏在它之后 ⇒ 锁定 `xa` 污染。

## 3. 实测

| 套件 | v4.76 | **v4.77** |
|---|---|---|
| `d227.json`（本轮新写 26 条：关键字形式 15 条 + 各种混合/转义/回归 + 4 条报错） | 10/26 | **26/26** |
| `d228.json`（本轮新写 25 条：收信者污染回归——下标/方法调用/内联字典/元组下标/关键字值走下标…） | 5/25 | **25/25** |
| `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 · `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d204` 14 · `d202` 24 · `d190` 46 · `d166` · `t107` 12 · `t133` 60 · `func` 31 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `demos` 12 · `tuple` 20 | — | **全绿** |
| 96 套快照 | — | **93 套逐例相同**；3 处差异 = `d228` 的 **20 条由红转绿**（本轮修的旧 bug）+ `t111h` 的 CPython 集合哈希序 + `featprobe3` 的地址——**零回归**（`d227` 是新套件、无 v4.76 基线；`t113` 那处上轮的集合序噪声本轮转为相同） |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,140 块 errors=0 | **21,254 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.76 共 67 版全 MATCH | **v4.10…v4.77 共 68 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 10 个变量（`fwpos` `fwseen` `fweq` `fwdep` `fwq` `fwk` `fwname` `fwidx` `fwj` `fwrec`）、
1 个列表（`FmtK`）、1 个过程（`fmtarg %s %s`）。

## 4. 前后对比

```
a = [9, 8]
print('{}'.format(a[1]))          v4.76: 原始列表编码      v4.77: 8
print('{}'.format('ab'.upper()))  v4.76: ab                v4.77: AB
print('{a}={b}'.format(a=1, b=2)) v4.76: SyntaxError       v4.77: 1=2
print('{} {a}'.format(1, a=2))    v4.76: SyntaxError       v4.77: 1 2
print('{} {}'.format(1, 2))       不变：1 2
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'{a:>5}'.format(a=1)` 之类的**格式规格** | 不支持：规格里的数字会被当字段文本/索引，整个替换被丢掉（`'{a:>5}'.format(a=1)` 输出空行、`'{} {a:>5}'.format(7, a=1)` 输出 `7 `，CPython 是 `7     1`）——本轮的具名解析只认"纯名字" |
| `'{a.b}'`（字段里的属性） | 不支持：整段当名字查 ⇒ `KeyError: 'a.b'`（CPython 是 `AttributeError: 'int' object has no attribute 'b'`） |
| `'{a[0]}'`（字段里的下标） | 不支持：字段里出现数字就被当成**显式位置索引** ⇒ `'{} {a[0]}'.format(7, a=[9])` 输出 `7 7`（CPython `7 9`） |
| `'{} {}'.format(1)` 少参数 | 静默少输出（输出 `1 `；CPython 报 `IndexError: Replacement index 1 out of range for positional args tuple`）——保持旧行为以免动到既有快照 |
| `'{} {0}'.format(7, 8)` 自动/手动混用 | 未报 CPython 的 `ValueError: cannot switch from automatic field numbering to manual field specification` |
| `'{0}'.format(a=1)` | 显式索引只数位置参数，越界静默（输出空；CPython 报 IndexError）——**边界已从 `len(FmtV)` 改成 `fwpos`**，所以不会再把关键字值当位置参数 0 |
| 参数里再嵌一层 `.format()` | `FmtV`/`FmtK` 是全局列表，嵌套调用会互相冲（本轮 26 条里的嵌套那条恰好对，但这是巧合，不算保证） |
| `%g`/`%G`、`dict(**d)`、`sum(d)` 报错文案 | 仍未做（见清单） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.77.sb3
node _work/v41/run.mjs MiniPy_v4.77.sb3 _work/cmp47/d227.json  # 关键字形式 26 条
node _work/v41/run.mjs MiniPy_v4.77.sb3 _work/cmp47/d228.json  # 收信者污染 25 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.77.sb3 -tag v477 -ref v476
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v477 -ref v476
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.77.sb3 -tag v477
node _work/v41/check41.cjs MiniPy_v4.77.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.76 还原： $env:V41_SKIP='P150'; $env:V41_OUT='…/MiniPy_v4.76.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.78）候选

1. `'{a:>5}'.format(a=1)` 与 `'{:>5}'.format(1)` 的**格式规格**（现在 `:>5` 会被当字段文本）
2. `'{a.b}'` / `'{a[0]}'` 字段里的属性/下标
3. 少参数/显式索引越界的 `IndexError` 文案（要先确认不影响既有快照）
4. `%g`/`%G`
5. `dict(**d)` 解包合并
