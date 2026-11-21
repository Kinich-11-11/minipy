# MiniPy_v5 架构与问题评审

> 评审对象：`MiniPy_v5.sb3`（1,109,385 B，构建时间 2026-09-13 21:21）
> 对照：`MiniPy_v4.sb3` / `MiniPy_v4.1.sb3` / `MiniPy_v5.1.sb3`
> 依据：`MiniPy_底层重构方案.md`（v5 设计文档）、真实 scratch-vm 5.0.300 无头运行、CPython 3.14.6 真值比对
> 复现工具与命令见 §9。

---

## 0. 一句话结论

**v5 把「递归树遍历解释器」成功换成了「编译到指令 + 栈式虚拟机」，语言覆盖面比 v4 大一个档次（dict/tuple/类/闭包/生成器/推导式/异常齐全，递归无深度上限），实测快约 2~2.8 倍；但代价是内核体积暴涨 17 倍（4,582 → 79,981 块，其中单个脚本 37,469 块），并且本次实测发现 4 类会「静默给出错误答案」、5 类功能「静默失效」，以及一个「源码行号表从未被读取」导致错误提示与当前行高亮退化的硬伤。**

| 维度 | v4 | v5 | 评价 |
|---|---|---|---|
| 总块数 | 4,582 | **79,981** | 17.5× |
| Interpreter 块数 | 3,247 | **78,646** | 24× |
| 单脚本最大块数 | 259 | **37,469**（`vm_run`） | 编辑器 / 可维护性风险 |
| project.json | 1.06 MB | **14.15 MB** | 压缩后 .sb3 仅 1.06 MB，可传输 |
| Interpreter 变量 | 87 | **180**（含 127 个 `v5regP*`） | 偏离方案 §14 的 ≤150 预算 |
| Interpreter 列表 | 10 | **91** | 全部为平行数组 |
| 自制积木 | 35 | **10**（全部叶子） | 零递归目标达成 |
| 指令集 | — | **42 条** | 与方案 §4 基本一致 |
| 长循环墙钟（range(1,2001)） | 1,072 ms | **383 ms** | 2.8× 提速 |
| 常规 19 例 vs CPython | — | **19/19 全对** | 主干语言可用 |
| 边界用例 vs CPython | — | **22/43 一致** | 见 §6 |
| 报错定位 | `Line 1: NameError: zzz` | `Uncaught: <class 'NameError'>` | **v4 更好，属回归** |
| 递归深度 | fnlimit = 64 | **≥400 正常** | 方案目标达成 |

---

## 1. 作品定位与外壳契约

MiniPy 是一个**跑在 Scratch 舞台里的 Python 教学 IDE**：整个界面（代码区 / 变量区 / 控制台 / 状态栏 / 光标）不是 Scratch 原生 UI，而是用**画笔扩展在 480×360 舞台上逐像素画出来的**；Python 解释器本身也完全由 Scratch 积木实现。全项目只用一个扩展：`pen`。

外壳与内核之间只有一个窄契约（方案 §8），v5 完整保留：

| 接口 | 方向 | 内容 |
|---|---|---|
| `Code`（Stage 列表） | 外壳 → 内核 | 编辑器内容，一行一项 |
| `Output`（Stage 列表） | 内核 → 外壳 | 控制台文本行（**每行硬折行 30 字符**） |
| `Names` / `Values` / `Types`（Stage 列表） | 内核 → 外壳 | **每帧投影**，仅供显示 |
| `RUN` / `HALT` / `INIT`（广播） | 外壳 → 内核 | 运行 / 中止 / 启动 |

Stage 全局变量共 20 个，是全项目的总线：`running mode ticket dirty selected page hscroll outpage varpage status error pc steps busy demo saved stopreq cursor exportShown speed`。

---

## 2. 四个角色的分工

