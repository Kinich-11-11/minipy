# MiniPy v4 代码评审与改进建议

评审对象：`MiniPy_v4.sb3`（评审期间由 174,739 字节被重新生成为 178,744 字节，见下方版本说明）
评审方式：解压 sb3 后直接分析 `project.json` 积木图，并与 v3 / v4.1 对比；同时阅读生成脚本 `_work/build.js`、`_work/sb3lib.js`。
产出工具：`_work/inspect.js`（工程体检）、`_work/decomp.js` + `_work/decomp.txt`（积木 → 伪代码）。

> 已核对：sb3 内的 `project.json` 与 `_work/build/project.json` 的 SHA256 完全一致
> （`586CC753…D4F0`），也就是说 **v4 = v3 + build.js 的 7 个补丁**，改代码应该改 `build.js` 而不是手工拖积木。
> `MiniPy_v4.1.sb3` 同理对应 `_work/v4.1/project.json`。

> **版本说明（重要）**：本评审先基于 23:25 的构建
> （174,739 B，project.json sha256 `586CC753…D4F0`，Controller 976 块）；
> 评审过程中 23:36 该文件被重新生成为 **178,744 B**（sha256 `35E44310…953B`，Controller 1115 块），
> 新增了 PATCH 8a/8b/8c。已对新构建逐项复核，结论如下：
> **P0-1～P0-4、P1-1～P1-3、P2-2、P2-3 全部仍然存在**（Interpreter 仍是 2369 块，未变动）；
> **P2-1 的"打不出大写"已由 PATCH 8b 解决**，**P2-4 的"HELP 折行断词"已由 PATCH 8a 解决**。
> 下文相关小节已标注。

---

## 0. 体检结论速览

| 项目 | 结果 |
|---|---|
| 角色 / 积木 | Stage 22、Controller 976、TextRenderer 176、Interpreter 2369，合计 **3543** |
| 孤立积木（顶层不可达） | **0** ✅ |
| 自制积木 | 50 个定义，无重复定义、无"调用未定义"、**参数 id 与个数全部匹配** ✅ |
| 变量 / 列表 | 115 个变量声明，其中 **16 个全工程未被引用**；25 个列表全部在用 |
| 造型引用 | 全部存在 ✅ |
| parent 字段 | **489 处缺失**（Controller 100 / Interpreter 389）⚠️ |
| 常量死分支 | 1 处：`if 1 == 0` 守卫 6 个积木（v3 就存在）⚠️ |
| 死过程 | `editLine` 定义了但无人调用（v3 的调用点已不可达，v4 清理后彻底悬空）⚠️ |
| 未勾选"运行时不刷新屏幕" | Controller: click / startRun / editLine / importCode；Interpreter: execute / conditional / forloop（7 个，属有意设计） |

**语言实现的正确性整体很好**，这些我逐条读过算法、确认与 Python 一致：
运算符优先级与结合性（`eval` 取**最右**同级运算符 ⇒ 左结合）、`not` 的优先级、`not in` 的 token 与 skip 处理、
`and/or` 短路并返回操作数本身、`//` 与 `%` 的向下取整语义（`-7 % 2 == 1`）、
`int()` 用 +0 强制数值化再 floor/ceil（朝零截断）、多目标与链式赋值的"先全部求值再赋值"、
`break/continue` 在 `while` 与两种 `for` 下的 LoopHead/LoopEnd 栈处理、`elif/else` 的 branchjump 机制、
`s[a:b]` 的负下标与越界截断。`checkASCII` 里"先把造型切到 1 再按名字切"是个很聪明的存在性判定。

下面按优先级给改进建议。

---

## P0-1 每执行一行源码就让出一帧（性能天花板）

**位置**：Interpreter 的 `WHEN RUN` 主循环末尾 `wait 0`。

```
until (running == 0 or (pc > len(Code) and len(LoopHead) == 0) or error != ""):
    ... 执行一行 ...
    wait 0          <- 每次循环都让出一帧
```

Scratch 每秒 30 帧，所以 **无论程序多简单，上限就是 30 行源码/秒**：

* `for i in range(1, 1001)` ≈ 33 秒；
* 触到 `steps > 10000` 的限流要 ≈ **5.5 分钟**才报 `LimitError`；
* 再叠加 TextRenderer 每帧全屏重绘（见 P0-3），实际更慢。

**建议**：加一个速度开关（慢速/快速），把"让出"改为按步数让出，例如

```
if (mode == 1) or (steps % 50 == 0):   # 慢速模式或 STEP 时仍逐行刷新
    dirty = 1
    wait 0
```

