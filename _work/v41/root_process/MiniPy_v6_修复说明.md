# MiniPy v6 修复说明

- 对象：`MiniPy_v6.sb3`（由 `MiniPy_v5` 内核派生）
- 依据：`MiniPy v5 完整架构与对比报告`（下称「报告」）的 P0 / P1 / P2 清单
- 生成链：`_work/v5/build5.js` → `_work/v5/kernel/*` + `_work/v5/regalloc.js`（**仓库里一直有生成器**，见 §8）
- 验收：`pwsh -File _work/v6/verify6.ps1`（结构 + 29 套件 375 例 + 8 条诊断断言），构建逐字节可复现

---

## 0. 结论

| 指标 | v5 | v6 |
|---|---|---|
| Interpreter 积木 | 78,646 | **91,429** |
| 变量 / 列表 | 180 / 91 | 180 / **93** |
| 文件 | 1,109,385 B | 1,283,337 B |
| 报告 P0 最小回归集（31 例） | **8 / 31** | **31 / 31** |
| 语义回归集（35 例，CPython 真值） | 13 / 35 | **35 / 35** |
| 报错行号断言（8 条） | 0 / 8 | **8 / 8** |
| `except Exception` 能抓内建异常 | 否 | 是 |
| 外壳 DEMO 9 页（含 2 页 input） | 7 / 9 | **9 / 9** |
| TurboWarp 引擎上 9 页 demo | 1 / 9 | **9 / 9** |
| 双引擎（官方 5.0.300 / TurboWarp）375 例 | — | **两边全绿** |
| 边界语料差分（107 例，v5 对 v6） | — | 同 72 / v6 更优 35 / v6 更差 0 |
| 原有回归（去掉过期真值对后 288 例） | 288 / 288 | **288 / 288（无回归）** |
| Interpreter 积木 | 78,646 | **91,994** |
| 墙钟（fib(11)，3300 条指令） | 91 ms 最好 / 102 ms 中位 | 96 ms / 116 ms |
| 墙钟（for 3000 次，30014 条指令） | 595 ms / 635 ms | 590 ms / 652 ms |

一句话：**v6 把报告里「会静默给错答案」的那批问题全部堵住，并补回了退化掉的诊断；性能与 v5 持平（同量级，差异在调度抖动范围内）。**
性能没有变好，也没有变坏——报告 §8.2 那一刀（局部变量 slot 化）没有动，理由见 §6。

---

## 1. P0：静默错误逐条对照

每一行都在 `_work/p0.json`（报告 §9.4 那 12 行 + 19 条同类边界）里有对应用例，真值来自 CPython 3.14.6。

| # | 最小例子 | v5 | v6 | 修复落点 |
|---|---|---|---|---|
| 1 | `if 1 == 2: print('RAN')` | 打印 `RAN` | 无输出 | `parse.js` 单行 suite |
| 2 | `for i in range(3): print(i)` | 只打印 `2` | `0/1/2` | 同上 |
| 3 | `while i < 3: i = i + 1` + 后续语句 | 后续语句被吞进循环体 | 按 Python | 同上 |
| 4 | `4 > 3 > 2 > 1` | `False` | `True`，且中间项只求值一次、可短路 | `pexpr.js` + `compiler.js` `compChain` + 新指令 `CMPK`/`CKJZ` |
| 5 | `[1,2]+[3]` / `[0]*3` / `(1,2)+(3,)` | 空 / None | `[1, 2, 3]` / `[0, 0, 0]` / `(1, 2, 3)` | `vm.js` `seqPlus`/`seqRepeat` |
| 6 | `int('12x')` | `0`（v4 回归） | `ValueError: invalid literal for int() with base 10: '12x'` | `vm.js` `intFromStr` |
| 7 | `a.pop()` | `IndexError` | 弹出末项 | `vm.js` `pop` 默认下标 |
| 8 | `a.insert(0,'hi')` | 字符串变空串 | `['hi', 1, 2]` | `vm.js` `insert` 保留标签 |
| 9 | `for k in d: …` | 静默空转 | 按键的插入顺序遍历 | `vm.js` `iterBlock` 新 `D` 分支 |
| 10 | 裸 `raise` | `Uncaught: None` | 处理器内重抛当前异常；否则 `RuntimeError: No active exception to reraise` | 新指令 `RAISEN` + `XSET`/`XCLR` |
| 11 | `str(e)` / `type(e)` | `<object>` / `<class 'int'>` | `division by zero` / `<class 'ZeroDivisionError'>` | 异常值改为 `X<类号>|<消息>` |
| 12 | `'%.2f' % 3.141592` | `3.1415922f` | `3.14` | `vm.js` `strFormat` 规格扫描 + 定点补齐 |

