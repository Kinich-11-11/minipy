# MiniPy v4.30 更新说明

本轮**更新了 DEMO 样例与程序内 HELP 文档**，并顺手补上两个样例暴露出来的语言缺口。

产物 `MiniPy_v4.30.sb3`：Interpreter 9,213 → **9,244** 块，Controller 1,136 → **1,214** 块，合计 **10,657**，`check41` errors=0。

## 0. DEMO：9 条旧样例 → 13 条新样例

旧样例是 v4 早期写的（只有赋值/循环/字符串下标），完全看不到后来补的东西。新的 13 条按能力组织：

| # | 主题 | 演示内容 |
|---|---|---|
| 1 | Functions | `def`、形参、**默认参数**、`return` |
| 2 | Recursion | 阶乘、斐波那契（递归调用 + 递归深度保护） |
| 3 | String methods | `strip/upper/lower/replace/startswith/count`、切片 |
| 4 | Lists and loops | `append/sort`、负下标、`len/sum`、切片、**列表推导**（含 `if` 过滤） |
| 5 | Tuples | 解包交换、元组下标、`divmod` |
| 6 | Dictionaries | 字面量、按键取值、值参与运算 |
| 7 | Exceptions | `try/except ZeroDivisionError`、函数内 `raise ValueError`、异常传播 |
| 8 | Classes | `class` / `__init__` / 方法 / `self.x` / 两个实例 |
| 9 | Generators | `yield` + `list()` / `sum()` |
| 10 | Modern exprs | 推导、`lambda`、f-string、`%` 格式化、`//` `%` `**` |
| 11 | Math module | `math.floor/ceil/sqrt/pow`、`abs/round/max`、浮点除法 |
| 12 | Bits and bools | `& | ^ << >>`、`~`、`any/all`、`in / not in`、单行 `if/else` |
| 13 | Input | `input()` + `int()` 转换（交互样例） |

**12 条非交互样例全部与 CPython 3.14 输出逐字一致**（`pass=12 fail=0`）：

```
node _work/v41/run.mjs MiniPy_v4.30.sb3 _work/v41/demos.json        # cases=12 pass=12 fail=0
node _work/v41/run.mjs MiniPy_v4.30.sb3 _work/v41/demos_input.json  # 交互样例（提示符走 Scratch 提问气泡）
```

第 13 条（`input`）无法与 CPython 的 stdout 比对：MiniPy 把提示符交给 Scratch 的 ask 气泡，不写进输出面板；
所以它单独放在 `demos_input.json`，只做「能跑通」的检查。样例数从 9 改为 13（`help` 里同步写成 `DEMO button: 13 samples`）。

## 1. HELP：内容更新 + 自动换行

旧帮助 24 行、只列了 v4 早期能力。新的帮助 37 行，按 BASICS / FUNCTIONS / DATA / MORE 分组（`_work/v41/help.json`），
覆盖 `def`+默认参数、`lambda`、容器字面量、字典、`class/self`、`try/except/raise`、`yield`、推导式、f-string、`import math` 等。

**换行检查结果（你问的那点）**：

| 面板 | 是否自动换行 | 说明 |
|---|---|---|
| 输出面板（程序 `print`） | **是** | Interpreter 的 `log %s` 每满 30 字符就 `append` 一行，天然按 30 列硬换行 |
| 帮助屏（HELP 按钮） | **原来没有 → 已修** | 旧代码直接逐行 `append`，而渲染器是 `text(s, x, y, 30, 0)`——**超出 30 列直接截断**；现在每行都过新增的 Controller 过程 `hwrap %s`（与 `log` 同样的 30 字符切分） |
| 代码编辑面板 | 否（设计如此） | 可视 49 列 + 横向滚动 `hscroll`，不折行 |
| 变量面板 | **否（仍是截断）** | `text(..., 30, 0)`，超过 30 字符的值会被截断；本轮未改动，属已知显示限制 |

另外在构建期加了断言：帮助文本每行不得超过 30 字符（当前最长 29），所以即使某行超长，`hwrap` 也只是兜底。

## 2. 样例暴露并顺手修掉的两个语言缺口（P57）

1. **`Point(3, 4)`（多参数类构造）报 `NameError: name Point is not defined`**：
   `eval` 的调用分支只在名字位于 `FnName` 或类型为 `F` 时才标为 callable，**类名两者都不是**；
   参数里出现逗号（narg>0）时走多参数分支，于是掉到兜底的 NameError。单参数调用（narg==0）走另一条路，
   所以此前 12 条类用例全绿、缺口被掩盖。修法：调用分支前先做一次 `ClsName` 精确成员检查，命中就 `callable = 1`。
2. **`~x` 完全不支持**（`print(~12)` → `SyntaxError: expression`）：一元运算符集合里只有 `- + not`。
   修法：把 `~` 加进 `eval` 的一元判断链，并在 `unary` 里实现 `~n = -n - 1`（沿用已有的「必须是数字」检查）。
   在此之前 `bit.json` 与缺口清单的位运算条目都没测过 `~`，所以这条也是新发现。

## 3. 构建侧的两处工程细节（写进 README 备查）

* DEMO/HELP 都在 **Controller** 目标里，而 `head.txt` 的构造辅助（`I/addTo/IF/REPEATU/...`）写死了 Interpreter；
  P56 因此自带一套按目标名传参的构造器（`B.B` / `B.chain` / `B.sub` 都传入 Controller）。
* `head.txt` 的 `pruneUnreachable()/relinkParents()` 也只走 Interpreter，Controller 里被替换掉的旧过程体会留下孤儿；
  P56 末尾补了 Controller 自己的 prune + relink（本次清掉 145 个旧块）。另外**一个块只能有一个 parent**，
  每个位置都要新建 `argument_reporter`，复用同一个会被 `check41` 抓成 `non-top block without parent`。

## 4. 复现

```
node _work/v41/assemble.cjs        # ... + p55 + p56 + p57 + tail.txt
node _work/v41/build41.js         # -> MiniPy_v4.30.sb3
node _work/v41/check41.cjs MiniPy_v4.30.sb3
node _work/v41/run.mjs MiniPy_v4.30.sb3 _work/v41/demos.json
```
