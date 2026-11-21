# MiniPy v4.130 介绍

> **一句话**：MiniPy 是**用 Scratch 积木写成的 Python 子集解释器**——一个 `.sb3` 文件，打开就能写代码、能跑、能单步，
> 控制台输出（连报错文案）与 **CPython 3.14** 逐字对齐。
>
> 本文讲"**是什么 + 怎么用**"；"这一版改了什么"见 `MiniPy_v4.130_更新说明.md`，
> "还缺什么"见 `_work/cmp47/v4_缺失清单.md`。

---

## 1. 是什么

### 1.1 定位

* 一个**跑在 Scratch 3 里的迷你 Python IDE**：代码编辑区 + 控制台 + 变量面板 + 两行按钮栏，全部由 Scratch 角色绘制。
* **不是转译器**：没有"生成 Python/JS"这一步。源文本 → 分词 → 语句分派 → 求值，整条链路都是积木。
* 规模（v4.130）：Interpreter **26,815 块** / Controller **2,017 块**（界面与键盘）/ TextRenderer **234 块** /
  Stage **24 块**，合计 **29,090 块**；由 `head.txt` + 175 个补丁部件 + `tail.txt`（共 177 个部件）组装而成。
* 目标是"**把 Python 常用面做厚**"，而不是覆盖 CPython 全集：常用语法、容器、类与继承、异常、生成器、
  推导式、`math`、`%` / `.format` / f-string 三套格式化都要能跑，并且**输出逐字一致**。

### 1.2 不是什么

* 不是 CPython 的移植，也不生成字节码；没有三方库（只有内建 `math`）、没有文件与网络。
* **源码必须是 ASCII**（中文注释 / 字符串会报 `SyntaxError: ASCII text required`）。
* **没有真正的对象模型**：值是"字符串 + 类型标记"，列表/字典是"分隔符编码 + 别名表"。
  这正是"默认参数共享"（`def f(b=[])`）这类语义做不到的根因。
* 屏幕上的一切都是**盖章画的**：95 个 6×11 的 SVG 字形，一个字符一个印记，没有字体渲染。

### 1.3 四个角色

| 角色 | 职责 |
|---|---|
| **Stage** | 绿旗时置初值 → 广播 `INIT` |
| **Controller** | 界面层：鼠标点击、键盘输入、代码编辑（含选取 / 复制粘贴 / 撤销）、按钮、面板滚动、DEMO/HELP、IMPORT/EXPORT；向 Interpreter 广播 `RUN` / `HALT` |
| **TextRenderer** | 用字形把代码页、控制台、变量面板、状态栏盖到舞台上（含行阴影、光标、选区色带） |
| **Interpreter** | 语言实现：分词、语句分派、表达式求值、异常、类与继承、生成器、格式化…… |

### 1.4 现在的水准（v4.130 实测）

| 指标 | 数值 |
|---|---|
| 缺口清单套件（`gaps433.json`，63 条独立探针） | **61/63**——只剩 E50（`with`）与 G5（默认参数共享），两条都判为"不做" |
| 功能探针（6 套 259 例） | **248/259**（余下是环境层限制与主动偏差，见 §6） |
| 历史版本可复现（`rebuild-old.ps1`） | v4.10 … v4.130 共 **121 版全 MATCH** |
| 结构体检（`check41.cjs`） | **errors = 0** |
| 界面探针 | **全部 ALL OK**：自动缩进 32 项断言 · 选取/复制/粘贴 33 · 导出往返 7 · 点击定位与滚动 12；两行按钮栏 / 撤销 / 折行 / HELP 为逐项打印核对 |
| 基准 `fib(16)` | interpSteps **6388**（自 v4.126 起没有退化），输出 `987` |

---

## 2. 怎么用

### 2.1 打开并启动

1. **Scratch 3**（网页版或离线编辑器）或 **TurboWarp** → 菜单 **文件 → 从电脑中上传** → 选 `MiniPy_v4.130.sb3`。
2. 点 **绿旗**：Stage 置初值 → 广播 `INIT` → 四个角色各自就位。
3. **先点一下舞台**再敲键盘（键盘事件只发给有焦点的舞台）。
4. 代码为空时启动会自动载入 **DEMO 1**，状态栏显示 `Demo 1`。

### 2.2 屏幕上有什么

