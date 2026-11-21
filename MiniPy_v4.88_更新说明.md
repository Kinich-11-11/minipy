# MiniPy v4.88 更新说明

本轮做 **`%c`**：收"一个字符的字符串"（`'%c' % 'a'` → `a`），并把类型错文案对齐 CPython
（`TypeError: %c requires an int or a unicode character, not str`）。补丁 **P161**。

产物 `MiniPy_v4.88.sb3`：Interpreter 21,035 块，合计 **22,464**，`check41` errors=0；
79 个历史版本全部可复现（v4.10…v4.88 MATCH）。

## 1. 问题

`%c` 在 CPython 里收**整数**（当码位）**或"一个字符的字符串"**，MiniPy 只收整数，而且报错文案
是自造的 `%c requires int or char`（还把 `[1]` 这种实参也说成 "int or char"）。另外这条分支是
`%`、f-string、`.format` **共用**的，改的时候要当心各自该有的行为。

| 代码 | v4.87 | **v4.88**（= CPython） |
|---|---|---|
| `'%c' % 'a'` | `ValueError: %c requires int or char` | `a` |
| `'%c' % 65` | `A` | `A`（不变） |
| `'%c' % 'ab'` | `ValueError: %c requires int or char` | `TypeError: %c requires an int or a unicode character, not str` |
| `'%c' % 1.5` | `ValueError: %c requires int or char` | `TypeError: %c requires an int or a unicode character, not float` |
| `'%c' % [1]` | `ValueError: %c requires int or char` | `TypeError: %c requires an int or a unicode character, not list` |
| `'{:c}'.format(65)` | `A` | `A`（**不变**，格式侧本来就有 `c`） |
| `'{:c}'.format('a')` | `ValueError: Unknown format code 'c' for object of type 'str'` | **不变** |
| `'%5c' % 'a'` / `'%-5c' % 'a'` | 报错 / 报错 | `    a` / `a    ` |
| `'%c' % 300` | 报错（ASCII 模型） | 仍报错（ASCII 模型，见 §5） |

## 2. 做法

1. **类型错文案**（P156 那个 `pcsrc` 包装器的"百分号侧"分支）：换成
   `fail('TypeError: %c requires an int or a unicode character, not ' + tname(vt))`——
   `tname`（P144）本来就按类型标记给 CPython 类型名，于是 `str`/`float`/`list`/`dict`/`NoneType`
   全自动正确。做法上仍是"找到 SUBSTACK2 能到达那句 `fail %s` 的 `control_if_else`"再整体换掉它的
   `SUBSTACK2`，`SUBSTACK1`（格式侧措辞）一字不动。
2. **一字符字符串直接透传**：`%c` 分支（`control_if`，条件是 `conv == 'c'`）的**前三条语句**
   包进 `IFELSE`：成立就把 `ptx = vv`（`vv` 就是已求值的实参、`vt` 是它的类型标记），
   不成立再走原来的三条（整数码位检查、取字符、拼宽度）。

## 3. 两个坑（第二个差点变成回归）

1. **`conv` 是自定义积木的实参，不是变量**：找 `%c` 分支时按"条件里的 OPERAND1 是变量 `conv`"去找，
   命中 **0** 个。它的引用是 `argument_reporter_string_number` 积木（`fields.VALUE[0] === 'conv'`）。
2. **`%c` 分支是 `%` 与 `.format` 共用的**（两者只差 P156 的 `pcsrc` 标志：1 = 格式、0 = 百分号）。
   加宽条件一开始只写了 `vt == 'S' 且 len(vv) == 1`，于是 `'{:c}'.format('a')`
   **从"报错"变成静默打印 `a`**——这是回归。快照的 105 套里没有这条（它只在 featprobe 之外的
   格式套件里被间接覆盖），是**新写的 `d239` 用例 c20 抓到的**：拿 v4.87 单跑同三条探针
   （`'{:c}'.format('a')` 报错 ✓、`'{:q}'.format('a')` 打印 `a`、`'{:c}'.format(65)` → `A`）
   才定位到分支共用。修法是在条件最外层加 **`pcsrc == 0`**。
   **教训：共用分支上加行为，先问"还有谁走这里"。**

## 4. 实测

| 套件 | v4.87 | **v4.88** |
|---|---|---|
| `d239.json`（本轮新写 **31 条**：单字符字符串/变量/转义/表达式取值、整数、多字符与空串报错、
  float/list/dict/None 类型错、`%c%c`、宽度与左对齐、`.format` 与 f-string 的 `c` 不受影响、循环/函数里用） | 15/31 | **31/31** |
| `d238` 26 · `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 ·
  `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **107 套：105 套逐例相同**；2 处差异全是**噪声**——`t113` 的 F6（`for x in {'a','b'}` 的
  CPython 集合顺序每次跑都不同，这轮反而由 `same=false` 翻成 `true`）与 `featprobe3` 的
  `enumerate`/`zip` 地址 ⇒ **`ref true` 0，零回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 22,447 块 errors=0 | **22,464 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.87 共 78 版全 MATCH | **v4.10…v4.88 共 79 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

**没有新增变量、没有新增过程**（P161 只重排既有语句）。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `%c` 的**取值上界** | CPython 到 `0x110000`；MiniPy 的字符集是造型表（可打印 ASCII 32..126），`'%c' % 300` 报 `ValueError: %c arg not in range(32, 127)` |
| `'%c' % True` | CPython 是 `chr(1)`（bool 是 int 子类）；MiniPy 按 bool 报类型错，`'%c' % (True + 64)` → `A` 可用 |
| 嵌套字段的属性/下标与转换符 | 同 v4.87（`'{:{a.w}}'`、`'{:{w!r}}'` 不支持） |
| 嵌套字段与自动/显式编号混用 | 同 v4.87（比 CPython 宽松） |
| TAB 制表位宽度 / `TabError` / 缩进一致性 | 同 v4.86–v4.85 |
| 非 ASCII | ASCII 字符串模型 |
| `dict(映射, 关键字)` 记录顺序 / dict `==` 顺序敏感 / `f(**d)` | 同 v4.84 |

## 6. 前后对比

```
print('%c' % 'a')                      v4.87: ValueError  v4.88: a
print('%c' % 65)                       不变：A
print('%5c' % 'a')                     v4.87: ValueError  v4.88:     a
print('%c' % 'ab')                     v4.87: ValueError: %c requires int or char
                                       v4.88: TypeError: %c requires an int or a unicode character, not str
print('{:c}'.format('a'))              不变：ValueError: Unknown format code 'c' for object of type 'str'
print('{:c}'.format(65))               不变：A
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.88.sb3
node _work/v41/run.mjs MiniPy_v4.88.sb3 _work/cmp47/d239.json  # `%c` 31 条
node _work/v41/run.mjs MiniPy_v4.88.sb3 _work/cmp47/d238.json  # 嵌套规格 26 条（v4.87）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.88.sb3 -tag v488 -ref v487
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v488 -ref v487
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.88.sb3 -tag v488
node _work/v41/check41.cjs MiniPy_v4.88.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.87 还原： $env:V41_SKIP='P161'; $env:V41_OUT='…/MiniPy_v4.87.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.89）候选

1. `dict(映射, 关键字)` 的记录顺序（要同时保持"关键字值优先"）
2. dict 的 `==` 顺序敏感 / 重复键没合并（`{'a':1,'a':2}`、`dict({'a':1},a=2)`）
3. `f(**d)`（用户函数与内建的关键字解包）
4. 嵌套字段的属性/下标与转换符、与编号模式的互相校验
5. TAB 制表位宽度（8）与 `TabError`
