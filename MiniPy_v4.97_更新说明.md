# MiniPy v4.97 更新说明

本轮修掉**四个静默给错答案**的老 bug，全部围绕"容器里装容器"和 `list.pop(i)`。补丁 **P170**。

产物 `MiniPy_v4.97.sb3`：Interpreter 23,235 块，合计 **24,664**，`check41` errors=0。

## 1. 问题

| 代码 | v4.96（**错**） | **v4.97**（= CPython） |
|---|---|---|
| `c = [[0], [0]]` / `c[0] = [5]` | `[[], 5, [0]]` | `[[5], [0]]` |
| `a = [0, 1]` / `a[1] = {'k': 1}` | `[0, {}, 'k', 1]` | `[0, {'k': 1}]` |
| `a = [0, 1]` / `a[0] = (2, 3)` | `[(), 2, 3, 1]` | `[(2, 3), 1]` |
| `d = {}` / `d['a'] = {'b': 1}` | `{'1': {'b': 1}}`（**键变成 '1'**） | `{'a': {'b': 1}}` |
| `a = [9]` / `a.insert(0, [1])` | `[[], 1, 9]` | `[[1], 9]` |
| `a = [1, 2]` / `b = a[:]; b[0] = [9]` | `b` = `[[], 9, 2]` | `b` = `[[9], 2]` |
| `a = [1, 2, 3]` / `a.pop(0)` | `3`、剩 `[1, 2]`（**下标被忽略**） | `1`、剩 `[2, 3]` |
| `a = [1, 2, 3]` / `a.pop(-3)` | `3`、剩 `[1, 2]` | `1`、剩 `[2, 3]` |
| `a = [1]` / `a.pop(5)` | 返回 `1`（**不报错**） | `IndexError: pop index out of range` |
| `a = [1]` / `a.pop('x')` | 返回 `1` | `TypeError: 'str' object cannot be interpreted as an integer` |
| `a = [1, 2]` / `a.pop(1.0)` | 返回 `2` | `TypeError: 'float' object cannot be interpreted as an integer` |

## 2. 做法

**容器的编码**是 `lsep + 类型字符 + 转义后的文本` 一段接一段（`lsep` = 字符 31，转义符 = 字符 30），
所以**元素文本里绝不能出现 `lsep`**——`lesc` 就是干这个的（`lsep` → `30 1`，`30` → `30 0`），
`listlen`/`listitem` 全靠数 `lsep` 找边界。三处漏了转义/被冲掉：

1. **`indexset` 的列表分支**（基座）：它把刚求值出来的 `lval` **原样**拼进记录串
   ⇒ `c = [[0],[0]]; c[0] = [5]` 的值自带 `lsep`，被当成元素边界读成三个元素 `[[], 5, [0]]`。
   现在存之前先 `lesc(lval)`（存进 `lvesc`，语句返回值仍是未转义的 `lval`）。
   注意**切片赋值** `a[0:2] = [[9]]` 本来就是拼**整段记录串**，所以一直是好的（N11/N12 一直绿）。
2. **`indexset` 的字典分支**（基座）：键的类型与转义文本在**求值右边之前**就取好了，而字典/列表
   字面量的求值**会用到同一批暂存变量**（`dgkt`/`dgesc`/…）⇒ 键被字面量自己的记账冲掉，
   `d['a'] = {'b': 1}` 存成了键 `'1'`。现在键片段**一次拼好**存进 `dgkf`（`lsep + 类型 + 转义键`），
   没有任何其它代码碰它。
3. **`insert`（P13）**：它交给 `slicewrite` 的是**已经编码好的一段**（`lsep + 类型 + 文本`），
   而这段是从**未转义**的值拼的 ⇒ 和 (1) 同一个病。插入前先 `lesc(lneed)`（P138 修 `lsort` 重编码时
   用的是同一招）。
4. **`pop(i)`（基座）**：那条分支**根本没看参数**——永远取最后一个元素（`listitem(xa, ln)`），
   于是 `a = [1,2,3]; a.pop(0)` 答 `3` 且剩 `[1, 2]`。现在整个分支重建：
   数长度 → 空表报 `IndexError: pop from empty list` → 有参数就 `eval` 它，**不是整数就报 CPython 的
   `TypeError: '<类型>' object cannot be interpreted as an integer`**（类型名走现成的 `tname`，
   且**浮点一律拒绝**，`pop(1.0)` 也要报错，判据是文本里有没有 `.`）→ 负数加长度 →
   越界报 `IndexError: pop index out of range` → 新过程 **`lpopv 记录 下标`** 摘掉那一段并回填
   `ev`/`w3v`（被删掉的值）与 `w3t`。删完照旧 `assign` + `publish`（P169 的写回）⇒ **函数里 `x.pop(0)` 也生效**。

## 3. 两个坑

1. **重建 `pop` 分支会连 P169 的写回钩子一起删掉**：`publish` 是 P169 插在旧分支那句 `assign` 后面的，
   我用 `setStack` 整段换掉 SUBSTACK 时它一起没了 ⇒ `def f(x): x.pop(0)` 又变成改不动。
   新分支里必须**自己再挂一次 `publish`**（本轮 d249 的 N40/N41/N42 就是这个抓出来的）。