```
┌────────────────────────────────────┬───────────────┐
│ MiniPy                 RUN STEP STOP│               │
│ main.py  ┌──────────────────────────┤  VARIABLES    │
│  1       │                          │  4 行 × 26 列  │
│  2       │     代码编辑区            ├───────────────┤
│  …       │     44 列可视 / 16 行一页 │  CONSOLE      │
│          │     （横向滚动 hscroll）  │  9 行 × 26 列  │
├──────────┴──────────────────────────┴───────────────┤
│ IMPORT EXPORT DEMO NEW UNDO HELP │ TAB ENTER BACKSPACE CASE │
│                                  │   SPEED   COPY   PASTE   │
└──────────────────────────────────┴──────────────────────────┘
```

* **顶栏右上**：`RUN` `STEP` `STOP`
* **底栏第一行**：`IMPORT` `EXPORT` `DEMO` `NEW` `UNDO` `HELP`，右边接着 `TAB` `ENTER` `BACKSPACE` `CASE`
* **底栏第二行**：`SPEED` `COPY` `PASTE`
* **状态栏**（最底）：`Ln 3 / 12`、`Col 5`、`Steps 128`，加一句自由文案（`Running` / `Undo: 7 left` / …）
* **字号**：v4.129 起三个面板字体放大 1.15 倍（步进 5.1 → 5.87px），列数相应收到 44 / 26

### 2.3 打字

* **点一行，直接打字**（有插入光标）；**双击行号**弹输入框，可整行改写或粘贴。
* **物理键盘能敲的**：`a`–`z`（受 `CASE` 开关影响）、`0`–`9`、**全部 32 个标点**
  （`` ` `` `-` `=` `[` `]` `\` `;` `'` `,` `.` `/` `~` `!` `@` `#` `$` `%` `^` `&` `*` `(` `)` `_` `+` `{` `}` `|` `:` `"` `<` `>` `?`）、
  **空格**、**Enter**、**Backspace**、**←/→**（移光标）。按住不放只插入一个字符。
* **屏幕键**：`TAB`（插 4 空格）、`ENTER`、`BACKSPACE`、`CASE`（大小写开关，点亮时状态栏 `Case UPPER on`）、`SPEED`（快/慢）。
* **ENTER 自动缩进**（v4.130）：新行继承当前行的缩进，**当前行以 `:` 结尾时再进一级**（4 空格）：

  | 当前行（光标在行尾） | ENTER 后新行 |
  |---|---|
  | `if x:` / `for i in range(3):` / `def f():` / `class A:` / `try:` / `else:` / `elif y:` / `except E:` / `finally:` | `    ` |
  | `    pass`（块内） | `    ` |
  | `    if y:`（嵌套） | `        ` |
  | `  print(1)`（写了 2 空格） | `  `（照抄，不强制 4 的倍数） |
  | `print(1)` / `x = {'a': 1}` | ``（不在冒号后，回到 0 列） |
  | `    `（只有空格的行） | ``（**连按两次 ENTER 就退出块**，且两行都清干净） |
  | `    # note` / `if x:  # note` | `    `（整行注释保持原级；冒号在 `#` 之前也认） |

  判定口径和各家 Python 编辑器一致：**缩进与"是否空行"看整行，冒号看光标之前那段**，
  所以在行中间回车不会把半行拆出怪缩进。
* **缩进宽度自由**：v4.85 起 2 / 3 / 4 / 6 … 空格都行（同一块内一致即可）；v4.86 起 **TAB 字符**也可用。
* **键盘的下限**：Scratch 运行时把**修饰键整个丢掉**（`keyboard.js` 里 `if (keyString.length > 1) return ''`），
  所以 Shift / Ctrl / Alt 任何积木都看不见——**没有 Ctrl+Z、没有 Shift+方向键**，选取只能靠鼠标（见 2.4）。

### 2.4 选取 / 复制 / 粘贴（v4.129）

* **拖拽选取**：在代码里按住拖过要选的部分（可跨行、可停在半行）；**双击正文**选中整行；
  单击别处或按方向键取消。选中的部分显示为**淡蓝色带**。
* **COPY**：复制选区；**没有选取时复制光标所在的整行**。
* **PASTE**：插在光标处；**有选取就先替换掉选区**。
* **打字 / 回车 / 退格**：同样先替换或删除选区（退格只删选区，不会多吃一个字符）。
* 剪贴板是项目内的列表（**不经过系统剪贴板**），所以搬代码不受浏览器权限影响。

