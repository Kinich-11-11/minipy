# MiniPy v4.124 更新说明

本轮补 **扩展解包赋值 `a, *rest = …`**（星号目标）。补丁 **P197**。

产物 `MiniPy_v4.124.sb3`：Interpreter 26,098 块，合计 **27,527**，`check41` errors=0。

> ⚠️ **本轮探针挖出一个更严重的既有 bug（下一轮第一候选）**：**遍历"元素是容器的列表"时循环次数错**
> ——`for x in [[9], [8], [7]]:` 只跑 **1** 次（CPython 3 次）、`for x in [[1,2,3],[4,5]]:` 跑 **3** 次（CPython 2 次），
> 而 `len(x)` 与下标访问都是对的。这是**静默给错答案**那一类，且 **v4.123 上同样存在**（不是本轮引入的）。
> 证据：`_work/cmp47/_nest.json`（v4.123 上 Q1/Q2 红、Q3/Q4/Q5 绿）。详见 §5。

## 1. 问题

| 代码 | v4.123（**错**） | **v4.124**（= CPython） |
|---|---|---|
| `a, *rest = [1, 2, 3]` | `SyntaxError: invalid assignment target` | `a=1`、`rest=[2, 3]` |
| `a, *rest = [1]` | 同上 | `rest=[]` |
| `*init, last = [1, 2, 3]` | `SyntaxError: missing expression` | `init=[1, 2]`、`last=3` |
| `a, *mid, b = [1, 2, 3, 4]` | `invalid assignment target` | `1` / `[2, 3]` / `4` |
| `a, *rest = (1, 2, 3)` | 同上 | `rest` 是**列表** `[2, 3]` |
| `a, *rest = 'abc'` | 同上 | `a='a'`、`rest=['b', 'c']` |
| `a, *r = {'x': 1, 'y': 2}` | 同上 | `a='x'`、`r=['y']`（按键迭代） |
| `a, *r = 1, 2, 3` | 同上 | `1` / `[2, 3]`（裸逗号元组） |
| `a, *r = []` | 同上 | `ValueError: not enough values to unpack (expected at least 1, got 0)` |
| `a, *r = 5` | 同上 | `TypeError: cannot unpack non-iterable int object` |
| `*r = [1, 2]` | 同上 | `SyntaxError: starred assignment target must be in a list or tuple` |
| `a, b = [1, 2]` / `q, r = divmod(9, 4)` | ✓ | 不变 |

## 2. 做法（三处，全在 `assignlist` 与它的调用点）

`assignlist` 用固定步长走目标：`if Kind[mi] != "I" then fail("invalid assignment target")` 且 `mi += 2`，
所以星号（标点）会把它顶掉；而**以 `*` 开头的目标**根本进不了 `assignlist`（语句派发把 `*` 当运算符，报
`missing expression`）。

1. **名字循环认识 `*name`**：遇到"标点 `*` + 名字"就把 `mi` 前进一格、把星号记进平行列表 `AStar`（每个名字一个 0/1）
   与 `auexs` 标志。**步长保持 2** —— 星号那一格已经在前面 `mi += 1` 抵掉了（`*name , name` 从 `*` 数正好是三格）。
2. **有星号时自己绑定**：整个右侧**只求值一次**（P84 的容器解包早就这么干），然后
   星号前的名字取前面的元素、星号后的名字取**最后**的元素、星号那个名字取**中间那一段并做成列表**
   （CPython 对元组源也给列表）。字符串按字符、字典按键、列表/元组/集合按元素；其它类型报
   `TypeError: cannot unpack non-iterable <类型> object`（类型名走 P134 的 `tname`）。
3. **以 `*name` 开头的语句**：`execute` 里"`名字 , … = …`"那条分支的条件是
   `Kind[1] == "I" and Tok[2] == ","`，星号形式的逗号晚一格 ⇒ 给该条件加一条"`Tok[1] == "*"` 且
   `Kind[2] == "I"` 且 `Tok[3] == ","`"的备选。

错误文案按**本机 CPython**（P185 的教训）：`ValueError: not enough values to unpack (expected at least N, got M)`、
`TypeError: cannot unpack non-iterable int object`、`SyntaxError: starred assignment target must be in a list or tuple`。

**踩到的两个坑**：①步长一度改成 `2 + auex`，于是 `*init, last` 里 `last` 被跳过（`AName` 只收了一个名字，
连带把"单独星号"的判据也误触发）——星号的前进已经在检测里做过，步长要留 2；②`a, *mid, b` 的中间段上界是
`aun - (名字数 - 星号位置)`，只要名字数对了它自然对（同一个步长 bug 的连锁反应）。

