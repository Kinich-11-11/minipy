# MiniPy v4.102 更新说明

本轮补上 **`enumerate` 的起始值**：`enumerate(xs, 5)`、`enumerate('ab', -1)`、
`for i, c in enumerate(xs, 1):` 以前一律报 `NameError: name 'enumerate' is not defined`。补丁 **P175**。

产物 `MiniPy_v4.102.sb3`：Interpreter 24,238 块，合计 **25,667**，`check41` errors=0。

## 1. 问题

| 代码 | v4.101（**错**） | **v4.102**（= CPython） |
|---|---|---|
| `list(enumerate(['a', 'b']))` | `[(0, 'a'), (1, 'b')]` ✓ | 不变 |
| `list(enumerate(['a', 'b'], 5))` | `NameError: name 'enumerate' is not defined` | `[(5, 'a'), (6, 'b')]` |
| `list(enumerate('ab', -1))` | NameError | `[(-1, 'a'), (0, 'b')]` |
| `list(enumerate([], 4))` | NameError | `[]` |
| `for i, c in enumerate(['x', 'y'], 1)` | NameError | `1 x` / `2 y` |
| `list(enumerate(['a'], 1.0))` | NameError | `TypeError: 'float' object cannot be interpreted as an integer` |

## 2. 做法

P99 把 `enumerate(xs)` 装在 `callfn` 里：单实参的分支里 `ev`/`evtype` 已经是序列，下标用
`xsi - 1` 拼出来。而**只有"没有顶层逗号"的调用**才会走到那里（`eval` 的 `narg == 0` 分支负责
求值唯一实参、再把名字交给 `callfn`），所以两实参形式掉进"多实参内建"⇒ `NameError`。
与 P172 给 `sum(xs, start)` 的做法一致，两处改动：

1. **构造器的下标加上偏移**：把 `xsi - 1` 换成 `xsi - 1 + enoff`；
2. **`eval` 在 `narg` 派发之前再加一个钩子**（P99 的 `zip`、P172 的 `sum` 已经在那个位置）：
   顶层逗号恰好一个时，**先求值起始值**、不是整数就报 CPython 的
   `TypeError: '<类型>' object cannot be interpreted as an integer`（类型名走 `tname`，浮点一律拒绝），
   存进 `enoff`；再求值序列（`ev`/`evtype` 落在它上面），**在序列跨度上重入 `callfn`** ——
   枚举本身还是原来那段代码；最后把 `enoff` 归零。

**两个坑**：①**找构造器时按 `JSON.stringify(VALUE)` 搜变量名会落空**——变量藏在一层层 JOIN 的
**子积木**里；而且内联变量有两种形态（`[12,名字,id]` 与 `[3,[12,名字,id],影子]`），必须**遍历表达式树**
找（上一轮我就是这么误判"构造器不存在"的）。②**`hascomma` 不数大括号**，所以
`enumerate(sorted({1, 2}), 7)` 里的花括号逗号会被当顶层逗号、切分错位 ⇒ 钩子改成**自己扫一遍**
（`(`/`[`/`{` 一起计深度）。

## 3. 实测

| 套件 | v4.101 | **v4.102** |
|---|---|---|
| `d255.json`（本轮新写 **15 条**：单参、起始值、负数/零起始、`for` 解包、变量/表达式做起始、字符串/集合/元组/空序列、两次调用互不影响、浮点与字符串起始报错） | 4/15 | **15/15** |
| `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 · `d246` 64 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **124 套** | — | **121 套逐例相同**；4 处差异 = `d255` 的 13 条由错转对 + `t111h` M4 / `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,580 块 errors=0 | **25,667 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.101 共 92 版全 MATCH | **v4.10…v4.102 共 93 版全 MATCH** |

新增 1 个变量 `enoff` 与 5 个扫描变量（`e2*`），**没有**新过程、新列表。

## 4. 仍缺 / 下一轮（v4.103）候选

1. `min/max(key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
2. 多访问器的路径别名（`b = a[0][1]`）与非名字基名（`b = f()[0]`）
3. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
4. `find`/`rfind`/`count` 的 `start`/`end` 参数；`split(sep, maxsplit)`
5. 视图集合语义（`d.keys() == {'a'}`、`&`/`|`/`<`）、`sum(xs, start)` 的列表起始、非 ASCII

## 5. 前后对比

```
print(list(enumerate(['a', 'b'])))          v4.101: [(0, 'a'), (1, 'b')]   v4.102: 不变
print(list(enumerate(['a', 'b'], 5)))       v4.101: NameError              v4.102: [(5, 'a'), (6, 'b')]
print(list(enumerate('ab', -1)))            v4.101: NameError              v4.102: [(-1, 'a'), (0, 'b')]
for i, c in enumerate(['x', 'y'], 1):
    print(i, c)                             v4.101: NameError              v4.102: 1 x / 2 y
print(list(enumerate(sorted({1, 2}), 7)))   v4.101: NameError              v4.102: [(7, 1), (8, 2)]
```

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.102.sb3
node _work/v41/run.mjs MiniPy_v4.102.sb3 _work/cmp47/d255.json   # enumerate(start) 15 条
node _work/v41/run.mjs MiniPy_v4.102.sb3 _work/cmp47/d254.json   # 上一轮 20 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.102.sb3 -tag v4102 -ref v4101
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4102 -ref v4101
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.102.sb3 -tag v4102
node _work/v41/check41.cjs MiniPy_v4.102.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.101 还原： $env:V41_SKIP='P175'; $env:V41_OUT='…/MiniPy_v4.101.sb3'; $env:V41_STAMP='MiniPy v4.101 - built 2026-09-17'; node _work/v41/build41.js
```
