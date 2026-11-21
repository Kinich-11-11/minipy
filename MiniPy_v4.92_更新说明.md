# MiniPy v4.92 更新说明

本轮做**调用点解包**：`f(*xs)` 与 `f(**d)`（用户函数，含与普通实参/关键字混用、元组/字符串/集合/生成器/
字典解包、嵌套调用与递归里的解包）。补丁 **P165**。

产物 `MiniPy_v4.92.sb3`：Interpreter 21,747 块，合计 **23,176**，`check41` errors=0；
83 个历史版本全部可复现（v4.10…v4.92 MATCH）。

## 1. 问题

调用实参以前只认 `name=value`（P100）或一个表达式，`*`/`**` 打头的片段被整段交给 `eval`，
一律报 `SyntaxError: missing expression`（字典字面量那种还会先报 `SyntaxError: parentheses`）。

| 代码 | v4.91 | **v4.92**（= CPython） |
|---|---|---|
| `f(*[1, 2])` / `f(*xs)` / `f(*'xy')` / `f(*(3, 4))` / `f(*{1, 2})` / `f(*(x for x in …))` | `SyntaxError: missing expression` | 正常 |
| `f(**d)` / `f(**{'a': 1, 'b': 2})` | 同上 | 正常 |
| `f(1, *[2], **{'c': 3})`、`f(*xs, **d)`、`f(1, **{'b': 2})` | 同上（`**{` 那条报 `parentheses`） | 正常 |
| `f(c=1, *[9, 8])`（关键字在前） | 同上 | `a - b - c` 按 CPython 绑定 |
| `f(*d)`（`d` 是字典） | 同上 | 按**键**展开（CPython 的迭代语义） |
| `f(**(1,))` / `f(*5)` / `f(**{1: 2})` | 语法错 | `TypeError: f() argument after ** must be a mapping, not tuple` / `… after * must be an iterable, not int` / `TypeError: keywords must be strings` |
| `dict(**d)`（内建） | 正常 | **不变** |
| `print(*xs)` / `max(*xs)`（内建） | `SyntaxError: missing expression` | **仍不支持**（见 §5） |

## 2. 做法

`calluser` 早就把实参片段按顶层逗号切开（`UComma`）、逐片求值进 `UArgV`/`UArgT`、并用 `UArgN` 记
"位置参数（`''`）/关键字名（`'#'` 表示已用）"。所以主体工作只是给那个片段分派再加一层：

1. **片段分派**：`name = value`（P100 的关键字分支）→ 不变；`**expr` → 求值后**必须是字典**，
   把每个键/值作为**关键字**参数追加（键不是字符串报 `TypeError: keywords must be strings`）；
   `*expr` → 求值后**必须是可迭代**（字典取键、字符串取字符），把每个元素作为**位置**参数追加。
   其余情况走原来的表达式分支。
2. **把 P14 那两句"片段收集"搬进各分支**：P14 在原分派**之后**还有 `addTo UArgV` / `addTo UArgT`，
   一次只收一个值；解包要收一串 ⇒ 这两句移进"关键字分支"和"位置分支"，解包分支自己循环追加。
3. **逗号扫描补 `{`/`}`**：`calluser` 的深度扫描只数了 `(`/`[`，于是 `f(1, **{'b': 2})` 被从字典内部的逗号切开、
   `eval` 拿到半个 `{` 报 `SyntaxError: parentheses`。
4. **无逗号的调用要在 `eval` 里改道**：`f(**d)` 没有顶层逗号，`eval` 的"单实参"快路会先把实参整段求值，
   `calluser` 根本收不到片段。于是在 `eval` **函数体最前面**加一个钩子：形如 `名字 ( * …` / `名字 ( ** …`
   **且该名字确实是用户函数**（在 `FnName` 里查过）时，把原始 token 段交给 `calluser` 并
   `fnlimit -= 1` 收尾。检查名字这一步是必要的——否则 `dict(**d)`（P157 的内建路径）也会被抢走。

## 3. 五个坑

1. **"片段收集"的两句在分派之后**：第一版忘了搬，解包把元素都追加了一遍，循环末尾的
   `addTo UArgV/UArgT` 又把**最后求出的那个值**追加一次 ⇒ `f(a, b=9)` 传 `*[1]` 得到的 `b` 是 `1`
   （`a+b=2`），`f(*[])` 还会凭空多一个空参数。**记住 P14 的循环体是"分派 + 两句追加"。**
2. **`**` 在这里是"一个 token"**：`z = g(**d)` 的 token 是 `z | = | g | ( | ** | d | )`，
   所以表达式从 `fplo+1` 开始。第一版照 P157 的注释（`**` 是单个 token——但那条讲的是幂运算的写法）
   硬写成 `fplo+2`，取到的是 `d` 之后的位置 ⇒ `SyntaxError: missing expression`；
   而 `**{'a': 1}` 那种又取成 `'a' : 1 }` ⇒ `parentheses`。**正解：形状判据同时接受"一个 `**`"和"两个 `*`"，
   求值起点用 `IFELSE(Tok[fplo] == '**', fplo+1, fplo+2)` 现算。**