| 角色 | 块数 | 变量 | 列表 | 造型 | 职责 |
|---|---|---|---|---|---|
| **Stage** | 23 | 20 | 7 | 1 | IO 契约 + 全局状态；绿旗只做「初始化 20 个全局量 + 清空 4 个输出列表 + 广播 INIT」 |
| **Controller** | 1,136 | 9 | 0 | 1 | 编辑器与输入：48 个「当按下某键」帽 + 一个「收到 INIT」的轮询循环（`forever { if 鼠标按下 -> 记坐标 -> click -> 等松开; wait 0.02 }`）；`click` 内有 **46 级命中测试 if 链**；`sensing_askandwait` 用于 EDIT / IMPORT 的文本输入 |
| **TextRenderer** | 176 | 5 | 0 | **95** | **软件渲染器**：`draw` 用 `pen clear` + 逐字符 `pen stamp` 画满屏；字形来自 95 个 ASCII(32..126) SVG 造型；字宽 5.1px；由 `dirty` 变量驱动，`forever { if dirty=1 { draw; dirty=0 }; wait 0.03 }` |
| **Interpreter** | **78,646** | **180** | **91** | 95 | 内核：词法 → 语法 → 编译 → 虚拟机；同时携带一份与 TextRenderer 相同的 95 造型（md5 去重，不增体积，属冗余挂载） |

启动时序：绿旗 → Stage 置初值并广播 **INIT** → Controller 进入鼠标轮询、必要时自动载入 DEMO 1；TextRenderer 进入重绘循环；Interpreter 待命，直到 Controller 发 **RUN**。`HALT` 帽只做一件事：`stop other scripts in sprite`。

---

## 3. 内核架构（v5 方案的实施情况）

### 3.1 四级管线，每一级都是「非递归的巨型脚本」

```
Code(行文本)                                          [Stage 列表]
  | lex_all      1,296 块   逐字符状态机
  v
TokT / TokV / TokL / IndStk                           [4 个列表]
  | parse_all   24,163 块  调度场 + 显式缩进块栈
  v
NdK / NdA / NdS / NdN / NdC / NdG                      [6 个列表，节点堆]
  | compile_all 12,048 块  显式工作栈后序 + 跳转回填表 PatchSite / PatchSlot
  v
Iop / Ia / Ib / Iline / Kval                           [代码映像，只读]
  | vm_run      37,469 块  fetch-decode-execute 单循环
  v
Output + Names / Values / Types(投影)                  [Stage 列表]
```

**零递归目标确实达成**：10 个自制积木（`reset_vm / print_line / dump_tok / dump_ast / dump_code / lex_all / parse_all / compile_all / init_vm / vm_run`）经调用图校验**全部是叶子** —— 没有任何一个自制积木调用另一个自制积木。Scratch 线程栈深度恒为 1，v4 的 `fnlimit` 类深度上限从结构上消失（实测递归 400 层正常，v4 只能到 64）。

### 3.2 值表示：自描述字符串（标签 + 载荷）

一个值 = 一个字符串，首字符是类型标签。从代码里的 `operator_join` 常量可确认实际使用的标签：`N`(int/float) `S`(str) `B`(bool) `Z`(None) `L`(list) `T`(tuple) `D`(dict) `F`(function) `C`(class) `O`(instance) `E`(异常实例)。
效果是真实的：v4 的 `print(True) -> 1`、`'a'<'b' -> 1` 这类问题**已修复**（实测 `print(True)` → `True`，`print(None)` → `None`）。

### 3.3 存储布局：91 个平行列表，按索引寻址

方案 §2 的表格被逐字落实，`reset_vm`（100 块）一次清空其中 **90 个**（唯一保留的是寄存器文件 `Reg`），不存在跨次运行的残留：

- 代码映像：`Iop Ia Ib Iline Kval`
- 求值栈 / 帧栈：`Stk` + `FrKind FrRet FrEnv FrBase FrTop FrAux FrGlob`，手工栈指针 `sp` / `frTop`
- **统一的「名字 → 值」机制**：`BindName BindVal BindNext` + `MapHead MapParent MapKind`（作用域 / dict / 模块 / 类 / 实例属性共用一张绑定链）
- 符号与堆：`Fn*`(函数表) `Cl*`(类表) `In*`(实例表) `LStart LCount LCap LArr`(列表堆)
- 调试 / 异常 / 中间产物：`HdFr HdSt HdPc`、`Tok*`、`Nd*`、`Wk*`、`Js*` 等

栈一律「平行数组 + 手工指针」，没有使用 `insert 1 of`（O(n) 栈在深递归下会炸）—— 方案 §11 的禁止项被遵守。

### 3.4 指令集：42 条

