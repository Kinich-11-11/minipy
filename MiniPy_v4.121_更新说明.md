# MiniPy v4.121 更新说明

本轮补 **位运算的负数支持**。补丁 **P194**。

产物 `MiniPy_v4.121.sb3`：Interpreter 25,648 块，合计 **27,077**，`check41` errors=0。

## 1. 问题

| 代码 | v4.120（**错**） | **v4.121**（= CPython） |
|---|---|---|
| `-1 \| 0` | `ValueError: bitwise needs non-negative integers` | `-1` |
| `-2 & 3` | 同上 | `2` |
| `-1 ^ 1` | 同上 | `-2` |
| `-5 & -3` / `-5 \| -3` / `-5 ^ -3` | 同上 | `-7` / `-5` / `6` |
| `-1 << 2` / `-5 << 3` | 同上 | `-4` / `-40` |
| `-8 >> 1` / `-3 >> 1` / `-1 >> 1` | 同上 | `-4` / `-2` / `-1` |
| `-1 & 1024` / `-1 \| 1024` | 同上 | `1024` / `-1` |
| `1 << -1` / `1 >> -1` | `ValueError: bitwise needs non-negative integers`（文案不对） | `ValueError: negative shift count` |
| `6 \| 3` / `1 << 4` / `(1 << 40) \| 1` | `7` / `16` / `1099511627777` ✓ | 不变 |

## 2. 做法

P25 的 `intCheck()` 里有一条显式的"任一侧为负就报错"守卫 —— 因为 `bitop` 用"逐位 `mod 2`、`floor(/2)` 累加"
描述整数，只对非负数成立。三步改：

1. **两条守卫的条件置为恒假**（`if 0 = 1 then fail`），数值路由交给下面两步。
2. **`<<` / `>>` 的数值本来就不用改**：移位臂写的是"重复乘 2"与"重复 `floor(x / 2)`"，
   对负数与 CPython 完全一致（`-1 << 2 = -4`、`-3 >> 1 = floor(-1.5) = -2`）。
   这里补的是**真正该报的那个错**：移位次数为负 → CPython 的 `ValueError: negative shift count`。
3. **`& | ^` 用二补数**：取宽度 `2^W`（从 `2` 起倍增，直到 `> 2 * max(|a|, |b|)`，封顶 `2^53` 以免浮点丢低位），
   负操作数映射成 `x + 2^W`，调用原来的 `bitop`，结果 `>= 2^(W-1)` 时再减 `2^W` 变回有符号。

```
W = 2   while not (W > 2*max(|a|,|b|) or W >= 2^53):  W = W * 2
a' = a + W if a < 0 else a        b' = b + W if b < 0 else b
bitop(op, a', b')                 # `a'`、`b'` 都是非负，原内核直接可用
ev = ev - W if ev >= W / 2 else ev
```

因为这个映射对 `& | ^` 是**等价**的（结果只取决于各二进制位，而 `2^(W-1) > max(|a|,|b|)` 保证高位符号位一致），
宽度只要"刚好容纳两个操作数"就够，不必固定 64 位 —— 固定 64 位反而会因为 `2^64 - 1` 超出双精度而算错。

**只有真有负数时才映射与回代**（`bt_neg` 标记）：没有负数时 `bt_a`/`bt_b` 只是原值的一份拷贝、
宽度扫描与回代都不执行，所以 `(1 << 40) | 1` 这类大正数结果一字不变。

精度：映射在 `max(|a|, |b|) < 2^52` 时精确（和不超过 `2^53`）；再大就落进本工程固有的"大整数"限制
（`2**53 + 1` 那条探针一直如此）。

## 3. 实测