顺带修掉的同类问题（同一批用例覆盖）：

- **`except Exception` 从来抓不到任何内建异常**：13 个内建异常类的 `ClBase` 全是 0。现在除 `Exception` 自身外都继承 `Exception`，且 `ISINST` 会沿 `ClBase` 走链。这是报告 §6.3 里没写到、但比条目 11 更严重的一处。
- **`(3,)` 不是元组**：解析器只在括号内元素 > 1 时建元组节点，`(3,)` 退化成数字 3。
- **`type(用户类实例)` 恒为 `<class 'int'>`**；现在 `C`/`O`/`X` 三种标签都能给出正确类名。
- **类名/函数名带大小写签名**：`print(C)` 过去是 `<class 'C|1'>`，现在是 `<class 'C'>`（绑定名保留签名，只清洗展示名）。
- **推导式循环变量泄漏**（报告 §6.4）：`i = 99; x = [i for i in range(3)]; print(i)` 由 `2` 变 `99`。原因不在编译器，而在 `STOREV`：顶层赋值一律写全局 map，绕过了 `LCBEGIN` 建的推导式作用域。现在当前 frame 的环境是推导式 map（`MapKind='L'`）时改写到该 map。原先记录在案的 4 条「已知偏差」用例（`ctest.json`）现在全部通过，已并入默认验收。

---

## 2. 单行 suite 是怎么修的

报告的判断「suite 接到了错误的控制节点上」是对的，但根因更靠前：v5 的解析器**根本没有单行 suite 这条路径**。

- 词法器逐行产 token，每行末尾必有 `W`。
- 复合语句头（`if/while/for/with/def/class/try/except/else/finally`）遇到 `:` 后只做 `ps=0`，等着下一行的 `>`（缩进）token 去 `indentOpen`。
- 单行写法没有 `>`，于是「suite 永远是空」：`if 1 == 2:` 的 body 空，后面的 `print('RAN')` 掉进**外层** suite。

v6 加的机制（都在 `parse.js`）：

| 名字 | 作用 |
|---|---|
| `wantSuite` | 复合语句头置 1，表示「下一件事是收一个 suite」 |
| `openSimpleSuite()` | 头之后若下一个 token 不是 `>`，就地建一个 suite 节点挂到块的 `BlS` 槽，并把 suite 指针压栈、`ssDepth+1` |
| `ssLine` | 记下该 suite 所在的源码行；**任何语句开始前**若当前 token 的行号 != `ssLine`，就收掉这个单行 suite |
| `closeSimpleSuites()` | 逐层退栈并复用 `blockContinuation`：下一个 token 是 `elif/else/except/finally` 时保留块（`if x: a=1` 换行后接 `else: b=2` 仍然正确） |
| `blockContinuation(innermost)` | 从 `dedent()` 里提出来的公共逻辑，缩进 dedent 与单行 suite 收尾共用 |

用行号而不是「遇到 `W`」触发收尾，是因为语句解析器常常**自己把 `W` 吃掉**（`asExprStmt`、`pending()` 的各分支），等 `stmtStart` 再看时 token 已经是下一行的了。

另外按 CPython 的语法，单行 suite 里再出现复合语句是非法的，v6 会报 `SyntaxError: compound statement in a one-line suite`（`if True: if True: print('n')` 在 CPython 3.14 同样是 SyntaxError）。

---

## 3. 链式比较：不是简单改成 and

AST 里本来就有 `cmp` 节点（`pexpr.js` 的 `extendCmp`），但**从未被触发**：`reduceOne` 只在左操作数已经是 `cmp` 节点时才扩展链，而二元比较先被折叠成 `bin`，所以 `4>3>2>1` 永远降成左结合 `((4>3)>2)>1`。

v6 的做法：