`ASRT BIN BUILD CALL CLASS CMP DEF DELIDX DELV DUP ENDTRY GDEF GETATTR GLOBAL HALT IMPORT IMPORTFROM ISINST ITER JMP JZ LAMBDA METH NCHK NEXT NONLOCAL NOP POP PUSHK PUSHN PUSHV RAISE RERAISE RET RETN SETATTR STOREV SUBS SUBSSET TRY UN YIELD`

> 注：代码里还有 `B0 B1 C2 C3 C5 C6 C7 C10 C11` 这类两字符常量，它们是 `BIN` 的**运算子码**（分支编号），不是独立指令。

**分派实现**：Scratch 没有跳转表，所以 `vm_run` 采用「**首字母树 + 组内全码比对**」：

```
until (halted == 1) or (err != ""):
  op = Iop[pc]
  if letter 1 of op = "P":  ... PUSHK / PUSHN / PUSHV / POP ...
  else if letter 1 of op = "B": ... BIN / BUILD ...
  else if ... "J"(JMP/JZ) "S"(STOREV/SUBS/SUBSSET/SETATTR) "C"(CALL/CLASS/CMP ...)
              "N" "D" "I" "G" "U" "M" "R" "L" "A" "T" "E" "H" "Y"
```

18 个首字母分支，组内 THEN 分支规模极不均匀：`C` 组 **15,108 块**、`M` 组 **8,720 块**、`B` 组 4,358 块 —— 这三组占了 `vm_run` 的四分之三。这也解释了 37,469 这个数字：**每条指令的处理体都是内联展开的**（`Ia[..]` 取值点 54 处、`FrEnv` 链查找、`Reg` 寄存器读写 371 处），没有拆成子过程。

### 3.5 时间片：按实测毫秒让帧（方案 §13 的约束被落实）

`vm_run` 主循环里有两处完全相同的让步逻辑：

```
if (speed == "0") or (tick > nextTick):            # Reg[18]=执行计数, v5regP2=下一个检查点
    if (speed == "0") or ((daysSince2000 - v5regP1) * 86400000 >= 16):   # 距上次让步 >= 16ms
        v5regP1 = daysSince2000
        steps   = Reg[18]        # 面板显示的执行步数
        dirty   = "1"            # 请求 TextRenderer 重绘
        wait 0                   # 让出一帧
    nextTick = Reg[18] + 2000    # 每 2000 条指令检查一次
```

即：**每 2000 条指令检查一次是否已跑满 16ms，跑满就让帧并刷新面板**；`speed == 0`（单步模式）则每个检查点都让帧。这比「按固定指令条数切片」更贴合方案 §13 的结论。

### 3.6 附赠能力确实存在

- **`#!bp N`** 断点：RUN 帽读取 `Code[2]` 存入 `Reg[34]`，主循环开头比对 `pc`，命中则置 `status = "Breakpoint at ..."` 并停下。
- **`#!trace`** 指令级跟踪：把 `pc / op / sp / frTop` 打进 `Output`。
- **`#!dump` / `#!tok` / `#!ast` / `#!code`**：分别 dump 词法、AST、代码映像。
- 这些都是 v4 的树遍历解释器做不到或代价极高的东西 —— 方案的「顺带白拿」论断成立。

---

## 4. 实测数据

### 4.1 正确性（scratch-vm 5.0.300 无头 + CPython 3.14.6 逐条比对）

**常规程序 19 例：19/19 与 CPython 完全一致**，覆盖算术（`7/3 = 2.3333333333333335`、`7**3 = 343`）、bool/None 打印、字符串下标切片、for/while/break、list/dict/tuple、def/递归 fib、闭包、try/except/finally、类与方法、列表推导式、内建函数（`round(3.14159,2) = 3.14`、`pow(2,8) = 256`）、200 项列表、字符串迭代、50×50 双层循环。

**边界 / 差异用例 40 + 43 + 5 例**：分别 23/40、22/43、1/5 一致。失败的绝大多数集中在 §6 的 P0 / P1 类问题。其中三个 `error_*` 用例是**测试脚手架误报**（CPython 的 traceback 走 stderr，只比对了 stdout），v5 的抛错行为本身是对的。

### 4.2 性能

| 程序 | v4 中位 | v5 中位 | 提速 |
|---|---|---|---|
| `for i in range(1,201): t = t + i*2` | 99.9 ms | **52.0 ms** | 1.9× |
| `for i in range(1,2001): t = t + i*2` | 1,071.9 ms | **382.8 ms** | 2.8× |