快速模式下 50 行/帧 ≈ 1500 行/秒，同时 `steps` 上限相应放宽（例如 20 万）。UI 上就是把现在的 ▶ 变成 ▶(慢) / ⏩(快)，或复用已废弃的 O-/O+ 位置做速度档位。

## P0-2 变量查找是全工程最热路径

**位置**：`lookup %s` → `compareText %s %s` → `costume = ("_" + char); ca = costumenum`。

每一次变量**读**（`atom`）和**写**（`assign`）都会线性扫描 `Names`，每个字符还要切一次造型 + 读一次造型编号。
20 个变量时，一次 `x = x + 1` 大约要几百次造型切换。这是解释器最大的常数开销。

**建议（语义不变，改动很小）**：

1. 在 `lookup` 循环里先用**长度**过筛——长度不同必然不等，直接跳过 `compareText`；
2. 再用 Scratch 内建 `=`（大小写不敏感）做粗筛：粗筛为假 ⇒ 一定不是同一变量，直接跳过；
   只有"长度相同且 = 为真"时才调 `compareText` 做大小写敏感的精确比较。

```
until (found > len(Names) or cmp == 0):
    if (len(item found of Names) == len(vn)) and (item found of Names = vn):   # 粗筛
        compareText(item found of Names, vn)                                    # 精筛
    if not (cmp == 0): found += 1
```

注意 Scratch 的 = 会忽略大小写，所以**不能**直接用它替代 `compareText`（`x` 与 `X` 必须区分），但用作"否证"是安全的。

## P0-3 每帧全屏重绘

**位置**：TextRenderer 的 `draw`（`pen_clear` + 全部重画）。

粗算一次重绘：代码区 16 行 × (3+49) 字符 + 变量区 4×30 + 控制台 9×30 + 4 段状态文字 ≈ **1300 次 stamp**，
每次 stamp 前还要切造型；而运行时 pc 每行都变 ⇒ dirty 每帧为 1。

**建议**：

1. **脏区拆分**：把 dirty 拆成 dirtyCode / dirtyVar / dirtyOut，用背景色画粗线"擦掉"某一行再重画该行
   （pen 无法局部 clear，但可以用大号画笔盖白），这样跑程序时只重画移动的那一行；
2. **`text` 提前收尾**：现在是固定 `repeat limit` 次，短行也白跑。改成
   `repeat min(limit, len(s) - offset)`，控制台/变量区（多数行不足 30 字）能省掉 30%~70% 的循环；
3. 快速模式下降频，例如每 2~3 帧才重绘一次。

## P0-4 `pow` / `round(x, n)` 没有上限，可以直接冻死项目

**位置**：`builtin2b` — `repeat abs(ev): qpow = qpow * a1v`（pow）、`repeat abs(ev): qpow = qpow * 10`（round）。

`pow(2, 1000000000)` 或 `round(1.5, 999999999)` 会让 warp 过程在**一帧里**跑十亿次循环 ⇒ 浏览器卡死、连停止按钮都点不动。

**建议**：入口处加保护，例如 `abs(指数) > 1024` 或 `abs(n) > 15` 直接 fail。顺便也给字符串 + 的结果长度加个上限
（现在只有 `eval` 出口的 2048 限制，循环里反复拼接可以在单次语句内炸掉）。

---

## P1-1 parent 字段缺失（格式卫生）

数据：v3 解压出来只有 8 处，v4（23:25 构建）变成 **489 处**（Controller 100、Interpreter 389），
新构建（23:36）因为 8b 又插了一批积木，涨到 **524 处**（Controller 135、Interpreter 389）；v4.1 是 0 处。

**根因**：`_work/sb3lib.js` 里把子积木塞进输入描述符的 `REP()` / `BOOL()` 只写了 `[3, id, shadow]` / `[2, id]`，
**没有回填子积木的 parent 字段**（`chain()` 和 `sub()` 有写，所以只有一部分是好的）。运行时执行不受影响
（执行走 next / inputs），但 parent 链是 Scratch 编辑器和第三方工具（拖动、删除、`blocks.deleteBlock` 的父子清理、
序列化往返）的依据，属于必须修掉的隐患。

**建议**：在 `build.js` 写文件前加一个统一重算的反向链接 pass（对 v4 现有工程也能直接跑）：

```js
function relink(project) {
  for (const t of project.targets) {
    const B = t.blocks;
    const attach = (child, parent) => { if (child && B[child]) B[child].parent = parent; };
    for (const id in B) {
      const b = B[id];
      if (b.topLevel) b.parent = null;
      if (typeof b.next === 'string') attach(b.next, id);
      for (const k in b.inputs) {
        const inp = b.inputs[k];
        if (!Array.isArray(inp)) continue;
        for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') attach(inp[i], id);
      }
    }
  }
}
relink(project);   // 放在 JSON.stringify 之前
```

