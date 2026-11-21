# 嵌套解包（P228 / P229）工作笔记

## 第 20 轮结论与下一步方案（重要）

**新事实**：

1. 连 `c` 也没有绑定（`(a, b), c = (1, 2), 3` 之后 `print(c)` 报 `NameError`）→
   **`unpackto` 什么都没赋值**，不是"只丢了括号组"。
2. 把捷径条件改成**恒真**后仍然什么都不绑定 → **捷径块根本没被执行到**（不是条件为假）。
3. 用解释器自己的 `printargs` + `DOut` 做"不中断的见证输出"会把解释器状态搞坏
   （同一个测试程序立刻变成 `SyntaxError: expression` / `parentheses`）→
   **在中途调用 `printargs` 会污染语句级暂存**，以后调试只用 `fail`（会中断但干净）。
4. `assignlist %s` 只有一个定义，但 `execute` 里有**两个调用点**（parent 链显示其中一个在
   `Kind[1]=="I" and Tok[2]=="=" and Tok[4]=="="` 那个分支附近），说明这段逻辑里状态纠缠较多。

**因此下一步不要继续在现有"多目标赋值"分支里绕**，而是：

> 在 `execute` 里**新增一个独立分支**（放在现有 `Kind[1]=="I" and Tok[2]==","` 那个分支**之前**），
> 专门处理「首个 token 是 `(`/`[` 且存在深度 0 的 `=`」的语句：
> 自己算目标名串（拼接 `Tok[1..eqi-1]`）+ 自己 `eval(eqi+1, count)` + `unpackto(名字串, ev)` + `pending = 1`，
> 完全不碰 `assignlist`。改动约 30 个积木，可绕开所有已观察到的怪现象。

顺带要测的风险用例：`(a, b) == (1, 2)`（`==` 里的 `=` 不能被当成赋值目标）、
`(1 + 2)`（合法表达式语句，不能被判成语法错误）。

> **状态（v4.146 之后）**：P228 已随 **v4.146** 发布（`_unp` 9/13 → 11/13，cov3 +1、covX +2，0 broke）。
> 剩下 2 条（`(a, b), c = ...`、`(a, b), (c, d) = ...`，即**首个目标是括号组**）由 P229 处理，
> 但 P229 尚未成功，**未随版本发布**。下面是它的现状与下一步。

目标：让下面 3 类写法与 CPython 一致（`_unp.json` 13 条里的 4 条；`_unp2.json` 补充 13 条边界）。

```python
for (a, b), c in [((1, 2), 3)]:   print(a, b, c)   # 1 2 3
(a, b), c = (1, 2), 3            print(a, b, c)   # 1 2 3
a, (b, c) = 1, (2, 3)            print(a, b, c)   # 1 2 3
```

## P229（首个目标是括号组）现状 —— 未完成

### 第 19 轮的进一步插桩（前一条假设被否定，范围收窄）

上一轮怀疑是 `assignlist` 里 `if error != "": stop this script` 被残留/自设的 `error` 挡住。
第 19 轮把 `error` 原文打出来（在 `CALL eval(lo=eqi+1, hi=count)` 之后紧跟一个 `fail`）：

| 用例 | 打印结果 |
|---|---|
| `(a, b), c = (1, 2), 3` | `ERR<>` —— **error 是空的**，求值本身成功 |
| `(a, b) = (1, 2)` | `ERR<>` |
| `[a, b] = (1, 2)` | `ERR<>` |
| `a, b = 1, 2`（扁平，正常） | 该标记不适用（走 AName 分派，不调 `unpackto`） |

→ **前一条假设被否定**。继续插桩得到的结论：

* 在捷径里的 `unpackto` 调用前插标记（`SC`）→ **不打**；
* 在 `unpackto` 的入口与计数之后插标记 → **不打**（说明 `unpackto` 根本没被调用）；
* 把捷径条件改成**恒真**（`augrp == augrp`）后重跑 → 仍然什么也不绑定；
* 反汇编确认捷径确实在 `auenc = ev` 之后（`if augrp == "1" → unpackto(augnames, ev); stop`），
  且 `auenc = ev`（第 62 行）之前只有三处出口：`error` 非空则 stop、`evtype` 不在 L/T/S/E/D 则报错、
  字典则 `dictkeys`。实测 `evtype=T`（`vt[T]`）、`error` 为空 → 三者都应通过。

**结论**：执行在"RHS eval 之后、`auenc = ev` 之前"就离开了 `assignlist`，而这条区间按代码看不可能发生
—— 说明还有没看到的因素（可疑点：这次调用可能**不是**同一处 `assignlist` 调用/同一份语句状态，
例如 `execute` 里更早的语句分支先消费了一次，改动了 `Tok`/`Pos` 等全局；或者插桩本身改变了链条可达性）。
下一步建议（每次一个构建）：

1. 在**多目标分支进入时**打印 `count` 与 `Tok[1..count]`（确认语句 Token 未被更早分支改写）；
2. 在 `assignlist` 入口打印 `eqi`/`count`（确认传参与语句一致）；
3. 在"RHS eval 之后"打印 `augrp` + `augnames`（本次已做：都对）+ 在 `auenc = ev` **之后**再打一个点
   （区间只剩 `error` 检查、类型检查、字典检查三句，逐句插点即可定位到底哪一句把控制流带走了）。