1. `reduceOne`：左操作数是「比较类 `bin`」时也转成 `cmp`（括号包起来的操作数带 `NdG='p'` 标记，`(4>3)>2` 保持嵌套语义）。
2. 编译 `cmp` 节点时不再发单条 `CMP`，而是发一条短指令链（`compiler.js` `compChain()`）：

```text
<a> <b> CMPK <   CKJZ Lfalse   <c> CMPK <   CKJZ Lfalse   <d> BIN <   JMP Lend
Lfalse: POP                    ; 栈上还剩上一次比较的 B0
Lend:
```

- `CMPK op`：比较栈顶两个值，**把右操作数留在栈上**（这就是「中间项只求值一次」）。
- `CKJZ lab`：检测留在下方的比较结果，真则丢掉结果继续，假则跳转（此时栈上是 `[B0, 操作数]`，一条 `POP` 就还原成单个 `B0`）。
- 因此链式比较既**只求值一次**又**像 Python 一样短路**：`print(1 > 2 > (1/0))` 输出 `False`，不抛 `ZeroDivisionError`（这条也在回归集里）。

---

## 4. P1 诊断：Iline 不再是全 0

| 层 | 改动 |
|---|---|
| 词法/语法 | `stmtStart` 每条语句开始时把 `curLine`（当前 token 的行号）存下 |
| AST | 新列表 `NdL` 与 `NdK/NdA/NdS/NdN/NdC` 平行，每个节点记下自己的源码行（`ast.js`/`astutil.js` 的 4 个节点构造点） |
| 编译 | `visit()` 取 `NdL[cnd]` 写进 `cline`，`emit()` 把 `cline` 写进 `Iline` |
| 运行 | 报错路径用 `Iline[pc]`（**不是**每条指令都读一次，避免热路径多两次列表访问） |
| 输出 | `Error: Line 3: Uncaught: NameError: name 'y' is not defined` |

同时把 `failAt` 的语义扶正：出错时 `pc` 存的是**源码行**，所以主循环在 `err` 非空时不再 `pc+1`（否则行号会 +1）。

`NameError` 现在带名字（`raiseBuiltin` 支持消息参数），`IndexError/KeyError/ValueError/ZeroDivisionError` 等也都带上了 CPython 风格的消息文本。

`#!bp` 的**单位仍是字节码地址**（保持 4 条断点用例与 `#!trace` 第一列一致），文档与状态栏都写清这一点；按行断点没有做，见 §7。

---

## 5. 性能：为什么没有把 `vm_run` 开 warp

报告 §8.2 建议「`vm_run` 开 warp，时间片改成每 N 条查一次」。v6 实测后**没有采纳**，依据在 scratch-vm 5.0.300 的 `src/engine/sequencer.js`：

```js
216  if (thread.status === Thread.STATUS_YIELD) {
218      thread.status = Thread.STATUS_RUNNING;
220      if (isWarpMode && thread.warpTimer.timeElapsed() <= Sequencer.WARP_TIME) {
222          continue;                     // warp 模式下 wait 0 不让出！
223      }
...
62   static get WARP_TIME () { return 500; }
256  if (!isWarpMode || thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {  // 循环边界同理
```

也就是说：

1. **warp 之后 `Wait 0` 不再让出**（500 ms 内直接 `continue`），报告设想的「每 N 条主动让出」失效。
2. **`speed = 0` 的单步调试会失效**：单步实现方式就是「每条指令一次 `Wait 0`」，warp 下会一次跑完整个程序（`btest.json` 的 4 条断点/单步用例会挂）。
3. 界面最多 500 ms 不刷新，比现在 16 ms 一让出更差。

所以 v6 保留 v5 的「2000 条 / 16 ms 墙钟」时间片 + 非 warp 的实现，并把注释写进 `vm.js`（免得下一个人再试一遍）。

顺带说明报告 §5.2 的另一条：Scratch 3 的 `repeat_until` **不会**在每个循环边界让出（那是 Scratch 2 的行为），scratch-vm 只在 `WORK_TIME`（一帧的 75%）或显式 `wait` 处打断线程。所以「非 warp 循环边界被调度器咬住」这一条，在 5.0.300 上不成立。

### 5.1 想改但改不动的：伪 `ord()`