同负载执行的块数（桩 profiler）：v4 836,675 块 vs **v5 383,038 块**（少 2.18×）—— 与方案 §13 预估的「2~4× 提速」吻合。
加载耗时：v4 230 ms、v5 913 ms（Node 无渲染器）。

> 测量注意：挂上 profiler 桩后 v5 的墙钟会劣化 5 倍以上（v4 只有约 1.6 倍），所以上表两组数字均为**不挂 profiler** 的纯墙钟。「块 / 秒」这个指标在本项目上不可靠，不要直接用。

---

## 5. 读懂内核必须先知道的 3 件事

1. **`ord()` 是靠切造型实现的。** Scratch 没有字符 → 编码的内建，于是 `vm_run` 里有 **62 处** `switch costume to join("_", 字符)` 紧接 `costume number`，用「造型序号 = ASCII − 31」把字符转成编码（随后再用 `letter(码, " !\"# ... ~")` 转回来）。Interpreter 的造型名正是 `_ `、`_!` … 见 §6-P2 的性能后果。
2. **`Reg` 是动态索引寄存器堆。** 44 槽的 `Reg` 列表 + 127 个静态命名的 `v5regP0..P141`（编号有 15 个空洞）= 142 个逻辑寄存器。凡寄存器编号在编译期算不出来的地方就走 `Reg[k]`（`Reg` 读写共 371 处）。
3. **`Iline` 是死表。** 见 §6-P1-1。

---

## 6. 问题清单

> 每条给出**最小复现**与**实测输出**（mini = MiniPy v5，py = CPython 3.14）。测试方法见 §9。

### P0 — 会静默给出错误答案（最危险，应优先修）

#### P0-1 单行复合语句（simple suite）的条件被忽略 / 循环体被提出循环

Python 允许 `if c: stmt` 这种单行写法，v5 对它的处理是错的，而且**不报错**：

| 代码 | mini 实测 | CPython |
|---|---|---|
| `if 1 == 2: print('RAN')` | `RAN` ❌ | 无输出 |
| `x = 0` / `if x > 5: x = 99` / `print(x)` | `99` ❌ | `0` |
| `def f(x):` / `    if x > 5: return 999` / `    return 1` / `print(f(0))` | `999` ❌ | `1` |
| 函数内 `if False: return 999` | `999` ❌ | 走下一行 |
| `if x == 0: pass` / `else: x = 7` | `7` ❌ | `0` |
| `for i in range(4): t = t + i` / `print(t)` | `3` ❌（只在 i=3 执行一次） | `6` |
| `for i in range(3): print(i)` | 只打印 `2` ❌ | `0 1 2` |
| `while i < 3: i = i + 1` / `print(i)` | 无任何输出 ❌ | `3` |

**结论**：单行 `if / else` 的分支跳转没有生成；单行 `for / while` 的循环体被挂到了循环之外。多行写法（正常缩进）完全正常，因此这个 bug 极易被教学场景撞上（学生写 `if x > 5: print('big')` 是常态），而且反馈是「结果不对但不报错」。

#### P0-2 链式比较

```python
print(4 > 3 > 2 > 1)   # mini: False   py: True    ❌
print(1 < 5 > 3)       # mini: False   py: True    ❌
print(1 < 2 < 3)       # mini: True    py: True    （巧合）
```

`a < b < c` 被当成 `(a<b) < c` 的二元左结合链求值。第一条因为布尔与整数可比较而「碰巧」对，属于典型静默错误。v4 同样有此问题（表现为 `1/0`），v5 只是换成了 `True/False`，**没有修**。

#### P0-3 列表 / 元组运算静默返回空

```python
a = [1,2]; b = [3]; c = a + b
print(c)           # mini: ""（空）   py: [1, 2, 3]   ❌
print(len(c))      # mini: 0          py: 3           ❌
print([0]*3)       # mini: len 0      py: [0, 0, 0]   ❌
print((1,2)+(3,))  # mini: ""         py: (1, 2, 3)   ❌
```

`+` / `*` 落到 `L` / `T` 标签时没有分支，返回空值而不是抛 `TypeError`。

#### P0-4 列表方法的三处错误

```python
a = [1,2,3]; print(a.pop())            # mini: IndexError: pop from empty list（列表并不空）❌  py: 3
a = [1]; a.insert(0, 'hi'); print(a)   # mini: ['']  <- 字符串参数被吞成空串 ❌              py: ['hi']
                                       # （insert 数值参数正常：insert(0, 2.5) -> [2.5, 1] ✓）
```

