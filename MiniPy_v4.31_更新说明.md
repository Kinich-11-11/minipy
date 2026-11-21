# MiniPy v4.31 更新说明

本轮围绕你提的问题做了四件事：**变量面板里的值是一堆乱码**、**函数体内看不到运行步骤**、
**点一次 STEP 却"跑飞"或要等很久才动**，以及**去掉上一轮加的花哨东西**（OUT 按钮、顶栏活动指示）。
途中还发现字典的两个数据缺陷（打印是乱码、嵌套值存坏了），一并修掉。

产物 `MiniPy_v4.31.sb3`：Interpreter 9,244 → **9,426** 块，Controller 1,214 → **1,216** 块，TextRenderer 176 → **189** 块，合计 **10,855**，`check41` errors=0。
（本轮后续的 P67 改动按新规矩单独立版为 **v4.32**，见 `MiniPy_v4.32_更新说明.md`；v4.31 本身不再改动。）

## 0. 先说结论：为什么"显示的变量是乱的"

变量面板那一行是 `Names[i] + " = " + Values[i]` 直接拼出来的，而 `Values` 存的是解释器的**内部编码**：
一个列表是 `\x1fN1\x1fStwo\x1fN3.5` 这种（`\x1f` = 分隔符 + 类型字母 + 元素文本）。渲染器 `text` 是**逐字符查 costume**画的，
而 `\x1f` 在字体里没有对应 costume（切换失败就保持上一个字形），于是整行变成错位乱码。列表推导式只是最容易撞上的场合：

* `b = [x * x for x in range(6)]` → 面板显示 `b = ?N0?N1?N4?N9?N16...`；
* 更要命的是推导式的**循环变量会泄漏**：`x = 99` 之后跑一次 `[x for x in range(4)]`，面板里的 `x` 就变成了 3（CPython 仍是 99），
  而且这个多出来的变量会一直占着面板（一屏只有 4 行），越跑越"乱"。

现在（同一个程序）：

| | 之前 | 现在 |
|---|---|---|
| `b = [0, 1, 4, 9]` | `b = ?N0?N1?N4?N9`（乱码） | `b = [0, 1, 4, 9]` |
| `x = 99` 之后跑推导式 | `x = 3`（被改写） | `x = 99`（不变） |
| 推导式变量 `x` | 永久留在面板 | 推导结束就不在面板里 |

## 1. P58：面板显示真实的 Python 值

* 解释器在 Stage 上多维护一条与 `Names/Values/Types` 并行的列表 **`Show`**，存每个变量的**显示文本**：
  `assign` 写入时用现成的 `strval` 生成（**与 `print()` 同一个格式化器**，所以两处显示必然一致），
  `del name` 同步删除，函数帧进出时和 `Values` 一样用 `FSV` 保存/恢复，RUN/绿旗重置时一起清空。
  （`Values` 仍存内部编码，语义完全没动；面板只是改读 `Show`。）
* 面板行渲染改为 `Names[i] + " = " + Show[i]`，并**补上省略号截断**：行超过 30 列时先取 27 字符再补 `...`
  ——之前是静默截断，长值看起来像"值就是这么短"。
  实测（`_work/v41/paneltest.mjs`，在真实 VM 里驱动 TextRenderer 的 `draw` 后读它的 `vtxt`）：
  `b = hello` / `b = <a very long string val...` / `b = 01234567890123456789012...`（都正好 30 列）。