报告 §5.2/§8.2 建议把内核里那批（报告统计 62 处）当作 `ord()` 用的 `switch costume` 换成 256 槽列表查表。**这条路走不通**：scratch-vm 的 `data_itemnumoflist` 用 `Cast.compare` 逐项比较，而 `Cast.compare` 对非数字字符串是**大小写不敏感**的（`cast.js:121-137`「Scratch compares strings as case insensitive」）。95 个字形里 `'A'` 与 `'a'` 在查表眼里是同一个值，`ord('A')` 会返回 `ord('a')` 的表位。

平台里唯一**大小写敏感**的取码原语就是造型编号，所以 `lib.charCode` 保持造型实现。要真正拿掉这笔开销，得自己在内核里维护一张"字符→码"的映射（例如哈希到冲突表），那是另一个量级的工程。

---

## 6. 明确没做的事

| 项 | 状态 | 说明 |
|---|---|---|
| 局部变量 slot 化（报告 §8.2 第一刀） | **未做** | 需要 Parser/Compiler/VM 三层同时改名字解析，风险与收益都大；v6 只做「零风险的正确性」，性能维持 v5 水平 |
| 分派拆成 18 个 warp 叶子积木 | 未做 | 报告自己也提醒过每多一层 `procedures_call` 要重新量基线；且 warp 的语义问题同 §5 |
| `d.keys()` 视图 | 未做 | 仍返回普通 list（`dict_keys([...])` 未实现） |
| 生成器 `send/close`、`yield` 表达式 | 未做 | 与 v5 相同 |
| 分号、`1e10`、括号续行 | 未做 | 仍是编译期报错（会说话，不是静默错） |
| `#!bp` 按源码行 | 未做 | 仍按指令地址；行号信息已经在 `Iline` 里，随时可改 |
| `print_line` 30 字符硬折行 | 保持 | 与 TextRenderer 一行 30 字的排版一致，属设计而非缺陷 |
| `is` 的「整段编码字符串相等」语义 | 保持 | v5 行为，未在报告 P0 表内 |
| `%f` 的舍入模式 | 保持 Scratch `round`（半数远离零） | CPython 用 round-half-even，`'%.0f' % 2.5` 我们给 `3`、CPython 给 `2`；已在回归集里避开这种用例并此处记录 |
| `_version` 等元信息 | 未改 | 生成器仍写 v5 的 semver/agent 字段 |

---

## 7. 验收

```powershell
pwsh -File _work/v6/verify6.ps1                 # 验 MiniPy_v6.sb3：结构 + 29 套件 375 例 + 8 条行号断言
pwsh -File _work/v6/verify6.ps1 -Sb3 <path>     # 验任意产物
pwsh -File _work/v6/verify6.ps1 -Build          # 先重新生成再验
node _work/v6/bench.cjs <sb3> <prog.py> [reps]  # 墙钟 + 已执行字节码条数
```

v6 新增/修改的套件：

| 文件 | 内容 |
|---|---|
| `_work/p0.json` + `p0truth.json` | 报告 §9.4 的 12 行最小回归 + 同类边界，共 31 例（CPython 真值） |
| `_work/p1.json` + `p1truth.json` | 单行 suite、链式比较、容器运算、异常族、推导式作用域等 35 例（CPython 真值） |
| `_work/v6/p1line.json` + `linecheck.cjs` | 8 条诊断断言（行号 + 错误文本） |
| `_work/v5/ctest.json` | 原先「已知偏差」的 4 条推导式用例，现在通过，已并入默认验收 |

顺手修掉的验收脚本问题：v5 的 `verify.ps1` 里 `btest.json` 与**过期的** `btruth.json` 配了一次对（第 27 轮覆盖套件时留下的），会稳定报 3 个假失败。`verify6.ps1` 去掉了这一对，只保留 `btest.json + bptruth.json`。

构建可复现性保持：连续两次 `node _work/v5/build5.js` 产物 SHA256 相同
（`1B27526C24D4B346E58CCB506411CD147284AEF4AC41C4974280BF1A8A23BC1E`）。

---

## 8. 关于「仓库里没有 v5 生成器」

报告 §6.6/§8.4 把「没有生成器」列为最大维护风险。实际情况是**生成器一直在仓库里**，v5 也是它生成的：

