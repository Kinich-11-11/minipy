# MiniPy v4.128 介绍

> **一句话**：MiniPy 是**用 Scratch 积木写成的 Python 子集解释器**——单个 `.sb3` 文件，打开就能写代码、能跑、能单步，
> 控制台输出（含报错文案）与 **CPython 3.14** 逐字对齐。

---

## 1. 是什么

### 1.1 定位

* 一个**跑在 Scratch 3 里的迷你 Python IDE**：代码编辑区 + 控制台 + 变量面板 + 功能键行 + 按钮栏，全部由 Scratch 角色绘制。
* **不是转译器**：没有"生成 Python/JS"这一步。源文本 → 分词 → 逐行语句分派 → 求值，整条链路都是 Scratch 积木。
  v4.128：Interpreter 角色 **26,815 块**，全工程 **28,561 块**（其中 Controller 1,533 块负责界面与键盘）。
* 目标是"**把 Python 常用面做厚**"，而不是覆盖 CPython 全集：常用语法、容器、类与继承、异常、生成器、推导式、
  `math`、`%` / `.format` / f-string 三套格式化都要能跑，并且**输出逐字一致**（连报错消息也照 CPython 抄）。

### 1.2 不是什么

* 不是 CPython 的移植，也不生成字节码；没有三方库（只有内建 `math`）、没有文件与网络。
* **源码必须是 ASCII**（中文注释/字符串会报错）。
* **没有真正的对象模型**：值是"字符串 + 类型标记"，列表/字典是"分隔符编码 + 别名表"。
  这就是"默认参数共享"（`def f(b=[])`）这类语义做不到的根因。

### 1.3 工程结构（4 个角色）

| 角色 | 职责 |
|---|---|
| **Stage** | 绿旗时置初值 → 广播 `INIT` |
| **Controller** | 界面层：鼠标点击、键盘输入、代码编辑、按钮、面板滚动、DEMO/HELP、IMPORT/EXPORT；向 Interpreter 广播 `RUN` / `HALT` |
| **TextRenderer** | 用 ASCII 字形把控制台/变量面板/代码页画到舞台上 |
| **Interpreter** | 语言实现：分词、语句分派、表达式求值、异常、类与继承、生成器、格式化…… |

### 1.4 质量现状（v4.128 实测）

| 指标 | 数值 |
|---|---|
| 缺口清单套件（`gaps433.json`，63 条独立探针） | **61/63**——只剩 E50（`with`）与 G5（默认参数共享），文档判为"不做" |
| 功能探针（6 套 259 例） | **248/259**（余下是环境层限制与主动偏差，不是 bug） |
| 历史版本可复现（`rebuild-old.ps1`） | v4.10 … v4.128 共 **119 版全 MATCH** |
| 结构体检（`check41.cjs`） | errors = 0 |
| 基准 `fib(16)` | interpSteps 6388（多轮改动后**没有退化**） |

### 1.5 近况（v4.84 → v4.128）

* **补齐**：调用点解包 `f(*xs)`/`f(**d)`/`print(*xs)`、扩展解包 `a, *rest = …`、`dict(**d)`、
  `min/max(xs, key=f)`、`bin/hex/oct`、`reversed()`、`sum/enumerate` 的起始值、字典视图与 `|` 合并、
  嵌套规格 `'{:{w}}'`、`%c`、17 个字符串方法、`split(sep, maxsplit)`、`dict.pop(k, default)`……
* **放宽两条环境限制**：缩进宽度自由（v4.85）、**TAB 字符可用**（v4.86）。
* **修掉一批"静默给错答案"的老 bug**：链式比较 `1 < 2 < 3`、函数里改容器内容会丢、
  改"路径里的容器"整族（`a[0].append(2)`）、`b = a[0]; b.append(2)` 只改副本、
  多实参 `max/min` 不看最后一个实参、字符串字面量被当成逗号……
