# MiniPy 介绍

> **一句话**：MiniPy 是一个**完全用 Scratch 3 积木写成的 Python 子集解释器 + 迷你 IDE**。一个 `.sb3` 文件，打开就能写代码、运行、单步、看变量和控制台；不需要 Node、Python、自定义扩展或外部服务。
>
> 本文以根目录的 `**[MiniPy_v5.3.sb3](MiniPy_v5.3.sb3)**` 为基准。v5.3 在 v5.2 的语言核心上重做了**演示层与帮助层**：内置样例从 20 个扩成 **30 个**（12 个功能各 2 个短例 + 6 个 100 行以上的混合大程序），HELP 重写为 v5.3 版；解释器语义与 v5.2 相同。
>
> 按功能分类的详细手册见 `**[MiniPy_v5.3_功能专辑.md](MiniPy_v5.3_功能专辑.md)**`。

---

## 1. 它是什么

### 1.1 定位

MiniPy 把一套“小型 Python 运行时”完整地放进 Scratch 角色里：

- **代码编辑区**：行号、光标、选取、复制粘贴、撤销、自动缩进、横向滚动；
- **解释器**：续行合并、单行 suite 拆分、分号拆分、分词、缩进配对、语句分派、表达式求值、函数帧、异常、生成器、类与模块；
- **输出面板**：控制台、变量面板、状态栏、错误行号；
- **文件进出**：IMPORT / EXPORT 一行式编码；
- **学习样例**：30 个 DEMO（1–24 短例、25–30 大程序）+ 多屏 HELP。

它**不是转译器**：没有“先生成 Python/JS 再执行”的步骤。源文本直接进入 Scratch 的解析与执行链路；`RUN`、`STEP`、`STOP`（内部广播 `HALT`）也全部由积木脚本驱动。

### 1.2 v5.3 的版本坐标


| 版本       | 组成                                  | 积木数        | 自定义过程   | 说明       |
| -------- | ----------------------------------- | ---------- | ------- | -------- |
| v5 核心    | 冻结 v4.267 + 9 个迁移补丁                 | 75,308     | 650     | 新基座      |
| v5.1     | 核心 + `dict-view-consumers`          | 75,320     | 650     | 字典视图消费修复 |
| v5.2     | v5.1 + `nested-reference-writeback` | 75,450     | 653     | 嵌套共享引用回写 |
| **v5.3** | **v5.2 + 30 个 DEMO + 新版 HELP**      | **75,162** | **653** | **本文基准** |


v5.3 文件信息：


| 项目          | 值                                                                   |
| ----------- | ------------------------------------------------------------------- |
| 文件          | `MiniPy_v5.3.sb3`                                                   |
| 大小          | 2,425,286 字节                                                        |
| SHA-256     | `DAC110716C68BF139C73FE8A4BBAFDB4C39ACF93B3008E23505BFE17D30839D97` |
| 角色          | Stage、Controller、TextRenderer、Interpreter                           |
| 归档资源        | 532 个（资源哈希与 v5 核心一致）                                                |
| DEMO / HELP | 30 个 DEMO；HELP 156 行输入、157 行输出                                      |
| 日期          | 2026-11-28                                                          |


v5.3 比 v5.2 少 288 块，是因为旧版 20 个样例的逐行 `addtolist(Code, ...)` 链被 **30 条 `DemoText` 数据 + 统一 `loadCode` 链**替换；Controller 从 2,196 块降到 1,908 块，Interpreter 仍是 72,995 块。语言语义、上限值和 v5.2 的两个修复都没有改变。

### 1.3 不是什么

- **不是 CPython 的移植**，也不生成字节码；没有完整的对象模型、GC、C 扩展和标准库。
- **没有文件、网络、进程和第三方包**；`os`、`open`、`requests` 这类能力不在范围内。
- **不是高性能运行时**：每条语句都要经过 Scratch VM 的积木调度，适合教学和小规模程序，不适合大数据或生产服务。
- **不是全 Unicode 编辑器**：字符串可以存 Unicode，但源码里的**标识符和数字**仍要求 ASCII；屏幕字形库本身也只有 ASCII 可见字符。

---

## 2. 打开与界面

### 2.1 启动

1. 用 **Scratch 3**（网页版、离线编辑器）或 **TurboWarp** 打开；
2. 菜单 **文件 → 从电脑中上传**，选择 `MiniPy_v5.3.sb3`；
3. 点 **绿旗**，四个角色初始化；
4. **先点一下舞台**，再敲键盘（Scratch 的键盘事件只发给有焦点的舞台）。

### 2.2 屏幕布局

```text
┌────────────────────────────────────┬──────────────────────┐
│ MiniPy                    RUN STEP STOP                   │
│ main.py  ┌─────────────────────────┤ VARIABLES            │
│  1       │ 代码区                  │  name = value        │
│  ...     │ 约 44 列 × 16 行一页    │  4 行一页            │
│          │                         ├──────────────────────┤
│          │                         │ CONSOLE              │
│          │                         │  26 列 × 9 行一页    │
├──────────┴─────────────────────────┴──────────────────────┤
│ IMPORT EXPORT DEMO NEW UNDO HELP │ TAB ENTER BACKSPACE CASE │
│ SPEED COPY PASTE                                          │
└───────────────────────────────────────────────────────────┘
```

- **代码区**：左侧行号栏 + 编辑正文；有当前执行行标记，支持横向滚动。
- **变量面板**：每行 `名字 = 值`，超出宽度截断。
- **控制台**：输出自动按 **26 列**折行，9 行一页；最多保留 2000 行。
- **状态栏**：显示行/列、步数，以及 `Running`、`Paused`、`Waiting for input`、`Undo: N left` 等提示。

### 2.3 按钮与快捷键


| 控件                          | 作用                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **RUN**                     | 从头运行；默认快速模式（warp）                                                                                                                         |
| **STEP**                    | 一次执行一行；**函数体内部也是一行一点击**，暂停时状态栏提示                                                                                                          |
| **STOP**                    | 中断当前运行（内部广播 `HALT`）                                                                                                                       |
| **SPEED**                   | 快/慢切换；慢速时约 1 行/帧，方便观察过程                                                                                                                   |
| **DEMO**                    | 循环载入 30 个内置样例（1–24 短例、25–30 大程序），状态栏显示 `Demo N`                                                                                           |
| **HELP**                    | 多屏速查：TYPING / BASICS / NUMBERS / STRINGS / CONTAINERS / CONTROL / FUNCTIONS / CLASSES / ERRORS / GENERATORS / BUILTINS / MODULES / LIMITS |
| **NEW**                     | 清空程序；需要输入 `YES` 确认                                                                                                                        |
| **UNDO**                    | 多步撤销（约 50 步）；状态栏显示剩余步数                                                                                                                    |
| **IMPORT / EXPORT**         | 把整份程序合并成一行导出；`\n` 表示换行，行内反斜杠写成 `\\`；旧式裸 `                                                                                                 |
| **COPY / PASTE**            | 项目内剪贴板，不经过系统剪贴板                                                                                                                           |
| **TAB / ENTER / BACKSPACE** | TAB 插入 4 个空格；ENTER 换行并自动缩进；BACKSPACE 删除                                                                                                   |
| **CASE**                    | 大小写开关，点亮时状态栏提示 `Case UPPER on`                                                                                                            |


**键盘操作要点**：

- 直接输入 `a`–`z`、`0`–`9`、空格和全部 ASCII 标点；
- 鼠标拖拽选取，双击正文选整行，双击行号可整行改写；
- 鼠标悬停在哪个面板，`↑/↓` 就滚动哪个面板；
- Scratch 运行时会丢弃 Shift/Ctrl/Alt 等修饰键，所以**没有 Ctrl+Z、没有 Shift+方向键选择**；撤销请用 `UNDO`。

### 2.4 运行、单步与停止

- **RUN** 从第一行开始执行；每次运行的源码先复制到解释器内部工作副本 `Src267`，**编辑器的 `Code` 不会被改写**。续行、单行 suite、分号、生成器辅助行都只改工作副本。
- **STEP** 与 RUN 共用同一套语句/表达式执行体，区别只是是否强制 warp；因此单步看到的语义与整跑一致。
- **STOP** 中断；下一次 RUN 会重新复制源码并清理路径/帧状态。
- 出错时控制台显示 `Line N: ...`；`SrcMap267` 把工作副本行号映射回编辑器原始行号，行号标记不会画到辅助行上。

### 2.5 输入与输出

- `print(...)` 支持多参数、`sep=`、`end=`；输出进入控制台并按 26 列折行。
- `input("提示")` 走 Scratch 的**提问气泡**；等待时状态栏显示 `Waiting for input`，输入后回车继续，返回值是字符串。
- 控制台只做“显示网格”，不会反过来影响 Python 语义；变量面板也是只读展示。

### 2.6 30 个 DEMO

DEMO 是一张现成的“能力地图”：**1–24 是 12 个功能各 2 个短例，25–30 是 6 个 100 行以上的混合大程序**。


| #   | 功能组     | 两个短例                                                    |
| --- | ------- | ------------------------------------------------------- |
| 1   | 基础语法与运算 | 1 Flow and decisions / 2 Operators and bits             |
| 2   | 数字与类型   | 3 Big integers and floats / 4 Types and conversions     |
| 3   | 字符串与格式化 | 5 Text methods / 6 Three format styles                  |
| 4   | 列表与元组   | 7 List methods and slices / 8 Tuples and unpacking      |
| 5   | 字典与集合   | 9 Dictionary methods / 10 Sets and frozensets           |
| 6   | 控制流与推导式 | 11 Loop control / 12 Comprehensions                     |
| 7   | 函数与闭包   | 13 Arguments and recursion / 14 Closures and decorators |
| 8   | 类与继承    | 15 Class basics / 16 Inheritance and MRO                |
| 9   | 异常处理    | 17 Try and custom errors / 18 Groups and context        |
| 10  | 生成器与迭代器 | 19 Yield and send / 20 Iterator tools                   |
| 11  | 内建函数与算法 | 21 Builtins in action / 22 Classic algorithms           |
| 12  | 模块与输入输出 | 23 Numeric modules / 24 Text, data, input               |



| #   | 大程序                  | 行数  | 主要内容                    |
| --- | -------------------- | --- | ----------------------- |
| 25  | Student grade report | 113 | 类、统计、排序、字典、异常、报告        |
| 26  | Text analysis report | 120 | 正则、词频、字母统计、排序、集合        |
| 27  | Bank account system  | 145 | 继承、property、自定义异常、转账、报表 |
| 28  | Matrix laboratory    | 157 | 矩阵类、运算符重载、行列式、快速幂       |
| 29  | Checkout simulation  | 175 | 类、队列、生成器、统计、日期、直方图      |
| 30  | Expression evaluator | 167 | 词法、调度场算法、RPN、异常、大整数     |


这些样例覆盖了本文后面列出的绝大多数语法；第一次使用建议从 DEMO 1 开始逐个翻。DEMO 的源码存放在 Stage 的 `DemoText` 列表中，每项用 `\n` 编码多行，`Controller/example` 调用 `loadCode(item demo of DemoText)` 载入。

---

## 3. 支持的功能

> 下面只列**已经实现并可运行**的能力。带“⚠️”的是有明确边界的项；完整的“不支持/差异”见第 5 节。

### 3.1 源码形态与词法


| 能力      | 说明                                                       |
| ------- | -------------------------------------------------------- |
| 注释与空行   | `#` 整行注释、行尾注释、空行                                         |
| 缩进      | 同一块内宽度一致即可：2/3/4/6/8 空格都行；TAB 也可以；TAB 与空格混用不报 `TabError` |
| 续行      | 反斜杠续行；圆括号/方括号/花括号内跨行                                     |
| 单行复合语句  | `if x > 0: print('yes')`、`for i in range(3): print(i)` 等 |
| 分号      | 顶层一行多条语句：`a = 1; b = 2`                                  |
| 字符串     | 单引号、双引号、三引号；支持 `\n`、`\t`、`\r`、`\\`、`\'`、`\"`、`\xNN`      |
| Unicode | 字符串和注释里可以直接写 Unicode；标识符、数字仍要求 ASCII                     |
| 字符范围    | ⚠️ `\uNNNN` 不展开；`chr()` 只接受可打印 ASCII 32–126              |