* 类型覆盖：数字/字符串/布尔/None/**列表/元组/嵌套容器/实例/函数**都走 `strval`，与 `print` 完全一致。
  其中实例和函数过去会掉进"原样返回"的兜底，面板显示的是内部编号（`p = 1`）；现在 `p = <Point object>`、
  `add = <function #lambda1>`（CPython 是 `<__main__.Point object at 0x…>` / `<function <lambda> at 0x…>`，位置信息给不了，形状对齐）。
* **P62 顺带修掉 `self` 泄漏**：类的方法调用把用户变量 `self` 绑在**调用者帧**里（方法体就是这样找到它的），
  调用结束后再把旧值放回去——但"旧值"是隐藏寄存器的初值 0，于是被当成一个**对象**写回，面板里就永久多出一行
  `self = 0`（跑一次 demo8 能看到 `self`、`p`、`q` 三行）。现在两个派发路径（`callfn` 的 `__init__` 与 `callmeth`）
  都在绑定前把原有的绑定**连值带类型**存下来，调用结束后放回；原本没有这个名字就整行删掉——和 P60 一个思路。

## 2. P59：字典能打印了，而且嵌套值不再损坏

1. `strval` 只有 C/B/Z/L/T 分支和一条"原样返回"的兜底，**没有 D**，所以 `print(d)` 打的是内部编码。
   新增 `dictfmt %s`：按 key,value 成对走 `listitem`+`reprval` 拼成 `{'k': 1, 'j': 'x'}`；`strval` 里加 D 分支。
2. 顺带查出一个更严重的**数据**问题：字典的 key/value 入表时**没有做 `lesc` 转义**（列表元素是转义的），
   于是 `{'a': [1, 2]}` 存进去就是坏的——`print(e['a'])` 得到 `[]`、`print(e)` 得到 `{'a': [], 1: 2}`。
   现在 key/value 与列表元素一样转义，读回来就是 `[1, 2]`。

## 3. P60：推导式的循环变量不再泄漏

`complist` 直接用 `assign` 绑循环变量，既改写同名变量又留下新变量。现在循环前保存该名字的旧绑定
（`lookup` → 序号/值/类型），循环结束后**原样放回**；如果这个名字原本不存在，就把 `Names/Values/Types/Show` 四张表里的行一起删掉。
新增用例（`_work/v41/scope.json`，4/4 通过）：同名变量保持原值、用完即消失（`print(i)` 正确抛 NameError）、函数内推导、带 `if` 过滤的推导。

## 4. P61：函数体内也能看到运行步骤（你问的第二件事）

函数体那个循环在 **`calluser` 这个 warp 过程**里，只做 `tokenize/execute`：不更新 `selected/page`、不计 `steps`、
也不理会 STEP 闸门——所以函数一跑，代码面板就停在调用行，按一次 STEP 会把整个函数跑完。

| | 之前 | 现在 |
|---|---|---|
| 高亮行 | 停在调用行 | 跟着函数体走（`selected`/`page` 同步滚动） |
| STEP 单步 | 整个函数一次跑完 | **逐行停在函数体内** |
| SLOW（SP 按钮） | 只慢外层 | 函数体内也一行一帧 |
| Steps 计数 | 不动 | 函数体内也累加 |
| 变量面板 | 只有全局 | 停在函数里时显示**形参/局部变量**（帧机制本来就支持） |
| STOP | — | 函数体会像主循环一样立即结束 |

实测（`_work/v41/steptrace.mjs`，模拟点 STEP 按钮，读取每次暂停时的 pc/面板）：

```
step1 pc=1 line="def dbl(n):"
step2 pc=4 line="print(dbl(3))"        steps=1
step3 pc=2 line="    r = n * 2"        steps=2  panel=n=3      <-- 进到函数里了
step4 pc=3 line="    return r"         steps=3  panel=n=3 r=6
step5 pc=5 line="print('done')"        steps=2
FINISHED output=["6","done"]
```

**为什么必须退出 warp**：Scratch 的 warp 线程在一帧内会把 yield 全部吃掉（`Sequencer.WARP_TIME`），
所以 warp 过程里放 `wait_until` 会**在一帧里死转**（STEP 闸门等的是下一帧才可能变化的 `ticket`）。改成非 warp 后实测没有代价：
`fib(16)` 4.77s → 4.89s、VM 帧数两者都是 14 步，`fact(60)` 216ms → 215ms（递归深度保护行为不变）。

**一个已知的小瑕疵**：`fpush/fpop` 那份"寄存器快照"里包含 `steps/selected/page/mode/ticket`，
所以函数返回时 Steps 会跳回调用前的值（表里 step5 的 steps=2）。它只是显示计数跳一下，不影响单步/高亮。

## 5. HELP 补两行

`help.json` 从 37 行 → **39 行**（最长 29 字符，构建期仍断言 ≤30）：新增
`Vars panel: name = value` 和 `STEP: 1 line, inside def too`。

> 说明：上一轮加的 **OUT 按钮** 与 **顶栏活动指示** 都已按你的要求删除（P63/P64 从构建里移除，底图 SVG 恢复原样）。
> 现在顶栏仍然是 RUN / STEP / STOP，STEP 直接进函数，一步一行。

## 6. P66：函数里一步 500ms → 一步 1 帧（"要点好多次"的真凶）

你说的"要点很多下"其实是**延迟**：点下去要等约 0.5 秒才动，于是你以为没点上又点一次，积攒的票再连着走几行。
无头实测（`_work/v41/stepcost.mjs`：逐步暂停后统计"一次点击 → 下一次暂停"的帧数与毫秒）：

| 位置 | 修复前 | 修复后（v4.31） |
|---|---|---|
| 顶层一行 | 13–20ms / 1–2 帧 | 13–20ms / 1–2 帧 |
| 函数体里一行（`a = f(1)` 这类） | **501ms / 1 帧** | **13–51ms / 1–4 帧** |

根因：**那 500ms 就是 `Sequencer.WARP_TIME`**。Scratch 的 warp 线程在一帧里会一直跑到 500ms 预算耗尽；
而本 VM 里 **warp 是继承的**——`Thread.pushStack` 新帧直接复制父帧的 `warpMode`，被调过程自己的 `warp=false` **只能置 true、不能清 false**
（见 `sequencer.stepToProcedure`）。用户函数体之所以是 warp，只是因为它的祖先（`execute` / `eval` …）是 warp；
于是函数体里的等待（`wait_until`）变成"每帧烧满 500ms 的空转"，UI 掉到约 2fps。

修法（P66）：把**调用链 + 表达式求值链** 27 个过程改成非 warp（`execute` / `eval` / `callfn` / `calluser` /
`methodcall` / `methodcall2` / `callmeth` / `pair` / `atom` / `rightside` / `builtin2` / `builtin2b` /
`indexget` / `listlit` / `tuplelit` / `dictlit` / `dictpair` / `complist` / `fstr` / `pctfmt` / `anyall` /
`unary` / `indexset` / `indexdel` / `assignlist` / `conditional` / `forloop`）。

**已知未覆盖**：`print(f(x))` 这类**参数求值**路径当时仍然慢（`printargs` 还是 warp），
根因与修法见 **v4.32 更新说明**（P67）。

**代价**：调用链不再是 warp 之后，引擎编译出的代码会在每次调用处让出，跑得久的程序在 GUI 里帧数变多
（CPU 不变）。完整对照表见 v4.32 更新说明第 3 节。

## 7. P65：调试状态不再被调用返回回滚（"点一次却跑飞"）

`fpush/fpop` 是整机寄存器快照，把 **`mode` / `ticket` / `steps` 也一起存了**：只要这次调用是在 `mode=0`（先按过 RUN）期间压栈的，
返回时就把 `mode` 拨回 0 —— **单步当场失效、程序自己跑到结尾**，你点的 STEP 全部作废。
修法：调试状态是全局的，不该跟着调用帧回滚，于是在 `calluser` 退出路径的 `fpop` 前后各存/取一次（`smode` / `stick` / `sstep`）。

**A/B 对照**（同一脚本 `_work/v41/modeloss.mjs`，各跑两遍）：

```
去掉 P65（= 上一轮给你的那份）               加上 P65（本次出货）
-----------------------------------------   -------------------------------------------
mid-run  cdepth=10 mode=0                   mid-run  cdepth=10 mode=0
点 STEP -> none, running=0（程序跑到结尾）    点 STEP -> pause cdepth=8  mode=1
第 2 次点击 -> 程序已结束                    第 2 次点击 -> pause cdepth=9  mode=1
                                            （之后每次点击一行，递归里 8 次点击 = 8 行，永不跑飞）
```

**踩坑记录**：新变量名必须先用脚本查重——`addVar` 遇到同名会**直接返回既有 id**，一旦撞上就会悄悄写坏解释器的活寄存器；
另外无头测试里一帧能跑掉几百毫秒、`_step()` 的边界每次都不同，判断"有没有停住"要看 `mode` / `cdepth`，不能只看某一帧的 pc。

## 8. 最终产物

* Interpreter **9426** 块、Controller **1216**、TextRenderer **189**、Stage **24**，合计 **10,855**，`check41` errors=0。
* P62 之后 demo8 的面板只剩 `p = <Point object>` / `q = <Point object>`（`self` 不再出现）。

## 9. 验证

* **全量 23 套件 battery 无回退**：`gaps` **39/39**、nested 8/8、nested2 10/10、tuple 20/20、comp 10/10、cls 12/12、alias 12/12、
  gen 11/11、try 12/12、regress 15/15、one 10/10、b2 13/13、cont 12/12、func 31/31、str 12/12、fstr 8/8、pct 8/8、
  bit 10/10、booljson 4/4、float 10/10；三条既有失败不变（one2 的嵌套单行、math 的两条测试台边界、dict 的三条已知限制）。
* `demos.json` 12/12 仍与 CPython 逐字一致；新增 `scope.json` 4/4、`d1.json`（字典嵌套）4/4、`pan.json`（值格式化）7/7。
* **历史版本可重建**：`rebuild-old.ps1` → v4.10…v4.32 全 MATCH（结构比对：块数/每个 opcode 的数量/过程名/变量列表名——块 id 自带随机后缀，所以文件字节并不相同）。
* 结构体检：`check41.cjs MiniPy_v4.31.sb3` → total **10,855**，errors=0。
* 全量 battery 末次结果见 `_work/v41/battery_v431_final.txt`（与上表一致）。

## 10. 复现

```
node _work/v41/assemble.cjs        # ... + p58 + p59 + p60 + p61 + tail.txt
node _work/v41/build41.js          # -> MiniPy_v4.31.sb3
node _work/v41/check41.cjs MiniPy_v4.31.sb3
node _work/v41/run.mjs MiniPy_v4.31.sb3 _work/v41/gaps.json
node _work/v41/run.mjs MiniPy_v4.31.sb3 _work/v41/demos.json
node _work/v41/run.mjs MiniPy_v4.31.sb3 _work/v41/scope.json
node _work/v41/paneltest.mjs MiniPy_v4.31.sb3          # 变量面板渲染 + 截断
node _work/v41/steptrace.mjs MiniPy_v4.31.sb3 _work/v41/step1.json 12   # 函数体内单步
node _work/v41/uiclick2.mjs MiniPy_v4.31.sb3 _work/v41/s12_fib.json   # 真点击：一次点击 = 一行
node _work/v41/modeloss.mjs MiniPy_v4.31.sb3 _work/v41/s12_fib.json   # 验证 P65（RUN 中途单步仍一次一行）
node _work/v41/stepcost.mjs MiniPy_v4.31.sb3 _work/v41/s14_fn.json   # 验证 P66（函数内一步多少帧/毫秒）
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.31.sb3 -out _work/v41/battery_v431.txt
```
