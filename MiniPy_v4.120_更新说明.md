# MiniPy v4.120 更新说明

本轮补 **字典 `|` 合并运算符** 与 **`split(None)`**。补丁 **P193**。

产物 `MiniPy_v4.120.sb3`：Interpreter 25,605 块，合计 **27,034**，`check41` errors=0。

## 1. 问题

| 代码 | v4.119（**错**） | **v4.120**（= CPython） |
|---|---|---|
| `{1: 2} \| {3: 4}` | `TypeError: bitwise requires integers` | `{1: 2, 3: 4}` |
| `{'a': 1} \| {'a': 2, 'b': 3}` | 同上 | `{'a': 2, 'b': 3}`（右边覆盖） |
| `d = {'a': 1}; d \|= {'b': 2}` | 同上 | `d` 变 `{'a': 1, 'b': 2}` |
| `{1: 2} \| [1]` | `TypeError: bitwise requires integers`（文案不对） | `TypeError: unsupported operand type(s) for \|: 'dict' and 'list'` |
| `'a b  c'.split(None)` | `ValueError: empty separator` | `['a', 'b', 'c']` |
| `''.split(None)` | `ValueError: empty separator` | `[]` |
| `'a b c'.split(None, 1)` | `ValueError: empty separator` | `ValueError: empty separator`（CPython 是 `['a', 'b c']`，**仍缺**，见 §5） |
| `6 \| 3` / `{1, 2} \| {3}` | `7` / `{1, 2, 3}` ✓ | 不变 |

## 2. 做法

**字典 `|`**：`rightside` 的位运算分支条件是"运算符是 `^`/`&`/`|` 且两边不同时是集合"，非数字操作数会掉进
P25 手写的位串路径，最后以 `fail("TypeError: bitwise requires integers")` 收尾 —— 字典就卡在这里。
修法是在那个分支**前面**加一层：

```
if op == "|" and (lt2 == "D" or evtype == "D") then
    if 两边都是字典 then  dupd(左值, ev) ; evtype = "D"     # P167 的"就地重建记录"，结果留在 ev
    else                 beop = "|" ; binL/binR/binLT/binRT ; binerr      # CPython 的操作数类型文案
```

`dupd` 会**重建**记录，所以 `d = a | b` 拿到的是新字典（改 `d`/改 `a` 互不影响），键序是"左在前、新键追加"。
位运算分支自己的条件再 `and not (两边都是字典)`，否则合并好的值又会被位串路径覆盖。
`|=` 走 P70 的增强赋值、同样落到 `rightside`，一处修好两处都对。

**`split(None)`**：P115 的派发是

```
if smarg == 0 then ssplitw                       # s.split()：按连续空白切
else if sma1 == "" then fail(ValueError: empty separator) else ssplit(记录, 分隔符)
```

而 `None` 实参送来的是**空串 + 类型 `Z`**，于是 `split(None)` 撞上了 `sma1 == ""` 那一臂。
本轮把内层 if 的条件放宽成 `smt1 == "Z" or sma1 == ""`，分支体换成
`if smt1 == "Z" and smmax < 0 then ssplitw else fail(ValueError: empty separator)` ——
显式空串照旧报错，`None` 走现成的空白切分器（`ssplitw` 就是无参 `split()` 用的那个）。
带上限的 `split(None, maxsplit)` **故意**仍报错：空白切分器没有上限，报错好过给错答案。

## 3. 实测

| 套件 | v4.119 | **v4.120** |
|---|---|---|
| `d274.json`（本轮新写 **42 条**：合并 20 条——基本/覆盖/操作数不变/`\|=`/链式/空字典/嵌套容器值/函数内/`len`/新记录/键序/`None` 与布尔值/循环内/推导式内/结果取下标/`type` 与 `get`/`in`；操作数类型报错 6 条；位运算与集合回归 8 条；`split(None)` 7 条；负数位运算 1 条） | 13/42 | **40/42**（合并 20/20、报错 6/6、回归 8/8、`split(None)` 6/7） |
| `d273` 27（dict.pop）· `d272` 29（split）· `d271` 31（index）· `d265` 32 · `d264` 32 · `d250` 26（路径写回）· `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **143 套** | — | **139 套逐例相同**；差异 = `d274` 的 32 条（27 条**由错转对** + 5 条**报错文案对齐 CPython**）+ `t111h` M4 / `t113` F6（CPython 集合遍历顺序；两版 MiniPy 输出逐字相同）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **MiniPy 侧零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,001 块 errors=0 | **27,034 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.119 共 110 版全 MATCH | **v4.10…v4.120 共 111 版全 MATCH** |

本轮多 33 块积木，**没有**新过程、新变量、新列表。

## 4. 前后对比

```
print({1: 2} | {3: 4})              v4.119: TypeError: bitwise requires integers   v4.120: {1: 2, 3: 4}
print({'a': 1} | {'a': 2, 'b': 3})  v4.119: TypeError: bitwise requires integers   v4.120: {'a': 2, 'b': 3}
d = {'a': 1}; d |= {'b': 2}         v4.119: TypeError: bitwise requires integers   v4.120: {'a': 1, 'b': 2}
print({1: 2} | [1])                 v4.119: TypeError: bitwise requires integers   v4.120: unsupported operand type(s) for |: 'dict' and 'list'
print('a b  c'.split(None))         v4.119: ValueError: empty separator            v4.120: ['a', 'b', 'c']
print(''.split(None))               v4.119: ValueError: empty separator            v4.120: []
print(6 | 3)                        v4.119: 7                                     v4.120: 7（不变）
print({1, 2} | {3})                 v4.119: {1, 2, 3}                             v4.120: {1, 2, 3}（不变）
print(-1 | 0)                       v4.119: ValueError: bitwise needs non-negative integers   v4.120: 同上（仍缺）
```

## 5. 仍缺 / 下一轮（v4.121）候选

1. **负数的位运算**（本轮探针发现的**新**缺口，第一候选）：`-1 | 0` 报
   `ValueError: bitwise needs non-negative integers`（CPython `-1`）、`-2 & 3` 应为 `2`、`-1 ^ 1` 应为 `-2`。
   代码在 P25：`bitop` 逐位拆解只做非负，且 `intCheck()` 里有显式拒绝负数的守卫。方向：`<<`/`>>` 去掉守卫即可
   （`<<` 是乘 2、`>>` 是 `floor(x/2)`，对负数与 CPython 一致），`& | ^` 要按 64 位补码做
   （负数先 `x mod 2^64`、算完若最高位为 1 再减 `2^64`）。
2. `min(xs, key=…)` / `max(xs, key=…)`
3. 扩展解包 `a, *rest = [1, 2, 3]`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`
4. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）
5. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`
6. `split(None, maxsplit)`（空白切分器要加上限）；`rsplit`；`d.pop('x', 9, 8)`（CPython 报太多实参）
7. 视图集合语义、非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js           # -> MiniPy_v4.120.sb3
node _work/v41/run.mjs MiniPy_v4.120.sb3 _work/cmp47/d274.json    # 字典 | 与 split(None) 42 条
node _work/v41/run.mjs MiniPy_v4.120.sb3 _work/cmp47/d248.json    # 容器内容 61 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.120.sb3 -tag v4120 -ref v4119
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4120 -ref v4119
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.120.sb3 -tag v4120
node _work/v41/check41.cjs MiniPy_v4.120.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.119 还原： $env:V41_SKIP='P193'; $env:V41_OUT='…/MiniPy_v4.119.sb3'; $env:V41_STAMP='MiniPy v4.119 - built 2026-09-17'; node _work/v41/build41.js
```