### 2.5 运行与调试

* **RUN** 从头跑；**STEP** 一次一行，**函数体内部也是一行一点击**（暂停时状态栏 `Paused / STEP to advance`）；
  **STOP** 中断；**SPEED** 切慢速（1 行/帧，方便看过程）。
* **悬停 + ↑/↓ 滚动**（鼠标停在哪个区域就滚哪个）：

  | 鼠标停在 | 按 ↑/↓ |
  |---|---|
  | 控制台面板 | 输出（每页 9 行） |
  | 变量面板 | 变量列表（每页 4 行） |
  | 左侧**行号栏窄条** | 代码页（每页 16 行） |
  | 代码正文 | 不滚动——仍是移动光标 / 换选中行 |

* 变量面板每行 `名字 = 值`，超过 26 列截断显示。
* 运行中 `COPY` / `PASTE` 一律不动（避免和程序的输入打架）。

### 2.6 DEMO 与 HELP

* **DEMO**：循环切换 **13 个样例**（12 个来自 `demos.json` + 1 个 `input()` 样例），状态栏显示 `Demo N`。
  这就是一份"能力地图"：

  | # | 主题 | 演示内容 |
  |---|---|---|
  | 1 | Functions | `def`、形参、**默认参数**、`return` |
  | 2 | Recursion | 阶乘、斐波那契 |
  | 3 | String methods | `strip/upper/lower/replace/startswith/count`、切片 |
  | 4 | Lists and loops | `append/sort`、负下标、`len/sum`、切片、**列表推导** |
  | 5 | Tuples and unpacking | 解包交换、元组下标、`divmod` |
  | 6 | Dictionaries | 字面量、按键取值、值参与运算 |
  | 7 | Exceptions | `try/except ZeroDivisionError`、函数内 `raise ValueError` |
  | 8 | Classes | `class` / `__init__` / 方法 / `self.x` / 两个实例 |
  | 9 | Generators | `yield` + `list()` / `sum()` |
  | 10 | Modern expressions | 推导、`lambda`、f-string、`%` 格式化、`//` `%` `**` |
  | 11 | Math module | `math.floor/ceil/sqrt/pow`、`abs/round/max` |
  | 12 | Bits and bools | `& \| ^ << >>`、`~`、`any/all`、`in / not in`、单行 `if/else` |
  | 13 | Input and conversion | `input()` + `int()` 转换（交互样例） |

* **HELP**：**121 行**速查（13 个模块标题 + 13 个分隔空行 + 95 行正文），模块为 TYPING / BASICS / OPERATORS /
  DATA TYPES / STRINGS / FUNCTIONS / CLASSES / ERRORS / GENERATORS / BUILTINS / MODULES / DEMO / LIMITS，
  模块之间空一行，每行 ≤ 26 字符不折行。

### 2.7 代码的进出：IMPORT / EXPORT / NEW / UNDO

* **EXPORT**：把整份程序**合并成一行**写进 `Export` 列表，**行间用 `\n`**、行内反斜杠写成 `\\`，
  状态栏提示 `Export: 1 line, \n = newline`；**再点一次关闭**（它是个开关）。
  复制一次就能带走全部代码，而且**无损**——代码里有 `a | b` 也不会裂行。
* **IMPORT**：把导出文本粘回来即可；文本里没有 `\n` 时按**老格式**（裸 `|` 分隔）处理，所以旧导出仍能导入。
* **NEW**：清空程序（要求输入 `YES` 确认）。
* **UNDO**：**50 步撤销**。连续打字算一步（**每 10 个字符**或**静置 2 秒**断一次），
  换行 / 退格 / 移光标 / 点击各自开一步；状态栏显示 `Undo: N left`，退到头显示 `Nothing to undo`。

### 2.8 `input()`

走 Scratch 的**提问气泡**，提示语**不写进控制台**（CPython 会写 stdout）；在气泡里输入后回车继续。

---

## 3. 五分钟上手

**第 1 步**：敲进下面这段（括号、引号、冒号都能直接打；`if x:` 回车会自动缩进）：

```python
def area(w, h):
    return w * h
print(area(3, 4))
name = 'MiniPy'
print(f'{name} v4.130')
print(list(range(5)))
```