2. **`eval` 求值实参时会冲掉 `xa`/`ln`**（它们是解释器的公用暂存）：`lpopv` 和长度都得先用
   `w3s`/`w3n` 存下来（`a.pop(a[0])` 这种就会踩到）。另外 `VAR('lmeth')` 在这份产物里是
   **描述符** `[3,[12,'lmeth',id],[10,'']]`，按"内层是积木 id"找锚点会命中 0 个（P169 踩过同一个坑）。

## 4. 实测

| 套件 | v4.96 | **v4.97** |
|---|---|---|
| `d249.json`（本轮新写 **42 条**：容器元素互存 23 条（列表/字典/元组互存、`append`/`insert`/`remove`/`extend`/`reverse`/`sort`/切片赋值、切片读出后改、换入后取内层与长度、循环里 append、`pop` 出的容器）+ `pop` 19 条（`0`/`1`/`2`/`-1`/`-3`/无参、越界、空表、字符串下标、浮点下标、容器元素、连续 pop、函数里与参数里 pop）） | 21/42 | **42/42** |
| `d248` 61 · `d247` 45 · `d246` 64 · `d245` 30 · `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 | 全绿 | **全绿（不变，`d244` 仍只剩内建 `max(*xs)`）** |
| 快照 **120 套** | — | **117 套逐例相同**；3 处差异 = `d249` 的 20 条由错转对（另有 2 条改名）+ `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出都是 `a\|b`）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 24,579 块 errors=0 | **24,664 块 errors=0** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |
| `rebuild-old.ps1` | v4.10…v4.96 共 87 版全 MATCH | **v4.10…v4.97 共 88 版全 MATCH** |

新增 1 个过程（`lpopv`）、7 个变量（`lvesc` `dgkf` `w3s` `w3n` `w3i` `w3v` `w3t`）。

## 5. 本轮探针挖出的**既有 bug**：改"路径里的容器"整族都不生效（下轮首选）

| 代码 | 现状 | CPython |
|---|---|---|
| `a = [[1]]` / `a[0].append(2)` | 无变化 | `[[1, 2]]` |
| `d = {}` / `d['k'] = [1]` / `d['k'].append(2)` | 无变化 | `{'k': [1, 2]}` |
| `a = [[2, 1]]` / `a[0].sort()` | 无变化 | `[[1, 2]]` |
| `a = [[1]]` / `b = a[0]` / `b.append(2)` | `a` 无变化（`b` 变了） | `a` = `[[1, 2]]` |
| `a = [[1, 2]]` / `a[0][1] = 9` | `SyntaxError: expression` | `[[1, 9]]` |
| `k = K()` / `k.xs = [1]` / `k.xs.append(2)` | 无变化（顶层也丢） | `[1, 2]` |

根因是同一件事：**MiniPy 的容器是记录串，没有对象标识**，所以"把改好的内容写回原来的路径"
（`a[0]`、`d['k']`、`k.xs`）这条链没有实现——改的只是求值出来的那份临时副本。
`P169` 解决的是"写回外层**变量**"，这一族要的是"写回外层**路径**"。已存档探针 `_work/cmp47/_path.json`。

## 6. 前后对比

```
c = [[0], [0]]
c[0] = [5]
print(c)              v4.96: [[], 5, [0]]      v4.97: [[5], [0]]

d = {}
d['a'] = {'b': 1}
print(d)              v4.96: {'1': {'b': 1}}   v4.97: {'a': {'b': 1}}

a = [1, 2, 3]
print(a.pop(0), a)    v4.96: 3 [1, 2]          v4.97: 1 [2, 3]

a = [1, 2, 3]
print(a.pop(-3), a)   v4.96: 3 [1, 2]          v4.97: 1 [2, 3]

a = [1, 2, 3]
def f(x):
    x.pop(0)
f(a)
print(a)              v4.96: [1, 2, 3]         v4.97: [2, 3]

a = [9]
a.insert(0, [1])
print(a)              v4.96: [[], 1, 9]        v4.97: [[1], 9]
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.97.sb3
node _work/v41/run.mjs MiniPy_v4.97.sb3 _work/cmp47/d249.json  # 容器元素 + pop 42 条
node _work/v41/run.mjs MiniPy_v4.97.sb3 _work/cmp47/d248.json  # 上一轮 61 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.97.sb3 -tag v497 -ref v496
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v497 -ref v496
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.97.sb3 -tag v497
node _work/v41/check41.cjs MiniPy_v4.97.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.96 还原： $env:V41_SKIP='P170'; $env:V41_OUT='…/MiniPy_v4.96.sb3'; $env:V41_STAMP='MiniPy v4.96 - built 2026-09-17'; node _work/v41/build41.js
```

## 8. 下一轮（v4.98）候选

1. **改"路径里的容器"整族**（`a[0].append(2)`、`d['k'].append(2)`、`a[0].sort()`、`b = a[0]` 后改、
   `a[0][0] = 5`、`k.xs.append(2)`）——**静默给错答案，最高优先级**（见 §5）
2. 两层下标赋值 `a[0][1] = 9` 的解析（`SyntaxError: expression`）
3. `min/max(key=…)`、`enumerate(xs, start)`、`sum(xs, start)`、扩展解包 `a, *rest = …`
4. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. 全局数字 `n += 1` 在函数里当作局部读改写（CPython 是 `UnboundLocalError`）