源码限制：最多 **1000 行**、单行最多 **2000 字符**、单个值最多 **16384 字符**。超过时分别报 `LimitError`。

### 3.2 类型与字面量


| 类型                                              | 支持情况                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `None`                                          | 字面量、比较、打印                                                |
| `bool`                                          | `True` / `False`；`bool` 是 `int` 的子类，`True + True == 2`   |
| `int`                                           | 十进制、`0x`、`0b`、`0o`；**大整数**（实测 `2 ** 1000`、`fact(30)` 精确） |
| `float`                                         | 小数、科学计数 `1e-5`、`inf`、`nan`；浮点排版对齐 CPython 的常见形式          |
| `complex`                                       | `1 + 2j`、`complex(a, b)`、`.real` / `.imag`、四则运算、`abs()`  |
| `str`                                           | Unicode 字符串；按**码点**计长、下标、切片；完整的大小写映射与 `casefold()`       |
| `list` / `tuple` / `dict` / `set` / `frozenset` | 字面量、嵌套、下标/切片、方法、别名语义                                     |


`type(x)` 返回完整的 `<class 'int'>` 这类形式；`isinstance` / `issubclass` 支持内建类型、用户类和类型元组。

### 3.3 运算符与表达式

- 算术：`+ - * / // % **`，一元 `-` / `+`，`divmod()`；`//` 和 `%` 采用 Python 的向下取整语义（`-7 // 2 == -4`，`-7 % 2 == 1`）。
- 比较：`== != < <= > >=`，支持**链式比较** `1 < 2 < 3`；每个操作数只求值一次，第一个为假时短路。
- 逻辑：`and` / `or` / `not`，短路并返回操作数。
- 成员与身份：`in` / `not in`、`is` / `is not`。
- 位运算：`& | ^ << >> ~`，支持负数与布尔操作数；布尔全部参与时结果仍为布尔。
- 增强赋值：`+= -= *= /= %= **= //=` 以及 `&= |= ^= <<= >>=`。
- 条件表达式：`a if c else b`。
- 序列运算：字符串/列表/元组的 `+`、`*`；字典的 `|` / `|=`；集合的 `| & - ^`。

⚠️ 不支持海象运算符 `:=`、`match` 模式匹配和类型注解（`x: int = 3`）。

### 3.4 语句与控制流


| 语句     | 支持情况                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 赋值     | `a = 1`、链式 `a = b = 0`、多重 `a, b = 1, 2`、交换 `a, b = b, a`                          |
| 解包     | 列表/元组/字符串/字典键；星号目标 `a, *rest = ...`、`*init, last = ...`、`a, *mid, b = ...`        |
| 下标/切片写 | `a[i] = x`、`a[i:j] = ...`、`del a[i]`、`del a[i:j]`；嵌套下标 `a[0][1] = 9` 可用           |
| 条件     | `if` / `elif` / `else`；单行 `if x: ...`                                             |
| 循环     | `while`、`for ... in ...`、`break`、`continue`、`pass`；`for/else`、`while/else`        |
| 推导式    | 列表、字典、集合推导式；多条 `for` / `if` 子句；生成器表达式                                             |
| 异常     | `try` / `except` / `else` / `finally`、`raise`、`assert`（可带消息）、`raise ... from ...` |
| 上下文    | `with`，支持单个/多个管理器，`__enter__` / `__exit__`                                        |
| 作用域    | `global`、`nonlocal`                                                               |
| 导入     | `import m`、`import m as x`、`from m import a, b`                                   |


⚠️ 嵌套切片赋值 `a[0][0:1] = ...` 仍不支持；嵌套**下标**赋值可用。`for a, *r in ...` 的星号目标已经可用。

### 3.5 函数与作用域

- `def`、位置参数、默认参数、**关键字参数**、`*args`、`**kwargs`；
- 仅位置参数 `/`、仅关键字参数 `*`；
- `lambda`、函数当值、立即调用、嵌套 `def`、闭包、递归；
- `return` 单值/多值（`return a, b`）；
- **默认参数的共享语义**：`def f(b=[])` 的默认列表在多次调用间复用，与 CPython 一致；
- 调用点展开：`f(*xs)`、`f(**d)`，可与普通实参、关键字实参混用；
- 装饰器：简单函数装饰器、`@property`、`@classmethod` 可用。

⚠️ 带参数的装饰器工厂 `@deco(10)`、`@staticmethod` 当前不支持；`async def` / `await` 不支持。

### 3.6 类与对象

- `class`、`__init__`、实例属性、类属性、方法、`self`；
- 继承、多继承、**C3 线性化**、`super()`、`A.method(self)` 显式父类调用；
- `isinstance` / `issubclass`；
- 常用特殊方法：
  - `__str__` / `__repr__`
  - `__len__` / `__getitem__`
  - `__add__` / `__eq__` / `__lt__`
  - `__bool__` / `__call__`
  - `__iter__` / `__next__`
  - `__enter__` / `__exit__`
- `@property`、`@classmethod`。

示例：

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def norm2(self):
        return self.x * self.x + self.y * self.y
    def __str__(self):
        return f'Point({self.x}, {self.y})'

