# MiniPy v4.81 更新说明

本轮补上 **`#` 备用形式前缀**（`'{a:#x}'`）与 **f-string 里的 `!r`/`!s` 转换**（`f'{x!r}'`），
并修掉一个会**给出错答案**的老 bug：`'{a:b}'.format(1.5)` 以前会把小数抹平当成整数打印 `1`。
补丁 **P154**。

产物 `MiniPy_v4.81.sb3`：Interpreter 20,533 块，合计 **21,962**，`check41` errors=0；
72 个历史版本全部可复现（v4.10…v4.81 MATCH）。

## 1. 问题

| 代码 | v4.80 | **v4.81**（= CPython） |
|---|---|---|
| `'{a:#x}'.format(a=255)` | `ff` | `0xff` |
| `'{a:#X}'.format(a=255)` | `FF` | `0XFF` |
| `'{a:#b}'.format(a=5)` | `101` | `0b101` |
| `'{a:#o}'.format(a=8)` | `10` | `0o10` |
| `'{a:#010x}'.format(a=255)` | `00000000ff` | `0x000000ff` |
| `'{a:#8x}\|'.format(a=255)` | `ff\|` | `    0xff\|` |
| `'%#x' % 255` | 报错 | `0xff` |
| `f'{x!r}'`（x = `'ab'`） | `SyntaxError: expression` | `'ab'` |
| `f'{n!r}'`（n = 12） | `SyntaxError` | `12` |
| `f'{x!r:>8}\|'` | `SyntaxError` | `    'ab'\|` |
| `f'{a != b}'` | 正常 | **不变**（`!=` 不是转换） |
| `'{a:b}'.format(a=1.5)` | `1`（**错答案**） | 报错 |
| `'{a:#x}'` 之外的既有能力 | 正常 | **不变** |

## 2. 做法

* **`#` 前缀**：前缀属于 `pctitem`（基数与数字表都在它手里），所以把 `#` 做成**又一个标志位**：
  `fldspec` 不再跳过它，而是记进新变量 `fwsharp`（`''` 或 `'#'`）并拼进 `fwbody`；`pctitem` 的
  标志循环容许表从 `-0+ ,_` 扩到 `-0+ ,_#`、命中时置 `p54h`；十六/八/二进制分支在最后拼 `ptx` 时
  先算前缀（`0x`/`0X`/`0o`/`0b`——**大小写必须用 `compareText` 判**，`EQ` 不区分大小写）。
  **零填充要插在前缀之后**（`'{:#010x}'` = `0x000000ff`），而宽度块只认开头的 `-`/`+`/空格，
  所以这一种情况在分支里自己补零、并把 `p15z` 清 0 让宽度块不插手。
  `%` 那边只要把 `#` 加进 `pctfmt` 的规格扫描容许集（`'%#x' % 255` = `0xff`）。
* **f-string 的 `!r`/`!s`**：字段文法与 `.format` 相同（`表达式 [ "!" 转换 ] [ ":" 规格 ]`），
  而 P77 的 `fstr` 只切 `:`，于是 `!r` 粘在表达式上去喂 `eval`。现在 `fstr` **在那次切分之前**先扫
  顶层 `!`（**跳过 `!=`**），把 `!conv` 从字段文本里剪掉、转换符存进 `fz9`；剪完的文本
  （`表达式 + 剩下的 :规格`）再交给原有的 `:` 切分，所以规格解析一行没改。
  交给 `flditem` 的规格构造成 `!conv[:spec]`——P153 的 `flditem` 本来就认这个形式，转换逻辑直接复用。
  另外**只有转换、没有规格**时必须也走 `flditem`（原来只有 `fz2 > 0` 才走），所以那个路由条件
  改成 `fz2 > 0 或 fz9 非空`。
* **顺手修错答案**：`'{a:b}'.format(1.5)` 以前通过"值是数字"的检查后把 1.5 抹成 1 打印 `1`；
  现在十六/八/二进制分支额外要求**值必须是整数**（`floor(v) == v`），否则报错。
  （报错文案仍是 `%` 那边的 `TypeError: %x format: an integer is required`——`pctitem` 分不清调用
  来自 `%` 还是 `.format`，CPython 这两处的措辞本来就不同，留作后续。）

## 3. 实测

