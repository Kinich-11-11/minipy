# MiniPy v4.107 更新说明

本轮补两个**探针挖出来的小缺口**：**`reversed(x)`**（内建函数完全没有）与
**单实参 `'abc'.count('')`**（给 0，CPython 给 4）。补丁 **P180**。

产物 `MiniPy_v4.107.sb3`：Interpreter 24,633 块，合计 **26,062**，`check41` errors=0。

## 1. 问题

| 代码 | v4.106（**错**） | **v4.107**（= CPython） |
|---|---|---|
| `list(reversed([1, 2, 3]))` | `NameError: name 'reversed' is not defined` | `[3, 2, 1]` |
| `list(reversed('abc'))` | NameError | `['c', 'b', 'a']` |
| `list(reversed((1, 2)))` | NameError | `[2, 1]` |
| `list(reversed({'a': 1, 'b': 2}))` | NameError | `['b', 'a']` |
| `for c in reversed(['x', 'y'])` / `sum(reversed([1, 2, 3]))` | NameError | `y` `x` / `6` |
| `list(reversed(5))` | NameError | `TypeError: 'int' object is not reversible` |
| `'abc'.count('')` | `0` | `4` |
| `'abc'.count('', 1)` | `3` ✓（v4.106 刚修） | 不变 |
| `'abcabc'.count('b')` / `count('b', 2)` | `2` / `1` ✓ | 不变 |

## 2. 做法

1. **`reversed(x)`**：列表反转的内核 `lrev`（P101）本来就有，缺的只是内建入口 ⇒ 在 `callfn` 的
   内建链上加一个分支（位置与 P176 的 `bin`/`hex`/`oct` 相同，在 `pending` 守卫之前）：
   列表/元组直接 `lrev`；字典先 `dictkeys`（CPython 的字典按**键**迭代）再 `lrev`；
   字符串先 `charsplit` 切成字符列表再 `lrev`；其余类型报 CPython 的
   `TypeError: '<类型>' object is not reversible`（类型名走现成的 `tname`）。
   *CPython 返回的是迭代器*，MiniPy 返回**反转后的列表** —— `list(...)`、`for ... in ...`、`sum(...)`
   这些用法都一致；只有直接打印 `reversed(x)` 本身会看到列表而不是 `<list_reverseiterator object>`。
2. **`count('')`**：修在**派发**里而不是 `scount` 里 —— 在"已知名字"守卫之前加一个分支：
   方法名是 `count`、**没有第二个实参**（`NOT(GT(mcut, 0))`）、且第一个实参是空串时，
   直接给 `len(接收者) + 1`（空串在每个位置都算一次命中，含末尾）。
   带起点的形式在 v4.106 已经处理过，这里用"没有逗号"把它排除掉，两者不会打架。

## 3. 探针还发现（下轮候选）

同一轮探针（20 条）还暴露了这些，都没在本轮动：

| 代码 | 现状 | CPython |
|---|---|---|
| `[1, 2, 1].index(1, 1)` | 报找不到（**不带起点**） | `2` |
| `'a,b,c'.split(',', 1)` | `['a', 'b', 'c']`（**忽略 maxsplit**） | `['a', 'b,c']` |
| `d.pop('x', 9)` | `KeyError`（**不收默认值**） | `9` |
| `min(['bb', 'a'], key=len)` | `SyntaxError: expression` | `'a'` |
| `','.join([1])` | 打出 `1`（**静默接受非字符串**） | `TypeError: sequence item 0: expected str instance, int found` |

## 4. 实测

| 套件 | v4.106 | **v4.107** |
|---|---|---|
| `d261.json`（本轮新写 **12 条**：`reversed` 的列表/字符串/元组/字典/循环/求和/空表/不改原表/类型错、`count('')` 单参与带起点、`count` 正常值回归） | 3/12 | **12/12** |
| `d260` 12 · `d259` 12 · `d258` 14 · `d257` 9 · `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **129 套** | — | **128 套逐例相同**；2 处差异 = `d261` 的 10 条由错转对 + `featprobe3`（地址噪声）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,996 块 errors=0 | **26,062 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.106 共 97 版全 MATCH | **v4.10…v4.107 共 98 版全 MATCH** |

新增 1 个变量（`rv1`），**没有**新过程、新列表。

## 5. 仍缺 / 下一轮（v4.108）候选

1. `[1, 2, 1].index(1, 1)`：列表 `index` 收起始位置（与 v4.106 的 `count` 同一形态）
2. `','.join([1])` 应报 `TypeError`（**静默接受非字符串**，是"给错答案"那一类）
3. `'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
4. **多访问器路径别名**（`b = a[0][1]`；补丁与两条结论留档 `_work/v41/_p176_twoaccessor.txt`）
5. `min/max(key=…)`、扩展解包 `a, *rest = …`、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、
   字典 `|` 合并、`find`/`rfind`/`count` 的 `end` 参数（要先给字符串派发加 `sma3`）、视图集合语义、非 ASCII

## 6. 前后对比

```
print(list(reversed([1, 2, 3])))   v4.106: NameError   v4.107: [3, 2, 1]
print(list(reversed('abc')))       v4.106: NameError   v4.107: ['c', 'b', 'a']
print(list(reversed({'a': 1, 'b': 2})))
                                   v4.106: NameError   v4.107: ['b', 'a']
print(sum(reversed([1, 2, 3])))    v4.106: NameError   v4.107: 6
print('abc'.count(''))             v4.106: 0           v4.107: 4
print('abcabc'.count('b', 2))      v4.106: 1           v4.107: 1（不变）
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.107.sb3
node _work/v41/run.mjs MiniPy_v4.107.sb3 _work/cmp47/d261.json   # reversed + count('') 12 条
node _work/v41/run.mjs MiniPy_v4.107.sb3 _work/cmp47/d260.json   # 上一轮 12 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.107.sb3 -tag v4107 -ref v4106
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4107 -ref v4106
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.107.sb3 -tag v4107
node _work/v41/check41.cjs MiniPy_v4.107.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.106 还原： $env:V41_SKIP='P180'; $env:V41_OUT='…/MiniPy_v4.106.sb3'; $env:V41_STAMP='MiniPy v4.106 - built 2026-09-17'; node _work/v41/build41.js
```