`pop()` 无参路径的默认下标算错；`insert` 只在数值载荷下正确。

#### P0-5 `for` 遍历 dict 静默空转

```python
d = {'a':1,'b':2}
for k in d:
    print(k)       # mini: 什么都不打印，也不报错 ❌   py: a / b
print('end')       # mini: end
```

（`list(d.keys())`、`len(d)`、`d[k]` 都正常，只有直接迭代 dict 不工作。）

#### P0-6 异常对象不是「对象」

```python
try:
    raise ValueError('boom')
except ValueError as e:
    print(type(e))   # mini: <class 'int'>   ❌  py: <class 'ValueError'>
    print(e)         # mini: <object>       ❌  py: boom
    print(str(e))    # mini: <object>       ❌  py: boom
```

另外**裸 `raise`（重抛）** 会变成 `Error: Uncaught: None`：

```python
try:
    raise ValueError('boom')
except ValueError:
    print('first')
    raise              # mini: 打印 first 之后整个程序 Uncaught: None ❌   py: 正常向上抛
```

#### P0-7 `int()` 校验被去掉（相对 v4 的**回归**）

```python
print(int('12x'))    # mini: 0        ❌   py: ValueError
print(float('abc'))  # mini:（空）     ❌   py: ValueError
```

v4 在同样输入下会报 `ValueError: invalid number`；v5 静默返回 0，于是 `try: int('abc') except ValueError` **永远不会进 except 分支** —— 异常教学直接失效。这属于重写时把校验逻辑丢了。

#### P0-8 字符串 `%``` 格式化

```python
print('%.2f' % 3.14159)   # mini: 3.141592f   ❌   py: 3.14
print('%d' % 7)           # mini: 7          （无精度时正确）
```

精度 / 宽度被吃掉，输出的是拼接残渣。

### P1 — 诊断与可见性退化（不产生错答案，但严重影响可用性）

#### P1-1 `Iline` 是死表：错误无行号、断点是字节码地址、当前行高亮错位

- 代码映像里 `Iline` **只有 add / delete all，全项目 0 处读取**（已用字段级统计确认）。
- 实测一次 `a=1 / b=2 / c=a+b / print(c) / print(a)`：`Iline = ["0","0", ... × 17]`，**整张表全是 0**。
- 后果 1：错误信息丢掉行号。v4 是 `Line 1: NameError: zzz`，v5 是 `Uncaught: <class 'NameError'>` —— **连出错的名字都没有**（`NameError` 本身也不带 name）。
- 后果 2：`TextRenderer.draw` 判断当前行用的是 `if running = 1 and rline = pc`，而 `pc` 是**字节码地址**（上面那个 5 行程序编译出 17 条指令，`pc` 取值 1..17），`rline` 是 1..16 的**源码行号**。两者不同量纲 ⇒ 代码面板的「当前执行行」高亮要么错行、要么完全不亮。
- 后果 3：`#!bp N` 断在「第 N 条指令」而不是「第 N 行」，与用户直觉不符（`status` 还会打印 `Breakpoint at <pc>`）。

#### P1-2 输出硬折行 30 字符，且 `print` 不拆内嵌换行

```python
print('0123456789012345678901234567890123456789')
# mini: ["012345678901234567890123456789", "0123456789"]   py: 一整行
print(2**100)      # 同样被切成 31 + 1 两行
print('a\nb')      # mini: 1 条含真实换行的记录（屏幕上渲染成一个空格）  py: 2 行
```

30 字符是控制台面板宽度（163px ÷ 5.1px）决定的，属设计取舍，但结果是**任何长数字 / 长字符串的复制粘贴都会变形**；而 `\n` 不换行则是纯粹的语义缺陷。

#### P1-3 解析器覆盖面缺口（会整程序编译失败，不是局部跳过）