p = Point(3, 4)
print(p.norm2())   # 25
print(p)           # Point(3, 4)
```

### 3.7 异常

- 内建异常：`Exception`、`ValueError`、`TypeError`、`NameError`、`IndexError`、`KeyError`、`ZeroDivisionError`、`RuntimeError`、`AssertionError`、`StopIteration`、`ImportError`、`SyntaxError` 等；
- `try/except/else/finally`；
- 多个 `except` 子句按顺序匹配；元组子句 `except (ValueError, KeyError) as e:`；
- `raise E('msg')`、裸 `raise` 重抛、`raise ... from ...`；
- 自定义异常类：`class MyErr(Exception): ...`，可按父类捕获；
- **异常组**：`ExceptionGroup` / `BaseExceptionGroup`、`except*` 分支；
- `e.args`、`e.__cause__` 可用；
- `assert False, 'boom'` 会把消息带给 `AssertionError`。

### 3.8 生成器与迭代器

- `yield`、`yield from`、`yield a, b`；
- `next(g)`、`g.send(v)`、`g.throw(...)`、`g.close()`；
- 生成器表达式：`sum(x * x for x in xs)`、`f(x for x in xs)`；
- `zip` / `map` / `filter` / `enumerate` 是**一次性迭代器**：`list(z)` 第二次为空；
- `iter()` / `next()`；
- `for` 可以直接遍历生成器、字典、字典视图、集合、字符串、元组。

⚠️ `range()` 仍会**立即生成列表**：`print(range(3))` 输出 `[0, 1, 2]`，不是 `range(0, 3)`；`reversed()` 返回列表。

### 3.9 内建函数


| 分组    | 函数                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| 输入输出  | `print`（`sep=`/`end=`/`*` 展开）、`input`                                                                                  |
| 类型/转换 | `bool`、`int`（支持 base）、`float`、`complex`、`str`、`list`、`tuple`、`dict`、`set`、`frozenset`、`type`                           |
| 数值    | `abs`、`round`（银行家舍入）、`pow`（含三参数模幂）、`divmod`、`min`、`max`、`sum`（可带起始值）                                                   |
| 序列/迭代 | `len`、`range`、`enumerate`（可带起始值）、`zip`、`map`、`filter`、`reversed`、`sorted`（`key=`/`reverse=`）、`iter`、`next`、`any`、`all` |
| 对象/内省 | `isinstance`、`issubclass`、`getattr`、`setattr`、`hasattr`、`callable`、`hash`、`repr`                                       |
| 字符/进制 | `chr`（ASCII 32–126）、`ord`（支持 Unicode 码点）、`bin`、`hex`、`oct`                                                             |


⚠️ `format()` 内建、`bytes()`、`object`、`id()`、`exec()`、`eval()` 不在支持范围；`super` 只在类/方法场景可用。

### 3.10 字符串与格式化

**常用方法**：

- 大小写：`upper`、`lower`、`title`、`capitalize`、`swapcase`、`casefold`；
- 修剪/填充：`strip`、`lstrip`、`rstrip`、`ljust`、`rjust`、`center`、`zfill`、`expandtabs`；
- 查找/替换：`find`、`rfind`、`index`、`rindex`、`count`、`replace`、`startswith`、`endswith`；
- 切分/连接：`split`、`rsplit`、`splitlines`、`join`、`partition`、`rpartition`；
- 判断：`isdigit`、`isalpha`、`isalnum`、`isupper`、`islower`、`isspace`；
- 前后缀：`removeprefix`、`removesuffix`。

**三种格式化方式都可用**：

```python
name = 'MiniPy'
n = 7
x = 3.14159
print('%s v%d' % (name, n))
print('{} v{}'.format(name, n))
print(f'{name} v{n}, {x:.2f}, {255:#06x}')
```

`%` 支持常见转换符、宽度/精度、`*` 从实参取宽度、映射键形式；`.format` 支持位置/关键字字段、下标路径、嵌套规格、`!r/!s`、千分位、进制和百分比；f-string 支持表达式、`!r/!s` 和格式规格。

⚠️ `istitle` 等少数判定方法尚未覆盖；`'\u4e2d'` 不会变成“中”，只会保留字面反斜杠和 `u`。

### 3.11 容器


| 容器                  | 支持                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **list**            | 字面量/嵌套、正负下标、切片、切片赋值、`del`、`+`、`*`、别名；`append`、`insert`、`remove`、`pop`、`sort`、`reverse`、`extend`、`clear`、`index`、`count`、`copy`；`sorted(key=, reverse=)`    |
| **tuple**           | 带括号/裸逗号字面量、下标、切片、`+`、`*`、`index`、`count`；解包                                                                                                                |
| **dict**            | 字面量/嵌套、读/写/`del`、`len`、`in`、`for k in d`；`keys/values/items`（真视图）、`get`、`pop`、`popitem`、`update`、`setdefault`、`copy`、`clear`；`                             |
| **set / frozenset** | 字面量、推导式、`add`、`remove`、`discard`、`clear`、`update`、`union`、`intersection`、`difference`、`symmetric_difference`、`copy`、`isdisjoint`、`issubset`、`issuperset`；` |


**字典视图**是 v5.2 的重点修复项：

```python
d = {'a': 1}
v = d.values()
d['b'] = 2
print(v)                 # dict_values([1, 2])
print([x for x in v])    # [1, 2]
```

直接 `print`、`for`、`in`、`len`、`sorted`、`sum`、推导式和部分集合运算都能消费视图；但显式 `repr(v)` / `str(v)` 仍可能显示成列表样式，视图迭代器的完整生命周期语义也仍有边界。

### 3.12 模块

支持 `import m`、`import m as x`、`from m import ...`。当前覆盖：


| 模块            | 主要能力                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `math`        | `pi`、`e`、`floor`、`ceil`、`trunc`、`fabs`、`sqrt`、`pow`、`exp`、`log`、`log10`、`sin/cos/tan`、反三角、双曲、`fmod`、`gcd`、`factorial`、`isclose`                |
| `cmath`       | 复数 `sqrt`、`phase`、`exp`、`log`、三角/反三角、极坐标等                                                                                                      |
| `time`        | `time`、`time_ns`、`perf_counter`、`monotonic`、`process_time`、`sleep`、`gmtime`、`localtime`、`strftime`、`asctime`、`ctime`                           |
| `datetime`    | `date`、`datetime`、`timedelta`；`isoformat`、`weekday`、`strftime`、日期加减                                                                            |
| `random`      | `seed`、`random`、`randint`、`randrange`、`choice`、`choices`、`shuffle`、`sample`、`uniform`、`gauss`、`getrandbits`                                    |
| `statistics`  | `mean`、`fmean`、`median`、`median_low`、`median_high`、`mode`、`multimode`、`stdev`、`pstdev`、`variance`、`pvariance`、`geometric_mean`、`harmonic_mean` |
| `re`          | `compile`、`match`、`search`、`fullmatch`、`findall`、`finditer`、`sub`、`split`、`group`、`groups` 等常用正则 API                                           |
| `collections` | `deque`（`append` / `appendleft` / `pop` / `popleft` / `rotate` / `maxlen`）、`Counter`（基本构造与下标）                                                  |
| `functools`   | `reduce`                                                                                                                                       |
| `itertools`   | `accumulate`、`chain`                                                                                                                           |
| `heapq`       | `heapify`、`heappush`、`heappop`                                                                                                                 |
| `json`        | 基础 `dumps` / `loads`                                                                                                                           |


⚠️ `os` 不支持（`ImportError: no module named os`）；没有文件、网络和第三方包。`collections.namedtuple`、`Counter.most_common()`、`dict.fromkeys()` 未覆盖；`Counter` 的 `print` 仍是对象形式，不是 `Counter({...})`。`math.comb/perm/lcm/prod/dist`、`json.dumps(..., separators=...)` 也未覆盖。

### 3.13 v5.2 的语言修复与 v5.3 演示层

**（1）字典视图消费（阶段 01）**

旧核心把视图内部引用编号直接交给列表格式化/推导式，导致“打印为空、推导式不迭代”。v5.2 在 `strval` 和 `cdo` 两个消费点调用已有的 `view826(id, kind)`，因此：

```python
d = {'a': 1, 'b': 2}
print(d.keys(), d.values(), d.items())
print([v * 2 for v in d.values()])
```

输出与 CPython 一致，并且视图是**实时**的：之后修改字典，已持有的视图能看到变化。

**（2）嵌套共享引用回写（阶段 02）**

```python
m = [[0] * 3] * 3
m[0][1] = 5
print(m)
# [[0, 5, 0], [0, 5, 0], [0, 5, 0]]

m[1].append(8)
print(m)
# [[0, 5, 0, 8], [0, 5, 0, 8], [0, 5, 0, 8]]
```

三行共享同一个子列表，因此改一行三行都变。v5.2 在嵌套下标写入后按引用编号原位更新，并清理路径深度与临时值；异常退出后下一次 RUN 也不会残留上一次的路径状态。独立创建的等值子列表仍然彼此隔离：

```python
n = [[0] * 3 for _ in range(2)]
n[0][1] = 7
print(n)   # [[0, 7, 0], [0, 0, 0]]
```

**（3）v5.3 演示层**

v5.3 不改语言，只把样例与帮助做成可维护的“数据 + 统一加载”：

- Stage 新增 `DemoText` 列表，30 项源码都用 `\n` 编码；
- `Controller/example` 用 `loadCode(item demo of DemoText)` 载入，状态显示 `Demo N`，超过 30 回到 1；
- 旧版 20 个样例的逐行 `addtolist(Code, ...)` 链被替换，Controller 从 2,196 块降到 1,908 块；
- HELP 重写为 156 行输入，新增 12 组 DEMO 索引和 6 个大程序索引，并修正输出折行为 26 列。

---

## 4. 示例：五分钟上手

### 4.1 步骤

1. 打开 `MiniPy_v5.3.sb3`，点绿旗；
2. 点一下舞台；
3. 在代码区输入下面的程序（`if`、`for`、`def` 行末的冒号后按 ENTER 会自动缩进）；
4. 点 **RUN**，看控制台输出；想看清过程就点 **STEP**。

### 4.2 示例代码

```python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

class Counter:
    def __init__(self, start=0):
        self.n = start
    def add(self, k=1):
        self.n += k
        return self.n
    def __str__(self):
        return f'Counter({self.n})'

print([fib(i) for i in range(8)])
c = Counter(10)
print(c.add(5), c)

words = ['py', 'vm']
print({w: len(w) for w in words})
print(', '.join([w.upper() for w in words]))

try:
    1 / 0
except ZeroDivisionError as e:
    print('caught:', e)
