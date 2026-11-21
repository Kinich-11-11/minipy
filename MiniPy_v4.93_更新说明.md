# MiniPy v4.93 更新说明

本轮把**内建 `print` 的星号解包**补上：`print(*xs)`（含 `sep=`/`end=`、与普通实参混排、多个解包、空解包、
字典按键、字符串按字符、类型错文案）。补丁 **P166**。

产物 `MiniPy_v4.93.sb3`：Interpreter 21,809 块，合计 **23,238**，`check41` errors=0；
84 个历史版本全部可复现（v4.10…v4.93 MATCH）。

## 1. 问题

v4.92 让**用户函数**调用支持了 `f(*xs)`，但 `print` 是**语句**（走 `printargs`，不经过 `calluser`），
所以 `print(*xs)` 仍是 `SyntaxError: missing expression`。

| 代码 | v4.92 | **v4.93**（= CPython） |
|---|---|---|
| `print(*[1, 2])` / `print(*xs)` | `SyntaxError: missing expression` | `1 2` |
| `print('x', *[1, 2], 'y')` | 同上 | `x 1 2 y` |
| `print(*[1, 2], sep='-')` / `end='!'` | 同上 | `1-2` / `1 2!` |
| `print(*'ab')` / `print(*(1, 2))` / `print(*{3, 1, 2})` | 同上 | 按字符 / 元组 / 集合展开 |
| `print(*{'a': 1, 'b': 2})` | 同上 | `a b`（按**键**） |
| `print(*[1], *[2], *[3])` | 同上 | `1 2 3` |
| `print(*[])` | 同上 | 只打印一个空行 |
| `print(*5)` | 同上 | `TypeError: print() argument after * must be an iterable, not int` |
| `print(1, 2)` / `print(x)` / `print()` / `sep`/`end` | 正常 | **不变** |

## 2. 做法

`printargs` 早就把实参按顶层逗号切成 `Comma`、逐片求值 `plo..phi` 并把渲染结果追加进 `printbuf`，
片段之间的分隔符判据是 `pi > 1`（"不是第一个实参"）。所以只加一支：

* 片段以 `*` 开头（且不是 `**`）时：求值 `plo+1..phi`，要求可迭代（字典取键、字符串取字符），
  然后**循环**把每个元素 `strval` 之后追加进 `printbuf`。**第一个元素沿用片段自己的 `pi > 1` 判据，
  其余元素一律加分隔符**——这样 `sep=` 与"第一个实参不加分隔"的既有行为完全不变。

## 3. 两个坑（第一个是"测试没红、快照红了"的典型）

1. **不要为"是否已经打印过"新造一个全局标志**。第一版把判据从 `pi > 1` 换成新变量 `pany`（"已经打印过东西"），
   单个 `print` 全对、`print(*xs)` 全对，但**嵌套打印**全错：
   ```
   def f():
       print('fin')
       return 1
   print(f())        # v4.92: "fin","1"    第一版 v4.93: "fin"," 1"（多了个空格）
   ```
   原因：`f()` 是用户调用，`calluser` 会 `fpush`/`fpop` 保存并恢复**打印状态**——里面就有
   `pi`/`plo`/`phi`/`printbuf`/`psep`/`pstart`…，所以内层 `print` 不会污染外层；而新造的 `pany`
   **不在那份名单里**，内层 `print` 把它置 1，外层第一段就误加了分隔符。
   **这一版快照直接报 `ref true = 19`（d182/d185/d186/t107/t107b/t115c/t123/func 共 19 条由绿转红）**，
   逐条看是 `" 1"` 这种多一个空格的形态，才定位到 `pany`。修法就是**别造新全局**：第一个元素复用
   `pi > 1`，其余元素无条件加分隔符（`pi` 是 `fpush` 名单里的，嵌套调用天然安全）。
2. **锚点又踩了积木名**：`printargs` 的参数循环是 `control_repeat` 且 `TIMES = len(Comma)`，
   但它的 opcode 是 **`data_lengthoflist`**（列表长度），不是字符串长度 `operator_length` ⇒ 锚点命中 0 个。

