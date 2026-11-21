# MiniPy v4.40 更新说明

本轮修三处"语句层"的老问题：**属性/下标的增广赋值**、**函数体末尾的循环只跑一次**（这条同时把生成器
"循环里 yield 只出一项"的静默错一起修了）、**`for v in <生成器>`**。三个补丁（P95、P96、P97），
`gaps433.json` 从 **46/63** 推到 **48/63**（E 42/55、F 1/2、G 5/6），
23 套既有回归**逐条零退化**，6 个 `featprobe` 从 **211/259** 升到 **219/259**。

产物 `MiniPy_v4.40.sb3`：Interpreter 12,268 → **12,455** 块，合计 **13,884**，`check41` errors=0。
`rebuild-old.ps1` 的 v4.10…v4.40 **共 31 版全 MATCH**。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P95** | —（不在 63 条里：本轮新发现的既存 bug） | `c.v += 1`、`self.v -= 1`、`a[0] += 5`、`d['k'] += 5` 全部报错。`execute` 的 `+= -= *= /= %=` 分支要求运算符就在 `Tok[2]`、`indexset` 要求 `Tok[右括号+1] == '='`，所以属性/下标形态直接掉进"表达式语句"兜底。修法：在 `execute` 链首（P55 的 `c.v = …` 分支之前）插两条分支，**把语句改写成普通赋值**（`Tok[4]='='`、值放到 `Tok[5]` 并把 `count` 收到 5；下标形态同理把 `Tok[lsp+1]` 改成 `=`），剩下的交给已有的属性/下标存储路径。值通过一个"带类型的字面量 token"传递（`Tok[n]=编码值`、`Kind[n]=类型`），`atom` 为 `L/T/D/B` 加一条早退分支——这样值的**类型**不会丢（`indexset` 会重新求值那段 token，普通字面量会丢类型、还会把右侧表达式算第二遍） |
| **P96** | **F2** | 顶层行驱动在 `(pc > len(Code)) and (len(LoopHead) == 0)` 才结束，正是这个"还有循环就再跑一步"的判据让 `boundary()`（循环回跳）能在循环体最后一行之后把 pc 拉回循环体；而 `calluser` 的函数体驱动只看 `pc > fend`，于是**只要循环体正好是函数最后一行，循环就只跑一次**（实测 `def f(): for i in range(3): print(i)` 只打印 `0`；生成器因此只 yield 一项）。修两处：① 退出判据改成 `(pc > fend) 且 本帧自己的循环都已关掉`（`FrLoop` 存着进入本帧时的循环栈深度，P14 返回时也按它回卷，所以调用者的循环不会把本帧留住）；② 步进守卫从 `pc <= len(Code)` 收紧成 `pc <= fend` |
| **P97** | **E55** | 生成器收集出来的编码是 `lsep+类型+转义值` 串，**和列表的编码逐字节相同**，只是标签是 `G`。`forloop` 的通用 `for x in <expr>` 分派条件是 `(evtype=='L') or (evtype=='T')`，补上 `or (evtype=='G')` 即可（下面只对 `ltmp` 调 `listlen/listitem`，不看标签） |

## 2. 本轮踩实的六条（都写进 README 了）

* **一个 Scratch 块只能有一个父节点——共享 reporter 会静默求值出错**。P95 一开始用
  `orChain(tokAt(4), [...])` 把**同一个** `Tok[4]` 块塞进 12 个比较里，结果整条条件恒为假
  （实测：分支根本不进）。改成传"工厂函数"、每次新建 reporter 后立刻正常。这条比想象中更硬：
  DAG 结构在 sb3 里能存、VM 里也不报错，只是**结果不对**。
* **`atom` 的早退分支不能覆盖 `N`/`S`**：给"带类型的字面量 token"加分支时，第一版把 `N`、`S` 也一起
  早退了，于是 P71 的数字字面量改写被跳过——`print(1e3)` 开始原样打印 `1e3`，`0x10`/`0b101` 同样。
  **23 套 battery 完全没发现**（普通数字走 `N` 路径的结果恰好一样），是 `gaps433` 的 E1–E3 抓到的。
  早退只该覆盖 tokenizer 不会产生的 `L/T/D/B`。
* **两个行驱动必须成对改**：只改 `calluser` 的退出判据，函数在循环结束后会继续往下执行**调用者的下一行**
  （实测：`f()` 自递归到 expression depth 上限）。必须同时把步进守卫收紧到 `pc <= fend`。