**第 2 步**：点 **RUN**，控制台得到：

```
12
MiniPy v4.130
[0, 1, 2, 3, 4]
```

**第 3 步**：想看清过程就点 **STEP** 一行一行走；嫌快就点 **SPEED** 切慢速。
**第 4 步**：点 **DEMO** 翻 13 个样例，点 **HELP** 开速查。

---

## 4. 必须知道的约定（否则会莫名报错）

| 约定 | 说明 |
|---|---|
| **源码必须 ASCII** | 中文注释 / 标识符 / 字符串一律 `SyntaxError: ASCII text required`（字形库也只有 ASCII） |
| **缩进宽度自由** | 2 / 3 / 4 / 6 … 空格都行（同一块内一致即可），TAB 字符也可用；**同一块内宽度不一致**报 `IndentationError: unexpected indent`（TAB 与空格混用反而不报 `TabError`，比 CPython 宽松） |
| **面板尺寸** | 代码区 **44 列可视**、16 行一页；控制台 **9 行 × 26 列**；变量面板 **4 行 × 26 列**（超长截断） |
| **硬上限** | 单行 240 字符（`LimitError: 240 chars per line`）；程序 **200 行**（`LimitError: 200 lines maximum`）；单个值 2048 字符（`LimitError: value exceeds 2048 chars`）；控制台保留 300 行 |
| **步数 / 递归** | 步数上限 `10000 + speed*90000`（慢速 1 万 / 快速 10 万，超出 `LimitError: step limit reached`）；函数体内另有 **2 万步**上限（`LimitError: step limit inside function`）；递归深度 **96**（`RecursionError: maximum recursion depth exceeded`） |
| **大整数** | 都是 JS number：`2 ** 53 + 1` 会失真 |
| **表达式深度** | 上限 **64** 层（超出 `LimitError: expression depth`） |

**有意为之的偏差**（不是 bug）：

* `range()` / `enumerate()` / `zip()` / 生成器表达式都**立即求值成列表**——所以 `print(range(3))` 打 `[0, 1, 2]`
  （CPython 打 `range(0, 3)`），`len(g)` 可用、`list(g)` 能取两次。
* 集合元素按**插入序**（CPython 按哈希序）；但 `==` 与子集比较按内容算。
* `print(实例)` 是 `<C object>`，不带 `0x…` 地址。
* `input()` 的提示语走提问气泡，不写进控制台。
* 控制台满 9 行整体上滚、**每行 26 列硬换行**——这是渲染网格，不是 Python 语义。

---

## 5. 支持范围速查

