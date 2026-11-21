# MiniPy v4.41 更新说明

本轮补两处"复合表达式"缺口：**嵌套推导式**（F1，之前静默给错）和 **`enumerate()` / `zip()`**（E23/E24）。
两个补丁（P98、P99），`gaps433.json` 从 **48/63** 推到 **51/63**（E 44/55、F 2/2、G 5/6），
23 套既有回归**逐条零退化**。

产物 `MiniPy_v4.41.sb3`：Interpreter 12,848 块，合计 **14,277**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P98** | **F1** 嵌套推导式 | 外层推导式的"元素表达式"本身又是一个 `[...]`，`eval` 会重新进入 listlit → complist，而**内层把外层还在用的每一个暂存变量都覆盖了**（`cfor/cif/cilo/cihi/cacc/cv/cstep/cstop/cn/cok/...` 加 `CComm` 列表），于是外层用内层的边界继续循环、把元素追加进内层的累加器。修法与 P46 对 listlit 的修法同源：在 complist 的**每个 `eval` 调用**前后保存/恢复整套暂存区。保存/恢复放进两个小 warp 过程 `csave`/`crestore`（12 个调用点共用），补丁只多 24 个调用块，而不是内联的约 1500 块 |
| **P99** | **E23** `enumerate`、**E24** `zip` | 两个都是纯"造列表"：`listitem` 会解码 lsep 逐元素流，`lesc` 负责转义，嵌套容器就是 `lsep + 'T' + lesc(内层编码)`。于是 `enumerate(xs)` 生成 `[(0, xs[0]), ...]`、`zip(a, b, ...)` 生成到最短输入为止的元组列表。派发细节（本轮**用探针实测**出来的）：无顶层逗号的调用 `narg == 0`，eval 会用 `callfn(fn, lo+2, hi-1)` 把单个实参求好值再进 callfn——所以 `enumerate` 只要在 callfn 加一条分支；而 `zip(a, b)` 有一个逗号，**不能**走 callfn（callfn 开头那句 `eval(lo,hi)` 遇到"以 `[` 开头、以 `]` 结尾"的跨度会当成列表字面量，报 `TypeError: list index must be an integer`），改成在 eval 的 narg 分派**之前**挂 `zip` 钩子：先用 `hascomma` 判断（有逗号走 `tuplelit`，没有就整体 `eval`），再调 `zipbuild`，最后补一次 `fnlimit -1` 再 `stop this script` |

## 2. 本轮踩实的四条（都写进 README 了）

* **共享 reporter 是老问题的新变体**（上一轮记过）：本轮没再踩，但 `csave/crestore` 的写法专门避免了它——保存/恢复用**过程**而不是内联，调用点各建各的块。
* **"看起来是列表下标"的跨度会被 eval 误判**：`zip(a, b)` 的实参跨度 `[1, 2], [3, 4]` 以 `[` 开头、以 `]` 结尾，eval 的 listlit 分支先命中，于是 `indexget` 报 `list index must be an integer`。**修法不是在 callfn 里补救**（那时 `error` 已经写好了），而是要在**更外层**（eval 的 narg 分派之前）就用 `tuplelit` 自己收实参。
* **`narg` 是"顶层逗号个数"，不是参数个数**：`abs(-1)`、`enumerate(xs)` 的 `narg` 都是 0，都走 `callfn(lo+2, hi-1)`；`f(a, b)` 才是 1。这条是本轮用探针（往 eval 的 narg 分派前插一条日志）实测出来的，直接决定了 `enumerate` 和 `zip` 要挂在不同位置。
* **`stop this script` 出 eval 一定要补 `fnlimit -1`**（P90/P92 记过，本轮 `zip` 钩子又用到一次），否则 64 次之后报 `LimitError: expression depth`。

## 3. 实测

| 套件 | v4.40 | **v4.41** |
|---|---|---|
| `gaps433.json`（63 条） | 48/63 | **51/63**（E 44/55、F 2/2、G 5/6） |
| 23 套 battery | one2 1 / math 3 / dict 1 | **完全相同**（无退化；`comp` 仍 10/10） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 13,884 块 errors=0 | **14,277 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.40 MATCH | **v4.10…v4.41 共 32 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增临时用例集：`t99b.json`（enumerate/zip 16 条，**16/16**）、`t96.json` 的推导式三条全绿
（嵌套推导式、引用外层变量），只剩 `[x * y for x in ... for y in ...]` 这种**双 for 推导式**仍报
`SyntaxError: parentheses`（不在 63 条里）。

## 4. 本轮新发现（下一版候选，尚未修）

* **双 for 推导式**：`[x * y for x in range(3) for y in range(2)]` —— complist 只认第一个 `for`，
  第二个 `for` 落在"元素表达式"跨度里导致括号不平衡。
* **yield 元组**：`yield i, i + 1` 报 `TypeError: use str(number)`。
* **`'hello'.split()`（无参）** 按字符切，CPython 按空白切。
* **浮点 repr**：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号、大浮点用科学计数（`t92c` Q6/Q7/Q8/Q10）。
* `d.pop(k)` 目前把整个字典删空、`d.nope()` 的报错文案与 CPython 不同（P91 余项）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.41.sb3
node _work/v41/run.mjs MiniPy_v4.41.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps441_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.41.sb3 -out _work/v41/battery_v441.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.41.sb3 -tag check
node _work/v41/check41.cjs MiniPy_v4.41.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.40 还原： $env:V41_SKIP='P98,P99'; $env:V41_OUT='…/MiniPy_v4.40.sb3'; node _work/v41/build41.js
```

## 6. 下一版（v4.42）建议

1. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）——2 条
2. **E49** `try/finally`（P88 的正常完成路径可以复用）
3. **E46** 继承 `class B(A)` + `super()`
4. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）
5. **E43** 字典推导式 / **E44** 集合
6. **E28+E29** `*args` / `**kwargs`
7. **E32** `global`
8. **G5** 默认参数只求值一次（`def f(b=[])`）
9. **双 for 推导式**（`[x * y for x in ... for y in ...]`）
10. **yield 元组** / **浮点 repr**（见 §4）
