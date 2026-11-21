# MiniPy v4.71 更新说明

本轮补上第三类**类型构造器**：`dict(x)`——从键值对序列建字典（也能复制已有的字典）。补丁 **P144**。

产物 `MiniPy_v4.71.sb3`：Interpreter 18,808 块，合计 **20,237**，`check41` errors=0；
62 个历史版本全部可复现（v4.10…v4.71 MATCH）。

## 1. 问题：`dict(x)` 没有实现

| 代码 | v4.70 | **v4.71**（= CPython） |
|---|---|---|
| `dict([(1, 2), (3, 4)])` | `NameError: name 'dict' is not defined` | `{1: 2, 3: 4}` |
| `dict([[1, 2]])` | 同上 | `{1: 2}` |
| `dict(((1, 2), (3, 4)))` | 同上 | `{1: 2, 3: 4}` |
| `dict([(1, 2), (3, 4), (1, 5)])` | 同上 | `{1: 5, 3: 4}`（重复键：**位置取首次、值取最后一次**） |
| `a = {1: 2}; b = dict(a)` | 同上 | 复制（改 `b` 不影响 `a`） |
| `dict([('a', 1)])` / `dict([((1, 2), 'x')])` | 同上 | 字符串键、元组键都可查 |
| `dict(1)` | 同上 | `TypeError: 'int' object is not iterable` |
| `dict([1])` | 同上 | `TypeError: object is not iterable`（CPython 就是这句裸消息） |
| `dict([(1, 2, 3)])` | 同上 | `ValueError: dictionary update sequence element #0 has length 3; 2 is required` |
| `dict()` | `{}` | **不变**（v4.69 的 `zeroarg` 已管零参形式） |

`callfn` 有 `list`/`set`/`str`/`int`/`float`/`bool`/`tuple` 的分支，唯独没有 `dict`；零参形式能work只是因为
`zeroarg` 自己回答了它。

## 2. 做法

记录编码沿用字典代码本来的格式（见 `indexset` 的 `D` 分支与 `dictpair`）：
每条记录是 `lsep + <键类型> + 转义键 + lsep + <值类型> + 转义值`。

直接往字符串上追加会把**重复键的两条记录都留下**，所以先把键值对收进四个平行列表
（`DgK`/`DgE`/`DgV`/`DgW` = 键类型/转义键/值类型/转义值），在那里折叠：

* 已存在的键 → **原地换值**（`replaceitemoflist`），位置保持首次出现的顺序；
* 新键 → 追加。

最后按顺序拼出整串。这样 `dict([(1, 2), (3, 4), (1, 5)])` 既是 `{1: 5, 3: 4}`（CPython 的输出）、
`len` 也是 2。

参数处理：`D` ⇒ 复制（`pending = 1`，值原样返回）；`L`/`T`/`G`/`E` ⇒ 逐元素取键值；
`S` ⇒ 先 `charsplit` 成字符列表（于是 `dict('ab')` 落到"元素长度 1"的 ValueError，和 CPython 一致）；
其余 ⇒ `TypeError: '<类型>' object is not iterable`（类型名走 P134 的 `tname`）。

**又踩了同一个坑**：`IF(cond, [...])` 只有**两个**参数。我在这里写了两处
`IF(cond, [then], [else])`，第三段被静默丢弃——症状是 `dict(a)`（`a` 是字典）和 `dict(1)` 既没复制也没报
`TypeError`，而是掉到 `callfn` 末尾变成 `NameError: name 'dict' is not defined`。改成 `IFELSE` 就好了。
（上一轮刚写过这条，这轮又踩——已把这条单独记进 README 的"每轮必查"。）

## 3. 实测

| 套件 | v4.70 | **v4.71** |
|---|---|---|
| `d220.json`（本轮新写 20 条：列表/元组/生成器/字典/字符串源、字符串键与元组键、重复键、`get`、遍历、与内建字典互操作、以及三条报错） | — | **20/20** |
| `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `d204` 14 · `d202` 24 · `t133` 60 · `func` 31 · `str` 12 · `cont` 12 · `one` 10 · `pan` 7 · `b2` 13 · `demos` 12 · `t123` 29 · `d187` 10 · `d189` 14 · `d159` 5 · `d191` 8 · `d192` 6 · `d200` 8 · `d201` 15 · `t144` 16 · `tuple` 20 · `dict` 9/10（既存） | — | **全绿/不变** |
| 94 套快照 | — | **93 套逐例相同**，唯一差异是 featprobe3 的内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.70 相同） |
| `check41.cjs` | 19,991 块 errors=0 | **20,237 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.70 共 61 版全 MATCH | **v4.10…v4.71 共 62 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 13 个变量、4 个列表（`DgK` `DgE` `DgV` `DgW`），没有新增过程。

## 4. 前后对比

```
print(dict([(1, 2), (3, 4)]), dict([(1, 2), (3, 4), (1, 5)]))
        v4.70: NameError ×2        => {1: 2, 3: 4} {1: 5, 3: 4}

a = {1: 2}
b = dict(a)
b[3] = 4
print(a, b)                        v4.70: NameError   => {1: 2} {1: 2, 3: 4}

try:    dict([(1, 2, 3)])
except ValueError as e: print(e)   => dictionary update sequence element #0 has length 3; 2 is required
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `dict(a=1, b=2)`（关键字实参形式） | MiniPy 的关键字实参只给用户函数用；内建构造器的 `k=v` 形式仍未支持 |
| `dict` 作为**类**用（`isinstance(x, dict)` 已可用，`dict.fromkeys` 之类没有） | 不支持 |
| `print(range(3))` 打印 `[0, 1, 2]`（立即求值扩展） | 与 `zip()`/`enumerate()` 同类，不进套件 |
| `try/finally` 的三项既存问题（`t107` T3/T7/T11）、`%` 的字符串格式化边界、`except (NameError, NoSuchError)` 的子句优先级 | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.71.sb3
node _work/v41/run.mjs MiniPy_v4.71.sb3 _work/cmp47/d220.json  # dict(x) 20 条
node _work/v41/run.mjs MiniPy_v4.71.sb3 _work/cmp47/d218.json  # tuple/range 21 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.71.sb3 -tag v471 -ref v470
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v471 -ref v470
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.71.sb3 -tag v471
node _work/v41/check41.cjs MiniPy_v4.71.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.70 还原： $env:V41_SKIP='P144'; $env:V41_OUT='…/MiniPy_v4.70.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.72）候选，按清单顺序

1. `dict(a=1, b=2)` 关键字实参形式（内建构造器收 `k=v`）
2. `try/finally` 的 T3/T7/T11（异常路径要重抛、`finally` 里再抛、`finally` 空块报错）
3. `%` 的字符串格式化边界
4. `except (NameError, NoSuchError)` 这类子句的 NameError 优先级