```

### 4.3 输出

```text
[0, 1, 1, 2, 3, 5, 8, 13]
15 Counter(15)
{'py': 2, 'vm': 2}
PY, VM
caught: division by zero
```

> 控制台每行 26 列，长行会自动折行；上面按逻辑行展示。此示例在 v5.3 上实测输出与 CPython 3.14 逐字一致。

### 4.4 这段代码演示了什么


| 代码                                  | 覆盖点                                   |
| ----------------------------------- | ------------------------------------- |
| `def fib(n): ...`                   | 函数定义、循环、元组同时赋值、`return`               |
| `class Counter:`                    | 类、`__init__`、默认参数、实例属性、`+=`、`__str__` |
| `print([fib(i) for i in range(8)])` | 列表推导式、`range`、函数调用                    |
| `print(c.add(5), c)`                | 绑定方法、`__str__`、多参数 `print`            |
| `{w: len(w) for w in words}`        | 字典推导式、`len`                           |
| `', '.join([...])`                  | 字符串方法、列表推导式                           |
| `try / except ... as e`             | 异常捕获、异常消息                             |


---

## 5. 已知边界

### 5.1 语言与库边界


| 写法                                                         | v5.3 的表现                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `if (n := 3):`                                             | `SyntaxError: expression`（无海象）                            |
| `match x: case ...`                                        | 不支持（缩进/语法错误）                                              |
| `async def` / `await`                                      | 不支持                                                       |
| `x: int = 3`                                               | `SyntaxError: expression`（无类型注解）                          |
| `format(1.5, '.2f')`                                       | `SyntaxError: parentheses`（`.format` / f-string / `%` 正常） |
| `bytes([65])`                                              | `NameError: name 'bytes' is not defined`                  |
| `object()` / `id(x)`                                       | `NameError`                                               |
| `exec('...')` / `eval('...')`                              | `NameError`                                               |
| `import os`                                                | `ImportError: no module named os`                         |
| `a[0][0:1] = [7]`                                          | 嵌套切片赋值不支持；`a[0][1] = 9` 可用                                |
| `[*a, *b]`                                                 | 列表字面量里的星号展开不支持；`f(*a)` 可用                                 |
| `namedtuple` / `Counter.most_common()` / `dict.fromkeys()` | 未覆盖                                                       |
| `chr(20013)`                                               | `ValueError: chr() arg not in range(32, 127)`             |
| `'\u4e2d'`                                                 | 按字面反斜杠 + `u` 处理，不是“中”                                     |


### 5.2 与 CPython 的典型差异


| 写法                                     | MiniPy         | CPython                     |
| -------------------------------------- | -------------- | --------------------------- |
| `print(range(3))`                      | `[0, 1, 2]`    | `range(0, 3)`               |
| `type(range(3))`                       | 列表类型           | `range`                     |
| `repr(d.keys())`                       | `['a']` 这类列表样式 | `dict_keys(['a'])`          |
| `print(Counter('aab'))`                | 对象形式（带地址/类型标记） | `Counter({'a': 2, 'b': 1})` |
| `dict.fromkeys(...)`                   | 不支持            | 支持                          |
| `math.comb / perm / lcm / prod / dist` | 不支持            | 支持                          |
| `json.dumps(..., separators=...)`      | 关键字参数未覆盖       | 支持                          |


### 5.3 运行限制


| 项目    | 限制                   |
| ----- | -------------------- |
| 源码行数  | 1000 行               |
| 单行字符数 | 2000 字符              |
| 单个值   | 16384 字符             |
| 控制台保留 | 2000 行               |
| 步数上限  | 慢速 50,000；快速 500,000 |
| 递归深度  | 512                  |
| 表达式深度 | 768                  |
| 代码区   | 约 44 列 × 16 行一页      |
| 控制台   | 26 列 × 9 行一页         |
| 变量面板  | 4 行一页                |


超过限制通常报 `LimitError`、`RecursionError` 或对应的 `ValueError`；用 `STOP` 或 `SPEED` 可以止损。

### 5.4 验收状态

v5.3 的语言核心沿用 v5.2：在 1,667 次历史回放中 **1,624 次严格通过**；剩余差异主要分布在异常文案、时钟/地址相关输出、少量嵌套别名和视图边界。v5.3 的演示层另外做了 30/30 载入核对、DEMO 25/30 实际 RUN、以及 40/40 回归子集。它不是“全量 Python 已验收”的声明，仍应按具体程序测试。

---

## 6. 适用场景与工程信息

### 6.1 适合

- **Python 入门/教学**：在只有 Scratch 的环境里演示变量、循环、函数、类、异常、生成器；
- **算法可视化**：配合 STEP/SPEED 单步观察排序、查找、递归、动态规划；
- **Scratch 作品里的“代码面板”**：把小型计算、文本处理、状态机嵌进 Scratch；
- **离线/受限环境**：不能安装 Python、不能联网，但能打开 Scratch 的场合。

### 6.2 不适合

- 需要第三方库（NumPy、Pandas、requests 等）、文件/网络/数据库；
- 需要完整 CPython 兼容、精确异常栈、`async`、`match`、类型注解；
- 大规模数据、长时间计算、性能敏感的生产任务。

### 6.3 构建与验证（工程向）

v5.3 由 v5.2 作品再加工，演示/帮助数据在 `_work` 中维护：

```sh
python _work/build_v53.py
python _work/unzip_v53.py
node _work/validate_v53.cjs
```

构建输入：

- `_work/v53_demos.json`：24 个短例；
- `_work/v53_large.json`：6 个大程序；
- `_work/v53_help.txt`：HELP 文本；
- `MiniPy_v5.2.sb3`：基底。

常用验证入口：

```sh
node v5/tests/run.cjs MiniPy_v5.3.sb3 v5/reports/candidate.json
node v5/tests/lifecycle.cjs MiniPy_v5.3.sb3 v5/reports/candidate-lifecycle.json
```

本文的示例输出与主要功能条目，使用 stock scratch-vm 5.0.300 和 CPython 3.14.10 做过抽样对照。界面行为来自 v5.3 的舞台背景、Controller 脚本和既有 v4.267 界面契约；不同 Scratch 发行版的键盘焦点、字体和按钮排版可能略有差异，实际以目标编辑器为准。

更完整的基线、阶段 01/02 报告见：

- `[v5/FEATURES.md](v5/FEATURES.md)`：按语法/内置/方法索引回放覆盖；
- `[v5/ARCHITECTURE.md](v5/ARCHITECTURE.md)`：核心架构、迁移账本和边界；
- `[v5/REPORT.md](v5/REPORT.md)`：v5 核心的量化验收；
- `[v5/reports/upgrade-stage-01/REPORT.md](v5/reports/upgrade-stage-01/REPORT.md)`：字典视图；
- `[v5/reports/upgrade-stage-02/REPORT.md](v5/reports/upgrade-stage-02/REPORT.md)`：嵌套引用回写。

### 6.4 一句话总结

**MiniPy v5.3 把“Python 的一小块常用面”做进了 Scratch：语法、容器、函数、类、异常、生成器、推导式、大整数、Unicode 字符串和十来个常用模块都能跑；30 个 DEMO 从 12 个功能短例一路带到 6 个混合大程序。它的价值在于可编辑、可单步、可解释，而不是替代 CPython。** 先用 DEMO 找到想学的主题，再回到代码区改一行、点一次 RUN，就是最顺的上手方式。

> 版本改动、DEMO 清单和验证记录见 `[MiniPy_v5.3_更新说明.md](MiniPy_v5.3_更新说明.md)`。

# MiniPy v5.3 支持功能专辑

> **定位**：这不是“快速上手”，而是一本按功能主题编排的**支持能力手册**。它系统回答三件事：MiniPy 到底支持什么、怎么写、边界在哪里。
>
> **基准**：根目录的 `MiniPy_v5.3.sb3`。语言核心与 v5.2 相同；v5.3 主要更新了 30 个 DEMO 与 HELP。版本、构建和验证细节见 `[MiniPy_v5.3_介绍.md](MiniPy_v5.3_介绍.md)` 与 `[MiniPy_v5.3_更新说明.md](MiniPy_v5.3_更新说明.md)`。
>
> **读法**：第 1–12 章对应 v5.3 的 12 个 DEMO 功能组；每章按“定位 → 语法/API → 示例 → 边界 → 对应 DEMO”展开。第 13 章汇总运行限制与 CPython 差异，第 14 章给出 30 个 DEMO 的索引。

---

## 阅读指南

### 图例


| 标记  | 含义                             |
| --- | ------------------------------ |
| ✅   | 常规写法可用，结果通常与 CPython 一致        |
| ⚠️  | 可用，但有明确边界、性能限制或与 CPython 不同的地方 |
| ❌   | 不支持，通常会报错或行为不可用                |


“支持”指 v5.3 的实测范围，不表示 CPython 全量兼容。示例输出按控制台逻辑行展示；实际控制台每行 26 列，长行会自动折行。

### 12 章地图


| 章   | 主题      | 对应 DEMO |
| --- | ------- | ------- |
| 1   | 基础语法与运算 | 1–2     |
| 2   | 数字与类型   | 3–4     |
| 3   | 字符串与格式化 | 5–6     |
| 4   | 列表与元组   | 7–8     |
| 5   | 字典与集合   | 9–10    |
| 6   | 控制流与推导式 | 11–12   |
| 7   | 函数与闭包   | 13–14   |
| 8   | 类与继承    | 15–16   |
| 9   | 异常处理    | 17–18   |
| 10  | 生成器与迭代器 | 19–20   |
| 11  | 内建函数与算法 | 21–22   |
| 12  | 模块与输入输出 | 23–24   |


25–30 是六个混合大程序，分别覆盖成绩报告、文本分析、银行系统、矩阵、收银台模拟和表达式求值。

---

# 第 1 章 基础语法与运算

## 1.1 源文本模型


| 能力       | 等级  | 说明                                                |
| -------- | --- | ------------------------------------------------- |
| 注释       | ✅   | `#` 整行注释、行尾注释                                     |
| 空行       | ✅   | 空行不参与缩进配对                                         |
| 缩进       | ✅   | 同一块内 2/3/4/6/8 空格均可；TAB 也可；TAB 与空格混用不报 `TabError` |
| 续行       | ✅   | 反斜杠续行；括号/方括号/花括号内跨行                               |
| 单行 suite | ✅   | `if x: print(1)`、`for i in range(3): print(i)`    |
| 分号       | ✅   | 顶层一行多条语句：`a = 1; b = 2`                           |
| 标识符/数字   | ⚠️  | 必须是 ASCII；字符串和注释可以含 Unicode                       |
| 行/值上限    | ⚠️  | 1000 行、2000 字符/行、16384 字符/值                       |


MiniPy 在 RUN 前把编辑器 `Code` 复制到内部工作副本 `Src267`，续行合并、单行 suite 拆分、分号拆分都只改工作副本，**不会改写编辑器里的源码**。

## 1.2 语句骨架


| 语句      | 等级  | 说明                                                 |
| ------- | --- | -------------------------------------------------- |
| 赋值      | ✅   | `x = 1`、链式 `a = b = 0`、多重 `a, b = 1, 2`            |
| 条件      | ✅   | `if` / `elif` / `else`，支持单行                        |
| 循环      | ✅   | `while`、`for ... in ...`、`break`、`continue`、`pass` |
| 循环 else | ✅   | `for/else`、`while/else`                            |
| 条件表达式   | ✅   | `a if c else b`                                    |
| 打印      | ✅   | `print(...)`，支持 `sep=`、`end=`、`*` 展开               |


## 1.3 运算符