| 写法 | mini | 说明 |
|---|---|---|
| `1e10` | `SyntaxError: unexpected )` | 指数浮点字面量不支持（v4 也不支持） |
| `x = 1; y = 2` | `SyntaxError: unexpected ;` | 分号分隔语句不支持 |
| 括号跨行的 `x = (1 +` 换行 `2)` | `IndentationError: expected an indented block` | 续行不支持 |
| `f'{n:03d}'` | 编译期 `NotImplementedError: f-string format spec`，**整程序一行都不执行** | 无格式串的 f-string 可用，带格式串直接拒绝编译 |
| `def f(x, y=[])` | 编译期 `NotImplementedError: default value must be a literal` | 默认值必须是字面量 |
| `{1,2,3}` | 被当 dict 解析成 `{1: 2, 3: }` | 无集合类型，且是**静默错解析**而非报错 |

#### P1-4 内建函数缺口

`map` / `isinstance` 未定义（`NameError`，且如前所述不带名字）；`list` `range` `sorted` `sum` `max` `min` `abs` `len` `str` `int` `float` `round` `pow` `type` 可用。
另外 `def f(*rest)` 绑定的是 **list** 而非 tuple（`print(rest)` → `[]`，Python → `()`），与 v5 自己的 `T` 标签设计不自洽。

### P2 — 性能与渲染

#### P2-1 用「切造型」当 `ord()`：每次字符转换都会打到渲染器

`vm_run` 里 62 处 `switch costume to join("_", ch)`。查 scratch-vm 源码（`sprites/rendered-target.js:433`）：

```js
setCostume (index) {
    ...
    if (this.renderer) {
        this.renderer.updateDrawableSkinId(this.drawableID, costume.skinId);   // 渲染器调用
        if (this.visible) { this.emit(EVENT_TARGET_VISUAL_CHANGE, this); this.runtime.requestRedraw(); }
    }
    this.runtime.requestTargetsUpdate(this);      // <- 无条件：GUI 会重新序列化该角色
}
```

即使 Interpreter 是 `visible = false`，**`updateDrawableSkinId` 与 `requestTargetsUpdate` 每次都会执行**。词法阶段每次「字符 → 编码」都触发一次角色更新请求。Node 无渲染器测不出来，在浏览器里这是实打实的每字符开销；方案 §13 自己提醒的「浏览器里吞吐掉 30~50%」很可能主要来自这里。

#### P2-2 TextRenderer 每个字形 2 次造型切换 + 1 次 stamp

`text %s %s %s %s %s` 的循环体是：

```
switch costume to "32"      # 先切到空格，作为「未知字形」的兜底
switch costume to rc        # 再切到目标字符（找不到就保持在空格）
go to x: rx y: ty
pen stamp
```

第一次切换是兜底逻辑，但对 95% 的合法字符是**纯浪费**（再叠加 P2-1 的渲染器开销）。一屏满绘 ≈ 16×50 + 4×50 + 9×50 + 标签 ≈ 1,500 字形 ≈ 3,000 次造型切换 + 1,500 次 stamp。`dirty` 由内核每个时间片置 1，所以**跑程序时基本是每帧全屏重绘**。界面刷新很可能才是真实瓶颈，而不是 VM 本身。

#### P2-3 时间片检查用 days-since-2000

每 2000 条指令调用一次 `sensing_dayssince2000`（`Date.now()` 级调用）再乘 86400000。功能正确，但在最热的循环里多了一次浮点乘法和一次宿主调用；换成 `timer`（Scratch 内建毫秒计时器）会更轻。

### P3 — 工程与可维护性

1. **单脚本 37,469 块**（`vm_run`）＋ `parse_all` 24,163 ＋ `compile_all` 12,048。Scratch 编辑器（scratch-blocks 是**非虚拟化**的 Blockly）要为每个积木创建一个 SVG 对象，37k 块在一个堆栈里远超常规规模 —— **在 scratch-gui / TurboWarp 里点开 Interpreter 角色极可能长时间卡死甚至崩页**。（本条为基于渲染器实现方式的推断，本次评审没有浏览器环境可实测；但从「单栈四位数块数已是编辑器舒适上限」的通例看，风险很高。好消息是 `.sb3` 只有 1.06 MB，压缩后远低于平台限制，传输 / 加载本身没问题。）
2. **变量预算超标**：方案 §14 的验收线是「手写状态变量 50~90、机械临时 0、临时总数 ≤150」。实测 Interpreter 有 180 个变量 = **53 个手写状态量 + 127 个 `v5regP*` 机械临时**。方案里「把 PI 1.31 的 5,282 个脚手架降到 0」这个卖点，实际结果是降到了 127（+44 槽 `Reg`）—— 成绩很大，但**没有达到自己写的验收指标**，也没有文档说明为何放宽。
3. **仓库里没有 v5 的生成器**。`_work/` 下只有 v4 时代的 `build.js`（189 KB）/ `build-v4.1.js`，`MiniPy_v5.sb3` 对应的构建脚本不在项目目录中。这意味着**现在任何人都无法修改 v5 内核**（37k 块的脚本不可能手改，连在编辑器里定位一个 opcode 都做不到），可维护性完全依赖那个未归档的生成器。这是当前最大的工程风险。
4. **Interpreter 挂载了 95 个用不到的造型**（与 TextRenderer 同名同 md5，只增加角色面板噪音）。
5. **`speed` 语义**：全项目只在 Interpreter 里读 2 次（时间片让步），语义是「0 = 单步 / 演示，其他 = 全速」，但变量名与界面按钮的关系在代码里没有任何注释。
6. **`dump_tok / dump_ast / dump_code`** 只在 `#!dump` 分支里被调用；对使用者是隐藏功能，对维护者却是必须保留的回归工具 —— 建议在 README 写明。