| 套件 | v4.120 | **v4.121** |
|---|---|---|
| `d275.json`（本轮新写 **38 条**：负数 16 条——基本三式、两个负数、变量、链式、与 2 的幂混用、函数内、推导式内、与字面量比较、参与算术、一元负号；移位 6 条——左移/右移/`>>` 的向下取整/变量/链式/循环里左移；报错 6 条——负数移位次数 ×2、列表、浮点、浮点移位次数、字符串；回归 8 条——非负位运算、非负移位、`(1 << 40) \| 1` 这类大正数、集合 `\|`、字典 `\|`、增强赋值、`~`、比较；已知缺口 2 条） | 12/38 | **36/38**（负数 16/16、移位 6/6、报错 6/6、回归 8/8） |
| `d274` 42（字典 `\|` 与 `split(None)`）· `d273` 27 · `d272` 29 · `d271` 31 · `d265` 32 · `d264` 32 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **143 套（不含本轮新增的 `d275`，共 144 套跑过）** | — | **140 套逐例相同**；差异 = `d275` 的 27 条 + `d274` 的 1 条（共 28 条，全部**由错转对**）+ `t111h` M4（CPython 集合遍历顺序；两版 MiniPy 输出逐字相同）+ `featprobe3` 的两条地址 ⇒ **MiniPy 侧零回归（`ref true` 0）** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,034 块 errors=0 | **27,077 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.120 共 111 版全 MATCH | **v4.10…v4.121 共 112 版全 MATCH** |

本轮多 40 块积木、4 个新变量（`bt_m`/`bt_n`/`bt_w`/`bt_neg`），**没有**新过程、新列表。

## 4. 前后对比

```
print(-1 | 0)              v4.120: ValueError: bitwise needs non-negative integers   v4.121: -1
print(-2 & 3)              v4.120: ValueError: bitwise needs non-negative integers   v4.121: 2
print(-1 ^ 1)              v4.120: ValueError: bitwise needs non-negative integers   v4.121: -2
print(-1 << 2)             v4.120: ValueError: bitwise needs non-negative integers   v4.121: -4
print(-8 >> 1)             v4.120: ValueError: bitwise needs non-negative integers   v4.121: -4
print(1 << -1)             v4.120: ValueError: bitwise needs non-negative integers   v4.121: ValueError: negative shift count
print(6 | 3)               v4.120: 7                                                 v4.121: 7（不变）
print((1 << 40) | 1)       v4.120: 1099511627777                                     v4.121: 1099511627777（不变）
print(True | 1)            v4.120: TypeError: bitwise requires integers              v4.121: 同上（仍缺）
```

## 5. 仍缺 / 下一轮（v4.122）候选

1. **布尔字面量在左侧的位运算**（本轮探针发现，第一候选）：`True | 1`、`True & 1`、`True << 2`、`True | False`
   报 `TypeError: bitwise requires integers`（`1 & True` 与 `-1 | True` 是对的）。
   根因清楚：P10 把 `rightside` 里 `lefttype` 的读取改写成"归一化后的 `lt2`"，但那些位运算分支是 **P25 之后**
   才插进去的，判的还是 `argOf('lefttype')`。修法＝把那两处（`intCheck()` 被调用两次）的比较换成 `VAR('lt2')`。
2. `~-1`（一元 `~` 后跟一元 `-`）报 `SyntaxError: unexpected token`（CPython `0`）
3. `min(xs, key=…)` / `max(xs, key=…)`
4. 扩展解包 `a, *rest = [1, 2, 3]`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`
5. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）
6. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`
7. `split(None, maxsplit)`；`rsplit`；`d.pop('x', 9, 8)`；视图集合语义；非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js           # -> MiniPy_v4.121.sb3
node _work/v41/run.mjs MiniPy_v4.121.sb3 _work/cmp47/d275.json    # 负数位运算 38 条
node _work/v41/run.mjs MiniPy_v4.121.sb3 _work/cmp47/d274.json    # 字典 | 与 split(None) 42 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.121.sb3 -tag v4121 -ref v4120
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4121 -ref v4120
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.121.sb3 -tag v4121
node _work/v41/check41.cjs MiniPy_v4.121.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.120 还原： $env:V41_SKIP='P194'; $env:V41_OUT='…/MiniPy_v4.120.sb3'; $env:V41_STAMP='MiniPy v4.120 - built 2026-09-18'; node _work/v41/build41.js
```