| 类别    | 运算符                      | 说明                   |
| ----- | ------------------------ | -------------------- |
| 算术    | `+ - * / // % **`        | `//` 向下取整，`%` 符号跟随除数 |
| 一元    | `+ - ~`                  | `~` 按二补数             |
| 比较    | `== != < <= > >=`        | 支持链式比较 `1 < 2 < 3`   |
| 逻辑    | `and or not`             | 短路并返回操作数             |
| 成员    | `in` / `not in`          | 字符串、列表、元组、字典、集合、视图   |
| 身份    | `is` / `is not`          | 判断同一对象，不按内容          |
| 位运算   | `&                       | ^ << >>`             |
| 增强赋值  | `+= -= *= /= %= **= //=` | 也支持 `&=              |
| 序列/容器 | `+ *`、`                  | & - ^`               |


**优先级（由高到低，常用部分）**：

```text
**  →  一元 + - ~  →  * / // %  →  + -  →  << >>  →  &  →  ^  →  |  →  比较/in/is  →  not  →  and  →  or  →  if/else
```

## 1.4 示例

```python
x = 7
y = 3
print(x + y, x > y)
for i in range(3):
    print(i)
print('yes' if x > y else 'no')
print(1 < x < 10, x in [3, 7, 9])
```

输出：

```text
10 True
0
1
2
yes
True True
```

## 1.5 边界

- ❌ 海象运算符 `:=`：`SyntaxError: expression`。
- ❌ `match` 模式匹配、`async/await`：不支持。
- ❌ 类型注解 `x: int = 3`：`SyntaxError: expression`。
- ⚠️ 位运算大整数受内部宽度/实现路径影响；常见范围可用，极端值应实测。
- ⚠️ 递归深度、表达式深度、步数都有上限，见第 13 章。

## 对应 DEMO

- DEMO 1：Flow and decisions
- DEMO 2：Operators and bits

---

# 第 2 章 数字与类型

## 2.1 类型总表


| 类型                  | 等级  | 字面量/构造                       | 说明                          |
| ------------------- | --- | ---------------------------- | --------------------------- |
| `None`              | ✅   | `None`                       | 单例                          |
| `bool`              | ✅   | `True` / `False`             | `bool` 是 `int` 的子类          |
| `int`               | ✅   | `42`、`0x2a`、`0b1010`、`0o52`  | 支持大整数                       |
| `float`             | ✅   | `3.5`、`1e-5`、`inf`、`nan`     | 双精度浮点                       |
| `complex`           | ✅   | `1 + 2j`、`complex(1, 2)`     | `.real` / `.imag` / `abs()` |
| `str`               | ✅   | `'x'`、`"x"`、三引号              | Unicode 字符串                 |
| `list`              | ✅   | `[1, 2]`                     | 可变、有别名语义                    |
| `tuple`             | ✅   | `(1, 2)`、`1, 2`              | 不可变                         |
| `dict`              | ✅   | `{'a': 1}`                   | 插入序                         |
| `set` / `frozenset` | ✅   | `{1, 2}`、`frozenset([1, 2])` | 去重、集合运算                     |


## 2.2 数字语义

- **大整数**：`2 ** 1000`、`fact(30)` 可精确计算；`2 ** 53 + 1` 不再像旧版那样失真。
- **浮点**：`0.1 + 0.2` 与 CPython 一样是 `0.30000000000000004`；`1e16`、`1e-05` 等排版按常见 CPython 形式。
- **复数**：`1 + 2j`、`complex(3, 4)`、`z.real`、`z.imag`、`z.conjugate()`、`cmath` 模块。
- **除法**：`7 / 2` 是浮点，`7 // 2` 是整数，`-7 // 2 == -4`、`-7 % 2 == 1`。
- **舍入**：`round(2.5) == 2`、`round(3.5) == 4`，银行家舍入。

## 2.3 类型判断与转换

```python
print(type(1), type(1.5), type('x'))
print(isinstance(True, int), issubclass(bool, int))
print(int('42'), int('ff', 16), float('2.5'))
print(str(42) + '!', bool(0), bool([1]))
print(complex(1, 2))
```

输出：

```text
<class 'int'> <class 'float'> <class 'str'>
True True
42 255 2.5
42! False True
(1+2j)
```

## 2.4 边界

- ❌ `bytes` / `bytearray`：`NameError`。
- ❌ `object`、`id()`：`NameError`；`isinstance(x, object)` 也不可用。
- ❌ `format()` 内建：不支持；`.format` 方法、f-string、`%` 正常。
- ⚠️ `chr()` 只接受可打印 ASCII 32–126；`ord()` 支持 Unicode 码点。
- ⚠️ `getattr`/`hasattr` 对用户对象属性可用，但对 `'abc'.upper` 这类内建类型方法不保证。

## 对应 DEMO

- DEMO 3：Big integers and floats
- DEMO 4：Types and conversions

---

# 第 3 章 字符串与格式化

## 3.1 字面量与转义


| 能力           | 等级  | 说明                                   |
| ------------ | --- | ------------------------------------ |
| 单/双引号        | ✅   | `'abc'`、`"abc"`                      |
| 三引号          | ✅   | 多行字符串                                |
| 常用转义         | ✅   | `\n`、`\t`、`\r`、`\\`、`\'`、`\"`、`\xNN` |
| Unicode 直接写入 | ✅   | 字符串和注释里可直接写 Unicode                  |
| `\uNNNN`     | ❌   | 不展开，按字面反斜杠 + `u` 处理                  |
| `chr()` 构造   | ⚠️  | 只支持 32–126                           |


## 3.2 下标、切片与运算符

```python
s = 'MiniPy'
print(s[0], s[-1], s[1:4], s[::-1])
print(s + '!', s * 2, 'Py' in s)
```

输出：

```text
M y ini yPiniM
MiniPy! MiniPyMiniPy True
```

## 3.3 常用方法


| 类别    | 方法                                                                        | 等级     |
| ----- | ------------------------------------------------------------------------- | ------ |
| 大小写   | `upper`、`lower`、`title`、`capitalize`、`swapcase`、`casefold`                | ✅      |
| 修剪/填充 | `strip`、`lstrip`、`rstrip`、`ljust`、`rjust`、`center`、`zfill`、`expandtabs`   | ✅      |
| 查找/替换 | `find`、`rfind`、`index`、`rindex`、`count`、`replace`、`startswith`、`endswith` | ✅      |
| 切分/连接 | `split`、`rsplit`、`splitlines`、`join`、`partition`、`rpartition`             | ✅      |
| 判断    | `isdigit`、`isalpha`、`isalnum`、`isupper`、`islower`、`isspace`               | ✅      |
| 前后缀   | `removeprefix`、`removesuffix`                                             | ✅      |
| 其他判断  | `istitle` 等少数                                                             | ⚠️ 未覆盖 |


`find/rfind/index/rindex/count` 支持 `start`/`end`；`split` 支持 `sep`/`maxsplit`；`replace` 支持 `count`；`join` 接受列表/元组/字符串/集合/字典键。

## 3.4 `%` 格式化

```python
print('%s v%d' % ('MiniPy', 3))
print('%05d %+d %8.3f' % (42, 7, 3.14159))
print('%x %o %e' % (255, 8, 1234.5))
print('%(a)s=%(b)d' % {'a': 'x', 'b': 3})
```

支持常见转换符、宽度、精度、`*` 从实参取宽度、符号/补零/左对齐、映射键形式。非法转换符会报 `ValueError`，多余实参报 `TypeError`。

## 3.5 `.format`

```python
print('{} {}'.format(1, 2))
print('{0} {1} {0}'.format('a', 'b'))
print('{a[1]} {b:.2f}'.format(a=[7, 8], b=3.14159))
print('{:*^7}'.format('ab'))
print('{:,}'.format(1234567))
```

支持位置/关键字字段、下标路径、嵌套规格、`!r/!s/!a`、对齐/填充、千分位 `,`/`_`、`#x/#b/#o`、百分比 `%`。

## 3.6 f-string

```python
name = 'MiniPy'
n = 7
x = 3.14159
print(f'{name} v{n}')
print(f'[{n:>3}] [{n:04}]')
print(f'{x:.2f} {x:>8.3f}')
print(f'{255:#06x} {1234567:,}')
print(f'{{literal}} {n * n}')
```

## 3.7 边界

- ❌ `format(1.5, '.2f')` 内建：不支持。
- ❌ `encode`、`translate`、`maketrans` 等未覆盖。
- ⚠️ `'\u4e2d'` 不会变成“中”；需要 Unicode 时直接写字符。
- ⚠️ 控制台只显示 ASCII 字形；Unicode 字符串仍在 `Output` 数据中，但屏幕显示可能不完整。

## 对应 DEMO

- DEMO 5：Text methods
- DEMO 6：Three format styles

---

# 第 4 章 列表与元组

## 4.1 列表


| 能力      | 等级  | 说明                             |
| ------- | --- | ------------------------------ |
| 字面量/嵌套  | ✅   | `[1, 2]`、`[[1], [2]]`          |
| 下标/负下标  | ✅   | `a[0]`、`a[-1]`                 |
| 切片      | ✅   | `a[1:3]`、`a[::-1]`             |
| 切片赋值/删除 | ✅   | `a[1:3] = [9]`、`del a[1:3]`    |
| 拼接/重复   | ✅   | `a + b`、`a * 3`                |
| 别名/浅复制  | ✅   | `b = a` 共享；`b = a[:]` 浅复制      |
| 嵌套写回    | ✅   | `a[0][1] = 9`、`a[0].append(2)` |


**列表方法**：


| 方法                         | 说明       |
| -------------------------- | -------- |
| `append`、`insert`、`extend` | 追加/插入/扩展 |
| `pop`、`remove`、`clear`     | 删除       |
| `sort`、`reverse`           | 排序/反转    |
| `index`、`count`            | 查找/计数    |
| `copy`                     | 浅复制      |


## 4.2 元组