## 4. 实测

| 套件 | v4.92 | **v4.93** |
|---|---|---|
| `d245.json`（本轮新写 **30 条**：`print(*xs)` 的列表/元组/字符串/集合/字典/两个解包/空解包/表达式解包、
`sep=`/`end=`、与普通实参混排、嵌套列表元素、`None`/布尔/浮点、函数体内解包、类型错，以及
`print(1,2,3)`/`print(x)`/`print()`/`sep=''`/乘法幂运算不被误判等回归） | 8/30 | **30/30** |
| `d244` 30（调用点解包） | 29/30 | **29/30 → 本轮把 `print(*xs)` 那条修好**，余下只剩内建 `max(*xs)` |
| `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 | — | **全绿** |
| `d238` 26 · `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 ·
  `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **114 套：111 套逐例相同**；3 处差异 = `d245` 的 23 条 + `d244` 的 1 条由红转绿 +
  `featprobe3`（地址）⇒ **`ref true` 0，零回归**（第一版曾报 19，见 §3.1） |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 23,176 块 errors=0 | **23,238 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.92 共 83 版全 MATCH | **v4.10…v4.93 共 84 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 4 个变量（`pps` `ppst` `ppn` `ppi`），没有新增过程。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 其它内建的 `*` 解包 | `max(*xs)`/`min(*xs)`/`sum(*xs)` 等仍不支持（每个内建的实参是自己的钩子）；`max(*xs)` 那条留在 `d244` 里当标记 |
| 内建的 `**` 解包 | 不支持（CPython 里 `print(**d)` 也只在 `sep`/`end` 这种关键字上合法） |
| 方法调用的解包 `obj.m(*xs)` | 不支持（`callmeth` 那条路） |
| `print(*xs)` 元素是**自定义对象** | 走 `strval`，不查 `__str__`（普通实参那条有 `__str__` 检查） |
| `f(**d)` 的重复键检查 | 未做（CPython 报 `got multiple values for keyword argument`） |
| 视图的集合语义、字典大小比较、`{'a':1} == {'a':1.0}` | 同 v4.92 |
| 非 ASCII / TAB 制表位宽度 / 嵌套字段的属性下标与转换符 | 同前几版 |

## 6. 前后对比

```
print(*[1, 2])              v4.92: SyntaxError: missing expression   v4.93: 1 2
print('x', *[1, 2], 'y')    v4.92: SyntaxError                        v4.93: x 1 2 y
print(*[1, 2], sep='-')     v4.92: SyntaxError                        v4.93: 1-2
print(*{'a': 1, 'b': 2})    v4.92: SyntaxError                        v4.93: a b
print(*[])                  v4.92: SyntaxError                        v4.93: （空行）
print(1, 2, 3)              不变：1 2 3
def f(): print('fin'); return 1
print(f())                  不变：fin / 1（本轮第一版曾错成 " 1"）
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.93.sb3
node _work/v41/run.mjs MiniPy_v4.93.sb3 _work/cmp47/d245.json  # print(*xs) 30 条
node _work/v41/run.mjs MiniPy_v4.93.sb3 _work/cmp47/d244.json  # 调用点解包 30 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.93.sb3 -tag v493 -ref v492
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v493 -ref v492
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.93.sb3 -tag v493
node _work/v41/check41.cjs MiniPy_v4.93.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.92 还原： $env:V41_SKIP='P166'; $env:V41_OUT='…/MiniPy_v4.92.sb3'; $env:V41_STAMP='MiniPy v4.92 - built 2026-09-17'; node _work/v41/build41.js
```

## 8. 下一轮（v4.94）候选

1. 其它内建的 `*` 展开（`max`/`min`/`sum`/`sorted` 的单参数情形可等价改写为不带星号）
2. 方法调用的解包 `obj.m(*xs)`（`callmeth` 那条路）
3. `print(*xs)` 元素的自定义对象走 `__str__`
4. 视图的集合语义（`d.keys() == {'a'}`、`&`/`|`/`-`/`<`）
5. 字典的大小比较报 `TypeError`；`f(**d)` 的重复键检查