| 类别 | 支持 |
|---|---|
| **字面量与运算符** | 整数/浮点/科学计数 `1e-4`/`0x10`/`0b101`/`0o17`、字符串、`True/False/None`；`+ - * / // % **`、一元 `- ~ not`、比较与**链式比较**（`1 < 2 < 3` 语义正确）、`and or not`、`in / not in / is`、位运算 `& \| ^ << >>`（**含负数与布尔操作数**）、全部增强赋值、`a if c else b` |
| **字符串** | 下标/切片/步长/反向、`+ *`、`in`；`upper lower strip find rfind index rindex count replace startswith endswith split join title zfill isdigit isalpha isupper islower isspace isalnum ljust rjust center lstrip rstrip swapcase capitalize casefold partition rpartition format`。`strip/lstrip/rstrip` 支持**字符集**；`find/rfind/count/index` 支持 **start 与 end**（含负 start）；`split` 支持 `sep` 与 `maxsplit`，`split(None, n)` 走空白切分；另有 `rsplit`；`replace` 支持 count；位置参数给了 `None` 按"没给"处理 |
| **格式化** | `%`（标志 `-0+空格`、宽度、精度、`*`、`d i s r c f F x X o e E g G`、`#` 前缀、**映射键形式** `'%(a)s'`）；`'{} {}'.format(...)` 含**关键字**、**属性/下标路径** `'{a.b}'`/`'{a[1]}'`/`'{0[1]}'`、**嵌套规格** `'{:{w}}'`、`!r !s !a`、千分位 `{:,}`/`{:_}`；f-string 含格式规格与 `!r` |
| **列表 / 元组 / 字典 / 集合** | 字面量、嵌套、负下标、切片与切片赋值、`del`、`+ *`、别名语义、推导式（多条 `for`/`if`，列表/集合/字典三种）；列表方法 `append insert remove sort reverse pop extend clear index count copy`；**元组**切片/拼接/重复/`index`/`count`；**字典** `keys/values/items`（**真视图**：可 `list/len/for/in/sorted/sum`）、`get/pop(k,default)/update/setdefault/popitem/copy/clear`、`\|` 合并、`dict(x)`/`dict(a=1)`、重复键与相等按内容；**集合** 11 个方法 + `\| & - ^` + `issubset/issuperset/set()` |
| **解包** | `a, b = …`、`a, b = b, a`、`q, r = divmod(9, 4)`、**扩展解包 `a, *rest = …`**（`*init, last`、`a, *mid, b` 都行）、`for a, b in …`；**调用点解包** `f(*xs)` / `f(**d)` / `print(*xs)`（用户函数与 `print`） |
| **函数 / 生成器** | `def`、默认参数、**关键字参数**、`*args`/`**kwargs`、`global`、递归、闭包、`lambda`、函数当值、立即调用；`yield`（含 `yield a, b`）、生成器表达式、`for a, b in g()` |
| **类 / 异常 / 模块** | `class`、`__init__`、`self`、类属性、`__str__`、继承、**多继承 + C3 线性化**、`super()`、`A.hi(self)`、`isinstance`（含类型元组）、`issubclass`；`try/except/else/finally`、多子句与**元组子句**、`raise`、自定义异常类；`import math` / `import math as m` / `from math import sqrt`、`math.pi`/`e` |
| **内建函数** | `print`（`sep=/end=`）、`len str int float bool abs round pow chr ord divmod repr reversed bin hex oct list tuple dict set sorted(含 key=/reverse=) sum(起始值) any all min/max(含 key=) enumerate(起始值) zip range input type isinstance issubclass`；`max/min/sorted` 都**收字符串**（按字符）与字典（按键） |

---

## 6. 已知不做 / 已知偏差

下面每一条都由今天的 **20 条探针**重新实测过（`_work/cmp47/v4130_limits.json`，与 CPython 3.14 逐例对照）。

### 6.1 会报错（10 条：报错与 CPython 同族，属于"没做"）

| 写法 | MiniPy |
|---|---|
| `with open(...) as f` | 语法不支持 —— **判为不可对齐**：CPython 侧自己就抛 `FileNotFoundError`，报错行对不上 |
| `if (n := 3):` 海象 | `SyntaxError: expression` |
| `nonlocal n` | `SyntaxError: unsupported statement` |
| `1_000_000` 数字下划线 | `SyntaxError: expression` |
| `format(1.5, '.2f')` 内建 | `NameError`（`.format` 方法与 f-string 都正常） |
| `assert False, 'boom'` | 失败会报错，但不带消息 |
| `frozenset([1])` | `NameError` |
| `import os` | `ImportError: no module named os`（报错清晰） |
| `@classmethod` / `@staticmethod` | 装饰器不支持 |
| `for a, *r in …` | 报 unpack 错（赋值语句里的 `a, *r = …` 已支持） |

### 6.2 结果与 CPython 不同（6 条：主动偏差，不打算改）

| 写法 | MiniPy | CPython |
|---|---|---|
| `def f(b=[]): b.append(1); return b` 调两次 | `[1]`、`[1]` | `[1]`、`[1, 1]`（默认值对象复用）——需要真正的对象模型，**判为不做** |
| `max(*xs)` / `zip(*m)` 内建调用的 `*` 展开 | `SyntaxError: missing expression` | 正常展开 |
| `print({[1]})` 不可哈希元素 | 照常建集合（打印 `{[1]}`） | `TypeError: unhashable type: 'list'` |
| `e.args` | `AttributeError`（异常对象就是那条消息字符串） | `('x',)` |
| `d.keys() & {'a'}` 视图集合运算 | `TypeError: bitwise requires integers` | `{'a'}` |
| 非 ASCII 源码 | `SyntaxError: ASCII text required` | 正常（环境层约束，不会做） |

---

## 7. 最近修掉的静默错（留档）

**"元素是容器的列表"遍历次数算错** —— v4.123 时还在，**v4.125（P198）已修**：

