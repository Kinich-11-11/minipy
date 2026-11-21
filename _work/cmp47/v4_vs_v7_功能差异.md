# MiniPy v4 vs v7 —— 实际功能差异（headless 实测）

方法：用真实 scratch-vm（`D:\users\OneDrive\Desktop\scratch-vm-test\node_modules\scratch-vm`，无头）
加载两个 .sb3，把程序写进全局列表 `Code`，广播 `RUN`，跑完后读 `Output / error / status`。

- 用例集：`_work/cmp47/features.json`（60 例）+ `focus.json`（7 例）+ `special.json`（4 例）
- 跑法：`node _work/cmp47/runprobe.mjs <sb3> features.json <out.json> 400`
- 原始结果：`feat_v4.json` / `feat_v7.json` / `focus_v4.json` / `focus_v7.json` / `spec_*.json`
- 对照表：`compare.txt`

## 0. 总账

| 判定 | 例数 |
|---|---|
| 两者行为完全一致 | 11 |
| 仅输出表示不同（1/0 vs True/False），语义相同 | 3 |
| **v7 能跑、v4 直接报错** | **41** |
| 两者都报错，但报错文本不同 | 5 |

（另有 input() 一类无法用无头方式驱动，未计入）

## 1. v7 能做、v4 做不到的（实测）

| 特性 | v4 | v7 |
|---|---|---|
| `def` 函数 / 参数 / 默认值 / 关键字实参 / `*args` / 递归 / 嵌套 / 闭包 | `IndentationError: unexpected indent`（**根本不支持函数**） | 全部正常（fib(10)=55、深递归 f(50)=50） |
| `lambda` | SyntaxError | `5` |
| `global` / `nonlocal` | 不支持 | 正常 |
| `class` / `__init__` / 方法 / 继承 | 不支持 | `Rex woof` / `BA` |
| `try/except/finally`、`raise`、自定义异常类 | 不支持 | `caught` / `t,f` / `got …` |
| `with`、`assert` | 不支持 | `enter,body,exit` / `assert caught` |
| `import math/json` | `SyntaxError: unsupported statement` | `4.0 2 3 3.14159…`、`{"a": 1}` |
| f-string `f"{x}"` | SyntaxError | `x=5` |
| 字符串方法 `.upper/.lower/.strip/.split/.join/.replace/.find/.startswith/.endswith/.format` | `AttributeError: only lists have methods` | 全部可用 |
| 字符串转义 `\\" \\t \\n \\\\` | `SyntaxError: unclosed string` | 正确 |
| `True/False/None` | True→1、False→0、**None 不存在**（NameError） | 真正的布尔与 None |
| 三元表达式 `a if c else b` | SyntaxError | `big` |
| 位运算 `& | ^ << >>` | SyntaxError | 能解析（**但结果为空的 bug，见 §2**） |
| `while…else` / `for…else` | `SyntaxError: elif/else without if` | 正常 |
| 列表推导式 | NameError | `[0, 1, 4, 9]` |
| 元组 / 字典 / 解包 | 不支持（除 `a,b=1,2`） | `(1, 2, 3)`、`{"a": 1}` |
| 列表 `.sort/.index/.count/.insert/.remove/.extend` | 只有 `append`（`.sort` 报 AttributeError） | 全部可用 |
| 列表切片 / `in` 成员判断 / 嵌套列表 | 都不支持（`in` 只认字符串） | `[2, 3]` / `True` / `a[0][1]`→`2` |
| 内置 `sorted/enumerate/zip/divmod/any/all/repr/type/list` | 没有（`sorted` → NameError） | 全部可用 |
| `max(a,b,c)` 三参数以上 | 泄漏内部错误名 `boperat_n7t2r0hc` | `5` |
| `**=` | SyntaxError | `169` |

## 2. v4 更正确、v7 反而出问题的地方（v7 bug）

| 用例 | v4 | v7 |
|---|---|---|
| `print("a" + 1)` | `TypeError: use str(number)`（报错） | **静默打印一个空行，无输出无报错** |
| `print(6 & 3)` 等位运算 | SyntaxError（明确报错） | 解析通过，**每个 print 输出空行**，无报错 |
| `def gen(): yield 1` + `list(gen())` | 不支持（报错） | 解析通过，**结果为空**，无报错 |
| `{1, 2, 3}`（集合字面量） | SyntaxError | 被当成 dict：`{1: 2, 3: }` |
| `__str__` | — | `print(P(3))` → `<object>`（`__str__` 不生效） |
| 异常实例 `print(e)` | — | `<object>` |

即 v7 的解析面比执行面宽：**不少 v4 会明确报错的写法，v7 变成"能过但结果错/为空"**。

## 3. 两者都报错、但文案不同

| 用例 | v4 | v7 |
|---|---|---|
| `1/0` | `Line 1: ZeroDivisionError` | `Error: Line 1: Uncaught: ZeroDivisionError: division by zero` |
| 语法错 `if True`（少冒号） | `Line 1: SyntaxError: expected colon` | `Error: Line 1: SyntaxError: expected :` |
| 未定义变量 | `NameError: undefined_variable` | `Uncaught: NameError: name 'undefined_variable' is not defined` |
| 下标越界 | `IndexError: list index out of range` | `Error: Line 2: Uncaught: IndexError: list index out of range` |
| 字符串下标赋值 | `TypeError: index assignment needs a list` | `Uncaught: IndexError: list assignment index out of range` |

v7 统一加了 `Error: Line N:` 前缀，运行时异常加 `Uncaught:`，消息文本向 CPython 靠拢。

## 4. 两者一致的部分（实测通过）

纯算术与优先级、`print("a", 1)` 多参数、`if/elif/else`、`while`+`break/continue`、
嵌套循环、`a, b = b, a` 解包交换、`#` 注释、`a[1] = 9` 列表元素赋值、`range` 在 `for` 中的 1~3 参数用法、
控制台 30 字符折行、状态栏文案（`Finished` / `Error / see console` / `Waiting for input`）——
外壳部分本来就没动，这些自然一致。

## 5. 性能与体积

| | v4 | v7 |
|---|---|---|
| 无头加载 .sb3 | ~0.20 s | ~1.10 s（**5.5×**） |
| 20000 次累加循环 | 910 帧 / **5236 ms** | 409 帧 / **2846 ms**（**约 1.8× 更快**） |
| 结果 | 199990000 | 199990000（一致） |

## 6. 未能验证

`input()`：两个版本在无头环境里都停在 `status = "Waiting for input"`（需要真实 UI 的点击/回车流程），
无法据此判断差异；两版 HELP 文本里都有 `name = input('Your name?')`。
