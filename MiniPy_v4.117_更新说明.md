# MiniPy v4.117 更新说明

本轮补 **`index(x, start)`** —— 列表、元组、字符串三种都补。补丁 **P190**。

产物 `MiniPy_v4.117.sb3`：Interpreter 25,541 块，合计 **26,970**，`check41` errors=0。

## 1. 问题

| 代码 | v4.116（**错**） | **v4.117**（= CPython） |
|---|---|---|
| `[1, 2, 1].index(1, 1)` | `ValueError: list.index(x): x not in list` | `2` |
| `[1, 2, 3].index(2, 0)` | 同上 | `1` |
| `[1, 2, 1].index(1, -1)` | `TypeError ... 'tuple' and 'int'` | `2` |
| `[1, 2, 3].index(2, 2)` | 同上 | `ValueError: list.index(x): x not in list` ✓ |
| `(1, 2, 1).index(1, 1)` | `ValueError: tuple.index(x): x not in tuple` | `2` |
| `'abca'.index('a', 1)` | `0`（**第二个实参被忽略**） | `3` |
| `'abc'.index('a', 1)` | `0` | `ValueError: substring not found` |
| `[1, 2, 3].index(2, 1.0)` | `1`（**静默当整数**） | `TypeError: slice indices must be integers or have an __index__ method` |
| `[1, 2, 3].index(2, 1)` / `[1, 2, 3].index(2)` / `'abc'.index('b')` | 正常 ✓ | **不变** |

## 2. 两个不同的成因

1. **字符串**（P75）：`index` 分支只调 `sfind(smrec, sma1)`，第二个实参看都不看。
   P177 的 `sfind2 <记录> <子串> <起点>` 本来就是"从起点找"，而字符串派发早已把起点放在 `sma2`、
   逗号位置放在 `mcut` ⇒ 分支改成 `if mcut > 0 then sfind2 else sfind`，两条后面都跟同一个 ValueError。
2. **列表/元组**（P13）：分支把**整段实参**当一个表达式求值，第二个实参于是变成一个元组、接着去找那个元组。
   现在先扫这段里的**第一个顶层逗号**（沿用 `insert` 分支的写法，再加花括号与 P184 的"字符串不算逗号"），
   把"要找的值"和"起点"分开求值，负起点按长度归一、再钳到 0，扫描游标从那里开始。

## 3. 两个坑（本轮最贵的）

1. **顺序就是一切**：分支紧接着还有一对 `lneed = ev` / `lnt = evtype`。先求"要找的值"、后求"起点"，
   这对语句就会把 `lneed` 覆盖成**起点** —— 第一版正是如此，于是所有两实参调用都去搜起点值、
   报 "not in list"（`[1,2,3].index(2,0)` 搜的是 `0`）。修法是**把起点放在前、要找的值放在最后求值**，
   让 `ev` 停在需要的东西上。
2. **别去删那对语句**：一开始想把它删掉，但 `predecessorOf` 在旧补丁拼出来的链上**不可靠**，
   删错位置会把整条尾巴（扫描循环与结果赋值）一起摘掉 —— 症状是 `index(2)` 直接返回 `2`（`ev` 还停在待找值）。
   撤回删除、改用上面那个"求值顺序"的办法，一次通过。

起点类型按 CPython 的 `TypeError: slice indices must be integers or have an __index__ method` 拒绝
（浮点按文本里的 `.` 判、布尔按 `B` 放行 ⇒ `[1, 2, 3].index(2, True)` → `1`）。

## 4. 实测

| 套件 | v4.116 | **v4.117** |
|---|---|---|
| `d271.json`（本轮新写 **31 条**：列表 15 条——起点 0/1/负数/超界/负超界/变量/表达式/浮点与布尔起点，元组 3 条，字符串 9 条——起点 0/1/2/更后的匹配/未找到/变量/重复字符，加 `count`/`find`/`remove` 回归 4 条） | 15/31 | **31/31** |
| `d270` 26 · `d269` 28 · `d268` 22 · `d267` 29 · `d266` 24 · `d265` 32 · `d264` 32 · `d263` 24 | 全绿 | **全绿（不变）** |
| 快照 **140 套** | — | **137 套逐例相同**；3 处差异 = `d271` 的 17 条**由错转对** + `t113` F6（CPython 集合遍历顺序；两版 MiniPy 输出都是 `a`/`b`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,889 块 errors=0 | **26,970 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.116 共 107 版全 MATCH | **v4.10…v4.117 共 108 版全 MATCH** |

本轮多 81 块积木、1 个变量（`lsstart`），**没有**新过程、新列表。

## 5. 前后对比

```
print([1, 2, 1].index(1, 1))   v4.116: ValueError: list.index(x): x not in list   v4.117: 2
print([1, 2, 3].index(2, 0))   v4.116: 同上                                       v4.117: 1
print((1, 2, 1).index(1, 1))   v4.116: ValueError: tuple.index(x): x not in tuple v4.117: 2
print('abca'.index('a', 1))    v4.116: 0                                          v4.117: 3
print([1, 2, 3].index(2, 2))   v4.116: 报错（不精确）                              v4.117: ValueError（= CPython）
```

## 6. 仍缺 / 下一轮（v4.118）候选

1. `'a,b,c'.split(',', 1)` 的 `maxsplit`
2. `d.pop('x', 9)` 的默认值
3. `index(x, start, end)` 的 `end`（第二个逗号）；`find`/`rfind`/`count` 的 `end`（字符串派发要先加 `sma3`）
4. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   视图集合语义、非 ASCII

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.117.sb3
node _work/v41/run.mjs MiniPy_v4.117.sb3 _work/cmp47/d271.json   # index(x, start) 31 条
node _work/v41/run.mjs MiniPy_v4.117.sb3 _work/cmp47/d270.json   # 上一轮 26 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.117.sb3 -tag v4117 -ref v4116
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4117 -ref v4116
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.117.sb3 -tag v4117
node _work/v41/check41.cjs MiniPy_v4.117.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.116 还原： $env:V41_SKIP='P190'; $env:V41_OUT='…/MiniPy_v4.116.sb3'; $env:V41_STAMP='MiniPy v4.116 - built 2026-09-17'; node _work/v41/build41.js
```