## 3. 实测

| 套件 | v4.123 | **v4.124** |
|---|---|---|
| `d278.json`（本轮新写 **27 条**：星号形式 13 条——`a,*rest`／`*init,last`／`a,*mid,b`／元组/字符串/字典/嵌套容器源／裸逗号右侧／变量源／函数内／`print(*r)`；报错 6 条——空源、名字不够、非可迭代、星号后名字没值、单独星号、解包数量不符；回归 6 条——普通解包、`divmod`、普通赋值、for 头解包、调用里 `*`、链式赋值；另有 2 条已知缺口） | 12/27 | **25/27**（星号 13/13、报错 6/6、回归 6/6） |
| `d277` 38（min/max key）· `d276` 38 · `d275` 38 · `d274` 42 · `d273` 27 · `d272` 29 · `d271` 31 · `d265` 32 · `d264` 32 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **147 套** | — | **144 套逐例相同**；差异 = `d278` 的 18 条**由错转对** + `t113` F6（CPython 集合遍历顺序那一处噪声，本轮落在 `t113`、上一轮在 `t111h`）+ `featprobe3` 的两条地址 ⇒ **MiniPy 侧零回归（`ref true` 0）** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,378 块 errors=0 | **27,527 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.123 共 114 版全 MATCH | **v4.10…v4.124 共 115 版全 MATCH** |

本轮多 149 块积木、7 个新变量（`auex`/`auexs`/`auk`/`aui`/`aux`/`auhi`/`aubuf`）、1 个新列表（`AStar`）。

## 4. 前后对比

```
a, *rest = [1, 2, 3]; print(a, rest)   v4.123: SyntaxError: invalid assignment target   v4.124: 1 [2, 3]
*init, last = [1, 2, 3]                v4.123: SyntaxError: missing expression          v4.124: init=[1, 2], last=3
a, *mid, b = [1, 2, 3, 4]              v4.123: SyntaxError: invalid assignment target   v4.124: 1 [2, 3] 4
a, *r = 'abc'                          v4.123: SyntaxError: invalid assignment target   v4.124: a=['b', 'c']（a='a'）
a, *r = []                             v4.123: SyntaxError: invalid assignment target   v4.124: ValueError: not enough values to unpack (expected at least 1, got 0)
a, b = [1, 2]                          v4.123: 1 2                                       v4.124: 1 2（不变）
```

## 5. 仍缺 / 下一轮（v4.125）候选

1. **【最高优先级 · 静默错】遍历"元素是容器的列表"时循环次数错**（本轮探针发现，v4.123 上同样存在）：
   `for x in [[9], [8], [7]]:` 只跑 1 次（CPython 3）、`for x in [[1,2,3],[4,5]]:` 跑 3 次（CPython 2，第 3 次元素是空串）；
   而 `len(x)` 正确（3/2）、下标 `x[0..2]` 正确、平铺列表/字符串/元组/字典的循环都正确。
   `[]` + `x.append([9])` 之后再遍历也只出第一个元素。**两个方向**：`len()` 与 `for` 用的是同一份编码却没给出同一答案，
   所以嫌疑在 for 循环那一侧的 `listlen`/`LoopText`/`listitem`（`forloop` 把 `listlen(ltmp)` 当 `LoopStop`，
   而 `listlen` 是"数 `lsep` 字符"的实现）。证据与探针：`_work/cmp47/_nest.json`、`d278` 的 U9。
2. for 头部的星号目标 `for a, *r in …`（当前报 `too many values to unpack`；要接到 `unpackto` 上）。
3. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）；方法调用 `obj.m(*xs)`。
4. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）。
5. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`。
6. `split(None, maxsplit)`；`rsplit`；视图集合语义；非 ASCII。（小候选：`sorted` 未知关键字文案补引号。）

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js           # -> MiniPy_v4.124.sb3
node _work/v41/run.mjs MiniPy_v4.124.sb3 _work/cmp47/d278.json    # 星号目标 27 条
node _work/v41/run.mjs MiniPy_v4.124.sb3 _work/cmp47/_nest.json   # 嵌套列表遍历 bug 的探针（Q1/Q2 仍红）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.124.sb3 -tag v4124 -ref v4123
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4124 -ref v4123
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.124.sb3 -tag v4124
node _work/v41/check41.cjs MiniPy_v4.124.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.123 还原： $env:V41_SKIP='P197'; $env:V41_OUT='…/MiniPy_v4.123.sb3'; $env:V41_STAMP='MiniPy v4.123 - built 2026-09-18'; node _work/v41/build41.js
```