| 能力    | 等级  | 说明                                         |
| ----- | --- | ------------------------------------------ |
| 字面量   | ✅   | `(1, 2)`、`1, 2`                            |
| 下标/切片 | ✅   | `t[0]`、`t[1:]`、`t[::-1]`                   |
| 拼接/重复 | ✅   | `t + (3,)`、`t * 2`                         |
| 方法    | ✅   | `index`、`count`                            |
| 解包    | ✅   | `a, b = t`、`for a, b in ...`               |
| 星号目标  | ✅   | `a, *rest = ...`、`first, *mid, last = ...` |


## 4.3 解包与交换

```python
a, b = 1, 2
a, b = b, a
print(a, b)
head, *rest = [10, 20, 30, 40]
print(head, rest)
first, *mid, last = [1, 2, 3, 4]
print(first, mid, last)
```

输出：

```text
2 1
10 [20, 30, 40]
1 [2, 3] 4
```

## 4.4 别名与拷贝

```python
a = [1, 2]
b = a
b.append(3)
print(a)
c = a[:]
c.append(4)
print(a, c)
```

输出：

```text
[1, 2, 3]
[1, 2, 3] [1, 2, 3, 4]
```

## 4.5 边界

- ❌ 嵌套切片赋值 `a[0][0:1] = ...`：仍不支持；嵌套**下标**赋值可用。
- ❌ 列表字面量星号展开 `[*a, *b]`：不支持；调用点 `f(*a)` 可用。
- ⚠️ `list.sort()` 支持基本排序；`sorted(key=, reverse=)` 的完整能力见第 11 章。
- ⚠️ `for a, *r in ...` 可用；更复杂的嵌套星号解包需单独测试。

## 对应 DEMO

- DEMO 7：List methods and slices
- DEMO 8：Tuples and unpacking

---

# 第 5 章 字典与集合

## 5.1 字典


| 能力       | 等级  | 说明                                                         |
| -------- | --- | ---------------------------------------------------------- |
| 字面量/嵌套   | ✅   | `{'a': 1}`、`{'a': {'b': 2}}`                               |
| 读/写/删除   | ✅   | `d[k]`、`d[k] = v`、`del d[k]`                               |
| 成员/长度/遍历 | ✅   | `k in d`、`len(d)`、`for k in d`                             |
| 方法       | ✅   | `get`、`pop`、`popitem`、`update`、`setdefault`、`copy`、`clear` |
| 视图       | ⚠️  | `keys/values/items` 是实时视图；直接消费正常，`repr` 仍是列表样式             |
| 合并       | ✅   | `d1                                                        |
| 推导式      | ✅   | `{k: v for ...}`                                           |


**键序与相等**：

- 插入序保持；
- 重复键保留首次位置、最后一次值；
- `==` 不看键顺序，按内容比较。

## 5.2 视图

```python
d = {'a': 1}
v = d.values()
d['b'] = 2
print(v)
print(list(v))
print([x * 2 for x in v])
```

输出：

```text
dict_values([1, 2])
[1, 2]
[2, 4]
```

视图是实时的：持有 `v` 后修改字典，`v` 能看到变化。`print(d.keys())`、`for`、`in`、`len`、`sorted`、`sum`、推导式和部分集合运算可用。

## 5.3 集合与 frozenset


| 能力      | 等级  | 说明                                   |
| ------- | --- | ------------------------------------ |
| 字面量/推导式 | ✅   | `{1, 2}`、`{x for x in ...}`          |
| 增删      | ✅   | `add`、`remove`、`discard`、`clear`     |
| 集合运算    | ✅   | `                                    |
| 关系      | ✅   | `issubset`、`issuperset`、`isdisjoint` |
| 不可变集合   | ✅   | `frozenset([1, 2])`                  |
| 空集合     | ✅   | `set()`                              |


## 5.4 边界

- ❌ `dict.fromkeys()`：未覆盖。
- ❌ `collections.namedtuple`：未覆盖。
- ⚠️ `repr(d.keys())` / `str(d.keys())` 返回 `['a']` 这类列表样式，不是 `dict_keys([...])`。
- ⚠️ 视图迭代器生命周期、迭代期间改变大小仍有边界；不要边遍历视图边修改字典。
- ⚠️ 集合打印顺序按插入序，不是 CPython 的哈希序；相等/子集按内容比较。

## 对应 DEMO

- DEMO 9：Dictionary methods
- DEMO 10：Sets and frozensets

---

# 第 6 章 控制流与推导式

## 6.1 条件与循环


| 能力                            | 等级  | 说明                         |
| ----------------------------- | --- | -------------------------- |
| `if/elif/else`                | ✅   | 支持单行 suite                 |
| `while`                       | ✅   | 支持 `else`                  |
| `for ... in ...`              | ✅   | 列表、元组、字符串、字典、集合、视图、生成器、迭代器 |
| `break` / `continue` / `pass` | ✅   | 循环控制                       |
| 循环 `else`                     | ✅   | `break` 时跳过 `else`         |
| 嵌套循环                          | ✅   | 任意层数，受步数/深度限制              |


## 6.2 推导式


| 形式     | 示例                                                  |
| ------ | --------------------------------------------------- |
| 列表     | `[x * x for x in xs if x % 2]`                      |
| 字典     | `{k: v for k, v in d.items()}`                      |
| 集合     | `{x % 3 for x in xs}`                               |
| 多子句    | `[(x, y) for x in xs for y in ys if x != y]`        |
| 嵌套     | `[[r * 3 + c for c in range(3)] for r in range(2)]` |
| 生成器表达式 | `(x * 2 for x in xs)`                               |


## 6.3 示例

```python
total = 0
for i in range(5):
    if i == 2:
        continue
    if i == 4:
        break
    total += i
else:
    print('never')
print(total)
print([x * x for x in range(5) if x % 2])
print({c: len(c) for c in ['py', 'vm']})
```

输出：

```text
4
[1, 9]
{'py': 2, 'vm': 2}
```

> 这里 `break` 让 `for/else` 的 `else` 不执行；`total` 是 0+1+3=4。

## 6.4 边界

- ⚠️ 推导式变量不外泄；但不要依赖它在推导式外的值。
- ⚠️ 大循环可能触发步数上限；`STEP`/`SPEED` 可用于观察，不能突破上限。
- ⚠️ `range()` 是立即求值的列表，不是惰性 range 对象（见第 10 章）。

## 对应 DEMO

- DEMO 11：Loop control
- DEMO 12：Comprehensions

---

# 第 7 章 函数与闭包

## 7.1 定义与参数


| 能力                   | 等级  | 说明                                     |
| -------------------- | --- | -------------------------------------- |
| `def` / `return`     | ✅   | 单值/多值返回                                |
| 位置参数                 | ✅   | `f(1, 2)`                              |
| 默认参数                 | ✅   | `def f(a, b=2)`                        |
| 关键字参数                | ✅   | `f(1, c=9)`                            |
| `*args` / `**kwargs` | ✅   | `def f(*a, **k)`                       |
| 仅位置 `/`              | ✅   | `def f(a, /, b)`                       |
| 仅关键字 `*`             | ✅   | `def f(*, a)`                          |
| 调用点展开                | ✅   | `f(*xs)`、`f(**d)`                      |
| 默认值共享                | ✅   | `def f(b=[])` 的默认列表在调用间复用，与 CPython 一致 |


## 7.2 作用域

- `global`：在函数内声明全局变量；
- `nonlocal`：在闭包内修改外层函数变量；
- 嵌套 `def` 形成闭包；
- 递归函数可用，但受递归深度 512 限制。

## 7.3 lambda 与装饰器

```python
add = lambda a, b: a + b
print(add(2, 3))

def deco(fn):
    def wrapper(x):
        return fn(x) + 1
    return wrapper

@deco
def twice(x):
    return x * 2
print(twice(5))
```

输出：

```text
5
11
```

`@property`、`@classmethod` 也可用；带参数的装饰器工厂 `@deco(10)`、`@staticmethod` 当前不支持。

## 7.4 示例：参数组合

```python
def f(a, b=2, *args, c=3, **kw):
    return a, b, args, c, kw

print(f(1, 4, 5, 6, c=7, d=8))
```

输出：

```text
(1, 4, (5, 6), 7, {'d': 8})
```

## 7.5 边界

- ❌ `async def` / `await`。
- ❌ 带参数装饰器工厂、`@staticmethod`。
- ⚠️ 递归深度 512；表达式深度 768。
- ⚠️ 默认参数在定义时求值；可变默认值共享，这是 Python 语义，不是 bug。

## 对应 DEMO

- DEMO 13：Arguments and recursion
- DEMO 14：Closures and decorators

---

# 第 8 章 类与继承

## 8.1 类基础


| 能力             | 等级  | 说明               |
| -------------- | --- | ---------------- |
| `class`        | ✅   | 类定义              |
| `__init__`     | ✅   | 构造实例             |
| 实例属性           | ✅   | `self.x = x`     |
| 类属性            | ✅   | `class C: n = 1` |
| 方法/`self`      | ✅   | 绑定方法             |
| `@property`    | ✅   | 只读属性             |
| `@classmethod` | ✅   | 类方法              |


## 8.2 继承


| 能力                          | 等级  | 说明                   |
| --------------------------- | --- | -------------------- |
| 单继承                         | ✅   | `class B(A)`         |
| 多继承                         | ✅   | `class C(A, B)`      |
| C3 线性化                      | ✅   | `ClsMro` / `super()` |
| `super()`                   | ✅   | 沿 MRO 找下一个           |
| 显式父类调用                      | ✅   | `A.method(self)`     |
| `isinstance` / `issubclass` | ✅   | 用户类、内建类型、类型元组        |


## 8.3 特殊方法