### 第 18 轮：逐层插桩结果表

用逐层插桩把整条链路走通了，结论非常明确：

| 观测点 | 括号组目标的情形 | 扁平目标的情形 |
|---|---|---|
| `execute` 多目标分支是否进入 | 进入（`leadBr=true`） | 进入（`leadBr=false`） |
| 扫出的 `eqi` | **正确**（`(a,b),c = …` → 8；`(a,b) = …` → 6；`[a,b] = …` → 6） | 4 |
| `assignlist` 是否进入 / 参数 | 进入，`augrp=1`、`augnames="(a,b),c"` ✓ | `augrp=0`、`augnames="a,b"` ✓ |
| 扁平名字表是否跑 | **没跑**（标记 `M=`）✓ | 跑了（`M=W`）✓ |
| 走到"unpackto 捷径" | **没有**（`SC` 标记不打） | 不走捷径（正常扁平分派） |

→ 也就是说**路由、`eqi`、`augrp`、`augnames` 全对**，卡在 `assignlist` 内部：
`CALL eval(lo=eqi+1, hi=count)` 之后紧跟

```
control_if CONDITION=NOT(($error==""))
SUBSTACK:
  control_stop STOP_OPTION="this script"      ← 静默返回，什么都不绑定
```

所以 RHS 求值把 `error` 置上了 → `assignlist` **无声退出**（既不报错也不绑定，正好解释
`print` 处的 `NameError`）。已试过在调 `assignlist` 前 `error = ""`（P229 里的 `fix229` 增补），
**仍然失败** → 说明 `error` 是那次 eval **自己**设的，不是残留。

**下一步（一次构建就能拿到答案）**：在 `assignlist` 里那个 `CALL eval` **之后**插一个
`fail(error)` 打印错误原文 —— 提示信息本身就会说明 RHS `(1, 2), 3` 为什么解析失败。
注意：同样的 RHS 在普通赋值里是好的（`_rhs.json` 六条全过，含 `p = (1, 2), 3`），
所以嫌疑集中在"语句被更早的分支部分消费过"（例如 `(` 开头的语句先被表达式分支试算过，
改动了 `Tok`/`Pos` 之类的状态）—— 可在那次试算前后各打一个点确认。

### P229 做了什么（`_work/v41/p229.wip.txt`，未挂链）

1. 守卫加上第三种开头 `contains("([{", Tok[1])`；
2. 该分支里的括号深度判定从 `=` 比较改成 `operator_contains`（`=` 比括号字形不可靠，见 v4.146 说明 §2）；
3. 结尾 `else → fail("SyntaxError: assignment")` 只对**原来两种**开头生效（新增 `leadBr` 标志），
   括号开头若没扫到等号就静默跳过，避免把合法的表达式语句判成语法错误；
4. 进 `assignlist` 前清 `error`（无效，保留着做记录）。

**风险提示**：`(a, b) == (1, 2)` 这种比较语句会因 `==` 里含 `=` 而被 `eqi` 认作赋值目标 ——
修好之后必须专门测它；另外 `(a, b)` 单独的表达式语句目前是合法的（`_unp2` 里那条 CPython 反而
会报 NameError，属探针设计问题，已重写为 `(1 + 2)`）。


## P228 的恢复事件（本轮教训）

本轮开始时为了调试，我先把 `p228.txt` 复制成 `p228.keep.txt`，但那份 `keep` 其实是**更早**的版本
（第 15 轮末，只有 site 1），后面的 `Copy-Item ... p228.txt` 就把**已发布 v4.146 的补丁源覆盖掉了**。
恢复办法（已做，并逐项验证）：

1. 重新应用三处改动：`CONTAINS` 版 `isOpen`/`isClose`；`forloop` 扫描里的 `{`/`}` 冗余判断改回
   `isOpen`/`isClose`；补上 `assignlist` 分支（扁平名字表加 `augrp` 守卫 + 在两处 `auenc = ev`
   之后挂 `unpackto(augnames, ev)` 捷径）；
2. 变量表补上 `augrp`/`augnames`/`aui2`（`newVar`）→ 否则构建报 `no variable augrp in Interpreter`；
3. **等价性验证**：单独构建 P228（`V41_SKIP=P229`）得到 `Interpreter blocks=27993 vars=1356`，
   与已发布的 v4.146 **逐数字相同**；行为上 `_unp` 11/13、`_swap` 17/17 一致；
   `verify-rebuild.ps1` 里加上 `v4.146` 后整套重建 **全 MATCH**。

**流程改进**：发布后应把该版本的补丁源另存一份（例如 `pNNN.shipped.txt`），
任何插桩/试验只在副本上做；`p228.keep.txt` 这种"随手备份"不可信。

## 三处根因（都已定位）