* **v4.125**：又修掉一个静默错——`for x in [[9], [8], [7]]` 这类"元素是容器的列表"只迭代一次（P198）。
* **v4.128**：字符串方法的**实参**收尾——`replace(old, new, count)` 与空模式（`'abc'.replace('','X')` 是
  `XaXbXcX`）、`startswith` / `endswith` 的 **`start`/`end` 区间**（`'abc'.startswith('b', 1)` 是 `True`，
  `'abc'.startswith('', 5)` 是 `False`）、`None` 当作"没给"（`find('a', None)` 是 `0`）、
  非整数位置实参按 CPython 报 `slice indices must be integers or None or have an __index__ method`（P201）。
* **v4.127**：字符串接口补齐——`find` / `rfind` / `count` / `index` 的 **`end` 边界**（str、list、tuple 都支持）
  与**负数 `start`**、**`split(None, maxsplit)`**、全新的 **`rsplit`**（P200）。从此 `'abcabc'.find('b', 2, 4)`、
  `'abcabc'.find('a', -3)`、`'a b  c'.split(None, 1)`、`'a,b,c'.rsplit(',')` 都与 CPython 逐字一致。
* **v4.126**：界面输入轮——32 个标点改成**物理键盘直接打**（`按下 (连接 字符 "") 键?` + 上升沿检测），
  右下角小键盘收成**一行 5 个功能键** `TAB` / `ENTER` / `BACKSPACE` / `CASE` / `SPEED`（P199）。

---

## 2. 怎么用

### 2.1 打开并启动

1. **Scratch 3**（网页版或离线编辑器）或 **TurboWarp** → 菜单 **文件 → 从电脑中上传** → 选 `MiniPy_v4.128.sb3`。
2. 点 **绿旗**：Stage 置初值 → 广播 `INIT` → Controller / TextRenderer / Interpreter 各自就位。
3. **先点一下舞台**再敲键盘（键盘事件只发给有焦点的舞台）。
4. 代码为空时启动会自动载入 **DEMO 1**，状态栏显示 `Demo 1`。

> 想做批量回归（无头跑、与 CPython 逐例比对）走另一条路：`node _work/v41/run.mjs`，见 §8。

### 2.2 屏幕上有什么

位置取自背景图：

```
┌────────────────────────────────────┬───────────────┐
│ MiniPy                 RUN STEP STOP│               │
│ main.py  ┌──────────────────────────┤  VARIABLES    │
│  1       │                          │  4 行 × 30 列  │
│  2       │   代码编辑区              ├───────────────┤
│  …       │   49 列可视 / 16 行一页   │  CONSOLE      │
│          │   （横向滚动 hscroll）    │  9 行 × 30 列  │
├──────────┴──────────────────────────┴───────────────┤
│ IMPORT EXPORT DEMO NEW UNDO HELP │TAB ENTER BACKSPACE CASE SPEED│
└──────────────────────────────────┴──────────────────────────────┘
```

* **顶栏右上**：`RUN` `STEP` `STOP`
* **底栏**：`IMPORT` `EXPORT` `DEMO` `NEW` `UNDO` `HELP`
* **右下角一行**：5 个功能键 `TAB` `ENTER` `BACKSPACE` `CASE` `SPEED`（v4.126 起不再有符号键盘，标点全部用物理键盘打）

### 2.3 输入代码

* **点一行，直接打字**（有插入光标）；**双击行号**弹出输入框，可整行改写或**粘贴**（HELP 里的 `Double-click line no.: edit`）。
* **物理键盘可以敲的**：`a`–`z`（受 `CASE` 开关影响）、`0`–`9`、**全部 32 个标点**
  （`` ` `` `-` `=` `[` `]` `\` `;` `'` `,` `.` `/` 以及 `~` `!` `@` `#` `$` `%` `^` `&` `*` `(` `)` `_` `+` `{` `}` `|` `:` `"` `<` `>` `?`）、
  **空格**、**Enter**（换行）、**Backspace**（删除）、**←/→**（移光标）。
  v4.126 起标点直接在键盘上打——`( ) [ ] { } | & ^ ~ :` 这些以前打不出来的字现在都能打。
* `CASE` 是**开关式**大小写：点亮后字母输入大写，状态栏 `Case UPPER on  (CASE lit)`；再点回小写（标点不受影响）。
* **缩进**：v4.85 起**宽度自由**——2 / 3 / 4 / 6 空格都行，只要同一个块里一致；v4.86 起**TAB 字符也可用**
  （粘贴进来的 TAB 缩进能跑）。屏幕上的 `TAB` 键插入 4 个空格。
  同一块里混用不同宽度仍按 CPython 报 `IndentationError: unexpected indent`。