---

## 7. 与 v3 / v4 / v4.1 / v5.1 的对照

| | v3 | v4 | v4.1 | v5.1 | **v5** |
|---|---|---|---|---|---|
| Interpreter 块 | 1,710 | 3,247 | 2,100 | 69,525 | **78,646** |
| Interpreter 变量 | 60 | 87 | 72 | 203 | **180** |
| Interpreter 列表 | 3 | 10 | 8 | 90 | **91** |
| project.json | 0.67 MB | 1.06 MB | 0.77 MB | 13.25 MB | **14.15 MB** |

语言能力上 v5 是**明确的跃升**：本次构造的 try/except、class、dict、lambda、推导式、生成器、闭包等用例，v4 几乎全部跑不了（报 `IndentationError` / `SyntaxError`，或 `boperat_n7t2r0hc` 这类内部错误），递归上限 64；v5 全部可用且递归 ≥400 层。
同时 v5 在以下三点上**不如 v4**：① 错误信息丢了行号和名字（P1-1）；② `int()` / `float()` 的输入校验丢失（P0-7）；③ 规模从「人可通读」变成「只能靠生成器」。

v5.1（69,525 块 / 203 变量 / 90 列表）是 v5 的前一版快照：v5 相比它多了 `Reg` 列表、变量从 203 精简到 180、块数增加约 9k（应为补功能与合并分支）。

---

## 8. 建议（按性价比排序）

**第一优先（正确性，改动量小、收益极大）**

1. **修单行复合语句**（P0-1）。这是编译器的 simple-suite 分支：症状是「条件不生成跳转 / 循环体未纳入循环」。它会直接毁掉教学体验，且因为是静默错误，学生会把问题归咎于自己。
2. **修链式比较**（P0-2）：比较链应编译成 `a < b and b < c`（中间操作数只求值一次），而不是二元左结合。
3. **补 `L` / `T` 的 `+` / `*` 分支**（P0-3）：要么实现，要么明确抛 `TypeError`，**绝不能返回空值**。同理修 `pop()`、`insert()`（P0-4）。
4. **恢复 `int()` / `float()` 的格式校验**（P0-7）：把 v4 的校验逻辑搬回来，异常教学才成立。
5. **让异常对象是对象**（P0-6）：`E` 标签的实例要能查到自己的类名与 args；裸 `raise` 要走 `RERAISE` 而不是 `RAISE None`。
6. **补 `for ... in <dict>`**（P0-5）：复用 `ITER` 路径，迭代键即可。

**第二优先（可见性，成本极低）**

7. **填 `Iline` 并让主循环维护「当前源码行」**：编译器发射每条指令时写源行号；RUN 循环里把 `Iline[pc]` 写进一个**新**全局（例如 `curline`），TextRenderer 改用它高亮；错误信息把 `Iline[pc]` 拼到消息前面，恢复 v4 的 `Line N: ...`。同时把断点语义改成「行号」。
8. **错误信息带上名字**：`NameError` 至少给出变量名（v4 做到了）。

**第三优先（性能）**

