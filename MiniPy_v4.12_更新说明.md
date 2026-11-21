# MiniPy v4.12 更新说明

本轮在 v4.11（已支持 `def`/`return`/递归）的基础上再补三块：
**`lambda`**（A3）、**`for/while … else`**（A29/A29b）、**内置异常类名**（A6）。
产物 `MiniPy_v4.12.sb3`（Interpreter 5,457 → 5,705 块，变量 171 → 179，列表 36 → 41）。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | v4 | v4.10 | v4.11 | **v4.12** |
|---|---|---|---|---|
| 缺口清单 `gaps.json`（39 条） | 0/39 | 16/39 | 18/39 | **22/39** |
| 函数/语句专项 `func.json` | — | 0/20 | 20/20 | **31/31** |
| 原有回归 `regress.json`（15 条） | 11/15 | 14/15 | 14/15 | 14/15 |
| 结构体检 `check41.cjs` | 0 err | 0 err | 0 err | **0 err** |

## 1. 本轮新增

| # | 能力 | 例子 → 结果 |
|---|---|---|
| A3 | `lambda`（表达式体函数） | `f = lambda x: x+1` + `f(2)` → `3`；多参数、无参数、作实参传递（`apply(lambda x: x+10, 5)` → `15`）、体内调用已定义的函数都可用 |
| A29 | `for … else` / `while … else` | 循环正常结束才执行 else；`break` 会跳过 else 子句（与 Python 一致） |
| A6 | 内置异常类名 | `print(ValueError)` → `<class 'ValueError'>`；可赋给变量、放进列表、`str()` |

实现要点：
* **lambda** 复用 v4.11 的函数表，另加 `FnKind/FnLine/FnTlo/FnThi` 四张平行列表：
  `FnKind='L'` 表示"函数体是定义行上的一个记号区间"，调用时把 `pc` 切到定义行、
  `tokenize` 后直接 `eval` 该区间（所以体内还能再调用别的函数）。
  lambda 的值是类型 `F` 的"函数引用"（值 = 函数表下标），
  因此 `f = lambda …` 之后再 `f(2)`、或把函数当参数传给别的函数都能用。
  **限制**：只有"名字或变量"能被调用（`(lambda x: x)(5)`、`fs[0](7)` 这类对任意表达式取调用还不支持），
  这是因为 v4 的调用派发只认 `名(参数)` 形态。
* **循环 else**：`prepare` 里放开"else 前的同级行必须是 if/elif"的校验（现在允许 for/while），
  并新增 `LoopElse` 列表标记"这个 else 属于循环"；`execute` 的 else 分支据此**落入** else 体（而不是像 if-else 那样跳过），
  `break` 分支则跳到 `Ends[Elses[LoopHead]]` 跳过 else 体。
* **异常类名**是类型 `C` 的值（值为类名），`strval` 增加 `C` 分支打印 `<class 'X'>`；
  这为下一步做 `raise` / `try/except` 打底。

## 2. 仍未做（v4.13 候选，按性价比）

* **字符串方法**（A10：`upper/lower/strip/split/join/replace/find/startswith/endswith`）与 **f-string**（A9）
  —— 教学代码里最常用的两块，都不需要新的值模型。
* `try/except/raise`（A5，异常类名已就位）、`class`（A4）、`import math`（A7）、`yield`（A8）。
* 单行复合语句 `if x: y`（A20）、括号续行（A21）、位运算（A16）、`%` 格式化（A18）。
* dict / tuple / set 与嵌套列表（A12/A12b/A13）、推导式（A14）——需要新的值类型编码。
* `float` 独立 repr（B2）、列表别名语义（B5）——值模型层面的改造。

## 3. 复现

```powershell
node _work/v41/build41.js                                  # 最新版 v4.12
$env:V41_SKIP='P15 loop-else,P16 builtin classes,P17 lambda'; node _work/v41/build41.js   # 重建 v4.11
$env:V41_SKIP='P14 def/return,...'; node _work/v41/build41.js                             # 重建 v4.10

node _work/v41/check41.cjs MiniPy_v4.12.sb3
node _work/v41/run.mjs MiniPy_v4.12.sb3 _work/v41/func.json      # 31/31
node _work/v41/run.mjs MiniPy_v4.12.sb3 _work/v41/gaps.json      # 22/39
node _work/v41/run.mjs MiniPy_v4.12.sb3 _work/v41/regress.json   # 14/15
```