* 实现注记：标点走的是侦测块 **`按下 (连接 字符 "") 键?`**（帽子的下拉菜单放不下这些字符），
  每帧轮询 32 个字符并做**上升沿检测**，所以按住不放只插入一个字符。

### 2.4 运行 / 单步 / 停止

| 按钮 | 行为 |
|---|---|
| **RUN** | 从头整跑；默认快速（每 50 行让出一帧重绘） |
| **STEP** | 一次一行；**函数体内部也是一行一点击**，暂停时状态栏 `Paused / STEP to advance` |
| **STOP** | 立即停止 |
| **SPEED** | 速度开关：`Speed FAST  (SPEED lit)` ↔ `Speed SLOW  (1 line/frame)`，慢速便于看清每一步 |

### 2.5 看输出、翻面板

* 控制台 **9 行 × 30 列**：超过 30 列**硬换行**，满 9 行整体上滚，最新一行落在最后一行。
* **自动跟随是有条件的**：只有视图本来就在底部附近才跟着滚；你往回翻看时，新输出不会把你顶回去。
* **滚动看板**：把鼠标**停在某个面板上**，按 **↑ / ↓**，每次滚一行，三个面板彼此独立：

| 鼠标停在 | 按 ↑/↓ 滚动 |
|---|---|
| 控制台面板 | 输出（每页 9 行） |
| 变量面板 | 变量列表（每页 4 行） |
| 左侧**行号栏窄条** | 代码页（每页 16 行） |
| 代码正文 | 不滚动——仍是移动光标 / 换选中行 |

* 变量面板每行 `名字 = 值`，**超过 30 列会截断**显示。

### 2.6 DEMO 与 HELP

* **DEMO**：循环切换 **13 个示例**，状态栏显示 `Demo N`。这 13 个样例就是一份"能力地图"：

  | # | 主题 | 演示内容 |
  |---|---|---|
  | 1 | Functions | `def`、形参、**默认参数**、`return` |
  | 2 | Recursion | 阶乘、斐波那契 |
  | 3 | String methods | `strip/upper/lower/replace/startswith/count`、切片 |
  | 4 | Lists and loops | `append/sort`、负下标、`len/sum`、切片、**列表推导** |
  | 5 | Tuples | 解包交换、元组下标、`divmod` |
  | 6 | Dictionaries | 字面量、按键取值、值参与运算 |
  | 7 | Exceptions | `try/except ZeroDivisionError`、函数内 `raise ValueError` |
  | 8 | Classes | `class` / `__init__` / 方法 / `self.x` / 两个实例 |
  | 9 | Generators | `yield` + `list()` / `sum()` |
  | 10 | Modern exprs | 推导、`lambda`、f-string、`%` 格式化、`//` `%` `**` |
  | 11 | Math module | `math.floor/ceil/sqrt/pow`、`abs/round/max` |
  | 12 | Bits and bools | `& \| ^ << >>`、`~`、`any/all`、`in / not in`、单行 `if/else` |
  | 13 | Input | `input()` + `int()` 转换（交互样例） |

* **HELP**：39 行速查，分 BASICS / FUNCTIONS / DATA / MORE 四组，每行 ≤ 30 字符不折行。

### 2.7 代码的进出：IMPORT / EXPORT / NEW / UNDO

* **EXPORT**：把整份程序**合并成一行**写进 `Export` 列表，行间用 `|` 连接，状态栏提示
  `Export: whole program on 1 line ( | = newline )`；再点一次关闭。复制一次就能带走全部代码。
* **IMPORT**：粘贴回来，`|` 还原成换行；行内要字面竖线写 `\|`（可无损往返）。
  ——这是输入 `[ ] { }` 这类"没有键位"的字符最省事的办法。
* **NEW**：清空程序（会要求输入 `YES` 确认）。
* **UNDO**：撤销一步（只有一级）。

### 2.8 `input()`