## P1-2 死代码与冗余声明

| 位置 | 问题 | 建议 |
|---|---|---|
| Controller `click` 中 `if 1 == 0` 守卫 6 个积木 | v3 遗留的"鼠标位移滚控制台"逻辑，v4 已改成"指针只选区 + ↑/↓ 逐行滚动"，这段被常量条件封死 | 直接删掉这 6 个积木 |
| Controller `editLine`（11 个积木） | v3 里调用点就已不可达，v4 清掉调用后彻底成为死过程 | 删掉，或**重新接上**（见 P2-1，它其实很有用） |
| Controller `click` 中的 `varpage += 4` | 在 uy∈(94,112) 且 ux>65 的区域点一下会让变量页跳 4 行，和 v4"指针不引起滚动"的设计冲突 | 确认是否有意（点标题翻页）；若无则删除 |
| 变量 | 全工程未被引用 16 个：uj、rk、ry、rtext、eprec、tail、nest、start、end、alt、linebody、argstart、c1、c2、oldv、oldtype | 删除；名字像旧版分词器遗留 |

跑 `node _work/inspect.js` 可以随时复查以上各项。

## P1-3 IMPORT/EXPORT 的竖线是保留字符

`exportCode` 用竖线连接所有行，`loadCode` 按竖线切分。目前输入通道打不出竖线（键盘没有该键帽、调色板也没有），
所以还不是"能踩到的 bug"，但这是**契约级限制**：一旦按 P2-1 支持中文/大写（走 ask 粘贴），
`print('a|b')` 这类代码就会在往返时被切成两行。

**建议**：EXPORT 继续用竖线（兼容），IMPORT 增加转义（反斜杠 + 竖线）或换一个几乎不可能出现在代码里的分隔符，
并在 HELP 里写明这条约定。

---

## P2-1 中文 / 粘贴 / 长行：把 `editLine` 接回来（大写部分已由 PATCH 8b 解决）

**已解决**：PATCH 8b 在调色板第二行 11 号槽位加了 **A/a 大小写开关**（`caps` 变量），26 个字母键帽都改成
"caps=1 就插大写"，并画了 Aa 按钮。这条建议已经落地 ✅

**仍未解决**：Scratch 的按键事件无法区分 Shift，键盘通道永远进不来**中文**、**长行**和**竖线**；
而 `editLine` 过程本身是好的（`ask "Line N: <内容>"` → 回车整行替换，自带 backup 撤销点，
在 v3 里调用点就已不可达，v4 清理后彻底悬空），现在仍然是死代码。

**建议**：给它一个入口，例如"在左侧行号栏双击 → 编辑该行"（需要记录上次点击时间做双击判定），一次解决三件事：

1. 走 `ask` 框可以**粘贴**任意文本（长行、竖线、中文）；
2. 配合 P2-2 放宽 `checkASCII` 后，中文才能真正输入；
3. 长行的改写不用一个字一个字敲。

若只想要"大写字面量"，8b 的 caps 开关已经够了；但要做中文，就必须有 `ask` 这条通道。

## P2-2 中文（非 ASCII）全被拒绝

`tokenize` 第一句就是 `checkASCII`，字符不在 95 个 ASCII 造型里就报 `SyntaxError: ASCII text required`。
这不只挡住字符串，**`input()` 的答案也会被挡**——用户输入中文会得到一条语法错误，很难理解。

**建议**：

1. `checkASCII` 只作用于字符串字面量**之外**的源码，字符串内部允许任意字符；
2. TextRenderer 遇到没有造型的字符时回落成空白（现在 `text` 会先把造型切到 32，改成切到空格造型即可），渲染不会串字；
3. `input()` 的返回不再走 `checkASCII`，报错文案也更明确。

## P2-3 与 Python 的行为差异（建议至少写进 HELP）

| 现象 | MiniPy v4 | CPython | 说明 |
|---|---|---|---|
| `round(0.5)` / `round(2.5)` | 1 / 3 | 0 / 2 | Scratch 的 round 是 JS `Math.round`（.5 向上），Python 是银行家舍入 |
| `print(True)` / `str(True)` | 1 | True | 布尔被折成 1/0（Types 里只有 N/S，想修就加一个 B） |
| `print('a\nb')` | anb | 换行 | tokenize 的转义分支只"跳过反斜杠、把下一个字符原样收进串"，反斜杠 n 变成了字母 n |
| `int(' 12 ')` | ValueError | 12 | `numbercheck` 不接受空白 |
| 25 项以上的连加 | LimitError: expression depth | 正常 | `fnlimit > 24` 按表达式递归深度计费，而二元运算符是右递归拆分，链式求和一项一层；建议放宽到 64 或改成按 token 数计费 |
| `range(0, 1, 0.5)` | TypeError | 允许 | 有意限制（整数区间），写进文档即可 |
| `'a' * 3`、列表、`def`、`try` | 不支持 | 支持 | 见路线图 |

