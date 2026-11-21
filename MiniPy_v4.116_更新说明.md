# MiniPy v4.116 更新说明

本轮把 **`join` 收字符串**补齐（顺带收集合）—— 这是 v4.108 撤下来的那一半。补丁 **P189**。

产物 `MiniPy_v4.116.sb3`：Interpreter 25,460 块，合计 **26,889**，`check41` errors=0。

## 1. 问题

| 代码 | v4.115（**错**） | **v4.116**（= CPython） |
|---|---|---|
| `'-'.join('ab')` | `TypeError: join needs a list` | `a-b` |
| `','.join('')` | 同上 | 空串 |
| `''.join('ab')` | 同上 | `ab` |
| `','.join('a,b')` | 同上 | `a,,,b` |
| `s = 'abc'; '-'.join(s)` | 同上 | `a-b-c` |
| `','.join(f'{x}')` / `','.join('-'.join('ab'))` | 同上 | `a,b` / `a,-,b` |
| `'-'.join({'a'})`（单元素集合） | 同上 | `a` |
| `'-'.join(['a','b'])` / `','.join(('a','b'))` / `','.join({'a':1,'b':2})` | 正常 ✓ | **不变** |
| `','.join([1])` / `','.join(5)` / `'-'.join(range(3))` | 报错 ✓ | **不变** |

## 2. 为什么 v4.108 那次会失败，以及这次怎么绕开

v4.108 试图"把所有可迭代都归一化"，结果 `'-'.join('ab')` 报
`AttributeError: 'list' object has no attribute 'join'` —— 原因是那次**对 `ev` 调了 `charsplit`**，
而那一刻 `ev` 里装的是**收信者（分隔符）**，于是收信者被换成列表。

P182 处理字典那半已经给出了安全形状：**把实参 `sma1` 搬进 `ev` → 调内核 → 结果抄回 `sma1` → 改标记**。
本轮对 `smt1 == "S"` 照做：

```
if smt1 == "S" then (ev = sma1; charsplit; sma1 = ev; smt1 = "L")
```

`charsplit`（P143）把字符串变成**字符的列表编码**，正是 P181 的元素检查与 `sjoin` 期待的东西；
收信者（`smrec` 那份）一个字都不碰。

**集合顺带也能用了**：`'-'.join({'a'})` → `a`。集合的元素本来就是列表编码（P110/P124），只差一个标记，
所以再补一句 `if smt1 == "E" then smt1 = "L"`。
**注意**：多元素的**字符串**集合在 CPython 里按哈希序（逐次运行可能不同），属噪声，套件里只测单元素集合。

## 3. 实测

| 套件 | v4.115 | **v4.116** |
|---|---|---|
| `d270.json`（本轮新写 **26 条**：字符串 17 条——变量、分隔符变量、单字符、空串、含分隔符的串、f-string、嵌套 join、`len`、重复后再 join、函数体、`str()`、`reversed`、切片、推导式；集合 3 条；列表/元组/字典与三类报错的回归 6 条） | 8/26 | **26/26** |
| `d263` 24（join 收元组/字典） · `d262` 8（元素类型检查） · `d269` 28（元组重复） · `d268` 22（嵌套 max/min） · `d267` 29 · `d266` 24 · `d265` 32 · `d264` 32 | 全绿 | **全绿（不变）** |
| 快照 **139 套** | — | **136 套逐例相同**；3 处差异 = `d270` 的 19 条**由错转对** + `t111h` M4（CPython 集合遍历顺序；MiniPy 两版输出都是 `{'a', 'b'}` / `{3, 1, 2}`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,880 块 errors=0 | **26,889 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.115 共 106 版全 MATCH | **v4.10…v4.116 共 107 版全 MATCH** |

本轮只多 9 块积木，**没有**新过程、新变量、新列表。

## 4. 前后对比

```
print('-'.join('ab'))                  v4.115: TypeError: join needs a list   v4.116: a-b
print(','.join(''))                    v4.115: 同上                           v4.116:（空行）
print(''.join('ab'))                   v4.115: 同上                           v4.116: ab
print(','.join('-'.join('ab')))        v4.115: 同上                           v4.116: a,-,b
print('-'.join({'a'}))                 v4.115: 同上                           v4.116: a
print('-'.join(['a', 'b']))            v4.115: a-b                            v4.116: a-b（不变）
```

## 5. 仍缺 / 下一轮（v4.117）候选

1. 列表 `index(x, start)`（`[1, 2, 1].index(1, 1)`）
2. `'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
3. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`、视图集合语义、非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.116.sb3
node _work/v41/run.mjs MiniPy_v4.116.sb3 _work/cmp47/d270.json   # join 收字符串/集合 26 条
node _work/v41/run.mjs MiniPy_v4.116.sb3 _work/cmp47/d263.json   # join 收元组/字典 24 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.116.sb3 -tag v4116 -ref v4115
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4116 -ref v4115
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.116.sb3 -tag v4116
node _work/v41/check41.cjs MiniPy_v4.116.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.115 还原： $env:V41_SKIP='P189'; $env:V41_OUT='…/MiniPy_v4.115.sb3'; $env:V41_STAMP='MiniPy v4.115 - built 2026-09-17'; node _work/v41/build41.js
```