3. **`dictkeys` 把结果写进 `ev`**，不是写回参数 ⇒ `f(*d)` 必须先 `spsrc = ev` 再当列表用
   （否则拿字典当列表、报 `too many arguments`）。
4. **无逗号的调用到不了片段循环**（见 §2.4）；而且改道钩子必须核对 `FnName`，否则会抢走内建。
5. **反复踩自己的小坑**：`BL()[id].next` 给的是**下一个积木的 id（字符串）**，不是积木对象
   （第一版 `tailV.opcode` 是 `undefined`，改完又写成 `BL()[tailV].next = null`）。

## 4. 实测

| 套件 | v4.91 | **v4.92** |
|---|---|---|
| `d244.json`（本轮新写 **30 条**：`*`/`**` 单用与混用、元组/字符串/集合/生成器/字典解包、空解包、
关键字与解包混排、默认值配合、嵌套调用与递归里的解包、类方法解包、`*`/`**` 的类型错与"关键字必须是字符串"、
以及"乘法/幂运算不被误判"的回归） | 8/30 | **28/30**（余下 `B27`/`B28` 是**内建** `print(*xs)`/`max(*xs)`，见 §5） |
| `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 | — | **全绿** |
| `d238` 26 · `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 ·
  `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **113 套：109 套逐例相同**；4 处差异 = `d244` 的 25 条由红转绿 +
  `t111h`/`t113`（CPython 集合迭代顺序每次跑都不同）与 `featprobe3`（地址）两处噪声。
  本轮 `ref true` 计数为 **1**，就是 `t113` 的 F6——**已逐例核对：MiniPy 自己的输出与 v4.91 完全一致**
  （只有 `ms` 不同），翻的是 CPython 那一侧，属已记录噪声，**不是回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 23,015 块 errors=0 | **23,176 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.91 共 82 版全 MATCH | **v4.10…v4.92 共 83 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 7 个变量（`spsrc` `spsrct` `spn` `spi` `spfn` `spfound` `sps`），没有新增过程。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| **内建**的 `*`/`**` 解包 | `print(*xs)`、`max(*xs)` 等还不支持（每个内建的实参是自己的钩子，没有统一入口）——**下一轮首选 `print`** |
| 方法调用的解包 `obj.m(*xs)` | 不支持（走 `callmeth` 那条路） |
| `f(**d)` 重复键 / `f(a=1, **{'a': 2})` | 未做 CPython 的 `got multiple values for keyword argument 'a'` 检查 |
| `f(*xs)` 后接关键字再位置参数的混排告警 | 未做（CPython 3.x 报 `positional argument follows keyword argument`） |
| 视图的集合语义、字典的大小比较、`{'a':1} == {'a':1.0}` | 同 v4.91 |
| 非 ASCII / TAB 制表位宽度 / 嵌套字段的属性下标与转换符 | 同前几版 |

## 6. 前后对比

```
def f(a, b): return a + b
f(*[1, 2])                v4.91: SyntaxError: missing expression   v4.92: 3
f(**{'a': 1, 'b': 2})     v4.91: SyntaxError: missing expression   v4.92: 3
f(1, *[2], **{'c': 3})    v4.91: SyntaxError: parentheses          v4.92: 6
f(*(x for x in [1, 2]))   v4.91: SyntaxError                        v4.92: 3
f(*{'x': 1, 'y': 2})      v4.91: SyntaxError                        v4.92: 'xy'
f(*5)                     v4.91: SyntaxError                        v4.92: TypeError: f() argument after * must be an iterable, not int
dict(**{'a': 1})          不变：{'a': 1}
f(a * b, 1)               不变：不误判为解包
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.92.sb3
node _work/v41/run.mjs MiniPy_v4.92.sb3 _work/cmp47/d244.json  # 调用点解包 30 条
node _work/v41/run.mjs MiniPy_v4.92.sb3 _work/cmp47/d243.json  # 关键字语句与增强赋值 40 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.92.sb3 -tag v492 -ref v491
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v492 -ref v491
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.92.sb3 -tag v492
node _work/v41/check41.cjs MiniPy_v4.92.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.91 还原： $env:V41_SKIP='P165'; $env:V41_OUT='…/MiniPy_v4.91.sb3'; $env:V41_STAMP='MiniPy v4.91 - built 2026-09-17'; node _work/v41/build41.js
```

## 8. 下一轮（v4.93）候选

1. **内建 `print(*xs)`**（以及 `max`/`min`/`sum` 等的 `*` 展开）——`print` 走 `printargs`，要在它的片段循环里加解包
2. 方法调用的解包 `obj.m(*xs)`（`callmeth` 那条路）
3. `f(**d)` 的重复键检查（`got multiple values for keyword argument`）
4. 视图的集合语义（`d.keys() == {'a'}`、`&`/`|`/`-`/`<`）
5. 字典的大小比较报 `TypeError`
