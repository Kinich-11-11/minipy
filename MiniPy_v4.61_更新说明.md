# MiniPy v4.61 更新说明

本轮把**内建异常的消息文案**对齐 CPython——异常类一直都对，但冒号后面那段文本要么是空的、要么是旧版
CPython 的措辞，`except X as e: print(e)` 读出来就和 CPython 不一样。补丁 **P134**，一次修 12 组。

产物 `MiniPy_v4.61.sb3`：Interpreter 17,233 块，合计 **18,662**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；52 个历史版本全部可复现（v4.10…v4.61 MATCH）。

## 1. 修了什么（12 组，都是"只换消息文本"）

| 代码 | v4.60 的 `print(e)` | **v4.61**（= CPython 3.14） |
|---|---|---|
| `1/0` `1//0` `1%0` `1.0/0` `divmod(1,0)` | `''`（divmod 是 `integer division or modulo by zero`） | `division by zero` |
| `print(nosuch)` / `nosuchfn(1)` / `x += 1` 未定义 | `nosuch` / `function nosuchfn` | `name 'nosuch' is not defined` |
| `[1,2].index(3)` | `3 is not in list` | `list.index(x): x not in list` |
| `[1,2].remove(3)` | `3 is not in list` | `list.remove(x): x not in list` |
| `max([])` / `min([])` | `max() arg is an empty sequence`（**没有类名前缀，`except ValueError` 接不住**） | `max() iterable argument is empty` |
| `len(1)` / `len(1.5)` / `len(True)` | `len requires string` | `object of type 'int' has no len()` |
| `(1,2)[9]` | `list index out of range` | `tuple index out of range` |
| `{'a':1}['b']` | `b` | `'b'`（KeyError 打印的是 key 的 repr） |
| `int('x')` | `invalid number` | `invalid literal for int() with base 10: 'x'` |
| `int('x',2)` | `invalid literal for int()` | `invalid literal for int() with base 2: 'x'` |
| `float('x')` | `invalid number` | `could not convert string to float: 'x'` |
| `a, b = [1,2,3]` / `a, b, c = [1,2]` | `too many values to unpack` | `too many values to unpack (expected 2, got 3)` |
| `a, b = 1` | `cannot unpack non-iterable object` | `cannot unpack non-iterable int object` |
| `1 + 'a'` / `1 - 'a'` / `'a' ** 2` | `use str(number)` / `numeric operands` | `unsupported operand type(s) for +: 'int' and 'str'`（`**` 是 `** or pow()`） |

做法统一：找到那条 `fail %s`，把它的**消息输入**换成新文本。消息有的是纯字面量（`[1,[10,'…']]`），
有的是 `JOIN` 树，所以 `setMsg` 两种形态都要认；需要变量拼进去的（名字、类型、key）就先插几条
语句把值算进 `p6msg`，再 `"前缀" + p6msg`。控制流、handler 匹配（P51/P132/P133 都是**前缀测试**）、
`as e` 的绑定一律没动——只是绑出来的消息从空/旧措辞变成了 CPython 的样子。

## 2. 三个新踩的坑

1. **`setMsg` 把字面量消息包了两层**：`fail %s` 的输入是输入描述符，字面量是 `[1, [10, 'text']]`、
   块是 `[3, 块id, 影子]`。我第一版一律按"块"写，于是变成 `[1, [1, [10,'text']]]` ——
   **project.json 直接过不了 sb3 校验**（`Could not parse as a valid SB2 or SB3 project`，
   schema 报 `inputs[...][1] should be string`）。这是本项目第一次栽在 schema 上，但报错很准，
   一眼能定位到具体 block。
2. **两个同文案的站点光看条件分不开**：`list.index` 和 `list.remove` 的失败点都在同一个
   `if lmeth == "index" / else` 里（else 的父块就是那个 IF），按条件筛会同时命中。改用
   `remove` 那条独有的 `lres == 0` 测试来区分。
3. **求值顺序**：`int()`/`float()` 的原文在 P2 的 `trimsp` 之后已经被裁掉空格，而 CPython 的消息里
   保留原样（`int(' x ')` → `invalid literal for int() with base 10: ' x '`），所以要把 `ev`
   **在 `trimsp` 之前**存进 `p6v`。同理 `tname`/`castmsg` 都通过 `p6msg` 回话、不碰 `ev`
   （P131 的老教训：用 `ev` 回话的帮手会吃掉调用者的操作数）。
   另外 `newProc` 必须在 `callProc` 之前建好（构建器找不到定义会直接抛错）。

## 3. 实测