```text
_work/v5/build5.js      构建入口（外壳取自 MiniPy_v4.sb3，Interpreter 角色整体重建）
_work/v5/dsl.js         Scratch 积木 DSL（确定性 id / 坐标，保证逐字节可复现）
_work/v5/kernel/lex.js       v5 词法器
_work/v5/kernel/parse.js     v5 解析器
_work/v5/kernel/compiler.js  v5 编译器（任务栈 lowering）
_work/v5/kernel/vm.js        v5 运行时（取值/对象/内建/指令分派）
_work/v5/kernel/index.js     过程与帽子组装
_work/v5/regalloc.js    寄存器分配（Scratch 变量 ←→ Reg 列表槽位）
```

v6 的每一处修改都改在这些可读源码里，没有手工编辑过 `project.json`。这也正是报告 §8.4 第一条建议的落实方式：**真源在仓库里，`.sb3` 是产物**。

---

## 9. 文件清单

```text
MiniPy_v6.sb3                     交付物（Interpreter 92,046 块 / 180 变量 / 93 列表 / 1,284,539 B）
_work/v6/verify6.ps1              一键验收
_work/v6/linecheck.cjs            诊断（行号）断言
_work/v6/p1line.json              诊断断言用例
_work/v6/bench.cjs                微基准（墙钟 + 指令数）
_work/p0.json, p0truth.json       P0 回归集与 CPython 真值
_work/p1.json, p1truth.json       语义回归集与 CPython 真值
_work/p2.json, p2truth.json       input() 回归集
_work/p3.json, p3truth.json       外壳 DEMO 9 页原文（CPython 真值）
_work/v6/ui_pages.cjs             点 DEMO/RUN 按钮的 UI 级验收（鼠标事件，支持 MINIPY_VM）
scratch-vm-develop/               TurboWarp 引擎（对照用，仅加了 node_modules）
_work/v5/kernel/*                 内核真源（v6 的修改都在这里）
```

---

## 10. 追加：「拿 demo 测结果不对」的排查与修复

### 10.1 现象与结论

用外壳自带的 **DEMO 按钮**（`Controller.example`，共 9 页）逐页跑，8 页里 2 页直接报错：

| 页 | 内容 | v6（修复前） |
|---|---|---|
| 1 | Input and conversion | `NameError: name 'input' is not defined` |
| 5 | Input and maths | 同上 |

**根因：`input()` 在 v4 里有、在 v5 的内核重写里丢了。**
v4 的实现在 `Interpreter.callfn`：

```text
if <fnname> == "input":
    set status = "Waiting for input"
    set dirty  = 1
    ask <prompt> and wait        # Scratch 询问框
    <result> = answer
    set status = "Running"
```

v5 把内核改成四段式管线时，builtin 列表里没有 `input`，于是外壳自己宣传的示例页有两页根本跑不了。v6 先继承了这个问题（只是报错变清楚了：`Error: Line 2: Uncaught: NameError: name 'input' is not defined`），现已按 v4 的语义在 v6 内核里补回（`vm.js` `builtinBody` 的 `input|00000` 分支）：

- `status = 'Waiting for input'` + `dirty = 1`（外壳据此提示）
- `ask <prompt> and wait`（Scratch 询问框，外壳自己的 EDIT/PASTE 提示用的也是它）
- 返回值恒为字符串（`S` + `answer`）——Python 的 `input()` 也永远返回 str
- 结束后 `status = 'Running'`

**唯一与 CPython 的差异**：提示语只出现在询问框里，不再回显到 Output 面板（CPython 会把 prompt 写进 stdout）。回归集 `p2` 的真值按此生成。

### 10.2 验收方式补强

| 套件 | 内容 | 结果 |
|---|---|---|
| `p2.json`（5 例） | `input()` 字符串/数字/空串、`type()`、与 `len`/`int` 配合 | 5 / 5 |
| `p3.json`（9 例） | **外壳 DEMO 的 9 页原文**（含 2 页 input 页，答案固定），CPython 真值 | 9 / 9 |
| `_work/v6/ui_pages.cjs` | 真的去点 DEMO 和 RUN 按钮（鼠标事件），打印用户看到的 Code/Output/status | 9 页全部正确 |

