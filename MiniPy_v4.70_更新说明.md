# MiniPy v4.70 更新说明

本轮把**类型构造器**补成真正的表达式：`tuple(x)` 与 `range(...)`（于是 `list(range(3))`、
`sum(range(4))` 也能用了）。补丁 **P143**。

产物 `MiniPy_v4.70.sb3`：Interpreter 18,562 块，合计 **19,991**，`check41` errors=0；
61 个历史版本全部可复现（v4.10…v4.70 MATCH）。

## 1. 问题：两个构造器只能在特定位置用

| 代码 | v4.69 | **v4.70**（= CPython） |
|---|---|---|
| `tuple([1, 2])` / `tuple((1, 2))` | `NameError: name 'tuple' is not defined` | `(1, 2)`（类型 `tuple`） |
| `tuple('ab')` | 同上 | `('a', 'b')` |
| `tuple(1)` | 同上 | `TypeError: 'int' object is not iterable` |
| `range(3)` 当表达式 | `NameError: name 'range' is not defined` | 立即求值成 `[0, 1, 2]` |
| `list(range(3))` / `sum(range(4))` | 同上 | `[0, 1, 2]` / `6` |
| `list(range(3, 0, -1))` | 同上 | `[3, 2, 1]` |
| `list(range(1, 2, 0))` | `ValueError: range step is zero` | `ValueError: range() arg 3 must not be zero` |
| `list(1)` / `set(1)` | `TypeError: list() requires an iterable` | `TypeError: 'int' object is not iterable` |
| `for i in range(...)` / `[x for x in range(...)]` | 正常 | **不变** |

`callfn` 里有 `list`/`set`/`str`/`int`/`float`/`bool` 的分支，却没有 `tuple`；而 `range` 一直只作为
`for` 的直接来源（或推导式的 `crng`）存在，表达式位置上没人认它。

## 2. 做法

* **`tuple(x)`**：元组和列表本来就是同一套编码（P140），所以这就是 `list` 分支换个标签。字符串要先按
  字符切成列表——这段抽成新过程 **`charsplit`**（`list('ab')` 的内联代码保持原样，不动它）。
  非可迭代对象按 CPython 报 `TypeError: '<类型>' object is not iterable`（类型名走 P134 的 `tname`）。
* **`range(...)`**：先调 **`crng`**（P125 给推导式写的助手）把 1/2/3 个实参算成 `cv`/`cstop`/`cstep`，
  再在这里按 `step` 的正负号把区间物化成列表（元素编码 `lsep + 'N' + lesc(值)`）。**`crng` 自己已经拦了
  `step == 0`**，所以那条守卫只是兜底；顺手把这句消息对齐 CPython（`execute` 的 `for` 路径与 `crng`
  共 4 处）。
* `list`/`set` 的 "requires an iterable" 也一并对齐成 `'<类型>' object is not iterable`。
* 一个必须记住的坑：**`IF(cond, [...])` 只有两个参数**。我给 `tuple` 分支写成了
  `IF(cond, [then], [else])`，第三段被**静默丢弃**——症状是 `tuple('ab')` 原样返回字符串
  （`type()` 说 `str`）。改用 `IFELSE(cond, then, else)` 即可（这条在 P10 的注释里就写过，仍然踩了）。

## 3. 实测

| 套件 | v4.69 | **v4.70** |
|---|---|---|
| `d218.json`（本轮新写 21 条：`tuple` 的列表/元组/字符串/集合/比较/取元素、`range` 的 1·2·3 参与负步长与空区间与变量参数、`for`/推导式里的 `range` 仍可用、切片、以及 `range` 步长 0 / 浮点参数 / `tuple(1)` 三条报错） | — | **21/21** |
| `d217` 24 · `d206` 37 · `d190` 46 · `d204` 14 · `d202` 24 · `t133` 60 · `func` 31 · `str` 12 · `cont` 12 · `one` 10 · `pan` 7 · `b2` 13 · `demos` 12 · `t123` 29 · `d187` 10 · `d189` 14 · `d159` 5 · `d191` 8 · `d192` 6 · `d200` 8 · `d201` 15 · `t144` 16 · `tuple` 20 | — | **全绿** |
| 94 套快照 | — | **93 套逐例相同**，唯一差异是 featprobe3 的内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.69 相同） |
| `check41.cjs` | 19,844 块 errors=0 | **19,991 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.69 共 60 版全 MATCH | **v4.10…v4.70 共 61 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 2 个变量（`xArng` `xAcur`）、1 个过程（`charsplit`）。

## 4. 前后对比

```
print(tuple([1, 2]), tuple('ab'), len(tuple('ab')))
        v4.69: NameError ×2        => (1, 2) ('a', 'b') 2

print(list(range(3)), sum(range(4)), list(range(3, 0, -1)))
        v4.69: NameError           => [0, 1, 2] 6 [3, 2, 1]

for i in range(3): print(i)        不变（走的是 for 自己的快路径）
```

**注**：`print(range(3))` 在 CPython 里打印 `range(0, 3)`，MiniPy 打印 `[0, 1, 2]`——与 `zip()`/
`enumerate()` 一样是"立即求值"的既定扩展，不进套件。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `dict(x)`（从键值对序列建字典） | 仍报 `NameError`（`dict()` 的零参形式在 v4.69 已可用） |
| `print(range(n))` 的形状 | 打印 `[0, 1, …]` 而非 `range(0, n)`（立即求值扩展） |
| `range` 的非整数参数 | 报 `TypeError`（浮点/字符串）；CPython 的措辞已对齐 |
| `try/finally` 的三项既存问题（`t107` T3/T7/T11）、`%` 的字符串格式化边界 | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.70.sb3
node _work/v41/run.mjs MiniPy_v4.70.sb3 _work/cmp47/d218.json  # tuple/range 21 条
node _work/v41/run.mjs MiniPy_v4.70.sb3 _work/cmp47/d217.json  # 零实参调用 24 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.70.sb3 -tag v470 -ref v469
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v470 -ref v469
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.70.sb3 -tag v470
node _work/v41/check41.cjs MiniPy_v4.70.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.69 还原： $env:V41_SKIP='P143'; $env:V41_OUT='…/MiniPy_v4.69.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.71）候选，按清单顺序

1. `dict(x)`：从 `[(k, v), …]`（以及已有的字典）建字典，重复键保留最后一个
2. `try/finally` 的 T3/T7/T11（异常路径要重抛、`finally` 里再抛、`finally` 空块报错）
3. `%` 的字符串格式化边界
4. `except (NameError, NoSuchError)` 这类子句的 NameError 优先级