另外几处硬编码上限建议做成变量（或至少写进 HELP）：**单行 240 字符、程序 200 行、值 2048 字符、步数 10000**。

## P2-4 UI 细节

* **控制台自动跟随**：`log` 每次都把 outpage 设成 len(Output) - 8，跑程序时用户往回翻会被下一条 print 顶回底部。
  建议加一个 follow 标志：只有"用户本来就在底部"时才自动跟随。
* **undo 只有一级**：Snapshot 是覆盖式的。可以用 Scratch 列表做多层快照，把 undo 做成栈。
* **变量区会硬截断**：`draw` 给变量/控制台行的 limit 是 30 且不换行（`log` 会按 30 字折行，变量区不会），超过就看全不到了。
* **HELP 折行断词**：✅ 已由 PATCH 8a 解决（HELP 每行控制在 30 字内，并新增 Aa/滚动说明）。
* **控制台 300 行上限**、EXPORT 只导出程序不导出控制台输出——可考虑加"导出控制台"。

---

## 3. 路线图建议（按性价比排序）

1. **`def` 自定义函数**：这是"像 Python"的最后一块拼图。现有结构几乎已经具备条件——
   把 `prepare` 的 Ends/Elses 再加一份 DefStart/DefEnd/DefParam；`execute` 遇到 `def` 直接跳到函数体末尾；
   `callfn` 认不出内建名时查函数表，压入"返回行号 + 局部变量名"的调用帧，函数体结束弹帧回到调用点。
   递归随之自然支持（注意加深度上限，复用 `fnlimit` 的思路）。
2. **列表**：Scratch 的 list 与 Python list 天然对应（方括号字面量、append、len、下标、for x in list）。
   `indexget` 已经做好了字符串版本，扩一个 L 类型即可，收益比 `def` 更大（能写真正的算法题）。
3. 上面 P0/P1 的性能与清理项（一次 `build.js` 迭代就能全做完）。
4. 中文/大写输入 + 换行转义支持（做完 P2-1/P2-2 后体验会明显上一个台阶）。

---

## 4. 工程流程建议

* **把生成脚本整理成一条可重放的流水线**。现在是 `build.js` + `fixer9..18.js` + `v_regress.py` 等一堆散件，
  且 fixer 系列是"打一枪换一个"的临时补丁。建议收成 build（补丁按顺序编号、幂等、可重复运行）+ test（回归）+ inspect（体检）
  三件套，所有 `MiniPy_vN.sb3` 都由它生成。
* **把测试 harness 提交进仓库**：`v4.1/test-results.json` 自己写明用的是自写模拟器 `_work/vm.js`
  （"not official scratch-vm"），而这个文件**已经不在仓库里**，等于回归验证不可复现。
  既然 v4 的更新说明声称用真实 scratch-vm 5.0.300 无头验证过，建议把那段脚本一起纳入版本管理，
  或直接用官方 scratch-vm 的 loadProject 跑，把 `_work/cases.json` 的用例扩成"语法/语义/报错/UI 行为"四组，提交前跑一遍。
* **版本号混乱**：v4 与 v4.1 是两条并行分支（v4.1 缺 `not in` 与 `max/min/pow/round(x,n)`，但 parent 干净）。
  建议明确一条主线，把 v4.1 的 parent 修复合并进来，别再让两个版本各自演化。
* `meta.agent` 现在是 "MiniPy built with CrispStrobe/sb3-creator"，建议加上版本号与构建时间，便于回溯。

---

## 附：本次评审产生的工具

| 文件 | 用途 |
|---|---|
| `_work/inspect.js` | 工程体检：`node _work/inspect.js [project.json]`，检查孤立积木 / parent 链 / 冗余变量列表 / 常量死分支 / 自制积木调用图 / 造型引用 |
| `_work/decomp.js` | 把 project.json 反编译成可读伪代码：`node _work/decomp.js <project.json> <out.txt>` |
| `_work/decomp.txt` | MiniPy v4 当前构建的伪代码清单（1900 行，含每个过程的 warp 标记、循环嵌套、真实表达式） |
| `_work/decomp41.txt` | v4.1 的伪代码清单，便于对比 |
