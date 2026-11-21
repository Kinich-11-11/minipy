# MiniPy v4.11 更新说明

本轮在 **v4.10** 的基础上补上缺口清单里最大的一块：**用户自定义函数**（清单 A1 / A2）。
产物 `MiniPy_v4.11.sb3`（Interpreter 4,211 → 5,457 块，变量 150 → 171，列表 13 → 36）。
外壳仍然逐字节沿用 v4 的 Stage / Controller / TextRenderer，只改 Interpreter。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | 文件 | v4 | v4.10 | **v4.11** |
|---|---|---|---|---|
| 缺口清单用例 | `_work/v41/gaps.json`（39 条） | 0/39 | 16/39 | **18/39** |
| 函数专项 | `_work/v41/func.json`（20 条） | 0/20 | 0/20 | **20/20** |
| 原有功能回归 | `_work/v41/regress.json`（15 条） | 11/15 | 14/15 | **14/15** |
| 结构体检 | `_work/v41/check41.cjs` | 0 err | 0 err | **0 err** |

本轮新闭合：**A1**（`def` 带默认参数）、**A2**（递归 / 嵌套调用 / 闭包式调用）。

## 1. 新增能力

| 能力 | 例子 → 结果 |
|---|---|
| `def` 定义、`return`、默认参数 | `def f(a, b=1): return a+b` → `f(2,3)=5`、`f(2)=3` |
| 递归 | `fib(12)` → `144`；线性递归 `f(20)` → `20`（深度上限 96，超过报 RecursionError） |
| 互递归 | `is_even/is_odd` 互相调用 → `True True` |
| 参数求值在调用者作用域 | `inc(inc(x))`、`f(g(1), h(2))` 都对 |
| 函数内 print / for / if / 列表方法 / 复合赋值 | `total([1,2,3,4])` → `10` |
| 作用域 | 函数内赋值不影响外部全局（`x=1; def g(): x=5` → `g(),x` 得 `5 1`）；只读全局可见 |
| 错误 | `return` 在函数外、参数过多/过少、递归过深都有明确报错 |

## 2. 实现要点（v4 是「源码行 + 记号区间」的解释器，没有 AST）

* `prepare` 里放开缩进校验，允许 `def` 后面跟缩进块；`Ends[]` 本来就是按缩进算的，
  于是「def 行跳过整个函数体」只需要 `dest = Ends[pc]`。
* 函数表是五张平行列表 `FnName/FnPN/FnPO/FnPar/FnDef/FnStart/FnEnd`（参数扁平存储 + 每函数起始偏移）。
* **调用是同步的**：新过程 `calluser` 自己跑一个"执行函数体"的循环（`boundary → tokenize → execute`），
  所以 `x = f(2) + 1` 这种"调用嵌在表达式里"的写法能自然工作；
  `execute` 里加了 `def` / `return` 两个分支，`return` 只置 `retflag` 并留下 `ev/evtype`。
* **作用域**：调用时把调用者的变量表整份压栈（`FN/FV/FT` + 每帧基址 `FrBase`），
  函数体直接沿用这张表（所以能读全局），返回时整份还原（所以函数内的赋值不泄漏，等价 Python 局部变量）。
* **共享全局的隔离**（这轮踩得最深的坑）：v4 的解释器把 `head/count/pending/dest/pc/branchjump/printbuf/Comma/…`
  当全局临时量用，没有调用栈时无所谓，一旦支持嵌套调用就会互相踩。
  现在 `fpush/fpop` 会在调用时把**所有可能被"能触达用户代码"的过程用到的**变量与列表整份入栈、返回时还原；
  这个集合由构建期做调用图可达性分析自动算出来（本轮：137 个变量 + 14 个列表，其余纯叶子过程的私有临时量不搬）。
  三个典型症状都是它引起的：`print(f(1), 2)` 里函数自己又 print（`Comma` 被冲）、
  `fib(n-1)+fib(n-2)`（`pc`/`Tok` 没还原）、`inc(inc(x))`（`UArgV` 被内层调用冲掉）。

## 3. 仍未做（v4.12 候选）

* `lambda`（A3）、`class`（A4）、`try/except/raise`（A5）、内置异常名（A6）、`import`（A7）、`yield`（A8）
  —— 其中 lambda 最省事：calluser 已经能跑"表达式体函数"，只差把 lambda 注册进函数表并让变量保存函数引用。
* dict / tuple / set 与嵌套列表（A12/A12b/A13）、推导式（A14）、f-string（A9）、字符串方法（A10）。
* 位运算（A16，Scratch 没有位运算块，要手写位循环）、`%` 格式化（A18）、单行复合语句（A20）、
  括号续行（A21）、`for/while … else`（A29）。
* `float` 独立 repr（B2）、列表别名语义（B5）。

## 4. 复现

```powershell
# 最新版（v4.11）
node _work/v41/build41.js
# 重建上一版（v4.10）：跳过 P14 即可，实测与随包的 MiniPy_v4.10.sb3 完全一致（4211 块 / 16:39）
$env:V41_SKIP='P14 def/return'; node _work/v41/build41.js

node _work/v41/check41.cjs MiniPy_v4.11.sb3                  # 结构体检
node _work/v41/run.mjs MiniPy_v4.11.sb3 _work/v41/func.json    # 函数专项 20/20
node _work/v41/run.mjs MiniPy_v4.11.sb3 _work/v41/gaps.json    # 缺口清单
node _work/v41/run.mjs MiniPy_v4.11.sb3 _work/v41/regress.json # 回归
```