| 套件 | v4.80 | **v4.81** |
|---|---|---|
| `d232.json`（本轮新写 **30 条**：`#` 前缀 8 条含零填充/宽度/大小写/`%#x`、f-string `!` 转换 9 条含带规格/表达式/列表/`!=` 反例，13 条既有能力回归） | 13/30 | **30/30** |
| `d231` 36 · `d230` 59 · `d229` 44 · `d227` 26 · `d228` 25 · `d226` 8 · `pct` 8 · `fstr` 8 · `str` 12 · `one` 10 | — | **全绿** |
| 快照 | — | **101 套：98 套逐例相同**；3 处差异 = `d232` 的 **17 条由红转绿** + `t113`（CPython 集合哈希序，差异在参考侧 `py:` 上）+ `featprobe3`（地址）——`ref false` 18 / `ref true` **0** ⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,857 块 errors=0 | **21,962 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.80 共 71 版全 MATCH | **v4.10…v4.81 共 72 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 8 个变量（`fz7` `fz8` `fz9` `fzbang` `fwsharp` `p54h` `p54p` `p54z`），没有新增过程。

**锚点坑**（这轮踩了两次）：①`fstr` 里找"带 `flditem` 的那个 if/else"时，`reach` 会连**外层**的
if/else 一起算进去（它不跳过 SUBSTACK），得到 2 个候选 ⇒ 改成按条件锚（`fz2 > 0` 的 `control_if_else`）；
②`pctitem` 里找十六进制分支时，按"条件里含字面量 `o`"去匹配又撞了别处 ⇒ 改成要求条件子树里
**同时**含 `o`/`X`/`x` 三个字面量。

## 4. 前后对比

```
print('{a:#x}'.format(a=255))     v4.80: ff            v4.81: 0xff
print('{a:#010x}'.format(a=255))  v4.80: 00000000ff    v4.81: 0x000000ff
x = 'ab'
print(f'{x!r}')                   v4.80: SyntaxError   v4.81: 'ab'
print(f'{x!r:>8}|')               v4.80: SyntaxError   v4.81:     'ab'|
print('{a:b}'.format(a=1.5))      v4.80: 1（错）       v4.81: 报错
print('{a:,}'.format(a=1234567))  不变：1,234,567
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'{a.b}'` / `'{a[0]}'`（字段里的属性/下标） | 仍不支持：`'{a.n}'` 报 `KeyError: 'a.n'`（CPython `7`）、`'{a[1]}'`/`'{0[1]}'` 输出空行 |
| 类型不匹配的**文案** | `'{a:b}'.format(1.5)` 报 `TypeError: %x format: an integer is required`（CPython 是 `ValueError: Unknown format code 'b' for object of type 'float'`）——已经**不再给错答案** |
| 嵌套规格 `'{:{w}}'` | 不支持 |
| 少参数、显式索引越界、自动/显式编号混用 | 仍静默（为不动既有快照而保留） |
| `'{a!a}'` 的 ascii 语义 | 按 `repr` 处理（MiniPy 没有 `ascii()`） |
| 参数里再嵌一层 `.format()` | `FmtV`/`FmtK` 是全局列表，嵌套会互冲 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.81.sb3
node _work/v41/run.mjs MiniPy_v4.81.sb3 _work/cmp47/d232.json  # # 前缀 + f-string ! 转换 30 条
node _work/v41/run.mjs MiniPy_v4.81.sb3 _work/cmp47/d231.json  # !r/!s + 千分位 36 条（v4.80）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.81.sb3 -tag v481 -ref v480
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v481 -ref v480
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.81.sb3 -tag v481
node _work/v41/check41.cjs MiniPy_v4.81.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.80 还原： $env:V41_SKIP='P154'; $env:V41_OUT='…/MiniPy_v4.80.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.82）候选

1. `'{a.b}'` / `'{a[0]}'` / `'{0[1]}'` 字段里的属性与下标
2. 类型不匹配的 `ValueError: Unknown format code …` 文案（要让 `pctitem` 知道调用来自哪条路）
3. 少参数 / 显式索引越界 / 自动-显式混用的报错文案
4. 嵌套规格 `'{:{w}}'`
5. `'{a!a}'` 的真 ascii 语义（非 ASCII 字符转 `\uXXXX`）