走 Scratch 的**提问气泡**，提示语**不写进控制台**（CPython 会写 stdout）；在气泡里输入后回车继续。

---

## 3. 五分钟上手

**第 1 步**：敲进下面这段（v4.126 起括号、引号、冒号都能直接打）：

```python
def area(w, h):
    return w * h
print(area(3, 4))
name = 'MiniPy'
print(f'{name} v4.128')
print(list(range(5)))
```

**第 2 步**：点 **RUN**，控制台得到：

```
12
MiniPy v4.128
[0, 1, 2, 3, 4]
```

**第 3 步**：想看清过程就点 **STEP** 一行一行走；嫌快就点 **SPEED** 切慢速。
**第 4 步**：点 **DEMO** 翻 13 个样例，点 **HELP** 开速查。

> 屏幕键盘现在只剩 5 个功能键（`TAB` `ENTER` `BACKSPACE` `CASE` `SPEED`）：标点全部用物理键盘打。

---

## 4. 必须知道的约定（否则会莫名报错）

| 约定 | 说明 |
|---|---|
| **源码必须 ASCII** | 中文注释 / 标识符 / 字符串一律 `SyntaxError: ASCII text required`（字形库也只有 ASCII） |
| **缩进宽度自由** | v4.85 起 2 / 3 / 4 / 6 … 空格都行（同一块内一致即可）；v4.86 起 TAB 字符也可用。混用报 `IndentationError: unexpected indent` |
| 面板尺寸 | 控制台 30×9；变量面板 4 行 × 30 列（超长**截断**）；代码区 49 列可视、16 行一页 |
| 硬上限 | 单行 240 字符（`LimitError: 240 chars per line`）；程序 **200 行**（`LimitError: 200 lines maximum`）；单个值 2048 字符（`LimitError: value exceeds 2048 chars`）；控制台 300 行 |
| 步数 / 递归 | 步数上限 `10000 + speed*90000`（慢速 1 万 / 快速 10 万，超出报 `LimitError: step limit reached`）；函数体内另有 `LimitError: step limit inside function`；递归深度 96（`RecursionError: maximum recursion depth exceeded`） |
| 大整数 | 都是 JS number：`2 ** 53 + 1` 会失真 |
| 表达式深度 | 上限 64 层（超出 `LimitError: expression depth`） |

**有意为之的偏差**（不是 bug）：

* `range()` / `enumerate()` / `zip()` / 生成器表达式都是**立即求值成列表**——所以 `print(range(3))` 打 `[0, 1, 2]`（CPython 打 `range(0, 3)`），`len(g)` 可用、`list(g)` 能取两次。
* 集合元素按**插入序**（CPython 按哈希序）；但 `==` / 子集比较按内容算。
* `print(实例)` 是 `<C object>`，不带 `0x…` 地址。
* `input()` 的提示语走提问气泡，不写进控制台。
* 控制台满 9 行整体上滚、每行 30 列硬换行——这是渲染网格，不是 Python 语义。

---

## 5. 支持范围速查

