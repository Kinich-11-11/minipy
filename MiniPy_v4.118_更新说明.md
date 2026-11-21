# MiniPy v4.118 更新说明

本轮补 **`split(sep, maxsplit)`**，并顺手修掉同源的**三个静默给错答案的空字段 bug**。补丁 **P191**。

产物 `MiniPy_v4.118.sb3`：Interpreter 25,567 块，合计 **26,996**，`check41` errors=0。

## 1. 问题

| 代码 | v4.117（**错**） | **v4.118**（= CPython） |
|---|---|---|
| `'a,b,c'.split(',', 1)` | `['a', 'b', 'c']`（**第二个实参被忽略**） | `['a', 'b,c']` |
| `'a,b,c'.split(',', 0)` | `['a', 'b', 'c']` | `['a,b,c']` |
| `'a,b,c'.split(',', 5)` / `(',', -1)` | 正常 ✓ | 不变 |
| `''.split(',')` | `[]`（**静默错**） | `['']` |
| `','.split(',')` | `['']`（**静默错**） | `['', '']` |
| `'a,'.split(',')` | `['a']`（**静默错**） | `['a', '']` |
| `'a,b'.split(',', 1.0)` | `['a', 'b']`（**静默当整数**） | `TypeError: 'float' object cannot be interpreted as an integer` |
| `'a,b'.split(',')` / `'a b  c'.split()` / `'abc'.split('x')` | 正常 ✓ | 不变 |

## 2. 根因与做法

`ssplit` 是"扫到分隔符才添一段"的循环，最后用一条 `if cursor <= len` 添尾巴 —— 但判据写成
**`cursor > len` 就跳过**：

* 尾随分隔符的游标正好落在 `len + 1` ⇒ **空尾巴被丢掉**（`'a,'` → `['a']`）；
* 空串根本不进循环 ⇒ 一段都不产生（`''` → `[]`）。

判据改成 **`cursor <= len + 1`**（"还有一段，可能是空的"），三条一起修好；这也自动覆盖了
`'a,'.split(',', 1)` 这类"切到上限后剩下的空尾巴"。

**maxsplit** 走全局 `smmax`（`-1` = 不限）：字符串派发早已把第二个实参放进 `sma2`、类型放进 `smt2`、
逗号位置放进 `mcut`，派发处据此求值；非整数按 CPython 的
`TypeError: '<类型>' object cannot be interpreted as an integer` 拒绝（浮点看文本里的 `.`，与
P170/P176/P190 同一条规则）。`ssplit` 用新变量 `smcnt` 记命中次数，搜索循环的条件再 `or` 上"已到上限"，
剩下的那一整段就交给尾巴添加 ⇒ 上限内的切分与"剩余部分原样保留"都对（`'a,b,c'.split(',', 1)` → `['a', 'b,c']`）。

## 3. 实测

| 套件 | v4.117 | **v4.118** |
|---|---|---|
| `d272.json`（本轮新写 **29 条**：maxsplit 12 条——1/2/0/5/-1、空格与多字符分隔符、表达式与变量上限、与 `join` 连用；空字段 8 条——空串、只有一个分隔符、前导/尾随/连续分隔符、空串的无参 `split()`；类型错 3 条；回归 6 条） | 14/29 | **29/29** |
| `d271` 31（`index(x, start)`） · `d270` 26 · `d269` 28 · `d268` 22 · `d267` 29 · `d266` 24 · `d265` 32 · `d264` 32 · `d263` 24 | 全绿 | **全绿（不变）** |
| 快照 **141 套** | — | **137 套逐例相同**；4 处差异 = `d272` 的 15 条**由错转对** + `t111h` M4 / `t113` F6（CPython 集合遍历顺序；两版 MiniPy 输出逐字相同）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,970 块 errors=0 | **26,996 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.117 共 108 版全 MATCH | **v4.10…v4.118 共 109 版全 MATCH** |

本轮多 26 块积木、2 个变量（`smmax`、`smcnt`），**没有**新过程、新列表。

## 4. 前后对比

```
print('a,b,c'.split(',', 1))   v4.117: ['a', 'b', 'c']                        v4.118: ['a', 'b,c']
print('a,b,c'.split(',', 0))   v4.117: ['a', 'b', 'c']                        v4.118: ['a,b,c']
print(''.split(','))           v4.117: []                                     v4.118: ['']
print(','.split(','))          v4.117: ['']                                   v4.118: ['', '']
print('a,'.split(','))         v4.117: ['a']                                  v4.118: ['a', '']
print('a,b'.split(',', 1.0))   v4.117: ['a', 'b']                             v4.118: TypeError: 'float' object cannot be interpreted as an integer
print('a,b'.split(','))        v4.117: ['a', 'b']                             v4.118: ['a', 'b']（不变）
```

## 5. 仍缺 / 下一轮（v4.119）候选

1. `d.pop('x', 9)` 的默认值
2. `split(None)` / `split(None, maxsplit)`（显式 `None` 仍报 `ValueError: empty separator`；空白切分器还没有上限）
3. `rsplit`（完全没有）
4. `index(x, start, end)` 的 `end`；`find`/`rfind`/`count` 的 `end`
5. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   视图集合语义、非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.118.sb3
node _work/v41/run.mjs MiniPy_v4.118.sb3 _work/cmp47/d272.json   # split(maxsplit) 29 条
node _work/v41/run.mjs MiniPy_v4.118.sb3 _work/cmp47/d271.json   # 上一轮 31 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.118.sb3 -tag v4118 -ref v4117
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4118 -ref v4117
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.118.sb3 -tag v4118
node _work/v41/check41.cjs MiniPy_v4.118.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.117 还原： $env:V41_SKIP='P191'; $env:V41_OUT='…/MiniPy_v4.117.sb3'; $env:V41_STAMP='MiniPy v4.117 - built 2026-09-17'; node _work/v41/build41.js
```
