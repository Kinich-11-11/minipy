# MiniPy v4.109 更新说明

本轮把 v4.108 **撤下来**的那段归一化补回了两半：**`join` 现在收元组与字典的键**。
补丁 **P182**。

产物 `MiniPy_v4.109.sb3`：Interpreter 24,667 块，合计 **26,096**，`check41` errors=0。

## 1. 问题

| 代码 | v4.108（**错**） | **v4.109**（= CPython） |
|---|---|---|
| `'|'.join(('x', 'y'))` | `TypeError: join needs a list` | `x|y` |
| `','.join({'a': 1, 'b': 2})` | 同上 | `a,b`（按插入顺序） |
| `','.join({'one': 1, 'two': 2, 'three': 3})` | 同上 | `one,two,three` |
| `''.join(())` / `','.join({})` | 同上 | `''` |
| `d = {'a': 1}; d['b'] = 2; ','.join(d)` | 同上 | `a,b` |
| `','.join(['a', 'b'])` / `''.join([])` | 正常 ✓ | 不变 |
| `'-'.join((1, 2))` | `join needs a list` | `TypeError: sequence item 0: expected str instance, int found`（走的是 v4.108 那条元素检查，**下标从 0 起**） |
| `','.join({1: 'a'})` | `join needs a list` | `TypeError: sequence item 0: expected str instance, int found` |
| `'-'.join('ab')` | `join needs a list` | 不变（**仍是缺口**，见 §5） |

## 2. 做法

`join` 的分支在字符串派发里（P18），结构是"先查实参是不是列表 → 再 `sjoin`"。P182 只动两处：

1. **守卫放行元组** —— 那句守卫是 `if not (smt1 == "L") then fail('TypeError: join needs a list')`，
   把 `not` 的**操作数**从 `smt1 == "L"` 换成 `(smt1 == "L") or (smt1 == "T")`。
   **P140 之后元组的编码与列表完全一致**，所以 `sjoin` 一个字都不用改，v4.108 装上的
   元素类型检查也不用改（它在守卫**之后**，于是自动覆盖元组）。
2. **字典先取键** —— 守卫之前插一句 `if smt1 == "D" then (dictkeys sma1; sma1 = ev; smt1 = "L")`，
   字典于是变成"键的列表"再走原路。

## 3. 两个坑

1. **给 `not(smt1 == "L")` 的操作数再套一层 `not` 等于套了两层 `not`** —— 判据整个反过来：
   列表反而报错、元组/字典照样报错。第一版就是这么写的，`d263` 跑出
   **10/24 → 6/24 的倒退**（不只是没修好）。正确做法是换掉条件的**操作数**（或整条
   `CONDITION` 换成 `not(or(...))`）—— 改完 24/24。
   教训：**改否定条件时要先想清楚"这个 `not` 是谁的"**，再决定是换操作数还是再包一层。
2. **`find` 找"SUBSTACK 里含失败调用的 `control_if`"会命中"最外层"那个语句级 `if`**
   （它的条件是 `mcpv == 0`，是整个字符串派发的大 `if`）。要按**语句链**（`next`）判断
   "这个 `if` **自己的**子栈里就有它"，才是**最内层**的守卫 —— 否则字典归一化会被插到
   整个字符串派发之前。（构建期表达式积木没有 `parent`，所以只能这样自下而上地对。）

## 4. 实测

| 套件 | v4.108 | **v4.109** |
|---|---|---|
| `d263.json`（本轮新写 **24 条**：元组 6 条、字典 9 条、非字符串元素的报错文案 5 条、列表回归 4 条） | 10/24 | **24/24** |
| `d262` 8 · `d254` 20（上一轮与字符串派发相关） | 全绿 | **全绿（不变）** |
| 快照 **132 套** | — | **129 套逐例相同**；3 处差异 = `d263` 的 19 条由错转对（14 条功能 + 5 条报错文案）+ `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出都是 `a`/`b`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0，零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,089 块 errors=0 | **26,096 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.108 共 99 版全 MATCH | **v4.10…v4.109 共 100 版全 MATCH** |

本轮只多 7 块积木（一个 `IFELSE` + 一次 `dictkeys` 调用 + 3 个赋值 + 一个 `or` + 一个比较），
**没有**新过程、新变量、新列表。

## 5. 仍缺 / 下一轮（v4.110）候选

1. **元组切片**：`t = (1, 2, 3); t[0:2]` 打出内部记录串（`\x1fN`），CPython 是 `(1, 2)`；
   有意思的是 `len(t[0:2])` 反而是对的 —— 说明长度算对了、**重新编码**漏了。
2. **元组拼接**：`('a',) + ('b',)` 报 `TypeError: can only concatenate tuple (not "tuple") to tuple`
   （判据把两边都当成了"非元组"）。
3. **嵌套调用实参里的字符串含逗号**：`len(','.join(x))` 报 `NameError: name 'len' is not defined`
   （`print(...)` 那一路不受影响 —— 实参扫描不数引号，把字符串里的逗号当成了顶层分隔符）。
4. **`join` 收字符串**（`'-'.join('ab')`）—— v4.108 撤下的归一化里的第三半。
5. `[1, 2, 1].index(1, 1)` 的起始位置；`'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值。
6. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）、视图集合语义、非 ASCII。

## 6. 前后对比

```
print('|'.join(('x', 'y')))       v4.108: TypeError: join needs a list   v4.109: x|y
print(','.join({'a': 1, 'b': 2})) v4.108: TypeError: join needs a list   v4.109: a,b
print(''.join(()))                v4.108: TypeError: join needs a list   v4.109:（空行）
print('-'.join((1, 2)))           v4.108: TypeError: join needs a list   v4.109: TypeError: sequence item 0: expected str instance, int found
print(','.join(['a', 'b']))       v4.108: a,b                             v4.109: a,b（不变）
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.109.sb3
node _work/v41/run.mjs MiniPy_v4.109.sb3 _work/cmp47/d263.json   # 元组/字典 join 24 条
node _work/v41/run.mjs MiniPy_v4.109.sb3 _work/cmp47/d262.json   # 上一轮 8 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.109.sb3 -tag v4109 -ref v4108
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4109 -ref v4108
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.109.sb3 -tag v4109
node _work/v41/check41.cjs MiniPy_v4.109.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.108 还原： $env:V41_SKIP='P182'; $env:V41_OUT='…/MiniPy_v4.108.sb3'; $env:V41_STAMP='MiniPy v4.108 - built 2026-09-17'; node _work/v41/build41.js
```