| 套件 | v4.60 | **v4.61** |
|---|---|---|
| `d190.json`（本轮新写 46 条：除零 9、名字错误、索引/键、类型错、int/float、解包、len、元组越界…） | 7/31 | **43/46** |
| `t107b.json`（`except X as e` 5 条） | 4/5 | **5/5** |
| `t107` 12 条 · `t123` 29 条 · `dict` 10 条 · `scope` 4 条 · `t137` 5 条 | — | **只有文案变化（都更接近 CPython）** |
| 84 套快照 | — | **76 套逐例相同**；9 处差异 = 7 处**预期内的文案改进**（`t107b` U2 由 fail 翻 pass）+ `t113` F6 的 CPython 集合哈希序（同一份 CPython 两次跑就 `["b","a"]`/`["a","b"]`）+ `d176` S4 换了另一种错法（本来就 fail，见 §5） |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 18,471 块 errors=0 | **18,662 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.60 共 51 版全 MATCH | **v4.10…v4.61 共 52 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 5 个变量（`p6v p6t p6msg p6msg2 p6op`）与 2 个过程（`tname`、`castmsg`、`keystr` 共 3 个），
列表数不变（97）。

## 4. 前后对比

```
try:  x = 1 / 0
except ZeroDivisionError as e: print(e)          v4.60: （空）        => division by zero

try:  print(nosuch)
except NameError as e: print(e)                  v4.60: nosuch        => name 'nosuch' is not defined

try:  x = [1, 2].index(3)
except ValueError as e: print(e)                 v4.60: 3 is not in list  => list.index(x): x not in list

try:  x = max([])
except ValueError as e: print(e)                 v4.60: （根本没接住，裸消息逃出去）
                                                                      => max() iterable argument is empty

try:  x = len(1)
except TypeError as e: print(e)                  v4.60: len requires string
                                                                      => object of type 'int' has no len()

try:  x = (1, 2)[9]
except IndexError as e: print(e)                 v4.60: list index out of range  => tuple index out of range

try:  x = {'a': 1}['b']
except KeyError as e: print(e)                   v4.60: b             => 'b'

try:  x = int('x')
except ValueError as e: print(e)                 v4.60: invalid number
                                                                      => invalid literal for int() with base 10: 'x'

try:  a, b = [1, 2, 3]
except ValueError as e: print(e)                 v4.60: too many values to unpack
                                                                      => too many values to unpack (expected 2, got 3)

try:  x = 1 + 'a'
except TypeError as e: print(e)                  v4.60: use str(number)
                                                                      => unsupported operand type(s) for +: 'int' and 'str'
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `1()` / `(1).foo` | 仍是 `SyntaxError: missing expression` / `SyntaxError: attribute access`，CPython 是 `TypeError: 'int' object is not callable` / `AttributeError: 'int' object has no attribute 'foo'`——这是**行为**缺口（要能对任意值做调用/属性），不是文案问题 |
| `(1, 2).index(9)` | 报 `AttributeError: only lists have methods`（元组的 `index`/`count` 还没做） |
| `sorted(xs, key='upper')` | 报 `NameError: name '' is not defined`（v4.60 是 `NameError: function `，两版都不对：那里 `fn` 已经空了，属于 P130 `callval` 的既存缺口） |
| `1 * 'a'` | 现在是 `unsupported operand type(s) for *: 'int' and 'str'`，CPython 是 `can't multiply sequence by non-int of type 'str'`（少数派分支，先接受） |
| `ZeroDivisionError` 的**裸** `raise ZeroDivisionError` | `str(e)` 仍是 `' '`（P51 的 `raise` 分支拼的是 `名字 + ': ' + 消息`），CPython 是 `''` |
| 菱形继承的 C3 顺序 | `class D(B, C)` 里 `super().hi()` 仍只走一个父类（`d159` E4） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.61.sb3
node _work/v41/run.mjs MiniPy_v4.61.sb3 _work/cmp47/d190.json  # 异常文案 46 条
node _work/v41/run.mjs MiniPy_v4.61.sb3 _work/cmp47/t107b.json # except as e 5 条
node _work/v41/run.mjs MiniPy_v4.61.sb3 _work/cmp47/t123.json  # finally 与跳转 29 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.61.sb3 -tag v461 -ref v460
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v461 -ref v460
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.61.sb3 -tag v461
node _work/v41/check41.cjs MiniPy_v4.61.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.60 还原： $env:V41_SKIP='P134'; $env:V41_OUT='…/MiniPy_v4.60.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.62）候选，按清单顺序

1. 菱形继承的 C3 顺序（`d159` E4 是现成反例）
2. 嵌套"带关键字 sorted"的状态栈（P101 遗留）
3. 元组子句里的未定义名字应报 `NameError`（v4.60 发现）
4. 元组的 `index` / `count`（本轮发现：`(1,2).index(9)` 说"only lists have methods"）
