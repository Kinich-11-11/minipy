# MiniPy v4.122 更新说明

本轮补 **布尔值在位运算与一元运算里的三个缺口**（都是"检查写在被检查的东西长大之前"）。补丁 **P195**。

产物 `MiniPy_v4.122.sb3`：Interpreter 25,657 块，合计 **27,086**，`check41` errors=0。

## 1. 问题

| 代码 | v4.121（**错**） | **v4.122**（= CPython） |
|---|---|---|
| `True \| 1` / `True & 1` / `True ^ 1` | `TypeError: bitwise requires integers` | `1` / `1` / `0` |
| `True << 2` / `True >> 1` | 同上 | `4` / `0` |
| `True \| False` | 同上 | `True`（**仍是布尔**） |
| `True & False` / `True ^ True` | 同上 | `False` / `False` |
| `x = 1 > 0; x \| 4` | 同上 | `5` |
| `~-1` / `~+1` | `SyntaxError: unexpected token` | `0` / `-2` |
| `~True` / `~False` | `TypeError: numeric operand` | `-2` / `-1` |
| `-True` / `+True` | `TypeError: numeric operand` | `-1` / `1` |
| `1 & True` / `-1 \| True` | `1` / `-1` ✓ | 不变 |
| `~(-1)` / `-~1` / `~~5` | `0` / `2` / `5` ✓ | 不变 |

## 2. 做法（四处改动，三段根因）

**(a) 位运算的类型检查漏了"左操作数是布尔"。** `1 & True`、`-1 | True` 一直是对的，只有布尔在**左侧**时报错。
P10 把 `rightside` 里所有读 `lefttype` 的地方改写成"归一化后的 `lt2`"（`if lt2 == "B" then lt2 = "N"`），
但 **P25 的位运算分支是 P10 之后才插进去的**，它的类型检查读的还是 `argOf('lefttype')`，于是看到 `"B"` 就报错。
把那两处（每个 arm 一处）改成读 `lt2` 即可。

**(b) 两个布尔做 `& | ^` 的结果在 CPython 里仍是布尔。** `True | False` 是 `True`，而 `True | 1` 是 `1`。
P139 早就把**原始**操作数类型存进了 `lt0`/`evt0`，所以在 `& | ^` 那一臂末尾的 `evtype = "N"` 之后补一句
`if lt0 == "B" and evt0 == "B" then evtype = "B"`。**只做 (a) 的话 `True | False` 会打印 `1`** —— 值对、表示不对。

**(c) `~` 没有进入"上一个 token 是运算符吗"的那张表。** `eval` 把一个表达式按**最低优先级运算符**切开，
判断"这个 `-`/`+` 是一元还是二元"用的是 `eprev`（扫描位置的前一个 token）是否属于
`( + - * / % // == < > <= >= != and or **` —— 这张表写在 P57 把 `~` 加进**一元判定**之前，所以少了 `~`。
于是 `~-1` 在 `-` 处被切开、左半边成了单独的 `~`，`atom` 报 `unexpected token`。
`~5` 之所以能用，是因为那种写法扫不到运算符、直接走一元判定；`-~1` 能用是因为 `~` 从来不是二元运算符。
把 `~` 加进 `eprev` 那张表（包在整条 OR 链最外层）即可。

**(d) `unary` 的数值检查不收布尔。** 它写的是 `if evtype != "N" then fail("TypeError: numeric operand")`，
所以 `~True`/`-True` 报错（CPython `-2`/`-1`）。检查放宽成"不是 `N` 也不是 `B`"，并在 `-`/`+`/`~` 这一串分支
末尾补 `evtype = "N"`（布尔进来、整数出去）。

## 3. 实测

| 套件 | v4.121 | **v4.122** |
|---|---|---|
| `d276.json`（本轮新写 **38 条**：布尔位运算 14 条——`True`/`False` 与 `& \| ^ << >>`、两个布尔仍是布尔、比较结果当操作数、参与 `if`、一元 `-`/`+`；`~` 与负号 11 条——`~-1`/`~+1`/`~-x`/`~-(a+b)`/`~-True`、算术里用、参数里用、带空格写法；回归 11 条——`not -1`、`1 \| -2`、负数位运算、普通位运算、集合与字典合并、双重一元负号、布尔等值与相加；另 2 条原缺口已转正） | 11/38 | **38/38** |
| `d275` 38（负数位运算，其中 2 条原为缺口：布尔在左、`~-1`） | 36/38 | **38/38** |
| `d274` 42 · `d273` 27 · `d272` 29 · `d271` 31 · `d265` 32 · `d264` 32 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **145 套** | — | **141 套逐例相同**；差异 = `d276` 的 27 条 + `d275` 的 2 条（全部**由错转对**）+ `t111h` M4（CPython 集合遍历顺序）+ `featprobe3` 的两条地址 ⇒ **MiniPy 侧零回归（`ref true` 0）** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,077 块 errors=0 | **27,086 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.121 共 112 版全 MATCH | **v4.10…v4.122 共 113 版全 MATCH** |

本轮多 9 块积木，**没有**新过程、新变量、新列表。

## 4. 前后对比

```
print(True | 1)      v4.121: TypeError: bitwise requires integers   v4.122: 1
print(True | False)  v4.121: TypeError: bitwise requires integers   v4.122: True
print(True << 2)     v4.121: TypeError: bitwise requires integers   v4.122: 4
print(~-1)           v4.121: SyntaxError: unexpected token          v4.122: 0
print(~True)         v4.121: TypeError: numeric operand             v4.122: -2
print(-True)         v4.121: TypeError: numeric operand             v4.122: -1
print(1 & True)      v4.121: 1                                      v4.122: 1（不变）
print(~(-1))         v4.121: 0                                      v4.122: 0（不变）
```

## 5. 仍缺 / 下一轮（v4.123）候选

1. `min(xs, key=…)` / `max(xs, key=…)`
2. 扩展解包 `a, *rest = [1, 2, 3]`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`
3. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）
4. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`
5. `split(None, maxsplit)`；`rsplit`；`d.pop('x', 9, 8)`；视图集合语义；非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js           # -> MiniPy_v4.122.sb3
node _work/v41/run.mjs MiniPy_v4.122.sb3 _work/cmp47/d276.json    # 布尔位运算与 ~ 负号 38 条
node _work/v41/run.mjs MiniPy_v4.122.sb3 _work/cmp47/d275.json    # 负数位运算 38 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.122.sb3 -tag v4122 -ref v4121
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4122 -ref v4121
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.122.sb3 -tag v4122
node _work/v41/check41.cjs MiniPy_v4.122.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.121 还原： $env:V41_SKIP='P195'; $env:V41_OUT='…/MiniPy_v4.121.sb3'; $env:V41_STAMP='MiniPy v4.121 - built 2026-09-18'; node _work/v41/build41.js
```