顺带修掉一个**测试夹具**问题：`ask and wait` 的恢复依赖 Promise，而 `run5.cjs` 的推进循环是纯同步的，微任务永远没机会跑 → 程序会卡在 "Waiting for input"。现在收到 QUESTION 后会让出一次事件循环（`setImmediate`）。

### 10.3 顺带做的差分审计

把报告作者留下的边界语料 `_work/v5test/cases_all.json`（107 例）在 v5 与 v6 上各跑一遍做**差分**：

```text
total=107  same=72  diff=35  new-errors=1
```

- 35 处差异**全部**是「v5 静默给错 → v6 正确」或「v6 诊断更清楚」：单行 suite（`if/for/while`）、`for k in d`、`[1,2]+[3]`、`[0]*3`、`(1,2)+(3,)`、`a.pop()`、`insert`、`'%.2f'`、链式比较、递归 fib（v5 得 15，v6 得 610）……
- 唯一一处 "new error" 就是 `int('12x')`：v5 悄悄返回 `0`，v6 抛 `ValueError` —— 这正是报告 P0 第 6 条要求的行为。
- 反过来没有任何一例是「v5 对 → v6 错」。

### 10.4 关于「慢」

headless 里 demo 各页耗时都在 1 帧内（`p3` 九页合计 0.8 s，含 3 次询问）。真正在 Scratch 界面里偏慢的部分是**渲染**，不在内核：运行期间每个时间片都会 `dirty = 1`，TextRenderer 于是整页重画（最多 30 行 × 30 字 ≈ 900 次 `pen stamp`，外加内核里用造型当 `ord()` 的那 62 处 `switch costume`）。这部分与 v5 完全相同，v6 没有改，也不在报告「先修」的范围内（报告 §5.2 第 5 点把它列为 P2）。

---

## 11. 追加（第二轮）：TurboWarp 引擎上的伪装 bug —— 字面量 `0` 被当成空白吃掉

### 11.1 现象与复现

上一轮我用 **官方 scratch-vm 5.0.300** 跑 demo，9 页全对；用户在实际环境里跑出来的却是错的。用仓库里那份 **TurboWarp 的 scratch-vm**（`scratch-vm-develop/`，其 `src/compiler/` 是 TurboWarp 的 JS 编译器；内核默认 `compilerOptions = {enabled:true}`）重跑，**逐字复现了用户的输出**：

| demo 页 | 用户看到 | TurboWarp 上实测 | 应为 |
|---|---|---|---|
| 1 (`# MiniPy / Scratch`) | Hello, Scratch×2 / 2 / 5 / 9 / 14 / Try again | **完全相同** | Hello, Scratch / 1 / 3 / 6 / 10 / 15 / All checks passed |
| 3 (`# Nested loops…`) | 1 2 2 4 3 6 6 Done | **完全相同** | …3 2 1 Done |
| 4 (`# New: unpack…`) | Pyt / Pyt / 4 / max=2 / pow=256 | **完全相同** | Pn / Pyt / 5 / max=2 / pow=256 |

（补充：**跟编译器无关** —— `vm.setCompilerOptions({enabled:false})` 走解释器，结果一模一样。）

### 11.2 根因：`'0' == '\t'` 在这台 VM 上是 **true**

TurboWarp 的 `src/util/cast.js` 把官方的 `isWhiteSpace` 换成了 `isNotActuallyZero`：

```js
const isNotActuallyZero = val => {
    if (typeof val !== 'string') return false;
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        // '0'.charCodeAt(0) === 48 ; '\t'.charCodeAt(0) === 9
        if (code === 48 || code === 9) return false;   // 「这就是真的 0」
    }
    return true;
};
static compare (v1, v2) {
    let n1 = Number(v1), n2 = Number(v2);
    if (n1 === 0 && isNotActuallyZero(v1)) n1 = NaN;
    else if (n2 === 0 && isNotActuallyZero(v2)) n2 = NaN;
    ...
    return n1 - n2;          // 两边都没被「撤销」时走数值比较
}
```

于是 `'0'` 与 `'\t'` **两边都没被撤销**（`Number('0') === 0`、`Number('\t') === 0`）→ 走数值比较 → **相等**。
官方 5.0.300 用的是 `isWhiteSpace`（任何空白都会被撤销成 NaN，从而回退到字符串比较），所以 `'0' != '\t'`。