9. **干掉 62 处「切造型当 ord()」**：改成查表法 —— Interpreter 的 95 个造型名天然是 `_ + 字符`，改用**一个列表**（初始化时把 ASCII 32..126 填进去）配合 `item # of` 即可，彻底不碰渲染器。同理去掉 TextRenderer `text` 里那次多余的 `switch costume to "32"`（改成先 `item # of` 命中再切）。
10. 时间片检查从 `daysSince2000` 换成 `timer`（P2-3）。

**第四优先（工程）**

11. **把 v5 的生成器纳入仓库**（例如 `tools/build-v5.js`）并在 README 写明「内核是生成的，不要手改」；这一步不做，v5 实质上不可维护。
12. 补一份**验收脚本**并纳入 CI：用例已经合并成 `_work/v5test/cases_all.json`（**107 条**，含 19 条常规用例），配合 §9-1 的 `diff.mjs` 即可每次重建与 CPython 跑一遍比对。
13. 变量预算：给 127 个 `v5regP*` 一个明确说法（写进方案的修订版，或按原方案压到 ≤150 总数）。
14. 考虑把 `vm_run` 的 18 个首字母分支**拆成 18 个自制积木**（每个只被主循环调用一次，仍是无递归的深度 2），单脚本可从 37k 降到几千块，编辑器和 diff 都还能用；代价是每条指令多一次 Scratch 过程调用（约几十块），需要实测权衡。**这是唯一能让 v5 重新变得「人可读」的结构性改动。**

---

## 9. 复现与本次使用的工具

全部放在 `_work/v5test/`（Node + `D:\users\OneDrive\Desktop\scratch-vm-test\node_modules\scratch-vm` 5.0.300；CPython 用 `C:\Users\69241\AppData\Local\Programs\Python\Python314\python.exe` —— 注意 Node 直接 spawn `python` 会返回 9009，必须用全路径）：

```powershell
# 1) 常规 19 例 + 边界 40 例，与 CPython 逐条比对（扩充 cases_*.json 即可）
node _work/v5test/diff.mjs  MiniPy_v5.sb3 _work/v5test/cases_diff.json _work/v5test/diff_res.json
# 2) 只跑 MiniPy、打印每例输出（用于快速确认某条 bug）
node _work/v5test/probe.mjs MiniPy_v5.sb3 _work/v5test/cases_probe2.json x
# 3) 性能：多次取中位数的纯墙钟（不要挂 profiler）
node _work/v5test/bench3.mjs MiniPy_v5.sb3 "t = 0|for i in range(1, 2001):|    t = t + i * 2|print(t)" 7
# 4) 静态体检（悬挂引用 / 孤儿块 / 调用图 / 变量清单 / 指令集 / 分派树 / 时间片 / Reg / Iline）
node _work/v5ops.js ; node _work/v5static2.js ; node _work/v5vars.js ; node _work/v5iline.js
# 5) 运行中读取代码映像（Iline / Iop / Ia / Kval）与 pc
node _work/v5test/pcprobe.mjs
```

已抽出的可读产物：`_work/v5-defs.txt`、`_work/v5-scripts.txt`、`_work/v5-detail.txt`、`_work/v5-static2.txt`、`_work/v5-analysis.json`、`_work/v5test/progress.log`、`_work/v5test/p2_v5.txt` / `p2_py.txt`。

### 关于用 sb3-creator（BrickWright）重述 / 重建内核

本次也验证了 `D:\编程\scratch\ai\minipython\sb3-creator-main` 的工具链可用：

```powershell
cd sb3-creator-main\sb3-creator-main
node bin/sb3c.mjs --check program.bw      # -> ok / parsed N target(s)
```

它**适合做 v5 内核对外的「可读孪生体」**：把 42 条指令与 `vm_run` 的分派结构用 BrickWright 伪代码重述（`SPRITE Interpreter:` + `WHEN I receive "RUN":` + `DEFINE step:` 之类），比 37,469 块的 .sb3 好读几个数量级，也正好可以当成 §8-14「拆分单脚本」的设计稿。但它**不适合当 v5 的唯一真源**：BrickWright 的自制积木就是 Scratch 过程调用，一旦把 18 个分派分支拆成 `DEFINE`，就等于在热路径上给每条指令多加一层调用，与「所有 opcode 处理器都是叶子」的设计前提相冲突 —— 这个取舍必须先实测（可以用 `bin/sb3c.mjs` 生成一个只含 `vm_run` 拆分版的对照工程，再用 §9-3 的方法量一次墙钟）。