* **AND 要加在正确的项上**：把"没有未关的循环"与**整条**退出析取式相 AND，会让 `return`（`retflag`）
  也被循环挡住 → `func` 套件的 `[F] return inside loop` 立刻回退。正确形态是
  `((pc > fend) and 无未关循环) or 出错 or retflag or 没在运行`。
* **同一个形状的块有好几个，要按"子栈里调了什么"再筛一层**：`forloop` 里"`not(evtype=='L' or 'T')` +
  `fail`"是**解包**分支的守卫；通用 `for x in <expr>` 的分派其实是
  `control_if_else (evtype=='L' or 'T')`，其 SUBSTACK 里调 `pushLoop`、SUBSTACK2 里有 `fail`。
  第一版按"条件 + 有 fail"选中了解包那个，补丁打上去毫无效果（E55 照旧失败）。
* **V41_OUT 忘了设就会覆盖出货件**：本轮两次把 `MiniPy_v4.39.sb3` 写成了 v4.40 的内容，
  都靠 `V41_SKIP='P95,P96,P97'` + 显式 `V41_OUT` 重建还原（并核对块数 13,697 / errors=0）。
  测新补丁时**一律显式给 V41_OUT**。

## 3. 实测

| 套件 | v4.39 | **v4.40** |
|---|---|---|
| `gaps433.json`（63 条） | 46/63 | **48/63**（E 42/55、F 1/2、G 5/6） |
| 23 套 battery | one2 1 / math 3 / dict 1 | **逐字节相同**（无退化） |
| 6 个 `featprobe`（259 条） | 211/259 | **219/259**（`featprobe4` 14/14、`featprobe5` 10/10） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 13,697 块 errors=0 | **13,884 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.39 MATCH | **v4.10…v4.40 共 31 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（无退化） |

新增临时用例集：`t95.json`（增广赋值 18 条，16/18，余下两条只是报错文案不同）、
`t96.json`（生成器/推导式 15 条，10/15）、`t96b.json`（函数内循环 6 条，6/6）、
`t97.json`（生成器遍历 8 条，6/8，余下两条是 MiniPy 允许 `len(生成器)` 的既有扩展）。

## 4. 本轮新发现（下一版候选，尚未修）

* **F1 嵌套推导式**：`[[y for y in range(x)] for x in range(3)]` 给 `[[]]`；
  `[[y for y in range(2)] for x in range(2)]` 给 `[0, 1, [0, 1]]`（内外层状态串台）；
  `[x * y for x in range(3) for y in range(2)]` 报 `SyntaxError: parentheses`。
  形状和 P46 修过的"listlit 不可重入"一模一样：`complist` 的共享暂存区被内层覆盖。
* **yield 元组**：`yield i, i + 1` 报 `TypeError: use str(number)`（P83 的裸逗号元组没有走到 yield 分支的求值区间）。
* **`'hello'.split()`（无参）** 按字符切，CPython 按空白切。
* **浮点 repr**：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号、大浮点用科学计数（`t92c` Q6/Q7/Q8/Q10）。
* `d.pop(k)` 目前把整个字典删空、`d.nope()` 的报错文案与 CPython 不同（P91 余项）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.40.sb3
node _work/v41/run.mjs MiniPy_v4.40.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps440_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.40.sb3 -out _work/v41/battery_v440.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.40.sb3 -tag check
node _work/v41/check41.cjs MiniPy_v4.40.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.39 还原： $env:V41_SKIP='P95,P96,P97'; $env:V41_OUT='…/MiniPy_v4.39.sb3'; node _work/v41/build41.js
```

## 6. 下一版（v4.41）建议

1. **F1 嵌套推导式**（三条用例，`complist` 暂存区可重入化，照 P46 的 `saveState/restoreState` 抄）
2. **E49** `try/finally`（P88 的正常完成路径可以复用）
3. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）
4. **E23+E24** `enumerate` / `zip`（解包与 `for` 都已就绪，预先求值成 `[[i, v], ...]` 即可）
5. **E46** 继承 `class B(A)` + `super()`
6. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）
7. **E28+E29** `*args` / `**kwargs`
8. **E32** `global`
9. **yield 元组**（`yield i, i + 1`）
10. **浮点 repr**（`1e+16`/`1e-05`/`-0.0`/大浮点，见 §4）