| 代码 | v4.124（当时错） | v4.126 起（= CPython） |
|---|---|---|
| `for x in [[9], [8], [7]]: print(x)` | 只打印 `[9]`（1 次） | `[9]` `[8]` `[7]`（3 次） |
| `for x in [[1, 2, 3], [4, 5]]: print(len(x))` | `3` `2` `0`（3 次，第 3 个是空串） | `3` `2`（2 次） |

根因是 `forloop` 里两条列表路径的顺序不一致（`pushLoop` 在绑定第一个元素**之后**才推长度，长度被绑定搅掉）。
复现探针：`_work/cmp47/_nest.json`。

---

## 8. 想深入：真源、套件与复现

**`.sb3` 不是真源**——它由 `_work/v41/build41.js`（依次施加 175 个补丁）从 `MiniPy_v4.sb3` 生成。
要改功能：在 `_work/v41/pNNN.txt` 里写一个 patch，加进 `assemble.cjs` 的部件表再重建
（`head.txt` / `build41.js` 都是生成的，别手改 `project.json`）。

```bash
# 重建 + 结构体检
node _work/v41/assemble.cjs && node _work/v41/build41.js     # -> MiniPy_v4.130.sb3
node _work/v41/check41.cjs MiniPy_v4.130.sb3                 # 29,090 块 errors=0

# 与 CPython 3.14 逐例对照（无头、真实 scratch-vm 5.0.300）
node _work/v41/run.mjs MiniPy_v4.130.sb3 _work/cmp47/gaps433.json            # 63 条缺口 → 61/63
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.130.sb3 -tag check   # 6 套 259 例 → 248
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                              # 121 个历史版本复现

# 界面/键盘（run.mjs 注入的是 Code，验不了这些）
node _work/tests/mp_indent.mjs MiniPy_v4.130.sb3    # 自动缩进 32 项断言，ALL OK
node _work/tests/mp_clip.mjs   MiniPy_v4.130.sb3    # 选取 / 复制 / 粘贴 33 项断言，ALL OK
node _work/tests/mp_export.mjs MiniPy_v4.130.sb3    # 导出往返 7 项断言，ALL OK
node _work/tests/mp_click.mjs  MiniPy_v4.130.sb3    # 点击 → 行列、滚动窗口 12 项断言，ALL OK
node _work/tests/mp_keys3.mjs  MiniPy_v4.130.sb3    # 两行按钮栏：逐键打印（含死区）
node _work/tests/mp_undo.mjs   MiniPy_v4.130.sb3    # 50 步撤销 / 断步 / 0 行保护：逐场景打印
node _work/tests/mp_font.mjs   MiniPy_v4.130.sb3    # 26 列折行 + HELP（121 行 / 最长 26）
```

> 前四个探针自带断言（结尾 `ALL OK`），后三个是**逐项打印核对**（打印期望值让你看，不自己判 pass）。
> `run.mjs` 用共享的 `_work/v41/_tmp.py` 生成 CPython 对照，**别同时跑两份**（会互相踩出假失败）。
> 界面探针靠注入真实按键/鼠标事件（`vm.postIOData('keyboard'|'mouse', …)`）再读 `Code` / `status`。

**文档地图**

| 文件 | 内容 |
|---|---|
| `_work/cmp47/v4_缺失清单.md` | **还缺什么**（63 条独立探针 + backlog） |
| `_work/cmp47/v4130_limits.json` | §6 的 20 条"不支持 / 偏差"探针 |
| `_work/cmp47/v4130_limits_result.json` | 上面那 20 条对着 CPython 3.14 的逐例结果（14 同 / 6 异） |
| `_work/cmp47/gaps433_result.json` | 63 条缺口探针的逐例结果（61 同 / 2 异） |
| `_work/v41/支持范围与限制.md` | **支持什么**（✅/⚠️/❌ 三档支持矩阵） |
| `MiniPy_v4.130_更新说明.md` | 这一版改了什么（补丁、踩坑、实测） |
| `_work/v41/README.md` | 工程史与构建约定 |
| `_work/tests/README.md` | 界面/键盘探针怎么跑 |

---

*本文的界面、按键、上限与文案取自 v4.130 构建本体（背景图文本、Controller 键盘脚本、`help.json`、`demos.json`）；
§6 由当天的 20 条探针实测（`cases=20`，14 条与 CPython 一致），§1.4 的套件数字来自同一天的跑批。*