| 位置 | 现状 | 需要的改动 |
|---|---|---|
| `unpackto %s %s (names, enc)` | 只按**任意**逗号切名字 | 按**深度 0**逗号切段；段以 `(`/`[` 开头时把该元素再按内层名字表拆一次 |
| `forloop`（语句 `for`） | 多目标分支要求 `Tok[3] == ","`，且按"每 2 个 token 取一个名字"收集 | 先在括号深度 0 处找 `in`（`fin2`）并判断目标里有没有**深度 0**（且在 `in` 之前）的逗号；名字串改成把 `Tok[2..fin2-1]` 原样拼接（保留括号） |
| `assignlist %s (eqi)`（赋值形式） | 目标里每个 token 都必须是 `Kind == "I"`，遇到 `(` 直接 `SyntaxError: invalid assignment target` | 目标里出现 `(`/`[` 时跳过扁平名字表，直接把名字串交给 `unpackto` |

## 已完成并验证的部分（`_work/v41/p228.txt`，**尚未挂到 assemble 链**）

1. `unpackto` 全量重写：深度 0 分段 + 一层括号分组解包（内层用一套独立变量 `un2*`，
   不用递归，避免全局变量被自己覆盖）。**扁平路径行为不变**（`_unp` 里的
   `a, b = …`、`a, *rest = …`、`a, b = b, a`、`for a, b in …`、错误消息全部照旧）。
2. `forloop`：新增前置扫描（`fin2`/`fcomma`/`fd`），把分支条件从 `Tok[3]==","` 改成
   `fcomma == 1`，删掉分支自带的旧 `in` 扫描与 `fin2 = 0`/`fi2 = 2` 初始化（否则守卫
   `if fin2 == 0` 立刻失败），名字串改为拼接 `Tok[2..fin2-1]`。

## 过程中踩到的坑（按发生顺序）

1. 分支 1 是 `control_if` 不是 `control_if_else`（`dis.cjs` 把它渲染成 `if_else`，误导过一次）。
2. 逗号 token 的 `Kind` 不是 `"O"`；原代码的写法是 `Tok == "," and Kind != "S"`，照抄这个判据才对。
3. 插入位置：扫描必须在守卫**之前**（守卫要判断扫描算出的 `fcomma`），但**不能**插进守卫的 fail 分支里。
4. `setV/IF/REPEATU` 这些 DSL 造出来的积木**彼此没有 `next` 链接** —— 手工把一串积木接到链上时
   必须自己 `chain(...)`，否则只有第一个可达、其余被 `pruneUnreachable` 静默剪掉
   （症状：`for a, b in …` 从此走到下一个语句、报 "SyntaxError: for x in range(...)"）。
5. `replaceStmt` 会把**旧积木的 `next` 留在原地**，而 `predecessorOf` 扫描全部积木找
   `next === id` 的第一个命中 —— 于是后续 `insertBeforeStmt` 可能接到**死链**上（P223 同款坑）。
6. **致命的一个**：`fcomma` 一开始扫描**整个语句**里的逗号，于 `for i in range(1, 3):`
   被误判成多目标 → `_swap` 的 `selection style swap` 用例坏掉（`ValueError: not enough values
   to unpack (expected 1, got 0)`）。修法是加 `fin2 == 0` 条件（只在 `in` 之前数逗号）。
   **回归后 `_swap` 17/17 恢复**，`_comp` 12/12 不变。

## 仍未解决

`for (a, b), c in [((1, 2), 3)]` 现在能解析（不再 SyntaxError），但运行到循环体时报
`NameError: name 'a'`：说明**第一轮绑定的 `unpackto("(a,b),c", <元素记录>)` 没有把 a/b 写进变量**。
已用调试补丁确认：

* `forloop` 的目标名字串**是对的**（打印出来是 `(a,b),c`；扁平情形是 `a,b`）；
* 反汇编 `unpackto` 的生成代码**逐句检查过**（分段计数、分组判断、`substr` 取内层、
  内层 `listitem`+`assign`、末段 flush）都符合预期；
* 所以嫌疑落在**调用点/循环机制**：`forloop` 分支 1 结尾是
  `pushLoop(typ="list", vn=fnames, …)` → `listitem(ltmp, 1)` → `unpackto(fnames, ev)`，
  而每轮推进在 `boundary` 里走 `unpackto(names=LoopName[lc], enc=ev)`（`LoopStep[lc] == "0"` 时）。
  下一步应当打印/断点这两处的 `fnames`、`LoopName[lc]`、`ev` 与 `evtype`，确认绑定的到底是哪个名字串、
  以及 `assign` 是否真的写进了当前作用域（也可能问题在 `ltmp` 取的是整个列表而不是首元素）。

## 复现命令

```bash
node _work/v41/assemble.cjs                      # 当前 assemble 链不含 p228.txt（保持 v4.145 可复现）
# 临时启用：把 assemble.cjs 的 'p227.txt', 改回 'p227.txt','p228.txt',
node _work/v41/build41.js                        # 输出仍写 MiniPy_v4.145.sb3，所以建议先设 V41_OUT
node _work/v41/run.mjs <产物> _work/v41/_unp.json # 13 条：扁平 9 条通过，嵌套 4 条失败
node _work/v41/run.mjs <产物> _work/v41/_swap.json # 17 条：必须全过（曾经坏过）
```