| 类别 | 支持 |
|---|---|
| **字面量与运算符** | 整数/浮点/科学计数 `1e-4`/`0x10`/`0b101`/`0o17`、字符串、`True/False/None`；`+ - * / // % **`、一元 `- ~ not`、比较与**链式比较**（`1 < 2 < 3` 语义正确）、`and or not`、`in / not in / is`、位运算 `& \| ^ << >>`（**含负数与布尔操作数**）、全部增强赋值、`a if c else b` |
| **字符串** | 下标/切片/步长/反向、`+ *`、`in`；`upper lower strip find rfind index rindex count replace startswith endswith split join title zfill isdigit isalpha isupper islower isspace isalnum ljust rjust center lstrip rstrip swapcase capitalize casefold partition rpartition format`（`strip/lstrip/rstrip` 支持**字符集**形式；`find/rfind/count/index` 支持**起始位置与结束位置** `start`/`end`；`startswith/endswith` 支持 **`start`/`end` 区间**；`replace` 支持 **`count`** 且空模式按 CPython 逐位插入；`split` 支持 `maxsplit`（含 `split(None, maxsplit)`），另有 `rsplit`（三种形式齐全）；位置实参收整数与布尔、**`None` 表示"没给"**，别的一律报 CPython 的 `slice indices must be integers or None or have an __index__ method`） |
| **格式化** | `%`（标志 `-0+空格`、宽度、精度、`*`、`d i s r c f F x X o e E g G`、`#` 前缀、**映射键形式** `'%(a)s'`）；`'{} {}'.format(...)` 含**关键字**、**属性/下标路径** `'{a.b}'`/`'{a[1]}'`/`'{0[1]}'`、**嵌套规格** `'{:{w}}'`、`!r !s !a`、千分位 `{:,}`/`{:_}`；f-string 含格式规格与 `!r`（`f'{x:>8}'`） |
| **列表 / 元组 / 字典 / 集合** | 字面量、嵌套、负下标、切片与切片赋值、`del`、`+ *`、别名语义、推导式（多条 `for`/`if`，列表/集合/字典三种）；列表方法 `append insert remove sort reverse pop extend clear index count copy`；**元组**切片/拼接/重复/`index`/`count`；**字典** `keys/values/items`（**真视图**：可 `list/len/for/in/sorted/sum`）、`get/pop(k,default)/update/setdefault/popitem/copy/clear`、`\|` 合并、`dict(x)`/`dict(a=1)`、重复键与相等按内容；**集合** 11 个方法 + `\| & - ^` + `issubset/issuperset/set()` |
| **解包** | `a, b = …`、`a, b = b, a`、`q, r = divmod(9, 4)`、**扩展解包 `a, *rest = …`**（`*init, last`、`a, *mid, b` 都行）、`for a, b in …`；**调用点解包** `f(*xs)` / `f(**d)` / `print(*xs)` |
| **函数 / 生成器** | `def`、默认参数、**关键字参数**、`*args`/`**kwargs`、`global`、递归、闭包、`lambda`、函数当值、立即调用；`yield`（含 `yield a, b`）、生成器表达式、`for a, b in g()` |
| **类 / 异常 / 模块** | `class`、`__init__`、`self`、类属性、`__str__`、继承、**多继承 + C3 线性化**、`super()`、`A.hi(self)`、`isinstance`（含类型元组）、`issubclass`；`try/except/else/finally`、多子句与**元组子句**、`raise`、自定义异常类；`import math` / `import math as m` / `from math import sqrt`、`math.pi`/`e` |
| **内建函数** | `print`（`sep=/end=`）、`len str int float bool abs round pow chr ord divmod repr **reversed bin hex oct** list tuple dict set sorted(含 key=/reverse=) sum(起始值) any all min/max(含 key=) enumerate(起始值) zip range input type isinstance issubclass`；`max/min/sorted` 都**收字符串**（按字符）与字典（按键） |

---

## 6. 已知不做 / 不支持

| 项 | 现状 |
|---|---|
| `with open(...) as f` | 语法不支持。**判为不可对齐**：CPython 侧自己就抛 `FileNotFoundError`，报错行对不上 |
| `def f(b=[])` 默认值共享 | 每次调用重建 `[]`。需要真正的对象模型（换心脏），**判为不做** |
| 非 ASCII 源码 | `SyntaxError: ASCII text required`（环境层约束，不会做） |
| `import os` 等其它模块 | `ImportError: no module named os`（报错清晰） |
| `frozenset` | 报 `NameError` |
| `{[1]}` 的不可哈希检查 | 不报（照常建集合） |
| `e.args` | 取不到（异常消息在隐藏属性里；`e` 打印出来是消息本身） |
| 海象运算符 `:=` | 报 `SyntaxError: expression` |
| `nonlocal` | 报 `SyntaxError: unsupported statement` |
| 数字下划线 `1_000_000` | 报 `SyntaxError: expression` |
| 内建 `format(x, '.2f')` | 报 `NameError`（`.format` 方法与 f-string 都正常） |
| `assert False, 'msg'` | 断言失败不带消息 |
| 内建调用的 `*` 展开 | `max(*xs)` / `zip(*m)` 报 `SyntaxError: missing expression`（**用户函数**与 `print` 的 `*` 展开已支持） |
| `@classmethod` / `@staticmethod` | 装饰器不支持 |
| `for a, *r in …`（for 头部的星号目标） | 报 `too many values to unpack`（赋值语句里的 `a, *r = …` 已支持） |
| 其它小项 | `d.pop(k, default, extra)`、视图的集合语义、`encode`/`translate`/`maketrans`/`format_map`/`isascii`/`isdecimal`/`isidentifier`/`isnumeric`/`isprintable`/`istitle` 这些**还没做的字符串方法** |