| 方法                              | 用途          | 等级  |
| ------------------------------- | ----------- | --- |
| `__str__` / `__repr__`          | 打印/表示       | ✅   |
| `__len__`                       | `len(x)`    | ✅   |
| `__getitem__`                   | `x[i]` / 切片 | ✅   |
| `__add__` / `__eq__` / `__lt__` | 运算符/比较      | ✅   |
| `__bool__`                      | `bool(x)`   | ✅   |
| `__call__`                      | `x(...)`    | ✅   |
| `__iter__` / `__next__`         | 迭代协议        | ✅   |
| `__enter__` / `__exit__`        | `with`      | ✅   |


## 8.4 示例

```python
class Point:
    kind = 'point'
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def norm2(self):
        return self.x * self.x + self.y * self.y
    def __str__(self):
        return 'Point(' + str(self.x) + ', ' + str(self.y) + ')'
    def __len__(self):
        return 2
    def __getitem__(self, i):
        return self.x if i == 0 else self.y

p = Point(3, 4)
print(p, p.norm2())
print(len(p), p[0], p[1], p.kind)
```

输出：

```text
Point(3, 4) 25
2 3 4 point
```

## 8.5 边界

- ❌ `object` / `id()`、`namedtuple`、`dataclass`、`__slots__` 未覆盖。
- ❌ `@staticmethod`、带参数装饰器工厂。
- ⚠️ `type(x)` 返回完整 `<class '...'>`；`type(x).__name__` 可用。
- ⚠️ 多继承按 C3；复杂菱形请用小例子验证方法解析顺序。

## 对应 DEMO

- DEMO 15：Class basics
- DEMO 16：Inheritance and MRO

---

# 第 9 章 异常处理

## 9.1 异常层次

常用内建异常：`Exception`、`ValueError`、`TypeError`、`NameError`、`IndexError`、`KeyError`、`ZeroDivisionError`、`RuntimeError`、`AssertionError`、`StopIteration`、`ImportError`、`SyntaxError`、`AttributeError` 等。

## 9.2 语句


| 能力                   | 等级  | 说明                                                  |
| -------------------- | --- | --------------------------------------------------- |
| `try/except`         | ✅   | 多个 `except` 按顺序匹配                                   |
| `else`               | ✅   | 无异常时执行                                              |
| `finally`            | ✅   | 正常/异常/return/break/continue 都执行                     |
| 元组子句                 | ✅   | `except (ValueError, KeyError) as e:`               |
| `raise`              | ✅   | `raise E('msg')`、裸 `raise` 重抛                       |
| `raise ... from ...` | ✅   | 设置 `__cause__`                                      |
| 自定义异常                | ✅   | `class MyErr(Exception): ...`                       |
| 异常组                  | ✅   | `ExceptionGroup` / `BaseExceptionGroup` / `except*` |
| `assert`             | ✅   | 可带消息                                                |


## 9.3 示例

```python
try:
    1 / 0
except ZeroDivisionError as e:
    print('caught:', e)
finally:
    print('done')

try:
    raise ExceptionGroup('group', [ValueError('v'), TypeError('t')])
except* ValueError as e:
    print('value', len(e.exceptions))
except* TypeError as e:
    print('type', len(e.exceptions))
```

输出：

```text
caught: division by zero
done
value 1
type 1
```

## 9.4 异常对象

- `e.args` 可用；
- `e.__cause__` 可用（配合 `raise ... from`）；
- `print(e)` 通常只显示消息；
- 未捕获异常在控制台显示 `Line N: ...`。

## 9.5 边界

- ⚠️ 异常消息尽量对齐 CPython，但不是每一条都逐字一致。
- ⚠️ 自定义异常类的构造/属性支持有限；`e.args` 可用，更多属性不一定有。
- ❌ 异常组嵌套/派生组的复杂语义未做全量覆盖。

## 对应 DEMO

- DEMO 17：Try and custom errors
- DEMO 18：Groups and context

---

# 第 10 章 生成器与迭代器

## 10.1 生成器函数


| 能力                    | 等级  | 说明                 |
| --------------------- | --- | ------------------ |
| `yield`               | ✅   | 逐个产出               |
| `yield from`          | ✅   | 委托给子迭代器            |
| `yield a, b`          | ✅   | 产出元组               |
| `next(g)`             | ✅   | 取下一个               |
| `g.send(v)`           | ✅   | 发送值并恢复             |
| `g.throw(...)`        | ✅   | 在挂起点抛异常            |
| `g.close()`           | ✅   | 关闭生成器，执行 `finally` |
| `StopIteration.value` | ✅   | 生成器返回值             |


## 10.2 示例

```python
def squares(n):
    for i in range(n):
        yield i * i

print(list(squares(4)))
print(sum(squares(4)))

def stock():
    total = 0
    while True:
        item = yield total
        if item is None:
            break
        total += item

s = stock()
print(next(s))
print(s.send(5))
print(s.send(7))
s.close()
```

输出：

```text
[0, 1, 4, 9]
14
0
5
12
```

## 10.3 迭代器工具


| 工具              | 等级  | 语义           |
| --------------- | --- | ------------ |
| `iter` / `next` | ✅   | 迭代协议         |
| `zip`           | ✅   | 一次性迭代器       |
| `map`           | ✅   | 一次性迭代器       |
| `filter`        | ✅   | 一次性迭代器       |
| `enumerate`     | ✅   | 一次性迭代器，可带起始值 |
| `reversed`      | ⚠️  | 返回列表         |
| `range`         | ⚠️  | 立即求值成列表      |
| 生成器表达式          | ✅   | 立即求值成列表      |


```python
z = zip([1, 2], ['a', 'b'])
print(list(z))
print(list(z))
print(list(range(1, 6, 2)))
```

输出：

```text
[(1, 'a'), (2, 'b')]
[]
[1, 3, 5]
```

## 10.4 自定义迭代器

```python
class Countdown:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        return self
    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n

print(list(Countdown(3)))
```

输出：

```text
[2, 1, 0]
```

## 10.5 边界

- ⚠️ `zip/map/filter/enumerate` 是一次性迭代器；第二次 `list()` 为空。
- ⚠️ `range()` 不是惰性对象；`print(range(3))` 输出 `[0, 1, 2]`。
- ⚠️ `reversed()` 返回列表，不是 `list_reverseiterator`。
- ⚠️ 生成器/视图在迭代期间被修改时，行为有边界；不要依赖未定义顺序。

## 对应 DEMO

- DEMO 19：Yield and send
- DEMO 20：Iterator tools

---

# 第 11 章 内建函数与算法

## 11.1 内建函数总表


| 分组    | 函数                                                                                           | 等级     |
| ----- | -------------------------------------------------------------------------------------------- | ------ |
| 输入输出  | `print`（`sep/end/*`）、`input`                                                                 | ✅      |
| 类型/构造 | `bool`、`int`、`float`、`complex`、`str`、`list`、`tuple`、`dict`、`set`、`frozenset`、`type`          | ✅      |
| 数值    | `abs`、`round`、`pow`、`divmod`、`min`、`max`、`sum`                                               | ✅      |
| 序列/迭代 | `len`、`range`、`enumerate`、`zip`、`map`、`filter`、`reversed`、`sorted`、`iter`、`next`、`any`、`all` | ✅      |
| 对象/内省 | `isinstance`、`issubclass`、`getattr`、`setattr`、`hasattr`、`callable`、`hash`、`repr`             | ✅ / ⚠️ |
| 字符/进制 | `chr`、`ord`、`bin`、`hex`、`oct`                                                                | ✅ / ⚠️ |
| 异常类   | `Exception` 等内建异常                                                                            | ✅      |


**细节**：

- `min/max/sorted` 支持多个位置参数或单个可迭代对象，支持 `key=`；`sorted` 还支持 `reverse=`。
- `sum(xs, start)` 支持起始值。
- `enumerate(xs, start)` 支持起始值。
- `pow(a, b, mod)` 支持三参数模幂。
- `round` 采用银行家舍入。
- `chr` 只支持 32–126；`ord` 支持 Unicode 码点。
- `print(*xs)` 支持星号展开。
- `getattr/setattr/hasattr` 对用户对象属性可用；对 `'abc'.upper` 这类内建方法不保证。

## 11.2 不支持的内建

❌ `format()`、`bytes()`、`bytearray()`、`object()`、`id()`、`exec()`、`eval()`。

## 11.3 算法示例

```python
def bsearch(a, t):
    lo = 0
    hi = len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t:
            return mid
        if a[mid] < t:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

print(bsearch([1, 3, 5, 7, 9], 7))
print(gcd(48, 18))
print(sorted([3, 1, 2], key=lambda x: -x))
```

输出：

```text
3
6
[3, 2, 1]
```

## 11.4 边界

- ⚠️ `type(x)` 返回完整类形式，`type(x).__name__` 可用；`object`/`id` 不可用。
- ⚠️ `hash` 对常见不可变值可用；不要依赖哈希值的具体数字。
- ⚠️ `format()` 内建不支持，使用 `.format`/f-string/`%`。
- ⚠️ 算法性能受 Scratch VM 限制；大输入先做规模测试。

## 对应 DEMO

- DEMO 21：Builtins in action
- DEMO 22：Classic algorithms

---

# 第 12 章 模块与输入输出

## 12.1 导入形式

```python
import math
import math as m
from math import sqrt, pi
from collections import deque, Counter
```

`import os` 会报 `ImportError: no module named os`；没有文件、网络、第三方包。

## 12.2 模块总表