而 MiniPy 词法器判空白是这么写的：

```js
S.If(E.or(E.eq(c0, E.str(' ')), E.eq(c0, E.str('\t'))), [ S.chg('i', 1) ], [ …token 分派… ])
```

**c0 是 `'0'` 时，`c0 == '\t'` 为真 → 数字 0 被当空白跳过，一个 token 都不产生。**
于是任何含字面量 `0` 的程序都会静默错解析：

| 源码 | TurboWarp 上的 token 流 | 后果 |
|---|---|---|
| `total = 0` | I(total) O(=) W —— N(0) 丢了 | `total =` 无右值 → `SyntaxError: bad assignment target` |
| `print(0)` | I(print) O(() O()) | 打印空行 |
| `for i in range(1, 6)` | 正常（无 0 字面量） | —— |

demo 页里的 `total = 0` 更隐蔽：丢掉的 0 让赋值退化，循环体的第一次迭代连带错位，于是看到 `2 5 9 14`（少加了 1）、`Try again`、以及被重复绘制的首行。

**定位手段**（可复现）：临时在词法扫描循环里追加一行调试（记录 `i | c0 | c0==' ' | c0=='\t' | c0==0`）并把它并入 AST/字节码 dump：

```text
TurboWarp : 7|0|false|true |true      ← '0' 竟然等于 TAB
5.0.300   : 7|0|false|false|true      ← 正常
```

随后同一行再插桩 `numberBlock()` 的进出标记，直接看到 TurboWarp 上**根本没进数字分支**。

### 11.3 修复

单字符判定不再走 `operator_equals`（会被 VM 的数值化吞掉），改用纯字符串匹配（`operator_contains`，任何 VM 上都不做数值转换）：

```js
// lib.js
const isSpaceCh = (c) => E.contains(E.str(' \t'), c);
// lex.js 的 token 扫描改为
S.If(L.isSpaceCh(E.var('c0')), [ S.chg('i', E.num(1)) ], [ … ])
// vm.js 的 JSON 解析器空白判定同理
const ws = (c) => E.contains(E.str(' \n\t'), c);
```

顺带审计了全工程：所有 `operator_equals` 里剩下的空白字面量只有与 `' '` 的比较（两边 VM 都安全，已实测 `'0' == ' '` 为 false），不再有与 `'\t'`/`'0'` 的单字符比较。

### 11.4 双引擎验收

`verify6.ps1` 增加 `-TurboWarp` 开关，同一套用例在两个引擎上各跑一遍：

```powershell
pwsh -File _work/v6/verify6.ps1              # 官方 scratch-vm 5.0.300
pwsh -File _work/v6/verify6.ps1 -TurboWarp   # TurboWarp 的 scratch-vm（解释器 + 编译器两种模式）
```

| 引擎 | 结果 |
|---|---|
| 官方 scratch-vm 5.0.300 | 29 套件 **375 例 0 失败** + 8 条诊断断言 |
| TurboWarp scratch-vm（编译器关） | 同上 **全绿** |
| TurboWarp scratch-vm（编译器开，即其默认） | 同上 **全绿** |
| TurboWarp + 真实点按 DEMO/RUN（`_work/v6/ui_pages.cjs`） | **9 页输出全部与 CPython 一致** |

准备 TurboWarp 引擎的做法（一次性）：`scratch-vm-develop/scratch-vm-develop` 里 `npm install --omit=dev --registry=https://registry.npmjs.org/`，另有 4 个包（`@turbowarp/jszip`、`@turbowarp/json`、`@turbowarp/nanolog`、`@turbowarp/scratch-svg-renderer`）因 npm 镜像不可用而直接按 tarball 安装。

### 11.5 这条 bug 的教训（写给后续维护）

**不要用「字符 == 单字符字面量」来做词法判定。** Scratch 的 `=` 在不同 VM 上有不同的数值化规则，而 `'0'`、空串、TAB 恰好都等于数字 0，一旦 VM 选择数值比较，**数字 0 就会和空白/空串判等**。词法器里所有单字符判定（`isDigit`/`isAlpha`/`isNameCh`/`isSpaceCh`）现在统一用 `contains()`，只有这样才能在两个引擎上得到同一套 token。