---

## 7. 最近修掉的静默错（留档）

**"元素是容器的列表"遍历次数算错** —— v4.123 时还在，**v4.125（P198）已修**：

| 代码 | v4.124（当时错） | **v4.126**（= CPython） |
|---|---|---|
| `for x in [[9], [8], [7]]: print(x)` | 只打印 `[9]`（1 次） | `[9]` `[8]` `[7]`（3 次） |
| `for x in [[1, 2, 3], [4, 5]]: print(len(x))` | `3` `2` `0`（3 次，第 3 个是空串） | `3` `2`（2 次） |

根因是 `forloop` 里两条列表路径的顺序不一致（`pushLoop` 在绑定第一个元素**之后**才推长度，
长度被第一个元素的绑定搅掉）。复现探针：`_work/cmp47/_nest.json`。

---

## 8. 想深入：真源、套件与复现

**`.sb3` 不是真源**——它由 `_work/v41/build41.js`（依次施加 P1 … P201 补丁）从 `MiniPy_v4.sb3` 生成。
要改功能：在 `_work/v41/pNNN.txt` 里写一个 patch，加进 `assemble.cjs` 的部件表再重建（`head.txt`/`build41.js` 都是生成的，别手改 `project.json`）。

```bash
# 重建 + 结构体检
node _work/v41/assemble.cjs && node _work/v41/build41.js     # -> MiniPy_v4.128.sb3
node _work/v41/check41.cjs MiniPy_v4.128.sb3                 # errors=0

# 与 CPython 3.14 逐例对照（无头、真实 scratch-vm 5.0.300）
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/gaps433.json            # 63 条缺口 → 61/63
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/d280.json               # 34 条字符串接口 → 34/34
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/d281.json               # 30 条字符串方法实参 → 30/30
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.128.sb3 -tag check   # 259 例
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                              # 119 个历史版本复现
```

> `run.mjs` 用共享的 `_work/v41/_tmp.py` 生成 CPython 对照，**别同时跑两份**（会互相踩出假失败）。
> 界面/键盘这类改动 `run.mjs` 验不了（它注入的是 `Code`），要用**真实按键/鼠标事件**的探针：
> `vm.postIOData('keyboard', {key:'(', isDown:true})` 与 `{x, y, isDown}`，然后读 `Code` / `status`。

**文档地图**

| 文件 | 内容 |
|---|---|
| `_work/cmp47/v4_缺失清单.md` | **还缺什么**（63 条独立探针 + 后续 backlog） |
| `_work/v41/支持范围与限制.md` | **支持什么**（✅/⚠️/❌ 三档支持矩阵） |
| `MiniPy_v4.128_更新说明.md` | 本轮改了什么（补丁、踩坑、实测） |
| `_work/v41/README.md` | 工程史与构建约定 |
| `_work/v41/run.mjs` · `check41.cjs` · `sweep.ps1` | 跑用例 / 结构体检 / 快照回归 |

---

*本文的界面、按键、上限与文案取自 v4.128 构建本体（背景图文本、Controller 键盘脚本、`help.json`、`demos.json`）；
"支持范围 / 已知不做"两节由 v4.126 上的 18 条实测探针确认（`cases=18 pass=10`）。8 条失败里：
**7 条是 §6 的不支持项**（海象 / `nonlocal` / 内建 `format()` / `assert` 消息 / `e.args` / `frozenset` /
内建 `*` 展开）、**1 条是探针口径**（"2 空格与 3 空格混用"：MiniPy 与 CPython 报的是同一句
`IndentationError: unexpected indent`，只是 MiniPy 还会把它写进自己的控制台，而探针没标 `expectError`）。
键盘那一套另行实测：32 个标点 **32/32** 可键入、按住只插一个、5 个功能键与 5 处死区全部符合预期。*