| 模块            | 主要能力                                                                                                                   | 等级     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| `math`        | `pi/e`、`floor/ceil/trunc/fabs/sqrt/pow/exp/log/log10`、三角/反三角/双曲、`fmod/gcd/factorial/isclose`                           | ✅ / ⚠️ |
| `cmath`       | 复数 `sqrt/phase/exp/log`、三角、极坐标                                                                                         | ✅      |
| `time`        | `time/time_ns/perf_counter/monotonic/process_time/sleep`、`gmtime/localtime/strftime/asctime/ctime`                     | ✅      |
| `datetime`    | `date/datetime/timedelta`、`isoformat`、`weekday`、`strftime`、日期加减                                                        | ✅      |
| `random`      | `seed/random/randint/randrange/choice/choices/shuffle/sample/uniform/gauss/getrandbits`                                | ✅      |
| `statistics`  | `mean/fmean/median/median_low/median_high/mode/multimode/stdev/pstdev/variance/pvariance/geometric_mean/harmonic_mean` | ✅      |
| `re`          | `compile/match/search/fullmatch/findall/finditer/sub/split/group/groups`                                               | ✅      |
| `collections` | `deque`、`Counter`（基本构造/下标）                                                                                             | ⚠️     |
| `functools`   | `reduce`                                                                                                               | ✅      |
| `itertools`   | `accumulate`、`chain`                                                                                                   | ✅      |
| `heapq`       | `heapify`、`heappush`、`heappop`                                                                                         | ✅      |
| `json`        | 基础 `dumps`/`loads`                                                                                                     | ⚠️     |


**模块边界**：

- `math.comb/perm/lcm/prod/dist` 未覆盖；
- `collections.namedtuple`、`Counter.most_common()` 未覆盖；`Counter` 的 `print` 仍是对象形式；
- `json.dumps(..., separators=...)` 未覆盖；
- `random`/`time` 依赖运行环境，输出不保证跨运行恒定；演示时用固定种子或只打印排序/统计结果。

## 12.3 示例

```python
import math
import statistics
import datetime
import re
import json

print(round(math.pi, 4), math.gcd(12, 18))
print(statistics.mean([1, 2, 3]), statistics.median([1, 2, 3]))
print(datetime.date(2024, 2, 29).isoformat())
print(re.findall(r'\d+', 'a1b22'))
print(json.loads('{"a": 1}')['a'])
```

输出：

```text
3.1416 6
2 2
2024-02-29
['1', '22']
1
```

## 12.4 输入输出


| 能力                | 等级  | 说明                                     |
| ----------------- | --- | -------------------------------------- |
| `print`           | ✅   | 多参数、`sep=`、`end=`、`*` 展开               |
| `input`           | ✅   | Scratch 提问气泡；等待时状态 `Waiting for input` |
| 控制台               | ✅   | 26 列 × 9 行一页，自动折行，保留 2000 行            |
| 变量面板              | ✅   | `name = value`，4 行一页，超长截断              |
| 导出/导入             | ✅   | EXPORT 一行式，`\n` 表示换行；IMPORT 粘回         |
| DEMO / HELP       | ✅   | 30 个 DEMO + 新版 HELP                    |
| RUN / STEP / STOP | ✅   | 整跑 / 单步 / 中断                           |
| SPEED             | ✅   | 快/慢；慢速约 1 行/帧                          |


## 对应 DEMO

- DEMO 23：Numeric modules
- DEMO 24：Text, data, input

---

# 第 13 章 运行限制与兼容性

## 13.1 上限


| 项目    | 限制                     |
| ----- | ---------------------- |
| 源码行数  | 1000                   |
| 单行字符  | 2000                   |
| 单个值   | 16384 字符               |
| 控制台保留 | 2000 行                 |
| 步数    | 慢速 50,000 / 快速 500,000 |
| 递归深度  | 512                    |
| 表达式深度 | 768                    |
| 代码区   | 约 44 列 × 16 行一页        |
| 控制台   | 26 列 × 9 行一页           |
| 变量面板  | 4 行一页                  |


超过限制通常报 `LimitError`、`RecursionError` 或对应的 `ValueError`；用 `STOP` 或 `SPEED` 止损。

## 13.2 与 CPython 的典型差异


| 写法                                | MiniPy         | CPython                     |
| --------------------------------- | -------------- | --------------------------- |
| `print(range(3))`                 | `[0, 1, 2]`    | `range(0, 3)`               |
| `type(range(3))`                  | 列表类型           | `range`                     |
| `repr(d.keys())`                  | `['a']` 这类列表样式 | `dict_keys(['a'])`          |
| `print(Counter('aab'))`           | 对象形式           | `Counter({'a': 2, 'b': 1})` |
| `chr(20013)`                      | `ValueError`   | `中`                         |
| `'\u4e2d'`                        | 字面反斜杠 + `u`    | `中`                         |
| `format(1.5, '.2f')`              | `SyntaxError`  | `1.50`                      |
| `[*a, *b]`                        | 不支持            | 支持                          |
| `a[0][0:1] = ...`                 | 不支持            | 支持                          |
| `namedtuple` / `dict.fromkeys`    | 不支持            | 支持                          |
| `math.comb/perm/lcm/prod/dist`    | 不支持            | 支持                          |
| `json.dumps(..., separators=...)` | 不支持            | 支持                          |
| `os` / 文件 / 网络                    | 不支持            | 支持                          |
| `async/await`、`match`、`:=`、类型注解   | 不支持            | 支持                          |


## 13.3 已知未闭合边界

- 嵌套切片赋值；
- 列表字面量星号展开（调用点星号可用）；
- 字典视图的显式 `repr`/`str` 和部分迭代器生命周期；
- 嵌套删除共享子对象、共享子对象直接传参等深层别名边界；
- `Counter` 的 `repr`/`most_common`；
- `@staticmethod`、带参数装饰器工厂。

## 13.4 验收状态

v5.3 的语言核心沿用 v5.2：1,667 次历史回放中 **1,624 次严格通过**；剩余差异主要是异常文案、时钟/地址相关输出和少量嵌套别名/视图边界。v5.3 演示层完成了 30/30 加载核对、DEMO 25/30 实际 RUN、40/40 回归子集。

---

# 第 14 章 30 个 DEMO 索引


| #   | 标题                      | 类别      | 行数  |
| --- | ----------------------- | ------- | --- |
| 1   | Flow and decisions      | 基础语法与运算 | 23  |
| 2   | Operators and bits      | 基础语法与运算 | 20  |
| 3   | Big integers and floats | 数字与类型   | 12  |
| 4   | Types and conversions   | 数字与类型   | 15  |
| 5   | Text methods            | 字符串与格式化 | 14  |
| 6   | Three format styles     | 字符串与格式化 | 14  |
| 7   | List methods and slices | 列表与元组   | 18  |
| 8   | Tuples and unpacking    | 列表与元组   | 18  |
| 9   | Dictionary methods      | 字典与集合   | 16  |
| 10  | Sets and frozensets     | 字典与集合   | 15  |
| 11  | Loop control            | 控制流与推导式 | 27  |
| 12  | Comprehensions          | 控制流与推导式 | 13  |
| 13  | Arguments and recursion | 函数与闭包   | 27  |
| 14  | Closures and decorators | 函数与闭包   | 36  |
| 15  | Class basics            | 类与继承    | 23  |
| 16  | Inheritance and MRO     | 类与继承    | 34  |
| 17  | Try and custom errors   | 异常处理    | 33  |
| 18  | Groups and context      | 异常处理    | 31  |
| 19  | Yield and send          | 生成器与迭代器 | 30  |
| 20  | Iterator tools          | 生成器与迭代器 | 25  |
| 21  | Builtins in action      | 内建函数与算法 | 19  |
| 22  | Classic algorithms      | 内建函数与算法 | 43  |
| 23  | Numeric modules         | 模块与输入输出 | 22  |
| 24  | Text, data, input       | 模块与输入输出 | 29  |
| 25  | Student grade report    | 混合大程序   | 113 |
| 26  | Text analysis report    | 混合大程序   | 120 |
| 27  | Bank account system     | 混合大程序   | 145 |
| 28  | Matrix laboratory       | 混合大程序   | 157 |
| 29  | Checkout simulation     | 混合大程序   | 175 |
| 30  | Expression evaluator    | 混合大程序   | 167 |


**建议路线**：

1. 先读第 1–3 章，配合 DEMO 1–6；
2. 再读第 4–6 章，配合 DEMO 7–12；
3. 然后第 7–10 章，配合 DEMO 13–20；
4. 最后第 11–12 章，配合 DEMO 21–24；
5. 用 DEMO 25–30 做综合练习，遇到问题回查对应章节。

---

# 附录 A：一页速查


| 想写     | MiniPy                                                                                   |
| ------ | ---------------------------------------------------------------------------------------- |
| 条件/循环  | `if/elif/else`、`while`、`for`、`break/continue`                                            |
| 函数     | `def`、`lambda`、`*args/**kwargs`、`nonlocal`                                               |
| 类      | `class`、`super()`、`@property`、C3 多继承                                                     |
| 异常     | `try/except/else/finally`、`raise from`、`except*`                                         |
| 生成器    | `yield`、`yield from`、`send/close`                                                        |
| 容器     | list/tuple/dict/set/frozenset                                                            |
| 推导式    | 列表/字典/集合 + 多 `for/if`                                                                    |
| 格式化    | `%`、`.format`、f-string                                                                   |
| 大整数/复数 | `2**1000`、`1+2j`、`cmath`                                                                 |
| 模块     | math/cmath/time/datetime/random/statistics/re/collections/functools/itertools/heapq/json |
| 输入输出   | `print`、`input`、控制台/变量面板                                                                 |
| 调试     | `RUN/STEP/STOP/SPEED`、`Line N`、`SrcMap267`                                               |


# 附录 B：不支持速查

- 语法：`:=`、`match`、`async/await`、类型注解；
- 内建：`format`、`bytes`、`object`、`id`、`exec`、`eval`；
- 容器：`dict.fromkeys`、`namedtuple`、`Counter.most_common`；
- 数学：`math.comb/perm/lcm/prod/dist`；
- 文件/网络/第三方库：`os`、`open`、`requests` 等；
- 装饰器：`@staticmethod`、带参数装饰器工厂；
- 赋值：嵌套切片赋值、列表字面量 `[*a, *b]`；
- 字符：`chr` 非 ASCII、`\uNNNN` 转义。

---

*本专辑以 v5.3 的 30 个 DEMO、`v5/FEATURES.md`、阶段 01/02 报告和实测探针为依据；示例与主要功能条目已用 stock scratch-vm 5.0.300 + CPython 3.14.10 抽样核对。*
 
