# MiniPy v4.108 更新说明

本轮修掉一个**静默给错答案**的老 bug：**`join` 会接受非字符串元素**。
`','.join([1])` 以前打出 `1`，CPython 报 `TypeError: sequence item 0: expected str instance, int found`。
补丁 **P181**。

产物 `MiniPy_v4.108.sb3`：Interpreter 24,660 块，合计 **26,089**，`check41` errors=0。

## 1. 问题

| 代码 | v4.107（**错**） | **v4.108**（= CPython） |
|---|---|---|
| `','.join([1])` | `1`（**静默转换**） | `TypeError: sequence item 0: expected str instance, int found` |
| `','.join(['a', 1])` | `a,1` | `TypeError: sequence item 1: …`（**下标从 0 起**） |
| `','.join([True])` | `1` | `TypeError: sequence item 0: expected str instance, bool found` |
| `','.join(['a', 'b'])` / `','.join([])` / `','.join(['z'])` | 正常 ✓ | 不变 |
| `''.join(['a', 'b', 'c'])` / `'.'.join(xs)` | 正常 ✓ | 不变 |
| `','.join(1)` | 报错 ✓ | 不变（措辞仍是 MiniPy 自己的 `join needs a list`） |

## 2. 做法

`join` 的分支在字符串派发里（P18）：它先检查实参是不是列表，然后调用 `sjoin`。P181 在这两者之间
**加一段元素类型检查** —— 用 `listlen`/`listitem` 逐个看元素的类型，第一个不是字符串的就报 CPython 的
`TypeError: sequence item <0 基下标>: expected str instance, <类型> found`（类型名走现成的 `tname`），
然后 `STOPTHIS` 不再往下走。检查通过时什么都不改，`sjoin` 照旧。

## 3. 两个坑

1. **`find(set, pred)` 要的是"可达集合"而不是定义块的 id**：我先写了
   `const mc = defIdOf('methodcall %s %s')` 然后直接 `find(mc, …)` —— `find` 会把**字符串 id 逐字符**
   当成积木 id 去取，`BL()['b']` 是 `undefined` ⇒ 构建报
   `TypeError: Cannot read properties of undefined (reading 'opcode')`。
   要写 `reach(mc)` 再用。
2. **构建期表达式积木没有 `parent`**（老坑，本轮又踩）：想用 `ancestor(失败调用, 是 if)` 找外层 `if`
   会一路撞到不存在的 id 而炸掉 ⇒ 改成**从所有 `control_if` 里找"SUBSTACK 包含这个失败调用"的那个**。

## 4. 本轮没做成的事（撤下来的部分）

同一轮还试着让 `join` 接受**别的可迭代对象**（CPython 里字典按键、元组、集合、字符串的字符都能 join）：
在检查之前插了"归一化"（字典 `dictkeys`、字符串 `charsplit`、元组/集合改类型标记）。
结果列表用例全绿，但 **`'-'.join('ab')` 变成了 `AttributeError: 'list' object has no attribute 'join'`**
（收信者被弄成了列表），字典与元组也仍然报 `join needs a list`。
**为避免把好路径弄坏，把归一化整段撤掉**，只留元素类型检查（那部分一次通过）。
`join` 收元组/字典/字符串仍是缺口，已写进清单。

## 5. 实测

| 套件 | v4.107 | **v4.108** |
|---|---|---|
| `d262.json`（本轮新写 **8 条**：`join` 的非字符串元素（首个/第二个/布尔）、正常列表、空列表、单元素、空分隔符、变量作参数） | 5/8 | **8/8** |
| `d261` 12 · `d260` 12 · `d259` 12 · `d258` 14 · `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **130 套** | — | **128 套逐例相同**；3 处差异 = `d262` 的 3 条由错转对 + `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 26,062 块 errors=0 | **26,089 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.107 共 98 版全 MATCH | **v4.10…v4.108 共 99 版全 MATCH** |

新增 3 个变量（`jn1` `jn2` `jn3`），**没有**新过程、新列表。

## 6. 仍缺 / 下一轮（v4.109）候选

1. **`join` 收元组/字典/字符串**（CPython 都收；本轮归一化撤下了，见 §4）
2. `[1, 2, 1].index(1, 1)`：列表 `index` 的起始位置（与 v4.106 的 `count` 同一形态）
3. `'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
4. `min/max(key=…)`、扩展解包 `a, *rest = …`
5. **多访问器路径别名**（`b = a[0][1]`；补丁与两条结论留档 `_work/v41/_p176_twoaccessor.txt`）
6. 内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）、视图集合语义、非 ASCII

## 7. 前后对比

```
print(','.join([1]))         v4.107: 1      v4.108: TypeError: sequence item 0: expected str instance, int found
print(','.join(['a', 1]))    v4.107: a,1    v4.108: TypeError: sequence item 1: expected str instance, int found
print(','.join([True]))      v4.107: 1      v4.108: TypeError: sequence item 0: expected str instance, bool found
print(','.join(['a', 'b']))  v4.107: a,b    v4.108: a,b（不变）
print(''.join(['a','b','c']))  v4.107: abc  v4.108: abc（不变）
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.108.sb3
node _work/v41/run.mjs MiniPy_v4.108.sb3 _work/cmp47/d262.json   # join 元素类型 8 条
node _work/v41/run.mjs MiniPy_v4.108.sb3 _work/cmp47/d261.json   # 上一轮 12 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.108.sb3 -tag v4108 -ref v4107
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4108 -ref v4107
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.108.sb3 -tag v4108
node _work/v41/check41.cjs MiniPy_v4.108.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.107 还原： $env:V41_SKIP='P181'; $env:V41_OUT='…/MiniPy_v4.107.sb3'; $env:V41_STAMP='MiniPy v4.107 - built 2026-09-17'; node _work/v41/build41.js
```
