# _work/v41 — v4.1x 增量线（工程说明）

产物：`MiniPy_v4.10.sb3`。真源：`build41.js`（从 `MiniPy_v4.sb3` 出发的补丁脚本）。
**不要手改 project.json**；要改功能就在 build41.js 里加/改一个 patch 函数再重新生成。

## 文件

| 文件 | 作用 |
|---|---|
| `build41.js` | 生成器：加载 v4 → 依次执行 `PATCHES` → 清理孤儿 → 重挂 parent → 写 sb3/json |
| `run.mjs` | 无头用例跑法：加载 sb3、逐例注入 Code/广播 RUN、收集 Output 并与 CPython 对比 |
| `gaps.json` | 缺口用例（来自 `_work/cmp47/v4_缺失清单.md`，每条带 tag A1..A29/B1..B8） |
| `regress.json` | 原有功能回归用例 |
| `check41.cjs` | 结构体检：悬空引用 / 孤儿块 / 未定义过程 / 参数不匹配 / 未声明变量与列表 |
| `dbgrun.mjs` | 单程序调试：跑一个程序后 dump 指定变量与列表（`node dbgrun.mjs <sb3> cases.json [vars] [lists]`） |
| `show.cjs` | 从结果 json 里挑 tag 打印 |
| `decomp41.txt` | 反编译视图（`node _work/decomp.js _work/v41/project.json _work/v41/decomp41.txt`） |

## build41.js 的写法

```js
patch('P14 xxx', () => {
  newVar('tmp', 0);                       // 需要新变量就声明（自动避免重名）
  const d = newProc('myproc %s', ['v']);  // 新建自制积木（warp）
  attachBody(d.defId, [ setV('ev', argOf('v')), ... ]);
  const set = inDef('execute');           // 取某个过程的整棵积木树
  const anchor = find(set, b => ...);     // 按结构定位
  insertBeforeStmt(anchor[0], [ IF(...) ]);
});
```

工具函数（都定义在 build41.js 顶部）：`B/I/num/txt/VAR/item/llen/addTo/clearL/lenOf/letterOf/
JOIN/ADD/SUB/MUL/MOD/DIV/FLOOR/EQ/LT/GT/AND/OR/NOT/setV/chgV/IF/IFELSE/REPEAT/REPEATU/
chain/defIdOf/inDef/reach/find/refOf/cloneExpr/replaceExpr/replaceStmt/insertBeforeStmt/
prependStack/setStack/spliceAfter/detachTail/callProc/FAIL/FAILB/newProc/attachBody/newVar/ancestor`。

约定：过程之间用全局 `ev`/`evtype` 传值（v4 既有约定）；`Kind` 与 `Tok` 是当前行的记号表。

## 值的类型标记

`N` 数字、`S` 字符串、`L` 列表（`lsep` + 类型字符 + 原文 重复）、`B` 布尔（值 "1"/"0"）、
`Z` None（空串）。打印一律过 `strval`，列表元素过 `reprval`（字符串元素带引号）。

## 踩坑备忘（新写补丁前先读）

1. `find()` 的集合是"可达块"，会**递归包含子栈**；嵌套 if 会同时命中内外两层，取最内层要按 `reach` 大小排序。
2. `ancestor(id, pred)` 返回**最近的**满足条件祖先（不是祖父）。
3. `JSON.stringify(block.inputs)` 不含被引用块的内部文本，定位字面量要顺着 `parent` 往上找。
4. 过程参数只读；要"改参数"就先拷进变量。
5. 递归调用会覆盖全局临时量，跨递归要用的边界先另存。
6. 复用别人的全局临时量/临时列表极危险（`Comma`、`lacc`、`ev` 都被内部过程反复写）。
7. `prependStack`/`insertBeforeStmt`/`replaceStmt` 传整条链时，实现必须接链尾，否则链内 `next` 被覆盖。
8. 每次 build 结束会跑 `pruneUnreachable` + `relinkParents`，并断言"非顶层块必须有 parent"，失败会 exit 1。
## v4.11 追加（每轮都在这里记一笔）

* 新增 P14：`def` / `return` / 递归 / 局部作用域。调用是**同步**的（`calluser` 自带一个
  `boundary → tokenize → execute` 的函数体循环），这样"调用嵌在表达式里"才成立。
* 构建期做**调用图可达性分析**：凡是"能触达用户代码"的过程用到的变量/列表，都会在调用时由
  `fpush`/`fpop` 整份入栈、返回时还原（本轮 137 变量 + 14 列表）。加新功能时如果出现
  "函数调用后主程序算错"的症状，先怀疑某个新临时量没有进这个集合（起点是 `execute`/`eval`/`callfn`/`calluser`）。
* 变量分三处：Interpreter 自己的、Stage 的（`pc`/`branchjump`/`steps`… 解释器也在用）、以及纯叶子过程的私有临时量。
  前两类要入栈；`error/running/status/dirty/busy/dq/slash/lsep` 以及所有 `ep*` 名字故意排除。
* 版本回放：`V41_SKIP='P14 def/return' node build41.js` 重建 v4.10（实测与随包文件逐块一致）。
## v4.12 追加

* P15 循环 else（`LoopElse` 标记列表 + execute 的 else 分支"落入"语义 + break 跳过 else）、
  P16 异常类名（类型 `C`，strval 打印 `<class 'X'>`）、P17 lambda（`FnKind='L'` + `FnLine/FnTlo/FnThi`，
  函数值类型 `F`，eval 派发里用 `callable` 变量统一判定"名字/变量持有函数"）。
* 写新补丁时的两个教训：
  1. `find(set, pred)` 的第一个参数必须是 id 集合（`inDef(...)`/`reach(...)`），传 proccode 字符串会遍历字符；
  2. 同一个 proc 里若有多个同形失败分支（如 calluser 的 "NameError: function" 与 "missing argument"），
     定位时要把 JOIN 的字面量也纳入判断，否则补丁会插到错误的分支里。
* 版本回放：`V41_SKIP='P15 loop-else,P16 builtin classes,P17 lambda'` 得 v4.11；再叠加 `P14 def/return` 得 v4.10。
## v4.13 追加

* 生成器按补丁拆成片段：`head.txt + p13 + p14 + p15 + p17 + p18 + p19 + p20 + tail.txt`，
  用 `node assemble.cjs` 拼成 `build41.js`。**不要**用 read/write 回写整个 build41.js
  （读取工具对大文件有上限，本轮因此丢过一次文件）。
* P18 字符串方法（`scase/sfind/scount/srep/sprefix/ssplit/sjoin` + methodcall 的 S 分支）、
  P19 一元运算符的记号类型守卫、P20 方法链（methodcall 递归 + `mcpre` 预置接收者）。
* Scratch 语义提醒：`contains` 大小写不敏感；`stop this script` 在过程里等于"从该过程返回"；
  `switch costume`/`costumenum` 仍是 v4 里 compareText 的实现方式（性能隐患保留）。
* 新增专项用例：`str.json`（12 条字符串方法）、`chain.json`（4 条方法链）。

## v4.14 追加

* P21 f-string：分词器把 f"..." 读成一个 Kind=F 的记号，fstr 过程展开 {expr}
  （内层 tokenize + eval + strval），atom 处理完再 tokenize(Code[pc]) 复原当前行。
* **P22 单行复合语句：已写完但 DISABLED**（p22.txt 不在 assemble 的 parts 列表里）。
  它同时改动 prepare / execute / conditional / forloop / boundary 五处，实测会破坏块状循环、
  并让单行循环挂死。启用前必须先在 one.json 用例集（含 3 条块状回归）上全绿。
* 新增用例集：fstr.json（f-string 8 条）、one.json（单行复合语句 10 条）。

## v4.15 追加

* P23 math 模块：execute 的 import 分支（只认 math，置 hasmath）+ methodcall 开头的 math 分派；未 import 就用会报 NameError。
* P24 % 格式化：rightside 在求值右操作数之前拦截（op 为 % 且左值是字符串），转 pctfmt；
  注意分段哨兵要用右括号位置，且收集参数与扫描格式串要用两个游标。
* 新增用例集：math.json（10 条）、pct.json（8 条）。

## v4.16 追加

* P25 位运算：分词器合并 << / >>，rank 按 Python 优先级重建，rightside 增加分支，& | ^ 由 bitop 逐位算。
* P26 推导式：complist 在方括号内切分 body/for/if，range 走数值循环，列表与字符串按元素/字符遍历。
* 教训：新补丁的临时变量名必须先反编译搜一遍（ci 被 compareText/checkASCII 占用，导致推导式只产出一个元素）；
  关键插入后加可达性断言，避免替换字符串没匹配时的静默失效。
* 新增用例集：bit.json（10 条）、comp.json（10 条）、booljson.json（4 条）。

## v4.17 追加

* P28 元组 + divmod：元组沿用列表编码（lsep + 类型码 + 文本），类型码用 T；新增过程 hascomma / tuplelit / tupfmt；
  `eval` 的 `( … )` 分支先 `hascomma`，有顶层逗号走 `tuplelit`，否则照旧 `eval`；
  `indexget` / `callfn`（len、sum）/ `forloop` / `strval` / `reprval` 放开 T；`tupfmt` 单元素补尾逗号。
* divmod 的位置：v4 里两参调用不会进 `callfn`（`callfn` 只处理"0 个逗号"或可调用对象），
  所以分支挂在 `eval` 的 `narg == 0 / else` 分支头部，用 `hascomma` 定位逗号后分别 `eval` 两个实参。
* 嵌套容器格式化：`listfmt` / `tupfmt` 递归调用前后用列表 `VStack` 做后进先出的 pushVars / popVars
  （累加器、元素文本、循环计数器都要存取；只"另开一个临时变量"不行——内层调用同样会改写它）。
  嵌套容器的**字面量**仍不支持，属 A13（编码需要在元素里再嵌 lsep，得改成带长度前缀）。
* 未知函数报错：v4 里那条 `fail %s` 的消息文本就是一个坏掉的方块 ID，改成用 `Tok` 里的函数名拼
  `NameError: name X is not defined`。
* 输入描述符有三种形态：字面量 `[1,[10,"x"]]`、方块 `[3,<id>,[10,""]]`、变量 `[3,[12,"name",<id>],[10,""]]`。
  补丁里判断条件必须用 `litOf` / `blkOf` / `varOf` 分别取（直接写 `[1] === 'L'` 或 `[1][1] === 'L'` 都只对其中一种成立）。
  `find(set, pred)` 返回的是 ID 数组，不是方块对象。
* **守卫之外不要追加**：`tuplelit` 尾段最初把"拼接累加器"写在 IF 之外，于是 `(1,)` 会得到两个元素
  （把上一段的编码又拼了一遍）。求值、编码、拼接必须在同一个守卫里。
* 版本回放：`build41.js` 的跳过判定改为 `patchEnabled`（支持前缀，`V41_SKIP='P27,P28'` 即可）；
  `_work/v41/rebuild-old.ps1` + `compare.cjs` 会重建 v4.10–v4.16 到 `_work/v41/rebuild/`，
  再按"逐 opcode 直方图 + 变量/列表清单 + 过程名集合"与随包产物比对（`MATCH`/差异）。
  版本=补丁映射（由随包产物的 opcode 直方图实测确认）：v4.10=P1..P13、v4.11=+P14、v4.12=+P15/P16/P17、
  v4.13=+P18/P19/P20、v4.14=+P21、v4.15=+P23/P24/P25、v4.16=+P26、v4.17=+P27/P28；
  对应 V41_SKIP 分别为 `P14..`、`P15..`、`P18..`、`P21..`、`P23..`、`P26,P27,P28`、`P27,P28`（`..` 表示其后的全部补丁）。
  注：本轮中途构建过 P28，`MiniPy_v4.16.sb3` 曾被覆盖成最新版，已按上表重建还原（8,579 块）。
* 新增用例集：tuple.json（20 条；失败的 5 条全是 A13 嵌套容器）。

## v4.18 追加

* P29 math 返回值类型：`methodcall` 的 math 分支里，`sqrt/pow/exp/log/log10/sin/cos/tan/fabs/fmod`
  在"赋值 ev/evtype"之后补 `mkfloat`；`floor/ceil/trunc` 不动（CPython 返回 int）。
  实现要点：定位"该分支剩下的最后一条 `setvariableto ev|evtype`"，`spliceAfter` 它，
  （不能插在分支尾部——有的分支末尾是 `control_stop`）。
* P29 顺带把两条 math 报错文案改成 CPython 原文（`fail %s` 的消息是 JOIN 块，
  识别它要递归遍历输入里的**字面量描述符** `[1,[10,"…"]]`，光用 `reach` 找不到文本）。
* math.json 1/10 → 7/10，剩 3 条是判据边界（CPython 抛异常=无 stdout 即判失败；`import os` 不可能实现）。

## v4.19 追加

* P30 单行复合语句：新增过程 `expandlines`（源码级展开），在 `main` 调 `prepare` 之前连调三次；
  展开结果直接写回 `Code`，缩进分析/`Elses` 等后续流程不变。
* 判定规则：第一个单词 ∈ 列表 `Kw`（if/elif/else/while/for/def/try/except/finally/with/class）+
  括号深度 0 的最后一个冒号（跳过字符串与注释）+ 冒号后确有内容。`f = lambda x: x + 1` 因此不会被误展开。
* 教训：关键字判定要在空格、`:`、`(` 三处截断——只按空格截断时 `else: print('b')` 取到的词是 `else:`，
  该行不会被展开（one.json 8/10 → 10/10）。
* 取舍：展开后行号会变，`Line N` 报的是展开后的行；仍受 200 行上限约束。

## v4.20 追加

* P31 any/all：新过程 `anyall fn vv vt`（列表/元组逐元素用 `truth` 判真值并提前结束；字符串按"非空即真"；
  其它类型报 TypeError；结果类型 B）。挂接在 `callfn` 名字分派链末尾、`pending==0` 报错之前，
  处理完置 `pending=1` 再 `stop this script`。
* **callfn 的 lo/hi 就是实参区间**（它开头已 `eval(lo,hi)` 得到 `ev`/`evtype`），
  新内建直接读 `ev`；按 `eval` 的 `lo+2/hi-1` 约定去重算会送进越界区间，报 `SyntaxError: expression`。
* **argument reporter 参与 `operator_or` 组合不可靠**（`(vt=='L') or (vt=='T')` 走了 else，
  但同一 reporter 单独比较/打印都正常）。类型分派一律改用全局 `evtype`。
* 缺口清单 31/39 → 32/39（A24 关闭）；新增用例集 b2.json（13 条）。


## v4.21 追加

* P32 续行：新过程 `joinlines`，插在第一个 `expandlines` 调用**之前**（先接行、再展开单行复合语句）。
  逐行累计括号深度与"行尾反斜杠"，未闭合就把下一行 `trimsp` 后接上（中间补空格），
  反斜杠续行先删掉反斜杠，最后写回 `Code`。
* 扫描规则：单引号与双引号都进字符串状态（引号内括号不计数、`\` 跳过下一字符）、
  `#` 后不计数、行尾反斜杠只有不在字符串内才算续行。
* 坑一：`insertBeforeStmt(prepare)` 会落到已插好的三次 `expandlines` 之后 → "先展开后接行"，
  `if (True and\n True): print('ok')` 报 `expected colon`；必须插在第一个 `expandlines` 之前。
## v4.22 追加（调查轮）

* 本轮目标是 A13/A12，实际产出是把三个前置障碍定位清楚；P33（字典字面量补丁）写了一半，
  **未加入 assemble.cjs 的 parts 列表**（文件保留在 _work/v41/p33.txt，是下一轮的基础）。
  产物仍是 v4.21（已用干净构建重建确认：Interpreter 7,968 / 合计 9,303，errors=0）。
* 障碍 1（最关键）：解析层不允许容器字面量当操作数。eval 的 Tok[lo]=='[' && Tok[hi]==']' 分支
  要求整个区间首尾就是括号，嵌套时元素区间的首字符是 '[' 或 '{'，在 atom/rank 阶段就报
  SyntaxError: expression / parentheses，走不到 listlit/dictlit。修法：把 '[' '{' 加入 atom 的
  起始判定，并让 pair/rank 把成对括号整体当原子。
* 障碍 2：编码不自描述。x=[1,2] 后 y=[x,3]，print(y) 得 [[], 1, 2, 3]（元素文本里的 lsep 被外层
  当成分隔符）。修法：构造点把元素文本里的 lsep 转义（ASCII 30 前缀），listitem 读出后还原；
  涉及 12 处构造点 + listitem。
* 障碍 3：链式下标 a[0][1] 不支持（indexget 只 eval(lo,lo) 取一个记号作基值），需在取到元素后
## v4.22 追加

* P34 嵌套转义：新变量 `lesc1`（ASCII 30）+ 过程 `lesc`/`lunesc`（结果写回 `ev`）；自动在 17 处「新鲜值拼元素」的语句前插 `lesc(ev)`，`listitem` 取文本后 `lunesc` 还原；同时解除两条 `nested lists are not supported` 保护。
* 判定规则：语句的值表达式里**同时**出现 `lsep` 报告器与 `ev`/`evtype` 报告器 → 需要转义；排序/切片这类「重排已编码串」的语句用 LSV/LST 与 `lsep+lnt+lneed`，天然被排除，避免双重转义。
* 坑：变量报告器在描述符的 `desc[1]`（`[3,[12,name,id],[10,""]]`），按 `desc[0]===12` 判断会命中 0 处，补丁会静默失效。
* 结果：nested.json 8/8、tuple.json 15/20 → 17/20，其余用例集全绿。
* A13 剩余两块：解析层允许 `[`/`{` 作操作数起始（嵌套字面量）；`indexget` 支持链式下标；两块完成后启用 p33.txt（字典）。
  检测后随的 '[' 并循环取值。
* 经验：find() 的匹配要同时约束条件子树与子栈内容，否则 '[' 分支会同时命中 listlit 与 indexget。
* 新增用例集 dict.json（10 条，当前 0/10）；诊断手段：dbgrun.mjs 直接看 Output，区分
## v4.23 追加（第二轮调查，无新产物）

* 目标仍是 A13 的「嵌套字面量」。本轮把失败点收窄到：**只要列表的第一个元素是列表就失败**
  （`a = [[1, 2], [3]]`、`print([[1], 2])` 都报 `SyntaxError: parentheses`），
  而「嵌套出现在后面」的写法能解析（`print([1, [2, [3, 4]]])` 有输出，但结果串层错误）。
* 用 `dbgrun.mjs` 确认**词法层没有问题**：`a = [[1, 2], [3]]` 的 Tok 是
  `[a, =, [, [, 1, ,, 2, ], ,, [, 3, ], ]]`，方括号是分开的记号。
* 因此报错来自 eval 的分派/深度扫描，而不是分词。已写过的 P35 补丁试图给 `expr[...]` 分派
  （`Tok[lo+1]=="["` 且调用 `indexget`）加上 `Tok[lo] != "["` 的守卫，构建与打印都成功，
  但 `[[` 的用例**仍然报错**，而 `[1, [2, [3, 4]]]` 从「报错」变成了「输出错串」——
## v4.24 追加（第三轮调查，无新产物）

* 本轮继续追 A13「嵌套字面量」，**排除了三个假设**，把范围推进到「报错的 eval 调用来自更外层」：
  1. 词法层正常：`print([[1], 2])` 的 `Tok = [print, (, [, [, 1, ], ,, 2, ], )]`、
     `Kind = [I, O, O, O, N, O, O, N, O, O]`，方括号各自成记号、Kind 与 Tok 对齐；
  2. 分派层加守卫无效：P35（给 `expr[...]` 分派加 `Tok[lo] != "["`）与
     P36（在分派前把 `[[…]]` 直接路由到 `listlit`，并补 `stop this script` 提前返回）都**没有改变结果**，
     说明失败的 eval 调用**在容器分派之前**就已经发生；
  3. 报错出处确定：`decomp41.txt` 1327/1351 行的两处 `SyntaxError: parentheses` 都在 eval 的括号深度循环里
     （扫描起点是 `ek = lo`，故正常区间不会为负 → 一定是**某个调用方把「开始于括号内部的区间」传给了 eval**）。
## v4.25 追加（第四轮调查，无新产物）

* **决定性对照实验**（本轮最大收获）：
  - `x = [[1]]` —— **通过**（error 为空）；
  - `x = [1, [2]]` —— **通过**；
  - `x = [[1], 2]` —— 报 `SyntaxError: parentheses`。
  即触发条件是「**前导嵌套列表 + 顶层逗号**」的组合，而不是嵌套本身。
* 已排除的假设（都有实验证据）：分词正确（Tok/Kind 对齐、方括号各自成记号）；
  `assignlist` 只在 `Tok[2] == ","` 时才做多值拆分，`x = ...` 走单值路径；
  在 eval 分派链最前面加「`[`…`]` 一律当列表字面量并提前 return」的短路（P37）**同样无效**。
* 因此结论收窄为：**报错来自 eval 的括号深度扫描**（decomp41.txt 1311–1351，扫描起点 `ek = lo`），
  而抛出它的是一次"从括号内部开始的区间"调用；短路无效说明该调用**发生在 eval 拿到完整 RHS 区间之前**，
## v4.26 追加（第五轮调查：新增 trace 诊断工具）

* 新增 `_work/v41/trace.mjs`：配合构建开关 `V41_TRACE=1`（tail.txt 已有 PDEBUG trace 补丁，会在 execute 每条语句前后往列表 Trace 记 EXEC pc=... c=... head=...），无头跑一段程序并打印 Trace 尾部，用来定位是哪条语句处理路径抛错。构建已验证通过（9,387 块 + [trace] enabled）；脚本刚做了健壮性修补（error/Output/Trace 在 Interpreter 与 Stage 双向查找），尚未复跑，下一轮第一件事就是跑一遍。
* 本轮另一条结论：字典字面量的 Tok 为 [x, =, {, a, :, 1, }]、Kind 为 [I,O,O,S,O,N,O]，词法完全正常，说明字典失败同样发生在分派之前那一层，与双方括号的情形同源；也说明 P33 此前 0/10 不是补丁写错，而是撞在同一个未解的前置问题上。
* 优先级建议：先用 trace 定位这个分派前的区间/深度问题（它同时卡住 A13 与 A12），再回头启用 P33；A4/A5/A8/B5 排在后面。
* 产物仍为 v4.22（Interpreter 8,039 / 合计 9,374，errors=0），本轮未改动主产物。
## v4.27 追加（trace 工具可用性修正）

* `trace.mjs` 的三个变量查找已做健壮化（error / Output / Trace 在 Interpreter 与 Stage 双向查找）。
* 实测注意：开着 `V41_TRACE=1` 时每执行一条语句就往 `Trace` 追加一长串字符串，
  原来的 2000 步循环会跑超时（10 分钟未结束）。**下一轮应把步数降到 200~400 并只打印最后 10 条**，
  或改成只追踪到第一次 `error != ""` 就停（在 `execute` 的追踪语句里加一个 `if error != "" then stop`）。
## v4.28 / v4.23 追加

* P38：把最后两处「fail 消息是方块 ID」改成 `NameError: <name>`（`//=`、`**=` 目标不存在时）。
* 探针法定位 A13：在 eval 的分派分支与 `listlit` 入口插 `addTo("Output", ...)`，跑 `x = [[1], 2]` 得到
  `LITBRANCH / LIT lo=4 hi=8 / LITBRANCH / LIT lo=5 hi=5` 之后才报 `SyntaxError: parentheses` ——
  证明**两个 listlit 区间都正确**，报错来自它们返回之后的某次 eval（区间以非 `[` 开头）。
  这推翻了此前三轮的下标分支假设，下一轮把探针改为打印 eval 入口区间即可直接抓到坏区间。
* 版本映射：v4.23 = v4.22 + P38。
* 本轮未改动主产物，仍为 v4.22（Interpreter 8,039 / 合计 9,374，errors=0）；
  剩余缺口：A4 类、A5 try/except、A8 生成器、A12 字典、A13 嵌套容器、B5 别名语义。
## v4.29 追加（第六轮 A13 调查：探针抓到坏区间）

* 探针（p39，临时）在 `eval` 入口打印区间，跑 `x = [[1], 2]` 得到：
  `EV 3-9 [x..]`（RHS 正确）→ `EV 4-6` → `EV 5-5`（两个 listlit 区间都正确）→ **`EV 1-8 [x..2]`** → 报 parentheses。
  即报错的那次调用把**整条语句去掉最后一个 `]`**（区间 1..8）交给了 eval，深度扫描因此以 1 结束。
* 候选调用点只有两处形如 `eval(1, X)`：
  1. `execute` 末尾的「表达式语句」兜底：`if pending == 0 then eval("1", count)`（decomp41.txt 1949–1953）；
  2. `fstr` 里对 `{...}` 片段重新分词后的 `eval("1", length of Tok)`（4025 行）——本例无 f-string，排除。
* 探针显示报错前后 `count=9`、`pending=1`（终态），而坏调用是 1–8 ⇒ 说明**那一刻** `count` 或 `Tok` 只有 8 项，
  即某处把尾部 `]` 丢了（或用了 `count-1`），且兜底分支仍在 `pending==0` 时被执行。
* 下一轮的具体做法（很小）：把探针改成在每次 `eval` 入口同时打印 `count`、`pending`、`pc`，
  并把兜底分支的探针**按变量描述符**匹配（`pending` 是变量报告器，此前用字面量匹配导致命中 0 处），
## v4.30 追加（第七轮 A13 调查：count 探针的结论）

* 探针 P40（临时）：在 execute 每条语句开头打印 count，并在「表达式语句兜底」的 eval(1, count) 前加标记。跑 `x = [[1], 2]` 结果：
  `EXEC count=9` → 直接报 parentheses，**兜底标记从未出现**。
* 结论一：语句开头 count=9（分词完整），错误发生在**第一条语句的处理过程内部**，不是兜底分支。
* 结论二：第 24 轮 P39 观察到的 `eval(1, 8)` **不是**来自兜底分支（唯一字面量 1 的调用点是它，却未执行），
  说明那次坏调用来自「首参是表达式、求值后才等于 1」的调用点。用 dbg42.cjs 扫出的这类点有：
  `assignlist <- eval(EXPR, VAR(count))`、`regdef <- eval(EXPR, VAR(fphi))`、`listlit <- eval(VAR(lplo), EXPR)`；
  结合「本例 Tok[2] 是 = 而非逗号，assignlist 不会参与」，最可疑的是**容器过程自身用坏边界调 eval**（listlit/tuplelit 的尾段）。
* 下一轮建议探针：给 `listlit`、`tuplelit`、`hascomma` 三个过程的入口各加一条打印（区间 lo/hi），
## v4.31 追加（第八轮 A13 调查：容器入口边界全部正确）

* 探针 P41：给 listlit / tuplelit / hascomma 三个过程入口打印参数。跑 `x = [[1], 2]` 结果：
  `listlit(4, 8)`、`listlit(5, 5)` —— 两次调用的边界都完全正确，且 tuplelit/hascomma 未被调用。
* 结合上一轮结论（语句开头 count=9、兜底分支未执行、坏调用是 eval(1, 8)）：
  坏区间**不是**容器过程入口传进来的，也不是兜底分支产生的，只剩两种可能：
  1. listlit 内部用变量拼的 eval 区间（尾段 `eval(lplo, hi)` 或元素循环 `eval(lplo, lphi)`）被污染；
  2. eval 分派在 listlit 之后继续走到 `pair`/`rank` 路径，用 `ecut` 拼出了坏区间
     （注意扫描循环在 `]` 使深度归零时也会调用 `rank(']')`，若 rank 对 `]` 返回正值就会设 ecut）。
* 下一轮建议（二选一，都很小）：
  a. 在 listlit 的两处 eval 调用前打印 `lplo/lphi/hi`，看是否有一次是 (1,8)；
  b. 直接给 `rank %s` 入口打印参数，看它是否被 `]`/`,` 之类调用并返回正值。
## v4.32 追加（第九轮 A13 调查：根因确认）

* **根因找到了**：`listlit` 用**全局**列表 `LComm` / `LOut` 工作，而元素求值会递归调用 `listlit` 自己；
  内层调用开头的 `clear(LComm)` / `clear(LOut)` 会把外层的逗号表与元素表全部抹掉。
  于是外层循环里 `lplo = item(lpi) of LComm + 1` 在 LComm 被清空后取到空串，`lplo` 变成 1，
  尾段就发出 `eval(1, 8)` —— 与第 24 轮探针观察到的坏区间**完全吻合**（区间以非 `[` 开头、深度以 1 结束 → parentheses）。
* 这也解释了为什么「前导嵌套 + 顶层逗号」才失败：没有顶层逗号时外层循环一次都不跑，直接走尾段，正好绕过被污染的 `LComm`。
* 第一次修复尝试（P42，写了一个 `listlit2`：不清空共享列表、只操作自己那一段、结束后清理自己追加的元素）：
  - 第一次构建把调用点的 proccode 改了但没重排参数 id → 全部列表字面量报 `unexpected token`（已修正：同时替换 mutation 的 argumentids 并重排 inputs）；
  - 修正后嵌套字面量**能通过解析**（不再报错），但取值错误：`print([[1, 2], [3, 4]])` 只打印 `[1, 2]`，`[[1], 2]` 打印空串。
  说明 `l2oc`/`l2bo` 的记账还有问题（元素计数或切片起点算错），**为避免"静默错误"未启用**，P42 已从构建移除。
* 下一轮建议：在 P42 的 `listlit2` 里打印 `l2bc/l2bo/l2cnt/l2oc` 与每次 append 后的 `length of LOut`，
## v4.33 追加（第十轮 A13 调查：第二个根因——逗号扫描差一）

* 本轮又找到**第二个根因**：`listlit` 的顶层逗号扫描把「区间首字符是开括号」也计入深度。
  嵌套时传给 listlit 的区间形如 `[1, 2], [3, 4]`（首字符是内层的 `[`），于是第二层的逗号被算成深度 1，
  **顶层逗号一个都记录不到**（`LComm` 为空）→ 尾段把整段当单个元素求值 → 结果错乱或报 parentheses。
  修法：扫描游标在「首记号是 `[`/`(`/`{`」时从 lo+1 起步（首括号本身不参与深度）。
* 本轮把 P42 的 `listlit2` 与上述扫描修正合并构建，结果：报错形态变了（`[[1,2],[3,4]]` 与 `[[1],2]` 分别报
  parentheses / expression，`[1,[2,[3,4]]]` 仍输出 `[1, 2]`），**仍未正确**，因此继续不启用（P42 已从构建移除，文件在 _work/v41/p42.txt）。
* 目前确证的两个根因（合并起来才能解释全部实验现象）：
  1. 内层 `listlit` 的 `clear(LComm)/clear(LOut)` 抹掉外层的表（P42 的 listlit2 已按"只动自己那一段 + 用完清理"改写）；
  2. 逗号扫描把区间首括号计入深度，导致顶层逗号丢失（本轮修正）。
  两者修完后仍有第三处问题（计数/切片起点或尾段重复求值），需用打印定位。
* 下一轮的具体做法（建议按顺序）：
  a. 在 `listlit2` 里打印 `l2bc/l2bo/l2cnt/l2oc` 与每次 append 后的 `length of LOut`，跑 `print([1, [2, [3, 4]]])`，
     先确认 `l2cnt`（本层逗号数）与 `l2oc`（本层元素数）是否等于期望值；
  b. 若计数正确而值错，问题在切片起点/连接循环（`l2bo + l2pi`）或尾段被重复求值；
  c. 也可改用"整表压栈/恢复"的笨办法（P28 对累加器验证过的 VStack 方案），用更多方块换更少心智负担。
* 本轮未改动主产物；v4.23：Interpreter 8,041 / 合计 9,376，errors=0。
  跑 `print([1, [2, [3, 4]]])` 看计数在哪一步偏；或者改用最笨但稳妥的写法——
  内层调用前把 `LComm`/`LOut` 的内容整体压到 `VStack` 上、返回时再整体恢复（P28 对累加器用过的办法）。
* 本轮未改动主产物；v4.23：Interpreter 8,041 / 合计 9,376，errors=0。
* 本轮未改动主产物（P41 已移除并重建）；v4.23：Interpreter 8,041 / 合计 9,376，errors=0。
  跑 `x = [[1], 2]` 看哪一个收到的边界异常（例如 lo=1 或 hi=8），即可定位到具体那一行。
* 本轮未改动主产物（P40 已移除并重建验证）；v4.23：Interpreter 8,041 / 合计 9,376，errors=0。
  即可确认是「count 少一」还是「pending 没置 1」。修法都会在一两行内。
* 本轮未改动主产物（P39 仅用于调查，已移除）；产物仍为 v4.23：Interpreter 8,041 / 合计 9,376，errors=0。
  即某个调用方按逗号切分 RHS 时深度记账有误（最可能是"跳过首个 `[`"或"只在 `(`/`)` 上计数"这类偏差）。
* 下一轮建议：直接给 `execute` 里处理 `=` 的语句找 RHS 区间的代码（`pair`/`rank` 之上那层）加日志，
  或反编译 `decomp41.txt` 中 `x = [[1], 2]` 语句走过的分支，逐条比对区间端点；
  这类"区间端点"问题用「`x = [[1]]` 通过、`x = [[1], 2]` 失败」这一对最小用例就能快速验证修法。
* P37 未启用（文件留 `_work/v41/p37.txt`）。产物仍为 v4.22：Interpreter 8,039 / 合计 9,374，errors=0；
  nested 8/8、tuple 17/20、gaps 33/39、regress 15/15。
* 下一步（已收窄到可执行的验证步骤）：围绕 `print([[1], 2])` 逐个打断点式排查调用方——
  `printargs`（按顶层逗号切分参数）、`assignlist`（切分左值/右值）、以及 eval 里 `[` 相关的更早分支
  （`methodcall`、`lookup`）。可用 dbgrun 在 `print([[1], 2])` 与 `x = [[1], 2]` 两种写法上对比
  `error`/`pc`，判断是「打印参数切分」还是「赋值路径」先把坏区间交出去。
* P36 未启用（文件留在 _work/v41/p36.txt），P35 同前。产物仍为 v4.22：
  Interpreter 8,039 / 合计 9,374，errors=0；nested 8/8、tuple 17/20、gaps 33/39、regress 15/15。
  错误变成静默错误更糟，因此**P35 已从 assemble.cjs 移除并重建还原**（文件保留在 _work/v41/p35.txt 备查）。
* 下一步方向：找到抛 `SyntaxError: parentheses` 的那个深度循环（decomp41.txt 1327/1351 行两处），
  确认它的扫描起点用的是 `lo` 还是 `lo+1`——若是后者，嵌套时第一个 `]` 会让深度变成 -1；
  另外 `indexget` 目前假设 `Tok[hi]` 就是那个 `]`，链式下标要改成「先找与 `Tok[lo+1]` 配对的 `]`」。
* 本轮产物状态：仍为 v4.22（Interpreter 8,039 / 合计 9,374，errors=0）；
  nested 8/8、tuple 17/20、gaps 33/39、regress 15/15、comp 10/10、b2 13/13、one 10/10、cont 11/12 —— 与轮初一致。
  "解析层先失败" 与 "编码串层失败"。
* 坑二：扫描器的"当前引号"变量初值写成 0，而判据是"不等于空串"，导致每行都被当成在字符串里、
  完全不接行（12 条只剩 3 条过）；初值改 `''` 后 11/12。
* 缺口清单 32/39 → 33/39（A21 关闭）；新增用例集 cont.json（12 条；唯一失败属 A13 嵌套字面量）。

* 新增用例集：one2.json（12 条边界用例）。

* 全量回归 13 个用例集无回退；缺口清单仍 30/39（math 类型问题不在缺口表条目内）。

## v4.34 追加（A13 收尾：三个根因全部修掉，v4.24 出货）

* **根因一（P46，listlit 不可重入）**：`listlit` 的元素边界表 `LComm`、已求值元素表 `LOut` 以及循环变量
  `lpi/lplo/lphi/lacc` 全是**全局**的；元素求值递归进入 `listlit` 时，内层开头 `clear(LComm)/clear(LOut)`
  直接抹掉外层状态（P44 探针：`LITIN lo=4 hi=8 LComm=0` → `LITIN lo=5 hi=5 LComm=1` → `LITOUT LComm=0`）。
  修法：仿 `tuplelit`，在两个递归 `eval` 前后把 `lpi、lplo、LComm、LOut` 压/弹 `VStack`，
  并在 `eval` 返回后**无条件**立即恢复（`ev/evtype/error` 不在保存集合里，返回值不会丢）。
* **P42/P43/P45 为什么全错**：三次都是「先压长度、再逐项压元素」，恢复端用 `n = item last of VStack` 读长度
  —— 栈顶其实是**最后一个元素**；随后 `repeat n: del VStack[last]` 把栈切错，连 `a = [1, 2]` 都失败。
  可用写法只有两种：逐个变量压/弹（`tuplelit`）或以 `FrVBase`/`FrLBase` 记基址（`fpush`/`fpop`）。
* **新坑（必记）**：`control_repeat_until` 是「条件为假时继续」。倒计数循环要写 `REPEATU(NOT(GT(i,0)), ...)`；
  写成 `GT(i,0)` 一次都不执行，症状是整张 VStack 错位、普通列表也一起坏。
* **根因二（P47，P34 转义不可叠加）**：元素文本里 `lsep → ESC+1`，但内层列表的分隔符本来就是 `ESC+1`，
  外层转义不再处理它们 → 外层 `lunesc` 一次把深层分隔符全变成 `lsep`，中层"多出"深层元素：
  `[1, [2, [3, 4]]]` 打成 `[1, [2, [], 3, 4]]`、`len(a[1]) = 4`。用预算好的内层列表 `b = [3,4]; [1,[2,b]]` 同样错，
  证明与递归无关，是编码格式本身的问题。修法：转义符自身也转义（`ESC → ESC+0`），`lunesc` 识别 `ESC+0 → ESC`。
* **根因三（P49，链式下标）**：`indexget` 用 `eval(lo, lo)` 求基址，只支持单记号基址；`a[0][1]` 的基址是 `a[0]`。
  修法：从末尾 `]` 反向扫描找配对 `[`（`xbr`），基址改为 `eval(lo, xbr-1)`，下标/切片区间从 `xbr+1` 起算
  （单层时 `xbr = lo+1`，行为不变）。两个实现坑：扫描必须在**基址 eval 之前**（基址 eval 要用 `xbr`）；
  链式下标的基址求值会再次进入 `indexget` 覆盖 `xbr`，所以要先把 `xbr` 压 `VStack`、基址求值后再弹回。
* 结果：`gaps` 33/39 → **34/39（A13 关闭）**；`nested2` 7/10 → 10/10；`tuple` 17/20 → 20/20；`cont` 11/12 → 12/12；
  其余 15 个套件无回退。产物 v4.24：Interpreter 8,193 / 合计 9,528，errors=0。
* 已知残留：`[[1,2],[3,4]][0][1]`（字面量直接接下标）仍失败——`eval` 的列表字面量分支先命中，
  需要补「`Tok[lo]` 的配对括号就是 `Tok[hi]`」的判断；`one2` 的嵌套单行 `if` 属 P30 限制。
* 流程改进：遇到多轮啃不下的问题时，先把**全部相关代码与失败尝试**整理成 `A13_context.md`
  （含反编译片段、行号、构建/验证命令），再交给协作者模型（`codemirror/gpt-6-astra`）审核——
  本轮它确认了因果链并补了两条被采纳的建议（无条件恢复；只存 4 个状态），节省了大量往返。

## v4.35 追加（A12 字典字面量启用：v4.25 出货）

* 字典补丁 `p33.txt` 是早先写好的（`dictlit`/`dictpair`/`DOut` + `indexget` 的按键查找），A13 修好后本轮启用，
  结果 `gaps` 34/39 → **35/39**（A12 关闭），`dict` 0/10 → **7/10**，其余套件无回退。
* 启用时暴露的两件事：
  1. **分派掉进兜底**：字典分支插在 `eval` 的列表分支之前却没有 `stop this script`，
     调用完 `dictlit` 后继续走完整条分派链，最后落到 `SyntaxError: expression`。补 `STOPTHIS()` 解决。
  2. **共享暂存不可重入**（与 A13 同源）：新增 **P48**，在 `dictpair` 的两次 `eval` 前后存/恢复 `DOut`，
     在 `dictlit` 的两次 `dictpair` 调用前后存/恢复 `dgi/dglo/dged`。
* **P48 的反直觉坑（必记）**：把 `DOut` 的存/恢复也加在 `dictlit` 的 `dictpair` 调用前后，等于把刚追加的键值对撤回，
  症状是「所有字典都是空的」——`Types=["D"]` 但 `Values=[""]`，任何键都 `KeyError`。
  正确边界：`DOut` 只在 `dictpair` 内部两次求值的前后保护。
* **P50 失败记录**：值里带顶层运算符的字典（`{"a": 1 + 2}`、`{"a": -1}`）会报 `SyntaxError: expression`，
  而 `{"a": (1 + 2)}` 正常，说明某处括号深度扫描不认识 `{`/`}`。P50 给 27+27 处扫描统一补上 `{`/`}` 判断后，
  **症状没修好**（说明切断发生在别处），反而让 `tuple` 20→8、`str` 12→10、`b2` 13→11 回退；已撤下，文件留 `p50.txt`。
  下一轮应从「值求值区间是谁算出来的」入手（`dictpair` 的 `dgcp` 与被调用方传入的 `hi`），而不是扫描器。
* 另一处已定位未修：`[[1,2],[3,4]][0][1]` 与 `{"k": 7}["k"]` 这类**字面量直接接下标**仍失败——
  `eval` 的字面量分支先命中；修法方向是「要求 `Tok[lo]` 的配对括号就是 `Tok[hi]`」。
* 产物 v4.25：Interpreter 8,511 / 合计 9,846，errors=0；`rebuild-old.ps1` 的跳过表已加 `P33,P48`（v4.24 与更早）。

## v4.36 追加（A5 try/except + raise：v4.26 出货）

* 实现骨架（P51）：`prepare` 把 `try`/`except` 纳入块头（4 条头链）并把 `except`/`finally` 纳入 `Elses`；
  `execute` 新增 `try`/`except`/`raise` 三条分支；新增 `trycatch` 过程插在**两个驱动循环**（主 RUN 与 calluser 的函数体）
  `execute()` 之后，`error` 非空时从帧栈顶向外匹配异常名并跳进处理块。
* 帧内容：`TryHand`（处理块首行）、`TryEnd`（处理块之后）、`TryName`（异常名）、`TryLoop`（进入时循环深度）、
  `TryC`（进入时 `cdepth`）。`TryC` 很关键：函数体内出错时外层 try 必须等函数返回后再接住，
  否则会把 `pc` 改到处理块、函数体从那一行继续跑。
* **三个坑（本轮全都踩了）**：
  1. `IF()` 只接受 `(cond, ids)`，写成 `IF(c,a,b)` 时第三个参数被静默忽略 —— 匹配/raise/except 三处都白装；用 `IFELSE`。
  2. 给 `prepare` 补块头时按「最外层含 prevhead==def 的 OR」选中，结果包到了 `not(A) or not(链)` 上，
     `try` 反被判成 `IndentationError: unexpected indent`；要选**不含 not** 的那条链。
  3. `find(set, pred)` 回调是 `(block, id)`：把 block 对象传给需要 id 的辅助函数会**静默 0 命中**（P50/P51 各踩一次）。
     另外字面量有 `[1,[10,"def"]]` 与裸 `[10,"def"]` 两种编码，比较操作数两种都要认。
* 异常名匹配用 `startswith(name)` 而不是 `name + ":"`：`ZeroDivisionError` 的消息**没有冒号**（`fail %s("ZeroDivisionError")`）。
* 结果：`gaps` 35/39 → **36/39（A5 关闭）**，新套件 `try.json` 12/12，其余 19 个套件无回退；
  产物 v4.26：Interpreter 8,668 / 合计 10,003，errors=0。
* 未做：`finally`、`try/except/else` 的 `else`、`except (A,B):`、`except ... as e:`。剩余缺口：A4 类、A8 生成器、B5 别名。

## v4.37 追加（A8 生成器 + list()：v4.27 出货）

* 解释器逐行驱动，真协程需要把 pc/局部变量/循环栈留活；本轮用**预先求值**近似（P52）：
  `regdef` 扫函数体发现 `yield` 就把 `FnKind` 标 `G`；`execute` 的 `yield` 分支把值 `lesc` 后追加到 `GYield`；
  `calluser` 跑完函数体后把 `GYield` 拼成 `G` 类值返回；另补 `list()` 内建并让 `len()`/`sum()` 接受 `G`。
  常用形状（`list(gen())`、`sum(gen())`、`range` 里 `yield`、`yield` 字符串/嵌套列表、带参数、多次调用）都精确；
  无限/惰性生成器、`next()`、边算边产生的副作用顺序不精确（已在说明里写明）。
* **坑一**：`execute` 里 `Kind[1]=="I" and Tok[2]=="["` 的下标赋值分支**不看 `pending`**，把 `yield [1, 2]` 抢去当赋值；
  给它的条件补 `pending == 0` 解决（已处理过的语句不该再被别的分支捡走）。
* **坑二**：`lesc()` 会写 `ev`，所以 `list("ab")` 的循环条件不能用 `len(ev)`（每轮都被改成单字符，只跑一次）；先存临时变量。
* **坑三**：`data_replaceitemoflist` 的 INDEX 必须包描述符（`[3,<block>,[4,"0"]]`），塞裸 block id 会被 `check41` 抓成 malformed。
* **坑四**：本构建器的 `operator_gt` 用 `OPERAND1/OPERAND2` 槽位（不是 sb3 的 `NUM1/NUM2`），按后者写会静默 0 命中。
* **既有 bug（未修）**：函数体以 for/while 结尾时循环只跑一次（`pc > fend` 提前退出，`boundary()` 没机会拉回 pc）。
  P53 试过放宽退出条件，结果循环永不结束（`boundary`/`popLoop` 交互需专门研究），已撤回；探针在 `loopfn.json`。
* 结果：`gaps` 36/39 → **37/39（A8 关闭）**，新套件 `gen.json` 11/11，其余 20 个套件无回退；
  产物 v4.27：Interpreter 8,774 / 合计 10,109，errors=0。剩余缺口：A4 类、B5 别名语义。

## v4.38 追加（B5 列表别名：v4.28 出货）

* 值都是字符串，`x = y = [0]` 存两份文本副本，`x[0]=1` 只改 x。真正的对象身份要「id→对象」堆表，改动太大；
  本轮用别名表模拟可观察行为（P54）：`AliasN`（源）/`AliasT`（跟随），`y = x` 与链式赋值记录，
  传播挂在 `assign` 末尾（所有原地修改都以 `assign(name, 新文本, "L")` 收尾），**双向**传播；
  重新绑定（`x = 新值`）先 `aldrop(x)` 清别名，于是 `x = [5]` 后 y 仍指旧列表。
* **坑一：互相传播会乒乓** —— a↔b 双向传播时 assign(a)→assign(b)→assign(a) 无限递归；加 `ald` 深度计数（≤3 层）解决。
* **坑二：循环里缓存的 `found` 失效** —— `lookup` 的下标会被嵌套 assign 覆盖，必须先把值取到临时变量。
* **坑三：被调用方清空循环变量** —— 别名记录循环用 `ali`，而 `alrec`/`aldrop` 也把 `ali` 置 1 → 外层循环永不前进（整段程序超时无输出）；
  调用方改用独立的 `alz`，`assign` 传播里的嵌套调用用 `VStack` 保存循环状态。
* **坑四：`reach(id)` 会顺着 `.next` 走进整个过程** —— 判断「某分支内部有没有 X」只能遍历 `SUBSTACK`。
* 结果：`gaps` 37/39 → **38/39（B5 关闭）**，新套件 `alias.json` 12/12，其余 21 个套件无回退；
  产物 v4.28：Interpreter 8,894 / 合计 10,229，errors=0。**只剩 A4 类（class/方法/self）一条缺口。**
* 别名语义未覆盖：函数参数传递、容器元素别名（`b = a[0]`）、增强赋值触发。

## v4.39 追加（A4 类：v4.29 出货 —— 缺口清单 39/39 全清）

* 对象模型（P55）：`class A:` 遍历类体，把每个 `def` 注册成名为 **`A.m`** 的普通函数（复用 lookup/calluser/fpush），
  全局标志 `curcls` 让它知道「这是方法」从而丢掉形参里的 self；
  实例 = 小整数 id（`InstCls[id]` 存类名，属性在 `IAttrId/IAttrName/IAttrVal/IAttrType` 里），值的类型码是 `O`；
  `A(5)` 在 `callfn` 里构造并调用 `A.__init__`；`obj.m(...)` 由 `methodcall`（守卫放宽到 `O`）转 `callmeth`；
  `self.v` / `self.v = x` 分别是 `eval` 与 `execute` 的新分支。
* **坑一（值类型陷阱）**：`A(5).get()` 的第一个记号后面是 `(`，原来直接落到函数调用分支、把 `5).get(` 当参数区间；
  修法是先在 `eval` 里扫出顶层第一个 `.`，命中就交给新的 `methodcall2`：先把接收者求值进 `mcval/mctype`、置 `mcpre=1`，
  再以 `methodcall(mdot-1, hi)` 复用原方法分派（`mcpre` 通路正是为此存在）。
* **坑二**：`regdef` 的形参扫描读的是全局 `count`，类体里我 `tokenize` 了方法行却没同步 `count` → 形参全丢（`TypeError: too many arguments`）。
* **坑三**：self 必须用 `assign("self", id, "O")` 绑定，裸 `setV` 不会更新解释器的 `Types` 表。
* **坑四（scratch-vm 语义）**：`0 == ""` 在 scratch-vm 里是 **false**（空白串走字符串比较），
  所以新加的字符串标志 `curcls` 用 `newVar(...,0)` 初始化会「真」——表现为**所有带参函数都被当成方法、丢掉第一个形参**。
  字符串标志一律 `newVar(name, "")`（与早期 P32 的 `xgs` 同一个坑）。
* **坑五**：`return [1, 2]` 被 `Kind[1]=="I" and Tok[2]=="["` 的下标赋值分支抢走（它不看 `pending`，而 return 分支在它后面）；
  给该分支补 `NOT(Tok[1] in {return,yield,raise,print})`。
* **测试台提醒**：`run.mjs` 在同一个 VM 里顺序跑用例，偶发出现「CPython 期望值串到别的用例」的假失败
  （例如把 `2+5=7` 当作某个类用例的期望）；拿不准时用**单用例套件**复跑一次确认。
* 结果：`gaps` 38/39 → **39/39 全部关闭**；新套件 `cls.json` 12/12；其余 22 个套件无回退；
  产物 v4.29：Interpreter 9,213 / 合计 10,548，errors=0。
* 未支持：继承、类属性、`__repr__`、绑定方法值、`a[0].v`、实例参与运算符。

## v4.40 追加（DEMO + HELP 更新：v4.30 出货）

* DEMO 从 9 条换成 **13 条**按能力组织的样例（函数/递归/字符串/列表+推导/元组/字典/异常/类/生成器/现代表达式/math/位运算/input），
  样例作为数据放在 `_work/v41/demos.json`（+ `demos_input.json`），由 P56 读入并重建 Controller 的 `example` 过程；
  **12 条非交互样例与 CPython 3.14 逐字一致**（`demos.json` 可直接 `run.mjs` 复跑）。
* HELP 从 24 行换成 **37 行**（`help.json`，BASICS/FUNCTIONS/DATA/MORE 分组），并**补上自动换行**：
  输出面板本来就是 30 列硬换行（Interpreter 的 `log`），而帮助屏原来是逐行 `append` + 渲染器 `text(..., 30, 0)` 截断；
  现在走新增的 Controller 过程 `hwrap %s`（同 30 字符切分）。构建期断言帮助每行 ≤30 字符（当前最长 29）。
  已知未改：变量面板仍是截断（>30 字符的值显示不全）。
* **Controller 目标的构建注意**：`head.txt` 的构造辅助与 prune/relink 全部写死 Interpreter，
  所以 P56 自带按目标名传参的构造器，并在末尾做 Controller 自己的 prune+relink（本次清 145 块）；
  另外**一个块只能有一个 parent**，同一处复用 `argument_reporter` 会被 `check41` 判成 `non-top block without parent`。
* **P57 修两个样例暴露的缺口**：
  1. `Point(3, 4)` 多参数类构造报 NameError——`eval` 的 callable 判定不认类名，而只有 narg==0 的调用会绕过它；
     现在调用分支前做一次 `ClsName` 精确成员检查；
  2. `~x` 此前完全不支持（一元集合只有 `- + not`），现在 `eval` 认识 `~`、`unary` 实现 `~n = -n - 1`。
* 产物 v4.30：Interpreter 9,244 / Controller 1,214 / 合计 10,657，errors=0；全量 23 套件无回退。

## v4.41 追加（变量面板真实值 + 函数体内单步：v4.31 出货）

* **P58 面板显示真实值**：面板行原来是 `Names[i] + " = " + Values[i]`，而 `Values` 存的是内部编码
  （列表 = `\x1f<类型字母><元素文本>`…），渲染器逐字符查 costume，`\x1f` 没有 costume → 整行乱码。
  修法：Stage 上新增与 `Names/Values/Types` 并行的列表 **`Show`**，`assign` 里用 `strval` 生成显示文本
  （**与 `print` 同一个格式化器**），`del` 同步删除，函数帧进出时用新列表 `FSV` 与 `Values` 一样保存/恢复；
  面板读 `Show`，行超 30 列时取 27 字符 + `...`（原来是静默截断）。
  注意点：`strval` 会改写 `ev/evtype`，在 `assign` 里调用前后要存 `dve/dvt` 再还原。
* **P59 字典**：`strval` 缺 D 分支，`print(d)` 打内部编码 → 新增 `dictfmt %s`（key/value 成对 `listitem`+`reprval`）。
  同时发现 `dictpair` 把 key/value **不转义**就直接拼进 `DOut`（列表元素是走 `lesc` 的），
  于是 `{'a': [1, 2]}` 存进去就坏了、读回是 `[]`；现在两处 append 前各插一次 `lesc`（`dgkey`/`dga` → `dgesc`）。
* **P60 推导式作用域**：`complist` 用 `assign` 绑循环变量，会改写同名变量并留下新变量；
  现在循环前 `lookup` 存旧绑定、循环后放回，原本不存在的名字就把四张表的行一起删掉。
* **P61 函数体内单步**：`calluser` 的函数体循环原来在 **warp** 过程里，不更新 `selected/page/steps`、不看 STEP 闸门。
  warp 线程会把 yield 全吃掉（`Sequencer.WARP_TIME`），`wait_until` 会在**一帧内死转**，所以闸门不能直接照抄；
  改法是把这个过程改成 **warp=false**（实测 `fib(16)` 4.77s→4.89s、VM 帧数都是 14 步，无代价），
  再在每行执行前插入与主 RUN 循环相同的一套：`selected=pc` / `page` 跟随 / `dirty` / STEP 闸门 → `status` 提示 /
  `steps+=1` + 全局步数上限 / SLOW 模式 `wait 0`；并给函数体循环的 until 条件加上 `running==0`（STOP 立即退出）。
  已知小瑕疵：`fpush/fpop` 的寄存器快照包含 `steps`，函数返回时 Steps 会跳回调用前的值。
* **工具**：`paneltest.mjs`（驱动 TextRenderer 的 draw 后读 `vtxt`，验证面板文本与截断）、
  `steptrace.mjs`（模拟点 STEP，打印每次暂停的 pc/选中行/变量面板）、`frames.mjs`（数 VM 帧数，比较 warp 改动代价）。
* **P62 `self` 作用域**：`callfn` 的 `__init__` 与 `callmeth` 都把用户变量 `self` 绑在调用者帧，调用结束后 "恢复旧值"——
  而旧值是隐藏寄存器的初值 0，被当成对象写回，于是面板永久多一行 `self = 0`。现在绑定前用 `lookup` 存下原有的值+类型，
  调用后放回，原本没有就整行删掉（与 P60 同意思路）。注意 `insertBeforeStmt(id, restoreSelf())` 要写成 `[restoreSelf()]`：
  传字符串会被 `ids.slice()` 当成字符数组。
* **P59 追加**：`strval` 的兜底再包两层，O → `<Point object>`（`InstCls[vv]`）、F → `<function #lambda1>`（`FnName[vv]`）。
* **P63/P64 已撤销**：OUT 按钮（深度上限 `sodep`、底图 SVG 按钮、点击分区）与顶栏活动指示（`live`/`depth` 计数器 + TextRenderer 绘制）
  都按用户要求删除；底图恢复原资产，`sodep`/`live`/`depth` 等变量不再存在。
* **P66 非 warp 调用链（v4.31）**：本 VM 里 **warp 是继承的**——`Thread.pushStack` 复制父帧 `warpMode`，
  被调过程自己的 `warp=false` 只能置 true、不能清 false，所以用户函数体因祖先（`execute`/`eval`…）而成了 warp；
  warp 线程每帧跑满 `Sequencer.WARP_TIME`(500ms)，函数体里的 `wait_until` 于是"每帧空转 500ms"，
  一步要等半秒才动 → 用户误以为要点很多次。P66 把**调用链 + 表达式求值链** 27 个过程改成非 warp（501ms → 13–51ms）。
  但 `print(f(x))` 这条路径漏了（见 P67）。
* **P67 补全闭包（v4.32）**：`_work/v41/callgraph.cjs` 从积木构造调用图，算出所有能到达 `calluser` 的过程；
  v4.31 时只剩 3 个还是 warp：`printargs`（print）、`minmax`、`regdef`（def 默认参数）。
  补上后 **demo1 函数内一步 501ms → 45ms**，并在**构建期**跑同一套闭包检查（还有 warp 祖先就直接报错），防止以后退化。
* **代价（如实记）**：调用链非 warp 后引擎编译出的代码在每次调用处让出，压力用例 `fib(16)`（6388 解释器步）帧数
  14 → **799**（GUI 约 7s → 26s，CPU 不变）；demo1/demo4 13/14 帧、demo2 29 帧，日常小程序不受影响。
  想要"重计算快、单步慢半秒"就去掉 P66+P67（`V41_SKIP=P66,P67` 重建）。
* **版本规矩（用户要求，v4.32 起生效）**：每出货一版**版本号 +1**；**已出货的补丁不再改动，只追加新补丁**；
  版本→补丁：v4.31 = P58–P62 + P65 + P66，v4.32 = +P67（`rebuild-old.ps1` 顶部注释同步维护）。
* **可复现性的口径（更正）**：`compare.cjs` 比的是**结构**——块数、每个 opcode 的数量、过程名、变量/列表名；
  **不是字节**（构造器给新块 id 带随机后缀，同一份补丁重建的字节必然不同）。
  此前 README/说明里写的"逐字节一致"是错的，已全部改为"结构 MATCH"。语义等价另外用 battery 抽验。
* **P68 RUN=warp / STEP=非 warp（v4.33）**：warp 只向下继承、只有过程自己能打开，所以给"进入用户调用"的那两层做 warp 副本
  （`callfnW`/`callmethW`，共 361 块），分支写在 `callfn`/`callmeth` 内部（原体挪进 else，调用点不用复制参数）。
  实测：RUN `fib(16)` 799 → **15 帧**、RUN `a=fib(16)` 776 → **14 帧**、demo2 29 → 11 帧；STEP 函数内一步仍是 **51ms**。
  边界：与"快跑期间进入的调用"里第一次暂停仍需 500ms（之后恢复）。维护约定：以后改 `callfn`/`callmeth` 的补丁必须放在 P68 之前，
  或在 P68 里补相应克隆步骤。
* 产物：v4.31 = 10,855 块 / v4.32 = 10,855 块（内容同 v4.31+P67）/ **v4.33 = 11,240 块**（+P68），全部 errors=0；
  battery 23 套件无回退（`gaps` 39/39），`rebuild-old.ps1` **v4.10…v4.33 共 24 个版本全 MATCH**。

## v4.42 追加（断点调试：v4.34 出货 —— **已按用户要求回退，当前出货版本仍为 v4.33**）

> 状态：v4.34 / P69 **已回退**（`assemble.cjs` 不再拼入 `p69.txt`，默认产物回到 v4.33）。
> 产物、说明、测试都留在 `_work/v41/reverted/`，重新启用步骤见该目录 `README.md`。
> 回退后用当前源码重建与 `MiniPy_v4.33.sb3` 结构 MATCH（11,240 块）。以下保留原始记录。

* **用户要求**：行号上**取消双击改行**、改成**单击设/取消断点**；跑到断点**停住**并显示 **CONTINUE 按钮**（平时不显示），
  按下继续并隐藏按钮。
* **P69 数据**：Stage 新列表 **`Bps`**（与 `Code` 一一对应的 0/1 标志）+ 变量 `bpOn`（有无断点）、`bwait`（是否停在断点）；
  Interpreter 新局部列表 `NewBps`/`New2B`，变量 `bph`/`xlbp`/`xgbp`；Controller 新变量 `bpl`/`bpi`/`bplast`（时点复用原来的 `lastclick`）。
* **P69 闸门**：顶层 RUN 循环与 `calluser` 体循环原有的 STEP 闸门
  （`if mode==1 → status → wait_until(ticket>0 or mode==0 or running==0) → ticket-=1`）
  改成 **`if mode==1 或 bph==1`**，`status` 用 IFELSE 二选一（`BP hit line N` / `Paused / STEP to advance`），
  并把等待条件收成 **`ticket>0 或 running==0`**（去掉 `mode==0`：RUN 键继续时本来就会 `ticket+=1`）。
  * **坑 1**：两个循环里"状态文字 + 等待"这一小段是**唯一的锚点**（用 `Paused / STEP to advance` 文本定位 `control_if`）。
  * **坑 2**：`startRun` 起跑会给 `ticket=1`，所以自由跑撞上断点时必须先 `ticket=0`，否则"第一次停"被这个 token 吃掉。
  * **坑 3（构建期陷阱）**：head.txt 的 `replaceStmt` **不会清掉旧块的 `next`**，于是随后 `insertBeforeStmt(waitId, …)`
    的 `predecessorOf` 会找到那个已经脱离的旧块，新积木挂到孤儿子树上、被 `pruneUnreachable` 删掉（表现：状态文字变了但闸门不生效）。
    正解是拿 `replaceStmt` 的返回值再 `spliceAfter(statusIf, chain([...]))`。
* **P69 warp 取舍**：warp 帧里的 `wait_until` 每帧空转 500ms，所以把 P68 的分支条件从 `mode==0` 改成
  **`mode==0 且 bpOn==0`**——有断点就整跑走逐行路径。实测 `fib(16)`：无断点 16 帧、有断点 767 帧，
  解释器自身 CPU 不变（都要 ~5.2s 墙钟），但 GUI 每帧还要重画，所以有断点时会明显慢（与 v4.32 的 799 帧同因）。
* **P69 行号同步**：`expandlines`（拆行，标志给第一行、续行 0）、`joinlines`（合并取或）、Controller 的
  `newline`（`insert` 到 Bps）、`backspace`（并入上一行时或过去再删）、`loadCode`/`example`/NEW（清空）、
  `backup`/`undo`（新快照列表 `SnapB`）、RUN 起跑（长度对齐 + `bpOn` 重算）。
  **写补丁的通用坑**：`data_addtolist` 里"变量"可能是**内联** `[12, name, id]` 而不是块 id（`inputs.ITEM[1]` 是数组），
  按 opcode 找 append 分支时要两种都认。
* **UI**：Controller `click` 第一段是 CONTINUE 按钮命中（`bwait==1` + 顶栏中部坐标），随后是 STOP 分支里补 `bwait=0`；
  行号带 = 原来的双击区（`x∈(-236,-202)`），带宽 `0.35s` 同位置防抖（`bplast`+`lastclick`）。
  TextRenderer `draw` 里新增：断点行**行号底下的淡红色条**（`pen 11` 宽，`x -225→-211`，y 与选中条同高），
  以及 `bwait==1` 时在顶栏中部画 **CONTINUE**（填充 `#e8f5e8`/`pen 30`、边框 `#2f7d32`、文字 `x=-55,y=151`）。
  pen 参数（颜色/粗细分枝键名、goto 的 X/Y 键名）是从既有积木上**抄下来的**，不硬编码键名。
* **验证**：`_work/v41/bptest.mjs`（真鼠标 `ioDevices.mouse`）**47/47**；battery 23 套件与 v4.33 逐条一致；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`rebuild-old.ps1` **v4.10…v4.34 共 25 版全 MATCH**；
  `check41` 增加"next/parent 必须是字符串或 null"检查（这次的 `spliceAfter` 手误就是被它抓出来的）。
* **顺带测到的既有缺陷（与断点无关，本轮未修）**：生成器体内有循环而**没有结尾 `return`** 时只 yield 第一项
  （`def squares(n): for i in range(n): yield i*i` → `list(squares(3))` 得 `[0]`，补一句 `return` 就正常）。
  v4.33 同结果。系统性的支持范围见 `_work/v41/支持范围与限制.md`。
* **测试台注意事项**：`run.mjs` 用共享的 `_work/v41/_tmp.py` 跑 CPython 对照，**两个 run.mjs 同时跑会互相踩**出假失败
  （本轮踩过：`alias/nested2/comp`/demos 假 FAIL，串行重跑全部恢复）。
  另外 Controller 用 `wait 0.02` 轮询鼠标，而测试台 `runtime._step()` 比墙钟快几个数量级，
  模拟点击必须真的"按住"几十毫秒，否则点不到（不是产品 bug）。
* 产物：**v4.34 = 11,459 块**（Interpreter 9,901 / Controller 1,306 / TextRenderer 228 / Stage 24），errors=0。

## v4.43 追加（v4.34 功能轮：P70–P78，出货 v4.34）

> 版本号说明：v4.34 这个号先前被 P69 断点调试用过，但那版**从未出货**（已回退，留档 `_work/v41/reverted/`），
> 缺口清单 `_work/cmp47/v4_缺失清单.md` 第 3 节也把"下一版最小集"记作 **v4.34**，所以这一轮继续用 v4.34。
> 产物：`MiniPy_v4.34.sb3`，Interpreter 10,760 / 合计 **12,189** 块，check41 errors=0。

* 九个补丁 P70–P78 一次到位（清单第 3 节的十条最小集里，E42 字典方法并入下一轮）：
  P70 位运算增强赋值（E5/E6）、P71 数字字面量 `1e3/0x/0b/0o`（E1–E3）、P72 `\n`/`\t`（E20/E21）、
  P73 分号多语句（E4）、P74 列表 `+`/`*`（E9/E10）、P75 字符串方法 index/title/zfill/isdigit/isalpha（E13–E15）、
  P76 列表方法返回 None + `type()` 显示（G1/G6）、P77 `%` 宽度/精度 + f-string 格式规格（E17–E19/G4）、
  P78 `min/max(可迭代)` + `int(x, base)`（E22/E25）。套件 `gaps433.json`：**0/63 → 21/63**。
* **新补丁的位置约定（重要）**：P68 会克隆 `callfn`/`callmeth` 的当时过程体，所以**改动这两个过程的补丁必须排在 `p68.txt` 之前**；
  P70–P78 因此插在 `p67.txt` 与 `p68.txt` 之间。之后再有改 callfn/callmeth 的补丁，同样放这里。
* **坑（本轮最大的一条）：argument reporter 不能复用。** P71 里写了 `const src = argOf('source')` 再到处用
  （19 处引用同一个 block id，`shadow:true`），结果 `contains(set, letter ep of source)` 恒为假，
  `print(0x10)` 在数字扫描里原地死循环（每轮追加一个空记号）。原版 tokenize 是**每处一个 reporter、`shadow:false`**。
  排查手法：在 `tokenize` 外层循环插"400 轮就 fail 并打印 ep/ec"的守卫 + 在过程开头用同样写法探针
  （`p98probe.txt`/`p99dbg.txt` 两个临时补丁，已从 `assemble.cjs` 摘掉，文件留着当模板）。
  **结论：新补丁里不要 `const x = argOf(...)` 复用；`lenOf/find` 之类每次现造。**
* **`IF(cond, a, b)` 是两参数**（`const IF = (c, ids) =>`），第三个参数会被静默忽略——P71 的 `est` 分支就这么丢过 else。
  要二分就用 `IFELSE`。
* **性能**：`numlit` 一开始对每个数字字面量都调 `scase`（95 字符表逐字符比较），fib(16) 实测慢约 2 倍；
  改成"指数扫描直接找 e/E（不再 scase）+ 长度 > 2 才进 numlit"后，`interpSteps` 6388 与 v4.33 完全一致。
  `frames.mjs` 的帧数在同一台机器上有 ±8 帧抖动，比较版本要用 `interpSteps`。
* **验证**：`gaps433` 21/63（E 18/55、F 0/2、G 3/6）；battery 23 套件与 v4.33 逐条一致（仍是 one2 1、math 3、dict 3 三组既有失败）；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`stepcost` demo1 13–15 ms/步；
  `rebuild-old.ps1` **v4.10…v4.34 共 25 版全 MATCH**（`rebuild-old.ps1` 的 skip 表现在把 `P70..P78` 也前缀进所有旧版本）。
* 新增工具：`_work/v41/dbgstate.mjs`（按 `run.mjs` 的同一套初始化跑一个程序并 dump 解释器变量/列表；
  **末尾必须 `process.exit(0)`**，否则 scratch-vm 的定时器让 node 永不退出，看起来像"挂死"）。

## v4.44 追加（v4.35 功能轮：P79–P82，出货 v4.35）

* 四个补丁：P79 字典可写（`d[k]=v` / `del d[k]`）、P80 `len(d)`·`'k' in d`·`for k in d`、
  P81 切片步长（`s[::2]` / `s[::-1]`）、P82 `str.format`。套件 `gaps433.json`：**21/63 → 28/63**。
  产物 `MiniPy_v4.35.sb3`：Interpreter 11,253 / 合计 **12,682** 块，check41 errors=0。
* **P79 的位置坑**：字典分支必须插在 `if not(xb=="L"): fail "…needs a list"` **之前**，而不是插在
  `eval(键)` 之前——类型守卫先执行，插晚了分支永远不生效。挑锚点的规则是"这条路径上第一个会挡住我的判断"。
* **P80 的复用思路**：不新写遍历，而是加一个 `dictkeys %s`（把键记录抽出来重新转义成 L 编码），
  于是 `len` 用 `listlen/2`、`in` 和 `for` 各在 L/T 分支前插一句就完事。
* **P81 的坑**：① 两次冒号测试在同一轮循环里跑，必须写成 if/else——另加一条语句会把第一个冒号记两遍；
  ② `operator_and`/`operator_or` 的操作数是布尔描述符 `[2, id]`，`varName(desc)` 会得到 `null`，
  要先 `blk(desc)` 解成块；③ 又踩了一次 argument reporter 复用（`const hi = argOf('hi')` 用十几次），
  `s[4:1:-1]` 得空串，改成 thunk 才对。
* **P82 的位置坑**：`methodcall` 的 S 段只预求值前两个实参（三个参数报 `SyntaxError: expression`），
  所以 `format` 挂在 `if (xb=="O")` 实例分派之前，自己扫全部实参；别忘了分支末尾 `stop this script`，
  否则会继续走 S 段报 "str has no method format"。
* **验证**：`gaps433` 28/63（E 25/55、F 0/2、G 3/6）；battery 23 套件与 v4.34 逐条一致；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`frames` fib16 `interpSteps` 6388（与 v4.33/v4.34 相同）；
  `rebuild-old.ps1` **v4.10…v4.35 共 26 版全 MATCH**。
* **版本还原**：`build41.js` 的默认产物现在是 v4.35；还原 v4.34 用
  `$env:V41_SKIP='P79,P80,P81,P82'; node _work/v41/build41.js`（实测回到 12,189 块）。
* 新增临时用例：`td.json` 字典 8 条、`ts.json` 切片 10 条、`tf.json` format 9 条。

## v4.45 追加（v4.36 功能轮：P83–P86，出货 v4.36）

* 四个补丁：P83 裸逗号成元组（`x = 1, 2` / `return 1, 2`）、P84 从容器解包
  （`a, b = (1, 2)` / `q, r = divmod(9, 4)`，也支持字符串）、P85 函数当值
  （`g = f`、`(lambda x: x * 2)(4)`）、P86 **修掉一个既存 bug**：实参里的用户调用会串台。
  套件 `gaps433.json`：**28/63 → 34/63**。产物 `MiniPy_v4.36.sb3`：Interpreter 11,399 / 合计 **12,828** 块。
* **P86（重要，v4.35 及更早就有的 bug）**：`calluser` 先算 `fi`、压帧，**再**求值实参；实参里的用户调用
  把 `fi` 覆盖成自己的，而它的 `fpop` 只恢复"它压帧时"的值，于是外层拿着别人的
  `FnPar/FnStart/FnLine` 继续跑。症状：`def f(x): return x+1` + `def h(): return 5` + `print(f(h()))`
  → `TypeError: too many arguments`；嵌套 lambda → 跑成内层的函数体。递归（`fib`）看不出来，因为
  递归调用的 `fi` 恰好还是同一个函数。修法：把 `fi` 压进 `VStack`（`listfmt`/`tuplelit`/`dictpair`
  用的同一套嵌套暂存机制），实参跑完在读 `fpn` 之前弹回来。
* **P85 的教训**：在 `eval` 里新增一条求值路径后，如果走 `stop this script`，别忘了补
  `fnlimit += -1`（`eval` 结尾那条不会执行）。另外"`( … ) ( 实参 )`"的配对条件必须写
  `cpe + 1 < hi`，否则 `(lambda x: x*2)` 自己也会被当成调用 → 无限递归 → `LimitError: expression depth`。
* **找块的两个小坑**：① `item lo of Tok` 里的下标在**块内的 `data_itemoflist`** 上，
  不能拿 `argName(OPERAND2)` 直接判；② `if (x==…)` 这种守卫可能是 `control_if_else`，
  也可能在 P75 之后被包成 `operator_and`，谓词要放宽（P81/P80 都踩过）。
* **验证**：`gaps433` 34/63（E 31/55、F 0/2、G 3/6）；battery 23 套件与 v4.35 逐条一致；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`frames` fib16 `interpSteps` 6388；
  `stepcost` demo1 14 ms/步；`rebuild-old.ps1` **v4.10…v4.36 共 27 版全 MATCH**。
* 新增临时用例：`tv.json` 10 条、`tu.json` 10 条、`tfv.json` 10 条、`tn.json` 3 条。

## v4.46 追加（v4.37 功能轮：P87–P89，出货 v4.37）

* 三个补丁：P87 `import math as m` + `math.pi`/`math.e`、P88 `try/else`、
  P89 `for a, b in <容器>`。套件 `gaps433.json`：**34/63 → 38/63**。
  产物 `MiniPy_v4.37.sb3`：Interpreter 11,587 / 合计 **13,016** 块，check41 errors=0。
* **`replaceStmt` 的坑（这次踩实了）**：它只接受**一条**语句，传一条链进去会把链里第一条的
  `next` 覆盖成旧语句的下一条，剩下的语句全变不可达。P88 初版就是这么把 `dest` 的赋值弄丢的：
  `try: x = 2 / except: print('bad')` 在 v4.36 上正常，改完反而印出 `bad`。
  正解是 `replaceStmt(old, stmts[0])` + `spliceAfter(stmts[0], chain(stmts.slice(1)))`。
* **哨兵不要用 `contains`**：P89 初版靠"LoopName 里有逗号"区分单/多目标，普通循环
  （`LoopName = "i"`）也被判成多目标，第二次迭代就 `not enough values to unpack`。
  改用 **`LoopStep == 0`** 当标记（列表分支只看 `LoopValue + 1`，从不读 `LoopStep`；真循环也没有 0 步长）。
* **`argOf` vs `VAR`**：`argOf(name)` 造的是**过程参数**报告器。`forloop` 没有参数、`count` 是全局变量，
  写成 `argOf('count')` 会让条件恒假（P89 初版就卡在这儿）。
* **`boundary` 里 `ln` 会被后续语句改掉**：P89 先在 `listlen` 之后取 `ln`、再用它当 `LoopStop`，
  实测拿到的是 2（应为 1）。改成新变量 `flen`，并且**先 `pushLoop` 再绑定首元素**（调用参数在进入过程前求值）。
* **`item lo of Tok` 的下标是块内的 `data_itemoflist`**，不能拿 `argName(OPERAND)` 直接判（P81/P87 都踩过）。
* **验证**：`gaps433` 38/63（E 35/55、F 0/2、G 3/6）；battery 23 套件与 v4.36 逐条一致（`try` 仍 12/12）；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`frames` fib16 `interpSteps` 6388；
  `stepcost` demo1 15 ms/步；`rebuild-old.ps1` **v4.10…v4.37 共 28 版全 MATCH**。
* 新增临时用例：`tm.json` 8 条、`tt.json` 7 条、`tp.json` 10 条、`tx.json` 5 条；
  新工具 `dbgstate2.mjs`（同一个 VM 上连跑多个程序，用来复现"上一个用例污染下一个"）。

## v4.47 追加（v4.38 功能轮：P90–P91，出货 v4.38）

* 两个补丁：P90 类属性 `class C: n = 1` + `__str__`、P91 字典方法 `keys/values/items/get/pop`。
  套件 `gaps433.json`：**38/63 → 41/63**。产物 `MiniPy_v4.38.sb3`：Interpreter 11,949 / 合计 **13,378** 块。
* **`__str__` 必须挂在 `printargs`，不能挂在 `strval`**：`assign` 每绑一个值都会调 `strval` 刷新变量面板，
  而 `callmeth` 内部会 `assign("self", …)` → `strval(O)` → `__str__` → `callmeth` → `assign` …**无限递归**
  （`print(C())` 卡到 20 秒超时）。挂在 `printargs` 的实参循环上即可。
* **`data_listcontainsitem` 大小写不敏感**：用它判"根是不是类名"时实例 `c` 会命中类 `C`，
  `c.v` 于是走进类属性分支报 AttributeError。改用 `compareText` 逐项比较（`lookup` 也是这么做的）。
* **`replaceStmt` 只换一条语句**（v4.37 记过，本轮再用）：要"前置几步 + 保留原语句"时，
  正解是 `insertBeforeStmt(orig, [前置…])` 再 `replaceStmt(orig, IF(cond, [orig]))`——orig 在子栈里
  `next` 本来就是 null，不会踩到链尾覆盖。
* **`IFELSE` 两分支独立**：P90 的"实例查不到就查类"曾把赋值写在 `if (cX==0)` 的 then 分支里，
  而原树那句 `else: ev = IAttrVal[cX]` 属于同一个 if/else，then 里永远轮不到 → 必须在自己分支里补 `ev/evtype`。
* **验证**：`gaps433` 41/63（E 38/55、F 0/2、G 3/6）；battery 23 套件与 v4.37 逐条一致（`cls` 12/12）；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`check41` 13,378 块 errors=0；
  `frames` fib16 `interpSteps` 6388；`rebuild-old.ps1` **v4.10…v4.38 共 29 版全 MATCH**。
* 新增临时用例：`tcl.json` 10 条（类）、`tk.json` 10 条（字典方法）。已知边界：`print(C())` 仍印
  `<C object>`（CPython 带地址）；`d.pop(k)` 目前把整个字典删空（tk.json k7 未过）；`d.nope()` 报错文案不同。

## v4.48 追加（v4.39 功能轮：P93/P92/P94，出货 v4.39）

* 三个补丁：P93 括号深度扫描认识 `{`/`}`、P92 后缀链（`.属性`/`[下标]` 的根可以是任意表达式）、
  P94 幂精度（整数与 ±0.5 指数精确）。套件 `gaps433.json`：**41/63 → 46/63**（E 41/55、F 0/2、G 5/6）。
  产物 `MiniPy_v4.39.sb3`：Interpreter 12,268 / 合计 **13,697** 块，`check41` errors=0。
* **装配列表里漏文件会静默"撤下"一个补丁**：排查"`print({'a':1,'b':2})` 为什么还坏"时发现 `p50.txt`
  （当年给 27+27 处扫描补 `{`/`}`、因为回退 tuple/str/b2 被撤下的那一版）**根本没进 `assemble.cjs`**
  （列表是 `p49 → p51`）。真正的原因是 P50 的判据太宽：`x=='(' or x=='['` 这个形状里既有"深度计数"，
  也有"这是不是开括号"的语义判断，后者被包上 `{` 就变了意思。P93 换成严格判据后零回退。
* **P93 的严格判据**（`auditscan3.cjs` 就是按它扫的候选）：条件树里只比较**同一个表达式**（把块 id
  归一化成序号后再比结构，因为原工程每个比较各存一个块）与同一族字符；体内**只有一条** `change <var> by ±1`；
  表达式是 `Tok[...]` 或纯变量——`or` 的两个操作数在 scratch-vm 里都会被求值，带调用的表达式会跑两遍。
  命中 37 个开括号 + 33 个闭括号扫描。
* **新插的扫描会被后跑的"扫描修补补丁"误伤**：P92 的 `[`/`]` 配对循环里 `if Tok[pxj]==']' → pxd -= 1`
  长得就像深度计数，被后跑的 P93 包成 `… or Tok[pxj]=='}'`，`{`/`}` 把 `pxd` 带成负数、`pxbr` 找不到，
  E11 反而坏掉。修法：**把 P93 排到 P92 前面**（`p91 → p93 → p92 → p94 → p68`），让扫描修补只看原始代码。
  这也是 `assemble.cjs` 顺序第一次因为"补丁之间的相互影响"而调整。
* **`indexget` 早就是"容器可以是任意表达式"**：它先反向扫描找出与末尾 `]` 配对的 `[`，再 `eval(lo, xbr-1)`
  求容器（所以 `print(([1, 2])[0])` 在 v4.38 就能跑）。E11 因此只需要放宽入口，不必重写取下标逻辑；
  判据要带上"配对的 `[` 不是第一个 token"，否则纯列表字面量会被抢走（`[1,2][0]` 曾报 `parentheses`）。
* **`eval` 提前退出要自己补 `fnlimit -1`**：进门 `+1`、末尾 `-1`，任何 `stop this script` 都会漏掉末尾那次
  （`fnlimit > 64` 报 `LimitError: expression depth`）。P90/P92 的分支都显式补了。
* **验证**：battery 23 套件与 v4.38 逐条一致、`dict` 反而由 7 升到 9（`dict literal inline`、`dict value
  expression` 转绿）；6 个 `featprobe`（259 条）211/259，失败项仍是未实现功能（基线已按 v4.39 重记）；
  `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；`check41` 13,697 块 errors=0；
  `frames` fib16 `interpSteps` 6388（无退化）；`rebuild-old.ps1` **v4.10…v4.39 共 30 版全 MATCH**。
* 新增临时用例：`t92.json`（属性链 15）、`t92b.json`（内联容器 12）、`t92c.json`（浮点幂 15）、
  `t92d.json`（括号容器下标 10）、`t92e.json`（方法结果后缀 5）、`t92f.json`（窄化定位 14）、
  `t92g.json`（增广赋值 8）。**下一轮首要候选**：`c.v += 1` / `self.v -= 1` / `a[0] += 5` 这类
  **增广赋值到属性或下标**（现在报 `SyntaxError: expression` / `expected = after ]`，`featprobe` 卡 3 条）；
  其次 `'hello'.split()` 无参应按空白切，以及浮点 repr 的 `1e+16`/`1e-05`/`-0.0`。

## v4.49 追加（v4.40 功能轮：P95–P97，出货 v4.40）

* 三个补丁：P95 属性/下标的增广赋值、P96 函数体末尾的循环真的迭代（顺带修好 F2）、P97 `for v in <生成器>`（E55）。
  套件 `gaps433.json`：**46/63 → 48/63**（E 42/55、F 1/2、G 5/6），`featprobe` 211/259 → **219/259**。
  产物 `MiniPy_v4.40.sb3`：Interpreter 12,455 / 合计 **13,884** 块，`check41` errors=0。
* **一个 Scratch 块只能有一个父节点：共享 reporter 会静默算错**。`orChain(tokAt(4), [...])` 把同一个
  `Tok[4]` 块塞进 12 个比较，整条条件恒假、分支根本不进（sb3 能存、VM 不报错，只是**结果不对**）。
  改成传工厂函数、每次新建 reporter 才行。这是本轮最难查的一条。
* **`atom` 的早退分支不能覆盖 `N`/`S`**：P95 的"带类型的字面量 token"分支第一版把 `N`、`S` 也早退了，
  P71 的数字字面量改写被跳过 → `print(1e3)` 开始原样打印 `1e3`。**23 套 battery 完全没发现**
  （普通数字走 `N` 路径结果恰好一样），靠 `gaps433` 的 E1–E3 抓到。早退只覆盖 tokenizer 不会产生的 `L/T/D/B`。
* **函数的行驱动与顶层行驱动必须成对改**：顶层在 `(pc > len(Code)) and (len(LoopHead) == 0)` 才结束，
  正是"还有循环就再跑一步"让 `boundary()` 能在循环体最后一行之后把 pc 拉回循环体；`calluser` 只看
  `pc > fend`，于是**循环体正好是函数最后一行时循环只跑一次**（`def f(): for i in range(3): print(i)`
  只打印 `0`；生成器只 yield 一项）。修法两处：退出判据改成 `(pc > fend) 且 本帧自己的循环都关掉`
  （`FrLoop` 存进入本帧时的循环栈深度），步进守卫从 `pc <= len(Code)` 收紧成 `pc <= fend`——
  只改前者会让函数在循环结束后执行**调用者的下一行**（实测 `f()` 自递归到 expression depth 上限）。
* **AND 要加在正确的项上**：把"没有未关的循环"与**整条**退出析取式相 AND，会让 `return` 也被循环挡住，
  `func` 套件的 `[F] return inside loop` 立刻回退。正确形态是
  `((pc > fend) and 无未关循环) or 出错 or retflag or 没在运行`。
* **同形状的块要按"子栈里调了什么"再筛一层**：`forloop` 里 `not(evtype=='L' or 'T') + fail` 是**解包**分支的守卫；
  通用 `for x in <expr>` 的分派其实是 `control_if_else (evtype=='L' or 'T')`，其 SUBSTACK 调 `pushLoop`、
  SUBSTACK2 里有 `fail`。P97 第一版打到了解包那个块上，毫无效果。
* **增广赋值靠"改写语句 + 带类型的字面量 token"实现**：`c.v += x` → `c.v = <值>`、`a[i] += x` → `a[i] = <值>`，
  值走 `Tok[n]=编码值` / `Kind[n]=类型`（这样 `indexset` 重新求值时**类型不丢**，右侧表达式也不会被算第二遍）。
* **V41_OUT 忘了设会覆盖出货件**：本轮两次把 `MiniPy_v4.39.sb3` 写成 v4.40 的内容，
  都用 `V41_SKIP='P95,P96,P97'` + 显式 `V41_OUT` 重建还原（核对 13,697 块 / errors=0）。
* **验证**：battery 23 套件与 v4.39 **逐字节相同**；6 个 `featprobe`（259 条）219/259
  （`featprobe4` 14/14、`featprobe5` 10/10，类方法链与实例方法链都转了）；`demos` 12/12、`scope` 4/4、
  `d1` 4/4、`pan` 7/7；`check41` 13,884 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.40 共 31 版全 MATCH**。
* 新增临时用例：`t95.json`（增广赋值 18）、`t96.json`（生成器/推导式 15）、`t96b.json`（函数内循环 6）、
  `t97.json`（生成器遍历 8）。**下一轮首要候选**：F1 嵌套推导式（`complist` 可重入化，照 P46 抄）、
  `try/finally`、关键字参数、`enumerate`/`zip`。

## v4.50 追加（v4.41 功能轮：P98–P99，出货 v4.41）

* 两个补丁：P98 嵌套推导式可重入（F1）、P99 `enumerate()`/`zip()`（E23/E24）。
  套件 `gaps433.json`：**48/63 → 51/63**（E 44/55、F 2/2、G 5/6），`featprobe` 219/259 → **224/259**。
  产物 `MiniPy_v4.41.sb3`：Interpreter 12,848 / 合计 **14,277** 块，`check41` errors=0。
* **同一过程被重入时，暂存变量必须成对保存**：F1 的形状与 P46 修过的"listlit 不可重入"完全相同——
  外层推导式的元素表达式里还有一个 `[...]`，内层 complist 把外层在用的 21 个变量 + `CComm` 列表全盖掉。
  修法是 P46 的翻版，但把保存/恢复做成两个 warp 过程（`csave`/`crestore`），12 个 `eval` 调用点共用，
  只多 24 个调用块而不是约 1500 块。
* **`narg` 是"顶层逗号个数"而不是参数个数**：`abs(-1)`、`enumerate(xs)` 的 `narg` 都是 **0**，
  都走 eval 的 `callfn(fn, lo+2, hi-1)`（单个实参先求值再进 callfn）；`f(a, b)` 才是 1。
  这条决定了 `enumerate` 要挂在 callfn、`zip` 不能挂在 callfn。
* **"看着像下标"的跨度会被 eval 抢走**：`zip(a, b)` 的实参跨度 `[1, 2], [3, 4]` 以 `[` 开头、以 `]` 结尾，
  eval 的 listlit 分支先命中 → `indexget` 报 `TypeError: list index must be an integer`。
  在 callfn 里补救来不及（`error` 已经写好），必须提到 eval 的 narg 分派**之前**：`hascomma` 判有无逗号
  （有 → `tuplelit`，无 → 整体 `eval`），再 `zipbuild`，最后补 `fnlimit -1` 再 `stop this script`。
* **CPython 的 `enumerate`/`zip` 产出元组**，所以外层是列表、元素记录写成 `lsep + 'T' + lesc(内层)`；
  `for i, x in ...` 的解包对 L/T 都认，所以两种编码都能跑，但打印形态只有 'T' 才对。
* **验证**：battery 23 套件与 v4.40 **逐字节相同**；6 个 `featprobe` 224/259；`demos` 12/12、`scope` 4/4、
  `d1` 4/4、`pan` 7/7；`check41` 14,277 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.41 共 32 版全 MATCH**。
* 已知扩展（不进套件）：`enumerate(x)`/`zip(a,b)` **立即求值**，单独打印给出列表，
  CPython 给 `<enumerate object at 0x…>`；`len(生成器)` 同样被 MiniPy 放行。
* 新增临时用例：`t99b.json`（enumerate/zip 16 条，全绿）。**下一轮首要候选**：关键字参数
  （`f(c=9)`、`sorted(x, reverse=True)`）、`try/finally`、`class B(A)` 继承、`from math import sqrt`。

## v4.51 追加（v4.42 功能轮：P100–P102，出货 v4.42）

* 三个补丁：P100 关键字参数（`f(1, c=9)`）、P101 `sorted(x, reverse=True)`、P102 解包分支的
  LoopName reporter 不再共用。套件 `gaps433.json`：**51/63 → 53/63**（E 46/55、F 2/2、G 5/6），
  `featprobe` 224/259 → **228/259**。产物 `MiniPy_v4.42.sb3`：Interpreter 13,042 / 合计 **14,471** 块。
* **共享 reporter 会返回陈旧值——这次是既存代码里的**（P102）。P89 把同一个 `item N of LoopName`
  喂给 `boundary` 解包分支的 `unpackto` 与普通 `assign`；v4.41 之前没暴露，是因为相关用例还没跑到那一行。
  实测三例序列（zip 循环 → 字典循环 → `for i, x in enumerate(...)`）里最后一个循环第二趟拿到的
  `names` 是**第一个用例的** `a,b`，元素却是对的 → 循环变量停在第一趟、身体连打两遍。
  定位手法值得记：`featprobe` 83 例序列复现 → 缩到三例 → 给 `boundary`/`unpackto` 插桩（`PTrace` +
  `runtrace.mjs`/`runcasedump.mjs`）→ 看到 `F lv=2 ev=(1,'b')` 与 `U names=a,b` 矛盾 → dump `Names/Values`
  发现表里多出 `a,b` 两项 → 锁定共享块。**凡"多个分支引用同一个表达式"的补丁，一律 `cloneExpr`。**
* **新列表要跟着帧存**：`UArgN`（P100 新建）不在 P14 的 `fpush/fpop` 名单里，"实参里调用户函数"
  会因内层调用清表而失败；把它追加进 fpush（末尾压栈）和 fpop（丢列表区**之前**恢复）。
* **逗号参数调用进不去 callfn**（v4.41 `zip`、本轮 `sorted` 同一处）：`narg == 1` 只走
  `builtin2`/`minmax`/`callable`，普通内建名都不是 callable → 在 eval 层挂钩子自己收实参。
* **`REPEATU(cond)` 真值语义**：位置游标跳过循环写成 `OR(past_end, NOT(EQ(entry,'')))` 把"跳过/停下"
  写反，纯位置调用全报 `missing argument a`；正确是 `OR(past_end, EQ(entry,''))`。
* **验证**：battery 23 套件与 v4.41 **逐字节相同**；6 个 `featprobe` 228/259；`demos` 12/12、`scope` 4/4、
  `d1` 4/4、`pan` 7/7；`check41` 14,471 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.42 共 33 版全 MATCH**。
* 新增临时用例：`t100.json`（关键字 16 条 13/16）、`t101.json`（sorted 12 条 11/12）、
  `t102–t106/w*/x*`（for 遍历与解包的定位用例）。余下失败都只是报错文案与 CPython 不同。
  **下一轮首要候选**：`try/finally`、`class B(A)` 继承、`from math import sqrt`、字典推导式/集合。

## v4.52 追加（v4.43 功能轮：P103–P104，出货 v4.43）

* 两个补丁：P103 `from math import name`（E51）、P104 `global` 语句（E32）。
  套件 `gaps433.json`：**53/63 → 55/63**（E 48/55、F 2/2、G 5/6），`featprobe` 228/259 → **232/259**。
  产物 `MiniPy_v4.43.sb3`：Interpreter 13,278 / 合计 **14,707** 块，`check41` errors=0。
* **"每帧一份"还是"全局一份"要先想清楚**：P104 第一版把全局声明按 `cdepth` 记成每帧一份，结果
  `outer()` 里两次调 `inner()`（`inner` 里 `global n`）打印 `0`——中间那层 `outer` 返回时按自己的快照重建，
  把 `inner` 的改动又冲掉了。`GName` 改成**全局一份**、不进帧，10/10。作用域类修改最容易踩这条。
* **新列表/新变量不会自动进帧存档**（P100 的 `UArgN` 踩过一次）：本轮刻意用"不进帧"的设计绕开——
  `MFrom`/`GName`/`GSave*` 都只在 RUN 开始清空一次（挂到 `LoopText` 那个 run-init 锚点上）。
* **内建函数返回值的排版要按函数定，不能按实参定**：`math.floor` 给 int、`math.sqrt` 给 float，
  所以 `floor(2.7)` 是 `2` 而 `floor` 的实参却带小数点；P103 第一版"实参有小数点就补 `.0`"把
  `floor(2.7)` 印成 `2.0`。正确做法是给"总是返回浮点"的函数打标记，最后统一 `mkfloat`。
* **验证**：battery 23 套件与 v4.42 **逐字节相同**；6 个 `featprobe` 232/259；`demos` 12/12、`scope` 4/4、
  `d1` 4/4、`pan` 7/7；`check41` 14,707 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.43 共 34 版全 MATCH**。
* 已知边界：`global` 的名字表是全局一份，所以"某个函数声明了 `global n`"之后，另一个函数里对 `n` 的
  **局部**赋值也会跟着不回滚（CPython 不会）；裸名字的 math 函数只支持单实参（`pow`/`fmod` 请用 `math.pow`）；
  `sqrt(-1)` 的报错文案与 CPython 3.14 不同。
* 新增临时用例：`t103c.json`（from math import 15 条 12/15）、`t104b.json`（global 10 条 10/10）。
  **下一轮首要候选**：`try/finally`、`class B(A)` 继承、字典推导式、集合字面量。

## v4.53 追加（v4.44 功能轮：P105–P106，出货 v4.44）

* 两个补丁：P105 `*args` / `**kwargs`（E28、E29）、P106 类继承 `class B(A)`（E46）。
  套件 `gaps433.json`：**55/63 → 58/63**（E 51/55、F 2/2、G 5/6），`featprobe` 232/259 → **236/259**。
  产物 `MiniPy_v4.44.sb3`：Interpreter 13,458 / 合计 **14,887** 块，`check41` errors=0。
* **星号形参必须让开"实参个数"守卫**：`def f(*a)` 的 `fpn` 是 1，调 `f(1,2,3)` 会先被"实参过多"
  守卫拦下，根本走不到绑定循环。做法是绑定前扫 `FnPar[fpo..fpo+fpn-1]` 置 `fhas`，把 `EQ(fhas,0)`
  AND 进**两道**守卫（个数 + 未知关键字）。只改绑定循环是没用的。
* **`**k` 收的正好是 P100 留下的那批条目**：`UArgN` 已是 `名字#值` 形状，剩余未绑定的关键字实参
  逐条建成 `D` 字典即可，顺序就是调用书写顺序。绑定循环里 `*a`/`**k` 处理完要 `change fj by 1`
  继续循环，`def f(*a, **k)` 才两个都收得到。
* **继承要在扫类体之前复制方法表**：`FnName` 的查找是"后写的赢"（`calluser` 反向搜），先复制父类条目、
  再扫子类类体，子类同名方法自然覆盖；反过来做就得手动去重。复制单位是 `FnName` 一条 +
  平行表 `FnPN/FnPO/FnPar/FnDef/FnStart/FnEnd/FnKind/FnLine/FnTlo/FnThi` 同下标各一条。
* **父类名核对要大小写敏感**：用 `compareText`，不要用 `data_listcontainsitem`——后者把 `Z` 和 `z`
  混成一个名字（P90 的老坑），`class B(z)` 会误判成找到了 `Z`。
* **锚点必须唯一**：P105 的 `kwFail` 锚点在"外层链"里能匹配到**两个**块，必须再加一条
  "这条 fail 是所在守卫子栈的**第一条**语句"才唯一（P95 的共享 reporter 是同一类问题的另一种表现）。
* **验证**：battery 23 套件与 v4.43、v4.42 **逐字节相同**；6 个 `featprobe` 236/259；`demos` 12/12、
  `scope` 4/4、`d1` 4/4、`pan` 7/7；`check41` 14,887 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.44 共 35 版全 MATCH**。
* 已知边界（`t106c.json`/`t106d.json` 实测）：类**属性**不继承（`class A: n = 7` 之后 `B.n` 报
  `AttributeError`，`A.n` 直接读可以）；没有 `super()`；**用父类名回调** `A.hi(self)` / `A.__init__(self, x)`
  也不通（`AttributeError: only lists have methods`）——所以继承在本轮是**只复用、不能回调父类**的形态，
  子类覆盖了方法就拿不到父类那份了；多继承 `class C(A, B)` 报 `SyntaxError`；调用侧 `f(*xs)` 不支持。
  两级链没问题：`class C(B)` 拿得到 `A` 的方法（复制可传递，实测 `C().hi()` 得 `'A'`）。
* 新增临时用例：`t105b.json`（`*args`/`**kwargs` 14 条 12/14）、`t106b.json`（继承 10 条 9/10）、
  `t106c.json`+`t106d.json`（继承边界 15 条，用于把"不支持什么"钉死）。
  余下 3 条是"异常类型对、文案不同"（`f(1,2)` / `f(z=1)` / `class B(Z)`）。
  **下一轮首要候选**：字典推导式（E43）、集合字面量（E44）、`try/finally`（E49）、默认参数共享（G5）。

## v4.54 追加（v4.45 功能轮：P107–P111，出货 v4.45）

* 五个补丁：P107 `try/finally`（E49）、P108 字典推导式（E43）、P109 **既存 bug：dictfmt 不可重入**
  （嵌套字典打印成乱码）、P110 **既存 bug：整数键查字典命中值记录**、P111 集合 `{1,2,3}` + 集合推导式（E44）。
  套件 `gaps433.json`：**58/63 → 61/63**（E 54/55、F 2/2、G 5/6），`featprobe` 236/259 → **242/259**。
  产物 `MiniPy_v4.45.sb3`：Interpreter 14,180 / 合计 **15,609** 块，`check41` errors=0。
* **`argOf()` 也必须"一次一个块"**（本轮最贵的坑）：`const lo = argOf('lo')` 在 4 个输入槽里复用，
  块图被共用后症状完全不像共享块——`{1,1,2,2,3}` 少一个元素、`{x for x in range(3)}` 报
  `NameError: range`、`[{1,2}]` 报 `LimitError: expression depth`，而且**只在多语句程序里复现**。
  每个使用点各调一次 `argOf` 之后立刻全绿。P95/P102 踩的是变量 reporter，这次是实参 reporter。
* **P34 的 `lesc(ev)` 是构建期一次性插入的**：新写的"把求值结果塞进容器"的语句要自己补
  `lesc(ev)`，否则字典推导式的值是容器（`{k: [1,2]}`）时就散架。
* **克隆出来的过程要进存档名单**：`csave/crestore`（P98）只保存它写补丁时那批变量，P108 新加的
  `dcsub/dcdep/dck/dcfor` 要手动加——`csave` 尾部追加 push、`crestore` **开头**插对应 pop（LIFO）。
* **`trycatch` 的钩子要插在它自己的遍历之前**：先跑 finally 尾巴再把异常还回 `error`，外层
  `except` 才接得到；插在后面表现为"尾巴没跑、异常冒到顶"。
* **改 P51 留下的链要照抄 `notFree`**：只按"链里出现过 `prevhead=='try'`"找锚点会选中外层整条件
  （`NOT(indent==prev+4) OR NOT(链)`），变成凡是 `finally:` 一律报错。
* **`[drop()]` 与 `[...drop()]`**：JS 少三个点，Scratch 少一整棵子树，报的却是
  `Cannot set properties of undefined`——本轮大半调试时间花在这个形状错误上。
* **验证**：battery 23 套件与 v4.44 **逐字节相同**；`demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；
  6 个 `featprobe` 242/259；`check41` 15,609 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.45 共 36 版全 MATCH**。
* 已知边界：`except X as e` 绑不上名字（**既存 bug**，下一轮修）；`try` 里 `return` 不跑 `finally`；
  `try/except/finally` 三子句的异常路径不保证；集合没有 `len/in/for`；集合元素按插入序而非哈希序。
* 新增临时用例：`t107*.json`（try/finally 12+5 条）、`t108*.json`（字典推导与嵌套打印 6 组 53 条，全绿）、
  `t111*.json`（集合 4 组 40 条，只差元素顺序）。
  **下一轮首要候选**：`except X as e`、集合门面（len/in/for/方法）、`try` 里 return 跑 finally、双 for 推导式。

## v4.55 追加（v4.46 功能轮：P112–P114，出货 v4.46）

* 三个补丁：P112 **既存 bug：`except X as e` 绑不上名字**、P113 集合门面（`len`/`in`/`for`）、
  P114 集合进内建（`sum`/`sorted`/`list`/`min`/`max`）。缺口套件仍是 **61/63**
  （套件里只剩 E50 与 G5），探针 **242/259** 不变（那 6 套没覆盖本轮两处），
  增量由 `t107b` 4/5、`t113` 14/14、`t114` 12/12 记录。
  产物 `MiniPy_v4.46.sb3`：Interpreter 14,270 / 合计 **15,699** 块，`check41` errors=0。
* **`tokenize` 遇到 `error` 非空就立刻收手**：P112 第一版在"清空 error"之前去 tokenize 子句行，
  `Tok` 是空的、扫不到 `as`、绑定静默失败——症状（"名字还是没绑上"）离原因很远。
  凡是要重新 tokenize 的地方，先确保 `error == ''`。
* **"改标签"比"加分支"便宜**：集合与列表编码完全相同，所以在 `in`/`for` 前面各插一句
  `evtype = 'L'` 就够了，不用写第二套扫描（P113 只有 3 条语句，换来 8 个入口）。
* **守卫要按"条件形状"认**：`find(... reach(substack).has(failCall))` 会把所有外层控制块都算候选
  （`sorted(x, reverse=…)` 的守卫一次匹配到 6 个）。改用条件本身的形状 `not(evtype == 'L')`——
  和 P51/P80/P107 是同一个坑。
* **新类型要顺手想清楚返回类型**：`sorted(set)` 返回列表，P114 在 `lsort` 之后补了 `evtype = 'L'`。
* **另修工具链一个坑**：`rebuild-old.ps1` 的版本表里，值必须是**一个字符串**——写成裸的
  `$p46,$p45` 会被 PowerShell 当成数组，赋给环境变量时用空格连接，逗号丢失后整张 skip 表错位，
  回放全变 DIFF（v4.10…v4.44 一起红）。全部改成 `"$p46,$p45"` 后 37 版重新全 MATCH。
* **验证**：battery 23 套件与 v4.45 **逐字节相同**；`demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；
  `check41` 15,699 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.46 共 37 版全 MATCH**。
* 至此缺口清单只剩两条**不可为**项：E50（CPython 自己抛 FileNotFoundError，报错行对不齐）与
  G5（默认参数共享需要真正的对象模型）。再往后都是"把已有的东西做厚"：`try` 里 `return` 跑 finally、
  集合方法、双 for 推导式、`yield i, i + 1`、浮点 repr。

## v4.56 追加（v4.47 功能轮：P115/P116/P118，出货 v4.47）

* 三个补丁：P115 `'a b'.split()` 按空白切（清单第 6 条）、P116 `yield a, b` 产出元组（第 5 条）、
  P118 "方法不存在"文案对齐 CPython（第 8 条的一半）。缺口套件仍 **61/63**，探针 **242/259** 不变，
  增量由 `t115b` 7/7、`t115c` 的 split/yield/文案三组记录。
  产物 `MiniPy_v4.47.sb3`：Interpreter 14,348 / 合计 **15,777** 块，`check41` errors=0。
* **`reach()` 从链中间的语句出发会漏到整段程序**：`reach(某个 if 块)` 会顺着 `next` 走到本过程结尾，
  所以"找一个带 count>1 的守卫"会匹配到两个（第二个在后面某条语句里）。要限定子栈就显式拿
  `SUBSTACK[1]` 当根。
* **`[...pushV(x)]` 会把块 id 摊成字符**：pushV 返回一个 id（字符串），展开后 `chain()` 收到一堆单字符，
  报 `Cannot set properties of undefined (setting 'next')`。
* **不要在循环里"顺手"存取游标**：`ssplitw` 第一版把游标压 VStack 再取回 → 每轮回到原处 → 死循环
  （表现为 run.mjs 20 秒超时、输出为空）。不含 `eval` 重入的循环不需要保护。
* **本轮做了但撤回的补丁**：`d.pop(k)` 重写（P117）单次调用把四个毛病全修对了，但连用时
  `d.get(k)` 会读到过期接收者；顺线查到 **P20 的接收者求值没有把 `ev` 发布到 `xa`/`xb`**——
  普通方法调用读到的是上一次留下的接收者（补上 P119 后仍未全好，说明还有第二个同源问题）。
  两个补丁都已下链，v4.47 的 pop 与 v4.46 完全一致（不引入回归）。复现：`t115g/t116a/t116b`，
  定位工具 `dbgmulti.mjs`（同一 VM 连跑多程序 + 变量写入监视）。**下一轮从这里接手。**
* **验证**：battery 23 套件与 v4.46 **逐字节相同**；`demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；
  `check41` 15,777 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.47 共 38 版全 MATCH**。

## v4.57 追加（v4.48 功能轮：P117/P120，出货 v4.48）

* 两个补丁：P117 `d.pop(k)` 重写（v4.47 做好又撤回的那个）+ P120 **根因修复：一个实参 reporter
  只用于一个输入槽**。缺口套件仍 **61/63**，探针 **242/259** 不变；增量由 `t115g` 3/3、
  `t116a` 5/5、`t116b` 4/4、`t115c` 17→24 记录。产物 `MiniPy_v4.48.sb3`：
  Interpreter 14,349 / 合计 **15,778** 块，`check41` errors=0。
* **真因不是接收者，而是共用的实参 reporter 块**：一个 Scratch argument reporter 的值按**当前栈帧**
  解析，而 P91 的字典查找里 `listlen(rec)`、`listitem(rec, dmi)`、`listitem(rec, dmf+1)` 共用**同一个**
  reporter 块。实测（`dbgmulti.mjs` 同 VM 连跑 + 变量监视）：pop 之后同一个调用里，入口处该 reporter
  给的是**新**字典，紧接着 `listlen` 却按**旧**字典算数（6 而不是 4）；把它换成新克隆的同名 reporter
  立刻变成 4。于是写了 P120 做全局去重——全项目只有 3 个共用块、补 15 个克隆。
  （P95/P102/P115 之前踩的都是同一类问题：**"一个块一个父"**这条规则对实参 reporter 同样适用。）
* **上一轮的猜测被否掉**：dump 显示 `xa = ev`、`xb = evtype` 就在接收者求值之后（`after[2]`/`after[3]`），
  P20 并没有漏发布接收者，所以 P119 没有出货。
* **定位手法（可复用）**：往一个调试列表里按顺序追加"入口记录 / 调用前记录 / 调用后记录 / 分支前记录"，
  再用 `dbgmulti.mjs` 按程序连跑并 dump 这个列表——比单点 dump 强得多，一眼就能看出"同一个名字两次解析
  出不同的值"。
* **验证**：battery 23 套件与 v4.47 **逐字节相同**；`demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；
  `t115b` 7/7、`t107` 8/12、`t108` 14/14、`t111` 14/15、`t113` 14/14、`t114` 12/12（与 v4.47 相同）；
  `check41` 15,778 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.48 共 39 版全 MATCH**。
* **下一轮候选**：`try` 里 `return`/`break` 跑 finally → 浮点 repr → 双 for 推导式 → 集合方法 →
  `for a, b in <生成器>` 解包 → `super()` 与类属性继承。

## v4.58 追加（v4.49 功能轮：P121/P122，出货 v4.49）

* 两个补丁：P121 浮点字面量（负指数**改成除法**、`numbercheck` 放行科学计数法）、
  P122 浮点排版（新 `floatfmt`：CPython 的定点/科学计数切换、`-0.0`、`float()`）。
  清单第 7 条清掉；探针 `t121.json` **8/20 → 20/20**，`t115c` 24 → 28（浮点四项也绿了）。
  缺口套件仍 **61/63**（浮点不在 63 条里）。产物 `MiniPy_v4.49.sb3`：
  Interpreter 14,662 / 合计 **16,091** 块，`check41` errors=0。
* **`JOIN('e+', x)` 把字面量当块 id**：`REP(x, shadow)` 的约定是"字符串 = 块 id"，
  所以拼接字面量必须 `txt('e+')`。写错时 scratch-vm **直接崩在 `BlockCached` 构造函数**里，
  而 `check41`/orphans 都是 0——结构性检查抓不到"输入指向不存在的块"。
* **`replaceStmt` 之后旧块已经脱链**：`replaceStmt(old, A)` 把 A 接到老位置、**把 old 摘下来**，
  再 `spliceAfter(old, B)` 就写进了一条走不到的链（症状是补丁静默失效：`1e3` 印成 `1e3.0`，
  因为 `nres` 还停在 numlit 开头赋的原始 token 文本）。正确写法是先接住返回值：
  `const a = replaceStmt(old, A); spliceAfter(a, B)`。
* **辅助函数返回"块 id"还是"语句数组"要分清**：`...mantFrom(x)` 把 id 字符串摊成了一个个字符
  （P115 的 `...pushV` 是同一个坑）。
* **去掉零要分"前导"和"尾随"**：指数的 `+300` 要去**前导**零，尾数 `10000000000000000` 要去**尾随**零；
  第一版共用一个函数，于是 `1e300` 印成 `1e+03`。
* **参考侧自己是不确定的**：CPython 的字符串哈希按进程随机化，`for x in {'a','b'}` 的顺序逐次运行会变，
  所以 `t111`/`t113` 会在 14/15、13/14 之间跳动（集合元素顺序本就属"不保证项"）。
* **验证**：battery 23 套件与 v4.48 **逐字节相同**；`demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7；
  `check41` 16,091 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.49 共 40 版全 MATCH**。
* **下一轮候选**：`try` 里 `return`/`break` 跑 finally → 双 for 推导式 → 集合方法 →
  `for a, b in <生成器>` 解包 → `super()` 与类属性继承。

## v4.59 追加（v4.50 功能轮：P123，出货 v4.50）

* **P123 跳转也要跑 finally**（清单第 2 条）：`return`/`break`/`continue` 走的是"正常路径"，
  驱动器只认 `retflag`/`dest`，所以尾巴被整段跳过。做法是**把跳转当异常寄存**：尾巴帧多挂
  `FinRet`（1=return / 2=break / 3=continue）、`FinV`+`FinVT`（返回值）、`FinDest`（跳转目标）四列，
  `return` 分支在设 `retflag=1` 之后、`break`/`continue` 分支在 `popLoop()` 之前把动作寄存并把
  `dest` 改指 `FinStart`（`break` 用 `fdef` 挡掉那一次 `popLoop()`），钩子在"尾巴已过"那一支读回四列重放。
  `inBody()` 用 `pc<FinStart` 把"尾巴自己里面的跳转"排除在外——CPython 允许尾巴里的 `return` 覆盖前面的。
* **P123 顺带补 `try/except/finally`**：P51 的 `try` 只把**第一个**子句（`Elses[pc]`）当子句行，
  P107 的岔路于是只在"第一个子句是 `finally`"时压尾巴帧——`try / except / finally` 里 `except` 一 `return`，
  尾巴就被跳过（`print('fin')` 根本不执行）。现在压完 handler 帧后**沿 `Elses` 子句链继续找 `finally:`**
  （`REPEATU` 循环，条件 `Elses==0 or 已找到`），找到就再压一个尾巴帧，并记 `FinH=1`、`FinHand=handler 行`。
  分流照 CPython：保护体里的错误**先给自家 `except`**（前置钩子对 `FinH=1` 的帧不抢，交给 `trycatch` 的匹配循环）；
  自家 `except` 不要的错误**先跑尾巴再往外抛**（在匹配循环 `delLast(TryHand)` 之前插一句：错误还在、
  `FinHand[last]==TryHand[last]` 且 `FinHand≠0` ⇒ 寄存错误、清 `error`、`pc=FinStart`，然后再丢帧）；
  尾巴里再抛的错误**替换**原来的（`pc>=FinStart` ⇒ 丢掉尾巴帧放行，顺带修掉"尾巴里抛错会无限重跑尾巴"）。
  探针 `t123.json` **8/29 → 29/29**，`t115c` 28 → 30、`t107` 8/12 → 9/12（T4 翻绿）。
  产物 `MiniPy_v4.50.sb3`：Interpreter 14,924 / 合计 **16,353** 块，`check41` errors=0。
* **"块数组"必须每次新建**：`popExtra` 原本是**预先建好的一批块**，被 `chain(popExtra)` 用在扫描、
  尾巴分支、错误臂三处——而**一个块只能出现在一个位置**，最后一次 `chain()` 把共享块的 `.next` 接到自己那条链上，
  于是**尾巴分支里重放动作的四个 `if` 整段消失**（症状：`return 1` 在 `finally` 之后变成 `None`、
  `break` 变成不退出循环），而 `check41`/orphans 仍是 0——结构性检查抓不到"同一批块挂在两条链上"。
  修法：改成工厂函数 `popExtra()`/`pushExtra()`/`dropFrame()`（P107 的 `drop()` 本来就是这么写的）。
* **`FinStart`/`FinEnd` 的确切含义**（这轮靠 `dbgtrace2.mjs` 打印 `Elses`/`Ends` 实测定死）：
  `FinStart` = 尾巴第一条语句（子句行 + 1），`FinEnd` = `Ends[子句行]` = 尾巴之后的第一条语句
  （整条 try 语句的排他末端）。于是 `pc >= FinEnd` ⇒ 尾巴已走完；`pc >= FinStart` ⇒ 当前在尾巴里。
  `Ends` 是"排他末端"、`Elses` 是"子句链"（实测 `Elses=[0,4,0,6,0,0,0,0]`、`Ends=[8,4,4,6,6,8,8,9]`
  对应 `try(2)/1÷0(3)/except(4)/return(5)/finally(6)/print(7)/print(8)`）。
* **`find()` 收的是 id 集合**：`find(walkBody, …)` 会把块 id 当字符串逐字符展开，报
  `Cannot read properties of undefined (reading 'opcode')`；要写成 `find(reach(walkBody), …)`。
* **验证**：`t123` 29/29；battery 23 套件与 v4.49 **逐字节相同**；`demos` 12/12、`scope` 4/4、
  `d1` 4/4、`pan` 7/7；6 个 featprobe 242/259；`check41` 16,353 块 errors=0；
  `frames` fib16 `interpSteps` 6388；`rebuild-old.ps1` **v4.10…v4.50 共 41 版全 MATCH**。
* **下一轮候选**：集合方法（`add`/`remove`/`discard`、`|`/`&`/`-`）→ 双 `for` 推导式 →
  `for a, b in <生成器>` 解包 → `super()` 与类属性继承 → 多重继承。

## v4.60 追加（v4.51 功能轮：P124，出货 v4.51）

* **P124 集合的方法与运算符**（清单第 3 条）：集合与列表共用同一套编码（`lsep + 类型 + 转义文本` 平铺），
  所以在 `methodcall` 的类型守卫前加一个 `xb == 'E'` 入口 → `setmeth %s %s %s %s %s`（与 P91 的 `dictmeth`
  同形，`rec/nm/meth/lo/hi` 全走形参）。成员判定是新的 `lhas %s %s %s`（`listlen`/`listitem` + `compareText`）；
  `|` 是两串相接后 `setnorm`，`&`/`-` 是 `setfilter %s %s %s` 过滤左串，`^` 是 `(a-b) | (b-a)`；
  `add`/`discard`/`remove`/`clear`/`update` 重建整串后用 `assign 名字 新串 E` 写回（与列表原地方法同一条路）。
  `rightside` 里数字分支、位运算分支与三个浮点探针的守卫都加 `not(双方都是 E)`，否则 `a - b` 先撞
  "numeric operands"、`a | b` 先撞 "bitwise requires integers"。配套还补了 `set(x)` 内建、空集合印 `set()`、
  `list.copy()`，并把 P54 的别名登记/传播从 `L` 放宽到 `L/E`（`t = s; s.add(1)` 通过 `t` 可见）。
  探针 `t133.json`（`t126`/`t129`/`t130`/`t131`/`t132` 合并）**60/60**。
* **P124 附带集合比较**：普通比较逐字符比两串编码，`{1, 2} == {2, 1}` 会印 False。一个交集就能定全部关系
  （`|a ∩ b| == |a|` 即 `a ⊆ b`），据此给出 `==`/`!=`/`<`/`<=`/`>`/`>=`。**这条分支的守卫必须用 `evtsave`**
  （rightside 在开头存的右操作数类型），因为本块算完会把 `evtype` 改成 `B`，守卫再看活变量会把普通比较又放进来——
  这个坑第一次实现时正是这样：`dbgcmp=1`（块确实跑了）但结果仍是 False，最后是"谁在后面把 ev 覆盖了"的追查。
* **分支跑完必须自己收尾**：`setmeth` 是一串 `if meth == ...` + 末尾无条件的兜底 `fail "set has no method X"`。
  第一版每个分支里没写 `stop this script`，于是分支跑完继续往下、最后一定撞兜底——现象是 `x.add(2)`
  报 "set has no method add"，而 `ARG:meth` 明明是 "add"（补丁逻辑全对，只是被兜底覆盖）。P91 的 `dictmeth`
  每个分支末尾都有 `STOPTHIS()`，照抄即可。
* **偏移只能用一次**：`methodcall` 把 `lo+4 / hi-1` 算好后传给 `setmeth`/`dictmeth`，接收方直接用；
  两边各算一次会得到空区间，报 `SyntaxError: missing expression`（这条信息的真实含义是"eval 收到的 token 区间是空的"）。
* **P93 的括号深度扫描加了 `{` 却漏了 `}`**：P20 的方法链切分器靠它找"顶层 `)` 后面的 `.`"，
  于是 `s.union({3}).difference({1})` 里的 `{` 把深度加 1 没人减回来，链没被切开、整段被当成一次调用
  （参数范围里带着 `) . difference (`，报 `SyntaxError: parentheses`）。补的时候要当心：`}` 只能在
  **当前区间内深度 > 0** 时算闭合——`methodcall2` 会把"接收者最后一个 token"当 lo 传进来，
  那里正好是字面量接收者的 `}`，无脑减一会让深度从 -1 起算、另一种链又坏掉。
* **`find(set, pred)` 会在整棵子树里找**：判断"哪一条是 rightside 的比较分支"时，比较分支**自己**
  用来合成六个 op 测试的嵌套块形状完全相同，于是命中两个；要先把搜索范围收窄到
  `error == ""` 守卫那一层的**链**上（用 `numeric[0]` 反查守卫，再遍历它的 SUBSTACK 链）。
* **验证**：`t133` 60/60、`t134` 7/9（余 `set()` 无参、`issubset` 两个已记录缺口）；battery 23 套件与 v4.50
  **逐字节相同**；22 套 `cmp47` + 28 套 `_work/v41`（含 `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7）
  与 v4.50 逐例 diff=0；6 个 featprobe 242/259；`check41` 16,898 块 errors=0；
  `frames` fib16 `interpSteps` 6388；`rebuild-old.ps1` **v4.10…v4.51 共 42 版全 MATCH**。
  产物 `MiniPy_v4.51.sb3`：Interpreter 15,469 / 合计 **16,898** 块。
* **下一轮候选**：双 `for` 推导式 → `for a, b in <生成器>` 解包 → `super()` 与类属性继承 → 多重继承 →
  `sorted(x, key=lambda …)`。

## v4.61 追加（v4.52 功能轮：P125，出货 v4.52）

* **P125 多子句推导式**（清单第 4 条）：`complist` 只找**第一个** `for`（前面是元素表达式、`in` 之后到
  可选 `if` 是迭代源），第二个 `for` 就落进"迭代源"被丢给 `eval`，深度扫描见了 `)` 报
  `SyntaxError: parentheses`。改成**一个子句一层递归**：新增 `cdo <lo> <be> <hi> <pos> <dict>`，
  每次找 `<pos>` 之后第一个**深度 0** 的 `for`/`if`，算出这条子句的结束位置（下一个子句的前一个 token）——
  `for` 就迭代后递归、`if` 就求值后递归、都没有就把元素表达式（`lo..be`）追加进累加器。
  `range(...)` 抽成 `crng` 走算术循环（每条子句都要重新求值，于是 `for y in range(x)` 这种内层依赖外层
  变量自然成立），其余迭代对象按列表/元组/集合（同编码）逐元素、按字符串逐字符。`complistD`（P108 的
  构建期克隆）与集合推导共用同一驱动；字典推导补 `dlast`（重复键保留**最后**一条）。
  探针 `t139.json` **31/31**，`t115c` X1 翻绿。
* **递归必须自己护住外层循环状态**：递归会跑一整个内层推导，把外层循环用的全局（`cv/cstop/cstep/
  clist/cn/cqidx/...`）全盖掉；而 **`cacc` 必须共享**（整条推导共用一个累加器），所以不能直接用 P98 的
  `csave/crestore`（那连 `cacc` 一起还原）。新增 `csp`/`crp` 只压/弹那 17 个循环状态变量，递归前后各一次。
  第一次实现只给 `eval` 套了 `csave/crestore`，于是内层一返回外层就拿着内层的边界：
  `[x*y for x in range(3) for y in range(2)]` 只出 `[0, 0]`，而**单** `for` 的 `[x for x in range(3)]`
  直接退化成 `[0, 0, 0]`——`cqq` 被内层置 0 后 `Tok[cqq+1]` 变成 `Tok[1]`，把值赋给了别的名字。
* **"整段替换函数体"会丢掉后面补丁注入的东西**：`attachBody` 换掉 `complist` 的函数体，P60 注入的
  循环变量作用域保存/恢复随之消失（现象：`x = 99; b = [x for x in range(3)]` 之后 `x` 变成 2 而不是 99）。
  本轮把 P60 那段逻辑重新施加到新驱动里。克隆型补丁同理：**改了 `complist` 就要把 `complistD` 一起
  指向新驱动**（P108 是构建期克隆，不会自动跟随）。
* **`find(set, pred)` 会在整棵子树里找**：判断"哪条是 rightside 的比较分支"时，比较分支**自己**用来
  合成六个 op 测试的嵌套块形状完全一样，于是命中两个；要先用 `numeric[0]` 反查 `error == ""` 守卫，
  再只遍历它那一层的链。
* **生成器表达式是另一个缺口（本轮未做）**：`sum(x for x in range(3))`／`g = (x for x in range(3))`／
  `max(x for x in ...)` 全红，而且**单** `for` 的也从来没通过。用 `dbgmulti` 记录 eval 的入参区间后发现
  那个区间只有 3 个 token（`x for x`）——`x for x in range(3)` **根本没被当成一个区间交给 eval**，
  问题在实参切分（`printargs`/`callfn` 之前那一步），不是推导式本身。已在文档里记为下一轮第 1 条候选。
* **顺带**：`x in (1, 2)` 元组同列表编码，但 `in` 的类型链只认 `L/S/D/E`（报 "in requires strings"），
  放行 `T`；`for b in (10, 20)` 本来就能用。
* **验证**：`t139` 31/31、`t133` 60/60、`t123` 29/29、`t137` 5/5、`t140` 3/3；battery 23 套件与 v4.51
  **逐字节相同**；23 套 `cmp47` + 28 套 `_work/v41`（含 `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7）
  逐例 diff=0（只有 `t115c` X1 变好）；6 个 featprobe 242/259；`check41` 16,961 块 errors=0；
  `frames` fib16 `interpSteps` 6388；`rebuild-old.ps1` **v4.10…v4.52 共 43 版全 MATCH**。
  产物 `MiniPy_v4.52.sb3`：Interpreter 15,532 / 合计 **16,961** 块。
* **下一轮候选**：生成器表达式（先查实参切分）→ `for a, b in <生成器>` 解包 → `super()` 与类属性继承 →
  多重继承 → `sorted(x, key=lambda …)`。

## v4.139 追加（v4.131 功能轮：P203，出货 v4.131）

* **放宽六项硬上限**（用户提出："能不能放宽单行字符限制、程序总行限制、单个值限制、控制台限制、
  递归深度限制、步数限制"）。全部都在**基础工程**里，都是纯"防跑飞"护栏，没有一项是结构性依赖：
  `Code` 就是普通列表、值就是字符串、控制台是 `del Output[1]` 裁剪、调用栈是 MiniPy 自己的
  `FN/FV/FT/FrRet/FrBase/FrLoop` 列表（不是 Scratch/JS 递归）。

  | 限制 | 旧 | 新 | 强制点 |
  |---|---|---|---|
  | 程序行数 | 200 | **1000** | `prepare`: `length of Code` |
  | 单行字符 | 240 | **2000** | `prepare`: `len(es)` |
  | 值长度 | 2048 | **16384** | `eval`: `len(ev)` |
  | 控制台 | 300 | **2000** | `log`: `length of Output` |
  | 递归 `cdepth` | 96 | **512** | `calluser` |
  | 表达式 `fnlimit` | 64 | **768** | `eval` |
  | 步数 | 10000+90000·speed | **50000+450000·speed** | RUN 主循环 + `calluser` 体循环（两处） |
  | 单调用 `csteps` | 20000 | **100000** | `calluser` |

* **挖出来的真瓶颈**：文档一直写"递归 96"，但实测 v4.130 **`f(63)` 就报 `LimitError: expression depth`**
  ——Python 调用是在表达式求值里发生的，每层调用占一个 `eval` 帧，而 `fnlimit` 只有 64，所以
  `cdepth` 96 根本走不到。`p203.txt` 让 **`fnlimit = 1.5 × cdepth`**（768 对 512），深递归因此报
  `RecursionError`（与 CPython 一致），`expression depth` 退回只挡病态表达式。
* **代价（都量过）**：`prepare` 是 `warp` 过程，整份程序在一个 VM 帧里分词（实测 51 行 27ms /
  101 行 47ms / 151 行 97ms，≈0.7ms 每行），1000 行 ≈ 0.7s 且**每次 RUN 都重来**——所以停在 1000
  （2000 行要 1.5s，浏览器里会明显卡）。解释器约 **1300 步/秒**，50 万步最坏 ≈ 6 分钟，靠 `STOP` 止损；
  `Steps 500000` 12 字符（≈70px，起点 x=83）仍在代码面板（到 156）之内，再大就会压到面板边。
* **做法**：`p203.txt` 全程**按报错文案定位**（`failSites('LimitError: 200 lines maximum')` → `ancestor`
  找包住它的 `control_if` → 改 `OPERAND2` 字面量，同时改文案里的数字），控制台那条没有文案就按
  "`operator_gt` 的 OPERAND1 是 `length of Output`"来找；每处都断言命中数，数量不对直接抛错，
  所以将来再加补丁也不会悄悄改错对象。步数那两处的 OPERAND2 是 `ADD(50000, MUL(speed, 450000))`，
  按 `operator_add` / `operator_multiply` 的结构改。**只改字面量，一块积木没加没删**。
* **验证（A/B：同一套探针跑 v4.130 与 v4.131）**：新写 `_limverify.mjs`（真实 scratch-vm，无头）
  与 `_limbound.json`。恰好 1000 行 / 2000 字符一行 / 16384 的值 / 递归 500 层 / 函数体内 25000 步
  **在 v4.131 全部跑通**，各超一格就报新文案；同样这几例在 v4.130 分别是
  `200 lines maximum` / `240 chars per line` / `value exceeds 2048 chars` / `expression depth` /
  `step limit inside function`。打印 2100 行：控制台从"留 300 行（首行 1800）"变成"留 **2000** 行（首行 100）"；
  12 万步的 while 在 v4.130 撞 `step limit reached`，v4.131 正常跑完（`120003` 步，≈151s）。
  构件本体里九个常量用 `_limdump2.cjs` 从产物 `project.json` 读回来核对过。
  **回归**：`gaps433` **61/63**、featprobe **248/259**、四个带断言的界面探针 `ALL OK`、
  `mp_font` 的 HELP **123 行**（与 `help.json` 一致）、`mp_keys3`/`mp_undo` 逐项不变；
  `check41` **29,092 块 errors=0**；`rebuild-old.ps1` **v4.10…v4.131 共 122 版全 MATCH**。
* **顺带修的文案**：HELP 的 LIMITS 模块从四行改六行，并且删掉早已过时的 `ASCII only, 4-space blocks`
  ——v4.85/v4.86 起任意缩进宽度与 TAB 都合法，这句话从那时起就是错的。HELP 121 → **123 行**。
* **落地**：`p203.txt` 加进 `assemble.cjs` 部件表（`p202.txt` 之后、`p68.txt` 之前）；`head.txt` 输出
  **v4.131**；`rebuild-old.ps1` 里 `$p131 = 'P203'`、`'v4.131' = ''`、`'v4.130' = "$p131"`，
  **121 个更早条目（v4.10…v4.130）全部加上 `$p131,` 前缀**（其中 `'v4.130' = ''` 那行用的是
  **单引号空串**，批量脚本第一遍的 `"…"` 正则没匹配到它，第二遍才补上）。产物 `MiniPy_v4.131.sb3`：
  Interpreter 26,815（**未动**）/ Controller 2,017 → **2,019**（HELP 多两行）/ 合计 29,090 → **29,092**。

## v4.137 追加（v4.128 功能轮：P201，出货 v4.128）

* **字符串方法的实参收尾**（v4.127 的 P200 给了派发器第三个实参槽位，同一个槽位又暴露出四处静默错）：
  `replace(old, new, count)` 的 count 被丢掉、`replace` 的空模式原样返回、`startswith`/`endswith`
  把 `start`/`end` 整个丢掉、以及**所有**位置实参照字面吃（`'abcabc'.find('a', 1.5)` 答 **3.5**）。
  一句话：`'abcabc'.replace('a','X',1)`→`Xbcabc`、`'abc'.replace('','X')`→`XaXbXcX`、
  `'abc'.startswith('b',1)`→`True`、`'abc'.startswith('',5)`→`False`、`find('a',None)`→`0`、
  `find('a',True)`→`3`，非整数位置实参报 CPython 的
  `TypeError: slice indices must be integers or None or have an __index__ method`。
* **做法**：新过程 `srepn %s %s %s %s`（`srep` + 计数器，`cnt < 0` 不限）、新过程
  `sprefix2 %s %s %s %s %s`（先切 `s[start:end]` 再交给没动过的 `sprefix`）、改写 `srep` 的
  `smlen == 0` 那一臂（逐位插入 + 末尾一处）、改写 `startswith/endswith` 的派发臂、
  在读出 `smmeth` 之后加一个"位置实参"块（`None` → 0/大哨兵；非整数 → CPython 文案；只在这 7 个方法
  且实参确实给了时生效）。`replace` 的派发块插在 P18 那条普通 `srep` 分支**之后**（那条每次都跑，
  写在前面会被它覆盖）。
* **三处判据各不相同，不能合并**：`find` 的 `start` 夹 0 但**不**夹到 `len`；`startswith` 的区间
  同样是"不夹 start"但 **`end < start` 直接 `False`**（所以 `'abc'.startswith('',5)` 是 `False`
  而 `...('',3)` 是 `True`）；`replace` 的 count 只收整数/布尔，报错文案是
  `'<真实类型>' object cannot be interpreted as an integer`。**都按本机 CPython 实测抄的**。
* **顺手修掉一句错文案**：P177/P179 的"起点不是整数"说的是 `'int' object cannot be interpreted…`
  （连类型名都错，字符串起点也报 int）；现在统一成 CPython 的 slice-indices 那句。
  另外那两处检查放宽成"不是 `N` 也不是 `B`"——布尔是合法下标。
* **坑**：`find`/`rfind` 的 `end` 在**没给**的时候是默认值 `""`（`mcut2 == 0`），
  `sprefix2` 第一版把 `sma3` 直接传进去，`""` 被当成"end=0"⇒ 全答 `False`；没给时要传一个大哨兵。
* **验证**：新写 `d281`（replace 家族 + 参数校验，30 条）**9/30 → 30/30**、`d282`（位置实参取值与报错，
  12 条）**5/12 → 12/12**、`d283`（startswith/endswith 区间，10 条）**1/10 → 10/10**；`d280` **34/34 不变**；
  126 套快照逐例 diff（v4.127 vs v4.128）**0 回归**、37 条由红转绿、7 条报错文案纠正
  （`d258` G10、`d260` K11、`d282` Q1/Q2/Q4/Q9/Q12）；22 条 `expectError` 用例的报错文本与 CPython
  **逐字相同**；battery 23 套与 v4.127 逐例相同；`gaps433` **61/63**、featprobe **248/259**、
  `frames` fib16 **6388** 均不变；`check41` **28,561 块 errors=0**；
  `rebuild-old.ps1` **v4.10…v4.128 共 119 版全 MATCH**。产物 `MiniPy_v4.128.sb3`：Interpreter 26,599 → **26,815**。
* **补丁拆分**：v4.128 = **`p201.txt`**（放在 `p200.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p128 = 'P201'`、`'v4.128' = ''`、`'v4.127' = "$p128"`，v4.126 往下 117 个条目都带上 `$p128,` 前缀。
* **字符串接口到此收口**：CPython `str` 上剩下的只是**还没做的方法**（`encode`/`translate`/`maketrans`/
  `format_map`/`isascii`/`isdecimal`/`isidentifier`/`isnumeric`/`isprintable`/`istitle`），
  不是"参数没做全"。其余残留：`for a, *r in …`、内建 `*` 展开、`obj.m(*xs)`、多访问器路径别名、
  `d.pop(k, default, extra)`、视图集合语义、非 ASCII。

## v4.136 追加（v4.127 功能轮：P200，出货 v4.127）

* **补齐字符串接口**（`_work/cmp47/d280.json` 34 条，v4.126 只过 9 条）：`find`/`rfind`/`count`/`index` 的
  **`end` 边界**（字符串、列表、元组）、**负数 `start`**、**`split(None, maxsplit)`**、全新的 **`rsplit`**。
  一句话：`'abcabc'.find('b', 2, 4)`（v4.126 报 TypeError）、`'abcabc'.find('a', -3)`（v4.126 答 0）、
  `[1,2,1,2].index(2, 0, 2)`（v4.126 报 slice indices）、`'a b  c'.split(None, 1)`（v4.126 报 empty separator）、
  `'a,b,c'.rsplit(',')`（v4.126 报 AttributeError）现在全部与 CPython 一致。
* **根因一：字符串派发只切一刀**。P18 的参数切分只找**第一个**顶层逗号，`find('b', 2, 4)` 把 `2, 4` 当**一个元组**
  求值交给 `start`；负数字面量更早一步就炸（`-3, -1` 求元组 → `TypeError: numeric operand`）。
  **修法**：原扫描循环里多记一个 `mcut2`，三段式改成"两逗号 ⇒ 三段分别 `eval`"，得到 `sma3`/`smt3`。
  列表派发（P190 的 `mcut`）同样加一份。
* **根因二：内核只认字面位置**。新写 `s3find`/`s3rfind`/`s3count`：按 Python 切片夹取
  （`start<0 ⇒ +=len ⇒ 夹 0`，**不**夹到 `len`；`end<0 ⇒ +=len ⇒ 夹 [0,len]`），
  `start>end` 直接 -1（count 给 0），否则在 `substr(rec,start+1,end)` 上调**已有的单参数内核**再加偏移。
  `start` 不夹到 `len` 正是 `'abc'.find('',5) == -1` 而 `'abc'.find('',-1) == 2` 的原因。
  顺带补 P177/P179 的老缺口：`sfind2`/`srfind2`/`scount2` 也照字面吃位置，四个双参数分支入口各加两条负数归一。
* **派发顺序是这一版最容易翻车的地方**。三参数块必须放在**单参数**处理器**之后**：`sfind`/`scount` 那两条
  `if smmeth == "find"/"count"` 每次调用都会跑，写在前面 `ev` 会被它们覆盖（第一版就是这样，
  `find('b',2,4)` 答的是全串 find 的结果）；同时在**双参数**的四个分支条件上补 `mcut2 == 0` 让位。
* **`split(None, maxsplit)`**：`ssplitw` 加计数 `smcnt` 与上限 `smmax`，到限就把剩余整段
  （`substr(s, spwi, spwn)`，保留尾部空白）当最后一个字段；`smmax == 0` 于是等于"去前导空白、整段留下"。
  派发侧把 P193 那条 `(smt1=="Z") and (smmax<0)` 放宽成 `smt1=="Z"`。
* **`rsplit`**：`srsplit` 从右往左走、命中就把字段**前插**进编码累加器（`\x1f`+类型+`lesc` 转义），
  `srsplitw` 剥尾部空白后反向读字段（到限时剩下的头部保留**前导**空白 ⇒ `'  a   b  '.rsplit(None,1)` 是 `['  a','b']`）。
  派发插在"未知方法"守卫之前，而那条守卫是"名字**不在**表里才报错"，所以要把 `rsplit` 从它的条件里**排除**。
* **踩坑（可复用）**：**一个 block id 不能同时喂给两个输入**——`isWs` 把同一个 `letter of` 接收者用了 4 次
  ⇒ 恒为 false（空白永远认不出来），`limitHit` 把同一个 `maxsplit` 报告器用了 2 次 ⇒ 上限判断恒为真。
  改成每次现取（thunk）即好；**变量描述符 `F('x')` 是普通数据，可以复用**。定位手段：把可疑表达式塞进临时
  `fail %s` 打印，`COND=true lt=false lim=true` 一眼看出 `AND` 两半打架。
* **验证**：`d280` **34/34**（v4.126 9/34）；123 套快照逐例 diff（v4.126 vs v4.127）**0 回归**、
  26 条由红转绿、2 条报错文案纠正（`d274` S7「split(None,1) 仍是错误」转正；`d280` I6 由
  `TypeError: slice indices…` 变 CPython 的 `ValueError: list.index(x): x not in list`、R7 由 AttributeError 变
  `ValueError: empty separator`）；battery 23 套与 v4.126 逐例相同；`gaps433` **61/63**、featprobe **248/259**、
  `frames` fib16 `interpSteps` **6388** 均不变；`check41` **28,345 块 errors=0**；
  `rebuild-old.ps1` **v4.10…v4.127 共 118 版全 MATCH**。产物 `MiniPy_v4.127.sb3`：Interpreter 26,098 → **26,599**。
* **补丁拆分**：v4.127 = **`p200.txt`**（放在 `p199_kbd.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p127 = 'P200'`、`'v4.127' = ''`、`'v4.126' = "$p127"`，v4.125 往下 116 个条目都带上 `$p127,` 前缀。
* **残留**：`replace(old, new, count)` 的 `count` 现在会被解析但忽略（三段已切开，`srep` 还没计数；
  v4.126 那里更糟——`count` 与 `new` 被凑成元组，输出编码串）。另：`for a, *r in …`、内建 `*` 展开、
  多访问器路径别名、`d.pop(k, default, extra)`、视图集合语义、非 ASCII。
* **既有的小出入（与本轮无关）**：按当前补丁链重建的 v4.126，Controller 是 **1,532** 块而 v4.126 文档写的是
  1,456（Interpreter 一字不差，`compare.cjs` 报 MATCH——`rebuild-old` 只比对 Interpreter）。v4.127 的
  Controller 因此是 1,533 而不是 1,456+1。

## v4.135 追加（v4.126 界面轮：P199，出货 v4.126）

* **P199 物理键盘输入 32 个 ASCII 标点 + 小键盘收成一行**（界面轮，**Interpreter 一字未动**，语言层零变化）。
  `(` `)` `[` `]` `{` `}` `|` `&` `^` `~` `;` `?` `@` `$` 等以前**完全打不出来**（小键盘 24 格装不下 32 个标点，
  物理键也没接）；`.` `,` `-` `/` `=` 靠 5 个"硬改下拉值"的帽子，编辑器里显示空白、另存一次就可能被重置。
* 做法：新过程 `keypoll`（warp）里 32 个 **`按下 (连接 字符 "") 键?`**（用 `连接` 是因为帽子/菜单字段放不下这些字符，
  而侦测块的输入槽能插积木），配 `KDown`（32 项）+ `kdv` 做**上升沿检测**（按住不放只插一个字符）；挂在 Controller
  原有那一个 forever 主循环末尾，不新建帽子；删掉那 5 个标点帽子（否则同一键会被插两次）。小键盘改成一行五键
  `TAB / ENTER / BACKSPACE / CASE / SPEED`（行判断改成 5 段 `ux` 阈值，区域下沿 `-154 → -147`），背景图整组重绘
  （重算 md5 并同步 zip 条目名/`assetId`/`md5ext`）。
* **验证**（本轮用**真实按键/鼠标事件**探针，而不是 `run.mjs`）：32 个标点逐个键入 **32/32**；按住 `(` 15 帧只插 **1** 个；
  5 个键各点一次行为不变；死区 **5/5 无反应**；`check41` **27,767 块 errors=0**；`gaps433` **61/63 不变**；
  `rebuild-old.ps1` 带 `V41_SKIP='P199'` 时 v4.125 **MATCH**。
  产物 `MiniPy_v4.126.sb3`：Controller 1,216 → **1,456**，合计 27,767（Interpreter 26,098 未动）。
* **另有一个旁路包**（**没有并进主线**）：`MiniPy_v4.126_undo.sb3` = v4.126 + `PUNDO`（**50 步撤销**，
  `backup`/`undo` 重写成 `Undo`/`UndoLen` 滑动窗口栈，状态栏 `Undo: N left`）。要点：`insert` 不清 `saved`
  ⇒ 连续打字算一步；回车/退格并行/移动光标/鼠标点击/`loadCode` 等会清 ⇒ 开新的一步。复现见 `_work/v41/build_undo.cjs`
  与 `MiniPy_v4.126_undo_说明.md`；要并进主线只需在部件表加 `'pundo.txt'` 并补 `rebuild-old` 的跳表。
* **补丁拆分**：v4.126 = **`p199_kbd.txt`**（放在 `p198.txt` 之后、`p68.txt` 之前；注意它与 `p200.txt` 是**两张不同的补丁**，
  历史上有过 P199 重名——发布补丁的名字不要复用）；`rebuild-old.ps1` 里 `$p126 = 'P199'`、`'v4.126' = ''`、`'v4.125' = "$p126"`。
* **残留**：见 v4.125 §7（顺延到 v4.127），另有界面小项：`help.json` 第 3 行仍写 `ENT=new line BK=del TAB=4sp`；
  ZIP 里有一张未被引用的旧背景（v2 的 3×8 键盘）。
## v4.134 追加（v4.125 功能轮：P198，出货 v4.125）

* **P198 `for 名字 in <元素是容器的列表>` 只迭代一次（静默错）**。`for x in [[9], [8], [7]]:` 只跑 **1** 次
  （CPython 3 次）、`for x in [[1,2,3],[4,5]]:` 跑 **3** 次（CPython 2 次，第 3 次元素是空串）；
  `x = [[9],[8],[7]]` 之后再 `for v in x` 也只出第一个元素，`append([9]); append([8])` 同理。
  而 `len(x)`、`x[i]`、`print(x)` 都对 —— **只有元素是容器时**才错（元素是数字/字符串/元组的循环一直正常），
  这也是它从 v4.44（P89/P97 那批）潜伏到现在的原因。
* **根因**：`forloop` 里有**两条**列表循环路径。P89 加的元组目标路径（`for a, b in …`）顺序是
  `pushLoop(… flen …)` → 写 `LoopText` → `listitem` → `unpackto`，而**基座**的 `for 名字 in …` 是
  `listitem` → `assign` → `pushLoop(… ln …)` → 写 `LoopText`。P89 的注释早写明了第一条为什么安全：
  "**pushLoop 先调，它的实参在被调用前读取，之后绑定第一个元素就不会干扰它们**"。基座那条反着来：
  元素是容器时 `listitem` 要走 `lunesc` 的解转义长路径，绑定完 `ln` 就从 3 变成 1 ⇒ `LoopStop` 被推成 1
  ⇒ 只迭代一次（元素长度不等时还会表现为"次数偏多"，因为第一次绑定取到的值不同）。
* **修法**：把基座那条路径的四条语句按 P89 的形状**原地重排**（`pushLoop` 与写 `LoopText` 挪到
  `listitem`/`assign` 之前），不新建任何积木、不加变量/列表 ⇒ `check41` 块数与 v4.124 完全相同（27,527），
  `rebuild-old` 里跳过 `P198` 就是 v4.124。`pushLoop` 用的还是基座自己的 Stage 列表，循环驱动
  （`boundary`）一行都不用动。
* **怎么定位的（可复用的手法）**：①`_dumpnest.mjs` 把 **Stage 的 `Names`/`Values`/`Types`**（用户变量其实存在
  Stage 上，不在 Interpreter）连同字符码打出来 ⇒ 确认 `[[9],[8],[7]]` 的编码是
  `\x1fL\x1e1N9\x1fL\x1e1N8\x1fL\x1e1N7`（3 个原始分隔符，元素数正确）而 `lunesc` 用 `\x1e`+数字转义；
  ②临时调试补丁：在 `forloop` 的 `ln = ev` 之后、以及 `pushLoop` 调用之后各插一条 `fail(%s)`，把
  `ln`/`len(ltmp)`/`ltmp` 打进错误消息 ⇒ `ln = ev` 后是 **3**、`pushLoop` 后是 **1**，锁定"绑定第一个元素搅了长度"；
  ③`_pdump.cjs` 打印任意过程的语句树（含分支头）确认两条路径的顺序差异。
* **验证**：新增 `d279.json` **15 条全过**（v4.124 上 9/15；嵌套 7 条、回归 8 条），`d278` 由 25/27 升到
  **26/27**（U9 转正，只剩 U16 那个 for 头部星号）；`d277` 38、`d276` 38、`d275` 38、`d274` 42、`d273` 27、
  `d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、`d249` 42、`d248` 61 全绿；
  快照 **148 套** **144 套逐例相同**（差异 = `d279` 6 条 + `d278` 1 条 + `d242` T15 全部**由错转对**
  + `featprobe3` 的两条地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、
  `frames` fib16 **6388** 均不变；`check41` **27,527** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.125 共 116 版全 MATCH**。
  产物 `MiniPy_v4.125.sb3`：Interpreter 26,098 / 合计 **27,527** 块（**零新积木** —— 纯重排）。
* **为什么这个 bug 长期没被发现**：判分器**忽略输出末尾的空行**，于是"多跑一次空迭代"的表现
  （如 `for p in {'a': 1}.items(): print(p)` 多打一个空行）在套件里是 `same: true` —— `d242` T15 两版都"通过"，
  只有逐例 diff 才看得见输出变了。`d279` 用 `n = n + 1` 计数并在循环外打印，才把它变成可判定差异。
* **补丁拆分**：v4.125 = **`p198.txt`**（放在 `p197.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p125 = 'P198'`，`'v4.125' = ''`，`'v4.124' = "$p125"`，v4.123 往下 115 个条目都带上 `$p125,` 前缀。
* **残留**：`for a, *r in …`（for 头部星号目标）；内建 `*` 展开（`max(*xs)`、`zip(*m)`）；`obj.m(*xs)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；`find`/`rfind`/`count` 的 `end`；
  `index(x, start, end)` 的 `end`；`split(None, maxsplit)`；`rsplit`；`d.pop(k, default, extra)`；视图集合语义；非 ASCII。
## v4.133 追加（v4.124 功能轮：P197，出货 v4.124）

* **P197 扩展解包赋值 `a, *rest = …`**。`a, *rest = [1, 2, 3]` 以前报 `SyntaxError: invalid assignment target`，
  `*init, last = [1, 2, 3]` 报 `SyntaxError: missing expression`（CPython 分别给 `1`/`[2, 3]` 与 `[1, 2]`/`3`）。
* **根因（两个入口各一半）**：`assignlist` 用**固定步长**走目标（`if Kind[mi] != "I" then fail(…invalid assignment
  target…)` 且 `mi += 2`），星号是标点 ⇒ 直接被顶掉；而以 `*` 开头的**整条语句**根本进不了 `assignlist` —— 语句派发把
  `*` 当运算符，表达式路径于是报 `missing expression`。
* **修法三步（都在 `assignlist` 与它的调用点）**：
  1. 名字循环认识"标点 `*` + 名字"：把 `mi` 前进一格，并把星号记进平行列表 `AStar`（每个名字一个 0/1）与 `auexs` 标志；
  2. 有星号时自己绑定：整个右侧**只求值一次**（P84 的容器解包早就这么干），星号前的名字取前面的元素、星号后的取
     **最后**的元素、星号那个名字取**中间那一段并做成列表**（元组源也给列表）；字符串按字符、字典按键、
     列表/元组/集合按元素，其它报 `TypeError: cannot unpack non-iterable <类型> object`（类型名走 P134 的 `tname`）；
  3. `execute` 里"`名字 , … = …`"那条分支的条件（`Kind[1] == "I" and Tok[2] == ","`）再加一条"`Tok[1] == "*"` 且
     `Kind[2] == "I"` 且 `Tok[3] == ","`"的备选。
* **一个坑（步长）**：星号的前进在检测里已经做过（`mi += 1`），所以步长**必须留 2**；一度写成 `2 + auex` 就变成三格，
  `*init, last` 里的 `last` 被跳过 —— `AName` 只收到一个名字，连带把"单独星号"的判据也误触发（`*init, last` 被当成
  `*r = …` 报错）。另一个连锁现象：`a, *mid, b` 的中间段上界是 `aun - (名字数 - 星号位置)`，名字数对了它自然就对。
* **错误文案照本机 CPython**（P185 的教训）：`ValueError: not enough values to unpack (expected at least N, got M)`、
  `TypeError: cannot unpack non-iterable int object`、`SyntaxError: starred assignment target must be in a list or tuple`。
* **验证**：新增 `d278.json` **27 条 25 通过**（v4.123 上 12/27；星号 13/13、报错 6/6、回归 6/6，余 2 条是已知缺口）；
  `d277` 38、`d276` 38、`d275` 38、`d274` 42、`d273` 27、`d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、
  `d249` 42、`d248` 61 全绿；快照 **147 套** **144 套逐例相同**（差异 = `d278` 的 18 条由错转对
  + `t113` F6 的 CPython 集合遍历顺序噪声 + `featprobe3` 的两条地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **27,527** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.124 共 115 版全 MATCH**。
  产物 `MiniPy_v4.124.sb3`：Interpreter 26,098 / 合计 **27,527** 块（+149 块、+7 变量、+1 列表 `AStar`）。
* **补丁拆分**：v4.124 = **`p197.txt`**（放在 `p196.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p124 = 'P197'`，`'v4.124' = ''`，`'v4.123' = "$p124"`，v4.122 往下 114 个条目都带上 `$p124,` 前缀。
* **⚠️ 同轮探针挖出一个更严重的既有 bug（下一轮第一候选 · 静默错）**：**遍历"元素是容器的列表"时循环次数错** ——
  `for x in [[9], [8], [7]]:` 只跑 **1** 次（CPython 3 次）、`for x in [[1,2,3],[4,5]]:` 跑 **3** 次（CPython 2 次，
  第 3 次拿到的元素是空串）；`[]` + `x.append([9])` / `x.append([8])` 之后再遍历也只出第一个元素。**而 `len(x)` 是对的**
  （3 / 2）、下标 `x[0..2]` 也对、平铺列表 / 字符串 / 元组 / 字典的循环都对。
  **v4.123 上同样存在**（不是本轮引入，探针 `_work/cmp47/_nest.json`：v4.123 上 Q1/Q2 红、Q3/Q4/Q5 绿）。
  方向：`len()` 与 `for` 用的是同一份编码却给出不同答案，嫌疑在 for 那一侧 —— `forloop` 把 `listlen(ltmp)` 当
  `LoopStop`（`listlen` 是"数 `lsep` 字符"的实现），而 `LoopText` 里存的是同一个编码；要么 `listlen` 对**带转义的**
  编码数错，要么 `LoopText` 在存/取时被再转义了一次。**定位工具已备好**：临时给「星号绑定入口」插一条日志到新列表的
  调试构建 + `_dbg124state.mjs`（可改成给 `ltmp`/`LoopText` 打日志），以及 `_dumpvars.mjs`（转储任意变量的原始编码与
  字符码）。
* **残留**：嵌套列表的循环次数（见上）；`for a, *r in …`；内建 `*` 展开（`max(*xs)`、`zip(*m)`）；`obj.m(*xs)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；`find`/`rfind`/`count` 的 `end`；
  `index(x, start, end)` 的 `end`；`split(None, maxsplit)`；`rsplit`；`d.pop(k, default, extra)`；视图集合语义；非 ASCII。
## v4.132 追加（v4.123 功能轮：P196，出货 v4.123）

* **P196 `min(xs, key=f)` / `max(xs, key=f)`**。`min([3, 1, 2], key=lambda x: x)` 以前报 `SyntaxError: expression`
  （CPython `1`）、`max(['bb','a','ccc'], key=len)` 同样（CPython `ccc`）。
* **根因**：`eval` 只在把调用交给 `calluser` 时才认 `name=value`（P100/P165）；内建带关键字会落进"数顶层逗号"
  那一支，`=` 让 `eval` 报 `SyntaxError: expression`。**修法**：在 **`narg == 0` 派发正前方**加钩子
  （与 `sum(xs, start)`／`enumerate(xs, start)`／`sorted(x, key=…)` 三个钩子同位置；到那里 `narg` 已数好顶层逗号、
  `qcut` 是第一个），只对"名字是 min/max + `narg > 0` + 存在顶层 `name =` 片段"生效 ⇒ **没有关键字时钩子只写自己的
  `mk*` 暂存**，老的 `builtin2`（两实参）与 `minmax`（多实参）一个字节都不变。
  **一个坑**：`narg == 0` 那条判据挂在 **`control_if_else`** 上（不是 `control_if`）—— 第一版只找 `control_if`，
  构建期报 `[P196] narg dispatch = 0`。
* **位置片段**：**一个**就是可迭代对象（字符串 → `charsplit` 按字符、字典 → `dictkeys` 按键、列表/元组/集合原样，
  其它报 CPython 的 `TypeError: '<类型>' object is not iterable`，类型名走 P134 的 `tname`）；**多个**则逐个求值、
  `lesc` 转义后拼成编码列表 ⇒ `min(3, 1, 2, key=f)`、`max(-1, -5, key=abs)` 都对。拼列表用绝对 token 位置扫描
  （`mkpos` 是当前片段的起点、`mkpn` 是下一段起点，`mkpn = 0` 作结束哨兵），片段内的顶层逗号才分段。
* **key 函数**：`eval(key 值)` 得到函数值（`FnName` 下标）或单 token 内建名（`len`/`abs`/…）——正好是 P130 `callval`
  收的两种形状，所以调用机制整个复用：把元素 `repr` 成字面量 → 临时替换 `Tok` → `calluser`/`callfn` → `tokenize(Code[pc])`
  还原当前行 token。
* **比较**：复用 P138 的 `lcmp`（数字/布尔/字符串/元组/列表；混用报 CPython 的 `'<' not supported between instances of …`）。
  新过程 `minkey` 只在**严格更优**时替换最优元素 ⇒ 相等时保留**先出现**的那个（与 CPython 的 `min`/`max` 一致）。
  空序列报本机 CPython 的 `ValueError: min() iterable argument is empty`（与无 key 路径同一说法 —— P185 的教训：
  文案问本机解释器，不靠记忆）；未知关键字报 `TypeError: min() got an unexpected keyword argument 'foo'`（带引号）。
* **验证**：新增 `d277.json` **38 条全过**（v4.122 上 15/38；key 形式 23 条、报错 8 条、回归 7 条）；
  `d276` 38、`d275` 38、`d274` 42、`d273` 27、`d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、`d249` 42、`d248` 61 全绿；
  快照 **146 套** **143 套逐例相同**（差异 = `d277` 的 29 条由错转对 + `t111h` M4 的 CPython 集合
  遍历顺序 + `featprobe3` 的两条地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、
  `frames` fib16 **6388** 均不变；`check41` **27,378** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.123 共 114 版全 MATCH**。
  产物 `MiniPy_v4.123.sb3`：Interpreter 25,949 / 合计 **27,378** 块（+292 块、+21 变量、**+1 过程 `minkey`**）。
* **补丁拆分**：v4.123 = **`p196.txt`**（放在 `p195.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p123 = 'P196'`，`'v4.123' = ''`，`'v4.122' = "$p123"`，v4.121 往下 113 个条目都带上 `$p123,` 前缀。
* **残留**：扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`、`zip(*m)`）；`obj.m(*xs)`；多访问器路径别名
  （`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；`find`/`rfind`/`count` 的 `end`；`index(x, start, end)` 的 `end`；
  `split(None, maxsplit)`；`rsplit`；`d.pop(k, default, extra)`；视图集合语义；非 ASCII。
  （小候选：`sorted` 的未知关键字文案少一对引号，`min`/`max` 这一路已按 CPython 带上引号。）
## v4.131 追加（v4.122 功能轮：P195，出货 v4.122）

* **P195 布尔在位运算与一元运算里的三个缺口**（共同点是"检查写在被检查的东西长大之前"）：
  `True | 1`／`True & 1`／`True << 2` 报 `TypeError: bitwise requires integers`（而 `1 & True`、`-1 | True` 是对的）、
  `~-1`／`~+1` 报 `SyntaxError: unexpected token`、`~True`／`-True` 报 `TypeError: numeric operand`。
* **(a) 位运算的类型检查漏了"左操作数是布尔"**：P10 把 `rightside` 里所有读 `lefttype` 的地方改写成归一化后的
  `lt2`（`if lt2 == "B" then lt2 = "N"`），但 **P25 的位运算分支是 P10 之后才插进去的**，它的 `intCheck()` 读的
  还是 `argOf('lefttype')`，于是看到 `"B"` 就报错。定位手法：dump 出货版 `rightside` 里所有 `== "N"` 比较，
  只有两个的左操作数是 `argReporter lefttype`；把那两处（每个 arm 一处）换成内联的 `[12,'lt2',id]` 即可
  （P10 当年就是这么改的 —— 表达式槽要直接写内联变量描述符，`replaceExpr` 只收积木 id）。
* **(b) 两个布尔做 `& | ^` 结果仍是布尔**（`True | False`→`True`，`True | 1`→`1`）：P139 早就把**原始**操作数类型
  存进 `lt0`/`evt0`，所以在 `& | ^` 那一臂末尾的 `evtype = "N"` 之后补一句
  `if lt0 == "B" and evt0 == "B" then evtype = "B"`。**只做 (a) 的话 `True | False` 会打印 `1`** —— 值对、表示不对，
  而 CPython 的这条规则（两个布尔 → 布尔，混合 → 整数）正是 `print` 出来的东西。
* **(c) `~` 没进"上一个 token 是运算符吗"那张表**：`eval` 把表达式按**最低优先级运算符**切开，判断"这个 `-`/`+`
  是一元还是二元"用的是 `eprev`（扫描位置的前一个 token）是否属于
  `( + - * / % // == < > <= >= != and or **` —— 这张表写在 P57 把 `~` 加进**一元判定**之前，所以少了 `~`。
  于是 `~-1` 在 `-` 处被切开、左半边成了单独的 `~`，`atom` 报 `unexpected token`；`~5` 能用是因为那种写法扫不到
  运算符、直接走一元判定，`-~1` 能用是因为 `~` 从来不是二元运算符。**定位过程**：先用逐步插桩（临时给 `eval`/
  `unary`/`atom` 各插一条轨迹写入新列表）看到 `eval(3,5) → eval(3,3) → atom(3) = "~"`，再顺 `Tok[ek-1]`（存进
  `eprev`）找到那张 16 项的表，最后按"OR 链最外层只有一个"的判据把它加长一项。
* **(d) `unary` 的数值检查不收布尔**：它写的是 `if evtype != "N" then fail("TypeError: numeric operand")`，
  所以 `~True`/`-True` 报错（CPython `-2`/`-1`）。检查放宽成"不是 `N` 也不是 `B`"，并在 `-`/`+`/`~` 那一串分支的
  末尾补 `evtype = "N"`（布尔进来、整数出去）。
* **验证**：新增 `d276.json` **38 条全过**（v4.121 上 11/38；布尔位运算 14 条、`~` 与负号 11 条、回归 11 条、
  原缺口 2 条转正），`d275` 由 36/38 升到 **38/38**（它记录的两条缺口正是本轮修的）；`d274` 42、`d273` 27、
  `d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、`d249` 42、`d248` 61 全绿；
  快照 **145 套** **141 套逐例相同**（差异 = `d276` 的 27 条 + `d275` 的 2 条，全部**由错转对**
  + `t111h` M4 的 CPython 集合遍历顺序 + `featprobe3` 的两条地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **27,086** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.122 共 113 版全 MATCH**。
  产物 `MiniPy_v4.122.sb3`：Interpreter 25,657 / 合计 **27,086** 块（+9 块，无新过程/变量/列表）。
* **补丁拆分**：v4.122 = **`p195.txt`**（放在 `p194.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p122 = 'P195'`，`'v4.122' = ''`，`'v4.121' = "$p122"`，v4.120 往下 112 个条目都带上 `$p122,` 前缀。
* **残留**：`min/max(key=…)`；扩展解包 `a, *rest = …`；多访问器路径别名（`b = a[0][1]`，留档
  `_work/v41/_p176_twoaccessor.txt`）；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；`find`/`rfind`/`count` 的 `end`；
  `index(x, start, end)` 的 `end`；`split(None, maxsplit)`；`rsplit`；`d.pop(k, default, extra)`；视图集合语义；非 ASCII。
## v4.130 追加（v4.121 功能轮：P194，出货 v4.121）

* **P194 位运算收负数**。`-1 | 0` 以前抛 `ValueError: bitwise needs non-negative integers`（CPython `-1`），
  `-2 & 3`（应 `2`）、`-1 ^ 1`（应 `-2`）、`-5 & -3`（应 `-7`）、`-1 << 2`（应 `-4`）、`-8 >> 1`（应 `-4`）同样。
* **根因**：P25 的 `intCheck()` 里有一条显式的 `if 任一侧 < 0 then fail` —— `bitop` 用
  "逐位 `mod 2` / `floor(/2)` 累加"描述整数，这套描述只对非负数成立。**三步改**：
  1. 两条守卫的条件置为**恒假**（`EQ(0, 1)` 顶掉原条件块），数值路由交给下面两步；
  2. **`<<` / `>>` 的数值本来就不用改**：移位臂写的是"重复乘 2"与"重复 `floor(x / 2)`"，
     对负数与 CPython 一致（`-3 >> 1 = floor(-1.5) = -2`）。补的是**真正该报的那个错**：
     移位次数为负 ⇒ CPython 的 `ValueError: negative shift count`（插在移位臂 `bt_r = leftval` 之前，
     位置靠"`bt_r` 被赋成 `argOf('leftval')` 的那条 `setV`"唯一确定）；
  3. **`& | ^` 用二补数**：取宽度 `2^W`（`2` 起倍增到 `> 2*max(|a|,|b|)`，封顶 `2^53`），
     负操作数映射成 `x + 2^W`、调原来的 `bitop`、结果 `>= 2^(W-1)` 再减回 `2^W`。
* **为什么不用固定 64 位**：Scratch 的数是双精度，`2^64 - 1` 存不下（会变成 `2^64`），固定宽度反而算错；
  而"刚好容纳两个操作数"的宽度让所有中间值 < `2^53`，全程精确。映射对 `& | ^` 是等价的
  （结果只取决于各二进制位，`2^(W-1) > max(|a|,|b|)` 保证高位符号位一致），所以宽度够小反而更准。
  精度边界：`max(|a|, |b|) < 2^52` 时精确（`x + 2^W < 2^53`），再大就落进本工程固有的"大整数"限制。
* **只有真有负数时才映射与回代**（`bt_neg` 标记）：没有负数时 `bt_a`/`bt_b` 只是原值的一份拷贝，
  宽度扫描与回代都不执行 ⇒ `(1 << 40) | 1` 这类大正数结果一字不变（这条特意写进套件当回归）。
* **三个坑（都是构建期/语义期的）**：①判"某个输入是不是参数 reporter"要用 `typeof v[1] === 'string'`，
  不能照抄字面量的 `Array.isArray(v[1])`（reporter 是积木 id 字符串，第一版因此报 `shift base set = 0`）；
  ②`rightside` 的 `leftval` 是**过程参数**，读它必须 `argOf('leftval')` —— `VAR('leftval')` 会报
  `no variable leftval in Interpreter`；③算宽度时 `bt_b` 要取**绝对值**（第一版写成 `0 - bt_b`，
  于是正的右操作数"没进宽度"，`-1 & 1024` 给 0、`-4 & -3 & 12` 给 -4）；补上 `bt_n = |bt_b|` 后 36/38。
* **验证**：新增 `d275.json` **38 条 36 通过**（v4.120 上 12/38；负数 16/16、移位 6/6、报错 6/6、回归 8/8，
  余 2 条是下面两条新缺口）；`d274` 42、`d273` 27、`d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、
  `d249` 42、`d248` 61 全绿；快照 **144 套** **140 套逐例相同**
  （差异 = `d275` 的 27 条 + `d274` 的 1 条，共 28 条全为**由错转对** + `t111h` M4 的 CPython 集合遍历顺序
  + `featprobe3` 的两条地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、
  `frames` fib16 **6388** 均不变；`check41` **27,077** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.121 共 112 版全 MATCH**。
  产物 `MiniPy_v4.121.sb3`：Interpreter 25,648 / 合计 **27,077** 块（+40 块、+4 变量 `bt_m`/`bt_n`/`bt_w`/`bt_neg`，
  无新过程/新列表）。
* **补丁拆分**：v4.121 = **`p194.txt`**（放在 `p193.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p121 = 'P194'`，`'v4.121' = ''`，`'v4.120' = "$p121"`，v4.119 往下 111 个条目都带上 `$p121,` 前缀。
* **同轮探针另发现（下一轮第一候选）**：**布尔字面量在左侧**的位运算报 `TypeError: bitwise requires integers` ——
  `True | 1`、`True & 1`、`True << 2`、`True | False`（而 `1 & True`、`-1 | True` 都对）。根因已定位：
  dump 出货版 `rightside` 里所有 `== "N"` 比较，只有两个 `operator_equals` 的左操作数是
  `argReporter lefttype`（其余位置都已是 P10 归一化后的 `VAR('lt2')`）—— P10 的 `lefttype → lt2` 改写发生在
  **P25 之前**，位运算那两块是后来才插进去的。修法＝把那两处换成 `VAR('lt2')`。
  另一条：`~-1`（一元 `~` 后跟一元 `-`）报 `SyntaxError: unexpected token`（CPython `0`）。
* **残留**：布尔在左的位运算；`~-1`；`min/max(key=…)`；扩展解包 `a, *rest = …`；多访问器路径别名
  （`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；
  `find`/`rfind`/`count` 的 `end`；`index(x, start, end)` 的 `end`；`split(None, maxsplit)`；`rsplit`；
  `d.pop(k, default, extra)`；视图集合语义；非 ASCII。
## v4.129 追加（v4.120 功能轮：P193，出货 v4.120）

* **P193 字典 `|` 合并 + `split(None)`**。`{1: 2} | {3: 4}` 以前抛 `TypeError: bitwise requires integers`
  （CPython `{1: 2, 3: 4}`）、`d |= {3: 4}` 同样；`'a b  c'.split(None)` 以前抛 `ValueError: empty separator`
  （CPython `['a', 'b', 'c']`）。
* **根因与修法（字典 `|`）**：`rightside` 的位运算分支是 `op in ("^", "&", "|")` 且"不同时是集合"，非数字操作数会掉进
  P25 手写的位串路径、以 `fail("TypeError: bitwise requires integers")` 收尾 —— 字典正卡在这里。修法是在那个分支
  **前面**插一层 `if op == "|" and (lt2 == "D" or evtype == "D") then`：两边都是字典就调 P167 的
  `dupd(左值, ev)`（**就地重建**记录、结果留在 `ev` ⇒ 拿到的是**新**字典，不与任一操作数共享，键序"左在前、新键追加"），
  否则走 `binerr("|")` ⇒ `{1: 2} | [1]` 报 CPython 的 `unsupported operand type(s) for |: 'dict' and 'list'`
  （而不是误报位运算文案）；位运算分支自己的条件再 `and not (两边都是字典)`，免得合并好的值又被位串路径覆盖。
  `|=` 走 P70 的增强赋值、同样落到 `rightside`，一处修好两处都对。**定位手法**：位运算分支与"集合按位"分支形状相同
  （都用同一串 `"^"`/`"|"`/`"&"` 字面量），所以判据要再加上"它的 SUBSTACK 里就有那句 `bitwise requires integers` 的
  fail"才唯一（第一版只按字面量找，命中 2 个）。
* **根因与修法（`split(None)`）**：P115 的派发是
  `if smarg == 0 then ssplitw else (if sma1 == "" then fail else ssplit)`，而 `None` 实参送来的是
  **空串 + 类型 `Z`** ⇒ 直接撞上 ValueError 那一臂。把内层 if 的条件放宽成 `smt1 == "Z" or sma1 == ""`、
  分支体换成 `if smt1 == "Z" and smmax < 0 then ssplitw else fail` ⇒ 显式空串照旧报错、`None` 走现成的空白切分器
  （`ssplitw` 就是无参 `split()` 用的那个）。带上限的 `split(None, maxsplit)` **故意**仍报错：空白切分器没有上限，
  报错好过给错答案（已记为残留）。实参 reporter 只能挂在一处，所以复用的是**别的调用**里那个（`dupInput`：字符串 id
  要 `cloneExpr`，描述符直接深拷贝）。
* **验证**：新增 `d274.json` **42 条 40 通过**（v4.119 上 13/42；分类：合并 20/20、操作数类型报错 6/6、位运算与集合回归 8/8、
  `split(None)` 6/7、负数位运算 1 条仍红）；`d273` 27、`d272` 29、`d271` 31、`d265` 32、`d264` 32、`d250` 26、`d249` 42、`d248` 61 全绿；
  快照 **143 套** **139 套逐例相同**（4 处差异 = `d274` 的 32 条 —— 27 条**由错转对** + 5 条**报错文案对齐 CPython** ——
  加上 `t111h` M4 / `t113` F6（CPython 集合遍历顺序，两版 MiniPy 输出逐字相同）+ `featprobe3` 的两条地址）
  ⇒ **MiniPy 侧零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **27,034** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.120 共 111 版全 MATCH**。
  产物 `MiniPy_v4.120.sb3`：Interpreter 25,605 / 合计 **27,034** 块（+33 块，无新过程/新变量/新列表）。
* **补丁拆分**：v4.120 = **`p193.txt`**（放在 `p192.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p120 = 'P193'`，`'v4.120' = ''`，`'v4.119' = "$p120"`，v4.118 往下 110 个条目都带上 `$p120,` 前缀。
* **同轮探针另发现（下一轮第一候选）**：**负数的位运算全报错** —— `-1 | 0` 报
  `ValueError: bitwise needs non-negative integers`（CPython `-1`）、`-2 & 3` 应为 `2`、`-1 ^ 1` 应为 `-2`。
  代码在 P25：`bitop` 用二进制逐位拆解（只做非负），且 `intCheck()` 里有一条 `if 任一侧 < 0 then fail` 的显式守卫。
  方向：`<<`/`>>` **去掉守卫即可**（`<<` 是乘 2、`>>` 是 `floor(x/2)`，对负数本就和 CPython 一致），
  `& | ^` 要按 64 位补码做（负数先 `x mod 2^64`，算完若最高位为 1 再减 `2^64`；`bitop` 的 62 轮上限要放宽）。
* **残留**：`min/max(key=…)`；扩展解包 `a, *rest = …`；多访问器路径别名（`b = a[0][1]`，留档
  `_work/v41/_p176_twoaccessor.txt`）；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；`find`/`rfind`/`count` 的 `end`；
  `index(x, start, end)` 的 `end`；`split(None, maxsplit)`；`rsplit`；`d.pop(k, default, extra)`；视图集合语义；非 ASCII；
  **负数位运算**（本轮新发现）。
## v4.128 追加（v4.119 功能轮：P192，出货 v4.119）

* **P192 `dict.pop(key, default)`**。`d.pop('x', 9)` 以前抛 `KeyError: 'x'`，CPython 返回默认值并让字典原封不动。
  `dictmeth` 的 get/pop 分支（P91）先查键：查到就返回值（`pop` 还要重写记录串去掉那一对），查不到就走 **`get`** 那条臂——
  P117 正是在那里插了 `if meth == "pop" then fail(KeyError: '<键>')`。所以缺的只是"第二个实参＝默认值"这一支，
  而 `get` 早就实现了同一判据（`if tqhcm == 1 then eval(tqcpz + 1, hi) else (ev = ""; evtype = "Z")`）。
  本轮把那句 KeyError 包进同样的测试：有默认值就求值默认表达式（`eval` 会把值与类型都留在 `ev`/`evtype`），
  没有就照旧抛错。**默认值表达式里的逗号**（`d.pop('q', (1, 2))`、`[1, 2]`）不受影响 —— 顶层逗号判据找的是第一个 ✓。
* **验证**：新增 `d273.json` **27/27**（v4.118 上 10/27：命中/未命中、`None`、变量、表达式、列表/元组/字典默认值、
  变量键、未命中后字典不变、命中后变短、表达式里用、循环里用、空字典、字符串/布尔默认值、嵌套调用与 f-string 默认值；
  缺键报错 3 条；`pop`/`get`/`popitem`/`setdefault`/`del`/推导式回归 6 条）；
  `d272` 29、`d271` 31、`d263` 24、`d265` 32、`d264` 32、`d250` 26、`d249` 42、`d248` 61 全绿；
  快照 **142 套** **138 套逐例相同**（4 处差异 = `d273` 的 17 条由错转对 + `t111h` M4/`t113` F6 集合遍历顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **27,001** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.119 共 110 版全 MATCH**。
  产物 `MiniPy_v4.119.sb3`：Interpreter 25,572 / 合计 **27,001** 块（+5 块，无新过程/变量/列表）。
* **补丁拆分**：v4.119 = **`p192.txt`**（放在 `p191.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p119 = 'P192'`，`'v4.119' = ''`，`'v4.118' = "$p119"`，v4.117 往下 109 个条目都带上 `"$p119,$p118"` 前缀。
* **残留**：`d.pop('x', 9, 8)`（CPython 报太多实参）；`split(None)` / `split(None, maxsplit)`；`rsplit`；
  `index(x, start, end)` 的 `end`；`min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，留档
  `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；
  字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.127 追加（v4.118 功能轮：P191，出货 v4.118）

* **P191 `split(sep, maxsplit)` + 三个静默给错答案的空字段 bug**。`'a,b,c'.split(',', 1)` 以前给
  `['a', 'b', 'c']`（第二个实参被忽略）、`split(',', 0)` 同样，CPython 是 `['a', 'b,c']` / `['a,b,c']`。
  顺手挖出同源的三条**静默错**：`''.split(',')`→`[]`（CPython `['']`）、`','.split(',')`→`['']`（`['', '']`）、
  `'a,'.split(',')`→`['a']`（`['a', '']`）。
* **根因与修法**：`ssplit` 是"扫到分隔符才添一段"的循环，最后用 `if cursor <= len` 添尾巴；而尾巴判据写的是
  `cursor > len` 就跳过 ⇒ 尾随分隔符（游标正好落在 `len+1`）丢掉空尾巴、空串根本不进循环。判据改成
  `cursor <= len + 1`（即"还有一段，可能是空的"）⇒ 三条一起修好。
  **maxsplit** 走全局 `smmax`（`-1` = 不限）：字符串派发早把第二个实参放在 `sma2`、类型在 `smt2`、逗号位置在 `mcut`，
  派发处据此求值（非整数按 CPython 的 `TypeError: '<类型>' object cannot be interpreted as an integer` 拒绝，
  浮点看文本里的 `.`，与 P170/P176/P190 同规则）；`ssplit` 用新变量 `smcnt` 记命中次数，搜索循环的条件再 `or` 上
  "已到上限"，剩下的那一整段就交给尾巴添加 ⇒ 上限内的切分与"剩余部分原样保留"都对。
* **验证**：新增 `d272.json` **29/29**（v4.117 上 14/29：maxsplit 12 条——1/2/0/5/-1、空格与多字符分隔符、
  表达式与变量上限、与 `join` 连用；空字段 8 条——空串、只有一个分隔符、前导/尾随/连续分隔符、空串的无参 `split()`；
  类型错 3 条；回归 6 条）；`d271` 31、`d270` 26、`d269` 28、`d268` 22、`d267` 29、`d266` 24、`d265` 32、`d264` 32、`d263` 24 全绿；
  快照 **141 套** **137 套逐例相同**（4 处差异 = `d272` 的 15 条由错转对 + `t111h` M4/`t113` F6 集合遍历顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,996** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.118 共 109 版全 MATCH**。
  产物 `MiniPy_v4.118.sb3`：Interpreter 25,567 / 合计 **26,996** 块（+26 块、2 个新变量 `smmax`/`smcnt`，无新过程/新列表）。
* **补丁拆分**：v4.118 = **`p191.txt`**（放在 `p190.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p118 = 'P191'`，`'v4.118' = ''`，`'v4.117' = "$p118"`，v4.116 往下 108 个条目都带上 `"$p118,$p117"` 前缀。
* **残留**：`split(None)` / `split(None, maxsplit)`（显式 `None` 仍报 `ValueError: empty separator`；空白切分器没有上限）；
  `rsplit`（完全没有）；`d.pop(k, default)`；`index(x, start, end)` 的 `end`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.126 追加（v4.117 功能轮：P190，出货 v4.117）

* **P190 `index(x, start)` 对列表/元组/字符串都生效**。CPython 的 `index` 收一个起始位置（还能收 `end`，仍缺）：
  `[1, 2, 1].index(1, 1)`→`2`、`(1, 2, 1).index(1, 1)`→`2`、`'abca'.index('a', 1)`→`3`，而 MiniPy 分别是
  `ValueError: list.index(x): x not in list`、`ValueError: tuple.index(x): x not in tuple`、`0`（字符串那条**完全忽略**第二个实参）。
* **两个不同的成因**：①字符串（P75）的 `index` 分支只调 `sfind(smrec, sma1)`；P177 的 `sfind2 <记录> <子串> <起点>`
  本来就是"从起点找"，而字符串派发早把起点放在 `sma2`、逗号位置放在 `mcut` ⇒ 改成 `if mcut > 0 then sfind2 else sfind`，
  两条后面都跟同一个 ValueError。②列表/元组（P13）的分支把**整段实参**当一个表达式求值 ⇒ 第二个实参变成元组、
  于是去找那个元组；现在先扫这段里的**第一个顶层逗号**（沿用 `insert` 分支的写法，再加花括号与 P184 的"字符串不算逗号"），
  分别求值"要找的值"与"起点"，起点为负时按长度归一、再钳到 0，扫描游标从那里开始。
* **一个坑（顺序就是一切）**：那个分支紧接着还有一对 `lneed = ev` / `lnt = evtype`。若先求值"要找的值"、后求值"起点"，
  这对语句会把 `lneed` 覆盖成**起点** —— 第一版正是如此，所有两实参调用都去搜起点值而报 "not in list"。
  修法不是删那对语句（`predecessorOf` 在旧链上不可靠，删错会把整条尾巴摘掉 —— 试过，结果 `index(2)` 直接返回 `2`），
  而是**把起点先求值、要找的值最后求值**，让 `ev` 停在需要的东西上。
  起点类型按 CPython 的 `TypeError: slice indices must be integers or have an __index__ method` 拒绝（浮点按文本里的 `.` 判、
  布尔按 `B` 放行 ⇒ `[1, 2, 3].index(2, True)`→`1`）。
* **验证**：新增 `d271.json` **31/31**（v4.116 上 15/31：列表 15 条含 0/1/负数/超界/负超界/变量/表达式/浮点与布尔起点、
  元组 3 条、字符串 9 条、`count`/`find`/`remove` 回归 4 条）；`d270` 26、`d269` 28、`d268` 22、`d267` 29、`d266` 24、`d265` 32、`d264` 32、`d263` 24 全绿；
  快照 **140 套** **137 套逐例相同**（3 处差异 = `d271` 的 17 条由错转对 + `t113` F6 集合遍历顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,970** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.117 共 108 版全 MATCH**。
  产物 `MiniPy_v4.117.sb3`：Interpreter 25,541 / 合计 **26,970** 块（+81 块、1 个新变量 `lsstart`，无新过程/新列表）。
* **补丁拆分**：v4.117 = **`p190.txt`**（放在 `p189.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p117 = 'P190'`，`'v4.117' = ''`，`'v4.116' = "$p117"`，v4.115 往下 107 个条目都带上 `"$p117,$p116"` 前缀。
* **残留**：`index(x, start, end)` 的 `end`（第二个逗号）；`find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；
  列表 `count` 多给实参时 CPython 报 TypeError 而 MiniPy 不报；`split(sep, maxsplit)`；`d.pop(k, default)`；
  `min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；视图集合语义；非 ASCII。
## v4.125 追加（v4.116 功能轮：P189，出货 v4.116）

* **P189 `join` 收字符串（顺带收集合）**：v4.108 撤下来的那一半补齐。`'-'.join('ab')` 以前报
  `TypeError: join needs a list`（`','.join('')`、`''.join('ab')`、`','.join('a,b')` 同理）。
  v4.108 那次失败的原因是**对 `ev` 做了 `charsplit`，而那一刻 `ev` 里是收信者（分隔符）**，于是收信者变成列表、
  报 `AttributeError: 'list' object has no attribute 'join'`。P182 处理字典那半已经给出了安全形状：
  把**实参** `sma1` 搬进 `ev` → 调内核 → 结果抄回 `sma1` → 改标记，所以本轮对 `smt1 == "S"` 照做：
  `if smt1 == "S" then (ev = sma1; charsplit; sma1 = ev; smt1 = "L")`。`charsplit`（P143）把字符串变成字符的列表编码，
  正是 P181 的元素检查与 `sjoin` 期待的东西，收信者一个字都不碰。
* **集合也顺带能用了**：`'-'.join({'a'})` → `a`。集合的元素本来就是列表编码（P110/P124），只差一个标记，
  所以再补一句 `if smt1 == "E" then smt1 = "L"`。**注意**：多元素**字符串**集合在 CPython 里是哈希序（逐次运行可能不同），
  属于噪声，套件里只测单元素集合。
* **验证**：新增 `d270.json` **26/26**（v4.115 上 8/26：字符串 17 条含变量/分隔符变量/单字符/空串/含分隔符的串/
  f-string/嵌套 join/`len`/重复后再 join/函数体/`str()`/`reversed`/切片/推导式，集合 3 条，列表·元组·字典与
  三类报错的回归 6 条）；`d263` 24、`d262` 8、`d269` 28、`d268` 22、`d267` 29、`d266` 24、`d265` 32、`d264` 32 全绿；
  快照 **139 套** **136 套逐例相同**（3 处差异 = `d270` 的 19 条由错转对 + `t111h` M4 集合遍历顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,889** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.116 共 107 版全 MATCH**。
  产物 `MiniPy_v4.116.sb3`：Interpreter 25,460 / 合计 **26,889** 块（+9 块，无新过程/变量/列表）。
* **补丁拆分**：v4.116 = **`p189.txt`**（放在 `p188.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p116 = 'P189'`，`'v4.116' = ''`，`'v4.115' = "$p116"`，v4.114 往下 106 个条目都带上 `"$p116,$p115"` 前缀。
* **残留**：列表 `index(x, start)`；`split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；
  视图集合语义；非 ASCII。
## v4.124 追加（v4.115 功能轮：P188，出货 v4.115）

* **P188 元组也能用 `*` 重复**（v4.110 试过、当时只好撤回的那一条）。`(1, 2) * 2` 以前报
  `TypeError: unsupported operand type(s) for *: 'tuple' and 'int'`，`2 * (1, 2)` 更糟：打出**未解码的记录串**两遍
  （`\x1fN1\x1fN2\x1fN1\x1fN2`）。CPython 把元组当序列重复，`(1, 2) * 2` 就是 `(1, 2, 1, 2)`。
* **两处都要改，只改第一处正是 v4.110 失败的原因**：①`rightside` 里两个重复分支的顺序侧判据是
  `lt2 == "L"` / `evtype == "L"`（v4.110 放宽的正是它们，结果标记也跟着顺序侧走）；
  ②紧跟其后的**字符串重复分支**写成 `op == "*" and (lt2 == "S" or evtype != "N") and not (lt2 == "L" or evtype == "L")`
  —— 列表分支把结果标成 `"T"` 之后，这条件**又成立**，于是字符串分支用那份"记录串"再重复一遍并改回 `evtype == "S"`
  ⇒ v4.110 才会打出空行/乱码。本轮把字符串分支收紧成 `lt2 == "S" or evtype == "S"`（必须真有一侧是字符串），
  再放宽两个序列分支（`L` 或 `T`，结果标记取顺序侧）。非法组合照旧报错：P139 的 `*` 合法性检查本来就把元组算作序列，
  所以 `(1, 2) * 1.5`、`(1, 2) * "a"`、`[1] * "a"`、`"a" * "b"`、`{"a": 1} * 2` 都仍是 CPython 的
  `can't multiply sequence by non-int of type ...`。
* **顺手确认**：列表与字符串重复、数值乘法全部不变（`d269` 里 3 条回归 + 5 条报错全绿）。
* **验证**：新增 `d269.json` **28/28**（v4.114 上 8/28：元组×整数/整数×元组/0/1/负数/变量/单元素/空元组/字符串元素/
  嵌套元组/表达式因子/`len`/相等/循环/拼接/`join`/`tuple()`/布尔/取下标，加列表与字符串重复、数值乘法、5 条非法组合）；
  `d268` 22、`d267` 29、`d266` 24、`d265` 32、`d264` 32、`d202` 24 全绿；快照 **138 套** **135 套逐例相同**
  （3 处差异 = `d269` 的 20 条由错转对 + `t113` F6 集合遍历顺序（两版 MiniPy 输出都是 `a`/`b`）+ `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,880** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.115 共 106 版全 MATCH**。
  产物 `MiniPy_v4.115.sb3`：Interpreter 25,451 / 合计 **26,880** 块（+3 块，无新过程/变量/列表）。
* **补丁拆分**：v4.115 = **`p188.txt`**（放在 `p187.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p115 = 'P188'`，`'v4.115' = ''`，`'v4.114' = "$p115"`，v4.113 往下 105 个条目都带上 `"$p115,$p114"` 前缀。
* **残留**：`join` 收字符串（`'-'.join('ab')`）；列表 `index` 的起始位置；`split(sep, maxsplit)`；
  `d.pop(k, default)`；`min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；
  扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；
  `find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.123 追加（v4.114 功能轮：P187，出货 v4.114）

* **P187 嵌套 `max`/`min` 不再互相冲掉暂存**。`max(min(5, 2), 3)` 以前给 `2`、`min(max(1, 4), 2)` 给 `4`（CPython 3/2）：
  内层 min/max 把外层还在用的 `mpi`/`mbest`/`mtype` 三个全局量和列表 `MComma`（进入时被 `clearL` 清空）都改掉了，
  而参数是**逐个用 `eval` 求值**的——`eval` 当然可能再调用 min/max。`fn`/`lo`/`hi` 反而是安全的（真过程参数＝各自一帧）。
  修法：**每次调用给自己的那一份**——①`MComma` 改成**只追加**：调用在扫描前把"自己这片会从哪个下标开始"记进标量 `mcb`
  （扫描期间不会有嵌套调用），扫描完把 `mcb` 压进栈列表 `MCnt`；读界用 `MComma[base + i - 1]`，返回前把自己的那一片
  裁掉（并弹 `MCnt`）⇒ 内层追加在外层之后、只删自己的。②`mpi`/`mbest`/`mtype` 在参数 `eval` **前**压进栈列表
  `MS1`/`MS2`/`MS3`、**后**恢复 ⇒ 外层循环继续用自己那份。循环条件与末尾取值也改读"自己那片"而不是整表长度。
* **一个坑**：`item(list, x)` 的第二个参数是**下标表达式**，不是"另一个 item 读取"——第一版写成
  `inputs.INDEX = B.REP(boundAt(0), …)`，于是变成 `MComma[MComma[base]]`（双重取值），全部 max/min 立刻
  `SyntaxError: missing expression`/`parentheses`。dump 出来的树一眼就看到了嵌套的 `data_itemoflist`。
* **验证**：新增 `d268.json` **22/22**（v4.113 上 4/22：嵌套 max/min、夹取 `max(0, min(x, 10))`、三四层嵌套、
  实参中间嵌套、循环/推导式/函数体里的嵌套、字符串与容器嵌套、浮点嵌套）；`d267` 29、`d266` 24、`d265` 32、`d264` 32 全绿；
  快照 **137 套** **133 套逐例相同**（4 处差异 = `d268` 的 18 条由错转对 + `t111h` M4/`t113` F6 集合遍历顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,877** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.114 共 105 版全 MATCH**。
  产物 `MiniPy_v4.114.sb3`：Interpreter 25,448 / 合计 **26,877** 块（1 个新变量 `mcb`、4 个新列表 `MCnt`/`MS1`/`MS2`/`MS3`）。
* **补丁拆分**：v4.114 = **`p187.txt`**（放在 `p186.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p114 = 'P187'`，`'v4.114' = ''`，`'v4.113' = "$p114"`，v4.112 往下 104 个条目都带上 `"$p114,$p113"` 前缀。
* **残留**：元组重复 `(1, 2) * 2`；`join` 收字符串（`'-'.join('ab')`）；列表 `index` 的起始位置；
  `split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，留档
  `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；
  字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.122 追加（v4.113 功能轮：P186，出货 v4.113）

* **P186 修掉 `max`/`min` 的"少看最后一个实参"（静默给错答案）+ 两实参形式收字符串**。查"两实参 `max('a','b')`"时
  发现更糟的一条：**多实参 max/min 从来不看最后一个实参**：
  `max(1, 2, 3)`→`2`、`max(1, 2, 3, 4)`→`3`、`max('a','b','c')`→`'b'`（CPython 分别是 3、4、`'c'`）。
  之前的探针只试过 `max(1, 5, 3)` 这种"最大值恰好在前面"的输入，所以一直没露。
* **根因**：`minmax`（P6）把顶层逗号收进 `MComma` 并以 `hi + 1` 作哨兵 ⇒ k 个实参得到 **k 个元素**：
  第 1 个在循环前求值，第 i（i≥2）个是 `eval(MComma[i-1]+1, MComma[i]-1)`，由 `mpi = 1 … k-1` 驱动。
  而循环条件写成 `repeat until (mpi >= len(MComma) - 1)` —— **少跑一轮**（两实参时一轮都不跑）。
  正确上界就是 `len(MComma)`，那个 `- 1` 是多余的。
* **两实参**：`eval` 里那个 `if fn in (int, round, pow, min, max) and narg == 1` 的 THEN 走 `builtin2`
  （`builtin2b` 直接 `fail('TypeError: max requires numbers')`），P6 当年只换了它的 ELSE。
  本轮在 THEN 上照 P6 补一层：是 `max`/`min` 就调同一个 `minmax`，其它二实参内建原样走老链。
  两处合起来 `max('a','b')`→`b`、`min('b','a')`→`a`、`max([1],[2])`→`[2]`、`max((1,2),(1,3))`→`(1, 3)` 都对了。
* **同一轮探针另发现（下轮候选）**：**嵌套调用会被共享暂存冲掉** —— `max(min(5, 2), 3)` 给 `2`（CPython `3`）、
  `min(max(1, 4), 2)` 给 `4`（CPython `2`）：内层 min/max 把 `MComma`/`mpi`/`mbest`/`mtype`（还有自定义积木实参）都改掉了，
  外层的循环状态随之失效 —— 与 P109 的 `dictfmt` 可重入问题同一类，修法要"每层一份暂存"。
* **验证**：新增 `d267.json` **29/29**（v4.112 上 15/29）；`d266` 24、`d265` 32、`d264` 32、`d202` 24 全绿；
  快照 **136 套** **134 套逐例相同**（2 处差异 = `d267` 的 15 条由错转对 + `featprobe3` 的 enumerate/zip 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,838** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.113 共 104 版全 MATCH**。
  产物 `MiniPy_v4.113.sb3`：Interpreter 25,409 / 合计 **26,838** 块（无新过程/变量/列表）。
* **补丁拆分**：v4.113 = **`p186.txt`**（放在 `p185.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p113 = 'P186'`，`'v4.113' = ''`，`'v4.112' = "$p113"`，v4.111 往下 103 个条目都带上 `"$p113,$p112"` 前缀。
* **残留**：嵌套 `max(min(a, b), c)`（共享暂存被内层冲掉）；元组重复 `(1, 2) * 2`；`join` 收字符串；
  列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.121 追加（v4.112 功能轮：P185，出货 v4.112）

* **P185 `max`/`min`/`sorted` 收字符串**。CPython 把字符串按**字符**迭代，所以 `max('ba')` 是 `'b'`、`min('ba')` 是 `'a'`、
  `sorted('ba')` 是 `['a', 'b']`、`max('-'.join(['ab', 'cd']))` 是 `'d'`；MiniPy 全都拒绝：
  `TypeError: 'max' object is not iterable` / `TypeError: sorted() requires a list`。两处原因都只是少了一个 `S`：
  ①`callfn` 的单实参 min/max（P78）把 `evtype` 白名单写成 L/T/G，而且报错文案拿 `argOf('fn')` 当类型名
  （所以类型错误说出了 `'max' object is not iterable`）；②`eval` 的 `sorted` 分支（含 P101/P130 的变体）只认 `L`。
* **修法**：P143 的 `charsplit` 本来就把字符串变成字符列表（P180 用它做 `reversed`），于是照 P149 处理字典的办法补一句：
  min/max 在**可迭代检查的正前方**、每个 `sorted()` 的类型检查正前方各插一条 `if evtype == "S" then charsplit`；
  另外把 not-iterable 文案改走 `tname` ⇒ `max(5)` 现在说 `TypeError: 'int' object is not iterable`（与 CPython 一致）。
  **放置位置是本轮的关键**：`callfn` 收到的是**token 跨度**、不是值，进入时 `evtype` 还是上一个操作的残留
  （实测 `max('ba')` 进入 callfn 时 `evtype=N`），所以归一化必须紧挨着要用它的那个检查；而 `sorted` 那句 `fail`
  在**检查自己的 SUBSTACK 里**，插在 `fail` 前面已经太晚，得插在检查**之前**。
* **一个坑（判断"哪个 if 是检查"）**：`parent` 链接在旧补丁拼出来的语句链上**不可靠** —— 用 `reach(SUBSTACK).has(fail)`
  找外层 if 会把"链条后面的邻居"也算进去（选小了会插错分支，`max(dict)` 一度被弄坏）。
  最后用的是**直接语句链**判据："这个 if 自己的 SUBSTACK 链上就有那个 `fail`"，命中恰好 1 个。
* **一处按测试回调**：本轮一度还把空序列文案改成 CPython 文档里的 `max() arg is an empty sequence`，
  但**本地 CPython（套件的裁判）实际说 `max() iterable argument is empty`** —— `d190` B9/B17 立刻报 `ref true`（回归），
  于是**整条撤回**，保留 P134 的原文案。教训：**文案以本机 CPython 为准，不以记忆/文档为准**。
* **验证**：新增 `d266.json` **24/24**（v4.111 上 11/24）；`d190` 46/46、`d265` 32、`d264` 32、`d263` 24、`d202` 24 全绿；
  快照 **135 套** **132 套逐例相同**（3 处差异 = `d266` 的 15 条由错转对 + `t111h` M4 集合顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,824** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.112 共 103 版全 MATCH**。
  产物 `MiniPy_v4.112.sb3`：Interpreter 25,395 / 合计 **26,824** 块（无新过程/变量/列表）。
* **补丁拆分**：v4.112 = **`p185.txt`**（放在 `p184.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p112 = 'P185'`，`'v4.112' = ''`，`'v4.111' = "$p112"`，v4.110 往下 102 个条目都带上 `"$p112,$p111"` 前缀。
* **残留**：**两实参 `max('a', 'b')`**（走 `builtin2` 的数值分支，仍说 `TypeError: max requires numbers`）；
  元组重复 `(1, 2) * 2`；`join` 收字符串；列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；
  `min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.120 追加（v4.111 功能轮：P184，出货 v4.111）

* **P184 字符串字面量不再被当成逗号**。分词器把字符串字面量按**内容**存进 `Tok`，于是 `','` 的 token 文本恰好就是 `,` ——
  所有“按顶层逗号切分”的扫描（`hascomma`/`tuplelit`/`dictlit`/`listlit`/`minmax`/`eval`/`calluser`/`methodcall`/`forloop` …）
  只看文本，就把它当成了真的逗号：
  `len(',')` → `NameError: name 'len' is not defined`、`len('x' + ',' + 'y')` → 同上、`len(','.join(['ab']))` → 同上、
  `max(','.join(['ab']))` → `SyntaxError: missing expression`，以及 `[',', 'a']`、`(',',)`、`{',': 1}`、`g(',')`、`for ch in ','` 一整族。
  （`print` 没中招只是因为 P7 的 `printargs` 逗号扫描早就写了 `if not (item("Kind", ek) == "S")`。）
* **修法两步，都是机械改写**：(a) 每条 `setV(V, item('Tok', i))` 后面补一条 `setV(VK, item('Kind', i))`
  （对 V 的**其它**赋值则把 VK 清成 `""`），于是每个 token 变量身边都有它的 kind；
  (b) 所有 `X == ","`（X 是 `Tok[...]` 读取或这样的变量）改写成 `X == "," and <kind> != "S"`。
  只动“拿 token 比逗号”的地方：那些**遍历字符串字符**的扫描（`letter(i, s) == ","`，用于 `%` 格式化、`clssplit`、MRO 拆分等）
  本来就是按文本找逗号，原样不动。
* **规模**：42 个 token 变量 + 464 条伴随赋值 + **36 处**逗号判据。多 700 块积木、42 个变量，
  没有新过程、新列表。
* **顺手确认**（探针 12 条，两版都绿）：其它“看起来像标点”的字符串（`len('(')`、`len('+')`、`len(':')`、`['+', 'a']`…）
  **本来就没事** —— 逗号是唯一真正漏掉 Kind 判据的分隔符。
* **同一轮探针另发现（下轮候选）**：`max`/`min`/`sorted` **不接受字符串**（`max(',' )`、`max('-'.join(['ab']))`、`max(x)` 都报
  `TypeError: '<值>' object is not iterable`，两版一致；`max([',', 'a'])`、`max(1, 2)` 正常）。
* **验证**：新增 `d265.json` **32/32**（v4.110 上 11/32）；`d264` 32、`d263` 24、`d202` 24 全绿；快照 **134 套**
  **132 套逐例相同**（2 处差异 = `d265` 的 21 条由错转对 + `featprobe3` 的 enumerate/zip 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,802** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.111 共 102 版全 MATCH**。
  产物 `MiniPy_v4.111.sb3`：Interpreter 25,373 / 合计 **26,802** 块（1,194 个变量）。
* **补丁拆分**：v4.111 = **`p184.txt`**（放在 `p183.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p111 = 'P184'`，`'v4.111' = ''`，`'v4.110' = "$p111"`，v4.109 往下 101 个条目都带上 `"$p111,$p110"` 前缀。
* **残留**：元组重复 `(1, 2) * 2`；`max`/`min`/`sorted` 不接受字符串；`join` 收字符串（`'-'.join('ab')`）；
  列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；视图集合语义；非 ASCII。
## v4.119 追加（v4.110 功能轮：P183，出货 v4.110）

* **P183 元组在序列运算上补齐：切片 / `+` 拼接 / 带步长切片**。元组从 P140 起就与列表**同编码**
  （只差类型标记 `T`），但四处“只认列表”的判据把它当成了不透明记录串：
  `t[0:2]` 打出内部记录串、`t[::2]` 给出**列表**、`('a',)+('b',)` 报
  `can only concatenate tuple (not "tuple") to tuple`。
* **四处改动，都只是放宽判据 + 把结果标记从写死的 `"L"` 换成接收者自己的标记**：
  ①切片读（`indexget` 里 P8/P9 那段）`if xb == "L"` → `xb == "L" or xb == "T"`，重建后
  `evtype = xb`（长度那半 P140 早已放宽，所以以前 `len(t[0:2])` 是对的、只有值不对）；
  ②`+` 的序列分支 `(lt2 == "L" or lt2 == "T") and evtype == lt2`、结果标记 `lt2`
  （**两边标记必须相同**是故意的：`[1] + (2,)` 仍要报错）；
  ③`+` 的**兜底报错** `op == "+" and not (evtype == "L" and lt2 == "L")` 对元组恒真 ——
  只改 ② 会出现“先正确拼接、再被这句报错”的假象，必须把 ③ 改成与 ② 同构；
  ④`[::step]` 的元素一直是对的，只有结果标记写死 `"L"`。
* **一个坑（本轮最贵）**：**改条件前先确认“这个条件是不是唯一的判据”**。定位手法是给**报错点**
  （`beop = "+"` 那句）插一句 `fail`，把 `lt2`/`evtype`/`lt0` 打出来 —— 打出 `T/T` 就说明类型
  没问题、是**后面的判据**在拦。顺带确认：**旧补丁插入过的链上 `parent` 链接不可靠**（一串并列的
  `if` 会互相指成父子），读控制流要靠“报错点 + 逐层 `SUBSTACK`/`SUBSTACK2`”。
* **本轮试过但撤回**：`(1, 2) * 2`（元组重复）。按同样办法放宽 `seq * int` / `int * seq` 两个分支后
  **更糟** —— `(1, 2) * 2` 从报错变成**打出空行**（静默给错答案）、`2 * (1, 2)` 打出未解码的记录串，
  说明这条路上还有别的判据（字符串重复分支也会接住元组）⇒ **整体撤回**，元组 `*` 仍是缺口。
* **验证**：新增 `d264.json` **32/32**（v4.109 上 9/32）；`d263` 24、`d202` 24 全绿；快照 **133 套**
  **130 套逐例相同**（3 处差异 = `d264` 的 23 条由错转对 + `t111h` M4 集合顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,102** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.110 共 101 版全 MATCH**。
  产物 `MiniPy_v4.110.sb3`：Interpreter 24,673 / 合计 **26,102** 块（无新过程/新变量/新列表）。
* **补丁拆分**：v4.110 = **`p183.txt`**（放在 `p182.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p110 = 'P183'`，`'v4.110' = ''`，`'v4.109' = "$p110"`，v4.108 往下 100 个条目都带上 `"$p110,$p109"` 前缀。
* **残留**：元组重复 `(1, 2) * 2`；嵌套调用实参里的字符串含逗号（`len(','.join(x))`）；`join` 收字符串；
  列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`；
  视图集合语义；非 ASCII。
## v4.118 追加（v4.109 功能轮：P182，出货 v4.109）

* **P182 `join` 也收元组与字典的键**（v4.108 撤下来的归一化，只补回这两半）。
  `'|'.join(('x', 'y'))` 与 `','.join({'a': 1, 'b': 2})` 以前都报 `TypeError: join needs a list`，
  CPython 分别给 `x|y` 与 `a,b`；**字符串那一半仍缺**（`'-'.join('ab')` 故意不动，见下）。
* **做法两处，都在字符串派发的 `join` 分支（P18）**：①**守卫放行元组** —— 守卫是
  `if not (smt1 == "L") then fail`，把 `not` 的**操作数**换成 `(smt1 == "L") or (smt1 == "T")`
  （**P140 起元组的编码与列表完全一致**，所以 `sjoin` 与 v4.108 的元素类型检查都不用动，
  后者在守卫之后、自动覆盖元组）；②**字典先取键** —— 守卫之前插
  `if smt1 == "D" then (dictkeys sma1; sma1 = ev; smt1 = "L")`。
  本轮只多 7 块积木，没有新过程/新变量/新列表。
* **两个坑**：①**给 `not(smt1 == "L")` 的操作数再套一层 `not` 等于套了两层 `not`** ——
  判据整个反过来（列表反而报错、元组/字典照样报错），`d263` 第一次跑出
  **10/24 → 6/24 的倒退**；正确做法是换掉条件的**操作数**（或整条 `CONDITION` 换成
  `not(or(...))`）。②**`find` 找"SUBSTACK 里含失败调用的 `control_if`"会命中"最外层"那个
  语句级 `if`**（条件是 `mcpv == 0`，整个字符串派发的大 `if`）—— 必须按**语句链**（`next`）
  判断"这个 `if` **自己的**子栈里就有它"，才是**最内层**的守卫，否则字典归一化会插到整个
  字符串派发之前。
* **同一轮探针另发现（下轮候选）**：**元组切片** `t = (1, 2, 3); t[0:2]` 打出内部记录串
  （`\x1fN`，CPython `(1, 2)`；`len(t[0:2])` 反而是对的 —— 长度算对了、重新编码漏了）；
  **元组拼接** `('a',) + ('b',)` 报 `TypeError: can only concatenate tuple (not "tuple") to tuple`；
  **嵌套调用实参里的字符串含逗号** `len(','.join(x))` 报 `NameError: name 'len' is not defined`
  （`print(...)` 那一路不受影响 —— 实参扫描不数引号，逗号被当顶层分隔符）。
* **验证**：新增 `d263.json` **24/24**（v4.108 上 10/24）；`d262` 8、`d254` 20 全绿；
  快照 **132 套**：**129 套逐例相同**，3 处差异 = `d263` 的 19 条由错转对（14 条功能 +
  5 条报错文案）+ `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出都是 `a`/`b`）+
  `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、
  `gaps433` **61/63**（只余 E50/G5）、`frames` fib16 **6388** 均不变；
  `check41` **26,096** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.109 共 100 版全 MATCH**。
  产物 `MiniPy_v4.109.sb3`：Interpreter 24,667 / 合计 **26,096** 块。
* **补丁拆分**：v4.109 = **`p182.txt`**（放在 `p181.txt` 之后、`p68.txt` 之前）；
  `rebuild-old.ps1` 里 `$p109 = 'P182'`，`'v4.109' = ''`，`'v4.108' = "$p109"`，
  v4.107 往下 99 个条目都带上 `"$p109,$p108"` 前缀。
* **残留**：元组切片与元组拼接；嵌套调用实参里的字符串含逗号；`join` 收字符串（`'-'.join('ab')`）；
  列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；`min/max(key=…)`；
  多访问器路径别名（`b = a[0][1]`，补丁留档 `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；
  内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`（要先加 `sma3`）；
  视图集合语义；非 ASCII。
## v4.117 追加（v4.108 功能轮：P181，出货 v4.108）

* **P181 `join` 不再静默接受非字符串元素**（`join([1])` 以前打出 `1`，CPython 报
  `TypeError: sequence item 0: expected str instance, int found` —— **给错答案**那一类）。
  `join` 的分支在字符串派发里（P18）：先查实参是不是列表、再调 `sjoin`；P181 在两者之间加一段
  元素类型检查（`listlen`/`listitem` 逐元素看类型），第一个不是字符串的就报 CPython 的
  `TypeError: sequence item <0 基下标>: expected str instance, <类型> found`（类型名走 `tname`）再 `STOPTHIS`。
* **两个坑**：①**`find(set, pred)` 要的是"可达集合"不是定义块 id** —— 先写
  `const mc = defIdOf('methodcall %s %s')` 再 `find(mc, …)`，`find` 会把**字符串 id 逐字符**当积木 id 取，
  `BL()['b']` 是 `undefined` ⇒ 构建报 `Cannot read properties of undefined (reading 'opcode')`；要用 `reach(mc)`。
  ②**构建期表达式积木没有 `parent`**（老坑）：用 `ancestor(失败调用, 是 if)` 找外层 `if` 会撞到不存在的 id，
  改成**从所有 `control_if` 里找"SUBSTACK 包含这个失败调用"的那个**。
* **本轮撤下来的部分**：还试着让 `join` 收**别的可迭代对象**（字典按键/元组/集合/字符串字符）——
  在检查前插"归一化"（`dictkeys`/`charsplit`/改类型标记），列表用例全绿，但 `'-'.join('ab')` 变成
  `AttributeError: 'list' object has no attribute 'join'`（收信者被弄成列表），字典与元组也仍报
  `join needs a list` ⇒ **整段撤掉**，只留一次通过的元素类型检查；这条缺口写进清单。
* **验证**：新增 `d262.json` **8/8**（v4.107 上 5/8）；`d261` 12、`d260` 12、`d259` 12、`d258` 14、
  `d255` 15、`d254` 20、`d253` 15、`d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；130 套快照
  **128 套逐例相同**（3 处差异 = `d262` 3 条转对 + `t111h` M4 集合顺序 + `featprobe3` 地址）⇒
  **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **26,089** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.108 共 99 版全 MATCH**。
  产物 `MiniPy_v4.108.sb3`：Interpreter 24,660 / 合计 **26,089** 块（3 个变量 `jn1`/`jn2`/`jn3`，
  无新过程/新列表）。
* **补丁拆分**：v4.108 = **`p181.txt`**（放在 `p180.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p108 = 'P181'`，`'v4.108' = ''`，`'v4.107' = "$p108"`，v4.106 往下 97 个条目都带上 `"$p108,$p107"` 前缀。
* **残留**：`join` 收元组/字典/字符串；列表 `index` 的起始位置；`split(sep, maxsplit)`；`d.pop(k, default)`；
  `min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，补丁留档 `_work/v41/_p176_twoaccessor.txt`）；
  扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；
  `find`/`rfind`/`count` 的 `end`（要先加 `sma3`）；视图集合语义；非 ASCII。
## v4.116 追加（v4.107 功能轮：P180，出货 v4.107）

* **P180 `reversed(x)` + 单实参 `count('')`**（探针挖出来的两个小缺口）。①`reversed` 完全没有
  （`NameError`），而列表反转内核 `lrev`（P101）本来就有 ⇒ 在 `callfn` 的内建链上加一个分支
  （位置同 P176 的 `bin`/`hex`/`oct`，在 `pending` 守卫之前）：列表/元组直接 `lrev`，
  字典先 `dictkeys`（CPython 按**键**迭代）再 `lrev`，字符串先 `charsplit` 再 `lrev`，
  其余报 `TypeError: '<类型>' object is not reversible`（类型名走 `tname`）。**CPython 返回迭代器、
  MiniPy 返回反转后的列表** —— `list(...)`/`for ... in ...`/`sum(...)` 都一致，只有直接打印
  `reversed(x)` 本身会看到列表。②`'abc'.count('')` 给 0（CPython 4）：修在**派发**里而不是 `scount` 里 ——
  守卫之前加一个分支：`count` + **没有第二个实参**（`NOT(GT(mcut,0))`）+ 空串 ⇒ `len(接收者)+1`
  （带起点的形式在 v4.106 已处理，用"没有逗号"排除，两者不打架）。
* **同一轮探针（20 条）还发现**（都留作下轮候选）：`[1,2,1].index(1,1)` 不带起点；
  `'a,b,c'.split(',', 1)` 忽略 maxsplit；`d.pop('x', 9)` 不收默认值；`min(['bb','a'], key=len)` 报
  `SyntaxError`；**`','.join([1])` 静默接受非字符串**（CPython 报
  `TypeError: sequence item 0: expected str instance, int found`）——最后这条属"给错答案"那一类。
* **验证**：新增 `d261.json` **12/12**（v4.106 上 3/12）；`d260` 12、`d259` 12、`d258` 14、`d257` 9、
  `d255` 15、`d254` 20、`d253` 15、`d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；129 套快照
  **128 套逐例相同**（2 处差异 = `d261` 10 条转对 + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；`check41` **26,062** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.107 共 98 版全 MATCH**。产物 `MiniPy_v4.107.sb3`：Interpreter 24,633 / 合计 **26,062** 块
  （1 个变量 `rv1`，无新过程/新列表）。
* **补丁拆分**：v4.107 = **`p180.txt`**（放在 `p179.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p107 = 'P180'`，`'v4.107' = ''`，`'v4.106' = "$p107"`，v4.105 往下 96 个条目都带上 `"$p107,$p106"` 前缀。
* **残留**：列表 `index` 的起始位置；`','.join([1])` 的类型检查；`split(sep, maxsplit)`；
  `d.pop(k, default)`；`min/max(key=…)`；多访问器路径别名（`b = a[0][1]`，补丁留档
  `_work/v41/_p176_twoaccessor.txt`）；扩展解包 `a, *rest = …`；内建 `*` 展开（`max(*xs)`）；
  `obj.m(*xs)`；字典 `|` 合并；`find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；视图集合语义；非 ASCII。
## v4.115 追加（v4.106 功能轮：P179，出货 v4.106）

* **P179 `count(sub, start)`**（两实参形式以前报 `TypeError: count() takes exactly one argument`）。
  字符串派发已把第一个实参求值进 `sma1`、第二个进 `sma2`（第一个逗号位置在 `mcut`），所以用 `mcut > 0`
  认出来（与 v4.104 的 `find`/`rfind` 同一套路）。新过程 **`scount2 记录 子串 起点`** 把活交给现成的
  `scount`：**切出 `起点` 之后的尾巴再数一遍**（不重叠计数对切片可加 ⇒ `count(sub, start)` 等于
  `count(sub)` 作用在 `s[起点:]` 上），起点为负按 0、起点超过长度给 0；**空子串**是 `len(切片) + 1`
  （`'abc'.count('', 1)` = 3）。
* **一个坑**：第一版自己写了扫描循环（`repeat until (i-1+len) > n`，命中前进 `len`、否则前进 1），
  **跑起来是死循环** —— `status: Running`、20 秒超时、无任何报错，症状只有 `d260` 的 `mini.out` 为空
  + `ms≈20000`。与其继续查那个循环，改成"切尾巴 + 复用 `scount`"：更短，而且复用已验证的过程。
* **顺带记录一个既有小 bug**：单实参的 `'abc'.count('')` 给 `0`（CPython 给 `4`）。本轮想顺手修，
  但 `scount` 两个形参的引用方式没在一轮内确认清楚（改完 K6 仍红），**为避免带病出货撤掉了那处改动**，
  留在清单里作下轮候选。
* **验证**：新增 `d260.json` **12/12**（v4.105 上 3/12）；`d259` 12、`d258` 14、`d257` 9、`d255` 15、
  `d254` 20、`d253` 15、`d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；128 套快照 **125 套逐例相同**
  （4 处差异 = `d260` 9 条转对 + `t111h` M4 / `t113` F6 集合顺序 + `featprobe3` 地址）⇒
  **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **25,996** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.106 共 97 版全 MATCH**。
  产物 `MiniPy_v4.106.sb3`：Interpreter 24,567 / 合计 **25,996** 块（1 个新过程 `scount2`、4 个变量 `p14*`）。
* **补丁拆分**：v4.106 = **`p179.txt`**（放在 `p178.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p106 = 'P179'`，`'v4.106' = ''`，`'v4.105' = "$p106"`，v4.104 往下 95 个条目都带上 `"$p106,$p105"` 前缀。
* **残留**：单实参 `count('')`；多访问器路径别名（`b = a[0][1]`，补丁留档 `_work/v41/_p176_twoaccessor.txt`）；
  `find`/`rfind`/`count` 的第三个参数 `end`（**字符串派发只求值两个实参**，没有 `sma3`/`smt3`，
  要先给实参扫描加一段）；`split(sep, maxsplit)`；`min/max(key=…)`；扩展解包 `a, *rest = …`；
  `t = ([1],)` 后 `t[0].append(2)`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并；
  视图集合语义；非 ASCII。
## v4.114 追加（v4.105 功能轮：P178，出货 v4.105）

* **P178 `int(x, base)` 接受进制前缀**（`int('0b101', 2)`、`int('0o17', 8)`、`int('0x1f', 16)`；
  以前一律 `ValueError: invalid literal for int() with base 2: '0b101'`）。`basenum`（P71）逐字符对照数字表
  取位，P178 只加**一步**：在它处理完正负号之后，若基数是 `2`/`8`/`16` 且文本是 `0` 后面跟着**与基数匹配**的
  `b`/`o`/`x`，就把 `bi` 前进两位。两个细节：①**"与基数匹配"才跳** —— `int('0b101', 16)` 里 `0b` 不该剥，
  `b` 本来就是十六进制数字（CPython 也是 `45313`）；②**"后面还有字符"才跳** —— 这样 `int('0x', 16)` 不会被
  跳成空串而静默返回 `0`，而是照旧让数字循环遇到 `x` 报 `ValueError`（与 CPython 措辞一致）。
* **验证**：新增 `d259.json` **12/12**（v4.104 上 5/12）；`d258` 14、`d257` 9、`d255` 15、`d254` 20、
  `d253` 15、`d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；127 套快照 **125 套逐例相同**
  （3 处差异 = `d259` 7 条转对 + `t111h` M4 集合顺序 + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；`check41` **25,951** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.105 共 96 版全 MATCH**。产物 `MiniPy_v4.105.sb3`：Interpreter 24,522 / 合计 **25,951** 块
  （1 个变量 `bp2`，无新过程/新列表）。
* **补丁拆分**：v4.105 = **`p178.txt`**（放在 `p177.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p105 = 'P178'`，`'v4.105' = ''`，`'v4.104' = "$p105"`，v4.103 往下 94 个条目都带上 `"$p105,$p104"` 前缀。
* **残留**：多访问器路径别名（`b = a[0][1]`，补丁留档 `_work/v41/_p176_twoaccessor.txt`）、
  `find`/`rfind`/`count` 的第三个参数 `end`、`split(sep, maxsplit)`、`min/max(key=…)`、
  扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、
  字典 `|` 合并、视图集合语义、非 ASCII。
## v4.113 追加（v4.104 功能轮：P177，出货 v4.104）

* **P177 `find(sub, start)` / `rfind(sub, start)`**（两实参形式以前报 `TypeError: find() takes exactly
  one argument`）。字符串派发在开始处就把第一个实参求值进 `sma1`、第二个进 `sma2`，第一个逗号位置在 `mcut`，
  所以"两实参"用 `mcut > 0` 就能认出来。两个新过程：**`sfind2 记录 子串 起点`**（从 1 基的 `起点+1`
  往后走，`substr` + **`compareText`** 判等——Scratch 的 `=` 不分大小写）、
  **`srfind2 记录 子串 起点`**（从"还能放下的最后一个位置"往回走到 `起点+1`，取最后一次命中）。
  **空子串按 CPython 的怪癖单独处理**：`find` 给 `起点`（越过长度则 `-1`），**`rfind` 给长度**
  （越过长度则 `-1`）——第一版两边都给起点，`'abc'.rfind('', 1)` 就错成 `1`（CPython 是 `3`）。
* **验证**：新增 `d258.json` **14/14**（v4.103 上 6/14）；`d257` 9、`d255` 15、`d254` 20、`d253` 15、
  `d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；126 套快照 **125 套逐例相同**（2 处差异 = `d258` 8 条转对
  + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、
  `frames` fib16 **6388** 均不变；`check41` **25,925** 块 errors=0；`rebuild-old.ps1`
  **v4.10…v4.104 共 95 版全 MATCH**。产物 `MiniPy_v4.104.sb3`：Interpreter 24,496 / 合计 **25,925** 块
  （2 个新过程 `sfind2`/`srfind2`、7 个变量 `p13*`）。
* **补丁拆分**：v4.104 = **`p177.txt`**（放在 `p176.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p104 = 'P177'`，`'v4.104' = ''`，`'v4.103' = "$p104"`，v4.102 往下 93 个条目都带上 `"$p104,$p103"` 前缀。
* **残留**：多访问器路径别名（`b = a[0][1]`，补丁留档 `_work/v41/_p176_twoaccessor.txt`）、
  `int('0b101', 2)` 的进制前缀、`find`/`rfind`/`count` 的第三个参数 `end`、`split(sep, maxsplit)`、
  `min/max(key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`、内建 `*` 展开（`max(*xs)`）、
  `obj.m(*xs)`、字典 `|` 合并、视图集合语义、非 ASCII。
## v4.112 追加（v4.103 功能轮：P176，出货 v4.103）

* **P176 `bin()` / `hex()` / `oct()`**（以前一律 `NameError: name 'bin' is not defined`，尽管
  `'%x' % 255`、`int('ff', 16)` 早就能用）。内建走 `callfn` 那串 `if fn == "名字"`，单实参已在 `ev`/`evtype`、
  分支末尾只要 `pending = 1`（P13 的 `sorted` 就在这个位置）：P176 加一个分支 —— 类型检查
  （`evtype` 非 `N` 或文本带 `.` 报 CPython 的 `TypeError: '<类型>' object cannot be interpreted as an integer`，
  类型名走 `tname`）→ 负数把 `-` 摘到前缀**之前**（`-0b101`）→ 新过程 **`radix 值 基数 数字表`**
  反复除以基数、用 `letter` 从数字表取字符拼出各位（`0` 单独处理成 `'0'`）→ 拼上 `0b`/`0x`/`0o`。
* **两个坑**：①**`REPEATU` 的条件写反**——想"除到商小于基数"却写成 `REPEATU(NOT(LT(x, base)))`，
  而 `repeat_until` 是**条件为真就停**，`NOT(x<base)` 一开始就真 ⇒ **循环体一次都没跑**，
  末尾又拿 `letter(x+1, 数字表)` 取了个越界空串 ⇒ `bin(5)` 打出 `0b`（前缀有、数字没有），
  正确写法是 `REPEATU(LT(x, base))`；②**过程实参不能当变量**（老坑）：分支里 `VAR('fn')` 直接报
  `no variable fn in Interpreter`，必须 `argOf('fn')` 且每次比较现造。
* **验证**：新增 `d257.json` **9/9**（v4.102 上 4/9）；`d255` 15、`d254` 20、`d253` 15、`d252` 9、
  `d250` 26、`d249` 42、`d248` 61 全绿；125 套快照 **123 套逐例相同**（3 处差异 = `d257` 7 条转对
  + `t111h` M4 集合顺序 + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、
  `gaps433` **61/63**、`frames` fib16 **6388** 均不变；`check41` **25,812** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.103 共 94 版全 MATCH**。产物 `MiniPy_v4.103.sb3`：Interpreter 24,383 / 合计 **25,812** 块
  （1 个新过程 `radix`、6 个变量 `r3*`）。
* **补丁拆分**：v4.103 = **`p176.txt`**（放在 `p175.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p103 = 'P176'`，`'v4.103' = ''`，`'v4.102' = "$p103"`，v4.101 往下 92 个条目都带上 `"$p103,$p102"` 前缀。
* **本轮没做成的事**：先做的是**多访问器路径别名**（`b = a[0][1]`；`pget1`/`pset1`/`dgetv`/`aget` +
  `palwrite` 两访问器分支都写完了），但把单访问器的老路径也弄坏了，**整体撤回**，改出上面这个小特性。
  撤下的补丁留档 **`_work/v41/_p176_twoaccessor.txt`**；已查明：①`replaceExpr` 的 `build()` 必须返回
  **积木 id**（给 `VAR('名字')` 输入描述符会拼出 3 项畸形 `ITEM`，`.sb3` 被加载器拒绝）；
  ②单/双访问器判据要读 `PthK`，而记录阶段第二访问器扫描多记了一个（`PthS` 拿到 2），尚未查到底。
* **探针另发现**：`int('0b101', 2)` 报 `ValueError`（CPython 收带进制前缀的字符串）—— 记入下轮候选。
* **残留**：多访问器别名、`int(x, base)` 的前缀、`min/max(key=…)`、扩展解包 `a, *rest = …`、
  `t = ([1],)` 后 `t[0].append(2)`、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
  `find`/`rfind`/`count` 的 `start`/`end`、`split(sep, maxsplit)`、视图集合语义、非 ASCII。
## v4.111 追加（v4.102 功能轮：P175，出货 v4.102）

* **P175 `enumerate(xs, start)`**（`enumerate(xs, 5)`、`enumerate('ab', -1)`、`for i, c in enumerate(xs, 1):`；
  以前一律 `NameError: name 'enumerate' is not defined`）。P99 把 `enumerate(xs)` 装在 `callfn` 里
  （单实参分支里 `ev`/`evtype` 已是序列、下标用 `xsi - 1` 拼），而**只有"没有顶层逗号"的调用**才会走到那儿
  （`eval` 的 `narg == 0` 分支负责求值唯一实参再把名字交给 `callfn`）⇒ 两实参掉进"多实参内建"报 `NameError`。
  与 P172 的 `sum(xs, start)` 同法：①构造器下标改成 `xsi - 1 + enoff`；②`eval` 在 `narg` 派发**之前**
  再加一个钩子（P99 的 `zip`、P172 的 `sum` 已在那位置）：顶层逗号恰一个时**先求值起始值**、
  不是整数就报 CPython 的 `TypeError: '<类型>' object cannot be interpreted as an integer`（类型名走 `tname`、
  浮点一律拒绝），存 `enoff`；再求值序列、**在序列跨度上重入 `callfn`**（枚举本身还是原代码）；最后 `enoff` 归零。
* **两个坑**：①**按 `JSON.stringify(VALUE)` 搜变量名会落空**——变量藏在一层层 JOIN 的**子积木**里，
  而且内联变量有两种形态（`[12,名字,id]` 与 `[3,[12,名字,id],影子]`），必须**遍历表达式树**找
  （v4.101 我就是这么误判"构造器不存在"、把这条留到了本轮）。②**`hascomma` 不数大括号**，
  `enumerate(sorted({1, 2}), 7)` 里花括号的逗号会被当顶层逗号、切分错位 ⇒ 钩子改成**自己扫一遍**
  （`(`/`[`/`{` 一起计深度）。
* **验证**：新增 `d255.json` **15/15**（v4.101 上 4/15）；`d254` 20、`d253` 15、`d252` 9、`d250` 26、
  `d249` 42、`d248` 61、`d246` 64 全绿；124 套快照 **121 套逐例相同**（4 处差异 = `d255` 13 条转对
  + `t111h` M4 / `t113` F6 集合顺序 + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；`check41` **25,667** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.102 共 93 版全 MATCH**。产物 `MiniPy_v4.102.sb3`：Interpreter 24,238 / 合计 **25,667** 块
  （1 个变量 `enoff` + 5 个扫描变量 `e2*`，无新过程/新列表）。
* **补丁拆分**：v4.102 = **`p175.txt`**（放在 `p174.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p102 = 'P175'`，`'v4.102' = ''`，`'v4.101' = "$p102"`，v4.100 往下 91 个条目都带上 `"$p102,$p101"` 前缀。
* **残留**：`min/max(key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`、
  多访问器路径别名（`b = a[0][1]`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
  `find`/`rfind`/`count` 的 `start`/`end` 参数、`split(sep, maxsplit)`、视图集合语义、非 ASCII。
## v4.110 追加（v4.101 功能轮：P174，出货 v4.101）

* **P174 字符串接口补四个缺口**：`rfind`、`rindex`、`casefold`、以及 `strip`/`lstrip`/`rstrip` 的
  **字符集形式**（`'xxabcxx'.strip('x')`；P167 的 `strim` 只认空白）。字符串派发是 `methodcall` 的 S 段末尾
  那串 `if smmeth == "名字"` + 末尾 `if 不是已知名字 then AttributeError` 的守卫，**第一个实参已在 `sma1`**。
  新过程：**`srfind 记录 子串`**（从能放下的最后一个位置往回走，`substr` + **`compareText`** 判等——Scratch 的 `=`
  不分大小写；空子串按 CPython 返回长度）、**`strim2 值 字符集 模式`**（两端各剥一次，判"字符在集合里吗"
  用 **`sinstr 字符 集合`** 逐字符 `compareText`，因为 `contains` 也不分大小写）。`casefold` 直接复用
  `scase(记录,'lower')`（ASCII 世界里两者相同）；有实参才走字符集版本（判据是 `(` 与 `)` 之间跨度非空，
  **不是 `mcut`**——只有一个实参时没有逗号），否则仍旧走 P167 的 `strim`；守卫的条件树按 P75 的老办法
  再包一层 `AND(旧条件, NOT(新名字))`。
* **两个坑**：①**守卫的顶层已经不是一个 `not`**（P75/P167 把条件包成了 `and(not(...), not(...))`），
  按"条件是 `operator_not`"找锚点会命中 **0** 个 ⇒ 要先在整棵树里找**含 `not(smmeth == "join")` 的那个 `not`**、
  再找包含它的 `if`；②**"上一轮的结果"当循环条件是反的**——剥字符的循环写成
  `repeat until (到头 or 上一轮没命中)`，第一轮开始前标志还是遗留值（0）⇒ 循环一次都不进
  （症状：`strip('x')` 一个字符都没剥），要在循环前**先置 1 打底**。另外 `rfind` 的 1 基起点是
  `len(s) - len(p) + 1`，少加 1 会让 `'ab'.rfind('ab')` 直接 `-1`、`'abcabc'.rfind('c')` 变成**第一个**匹配。
* **验证**：新增 `d254.json` **20/20**（v4.100 上 4/20）；`d253` 15、`d252` 9、`d250` 26、`d249` 42、`d248` 61、
  `d247` 45、`d246` 64、`d245` 30 全绿；123 套快照 **121 套逐例相同**（3 处差异 = `d254` 17 条转对
  + `t111h` M4 集合顺序 + `featprobe3` 地址）⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、
  `gaps433` **61/63**、`frames` fib16 **6388** 均不变；`check41` **25,580** 块 errors=0；
  `rebuild-old.ps1` **v4.10…v4.101 共 92 版全 MATCH**。产物 `MiniPy_v4.101.sb3`：Interpreter 24,151 / 合计 **25,580** 块
  （3 个新过程 `sinstr`/`strim2`/`srfind`、7 个变量 `r2*`/`s8*`）。
* **补丁拆分**：v4.101 = **`p174.txt`**（放在 `p173.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p101 = 'P174'`，`'v4.101' = ''`，`'v4.100' = "$p101"`，v4.99 往下 90 个条目都带上 `"$p101,$p100"` 前缀。
* **残留**：`enumerate(xs, start)`（P99 的构造器在产物里还没定位到）、`min/max(key=…)`、扩展解包 `a, *rest = …`、
  `t = ([1],)` 后 `t[0].append(2)`、多访问器路径别名（`b = a[0][1]`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、
  字典 `|` 合并、`find`/`rfind` 的 `start`/`end` 参数、视图集合语义、非 ASCII。
## v4.109 追加（v4.100 功能轮：P173，出货 v4.100）

* **P173 "读出元素再改"的路径别名**（`a=[[1]]; b=a[0]; b.append(2)` 要让 `a` 变 `[[1, 2]]`）。
  容器是记录串、没有对象标识，`a[0]` 被求值成副本存进 `b` 就断了联系；P54 的 `AliasN`/`AliasT` 只记**名字**。
  P173 加一张**路径别名表**，但**一个 token 都不存**：`execute` 见到 `名字 = <基名 + 恰好一个访问器>` 时
  **当场**把访问器求值成值（`[...]` 存下标值与类型、`.名字` 存属性名——当场求值也更贴近 Python：别名指向
  读到的那一格）；别名表 = `PthN`/`PthB`（名字/基名）+ `PthS`/`PthK`（访问器表中的位置与个数），
  访问器表是 `PtM`/`PtT`/`PtY` 三条平行列表。写回是纯记录串手术：新过程 **`lsetv`**（列表记录换一个元素：
  `lsep` 边界 + `lesc` 转义 + 负数归一化 + 越界 `IndexError: list assignment index out of range`）、
  **`dsetv`**（字典记录换一个键：逐对 `listitem` 读出、`compareText` 比键、命中换值否则追加、整串重建）、
  属性交给 P171 的 `aset`（`IAttr*` 是堆）；然后 `assign(基名,…)` + `publish(基名)`（P169，函数帧里也可见），
  P54 的名字别名（`c = b`）也走一遍。重新绑定丢掉别名（钩 `aldrop`）、RUN 清表、递归深度上限 4。
  **只记单访问器路径**：`b = a[0][1]` 与 `b = f()[0]` 故意不记（保持原行为，不冒写错的风险）。
* **把 v4.99 撤下来的教训全用上了**：①**路径不能存文本**（分词器剥掉字面量引号，`d['k']` 还原成 `d[k]`
  就去查变量 `k`）；②**往全局 `Tok`/`Kind` 装 token 太脆**（`pathset` 以为"恢复现场 = `tokenize(Code[pc])`"，
  但在飞的 token 属于**录制的路径**；一装一还原之间还有嵌套 `publish`/`eval`，写回会落到别的名字上，
  当时 `b` 变成 `[[1], 2]`）⇒ 改成**一个 token 都不存**；③**`replaceStmt` 只重接一条语句**
  （用 `chain([...])` 替换会丢掉链的其余部分）；④`VAR('名字')` 是**描述符**不是积木 id、`chgV` 收的是**名字字符串**。
* **本轮自己的两个坑**：①搜索"末尾 `]` 之后"时把下标跨度写成 `[+1 .. ]位置+1`，多带一个 `]` ⇒ `eval` 报
  `SyntaxError: parentheses`（顺手把探测失败的 `error` 清掉，免得记录失败连累整条赋值语句）；
  ②访问器表是**三条平行列表**，`PthS` 应是 `llen('PtM')`（一个访问器一条），我按"一个访问器三条"写成
  `llen('PtM') - 2` ⇒ `PthS = -1`，写回时读到空记录。
* **验证**：新增 `d253.json` **15/15**（v4.99 上 1/15）；`d252` 9、`d250` 26、`d249` 42、`d248` 61 全绿；
  122 套快照 **120 套逐例相同**（3 处差异 = `d253` 14 条转对 + `t111h` M4 集合顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **25,422** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.100 共 91 版全 MATCH**。
  产物 `MiniPy_v4.100.sb3`：Interpreter 23,993 / 合计 **25,422** 块（4 个新过程 `lsetv`/`dsetv`/`palwrite`/`paldrop`、
  7 条列表 `PthN`/`PthB`/`PthS`/`PthK`/`PtM`/`PtT`/`PtY`、32 个变量）。
* **补丁拆分**：v4.100 = **`p173.txt`**（放在 `p172.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p100 = 'P173'`，`'v4.100' = ''`，`'v4.99' = "$p100"`，v4.98 往下 89 个条目都带上 `"$p100,$p99"` 前缀。
* **残留**：多访问器/非名字基名的别名（`b = a[0][1]`、`b = f()[0]`）、`enumerate(xs, start)`
  （P99 的构造器在产物里还没定位到：`xsp`/`xsi` 未出现在 `callfn` 的任何赋值里）、`min/max(key=…)`、
  扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、
  字典 `|` 合并、剩余字符串方法、视图集合语义、非 ASCII。
## v4.108 追加（v4.99 功能轮：P172，出货 v4.99）

* **P172 内建 `sum` 的起始值 `sum(xs, start)`**（`sum([1,2,3], 10)`、`sum([], 5)`、`sum({1,2}, 3)`；
  以前一律 `NameError: name 'sum' is not defined`）。`sum(xs)` 的分支在 `callfn` 的内建派发里，而
  **只有"没有顶层逗号"的调用**才会走到那里（`eval` 的 `narg == 0` 分支负责把唯一实参求值好再把函数名
  交给 `callfn`）；有逗号就落进"多实参内建"那条路 ⇒ `NameError`。P99 给 `zip` 解决过同一形态：
  在 `eval` 的 `narg` 派发**之前**挂钩子。P172 在同位置再挂一个：①只认 `Tok[lo]=='sum'` 且顶层逗号恰一个
  （`hascomma`）；②**先求值起始值**、不是数字就报 CPython 的
  `TypeError: unsupported operand type(s) for +: 'int' and '<类型>'`（类型名走 `tname`），存进 `sstart`；
  ③再求值序列，**在序列的跨度上重入 `callfn`** —— 求和本身还是原来那段代码，集合/生成器/报错文案一字不变；
  ④回到钩子里加起始值；求和结果是 0（空表）时直接给起始值。
  **一个坑**：Scratch 的 `+` 把 `4.0` 变成 `4`（浮点形态靠**文本里有没有 `.`** 承载）⇒ 相加后若结果没有 `.`
  而两个操作数里至少一个有，就补 `.0`（P121/P122 同招）。
* **验证**：新增 `d252.json` **9/9**（v4.98 上 3/9）；`d250` 26、`d249` 42、`d248` 61、`d247` 45、`d246` 64 全绿；
  120 套快照 **118 套逐例相同**（4 处差异 = `d252` 8 条转对 + `t111h` M4/`t113` F6 集合顺序 + `featprobe3` 地址）
  ⇒ **`ref true` 0 ⇒ 零回归**；featprobe **248/259**、`gaps433` **61/63**、`frames` fib16 **6388** 均不变；
  `check41` **25,080** 块 errors=0；`rebuild-old.ps1` **v4.10…v4.99 共 90 版全 MATCH**。
  产物 `MiniPy_v4.99.sb3`：Interpreter 23,651 / 合计 **25,080** 块（4 个变量 `ssum`/`ssum2`/`sstart`/`sstartt`，
  无新过程、无新列表）。
* **补丁拆分**：v4.99 = **`p172.txt`**（放在 `p171.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p99 = 'P172'`，`'v4.99' = ''`，`'v4.98' = "$p99"`，v4.97 往下 88 个条目都带上 `"$p99,$p98"` 前缀。
* **本轮走过的一段弯路（重要，下轮接着做）**：先尝试清单里的"**读出元素再改的别名**"
  （`b = a[0]; b.append(2)` 要让 `a` 也变；`d251` 20 条探针），机制摸清并实现了大半，但最后一版仍会把值写错
  （`b` 变成 `[[1], 2]`），**为避免带病出货整体撤掉**，补丁留档 `_work/v41/_p172_attempt.txt`（未进构建）。
  已确认的四条结论：①路径别名要单独一张表（P54 的 `AliasN`/`AliasT` 只记名字）；
  ②**路径不能存成文本**（分词器剥掉字符串字面量的引号，`d['k']` 还原成 `d[k]` 就去找变量 `k`），
  要存 **token 与 Kind**；③`pathset` **不能**用 `tokenize(Code[pc])` 恢复现场——在飞的 token 属于
  **录制的路径**而非当前行，必须先快照 `Tok`/`Kind`；④**`replaceStmt` 只重接一条语句**，
  用 `chain([...])` 替换时链的其余部分会被丢掉（症状：恢复 token 的循环消失、`Tok` 只剩一条 `clearL`）。
  撤掉前 `d251` 只有 2/20 过；代表探针仍是 `_work/cmp47/_path.json` 的 V5/V6。
* **残留**：上条别名族、`enumerate(xs, start)`（钩子位置已验证可用，但 P99 的 enumerate 构造器在产物里
  没找到：`xsp`/`xsi` 未出现在 `callfn` 的任何赋值里，需先重新定位）、`min/max(key=…)`、
  扩展解包 `a, *rest = …`、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、剩余字符串方法、非 ASCII。
## v4.107 追加（v4.98 功能轮：P171，出货 v4.98）

* **P171 改"路径里的容器"整族生效**（`a[0].append(2)`、`d['k'].append(2)`、`a[0].sort()`、`a[0][1] = 9`、
  `k.xs.append(2)`；以前**静默无效**或报 `SyntaxError: expression`）。容器是记录串、没有对象标识，
  改的只是求值出来的副本 ⇒ 必须记住"从哪条路径读的"再写回去。`eval` 早就认得这种形态：
  `X . name ( ... )` 的 `.` 不在 `lo+1` 时调 **`methodcall2(lo, mdot, hi)`** —— 它把接收者表达式求值成
  `mcval`/`mctype`、置 `mcpre = 1` 再进 `methodcall`；派发**照常执行**，但写回用的是 `Tok[mdot-1]`
  （接收者的**最后一个 token**，通常是 `]`）⇒ 落进一个叫 `]` 的变量，外面什么都看不见。
  **四个新过程**：**`pvok lo hi`**（这段是合法左值路径吗？给 `w6ok`/`w6cap`）、
  **`pathset lo hi vt vv`**（递归写回：末尾 `[...]` 求值下标→读头部容器→改写那一段→递归写回头部；
  末尾 `.名字` 写实例属性 —— `IAttr*` 是**堆**、按 id 存，不用回写；只剩名字就 `assign`；
  **元素改写交给现成的 `indexset`**：把合成语句 `__pw[__pi]=__pv` 喂给 `tokenize`，转义/字典键/切片/
  报错文案都还在一处，写完再把当前行 `tokenize` 回来）、**`aset iid name vt vv`**（属性的堆写入）、
  **`pdrop`**（递归深度回到 0 后把 `__recv`/`__pi`/`__pw`/`__pv` 从四条并行列表删掉，面板不留临时名）。
  **接线两处**：①`methodcall2` 在路径合法时把 `mcval` 存进 `__recv`、把 `Tok[mdot-1]` **改写成** `__recv`、
  正常跑派发、还原 token，然后**只在值真的变了**时 `pathset(lo, mdot-1, …)`（只读方法因此完全不碰原容器，
  也不会给元组/字符串元素招来新错误）；②`execute` 新增分支处理"左值有两个以上访问器"的语句
  （`a[0][1] = 9`/`k.xs[0] = 9`/`k.a.b = 9`）：扫深度 0 的 `=`、`pvok` 验形状、`eval` 右边、`pathset`。
  函数内的路径写回沿用 P169（基本情形 `assign(名字,…)` 后面补一句 `publish`）⇒ `def f(): a[0].append(2)`
  与 `def f(x): x[0].append(2)` 都能改到调用者。
* **三个坑**：①**一个 reporter 积木只能坐一个输入**（老坑，本轮最贵）—— `OPEN(x)`/`CLOSE(x)` 把**同一个**
  `Tok[i]` 报告块塞进三个比较里，dump 出来的条件完全正确、运行时**恒假**：内层深度循环在 `]` 上既不认
  open 也不认 close ⇒ `pvok` 答"不合法"、整条路静默失效；改法是让 `OPEN`/`CLOSE` 收 **thunk**、
  每次比较现造一个。②**`eval` 会冲掉解释器公用暂存**（`xa`/`ln`/`ev`/`evtype`…）⇒ 头部容器、下标、
  待写值要分落 `__pw`/`__pi`/`__pv` 再交给 `indexset`，且合成语句要用 `tokenize` 造（手摆 `Tok` 会连
  `Kind`/`count` 一起摆错）。③**合成 `tokenize` 之后必须把当前行 tokenize 回来**（先存 `pc`）。
* **验证**：新增 `d250.json` **26/26**（v4.97 上 6/26）；`_path.json` 2/10→**8/10**；
  `_mutation_probe` 7/8→**8/8**、`_mut2` 15/16→**16/16**（`c[0][0] = 5` 随之转绿）；
  `d249` 42、`d248` 61、`d247` 45、`d246` 64、`d245` 30、`d243` 40、`d242` 40、`d241` 30、`d240` 49、
  `d239` 31、`d238` 26、`d237` 18 全绿（`d244` 仍只剩内建 `max(*xs)`）；63 条缺口复核仍 **61/63**；
  120 套快照 **116 套逐例相同**，4 处差异 = `_mut2` Q15 + `_mutation_probe` O8（由错转对）
  + `t111h` M4（集合遍历顺序，MiniPy 两版都是 `{'a','b'}`）+ `featprobe3`（地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**（不变）；`check41` **25,015** 块 errors=0；`frames` fib16 **6388**（不变）；
  `rebuild-old.ps1` **v4.10…v4.98 共 89 版全 MATCH**。产物 `MiniPy_v4.98.sb3`：Interpreter 23,586 / 合计 **25,015** 块
  （新增 4 过程 `pvok`/`pathset`/`aset`/`pdrop`、24 个变量）。
* **补丁拆分**：v4.98 = **`p171.txt`**（放在 `p170.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p98 = 'P171'`，`'v4.98' = ''`，`'v4.97' = "$p98"`，v4.96 往下 87 个条目都带上 `"$p98,$p97"` 前缀。
* **残留（下轮首选）**：**"读出元素再改"的别名** —— `b = a[0]` / `b = d['k']` 之后改 `b` 要回写路径
  （现在只改了副本，**静默给错答案**）；`t = ([1],)` 后 `t[0].append(2)` 元素写不回去（值语义，静默丢失）；
  `min/max(key=…)`/`enumerate(start)`/`sum(start)`、扩展解包 `a, *rest = …`、内建 `*` 展开（`max(*xs)`）、
  方法调用解包 `obj.m(*xs)`、字典 `|` 合并、剩余字符串方法、视图集合语义、非 ASCII。

## v4.106 追加（v4.97 功能轮：P170，出货 v4.97）

* **P170 容器里的容器 + `list.pop(i)`**（四个静默给错答案的老 bug）。容器的编码是
  `lsep + 类型字符 + 转义文本` 一段接一段（`lsep`=字符 31、转义符=字符 30），`listlen`/`listitem`
  靠数 `lsep` 找边界 ⇒ **元素文本里绝不能出现 `lsep`**，而三处漏了转义：
  ①**`indexset` 列表分支**（基座）把刚求值的 `lval` **原样**拼进去 ⇒ `c=[[0],[0]]; c[0]=[5]` 的值自带
  `lsep`、被读成三个元素 `[[], 5, [0]]`（现在先 `lesc(lval)` 存进 `lvesc`，语句返回值仍是未转义的 `lval`；
  切片赋值本来拼的是**整段记录串**，所以一直是好的）；
  ②**`indexset` 字典分支**（基座）在**求值右边之前**就取好了键的类型与转义文本，而字典/列表字面量的求值
  **会用到同一批暂存变量**（`dgkt`/`dgesc`/…）⇒ 键被字面量自己的记账冲掉，`d['a'] = {'b': 1}` 存成键 `'1'`
  （现在键片段一次拼好存进 `dgkf`）；
  ③**`insert`（P13）**交给 `slicewrite` 的是**已编码的一段**、却用未转义的值拼 ⇒ 和 ① 同病（插前先 `lesc(lneed)`，
  与 P138 修 `lsort` 重编码同招）。
  ④**`pop(i)`（基座）根本没看参数**、永远取最后一个（`a=[1,2,3]; a.pop(0)` 答 `3` 剩 `[1, 2]`）⇒ 整条分支重建：
  数长度 → 空表 `IndexError: pop from empty list` → 有参数就 `eval`、**不是整数报 CPython 的
  `TypeError: '<类型>' object cannot be interpreted as an integer`**（类型名走现成的 `tname`，且**浮点一律拒绝**、
  `pop(1.0)` 也报错，判据是文本里有没有 `.`）→ 负数加长度 → 越界 `IndexError: pop index out of range` →
  新过程 **`lpopv 记录 下标`** 摘掉那一段、被删的值回填 `w3v`/`w3t`。
* **两个坑**：①**重建 pop 分支会连 P169 的写回钩子一起删掉** —— `publish` 是 P169 插在旧分支那句 `assign`
  后面的，用 `setStack` 整段换 SUBSTACK 时它一起没了 ⇒ `def f(x): x.pop(0)` 又改不动；新分支里必须**自己再挂一次**。
  ②**`eval` 求值实参时会冲掉 `xa`/`ln`**（解释器公用暂存）⇒ 长度与接收者要先存进 `w3n`/`w3s`（`a.pop(a[0])` 会踩到）；
  另外 `VAR('lmeth')` 在这份产物里是**描述符** `[3,[12,'lmeth',id],[10,'']]`，按"内层是积木 id"找锚点命中 0 个（P169 同坑）。
* **验证**：新增 `d249.json` **42/42**（v4.96 上 21/42）；`d248` 61、`d247` 45、`d246` 64、`d245` 30、
  `d243` 40、`d242` 40、`d241` 30、`d240` 49、`d239` 31 全绿（`d244` 仍只剩内建 `max(*xs)`）；
  63 条缺口复核仍 **61/63**；120 套快照 **117 套逐例相同**，3 处差异 = `d249` 20 条转对（+2 条改名）
  + `t113` F6（集合遍历顺序，MiniPy 两版都是 `a|b`）+ `featprobe3`（地址）⇒ **`ref true` 0 ⇒ 零回归**；
  featprobe **248/259**（不变）；`check41` **24,664** 块 errors=0；`frames` fib16 **6388**（不变）；
  `rebuild-old.ps1` **v4.10…v4.97 共 88 版全 MATCH**。产物 `MiniPy_v4.97.sb3`：Interpreter 23,235 / 合计 **24,664** 块
  （新增 1 过程 `lpopv`、7 个变量 `lvesc`/`dgkf`/`w3*`）。
* **补丁拆分**：v4.97 = **`p170.txt`**（放在 `p169.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p97 = 'P170'`，`'v4.97' = ''`，`'v4.96' = "$p97"`，v4.95 往下 86 个条目都带上 `"$p97,$p96"` 前缀。
* **本轮探针挖出的既有 bug（下轮首选）：改"路径里的容器"整族都不生效**（都是**静默给错答案**）：
  `a=[[1]]; a[0].append(2)` / `d['k'].append(2)` / `a[0].sort()` / `b = a[0]` 后改 `b` / `k.xs.append(2)`
  （属性里的列表，**顶层**也丢）/ `a[0][1] = 9` 报 `SyntaxError: expression`。
  根因同一件事：容器是记录串、没有对象标识，"把改好的内容写回原来的**路径**"（`a[0]`/`d['k']`/`k.xs`）
  这条链没实现——改的只是求值出来的临时副本。P169 解决的是"写回外层**变量**"，这一族要的是"写回外层**路径**"。
  已存档探针 `_work/cmp47/_path.json`（10 条，当前 2/10）。
* **残留**：上条路径族、两层下标赋值的解析、`min/max(key=…)`/`enumerate(start)`/`sum(start)`、
  扩展解包 `a, *rest = …`、内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并、
  剩余字符串方法、视图集合语义、`chr` 只到 32..126、非 ASCII。

## v4.105 追加（v4.96 功能轮：P169，出货 v4.96）

* **P169 函数里改容器的内容不再丢**（`c[0] = 5`、`c.append(1)`、`d['a'] = 5`、`del a[0]`、`a.sort()`）。
  `calluser` 把调用方的变量表快照进 `FN`/`FV`/`FT`、让被调函数在副本上跑、返回时重建 —— 这对
  "重新绑定 = 新局部变量"是对的（`def f(): c = [5]` 必须保持局部），但对**原地改共享对象**是错的。
  容器是记录串、没有对象标识，所以反过来做：让**每一次原地改的写回自己报信** ——
  `indexset`/`indexdel`/`slicewrite`/`methodcall`/`dictmeth`/`setmeth` 末尾那句
  `assign(名字, 新记录串, 类型)` 后面挂一句 `publish 名字`，`publish` 把刚写进去的值抄进**每一层帧快照**
  里同名的那条（`wscan` 扫 `FN`/`FV`/`FT`）⇒ 每层调用者直到顶层都看到新记录串。23 个写回点全部挂上。
* **遮蔽要分清**：`def f(c): c[0] = 9` 用 `f(d)` 调用必须改 `d`，不能改全局那个无关的 `c`。
  `calluser` 给每个参数登记 `ArN`/`ArO`（`pmap`）：参数名 → 实参**是不是裸名字**，不是就记空串（遮蔽且无处可写）；
  `wpub` 先查这张表 —— **参数**发布到"传进来时用的名字"，**不是参数**的名字才发布到自己的名字。
  `f(y)` 里再调 `g(y)` 时 `pmap` 会把实参名**顺着已有绑定解析到底**（`g.x→f.y→全局 a`）；
  关键字实参 `f(x=a)`（片段形如 `名字 = 名字`）同样算裸名字；同作用域的 `y = x` 别名走 P54 的 `AliasN`/`AliasT`。
  帧栈 `FrAr` + `pbegin`/`pend` 不入 `fpush`/`fpop` 存档 —— P14 的存档名单是**它运行那一刻**的变量/列表，
  后加的补丁状态天然不会被快照（构建日志的 `[P14] frames save …` 可验）。
* **两个坑**：①**`B.VAR()` 是"描述符"不是"积木 id"** —— `item('UArgV', VAR('kwq'))` 的 `INDEX` 形如
  `[3,[12,'kwq',id],[10,'']]`，内层是**数组**；第一版只认"内层是字符串积木 id"，于是 3 个参数绑定里
  **0 个**被判成"按片段传参"（日志 `0 by fragment, 3 default`），`f(a)`/`f(x=a)` 全都不回写。
  ②**过程实参不能用变量名冒充**（老坑）：`parg` 里写 `argOf('lo')` 引用的是 `calluser` 的形参，
  必须把 `lo` 一起传进来。
* **验证**：新增 `d248.json` **61/61**（v4.95 上 7/61）；`_mutation_probe` 4/8→**7/8**、`_mut2` 2/16→**15/16**
  （余下两条都是另一个既有 bug：`c[0][0] = 5` 报 `SyntaxError`）；`d247` 45、`d246` 64、`d245` 30、
  `d243` 40、`d242` 40、`d241` 30、`d240` 49、`d239` 31 全绿（`d244` 仍只剩内建 `max(*xs)`）；
  63 条缺口复核仍 **61/63**；116 套快照 **115 套逐例相同**（唯一差异是 `featprobe3` 的地址噪声），
  **`ref true` 0 ⇒ 零回归**；featprobe **248/259**（不变）；`check41` **24,579** 块 errors=0；
  `frames` fib16 **6388**（不变）；`rebuild-old.ps1` **v4.10…v4.96 共 87 版全 MATCH**。
  产物 `MiniPy_v4.96.sb3`：Interpreter 23,150 / 合计 **24,579** 块（新增 7 过程、3 列表 `ArN`/`ArO`/`FrAr`、10 个 `w1*` 变量）。
* **补丁拆分**：v4.96 = **`p169.txt`**（放在 `p168.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p96 = 'P169'`，`'v4.96' = ''`，`'v4.95' = "$p96"`，v4.94 往下 85 个条目都带上 `"$p96,$p95"` 前缀。
* **写 `d248` 时挖出来的既有 bug（都不在本轮范围，列下轮候选）**：①`a.pop(i)` **忽略下标**、总是弹最后一个
  （`a=[1,2,3]; a.pop(0)` → 返回 `3`、剩 `[1,2]`，CPython 是 `1`/`[2,3]`）——**静默给错答案**；
  ②`a[i] = <容器>` 把记录串**拆坏**（`c=[[0],[0]]; c[0]=[5]` → `[[], 5, [0]]`；
  `xs=[{'a':1}]; xs[0]={'a':2}` → `[{}, 'a', 2]`；`d['a']={'b':2}` 键名都坏）——**静默给错答案**；
  ③属性里放的列表 `k.xs.append(2)` 改不动（**顶层**也丢）；④`inner=[1]; t=(inner,); inner.append(2)` 里 `t` 不变
  （P54 已声明"容器元素别名"不在范围）；⑤`c[0][0] = 5` 报 `SyntaxError: expression`；
  ⑥全局数字 `n += 1` 在函数里被当作局部读改写（CPython 是 `UnboundLocalError`）。
* **残留**：上条 ①–⑥、`min/max(key=…)`/`enumerate(start)`/`sum(start)`、扩展解包 `a, *rest = …`、
  内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并、剩余字符串方法、视图集合语义、非 ASCII。

## v4.104 追加（v4.95 功能轮：P168，出货 v4.95）

* **P168 链式比较 `1 < 2 < 3`**。以前 `a op1 b op2 c` 被读成 `a op1 (b op2 c)`（左结合）：
  `1 < 3 < 2` 回答 **`True`（错答案）**、`'a' < 'b' < 'c'` 报 `TypeError: incompatible comparison`、
  `while 0 <= n < 3:` 的函数体一次都不执行、中间操作数被**求值两次**。CPython 的语义是
  `(a op1 b) and (b op2 c)`：每个操作数**只求值一次**、第一个为假的比较就短路，
  整条链的值 = 第一个为假的比较的值（全真时 = 最后一个比较的值）。
* **根因**：`eval` 扫出一个运算符、把下标存进 `ecut` 再调 `pair(lo, hi, cut, Tok[cut])`；
  `pair` 求值**左**片段、把 `cut+1..hi` 整段交给 `rightside` —— 剩下的链就是这样变成右操作数的。
  所以修法是**在 `pair` 的入口挂钩子**：跨度里（**深度 0**）有 ≥2 个比较运算符时交给新过程
  **`chain lo hi cut op`**，然后 `STOPTHIS()` 让 `pair` 的原逻辑不再跑。
* **`chain` 的做法**：每步**求值一次**下一个操作数 → `assign('__chain', v, t)` 停进临时变量 →
  把那个操作数的**第一个 token 改写成** `__chain`（文本 `__chain`、Kind `I` = 变量引用）→
  `rightside(q8v1, q8t1, op, k, k)` 比的就是**两个值** → 立刻还原 token 与 Kind。
  `truth` 判第一个比较：为假就把值当链的结果返回（短路），为真则把"中间操作数"提升成新的左操作数、
  继续下一个运算符。结束后把 `__chain` 从 `Names`/`Values`/`Types`/`Show` 四条并行列表里删掉
  （P155 的 `__fmt` 就是这个收尾套路）。参与链的运算符：`<` `>` `<=` `>=` `==` `!=` `in` `is`。
* **两个坑**：①**钩子必须先看"切点本身是不是比较运算符"**——`eval` 按**最低优先级**切分，
  于是 `1 < 2 < 3 or 9 < 1` 会先按 `or` 切，交给 `pair` 的跨度里有 **4 个**比较运算符；
  第一版"数够 2 个就串链"把 `9 < 1` 也串进了左链（`P38` 直接红），修法是把"数一遍 + 串链"
  整段包进 `IF(isOpTok(argOf('op')), …)`。②**变量名撞车**（老坑）：`c1v`/`c1t`/`cdep`/`ci` 与推导式
  辅助变量重名 ⇒ 构建报 `no variable c1v in Interpreter`；另外**过程实参不能当变量用**
  （`F('cut')`/`setV('cut', …)` 报 `no variable cut`）⇒ 循环状态一律落 `q8*`，过程开头从 `argOf` 拷一份。
* **验证**：新增 `d247.json` **45/45**（v4.94 上 28/45，17 条由错转对）；`d246` 64、`d245` 30、`d243` 40、
  `d242` 40、`d241` 30、`d240` 49、`d239` 31 全绿（`d244` 仍只剩内建 `max(*xs)`）；63 条缺口复核仍
  **61/63**；116 套快照 **113 套逐例相同**，3 处差异 = `d247` 17 条由错转对 + `t113` F6（CPython
  集合遍历顺序，MiniPy 自身输出两版都是 `a|b`）+ `featprobe3`（`enumerate`/`zip` 地址），
  **`ref true` 0 ⇒ 零回归**；featprobe **248/259**（不变）；`check41` **24,332** 块 errors=0；
  `frames` fib16 **6388**（不变）；`rebuild-old.ps1` **v4.10…v4.95 共 86 版全 MATCH**。
  产物 `MiniPy_v4.95.sb3`：Interpreter 22,903 / 合计 **24,332** 块（新增 1 过程 `chain`、19 个 `q8*` 变量）。
* **补丁拆分**：v4.95 = **`p168.txt`**（放在 `p167.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p95 = 'P168'`，`'v4.95' = ''`，`'v4.94' = "$p95"`，v4.93 往下 84 个条目都带上 `"$p95,$p94"` 前缀。
* **本轮探针顺手发现的真 bug（下轮首选）**：**函数里改容器内容会丢** —— `c[0] = 5`、`c.append(1)`、
  `d['a'] = 5` 在 `def f()` 里**静默无效**（函数外看不到），而 `c = [5]` 重新绑定**正确**地保持局部；
  `c[0][0] = 5` 报 `SyntaxError: expression`。根因大概是 `fpush`/`fpop` 把容器的记录串当**值**复制、
  函数内的原地修改没有写回外层变量。**给错答案，优先级高于清单其余项**。
* **残留**：函数内改容器（见上）、`c[0][0] = 5`、扩展解包 `a, *rest = …`、`min/max(key=…)`/
  `enumerate(start)`/`sum(start)`、字典 `|` 合并、内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、
  剩余字符串方法（`rfind`/`rindex`/`casefold`/`strip(字符集)`/`splitlines(keepends)`）、视图集合语义、
  TAB 制表位宽度、非 ASCII。

## v4.103 追加（v4.94 功能轮：P167，出货 v4.94）

* **P167 批量补齐常用方法（22 个）**。字符串 17 个：`ljust` `rjust` `center` `lstrip` `rstrip`
  `swapcase` `capitalize` `partition` `rpartition` `splitlines` `removeprefix` `removesuffix`
  `expandtabs` `isupper` `islower` `isspace` `isalnum`；字典 5 个：`update` `setdefault` `popitem`
  `copy` `clear`。字符串方法的派发是 `methodcall` 里一串 `if smmeth == "名字"` 加末尾的"已知名字"守卫
  （P75 的老套路），实参已在 `sma1`/`smt1`（第二个在 `sma2`，逗号位置在 `mcut`），所以每个方法 =
  一行派发 + 一个小过程：新过程 **`spad`**（ljust/rjust/center）、**`strim`**（lstrip/rstrip）、
  **`sfold`**（swapcase/capitalize）、**`spart`**（partition/rpartition，返回三元组）、
  **`saffix`**（removeprefix/removesuffix）、**`stabs`**（expandtabs）、**`sslines`**（splitlines）、
  **`sclass2`**（四个 `is*`）、**`dupd`**（`dict.update` 的合并重建）。字典方法加在 `dictmeth` 末尾，
  写回走 `assign(nm, 记录串, "D")`。**大小写**：Scratch 的 `=` 与 `contains` 都不分大小写，所以
  判断"内容相等"（`substr(v,1,len(p)) == p`、键比较、swapcase 判定）一律改用 `compareText`，
  判断"是不是大写字母"先 `scase` 求形态再比。
* **五个坑**：①**顶层元组的 `ev` 只是元素记录串**（类型靠 `evtype='T'`），`lsep+'T'+记录串` 那种写法
  只在"元组作为别的容器的元素"时用（`dictitems`）——第一版混了，`partition` 打出 `(('a', '=', 'b'),)`；
  ②**`llen(名字)` 要列表名**，记录串长度得用 `listlen %s` 过程（第一版报 `no list rec in Interpreter`）；
  ③**`IFELSE` 是语句不是 reporter**，不能塞进 `ADD(...)`（构建报 `Cannot set properties of undefined`）；
  ④**CPython 的 `center()` 奇偶怪癖**：多余填充字符在左边当且仅当"余量与宽度都是奇数"
  （`left = marg//2 + (marg & width & 1)`），所以 `'ab'.center(5,'*')` 是 `**ab*`；
  ⑤**`FAILB` 的消息是 JOIN 拼的**，按文字找锚点命中 0 个（又踩一次）⇒ 改用函数体链条末句作锚点，
  并且字典方法分支末尾必须 `STOPTHIS()`（否则掉进 "dict has no method" 兜底）。
  变量名撞车很多（`sfacc`/`sfi`/`spi`/`stacc`/`sti`/`swacc` 都被占）⇒ 统一 `s7*`/`d9*` 前缀。
* **验证**：新增 `d246.json` **64/64**（v4.93 上 9/64，55 条翻绿）；`d245` 30、`d243` 40、`d242` 40、
  `d241` 30、`d240` 49、`d239` 31、`d238` 26、`d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、
  `d232` 30、`d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、
  `d223` 17、`d221` 31 全绿（`d244` 只剩内建 `max(*xs)`）；63 条缺口复核仍 **61/63**；
  115 套快照 **113 套逐例相同**，2 处差异 = `d246` 55 条由红转绿 + `featprobe3`（地址），
  `ref true` **0** ⇒ **零回归**；featprobe **248/259**（不变）；`check41` **24,089** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.94.sb3`：Interpreter 22,660 / 合计 **24,089** 块
  （新增 9 过程、1 列表 `SSLine`）。
* **补丁拆分**：v4.94 = **`p167.txt`**（放在 `p166.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p94 = 'P167'`，`'v4.94' = ''`，`'v4.93' = "$p94"`，v4.92 往下 83 个条目都带上 `"$p94,$p93"` 前缀。
* **残留**：链式比较 `1 < 2 < 3`（**下一轮首选**，现在是左结合会答错）、扩展解包 `a, *rest = …`、
  `min/max(key=…)`/`enumerate(start)`/`sum(start)`、字典 `|` 合并、内建 `*` 展开、剩余字符串方法
  （`rfind`/`rindex`/`casefold`/`strip(字符集)`/`splitlines(keepends)`）、视图集合语义、TAB 制表位宽度、非 ASCII。

## v4.102 追加（v4.93 功能轮：P166，出货 v4.93）

* **P166 内建 `print` 的星号解包 `print(*xs)`**。v4.92 只教会了**用户函数**调用解包；`print` 是**语句**
  （走 `printargs`，不经过 `calluser`），所以 `print(*xs)` 仍是 `SyntaxError: missing expression`。
  `printargs` 早已把实参按顶层逗号切成 `Comma`、逐片求值 `plo..phi` 把渲染结果追加进 `printbuf`，
  片段间的分隔符判据是 `pi > 1`（"不是第一个实参"），所以只加一支：片段以 `*`（不是 `**`）开头时求值
  `plo+1..phi`、要求可迭代（字典取键、字符串取字符），然后循环把每个元素 `strval` 后追加；
  **第一个元素沿用片段自己的 `pi > 1`，其余元素一律加分隔符**——`sep=`/`end=` 与"第一个实参不加分隔"
  的既有行为完全不变。
* **两个坑**：①**不要为"是否已经打印过"新造一个全局标志**。第一版把判据换成新变量 `pany`
  （单个 `print` 与所有 `print(*xs)` 用例全绿），但**嵌套打印**全错：`print(f())` 中 `f` 里 `print('fin')`
  会让外层打出 `" 1"`（多一个空格）。根因：`calluser` 的 `fpush`/`fpop` 会保存并恢复**打印状态**
  ——名单里有 `pi`/`plo`/`phi`/`printbuf`/`psep`/`pstart`…，所以内层 `print` 不污染外层；而新造的 `pany`
  不在名单里。**这一版快照直接报 `ref true = 19`**（d182/d185/d186/t107/t107b/t115c/t123/func 共 19 条
  由绿转红、形态都是多一个空格），修法是**别造新全局**：第一个元素复用 `pi > 1`。
  ②**锚点又踩积木名**：`printargs` 的参数循环 `TIMES = len(Comma)` 的 opcode 是 **`data_lengthoflist`**
  （列表长度），不是字符串长度 `operator_length` ⇒ 锚点命中 0 个。
* **验证**：新增 `d245.json` **30/30**（v4.92 上 8/30，22 条翻绿）；`d244` 里那条 `print(*xs)` 也由红转绿
  （现在只剩内建 `max(*xs)`）；`d243` 40、`d242` 40、`d241` 30、`d240` 49、`d239` 31、`d238` 26、`d237` 18、
  `d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、`d228` 25、
  `d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍 **61/63**；
  114 套快照 **111 套逐例相同**，3 处差异 = `d245` 的 23 条 + `d244` 的 1 条由红转绿 + `featprobe3`（地址），
  `ref true` **0** ⇒ **零回归**（第一版曾报 19）；featprobe **248/259**（不变）；`check41` **23,238** 块
  errors=0；`frames` fib16 **6388**（不变）。产物 `MiniPy_v4.93.sb3`：Interpreter 21,809 / 合计 **23,238** 块
  （新增 4 变量、无新过程）。
* **补丁拆分**：v4.93 = **`p166.txt`**（放在 `p165.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p93 = 'P166'`，`'v4.93' = ''`，`'v4.92' = "$p93"`，v4.91 往下 82 个条目都带上 `"$p93,$p92"` 前缀。
* **残留**：其它内建的 `*` 展开（`max(*xs)`/`min(*xs)`/`sum(*xs)`）、内建的 `**`、方法调用解包
  `obj.m(*xs)`、`print(*xs)` 元素的自定义对象（不走 `__str__`）、`f(**d)` 重复键检查、视图的集合语义、
  字典大小比较、TAB 制表位宽度、非 ASCII。

## v4.101 追加（v4.92 功能轮：P165，出货 v4.92）

* **P165 调用点解包 `f(*xs)` / `f(**d)`**。以前实参片段只认 `name=value`（P100）或一个表达式，
  `*`/`**` 打头的片段被整段交给 `eval` ⇒ 一律 `SyntaxError: missing expression`（`**{` 那种先报
  `SyntaxError: parentheses`）。`calluser` 早就把片段按顶层逗号切开、逐片求值进 `UArgV`/`UArgT`、
  用 `UArgN` 记"位置/关键字名"，所以主体只是给片段分派再加一层：
  * `**expr` → 求值后必须是字典，每个键/值作为**关键字**参数追加（键不是字符串报
    `TypeError: keywords must be strings`）；`*expr` → 必须可迭代（字典取键、字符串取字符），
    每个元素作为**位置**参数追加；其余走原表达式分支。
  * **把 P14 那两句"片段收集"（`addTo UArgV`/`addTo UArgT`）搬进"关键字分支"和"位置分支"**——
    它们在原分派之后、一次只收一个值，解包要收一串。
  * **`calluser` 的逗号扫描补 `{`/`}`**（原来只数 `(`/`[`，于是 `f(1, **{'b': 2})` 从字典内部的逗号切开、
    `eval` 拿到半个 `{` 报 `parentheses`）。
  * **无逗号的调用要在 `eval` 最前面改道**：`f(**d)` 没有顶层逗号，`eval` 的"单实参"快路会先把实参整段求值，
    `calluser` 收不到片段；钩子形如 `名字 ( * …`/`名字 ( ** …` **且该名字确实在 `FnName` 里**时才改道
    （不查名字会抢走 `dict(**d)` 这个内建路径）。
* **五个坑**：①**"片段收集"的两句在分派之后**——第一版忘了搬，解包追加一遍、循环末尾又追加一次
  ⇒ `f(a, b=9)` 传 `*[1]` 的 `b` 变成 `1`、`f(*[])` 凭空多一个空参数；
  ②**`**` 在这里是"一个 token"**（`z|=|g|(|**|d|)`），表达式从 `fplo+1` 开始，第一版照 P157 的注释写成
  `fplo+2` ⇒ `missing expression`（`**{'a':1}` 那种取成 `'a' : 1 }` ⇒ `parentheses`）⇒ 形状判据同时接受
  "一个 `**`"与"两个 `*`"，起点用 `IFELSE(Tok[fplo]=='**', fplo+1, fplo+2)` 现算；
  ③**`dictkeys` 把结果写进 `ev`**，`f(*d)` 必须先 `spsrc = ev` 再当列表用（否则拿字典当列表 ⇒ `too many arguments`）；
  ④无逗号调用到不了片段循环（见上）；⑤`BL()[id].next` 给的是**下一个积木的 id**、不是积木对象
  （`tailV.opcode` 是 `undefined`，改完又写成 `BL()[tailV].next = null`）。
* **验证**：新增 `d244.json` **28/30**（v4.91 上 8/30，20 条翻绿；余下 `B27`/`B28` 是**内建**
  `print(*xs)`/`max(*xs)`——每个内建的实参是自己的钩子、没有统一入口，留下轮）；`d243` 40、`d242` 40、
  `d241` 30、`d240` 49、`d239` 31、`d238` 26、`d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、
  `d232` 30、`d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、
  `d223` 17、`d221` 31 全绿；63 条缺口复核仍 **61/63**；113 套快照 **109 套逐例相同**，4 处差异 =
  `d244` 25 条由红转绿 + `t111h`/`t113`/`featprobe3` 噪声；本轮 `ref true` 计数 **1**（`t113` 的 F6），
  **逐例核对过 MiniPy 自己的输出与 v4.91 完全一致**（只有 `ms` 不同），翻的是 CPython 那一侧 ⇒ **零回归**；
  featprobe **248/259**（不变）；`check41` **23,176** 块 errors=0；`frames` fib16 **6388**（不变）。
  产物 `MiniPy_v4.92.sb3`：Interpreter 21,747 / 合计 **23,176** 块（新增 7 变量、无新过程）。
* **补丁拆分**：v4.92 = **`p165.txt`**（放在 `p164.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p92 = 'P165'`，`'v4.92' = ''`，`'v4.91' = "$p92"`，v4.90 往下 81 个条目都带上 `"$p92,$p91"` 前缀。
* **残留**：内建的 `*`/`**`（`print(*xs)`、`max(*xs)`，**下一轮首选**）、方法调用解包 `obj.m(*xs)`、
  `f(**d)` 的重复键检查、视图的集合语义、字典大小比较、`{'a': 1} == {'a': 1.0}`、TAB 制表位宽度、非 ASCII。

## v4.100 追加（v4.91 功能轮：P164，出货 v4.91）

* **P164 `==` 不再被当成增强赋值运算符**。`if [1] == [1]:` 在 v4.90 及以前**必报**
  `NameError: name 'if' is not defined`（`while [1] == [1] and n < 2:` 报 `while`）。
  根因：P95 的"下标增强赋值"分支判断"右括号后面那个 token 是不是增强运算符"用的是
  **"长度是 2 且第二个字符是 `=`"**——`==`/`!=`/`<=`/`>=` 全都满足。于是 `if [1] == [1]:` 被当成
  `if[1] = [1]`：先 `eval(1, auglsp)`，而这个片段**还带着 `if` 关键字**，`atom` 把它当名字查 ⇒ `NameError`。
  （`if xs[0] == 1:` 不受影响：第二个 token 是 `xs` 而不是 `[`。）
* **四处改动**：**(A)** 那个判据再加 `contains('+-*/%', letter(1, tok))`，只剩 `+= -= *= /= %=`
  （`**=`/`//=`/`&=`… 走另一条"先看运算符、再看后面的 `=`"的分支）；属性分支（`c.v += 1`）有同样的
  判据，一并加上（否则 `c.v == 1` 也会被改写）。**(B)** `execute` 末尾"不是关键字就当表达式求值"的
  白名单里少了 `if`/`while`/`for`，补上。**(C)** `name[...]` 只有"匹配的 `]` 之后真是 `=`"才算赋值，
  于是 `a[0] == 1` 这种语句改成求值后丢弃（以前被塞进 `indexset` 报
  `SyntaxError: expected = after ]`，更早还静默改成 `a[0] = 1` 改掉数据）。
  **(D)** 找回 P95 里**被丢掉**的 else 分支：P95 写的是 `IF(合并判据, [合并体], [拆分体])`，
  但**补丁环境的 `IF` 只收两个参数**，第三段被静默丢弃 ⇒ `a[0] //= 2`、`**=`、`&=`、`|=`、`<<=`、`>>=`
  这一整条路从来没生效过。本轮补建成 `IFELSE(同一条件, [原合并体], [拆分体])`。
* **三个坑**：①**`IF(cond, a, b)` 的第三段会被静默丢掉**（辅助函数不校验参数个数，构建日志一切正常）——
  这是本轮最有价值的发现：P95 的功能缺了一半、四十多轮没人发现，因为没人试过 `a[0] //= 2`；
  **记住 `IF` 只吃 2 段、3 段要用 `IFELSE`**（顺手写了个扫描脚本把全部 `p*.txt` 的辅助函数调用按
  参数个数过了一遍，除这里外只剩一处 `IF(..., [], )` 空 else，无实际影响）。
  ②**构建期表达式积木没有 `parent`**（`parent` 只在串成语句链时才设），"顺着 parent 找外层 if"会落空，
  结构查找必须**从外往里走输入**（本轮遍历所有 `operator_and`，看哪个 OPERAND 是目标 `equals`）。
  ③**定位靠"给候选点打标记"**：给 `execute` 里三个 `eval(1, …)` 各插一条带 `A`/`B`/`C` 标记的 `log`
  并在入口打 `head`，一次就锁定站点 B 且 `auglsp=4`。
* **验证**：新增 `d243.json` **40/40**（v4.90 上 21/40，19 条翻绿）；`d241` 由 29/30 变 **30/30**
  （`L29` 就是 `if [1] == [1]:`）；`d242` 40、`d240` 49、`d239` 31、`d238` 26、`d237` 18、`d236` 20、
  `d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、
  `d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍 **61/63**；
  112 套快照 **108 套逐例相同**，4 处差异 = `d243` 的 19 条 + `d241` 的 1 条由红转绿 +
  `t111h`/`featprobe3` 两处 CPython 侧噪声，`ref true` **0** ⇒ **零回归**；featprobe **248/259**（不变）；
  `check41` **23,015** 块 errors=0；`frames` fib16 **6388**（不变）。产物 `MiniPy_v4.91.sb3`：
  Interpreter 21,586 / 合计 **23,015** 块（**无新变量、无新过程**）。
* **补丁拆分**：v4.91 = **`p164.txt`**（放在 `p163.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p91 = 'P164'`，`'v4.91' = ''`，`'v4.90' = "$p91"`，v4.89 往下 80 个条目都带上 `"$p91,$p90"` 前缀。
* **残留**：调用点解包 `f(*xs)`/`f(**d)`（**下一轮首选**）、视图的集合语义、字典的大小比较报 `TypeError`、
  `{'a': 1} == {'a': 1.0}`、嵌套字段的属性/下标与转换符、TAB 制表位宽度、非 ASCII。

## v4.99 追加（v4.90 功能轮：P163，出货 v4.90）

* **P163 字典视图是真值**。`.keys()` 以前回答**显示字符串** `dict_keys(['a'])`：`print` 看着对，
  但 `list(d.keys())` 把那句话拆成单字符、`len` 是 19、`for` 遍历字母、`sorted`/`sum` 报
  "requires a list"、`d.keys()[0]` 给 `d`。
  * **三个新类型标记** `K`/`V`/`I` 承载**载荷**（键/值/元组的普通 `L` 编码），
    唯一知道包装的是 `strval`（`dict_keys(` + `listfmt(载荷)` + `)`），所以 `print`/`str`/f-string/面板不变。
  * 改的 9 处：`dictmeth`（答视图）、`strval`（包装）、`tname`、`type()`（三种视图 + **顺手修 `E`→`set`**，
    `type({1})` 以前报 `<class 'int'>`）、`callfn` 的迭代白名单与 `len` 分支、`forloop`（两处，含
    `for k, v in ...` 解包路径）、`rightside` 的 `in`、`indexget`（不可下标，报
    `TypeError: 'dict_keys' object is not subscriptable`）、P99 的 `zipbuild`（它的 `isIter` 只认 L/T/G/S）。
* **三个坑**：①**一个 reporter 积木只能坐一个输入**（老坑，这次最贵）——`isView(expr)` 只建了**一个**
  `argOf('vt')` 塞进三个比较，dump 出来的条件完全正确
  （`(((vt = "K") | (vt = "V")) | (vt = "I"))`）而运行时恒假：那块积木的 `parent` 被最后一次链接改成别的比较，
  顺序执行时它回到错误的父节点，另外两个比较读到输入的**影子** `''`，整段分支成了死代码；
  而 `type()`（每次比较新建 reporter）却正常。定位靠临时补丁在入口打 `vt`（=K ✓）、
  在包装分支的 SUBSTACK 里打点（**一条都没出来**）。修法：`isView` 收 **thunk**，每次比较新建 reporter。
  ②**`Array.isArray(v[1]) && typeof v[1] === 'string'` 是自相矛盾**——`mentionsArg` 这么写让锚点永远命中 0
  （参数 reporter 永远是积木，数组形态是内联变量描述符，两种情况要分开写）；**写完谓词先在已知为真的例子上验**。
  ③**`zip()` 的检查**要搜整句 `TypeError: zip() needs iterables`（`FAIL` 带了前缀，`mentionsLit` 是精确匹配），
  而且那句 `fail` 在 **SUBSTACK** 里、不在条件子树里。
* **验证**：新增 `d242.json` **40/40**（v4.89 上 9/40，31 条翻绿）；`d240` 49、`d241` 29/30、`d239` 31、
  `d238` 26、`d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、
  `d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；
  63 条缺口复核仍 **61/63**；111 套快照 **108 套逐例相同**，3 处差异 = `d242` 的 31 条由红转绿 +
  `t111h`/`featprobe3` 两处 CPython 侧噪声，`ref true` **0** ⇒ **零回归**；featprobe **248/259**（不变）；
  `check41` **22,954** 块 errors=0；`frames` fib16 **6388**（不变）。
  产物 `MiniPy_v4.90.sb3`：Interpreter 21,525 / 合计 **22,954** 块（**无新变量、无新过程**，只改 9 处既有代码）。
* **补丁拆分**：v4.90 = **`p163.txt`**（放在 `p162.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p90 = 'P163'`，`'v4.90' = ''`，`'v4.89' = "$p90"`，v4.88 往下 79 个条目都带上 `"$p90,$p89"` 前缀
  （同一套 `(=\s*)"\$p89("|,)` 正则）。
* **残留**：视图的集合语义（`d.keys() == {'a'}`、`&`/`<` 等）、`f(**d)`、`if` 的条件以 `[` 开头、
  字典的大小比较（CPython 报 `TypeError`）、`{'a': 1} == {'a': 1.0}`、嵌套字段的属性/下标与转换符、
  TAB 制表位宽度与 `TabError`、非 ASCII。

## v4.98 追加（v4.89 功能轮：P162，出货 v4.89）

* **P162 字典的规范形式 + 容器相等**。字典在 MiniPy 里是一串 `lsep + 类型 + 文本` 记录（键值交替）。
  * **重复键只留一条**：位置取**第一次**出现、值取**最后一次**——`{'a':1,'a':2}` → `{'a':2}`、
    `len` 是 1、`d['a']` 是 2、`{'a':1,'b':2,'a':3}` → `{'a':3,'b':2}`。做这件事的是 P125 就有的
    `dlast`，但它原来的策略是"丢掉先出现的那条、留最后一次的位置"，于是
    `{k: k for k in ['x','y','x']}` 打出 `y, x`；函数体重写成"每个键只在第一次的位置输出 +
    值取最后一次"（先向前扫"这个键出现过吗"，出现就整对丢掉；再向后扫到最后一个同键对取值）。
    每个构造点都过一遍：`{...}` 字面量（`dictlit`）、`dict(...)` 关键字形式、字典推导式。
    `dict(映射, 关键字)` 里**映射排到关键字前面**（CPython 的位置），于是 `dict(d, a=2)` 既保持 d 的顺序、
    又让关键字的值胜出。
  * **容器相等**：新过程 `veq va ta vb tb`（比较任意两个值：容器递归回 `ceq`、字符串用 `compareText`
    **区分大小写**、其余用 `=`）与 `ceq ca ct cb cu`（字典按键值对查、列表/元组按同一位置逐个比）。
    `rightside` 在通用比较分支**之前**插 `==`/`!=` 的容器分支，并把这个情形**从通用分支的条件里减掉**。
    顺带修掉"列表/元组的原始串比较不分大小写"（`['A'] == ['a']` 以前是 `True`）。
* **五个坑**：①**孤儿语句骗了 `predecessorOf`**——`dict(...)` 那段要改两处，先 `replaceStmt` 换掉 `if p18d`，
  再 `replaceSpan` 换 `ev`/`evtype`；但 `replaceStmt` 不清旧语句的 `next`，`predecessorOf(evSet)` 找到的是
  **已摘掉的旧 if**，新链挂到死块上被 prune（症状：build 日志全打、产物里那段代码不见了）⇒ 两处合并成一次
  `replaceSpan`。②**通用比较分支会把 `ev` 覆盖回去**（它看到 `lt2 = 'D'` 但 `evtype = 'B'`）⇒ 必须把容器情形
  从它的条件里减掉，而且判据要读 **`evtsave`**（进入 `rightside` 时存的右操作数类型），因为钩子已经把
  `evtype` 改掉了——写成 `evtype` 的条件恒真、等于没减。③**`dceq` 用"找到没有"的布尔量当下标**
  （`dxs = 1` 之后循环计数器已经走到末尾）⇒ 照 P79 存**下标**。④第一版 `dlast` 只做了"取最后一个同键对的值"，
  **每对都输出** ⇒ `{'a':1,'b':2,'a':3,'b':4}` 变成 `{'a':3,'b':4,'a':3,'b':4}`，必须再加前向扫描。
  ⑤**互相递归的过程先建定义**（`veq`↔`ceq`，`callProc` 要查被调过程的定义 ⇒ 先 `newProc` 两个，再
  `attachBody`）；新变量撞了 P125 的 `cn` ⇒ 新名字统一加 `q` 前缀。
* **验证**：新增 `d240.json` **49/49**（v4.88 上 24/49，25 条翻绿）与 `d241.json` **29/30**
  （容器相等 30 条；余下 `L29` 是既有的解析限制——`if` 的条件直接以 `[` 开头，v4.88 同样失败）；
  `d239` 31、`d238` 26、`d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、
  `d230` 59、`d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；
  63 条缺口复核仍 **61/63**；110 套快照 **106 套逐例相同**，4 处差异 = `d240` 的 25 条与 `d241` 的 6 条
  由红转绿 + `t111h`/`featprobe3` 两处 CPython 侧噪声，`ref true` **0** ⇒ **零回归**；
  featprobe **248/259**（不变）；`check41` **22,833** 块 errors=0；`frames` fib16 **6388**（不变）。
  产物 `MiniPy_v4.89.sb3`：Interpreter 21,404 / 合计 **22,833** 块（新增 12 变量、**2 个新过程**
  `veq`/`ceq`，并重写 `dlast` 的函数体）。
* **补丁拆分**：v4.89 = **`p162.txt`**（放在 `p161.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p89 = 'P162'`，`'v4.89' = ''`，`'v4.88' = "$p89"`，v4.87 往下 78 个条目都带上 `"$p89,$p88"` 前缀
  （这次用一条 `(=\s*)"\$p88("|,)` 的正则同时覆盖带逗号/不带逗号两种写法，78 行一次改完）。
* **残留**：字典视图 `d.keys()`/`d.values()`/`d.items()`（还是显示字符串，`list()`/`len`/下标/遍历都不对）、
  字典的大小比较（CPython 报 `TypeError`）、`{'a': 1} == {'a': 1.0}`（类型标记不同）、
  `if` 的条件以 `[` 开头、`f(**d)`、嵌套字段的属性/下标与转换符、TAB 制表位宽度与 `TabError`、非 ASCII。

## v4.97 追加（v4.88 功能轮：P161，出货 v4.88）

* **P161 `%c` 收"一个字符的字符串" + CPython 的类型错文案**。`'%c' % 'a'` 本来就是 `'a'`（CPython），
  MiniPy 只收整数、且自造文案 `%c requires int or char`（还把 `[1]` 说成 "int or char"）。
  * **文案**：P156 那个 `pcsrc` 包装器的**百分号侧** SUBSTACK2 换成
    `fail('TypeError: %c requires an int or a unicode character, not ' + tname(vt))`，
    `tname`（P144）自动给出 `str`/`float`/`list`/`dict`/`NoneType`。
  * **一字符透传**：`%c` 分支（`control_if`，条件是 `conv == 'c'`）的**前三条语句**包进
    `IFELSE(AND(pcsrc == 0, AND(vt == 'S', len(vv) == 1)), [ptx = vv], [原三条])`。
* **两个坑**：①**`conv` 是自定义积木实参、不是变量**——它的引用是 `argument_reporter_string_number`
  积木（`fields.VALUE[0] === 'conv'`），按"OPERAND1 是变量"找分支命中 0 个。
  ②**`%c` 分支是 `%` 与 `.format` 共用的**（只差 `pcsrc`）——条件一开始没带 `pcsrc == 0`，
  于是 `'{:c}'.format('a')` 从"报错"变成**静默打印 `a`**（回归）。105 套快照里没有这条，
  是新写的 `d239` 用例 c20 抓到的；拿 v4.87 单跑三条探针（`'{:c}'.format('a')` 报错、
  `'{:q}'.format('a')` 打印 `a`、`'{:c}'.format(65)` → `A`）才确认分支共用。
  **教训：往共用分支上加行为，先问"还有谁走这里"。**
* **验证**：新增 `d239.json` **31/31**（单字符/整数/宽度/类型错/`.format` 与 f-string 不受影响；
  v4.87 上只有 15/31）；`d238` 26、`d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、
  `d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、
  `d221` 31 全绿；63 条缺口复核仍 **61/63**；107 套快照 **105 套逐例相同**，2 处差异全是噪声
  （`t113` F6 的 CPython 集合顺序、`featprobe3` 的 `enumerate`/`zip` 地址），`ref true` **0**
  ⇒ **零回归**；featprobe **248/259**（不变）；`check41` **22,464** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.88.sb3`：Interpreter 21,035 / 合计 **22,464** 块
  （**无新变量、无新过程**）。
* **补丁拆分**：v4.88 = **`p161.txt`**（放在 `p160.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p88 = 'P161'`，`'v4.88' = ''`，`'v4.87' = "$p88"`，`'v4.86'` 往下 76 个条目都带上 `"$p88,"` 前缀
  （批量替换 `= "$p87,` 会漏掉没有逗号的 `'v4.86' = "$p87"`，这轮又中一次，靠数条数抓出来：
  77 行只改了 76 行）。
* **残留**：`%c` 的取值上界（ASCII 模型，`'%c' % 300` 报 `%c arg not in range(32, 127)`；
  CPython 到 `0x110000`）、`'%c' % True`（CPython `chr(1)`，MiniPy 按 bool 报类型错）、
  `dict(映射, 关键字)` 记录顺序、dict `==` 顺序敏感与重复键、`f(**d)`、嵌套字段的属性/下标与转换符、
  TAB 制表位宽度与 `TabError`、非 ASCII。

## v4.96 追加（v4.87 功能轮：P160，出货 v4.87）

* **P160 格式规格里的嵌套字段**（`'{:{w}}'.format(3, w=5)`、`'{:{}.{}f}'.format(3.14159, 8, 2)`）。
  规格本身也是一段格式字符串，以前宽度整个丢掉。**两个原因叠在一起**：
  * **字段扫描要数嵌套大括号**：`strfmt` 遇到**第一个 `}`** 就收尾，于是 `{:{w}}` 被读成 `spec=':{w'`
    （末尾 `}` 被当字段结束符丢了）。改成"`}` 且**嵌套深度为 0** 才收尾"，规格分支里维护深度
    （`{` 加一、`}` 减一，都照原样收进规格文本）。
  * **展开规格里的嵌套字段**：`flditem` 在交给 `fldspec` **之前**走一遍规格文本，每个 `{...}` 按顶层
    字段规则解析——**空名字**用"下一个自动位置参数"（与外面共用自动编号计数器，CPython 就是这样）、
    **全数字**是显式位置下标、**其它**当关键字名查 `FmtK`——值用 `strval` 转字符串拼回规格；
    越界报 `IndexError: Replacement index N out of range for positional args tuple`，缺名字报 `KeyError: 'w'`。
* **两个坑**：①**`contains` 的参数顺序**——Scratch 的 `operator_contains` 是"**STRING1 里有没有
  STRING2**"，照 P155 的习惯写 `contains(x, s) → STRING1 = s`，于是判"规格里有没有 `{`"时写反成
  "`{` 里有没有整段规格"，恒为假；**症状极隐蔽**：`{:{}}`（纯自动编号）不依赖这个判断照常工作，
  只有带 `{` 的规格悄悄不展开。改用"第一个参数是干草堆"的 `hasNeedle(hay, needle)`。
  ②**`fwspec == '!'` 的锚点撞车**：字段扫描里还有一个 `fwspec == ''` 的 if/else，只按"条件是
  比较 `fwspec`"去找会命中两个 ⇒ 必须再要求第二个操作数是字面量 `'!'`。
* **验证**：新增 `d238.json` **26/26**（关键字/自动/显式宽度、宽度+精度、精度、填充、左对齐、零填充、
  名字与位置混用、两个字段两个宽度、字符串宽度、两个报错用例 + 10 条回归；v4.86 上只有 12/26）；
  `d237` 18、`d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、
  `d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍
  **61/63**；107 套快照 **105 套逐例相同**，2 处差异 = `d238` 的 14 条由红转绿 + `featprobe3`（地址），
  `ref true` **0** ⇒ **零回归**；featprobe **248/259**（不变）；`check41` **22,447** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.87.sb3`：Interpreter 21,018 / 合计 **22,447** 块
  （新增 9 变量、无新过程）。
* **补丁拆分**：v4.87 = **`p160.txt`**（放在 `p159.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p87 = 'P160'`，`'v4.87' = ''`，`'v4.86'` 往下 77 个条目都带上 `"$p87"` 前缀。
* **残留**：嵌套字段与自动/显式编号混用的互相校验、嵌套字段里的属性/下标（`'{:{a.w}}'`）与转换符
  （`'{:{w!r}}'`）、`dict(映射, 关键字)` 记录顺序、`f(**d)`、`%c` 的语义与文案、
  TAB 制表位宽度（8）与 `TabError`、非 ASCII。

## v4.95 追加（v4.86 功能轮：P159，出货 v4.86）

* **P159 TAB 字符**。TAB 以前一出现就 `SyntaxError: ASCII text required`，原因有**三层**，缺一层都不行：
  ①**字符合法性**——`checkASCII` 判断字符是否合法的办法是**切到以该字符命名的造型**再问造型号有没有变
  （那套造型就是 95 个可打印 ASCII），TAB 没有造型 ⇒ 报错；现在那个 `AND(造型号没变, 字符不是空格)`
  后面再串一个 **`且字符不是 TAB`**。②**缩进计数**——`prepare` 数前导空白只跳空格 ⇒ TAB 缩进的行看起来
  顶格；跳过条件改成**空格或 TAB**（各算 1 宽；`indent` 只当层级用，P158 已放开宽度要求）。
  ③**词法跳过**——`tokenize` 只把空格当空白 ⇒ TAB 变成 token，行内直接 `SyntaxError: expression`，
  而且 `prevhead`（上一行第一个 token）会变成 TAB，连带"意外缩进"的判据也失配；空格判据改成**空格或 TAB**。
* **一个坑**：`tokenize` 的空白判据比的是**变量** `ec`（`ec = letter(ep, source)`），不是内联 `letter_of`
  积木——第一版按"OPERAND1 是 letter_of"找锚点，落空（`tokenize space test = 0`）。
* **验证**：新增 `d237.json` **18/18**（TAB 缩进/嵌套/`for`/`while`/`def`/`class`/`try`/`if-else`、
  两个 TAB 的层级、行尾 TAB、字符串里的 TAB、TAB 缩进的多行函数与嵌套循环、4/2 空格回归、
  非 ASCII 仍报错；v4.85 上只有 5/18）；`d236` 20、`d235` 19、`d234` 30、`d233` 32、`d232` 30、
  `d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、`d226` 8、`d225` 10、`d224` 16、`d223` 17、
  `d221` 31 全绿；63 条缺口复核仍 **61/63**；106 套快照 **102 套逐例相同**，4 处差异 = `d237` 的 13 条
  由红转绿 + **featprobe2 的"TAB 缩进"由红转绿** + `t113`（CPython 集合哈希序）+ `featprobe3`（地址），
  `ref true` 只有 `t113` 那处噪声 ⇒ **零回归**；featprobe **247/259 → 248/259**；
  `check41` **22,317** 块 errors=0；`frames` fib16 **6388**（不变）。产物 `MiniPy_v4.86.sb3`：
  Interpreter 20,888 / 合计 **22,317** 块（没有新增变量与过程，三处都是放宽已有判据）。
* **补丁拆分**：v4.86 = **`p159.txt`**（放在 `p158.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p86 = 'P159'`，`'v4.86' = ''`，`'v4.85'` 往下 76 个条目都带上 `"$p86"` 前缀。
* **残留**：TAB 的**制表位宽度**（记 1，CPython 按 8 展开）与 `TabError`（TAB/空格混用不报错）、
  缩进一致性检查（比 CPython 宽松）、非 ASCII（ASCII 字符串模型）、`dict(映射, 关键字)` 记录顺序、
  `f(**d)`、嵌套规格 `'{:{w}}'`、`%c` 的语义与文案、`'{a!a}'` 的真 ascii 语义。

## v4.94 追加（v4.85 功能轮：P158，出货 v4.85）

* **P158 缩进宽度放开**。`prepare` 算出每行的前导空格数 `indent` 后，硬性要求"必须是 4 的倍数"
  （`if not indent % 4 == 0: fail('IndentationError: use 4 spaces')`），于是**大量现成的 2 空格
  Python 代码一行都跑不了**。改法只有两处：①删掉那句 4 倍数检查；②把"只深四格才算开块"的判据
  `indent == previndent + 4` 改成 `indent > previndent`。之所以敢这么改：**全解释器只有这两处**把缩进
  和数字 4 绑在一起（把 `prepare`/`execute` 里所有与 `indent`/`Indents` 相关的加减乘除取模都扫了一遍），
  `indent` 其它地方**只当"层级"用**（与上一行比大小、压进 `Indents`、空行/注释行记 `-1`）——所以
  4 空格代码行为一字不变，2/3/6/8 空格从此都能开块。"多余缩进"仍然报错（前一行不是块开头时），
  只是判据从"深四格"变成"更深"。
* **TAB 缩进仍不行**，原因在另一条线上：字符检查 `checkASCII` 用**造型名**当合法字符表（纯 ASCII 才能
  过），TAB 没有对应造型 ⇒ `SyntaxError: ASCII text required`。要支持 TAB 得给那套造型加制表符，
  属于"ASCII 字符串模型"这一层，留作残留。
* **验证**：新增 `d236.json` **20/20**（2/3/6/8 空格、嵌套、`for`/`while`/`def`/`class`/`try`/
  `if-elif-else`、注释与空行、多余缩进与不一致缩进的反例、4 空格回归；v4.84 上只有 5/20）；
  `d235` 19、`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、`d228` 25、`d227` 26、
  `d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍 **61/63**；
  105 套快照 **101 套逐例相同**，4 处差异 = `d236` 的 17 处 + **featprobe2 的"2 空格缩进"由红转绿** +
  `t113`（CPython 集合哈希序）+ `featprobe3`（地址），`ref true` **0** ⇒ **零回归**；
  featprobe **246/259 → 247/259**；`check41` **22,307** 块 errors=0；`frames` fib16 **6388**（不变）。
  产物 `MiniPy_v4.85.sb3`：Interpreter 20,878 / 合计 **22,307** 块（没有新增变量与过程，只删了一句、
  改了一个判据）。
* **补丁拆分**：v4.85 = **`p158.txt`**（放在 `p157.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p85 = 'P158'`，`'v4.85' = ''`，`'v4.84'` 往下 75 个条目都带上 `"$p85"` 前缀。
* **残留**：**TAB 缩进**（`checkASCII` 的造型表里没有制表符，或让 `checkASCII` 放行 `\t`）、缩进一致性
  检查（CPython 的 `unexpected indent`/`TabError` 比 MiniPy 严）、`dict(映射, 关键字)` 记录顺序、
  `f(**d)`、嵌套规格 `'{:{w}}'`、`%c` 的语义与文案、`'{a!a}'` 的真 ascii 语义。

## v4.93 追加（v4.84 功能轮：P157，出货 v4.84）

* **P157 `dict(**d)` 解包 + `sum(d)` 对键求和**。
  * **`dict(**d)`**：P148 教过 `dict` 的 `name = value`，但 `**` 那片会掉进"映射实参"分支被整片交给
    `eval` ⇒ `SyntaxError: missing expression`。现在片段识别多一个形态 `** expr`（**`**` 在 MiniPy
    词法里是**一个** token**（幂运算符））：先 eval，必须是字典，否则
    `TypeError: dict() argument after ** must be a mapping, not <类型>`（`tname`）；键逐个与已收集的
    关键字名比对（`kwhas`），撞名报 `TypeError: dict() got multiple values for keyword argument 'a'`
    并登记进名字表；记录在**该片段的位置**追加，所以 `dict(b=2, **d)` 保持 CPython 顺序。
    另外 P148 的关键字处理只在"片段有顶层 `=`"时进入，`dict(**d)`（无 `=`）压根到不了那里，
    "无 `=` 但多片"那条错误又抢先报错 ⇒ **扫描多学一个标志 `p18s`**（顶层 `**` 置 1），
    进入条件改 `p18e == 1 或 p18s == 1`，多片报错那条再要求 `p18s == 0`。
  * **`sum(d)`**：P149 的字典白名单里没有 `sum` ⇒ 仍是 `sum() requires a list`；加进去后自然对**键**
    求和（`sum({1: 2})` = `1`），字符串键抛出与 CPython 一致的
    `unsupported operand type(s) for +: 'int' and 'str'`。
* **三个坑**：①**`**` 是单个 token**——第一版按"两个 `*`"检测（还写了兼容分支），判据永远不成立，
  行为一字未变（build 通过、日志也打了）；**先确认词法再写 token 判据**。②**键表不能借用 `p18d`**
  ——它是"映射实参的记录"，片段循环结束会把 `p18d` 追加进结果，于是 `dictkeys` 的键表被当成记录，
  输出多出一对 `'a': ''`（`dict(**d)` 打出 `{'a': 1, 'a': ''}`），改用独立的 `p18w`。
  ③**`eqVar` 要收"输入描述符"而不是"积木 id"**（`b.inputs.CONDITION` 是 `[2, id]`，传 `[1]` 谓词恒假，
  症状 `[P157] entry if = 0`）；而且 `p18e` 的**初始化**语句在 `if fn == 'dict'` 那一层、不在
  `if p18e == 1` 里面，锚点要往上一层找。
* **验证**：新增 `d235.json` **19/19**（解包 5 条含空字典与两个 `**`、报错 4 条、`sum` 3 条、
  7 条回归；v4.83 上只有 9/19）；`d234` 30、`d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、
  `d227` 26、`d228` 25、`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍
  **61/63**；104 套快照 **101 套逐例相同**，3 处差异 = `d235` 的 15 处（10 条由红转绿 + 其余只是
  措辞/错误条目变化）+ `t111h`（CPython 集合哈希序）+ `featprobe3`（地址），`ref true` **0** ⇒
  **零回归**；featprobe **246/259**（不变）；`check41` **22,314** 块 errors=0；`frames` fib16 **6388**
  （不变）。产物 `MiniPy_v4.84.sb3`：Interpreter 20,885 / 合计 **22,314** 块（新增 5 变量、无新过程）。
* **补丁拆分**：v4.84 = **`p157.txt`**（放在 `p156.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p84 = 'P157'`，`'v4.84' = ''`，`'v4.83'` 往下 74 个条目都带上 `"$p84"` 前缀。
* **残留**：`dict(映射, 关键字)` 的**记录顺序**（值都对，打印/遍历顺序是关键字在前——P148 起就记着，
  本轮没动：改成映射在前会让映射的值盖住关键字，语义反而错）、`f(**d)`（用户函数/内建的关键字解包）、
  嵌套规格 `'{:{w}}'`、`%c` 的语义与文案、`'{a!a}'` 的真 ascii 语义、带路径字段的 `__fmt` 临时名。

## v4.92 追加（v4.83 功能轮：P156，出货 v4.83）

* **P156 format 报错措辞 + 字段错误**。`pctitem` 是 `%`/f-string/`.format` 三条路共用的，于是 `.format`
  的类型错一直借用 `%` 的措辞；而字段不足/越界/编号混用**什么都不说**（少打一段、或整段替换消失）。
  * **两个入口各自报身份**：新变量 `pcsrc`（1 = `.format`/f-string，0 = `%`），由 `flditem` 与 `pctfmt`
    在调用 `pctitem` 前设置。`pctitem` 里 **7 处类型检查**（`d/i`、`f`、`e`、`x/X/o/b`、`c`、`%`、`g`）
    改成 `IFELSE(pcsrc == 1, [格式侧], [百分号侧])`：格式侧用现成的 `tname`（P144）取类型名拼出
    `ValueError: Unknown format code '<conv>' for object of type '<类型>'`；百分号侧也顺手对齐 CPython
    （`%d`/`%i` = "a real number is required, not <类型>"、`%x`/`%o` = "an integer is required, not <类型>"，
    且**用实际转换符**而不是写死 `%x`；`%f`/`%e`/`%g` 的 "must be real number, not <类型>" 也带上类型名）。
    **逐字核对**：把 `d234` 的 `mini.err` 与 CPython 的 `pyerr` 打印出来比，E1–E17 全部一致。
  * **字段错误**（`strfmt`）：新变量 `fwm` 记录编号模式（`''`/`'A'`/`'M'`）——自动编号遇到 `'M'`、
    显式编号遇到 `'A'` 就报 CPython 的 `cannot switch from …`（**具名字段不参与** ⇒ `'{a} {}'`、
    `'{a} {0}'` 仍合法）；取不到值时不再静默，而是
    `IndexError: Replacement index <n> out of range for positional args tuple`。
    实现上把原来那个 `if sfhas == 0 …` 与"越界就什么都不做"的 `if` **就地改成 if/else**
    （改 `opcode` + 补 `SUBSTACK2`），原有 SUBSTACK 链一字不动。
  * **一个坑**：`OPERAND1` 是**输入描述符**（`[3,[12,'sfhas',id],…]`）而不是积木 id——第一版把描述符
    丢给 `BL()` 找积木，锚点全落空（`strfmt sfhas if = 0`）。查变量引用要直接看描述符里的 `[12, 名字]`。
* **验证**：新增 `d234.json` **30/30**（8 条格式侧类型错含 f-string、3 条越界、2 条编号混用、
  2 条百分号类型错、4 条"具名与编号混用应当合法"、11 条回归；v4.82 上 24/30，且**逐字**比对通过）；
  `d233` 32、`d232` 30、`d231` 36、`d230` 59、`d229` 44、`d227` 26（K25 改标 `expectError`）、`d228` 25、
  `d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31 全绿；63 条缺口复核仍 **61/63**；
  103 套快照 **98 套逐例相同**，5 处差异 = `d234` 的 16 处（6 条由红转绿 + 10 条只是措辞变准）+
  `d232` 1 处（措辞）+ `d227` 1 处改名 + `t111h`（CPython 集合哈希序）+ `featprobe3`（地址），
  `ref true` **0** ⇒ **零回归**；featprobe **246/259**（不变）；`check41` **22,214** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.83.sb3`：Interpreter 20,785 / 合计 **22,214** 块
  （新增 2 变量、无新过程）。
* **补丁拆分**：v4.83 = **`p156.txt`**（放在 `p155.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p83 = 'P156'`，`'v4.83' = ''`，`'v4.82'` 往下 73 个条目都带上 `"$p83"` 前缀
  （这轮正则写成 `8[0-9]|7[0-9]|[1-6]\d`，把上轮漏掉的 80 段补上了）。
* **残留**：`%c` 的**语义**（`'%c' % 'a'` CPython 返回 `'a'`、MiniPy 报错；`'%c' % 300` CPython 接受、
  MiniPy 按 32–127 报错；`not float` 的措辞）、嵌套规格 `'{:{w}}'`、`'{a!a}'` 的真 ascii 语义、
  带路径字段的 `__fmt` 临时名、`dict(**d)`、`sum(d)` 的报错文案。

## v4.91 追加（v4.82 功能轮：P155，出货 v4.82）

* **P155 格式字段的属性/下标路径**。CPython 的替换字段是
  `名字或序号 ( "." 属性 | "[" 下标 "]" )* [ "!" 转换 ] [ ":" 规格 ]`，而**方括号里是字面量**：
  `str.isdigit()` 决定它是整数下标还是字符串键（`'{a[k]}'.format(a={'k': 9})` 就是 `a['k']`，
  `'{a[i]}'.format(a=[1])` 是 `TypeError: list indices must be integers or slices, not str`——
  方括号里不是表达式）。`strfmt` 只认纯名字/序号 ⇒ `'{a.n}'` 去查关键字 `a.n`（`KeyError`），
  `'{a[1]}'` 把 `1` 当**显式位置索引**（输出空行）。
  * **字段扫描**把字段拆成"基准名"与**路径**（从第一个顶层 `.` 或 `[` 开始），并把每个 `[...]`
    改写成解释器能直接求值的形式：**全是数字就原样、否则加引号**（`[k]`→`['k']`、`[-1]`→`['-1']`、
    `[1:2]`→`['1:2']`）；`!`/`:` 只在方括号外才是分隔符（`'{a[1]:>5}'` 照样）。
  * **新过程 `fpath %s %s %s`**（值、类型、路径）**把活交回解释器**：
    `assign("__fmt", 值, 类型)` → `tokenize("__fmt" + 路径)` → `eval(1, len(Tok))`。
    于是嵌套（`{a.b[0]}`）、两层属性、字典键、负下标的 TypeError、字符串下标与**所有报错文案**
    都和普通代码里同一个表达式一致——不必再写第二套索引实现。求值后立刻把临时变量从
    `Names`/`Values`/`Types`/`Show` 四条并行列表里删掉（MiniPy 没有 `del`）以保持变量面板干净；
    程序自己用 `__fmt` 会被覆盖（已注明）。
  * **顺带修老 bug**：`'{a[k]} {a[j]}'.format(a={'k': 1, 'j': 2})` 以前报 `SyntaxError: parentheses`
    ——P82 的实参扫描与 P150 的 `fmtarg` 只把 `(`/`[` 当括号，**字典字面量里的逗号**被当成实参分隔符；
    现在 `{`/`}` 也计入深度。
* **三个坑**：①**"括号内"标记与"内容缓冲"共用变量**——`fwcon = '~'` 当标记又被追加内容，第一个内容
  字符就冲掉标记，`]` 落到外层分支 ⇒ 关键字名成了 `a]`（症状 `KeyError: 'a]'`）；改用独立 `fwbr`。
  ②**`.` 分支漏写**：重构扫描时只写了 `[`，`.` 进了关键字名 ⇒ `KeyError: 'a.n'`。
  ③**锚点太松**：按"条件里含 `(`/`[`"找深度 IF，methodcall 里 5 处命中；改成精确匹配"同一变量分别与
  `(`、`[` 比较的两条 `EQ` 组成的 `or`"。另外 `rebuild-old.ps1` 的批量前缀正则写成 `7[0-9]` **漏了 80**
  （`v4.80` 没带 `$p82`）——自检不报错但会让旧版复现带上新补丁，靠列印 map 发现并修正。
* **验证**：新增 `d233.json` **32/32**（属性/下标 19 条含嵌套、两层属性、字典整数键、`!r` 组合、
  三种"方括号是字面量"的 CPython 报错反例 + 13 条回归；v4.81 上只有 12/32）；`d232` 30、`d231` 36、
  `d230` 59、`d229` 44、`d227` 26、`d228` 25、`d226` 8、`pct` 8、`fstr` 8、`str` 12、`cls` 12 全绿；
  63 条缺口复核仍 **61/63**；102 套快照 **98 套逐例相同**，4 处差异 = `d233` 的 **20 条由红转绿**
  （+1 条 expectError 用例由静默变报错，两边都通过）+ `t111h`/`t113`（CPython 集合哈希序）+
  `featprobe3`（地址）⇒ **零回归**；featprobe **246/259**（不变）；`check41` **22,067** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.82.sb3`：Interpreter 20,638 / 合计 **22,067** 块
  （新增 5 变量 + 1 过程）。
* **补丁拆分**：v4.82 = **`p155.txt`**（放在 `p154.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p82 = 'P155'`，`'v4.82' = ''`，`'v4.81'` 往下 72 个条目都带上 `"$p82"` 前缀。
* **残留**：类型不匹配的 `ValueError: Unknown format code …` 文案、嵌套规格 `'{:{w}}'`、少参数/越界/
  自动-显式混用的报错文案（现为静默）、`'{a!a}'` 的真 ascii 语义、带路径字段要过一次
  `assign`+`tokenize`+`eval`（换来与普通代码一致的语义）、以及那个 `__fmt` 全局临时名。

## v4.90 追加（v4.81 功能轮：P154，出货 v4.81）

* **P154 `#` 前缀 + f-string 的 `!` 转换**（外加修掉一个**给错答案**的老 bug）。
  * **`#` 备用形式**：前缀属于 `pctitem`（基数与数字表都在它手里），所以把 `#` 做成**又一个标志位**：
    `fldspec` 不再跳过它，而是记进新变量 `fwsharp`（`''`/`'#'`）并拼进 `fwbody`；`pctitem` 的标志
    容许表由 `-0+ ,_` 扩到 `-0+ ,_#`、命中置 `p54h`；十六/八/二进制分支在最后拼 `ptx` 时先算前缀
    （`0x`/`0X`/`0o`/`0b`——**大小写必须 `compareText`**，`EQ` 不区分大小写）。**零填充要插在前缀之后**
    （`'{:#010x}'` = `0x000000ff`），而宽度块只认开头的 `-`/`+`/空格 ⇒ 这一种在分支里自己补零并把
    `p15z` 清 0，让宽度块不插手。`%` 那边只要把 `#` 加进 `pctfmt` 的规格扫描容许集（`'%#x' % 255`）。
  * **f-string 的 `!r`/`!s`**：字段文法与 `.format` 相同，而 P77 的 `fstr` 只切 `:` ⇒ `!r` 粘在表达式上
    去喂 `eval`（`SyntaxError`）。现在 `fstr` **在切 `:` 之前**先扫顶层 `!`（**跳过 `!=`**），把 `!conv`
    剪掉、转换符存进 `fz9`；剪完的文本（`表达式 + 剩下的 :规格`）再交给原有的 `:` 切分，规格解析一行没改。
    交给 `flditem` 的规格构造成 `!conv[:spec]`——P153 的 `flditem` 本来就认这个形式，转换逻辑直接复用；
    另外**只有转换、没有规格**时也必须走 `flditem`（原来只有 `fz2 > 0` 才走），路由条件改成
    `fz2 > 0 或 fz9 非空`。
  * **顺手修错答案**：`'{a:b}'.format(1.5)` 以前过了"值是数字"的检查后把 1.5 抹成 1 打印 `1`；现在
    十六/八/二进制分支额外要求**值是整数**（`floor(v) == v`），否则报错（文案仍是 `%` 那边的
    `TypeError: %x format: an integer is required`——`pctitem` 分不清调用来自 `%` 还是 `.format`，
    CPython 两处措辞本就不同，留后续）。
* **锚点坑（这轮踩两次）**：①`fstr` 里找"带 `flditem` 的 if/else"时 `reach` **不跳过 SUBSTACK**，
  把外层的 if/else 也算进来 ⇒ 2 个候选；改成按条件锚（`fz2 > 0` 的 `control_if_else`）。
  ②`pctitem` 里按"条件含字面量 `o`"找十六进制分支又撞别处 ⇒ 改成要求条件子树**同时**含 `o`/`X`/`x`。
* **验证**：新增 `d232.json` **30/30**（`#` 前缀 8 条含零填充/宽度/大小写/`%#x`、f-string `!` 转换 9 条含
  带规格/表达式/列表/`!=` 反例、13 条回归；v4.80 上只有 13/30）；`d231` 36、`d230` 59、`d229` 44、
  `d227` 26、`d228` 25、`d226` 8、`pct` 8、`fstr` 8、`str` 12、`one` 10 全绿；101 套快照 **98 套逐例相同**，
  3 处差异 = `d232` 的 **17 条由红转绿** + `t113`（CPython 集合哈希序）+ `featprobe3`（地址），
  `ref true` **0** ⇒ **零回归**；featprobe **246/259**（不变）；`check41` **21,962** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.81.sb3`：Interpreter 20,533 / 合计 **21,962** 块
  （新增 8 变量，无新过程）。
* **补丁拆分**：v4.81 = **`p154.txt`**（放在 `p153.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p81 = 'P154'`，`'v4.81' = ''`，`'v4.80'` 往下 71 个条目都带上 `"$p81"` 前缀。
* **残留**：`'{a.n}'`（`KeyError: 'a.n'`）/ `'{a[1]}'`、`'{0[1]}'`（输出空行）这类字段里的属性与下标、
  类型不匹配的 `ValueError: Unknown format code …` 文案、嵌套规格 `'{:{w}}'`、少参数/越界/自动-显式混用
  的报错文案（现为静默）、`'{a!a}'` 的 ascii 语义（现按 `repr`）。

## v4.89 追加（v4.80 功能轮：P153，出货 v4.80）

* **P153 `!` 转换 + 千分位分组**。字段文法本是 `名字 [ "!" 转换 ] [ ":" 规格 ]`，而 `strfmt` 只在 `:`
  处切分 ⇒ `'{a!r}'.format(a='xy')` 去查一个名叫 `a!r` 的关键字，报 `KeyError: 'a!r'`；`,`/`_` 则被
  `fldspec` 直接跳过 ⇒ `'{a:,}'.format(1234567)` 打出 `1234567`。
  * **`!r`/`!s`/`!a`**：`strfmt` 的字段扫描加一个中间状态（`fwspec` 由 `''` → `'!'` → `'!r'`，
    遇到 `:` 才转成规格）；**`flditem` 的函数体整体重建**——先把 `vv`/`vt` 落到 `fwv`/`fwt`，
    字段以 `!` 开头就按转换符先算一遍（`s` → `strval`，`r`/`a` → `reprval`），结果写回 `fwv`/`fwt`
    并把 `fwspec` 改写成剩下的 `:规格`，后面的规格解析与补白**原样复用**（转换后是字符串，
    `fldspec` 收到 `fwt='S'`，默认对齐自然是左对齐，与 CPython 一致）。
  * **`,`/`_` 分组**：`fldspec` 记下分隔符（新变量 `fwcom`）并拼进 `fwbody`；`pctitem` 的**标志循环**
    与**宽度循环**都认这两个字符（Python 允许分隔符在宽度前 `,.2f` 或宽度后 `12,.2f`），置
    `p53c`/`p53u`；再在**宽度块之前**调用新过程 **`group %s %s`**（数字串、分隔符）插入分隔符——
    放在宽度块前，补白就把逗号算进宽度（`'{a:15,}'` = `      1,234,567`）。`group` 先摘符号与小数部分，
    只对整数部分每三位插一个分隔符。
* **一个很值钱的坑（`"0"` 的影子）**：`fldspec` 的零填充分支与普通分支各有一个 `setV('fwbody', …)`，
  第一版用 `JSON.stringify(inputs.VALUE).includes('"0"')` 区分——**两条都命中**：`num()`/`txt()` 是
  **内联基元**（`[1,[4,'0']]`/`[1,[10,'0']]`），而 Scratch 每个数字输入都带 `[4,'0']` 的**影子**，
  于是"含 `"0"`"对任何产生数字的连接块都成立。症状很整齐：**凡带宽度的用例补白全变 `0`**
  （`'{a:>5}'.format(a=1)` → `00001`、`'{a!s:^7}'` → `00000ab`，9 条回归同时红）。改成找**内联的
  字符串 `'0'`**（`[10,'0']`，只有零填充那条有）即可。**教训：区分语句别靠 JSON 子串，靠结构/语义。**
* **验证**：新增 `d231.json` **36/36**（`!r`/`!s` 10 条含带规格与混用、千分位/下划线 15 条含宽度/
  左对齐/零填充/负数/小数/自定义填充、11 条既有能力回归；v4.79 上只有 13/36）；`d230` 59、`d229` 44、
  `d227` 26、`d228` 25、`d226` 8、`pct` 8、`fstr` 8、`str` 12 全绿；100 套快照 **97 套逐例相同**，
  3 处差异 = `d231` 的 **23 条由红转绿**（`ref false` 23 / `ref true` 0）+ `t113`（CPython 集合哈希序，
  差异在参考侧）+ `featprobe3`（地址）⇒ **零回归**；featprobe **246/259**（不变）；
  `check41` **21,857** 块 errors=0；`frames` fib16 **6388**（不变）。产物 `MiniPy_v4.80.sb3`：
  Interpreter 20,428 / 合计 **21,857** 块（新增 12 变量 + 1 过程）。
* **补丁拆分**：v4.80 = **`p153.txt`**（放在 `p152.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p80 = 'P153'`，`'v4.80' = ''`，`'v4.79'` 往下 70 个条目都带上 `"$p80"` 前缀（这轮的批量替换
  同时处理了 `''` 与 `""` 两种引号，没再中"单引号空串"那个坑）。
* **残留**：`f'{x!r}'`（**f-string** 里的 `!` 转换——`fstr` 把 `!` 当表达式的一部分交给 `eval`）、
  `'{a:#x}'`/`#b`/`#o` 前缀、`'{a.b}'`/`'{a[0]}'` 字段、嵌套规格 `'{:{w}}'`、类型不匹配的
  `ValueError: Unknown format code …`、少参数/越界/自动-显式混用的报错文案（现为静默）。

## v4.88 追加（v4.79 功能轮：P152，出货 v4.79）

* **P152 数值格式收尾**：`g`/`G` 通用格式（顺带修掉挂了很久的 `%g`/`%G`）、`b` 二进制、`%` 百分号类型。
  三者都在 `pctitem`（P77/P145/P146，`%`、f-string、`.format` 共用）里。
  * **`g`/`G`**：新过程 **`pctg %s %s %s`**（值、类型、转换符）。精度 P 默认 6（`0` 当 1）是**有效数字位数**：
    先把值规整到 `[1,10)` 得到十进制指数 X，尾数按 P-1 位小数四舍五入（进位到 10 就把 X 加一），
    再按 `X < -4` 或 `X >= P` 选指数/定点（定点小数位 `P-1-X`），最后**去掉尾随零与孤立的小数点**
    （新过程 **`gstrip %s`**）。**数值主体递归调回 `pctitem`**（复用已验证的 `e`/`f` 分支，规格不带宽度），
    再让外层原有的宽度/零填充收尾——所以 `'%10.4g'`/`'%-10.4g'`/`'%08.3g'` 对齐都对。
    递归会覆盖 `pctitem` 自己的标志位，进入前把 `pwid`/`pleft`/`p15z`/`p15pl`/`p15s` 存进 `p52*`、之后恢复。
  * **`b`**：十六进制/八进制分支本来就按 `p15b`（基数）和 `p15t`（数字表）取位 ⇒ 只要三个语句改成
    二选一（`p15b` 取 2、`p15t` 取 `'01'`、八进制那个 `if` 排除 `b`）再加一个 `or` 条件项。
  * **`%`**：值 ×100、按 `f`（默认 6 位小数）格式化、补上 `%`；宽度照旧由外层处理
    ⇒ `'{a:8.1%}'.format(a=0.25)` = `   25.0%`。
* **三个坑**（全靠临时 `log` 调试定位）：①**`sfind` 返回 0 基下标**——指数形式要从 `e` 处切开
  `1.00000e+08` 去尾随零，按 1 基写就切成 `1.0000|0e+08`，拼回来 `10e+08`（症状 `%g` 打出 `+10e-05`）；
  ②**"保存标志位"和"临时值"共用了变量**——`p52a`/`p52b` 既存 `p15pl`/`p15s` 又存切开的尾数/指数，
  恢复时把 `'1'`/`'e-05'` 写回标志位，符号块又加一个 `+`（症状 `'%+g' % 0.5` = `++0.5`）⇒
  **保存恢复的槽位要和值临时量分开命名**；③**`EQ` 是大小写不敏感的 `=`**——P146 判 `%E` 写的是
  `compareText(conv,'E')`，照搬到 `g` 上永远拿不到大写（`conv` 是 `'G'`），`%G` 会打出小写 `e`。
* **又一次踩到的老坑**：`rebuild-old.ps1` 里新版本条目是**单引号空串** `''`，批量替换的正则只配双引号
  ⇒ 该版本不跳过新补丁，自检报 `v4.7x :: DIFF blocks …`。这轮 `'v4.78' = ''` 又中了一次，
  被 `rebuild-old` 的自检抓住。
* **验证**：新增 `d230.json` **59/59**（`%g`/`%.Ng`/宽度/符号/进位换形式、`{:g}`/`{:.2g}`/`f'{:g}'`、
  `b` 与十六进制回归、`%` 百分号、上一轮规格的回归；v4.78 上只有 18/59）；`d229` 44、`d227` 26、
  `d228` 25、`d226` 8、`pct` 8、`fstr` 8、`str` 12 全绿；99 套快照 **96 套逐例相同**，
  3 处差异 = `d230` 的 **41 条由红转绿**（`ref false` 41 / `ref true` 0）+ `t111h`（CPython 集合哈希序）
  + `featprobe3`（地址）⇒ **零回归**；featprobe **246/259**（不变）；`check41` **21,730** 块 errors=0；
  `frames` fib16 **6388**（不变）。产物 `MiniPy_v4.79.sb3`：Interpreter 20,301 / 合计 **21,730** 块
  （新增 19 变量 + 2 过程）。
* **补丁拆分**：v4.79 = **`p152.txt`**（放在 `p151.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p79 = 'P152'`，`'v4.79' = ''`，`'v4.78'` 往下 69 个条目都带上 `"$p79"` 前缀。
* **残留**：`'{a:,}'` 千分位、`'{a:#x}'`/`#b`/`#o` 前缀、`'{a!r}'`/`'{a!s}'` 转换、`'{a.b}'`/`'{a[0]}'`
  字段、嵌套规格 `'{:{w}}'`、类型不匹配的 `ValueError: Unknown format code …`（`'{a:b}'` 目前复用
  `%x format: an integer is required`）、少参数/越界/自动-显式混用的报错文案（现为静默）。

## v4.87 追加（v4.78 功能轮：P151，出货 v4.78）

* **P151 格式规格**（`'{a:>5}'.format(a=1)` 冒号后面那段，同时修好 **f-string**）。以前 `strfmt` 读字段
  只认"数字或空"：`'{a:>5}'` 的 `5` 被当成**显式位置索引**，取不到值 ⇒ 整个替换消失（空行）；
  P77 的 f-string 则把规格**最后一个字符**当转换符（`>` 当规格、`5` 当转换符）⇒ 同样什么都不发生。
  CPython 的规格是 `[[fill]align][sign][#][0][width][,][.precision][type]`，而 P77/P145 的 **`pctitem`**
  早就认识 `-`/`0`/`+`/空格 标志、宽度、`.` 精度与 `d/f/s/r/c/x/X/o`，所以本轮的活是**翻译**：
  新过程 **`fldspec %s %s`**（规格文本 + 值类型）逐位解析出 `fwbody`/`fwconv` 交给 `pctitem`；
  **零填充交给 `pctitem`**（它把 0 插在符号之后 ⇒ `'{:05d}'.format(-42)` = `-0042`），其余填充由
  **`flditem %s %s`** 收尾（算空格数、按 `L`/`R`/`C`/`E` 摆放；`E` 即 `=` 对齐，先把开头符号摘下来、
  填完再放回去 ⇒ `'{:=5}'.format(-42)` = `-  42`）。**对齐默认值取决于值类型**（字符串左、数字右），
  所以 `fldspec` 需要 `vt`。`strfmt` 只在**第一个 `:`** 处把字段切成"名字/索引"与"规格"，
  所以 `'{a:>5}'` 的 `a` 仍是关键字名、`5` 不再污染显式索引。
* **f-string 走同一套**：P77 的 `fstr` 用 `fz3 + fz4` 还原完整规格文本后交给 `flditem`
  （调用前后保存/恢复字段规格变量，免得参数里嵌的 f-string 冲掉外层规格）⇒
  `f'{n:>5}'`、`f'{s:*^7}'`、`f'{x:8.3f}'`、`f'{n:05d}'` 全部对齐 CPython。
* **两个坑**：①**精度扫描会把转换符也吃掉**——`REPEATU(fwi > len, [if 是数字则追加; fwi++])` 结束时
  `fwi` 已经越过转换符，于是 `fwconv` 为空、退回 `strval`（症状：`'{a:.2f}'` 打出 `3.14159`）；
  必须写成"当前字符不是数字就停"（与宽度扫描同一写法）。②**锚点撞车**——P150 在 `strfmt` 里新加了
  第二个 `or` 条件的循环（关键字查表），P151 找字段扫描循环时要再加一条"条件子树里有 `letter_of`"。
* **`rebuild-old` 的坑**：给新版本加跳过项时，`'v4.77'` 那一行是**单引号空串** `''`，
  而批量替换的正则只匹配双引号 → v4.77 没跳过 P151，`rebuild-old` 立刻报
  `v4.77 :: DIFF blocks 19825 vs 20085`（**这个自检很值钱**）。修好后 v4.10…v4.78 共 69 版全 MATCH。
* **验证**：新增 `d229.json` **44/44**（`.format` 规格 30 条：对齐/填充/符号/零填充/精度/宽度/多字段/
  转义/空规格/参数带下标 + f-string 与 `%` 回归 14 条）；`d227` 26、`d228` 25、`d226` 8 全绿；
  98 套快照 **96 套逐例相同**，2 处差异 = `d229` 的 **33 条由红转绿** + `featprobe3`（地址）⇒ **零回归**；
  featprobe **246/259**（不变）；`check41` **21,514** 块 errors=0；`frames` fib16 **6388**（不变）。
  产物 `MiniPy_v4.78.sb3`：Interpreter 20,085 / 合计 **21,514** 块（新增 19 变量 + 2 过程）。
* **补丁拆分**：v4.78 = **`p151.txt`**（放在 `p150.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p78 = 'P151'`，`'v4.78' = ''`，`'v4.77'` 往下 68 个条目都带上 `"$p78"` 前缀。
* **残留**：`'{a:.2e}'`/`'{a:%}'`/`'{a:b}'` 这类 `pctitem` 不认识的类型符退回 `str()`（宽度/精度仍生效）、
  `'{a:,}'` 千分位不插分隔符、`'{a!r}'`/`'{a!s}'` 转换不支持、`'{a.b}'`/`'{a[0]}'` 字段、
  嵌套规格 `'{:{w}}'`、少参数/越界/自动-显式混用的报错文案（三者现为静默）。

## v4.86 追加（v4.77 功能轮：P150，出货 v4.77）

* **P150 `str.format` 的关键字形式**（v4.76 试过又撤回的那条）。`'{a}'.format(a=3)` /
  `'{a}={b}'.format(a=1, b=2)` 报 `SyntaxError: expression`（P82 的实参扫描按顶层逗号切片后
  **整片交给 eval**），`{a}` 字段又被读成"没有数字 ⇒ 自动编号"。做法：新增过程 **`fmtarg %s %s`**
  接替"每片各自 eval"——先扫该片有没有顶层 `=`（`==`/`<=`/`>=`/`!=` 在词法上各是**一个** token，
  所以判 `tok == '='` 就够），有就按 `名字 = 值` 切：名字进新列表 **`FmtK`**、值走 eval，
  **重复名字**报 `SyntaxError: keyword argument repeated: a`、**位置参数跟在关键字后面**报
  `SyntaxError: positional argument follows keyword argument`。位置参数照旧先进 `FmtV`/`FmtT`、
  关键字值排在它们后面，新变量 **`fwpos`** 记位置参数个数 ⇒ 关键字值下标恒为 `fwpos + 序号`，
  位置编号不会撞上关键字。`strfmt` 扫字段时把原始文本累进 **`fwname`**，"没有数字但非空"就当名字查
  `FmtK`（缺则 CPython 的 `KeyError: 'a'`），**具名字段不参与自动编号**，所以
  `'{} {a}'.format(1, a=2)` 与 `'{a} {}'.format(1, a=2)` 都对得上。
  显式索引的边界顺手从 `len(FmtV)` 改成 **`fwpos`**：没有关键字时两者相等（一字不变），
  有关键字时 `'{0}'.format(a=1)` 不会再拿关键字值当位置参数 0。
* **顺手修掉 P82 起就有的收信者污染**（本轮价值最大的一处）：P82 是**先把所有参数 eval 完**、
  最后才 `strfmt(xa)`，而 `xa` 是全局量——参数里的 `a[1]` 会走 `indexget`（它的形参就叫
  `xa`/`xb`）、`'ab'.upper()` 会走 `methodcall`（重设 `xa`），于是**格式串变成了参数值**：
  `'{}'.format(a[1])` 打印整个列表的原始编码、`'{}'.format('ab'.upper())` 打印 `ab`、
  `'{} {}'.format(a[0], a[1])` 只出一个值。现在扫描开头就 `fwrec = xa`，交给 `strfmt` 的是 `fwrec`。
  新增 `d228.json` 里 25 条，**v4.76 只有 5 条对，v4.77 全绿**。
* **两个坑**：①**只换 `strfmt` 外层那个 `if error == ''` 的 SUBSTACK 是不够的**——P82 的旧实参扫描
  还挂在"格式路由器"（`if xb == 'S' and lmeth == 'format'`）下面**先跑**，`a=3` 照样报 SyntaxError；
  必须整段替换**路由器**的 SUBSTACK（锚点：条件子树里同时含字面量 `S` 与 `format` 的 `control_if`，
  并断言 `strfmt` 调用确实在它下面）。②**`reach(set)` 是空集合**——`inDef()` 返回的已经是可达集合，
  再 `reach()` 一次会把它当单个 id，`BL()[Set]` 是 undefined，于是"找不到锚点"（第一版报
  `strfmt field scan = 0`）。**定位手法**：给 `fmtarg` 临时塞 `log` 调试块（`DBG-A flo=7 fhi=10
  lo=a hi=]` / `DBG-C … ev=8 t=N`），看见它拿到的值是对的却打印出列表 ⇒ 锁定问题在它之后（`xa` 污染）。
* **验证**：新增 `d227.json` **26/26**（关键字 15 条 + 混合/转义/数字字段/自动编号/异常对象当参数 +
  4 条报错）、`d228.json` **25/25**；`d226` 8、`d225` 10、`d224` 16、`d223` 17、`d221` 31、`d220` 20、
  `d218` 21、`d217` 24、`d206` 37、`d204` 14、`d202` 24、`d190` 46、`t107` 12、`t133` 60、`func` 31、
  `str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、`demos` 12、`tuple` 20 全绿；96 套快照 **93 套逐例相同**，
  3 处差异 = `d228` 的 **20 条由红转绿** + `t111h`（CPython 集合哈希序）+ `featprobe3`（地址）⇒ **零回归**；
  featprobe **246/259**（不变）；`check41` **21,254** 块 errors=0；`frames` fib16 **6388**（不变）；
  `rebuild-old.ps1` **v4.10…v4.77 共 68 版全 MATCH**。产物 `MiniPy_v4.77.sb3`：
  Interpreter 19,825 / 合计 **21,254** 块（新增 10 变量 + 1 列表 + 1 过程）。
* **补丁拆分**：v4.77 = **`p150.txt`**（放在 `p149.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p77 = 'P150'`，`'v4.77' = ''`，`'v4.76'` 往下 67 个条目都带上 `"$p77"` 前缀。
* **残留**：`'{a:>5}'.format(a=1)` 的格式规格（规格里的数字被当成字段文本/索引，替换被丢掉）、
  `'{a.b}'` 字段当名字查（`KeyError: 'a.b'`）、`'{a[0]}'` 字段因含数字被当成显式位置索引
  （`'{} {a[0]}'.format(7, a=[9])` 得 `7 7`）、`'{a:%}'`/`'{a:b}'`/`'{a:g}'`（`pctitem` 还不认识这三个
  转换符——**`'{a:.2e}'`/`'{a:e}'`/`'{a:x}'`/`'{a:o}'` 本来就能用**，P145/P146 早已给 `pctitem` 加了
  `e`/`E`/`x`/`X`/`o`/`c`/`r`，本轮只是把它们接通到 `.format`/f-string）、`'{a:,}'` 千分位、
  `'{} {}'.format(1)` 少参数与显式索引越界的 `IndexError` 文案、自动/显式编号混用的 `ValueError`
  （三者现为静默，为不动既有快照而保留）、参数里再嵌一层 `.format()`（`FmtV`/`FmtK` 是全局列表，
  嵌套会互冲）、`'{a!r}'` 转换、`dict(**d)`、`sum(d)` 的报错文案。

## v4.85 追加（v4.76 功能轮：P149，出货 v4.76）

* **P149 字典当序列遍历**。`list(d)` / `tuple(d)` / `set(d)` / `sorted(d)` / `enumerate(d)` / `zip(d, x)` /
  `min(d)` / `max(d)` / `any(d)` / `all(d)` 以前全报 `TypeError: '<类型>' object is not iterable`（`sorted`
  则是 `sorted() requires a list`）——`callfn` 的分支链只认 `L/T/G/E`，`D` 直接掉到末尾兜底。
  做法很省：`dictkeys`（P91）本来就产出"键的列表编码"，只要在**两个**地方加一次白名单转换就行——
  ①`callfn` 的**分支链之前**（此处 `ev`/`evtype` 已是实参值）：`evtype == 'D'` 且函数名∈
  `list/tuple/set/enumerate/zip/sorted/min/max/any/all` ⇒ 调 `dictkeys`；②`eval` 的 `sorted` 分支
  （它自己在 callfn 之前跑，够不到上面那次转换），同一段判断，**两个站点都插**（第二处做成幂等：
  只有 `evtype == 'D'` 才动，所以遍历所有同名 fail 站点是安全的）。`len`/`str`/`print`/字典方法全没碰，
  它们的 D 语义不变。**本轮唯一新积木**就是这个 `IF`（`p149.txt` 没有新变量/列表/过程）。
* **坑（第三次踩）**：白名单那条 `OR` 链最初把**同一个** `argOf('fn')` 报告块塞进 11 个 `EQ` 里——
  Scratch 的一个报告块只能挂在一个输入上，第二次引用会把它**搬走**，于是整条链形同虚设
  （调试日志里 `fn=list`、`evt=D` 都对，转换就是不发生）。改成每次比较现造一个报告块
  （`isIterator = f => ITERATORS.reduce((a, n) => OR(a, EQ(f(), txt(n))), ...)`，
  `f` 是 `() => argOf('fn')`）即可。**结论：写补丁时凡是在 `OR`/`AND` 链里复用某个 `argOf`/`find`
  报告块，一律换成 thunk。**
* **另一条路试过又撤回**：同轮还试图做 `'{a}'.format(a=1)` 的关键字形式，接线做完后**打坏了位置形式**
  （`'{} {}'.format(1, 2)` 输出为空）而关键字那条也没修对，整块（含 `sfname`/`sfnidx`/`sfnf` 三个变量
  与 `FmtN` 列表、`replaceChain` 辅助）已删除，留待下一轮——**做法记在下面**：`format` 的实参收集在
  `methodcall` 里、占位符解析在 `strfmt` 里，**不要动原来那条 `eval`**，而是在它**之前**插一段
  "若是 `名字 = 值` 就记名 + 求值，并让原 eval 跳过该片段"，否则位置形式会被截断。
* **验证**：新增 `d226.json` **8/8**（`list(d)`/`tuple(d)`/`sorted(set(d))`/`sorted(d)` 四种吃字典、
  `len`+`for k in d` 回归、列表源/字符串/元组/集合四种 `list(...)` 回归、`'{} {}'.format(1,2)` 位置形式回归）；
  `d225` 10、`d224` 16、`d223` 17、`d221` 31、`d220` 20、`d218` 21、`d217` 24、`d206` 37、`d204` 14、
  `d202` 24、`d190` 46、`t107` 12、`t133` 60、`func` 31、`str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、
  `demos` 12、`tuple` 20 全绿；94 套快照 **92 套逐例相同**，2 处差异全是既知噪声（`t113` 的
  `for x in {'a','b'}` 是 CPython 集合哈希序，且这轮是**由红转绿**——`{'a','b'}` 字面量与 P149 无关，
  纯属参考侧随机；`featprobe3` 是地址）——**零回归**；featprobe **246/259**（不变）；
  `check41` **21,140** 块 errors=0（比 v4.75 的 21,068 多 72 块）；`frames` fib16 **6388**（不变）；
  `rebuild-old.ps1` **v4.10…v4.76 共 67 版全 MATCH**。产物 `MiniPy_v4.76.sb3`：
  Interpreter 19,711 / 合计 **21,140** 块（变量 862 / 列表 114，与 v4.75 相同）。
* **补丁拆分**：v4.76 = **`p149.txt`**（放在 `p148.txt` 之后、`p68.txt` 之前）；`rebuild-old.ps1` 里
  `$p76 = 'P149'`（注意这个变量名与历史上那个 `P76` 补丁无关，它指的是"出货 v4.76 要跳过的补丁"），
  `'v4.76' = ''`，`'v4.75'` 往下 66 个条目都带上 `"$p76"` 前缀。
* **残留**：`'{a}'.format(a=3)`（上条已记做法）、`sum(d)` 的报错文案（CPython 是 `unsupported operand …`
  而非 `requires a list`）、`%g`/`%G`、`dict(**d)`、`dict(mapping, kwarg)` 混合时记录顺序与 CPython 不同
  （关键字在前）、`dict(a=1, a=2)` 的报错时机（CPython 编译期、MiniPy 运行期）。

## v4.84 追加（v4.75 功能轮：P148，出货 v4.75）

* **P148 `dict` 的关键字实参**。`dict(a=1)` 报 `SyntaxError: expression`（整段 `a=1` 被交给 eval），
  `dict(a=1, b=2)` 报 `NameError`（带顶层逗号的调用走 eval 的内建分支链，`dict` 不在其中，落到 P141 的
  最后兜底）。两个挂点：①eval 的最后兜底里，`dict` 且实参含顶层逗号时改走 `callfn`（**只放行 `dict`**，
  否则 `len(1, 2)` 会从报错变成算错）；②`callfn` 的**实参求值之前**（不是 `dict` 分支里——那时
  `eval(lo, hi)` 已经把 `a=1` 求过了）加一段只对 `dict` 生效的处理：扫出顶层逗号数/是否有顶层 `=`，
  有 `=` 就按顶层逗号切片、每片必须是 `名字 = 值`（名字是字符串键、值走 eval），重复名字报
  `SyntaxError: keyword argument repeated:`，不是 `名字 = 值` 的片当**映射实参**（非字典报
  `TypeError: '<类型>' object is not iterable`）；没有 `=` 但有多个片报
  `TypeError: dict expected at most 1 argument, got N`。
* **三个坑**：①**P142 的"空实参守卫"当初插错了位置**——它按"`lo > hi` 的 if/else"找锚点，实际命中的是类构造
  分支里的 `if not(lo > hi)`，那半截守卫一直只对"类调用"生效（v4.69 的零参测试全走 eval 侧那一半，
  所以没暴露）；本轮改用"`if (fn in ClsName)` 分支之外的 `eval(lo, hi)`"定位主实参求值点。
  ②**片段起点差一**：下一段起点应是"逗号位置 + 1"（照 `calluser` 的写法），直接用逗号位置会让第二段从
  `,` 开始 ⇒ `SyntaxError`。③"多个位置参数"的判据写成 `p18c > 1`（应为 `> 0`，一个逗号=两个参数）。
* **验证**：新增 `d225.json` **10/10**；`d224` 16、`d223` 17、`d221` 31、`d220` 20、`d218` 21、`d217` 24、
  `d206` 37、`d190` 46、`t107` 12、`t133` 60、`func` 31、`str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、
  `demos` 12、`tuple` 20、`d204` 14 全绿；94 套快照 **92 套逐例相同**，2 处差异全是既知噪声（`t111h` 是
  CPython 参考侧的集合哈希序 + featprobe3 地址）——**零回归**；featprobe **246/259**；`check41` **21,068**
  块 errors=0；`frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.75 共 66 版全 MATCH**。
  产物 `MiniPy_v4.75.sb3`：Interpreter 19,639 / 合计 **21,068** 块（新增 8 变量 + 2 列表 + 1 过程）。
* **补丁拆分**：v4.75 = **`p148.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p75 = 'P148'`。
* **残留**：`'{a}'.format(a=3)`、`list(d)`（字典的键）、`%g`、`dict(**d)`；映射+关键字混合时记录顺序与
  CPython 不同（关键字在前）。

## v4.83 追加（v4.74 功能轮：P147，出货 v4.74）

* **P147 `%` 的映射键形式**。`'%(a)s=%(b)d' % {'a': 'x', 'b': 3}` 以前报
  `ValueError: unsupported format character '(' (0x28) at index 1`——P77 的 `pctfmt` 从没学过映射形式，
  `(` 被当成转换符。做法：规格扫描前加一段读 `(name)` 进 `pvkey`（之后的宽度/精度/转换符照旧解析），
  取值交给新过程 **`dget`**（在"被当作映射的第一个实参"里按键查值：`listitem` 本来就解转义，按 `1,3,5…`
  取键、命中后取下一个即值；找不到报 CPython 的 `KeyError: 'zz'`）。接线时把原来"检查实参够不够 + 读
  `pvv`/`pvt` + `pvk++`"四条语句**整段摘下来**放进 `IFELSE(有键, [映射查表], [那四条])` 的 else，再挂回原位；
  映射形式把 `pvk` 设成"参数个数+1"，免得 P145 的"多余参数"检查误报（CPython 里多余的字典项不算多余参数）。
* **一个定位坑**：`pctfmt` 里有**两处** `not enough arguments for format string`（原来的位置检查 + P146 的
  `*` 替换），只看消息分不开 ⇒ 建 DFS 语句序表取靠前的那一个。
* **顺带核实**：`except (NameError, NoSuchError)` 这类"坏名字与 NameError 同列"的子句**已经正确**
  （P140 会先把 `tcl`/`t2hit` 清零再弹帧 ⇒ 本 try 接不住、外层 `except NameError` 接得住）；`dict()` 等零参
  构造、生成器表达式当实参、f-string 格式规范也都正常——都写进了 `d224` 当反向用例。
* **验证**：新增 `d224.json` **16/16**；`d223` 17、`d221` 31、`d220` 20、`d218` 21、`d217` 24、`d206` 37、
  `d190` 46、`t107` 12、`t133` 60、`str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、`func` 31、`demos` 12、
  `tuple` 20、`d204` 14 全绿；94 套快照 **91 套逐例相同**，3 处差异全是既知噪声（`t113`/`t111h` 是 CPython
  参考侧的集合哈希序 + featprobe3 地址）——**零回归**；featprobe **246/259**；`check41` **20,632** 块
  errors=0；`frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.74 共 65 版全 MATCH**。
  产物 `MiniPy_v4.74.sb3`：Interpreter 19,203 / 合计 **20,632** 块（新增 5 变量 + 1 过程）。
* **补丁拆分**：v4.74 = **`p147.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p74 = 'P147'`。
* **残留**：`%g`/`%G`；`dict(a=1)` 与 `'{a}'.format(a=3)`（内建/方法调用的关键字实参）。

## v4.82 追加（v4.73 功能轮：P146，出货 v4.73）

* **P146 `%e`/`%E`、`*` 宽度/精度、缺块报错文案**。①`'%e' % 1234.5` 以前掉到 `%s` 打出 `1234.5`，现在按
  CPython 打 `1.234500e+03`（绝对值规整到 `[1,10)` 求指数、尾数走 `%f` 的定点舍入、指数带符号至少两位、
  舍入进到 `10.000` 时指数加一；`%E` 只是字母大写——**必须用 `compareText` 判大小写**，补丁里的 `EQ()`
  是 Scratch 的 `=` 不区分）。②`'%*d' % (5, 3)` 以前报"非法转换符"，现在让规格扫描接受 `*`，并在
  **读实参之前**把每个 `*` 换成下一个实参（`sfind`+`substr`）——**坑**：插在 `pctitem` 调用之前时
  `pvv` 已取走实参 ⇒ 宽度吃掉数值（打出 `[  5]`），必须插在"读 `pvv`"那条之前。③`try:`/`finally:` 后不
  缩进以前只说 `IndentationError: expected block`，现在按 CPython 说
  `expected an indented block after 'finally' statement on line 3`（`def`/`class` 用
  `function definition`/`class definition`）；两个站点都在 **`prepare`**（不是 `execute`），且
  `backline` 本身已是控制台那个 1 基行号（第一版又 `+1` ⇒ 多 1）。
* **`t107` 三条长期假红结案**：T3/T7 是**探针缺 `expectError`**（MiniPy 会把未捕获错误同时写进自己的
  控制台，CPython 只写 stderr，逐字符比 `out` 永远不等），T11 是上面的文案 ⇒ `t107` **9/12 → 12/12**。
* **验证**：新增 `d223.json` **17/17**；`t107` **12/12**；`d221` 31、`d220` 20、`d218` 21、`d217` 24、
  `d206` 37、`d190` 46、`d202` 24、`d204` 14、`t133` 60、`str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、
  `func` 31、`demos` 12、`tuple` 20 全绿；94 套快照 **92 套逐例相同**，2 处差异都是改进（`t107` 三条由假红
  变真绿 + featprobe3 地址）——**零回归**；featprobe **246/259**；`check41` **20,573** 块 errors=0；
  `frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.73 共 64 版全 MATCH**。产物 `MiniPy_v4.73.sb3`：
  Interpreter 19,144 / 合计 **20,573** 块（新增 9 变量）。
* **补丁拆分**：v4.73 = **`p146.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p73 = 'P146'`。
* **残留**：`%g`/`%G` 与 `'%(name)s'` 映射形式未实现；其余 `IndentationError` 文案仍是 MiniPy 措辞。

## v4.81 追加（v4.72 功能轮：P145，出货 v4.72）

* **P145 `%` 格式化补厚**。P77 的 `pctitem` 只认 `-` 标志、宽度、`.` 精度与 `d`/`f`/`s`：`'%05d' % 42` 得
  `[   42]`、`'%+d' % 5` 得 `5`、`'%x' % 255` 得 `255`、`'%r' % 'a'` 得 `a`、`'%c' % 65` 得 `65`；
  `'%q' % 1` 不报错、`'%d' % (1, 2)` 与 `'a' % 1` 静默丢掉多余参数。
* **做法**：`pctitem` 整体重写——真正的标志位解析（`-`/`0`/`+`/空格，任意顺序），转换符增加 `i`、
  `x`/`X`/`o`（按基数循环取位，数字表 `0123456789abcdef`）、`r`（P10 的 `reprval`）、`c`（`letter (code-31)
  of cs`）；`+`/空格在数值转换后补符号，零填充**插在符号之后**。`pctfmt` 补两条：①转换符不在
  `diouxXeEfFgGrcs` 里 → CPython 的 `ValueError: unsupported format character 'q' (0x71) at index 1`
  （hex 由"在 `cs` 里找位置 +31"得 ord，再除 16 取位）；②循环后还有未消耗参数 →
  `TypeError: not all arguments converted during string formatting`。
* **又两个必须记住的坑**：①**补丁里的 `EQ()` 是 Scratch 的 `=`，对字符串大小写不敏感**（语言里的 `==`
  才区分大小写，它走 `compareText`）——`IF(EQ(conv,'X'), 用大写数字表)` 让 `'%x'` 也变大写 ⇒ 区分大小写
  要用 `compareText`（判 `cmp == 0`）；②十六进制取位一开始写成**追加**（`ptx + 数字`），得到 `01` 而不是
  `10`——最高位要先出（前置拼接）。
* **验证**：新增 `d221.json` **31/31**；`d220` 20、`d218` 21、`d217` 24、`d206` 37、`d190` 46、`d202` 24、
  `t133` 60、`str` 12、`one` 10、`cont` 12、`pan` 7、`b2` 13、`func` 31、`demos` 12 全绿；94 套快照
  **93 套逐例相同**（唯一差异是 featprobe3 的内存地址）——**零回归**；featprobe **246/259**；`check41`
  **20,417** 块 errors=0；`frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.72 共 63 版全 MATCH**。
  产物 `MiniPy_v4.72.sb3`：Interpreter 18,988 / 合计 **20,417** 块（新增 10 变量）。
* **补丁拆分**：v4.72 = **`p145.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p72 = 'P145'`。
* **残留**：`%e`/`%E`/`%g` 未实现（按 `%s` 打印）；`'%(a)s'` 映射形式与 `'%*d'` 星号宽度现在报
  `ValueError: unsupported format character …`（以前是乱码）。

## v4.80 追加（v4.71 功能轮：P144，出货 v4.71）

* **P144 `dict(x)`**。`dict([(1, 2)])`、`dict([[1, 2]])`、`dict(existing)` 全报
  `NameError: name 'dict' is not defined`：`callfn` 有 `list`/`set`/`str`/`int`/`float`/`bool`/`tuple`
  的分支，唯独没有 `dict`；零参形式能work只是 P142 的 `zeroarg` 自己回答了它。
* **做法**：记录编码沿用字典本来的格式（`lsep + 键类型 + 转义键 + lsep + 值类型 + 转义值`）。直接追加会把
  重复键的两条记录都留下，所以先把键值对收进四个平行列表（`DgK`/`DgE`/`DgV`/`DgW`）再折叠——**已存在的
  键原地换值**（`replaceitemoflist`）、新键追加，最后按顺序拼串 ⇒ `dict([(1,2),(3,4),(1,5)])` 既是
  `{1: 5, 3: 4}`（CPython 输出）`len` 也是 2。参数：`D`⇒复制、`L/T/G/E`⇒逐元素取键值、`S`⇒先
  `charsplit`（于是 `dict('ab')` 落到"元素长度 1"的 ValueError，与 CPython 一致）、其余⇒
  `TypeError: '<类型>' object is not iterable`（`tname`）。报错措辞对齐 CPython：
  `object is not iterable`（元素非序列，**裸消息**）与
  `dictionary update sequence element #<i> has length <n>; 2 is required`。
* **又踩同一个坑**：`IF(cond, [...])` 只有**两个**参数——这里两处写成 `IF(cond, [then], [else])`，第三段被
  静默丢弃，症状是 `dict(a)`（a 是字典）与 `dict(1)` 既没复制也没报 TypeError，而是掉到 `callfn` 末尾变
  `NameError: name 'dict' is not defined`。**每轮写补丁前先搜一遍 `IF(` 的三参数写法**。
* **验证**：新增 `d220.json` **20/20**；`d218` 21、`d217` 24、`d206` 37、`d190` 46、`d204` 14、`d202` 24、
  `t133` 60、`func` 31、`str` 12、`cont` 12、`one` 10、`pan` 7、`b2` 13、`demos` 12、`t123` 29、`d187` 10、
  `d189` 14、`d159` 5、`d191` 8、`d192` 6、`d200` 8、`d201` 15、`t144` 16、`tuple` 20 全绿，`dict` 9/10
  （既存）；94 套快照 **93 套逐例相同**（唯一差异是 featprobe3 的内存地址）——**零回归**；featprobe
  **246/259**；`check41` **20,237** 块 errors=0；`frames` fib16 **6388**；`rebuild-old.ps1`
  **v4.10…v4.71 共 62 版全 MATCH**。产物 `MiniPy_v4.71.sb3`：Interpreter 18,808 / 合计 **20,237** 块
  （新增 13 变量 + 4 列表）。
* **补丁拆分**：v4.71 = **`p144.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p71 = 'P144'`。
* **残留**：`dict(a=1)` 关键字实参形式未支持；`print(range(3))` 打印 `[0, 1, 2]`（立即求值扩展）。

## v4.79 追加（v4.70 功能轮：P143，出货 v4.70）

* **P143 `tuple(x)` 与 `range(...)` 当表达式**。`callfn` 里有 `list`/`set`/`str`/`int`/`float`/`bool` 的分支却
  没有 `tuple`；`range` 一直只作为 `for` 的直接来源（或推导式的 `crng`）存在，表达式位置没人认 ⇒
  `tuple([1, 2])`、`tuple('ab')`、`range(3)`、`list(range(3))`、`sum(range(4))` 全报
  `NameError: name 'tuple'/'range' is not defined`。
* **做法**：①`tuple(x)` 就是 `list` 分支换个标签（元组与列表同编码，P140），字符串先按字符切列表——
  这段抽成新过程 **`charsplit`**（`list('ab')` 的内联代码保持原样）；非可迭代对象按 CPython 报
  `TypeError: '<类型>' object is not iterable`（类型名走 P134 的 `tname`）。②`range(...)` 先调 **`crng`**
  （P125 的推导式助手）把 1/2/3 个实参算成 `cv`/`cstop`/`cstep`，再按 `step` 的正负号物化成列表
  （元素编码 `lsep + 'N' + lesc(值)`）；`crng` 自己已拦 `step == 0`，顺手把这句与 `execute` 的 `for`
  路径共 4 处对齐成 `ValueError: range() arg 3 must not be zero`；`list()/set()` 的
  `requires an iterable` 也对齐成 `'<类型>' object is not iterable`。
* **坑**：**`IF(cond, [...])` 只有两个参数**——给 `tuple` 分支写成 `IF(cond, [then], [else])` 时第三段被
  **静默丢弃**，症状是 `tuple('ab')` 原样返回字符串（`type()` 说 `str`）；必须用
  `IFELSE(cond, then, else)`。（P10 的注释里就写过这条，仍然踩了。）
* **验证**：新增 `d218.json` **21/21**；`d217` 24、`d206` 37、`d190` 46、`d204` 14、`d202` 24、`t133` 60、
  `func` 31、`str` 12、`cont` 12、`one` 10、`pan` 7、`b2` 13、`demos` 12、`t123` 29、`d187` 10、`d189` 14、
  `d159` 5、`d191` 8、`d192` 6、`d200` 8、`d201` 15、`t144` 16、`tuple` 20 全绿；94 套快照 **93 套逐例相同**
  （唯一差异是 featprobe3 的内存地址）——**零回归**；featprobe **246/259**；`check41` **19,991** 块
  errors=0；`frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.70 共 61 版全 MATCH**。
  产物 `MiniPy_v4.70.sb3`：Interpreter 18,562 / 合计 **19,991** 块（新增 2 变量 + 1 过程）。
* **补丁拆分**：v4.70 = **`p143.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p70 = 'P143'`。
* **残留**：`dict(x)`（从键值对序列建字典）仍报 NameError；`print(range(3))` 打印 `[0, 1, 2]`
  （立即求值扩展，与 `zip()`/`enumerate()` 同类）。

## v4.78 追加（v4.69 功能轮：P142，出货 v4.69）

* **P142 零实参调用**。`list()`、`str()`、`int()`、`float()`、`bool()`、`tuple()`、`dict()`、`zip()`、
  `nosuch()`、`len()`、`sorted()`… 一律报 `SyntaxError: missing expression`：实参区间是 `lo+2..hi-1`，
  没有实参时 `lo+2 > hi-1`，而 `eval` 的调用分支（它自己的 `zip`/`sorted`/`math`/`set`/`divmod`/
  `max/min/pow/round/int` 专用分支都要读实参）和 `callfn`（无条件 `eval(lo, hi)`）都照样去求值这个空区间。
* **做法**：新过程 **`zeroarg`**（名字走全局 `x9fn`，P127 的规矩；`x9go = 1` 表示"已处理"）分三类回答：
  ①**值** —— `list`→`[]`、`str`→`''`、`int`→`0`、`float`→`0.0`、`bool`→`False`、`tuple`→`()`、
  `dict`→`{}`、`zip`→`[]`；②**报错** —— 19 个"少参数"内建名按 CPython 措辞（`len()`/`abs()`/`sorted()`/
  `max()`/`sum()`/`type()`/`round()`/`pow()`/`divmod()`/`range()`…）；③**让路** —— `set`/`input`
  （`x9known`）、以及查 `lookup`/`FnName`/`ClsName` 任一命中的用户函数/类/变量；三者都不命中（真·未定义名）
  **就地报 `NameError`**（空区间交不到 `callfn`，它末尾那句 `if pending == 0: fail NameError` 轮不到）。
  挂点：`eval` 调用分支最前面 + `callfn` 的实参求值改成 `IFELSE(lo > hi, [ev=''; evtype='X'], [原 eval])`。
  **两个形状坑**：只判"不足 3 个 token"会把 `self.n = 5` 也算成调用（必须同时要求 `Tok[lo+1]=='('`、
  `Tok[hi]==')'`）；字面量被调用者（`1()`/`'a'()`/`True()`）要留给 P141 的 `TypeError: '<类型>' object is
  not callable`，不能被当成未定义名。
* **验证**：新增 `d217.json` **24/24**（8 条零参取值、9 条零参报错、`nosuch()`、`set()`/用户类/用户函数/
  lambda 的零参、字面量调用仍 TypeError、`self.n = 5` 反向用例）；`d206` 37/37、`d190` 46/46、`d204` 14、
  `d202` 24、`t133` 60、`func` 31、`str` 12、`cont` 12、`one` 10、`pan` 7、`b2` 13、`demos` 12、`t123` 29、
  `d187` 10、`d189` 14、`d159` 5、`d191` 8、`d192` 6、`d200` 8、`d201` 15 全绿；94 套快照 **91 套逐例相同**，
  3 处差异全是既知噪声/改进（`t113` F6 / `t111h` M4 是 CPython 参考侧的集合哈希序 + featprobe3 地址）
  ——**零回归**；featprobe **246/259**；`check41` **19,844** 块 errors=0；`frames` fib16 **6388**；
  `rebuild-old.ps1` **v4.10…v4.69 共 60 版全 MATCH**。产物 `MiniPy_v4.69.sb3`：Interpreter 18,415 /
  合计 **19,844** 块（新增 4 变量 + 1 过程）。
* **补丁拆分**：v4.69 = **`p142.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p69 = 'P142'`。
* **残留**：`tuple(x)`/`dict(x)` 的**带实参**构造、`range(n)` 当表达式（`list(range(3))`）仍报 NameError；
  `zip()` 打印 `[]`（MiniPy 的立即求值扩展）。

## v4.77 追加（v4.68 功能轮：P141，出货 v4.68）

* **P141 不能调用的值 / 不能取属性的值 + 方法体里的接收者状态**。三类"CPython 到运行期才报"的情况在
  MiniPy 里是解析期错误或静默算错：`1()`/`'a'()`/`x()` 报 `SyntaxError: missing expression`（`[1]()`/
  `{'a':1}()` 报 `SyntaxError: expression`），`(1)()` 只说 `TypeError: object is not callable`，
  `(1).foo`/`'a'.foo`/`None.foo` 报 `SyntaxError: attribute access`，实例/类缺属性只说 `AttributeError: foo`。
  更严重的是**方法体里调用任何方法**都挂：`class A: def hi(self): return 'q'.upper()` 报
  `AttributeError: only lists have methods`。
* **做法**：①`methodcall` 把"接收者来自链式上一段"的标志 `mcpre` 在入口**消费**（`mcpv = mcpre; mcpre = 0`），
  并把 `xa = ev; xb = evtype` 关进"自己求接收者"那条分支（原来它无条件覆盖链式分支刚取到的值）——
  方法体是在链式调用的**过程中**执行的，标志泄漏进去就拿到外层的接收者。②`super()` 钩子收紧：先扫出
  方法参数表的配对右括号，必须正好落在整段末尾才接手，否则交回 `eval` 通用流程。③`eval` 切链式调用从
  "第一个深度 0 的 `.`"改成"**最后一个**"⇒ `super().hi().upper()`、`self.s.upper()`、`a.b().c()` 先求
  内层接收者再派发。④报错文案：字面量/已知非函数变量当被调用者 ⇒ `TypeError: '<tname>' object is not
  callable`；非实例取属性 ⇒ `AttributeError: '<tname>' object has no attribute 'x'`；实例/类 ⇒
  `'A' object has no attribute 'x'` / `type object 'A' has no attribute 'x'`（类型名复用 P134 的 `tname`）。
* **四个坑**：①**`replaceStmt(old, newChain)` 会截断链**（`new.next = old.next` 把第二句起摘掉，
  `pruneUnreachable` 再把它们清掉——症状是"补丁明明跑了、运行期像没打"），改用自写的 `replaceChain`
  （把新链尾巴接到 `old.next`）。②**`narg` 数的是逗号**，`narg == 0` 是"一个实参"而不是"零个"：第一版用
  `callable == 0` 判"不可调用"，把 `len('abc')`/`int('4')` 全打成 NameError；正确判据是"实参 token 是
  字面量（Kind `N`/`S`、`True`/`False`/`None`）或已知变量且类型非 `F`"，其余仍交给 `callfn`。③`FAIL('文本')`
  会把**块 id** 当字符串包成文本（消息变成 `boperat_…`），表达式消息要用 `callProc('fail %s', [expr])`。
  ④区分 `eval` 里两个 `AttributeError: Tok[lo+2]` 站点不能靠 `.parent`（补丁期还没重建），改用语句序。
* **验证**：新增 `d206.json` **36/37**（14 条方法/super/链式 + 23 条调用与属性报错，含 `len`/`max`/`min`/
  `round`/`int(x, base)`/用户多参函数/函数值/lambda 的反向用例）；`d190` 44/46 → **46/46**；`d193` 5/6（仅
  T3 探针缺 `expectError` 的假红）、`d202` 24、`d204` 14、`t133` 60、`func` 31、`str` 12、`cont` 12、
  `one` 10、`pan` 7、`b2` 13、`demos` 12、`t123` 29、`d187` 10、`d189` 14、`d159` 5、`d191` 8、`d192` 6、
  `d200` 8、`d201` 15 全绿；93 套快照 **92 套逐例相同**，2 处差异 = `d190` 的 D3/F1 **变正确** +
  featprobe3 内存地址（既知噪声）——**零回归**；featprobe **246/259**；`check41` **19,640** 块 errors=0；
  `frames` fib16 **6388**；`rebuild-old.ps1` **v4.10…v4.68 共 59 版全 MATCH**。产物 `MiniPy_v4.68.sb3`：
  Interpreter 18,211 / 合计 **19,640** 块（新增 5 变量，无新过程）。
* **补丁拆分**：v4.68 = **`p141.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p68 = 'P141'`。
* **残留**：零实参的未知名/部分内建调用（`nosuch()`、`list()`、`str()`、`int()`、`dict()`）仍报
  `SyntaxError: missing expression`（空实参区间）；`nosuch(1)` 已正确报 NameError。

## v4.76 追加（v4.67 功能轮：P140，出货 v4.67）

* **P140 元组的 `index`/`count` + `except` 子句里的未定义名字**。两件事都是"同一套编码被当成两种东西"：
  元组与列表在 MiniPy 里**同编码**（`lcmp`/`sorted` 就靠这个比字典序），可 `methodcall` 只放行标签
  `L/S/O`，于是 `(1, 2).index(2)` 报 `AttributeError: only lists have methods`；而 `clnames` 只**比较**
  子句名字，未定义名就静默算"不匹配"（元组子句里更会照常捕获）。
* **做法**：①接收者检查**之前**插一段——`xb == 'T'` 且方法是 `index`/`count` 就把 `xb` 临时当 `L`（复用
  列表实现），用新变量 `x7tup` 记住真实类型，好让 `list.index` 找不到时报 `ValueError: tuple.index(x):
  x not in tuple` 而不是 `list.index` 的文案；其余元组方法抛 `'tuple' object has no attribute 'X'`。
  ②新过程 `cknames` 校验 `clnames` 读出的每个名字（13 个内建异常名扫新列表 `ExcNames`，否则 `iscls` 判
  用户类），校验点在**匹配路径**：`trycatch` 的首个子句测试与 P132 那个 walk 的每个候选子句 ⇒ `try:`
  没抛异常时不会求值子句（= CPython）。
* **四个坑**：①**`fail %s` 在 `error` 非空时是空操作**（`if error == "": error = message`），而这个校验
  恰恰发生在"已有异常正在传播"时 ⇒ `FAILB(...)` 什么都没做（`DbgX` 日志里检测全对、程序却照常 `caught`）。
  ②**walk 每轮都 `error = t2err` 恢复**，所以消息不能直接写 `error`；改成先停在新变量 `x7bad`、等**帧
  真被弹掉那一刻**（`del TryHand[last]` 之前）再搬进 `error`，并让坏名字的子句 `t2hit = 0`、`t2x = 0`
  不被跳进去 ⇒ 本 try 接不住、外层 `except NameError` 接得住。③**`c3nm` 是共享草稿量**：`try/finally`
  的 `finally` 行也要用它读（P123），嵌套之后 `c3nm` 里躺着关键字 `finally`，检查就报
  `name 'finally' is not defined`（`t107` T6、`t107b` U3/U4 当场翻红）⇒ 改成从本帧的 `tnm`
  （`tnm = last(TryName)`）取名字。④**`0 = ''` 在 Scratch 的 `=` 里是假**，`x7bad` 用 0 初始化时
  `not (x7bad == '')` 会放行、把 `error` 写成数字 `0`（探针报 `Line 2: 0`）⇒ 守卫改成 `length(x7bad) != 0`。
  另：同一个报告块不能同时挂进两个比较（第二次引用会把它**搬走**，第一个比较永远为假），方法名要现造。
* **验证**：新增 `d204.json` **14/14**（元组 `index`/`count`/找不到/负下标/重复元素/字符串元组、元组上的
  其它方法、列表方法不受影响；子句 NameError 7 条含"元组子句里前一个名字本该命中"与"`try:` 不抛异常就
  不校验"）；`d190` 43/46 → **44/46**（C4 元组 index 变正确）；`t107` 9/12（T3/T7/T11 既存）、`t107b`
  **5/5**、`t123` 29、`d187` 10、`d189` 14、`t133` 60、`tuple` 20 全绿；93 套快照 **91 套逐例相同**，
  2 处差异 = `d190` C4 **变正确** + `featprobe3` 的两个内存地址（既知噪声）——**零回归**；featprobe
  **246/259**；`check41` **19,456** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.67 共 58 版全 MATCH**。产物 `MiniPy_v4.67.sb3`：Interpreter 18,027 /
  合计 **19,456** 块（新增 5 变量 + 1 列表 + 2 过程）。
* **补丁拆分**：v4.67 = **`p140.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p67 = 'P140'`。

## v4.75 追加（v4.66 功能轮：P139，出货 v4.66）

* **P139 序列运算符的报错对齐 CPython**（顺带修掉一串"悄悄算错"的乘法）。P134 只对齐了**通用**文案，
  而 CPython 对 `+`/`*` 有专门措辞；更糟的是 `*` 这条路 MiniPy 不报错而是算出垃圾：`'a' * 'b'` → `''`、
  `'a' * 1.5` → `'aa'`、`[1] * 'a'` → `'a'`、`1.5 * 'a'` → `0.0`、`None * 'a'` → `''`、`1.5 * None` → `0.0`。
* **做法**：新增过程 **`binerr`**（操作数走全局 `binL`/`binLT`/`binR`/`binRT`——`rightside` 的形参在别的过程
  里读不到），按 `beop` 造消息：①`+` 且左边是序列 → `can only concatenate <L> (not "<R>") to <L>`；
  ②`*` 且一边是序列、另一边不是**索引**（N 且值里没有 `.`，或 B）→ `can't multiply sequence by non-int of
  type '<X>'`（X 取"不是索引"的那边）；③其余 → 通用文案。三处 P134 的报错点（`+` else、共享算术分支、
  `**` 分支）都改成"填全局量 + 调 `binerr`"。**乘法这条单独有坑**：`*` 在 `rightside` 里拆成好几个分支
  （字符串重复/列表重复/算术），`[1] * 'a'` 这种组合每条都不接、于是漏过去留下右操作数的值——所以乘法检查
  放在 **P10 归一化之后、所有分支之前**（那时 `lt2`/`evtype`/`ev` 都齐）。类型名用 P134 的 `tname`，
  但标签必须是**原始**类型（P10 把 bool 改写成数字），所以先存 `lt0`/`evt0`，否则 `'a' + True` 会说 `int`。
* **三个自找的坑**：①**摘掉一段旧语句时留了尾巴指针**——旧前缀的最后一条仍指着失败块，于是
  `insertBeforeStmt` 走"插在它后面"这条路，把新代码接到**已不可达的旧前缀**后面（运行期直接跳到失败块、
  全局量全是 0）；改成"先插在旧前缀之前、再把插入段尾巴直接接到失败块"。②`argOf('leftval')` 被当变量名
  用（`idxOf` 里写成 `VAR(val)`）⇒ `no variable bargume_…`，改成接受表达式。③`*` 的守卫位置。
* **验证**：新增 `d202.json` **24 条**（`+` 的 6 种拼接组合、`*` 的 7 种非法组合、两种合法重复、
  通用报错 4 条、布尔/浮点、`**`）7/24 → **24/24**；`d190` 43/46、`d201` 15、`d168` 6、`d174` 8、
  `d176` 6、`t133` 60、`comp` 10、`func` 31、`str` 12、`cont` 12、`one` 10、`pan` 7、`b2` 13 全绿/不变；
  92 套快照 **90 套逐例相同**，2 处差异 = `d193` T3 的文案**变正确** + featprobe3 地址（既知噪声）
  ——**零回归**；featprobe **246/259**；`check41` **19,372** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.66 共 57 版全 MATCH**。产物 `MiniPy_v4.66.sb3`：Interpreter 17,943 /
  合计 **19,372** 块（新增 9 变量 + 1 过程）。
* **补丁拆分**：v4.66 = **`p139.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p66 = 'P139'`。

## v4.74 追加（v4.65 功能轮：P138，出货 v4.65）

* **P138 排序按字典序比较容器**。`lsort` 只认"数字对数字/字符串对字符串"，其余一律
  `TypeError: sort requires all numbers or all strings`，所以最常见的 `sorted([(2,'b'),(1,'a')])`
  直接报错（`d168` K3）。CPython 是**字典序**：逐元素比、第一个不相等处定胜负、短前缀更小。
* **做法**：新增过程 **`lcmp`**（两个值走全局 `lca`/`lcat`/`lcb`/`lcbt`，结果放 `cmp`）——
  ①**数字与布尔一族**（`sorted([True, False, 2, 0])` → `[False, 0, True, 2]`）；②字符串走 `compareText`；
  ③**元组/列表递归**：递归前把当前这对压进 `LcStk`、回来再弹（固定临时量会被更深一层冲掉，同 P137），
  比完再看长度；④其余同类型（`None`/字典/集合/实例/函数）与所有跨类型都报 CPython 措辞的
  `'<' not supported between instances of 'X' and 'Y'`（类型名复用 P134 的 `tname`；CPython 按 `b < a` 比，
  所以**右边**的名字在前）。`lsort` 的比较块换成"调 `lcmp`、`cmp > 0` 就交换"，冒泡保持稳定 ⇒
  `sorted()`/`list.sort()`/`sorted(key=…)`/`min`/`max` 一次全部受益；`min`/`max` 的两条比较路径
  （callfn 的单可迭代循环、`minmax` 的 n 元循环）也都换成 `lcmp`。
* **顺带修两处转义**：`lsort` 收尾重编码、`srtkey` 把 key 塞进键表，都没调 `lesc`，
  容器元素/容器键的内部分隔符会漏进外层编码（以前排不了容器所以看不出来）。
* **两个自找的坑**：①**`replaceStmt` 只支持单条语句**（它把替换块的 `next` 重写成旧块的 `next`），
  传一条链进去会静默丢掉第 2 条起（`lcat`/`lcb`/`lcbt`/`lcmp` 全没了、排序失效）——改用
  `insertBeforeStmt` + 手工摘链；②把"同类型但不能比"写成 `cmp == 0`，于是两个相等字符串比完就报
  `'str' and 'str'`（`d174` Q3 当场翻红），改成按标签判断（`Z`/`D`/`E`/`O`/`F`/`C`）。
* **验证**：新增 `d201.json` **15 条**（元组/列表排序、前缀关系、嵌套元组、空列表、混排报错 ×3、
  纯数字/字符串回归、`list.sort()`、元组作 key、`min`/`max`、布尔与浮点、集合）**15/15**；
  `d168` 5/6 → **6/6**；`d174` 8、`d176` 6、`d173` 4、`d178` 3、`d200` 8、`t133` 60、`comp` 10、
  `func` 31、`str` 12、`cont` 12、`cls` 12 全绿；90 套快照 **87 套逐例相同**，4 处差异 = `d168` K3
  **由 fail 翻 pass** + `t111h`/`t113` 哈希序 + featprobe3 地址（既知噪声）——**零回归**；
  featprobe **246/259**；`check41` **19,274** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.65 共 56 版全 MATCH**。产物 `MiniPy_v4.65.sb3`：Interpreter 17,845 /
  合计 **19,274** 块（新增 9 变量 + 1 列表 + 1 过程）。
* **补丁拆分**：v4.65 = **`p138.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p65 = 'P138'`。

## v4.73 追加（v4.64 功能轮：P137，出货 v4.64）

* **P137 嵌套的带关键字 `sorted`**（清单里"P101 遗留"那条）。关键字形式由 P130 的 eval 钩子处理，
  它把解析状态放在一堆全局量里（`p4c` 逗号位置、`p4klo/p4khi`、`p4rlo/p4rhi`、`p4list`…），
  而**求值"被排序的表达式"本身就是一次 eval** ⇒ `sorted(sorted(xs, key=lambda p: -p), reverse=True)`
  里内层先把这些量全覆盖，外层回来时 `p4pos = p4c + 1` 已是垃圾位置，接着就报 `SyntaxError: parentheses`。
* **做法**：和 P127 的 `cmet`/`self`、P125 的推导式循环变量一样——**钩子接管时把整套全局标量压进新列表
  `P4Stk`，结束前按相反顺序弹回**（29 个标量 = 钩子 + `srtkey` 用到的全部临时量）。嵌套调用在入口压的是
  "外层此刻的值"，于是它退出时的弹出正好把外层恢复到进入它之前的状态 ✓。**三个 `srtkey` 工作列表
  （`P4Key`/`P4KeyT`/`P4Used`）没有压**——只有"在 key 函数里再调用一次**带关键字**的 sorted"才会踩到，
  `d200` N5 现在通过但时序上是靠运气，仍算已知边界。
* **一个自找的坑**：写查找器时把 `const g = block.next`（**id 字符串**）当成块对象用了
  （`g.opcode === 'control_if'`），于是 `find` 永远返回 0；而调试循环里写的是 `BL()[q.next]` 所以
  打出来的日志全是对的——两边不一致，白绕了几轮。规矩：`next` 是 id，用之前必须 `BL()[…]`。
* **验证**：`d176` 5/6 → **6/6**（S2 那条正是清单里的反例）；新增 `d200.json` **8 条**（两层/三层嵌套、
  `reverse=` 值是嵌套调用、key 函数里再 sorted（带/不带关键字）、推导式里、两个关键字任意顺序、参数里嵌套）
  **8/8**；`d173` 4、`d174` 8、`d178` 3、`comp` 10、`func` 31、`str` 12、`t133` 60 全绿；90 套快照
  **87 套逐例相同**，3 处差异 = `d176` S2 **由 fail 翻 pass** + `t113` 哈希序 + featprobe3 地址（既知噪声）
  ——**零回归**；featprobe **246/259**；`check41` **19,152** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.64 共 55 版全 MATCH**。产物 `MiniPy_v4.64.sb3`：Interpreter 17,723 /
  合计 **19,152** 块（新增 1 个列表）。
* **补丁拆分**：v4.64 = **`p137.txt`**（在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p64 = 'P137'`。

## v4.72 追加（v4.63 功能轮：P136，出货 v4.63）

* **P136 方法/属性表跟着 C3 MRO 走**（把 v4.62 的 C3 真正落地）。P135 只让 `super()` 沿实例 MRO 走，
  **方法/属性从哪里找**仍靠"拷贝父类的行"，而拷贝分不清"这一行是本类定义的"还是"从祖先抄来的"，
  于是 `class D(B,C)`（B 不覆盖、C 覆盖）里 `D().hi()` 用到了 A 的、`D().n` 也取到 A 的（`d191` D2/D5）。
* **做法**：①**属性加归属列** `IAttrOwn`（与 `IAttrId` 平行）——P90 的类体 `name = value` 处理器在
  **追加**和**原地覆盖**两条路径都写它（覆盖那条必须用 `replaceitem`：行号不变，光看位置看不出被覆盖过），
  拷贝出来的行**保留原始定义者**（孙类不再重复抄，靠自己的 MRO 拿到）；②**方法用边界**：类自己定义的方法
  就是它拷贝完之后追加的那些 `FnName` 行，于是 `ClsFn1[i]` 在拷贝结束时快照 `length(FnName)`，
  `clscopy` 只抄"下标 > 父类快照"的行；③**拷贝顺序跟 MRO**（`M3M` = P135 存进 `ClsMro` 的线性化切出来的
  片段）：方法**倒着**走（最远祖先先抄、最近最后抄——`calluser` 从表尾往前找，最后抄的赢），属性**顺着**走
  （最近的先抄——`IAttr` 从头往后扫）。M3M[1] 是子类自己，所以方法循环到下标 2 停、属性循环从 2 开始。
* **顺手关掉一个历史包袱**：**P106 的单父类拷贝一直内联在 `execute` 里**（在 `addTo ClsName` 之前跑，
  也是连抄来的行一起抄），与 P127 的 `clscopy` 重复劳动、还正好破坏本轮的规则（日志里 `ENTER B fn=2`
  说明 `class B(A):` 还没进 P127 的代码，`B.hi` 就已经存在了）。现在把那个循环的条件改成恒真（不执行），
  **保留它上面的"父类必须存在"检查**（`class B(Nope)` 仍会报错）。
* **验证**：`d191` 6/8 → **8/8**；`d159` 5/5、`d192` 6/6、`d193` 3/6 → **5/6**（T6 两个 super 连用仍缺）；
  `cls` 12、`t144` 16、`d156` 5、`d158` 8、`d160` 6、`d161` 6、`d165` 5、`d166` 8、`func` 31、`cont` 12、
  `str` 12、`demos` 12 全绿；90 套快照 **86 套逐例相同**，4 处差异 = `d191` D2/D5 与 `d193` T2/T4/T6
  **由 fail 翻 pass**，加 `t113` 的 CPython 集合哈希序与 featprobe3 内存地址（既知噪声）——**零回归**；
  featprobe **246/259**；`check41` **19,006** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.63 共 54 版全 MATCH**。产物 `MiniPy_v4.63.sb3`：Interpreter 17,577 /
  合计 **19,006** 块（新增 9 变量 + 3 列表 + 1 过程）。
* **补丁拆分**：v4.63 = **`p136.txt`**（仍在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p63 = 'P136'`。

## v4.71 追加（v4.62 功能轮：P135，出货 v4.62）

* **P135 C3 线性化 + super() 走实例 MRO**（清单"菱形继承的 C3 顺序"，`d159` E4）。查这个问题的过程中先挖出
  一个**通用解析 bug**——它才是 E4 真正卡住的地方：
  * **后缀链抢在运算符前面**：`eval` 的最终 else 里"找深度 0 的 `.` 走 `methodcall2`"排在"扫描深度 0 的
    运算符走 `pair`"**之前**，于是 `'B' + super().hi()` 的第一个深度 0 的 `.` 被当成整段的后缀，接收者算成
    `'B' + super()`；而 P127 的 super 钩子只查前缀（`Tok[lo]=='super'`、`Tok[hi]==')'`），`Tok[lo+3]` 恰好是
    后面那个 `.`，于是在**子区间**上触发，把 `'B' + super()` 算成 `'BA'`，再对字符串取 `.hi` →
    `AttributeError: 'str' object has no attribute 'hi'`。`'B' + 'xy'.upper()` 看着没问题纯属巧合
    （先拼再大写 = 先大写再拼），`1 == [1,2].count(1)` 就露馅了。**做法**：把 methodcall2 那个 IF（连同子栈）
    从"最终 else 的开头"搬到 **`ecut == 0` 分支的开头**——运算符先分流，操作数再各自允许是后缀链。
  * **`ClsMro`**：每个类在 `class` 语句处记下自己的线性化（逗号连接）。`M3L` = 各父类的 MRO + 父类列表本身，
    用教科书式 C3 merge（取"不在别的列表尾部出现"的第一个头，追加后从所有列表头删掉）；类名不含逗号所以
    用字符串编码，`shead`/`stail`/`shas` 是切片小过程。无父类 = 自己；内建父类（`Exception`）按"没记录 =
    就它自己"；层级不自洽时取第一个头（CPython 抛 TypeError，MiniPy 保持可用）。
  * **super() 沿"实例所在类的 MRO"走**：`cmet` 是**正在跑的方法所属的类**，`InstCls[cinst]` 是实例真正的类，
    在它的 MRO 里找 `cmet` 的下一个 = `super(定义类, self)`；找不到就退回"取 `cmet` 第一个父类"（旧行为）。
    于是 D→B→C→A 得到 `"D"+"B"+"C"+"A"` ✓（旧实现 B 的 super 直接跳 A，得到 `DBA`）。
* **三个坑**：①**辅助过程和调用者抢同一个计数器**——`shead` 用 `m3i`（`m3merge` 的三个循环也用 `m3i`），
  一返回就把计数器顶到末尾、循环立刻结束（MRO 只算出 `"B,A,C"`）；`clsmro` 同样把"收集父类 MRO"的循环
  顶掉（`M3L` 只剩两项）。规矩：每个辅助过程用自己的计数器（`m3q`/`m3z`/`m3t`）。②**帮手借 `ev` 回话会吃掉
  调用者的值**（P131 教训的新花样）——`shas` 把结果放 `ev`，但它每切一段都调 `stail`，`stail` 用 `sfind`
  **也写 `ev`**，匹配成功写进去的 `1` 被覆盖成 `-1`（"没找到"）；改成 `m3has` 自己存、最后再 `ev = m3has`。
  ③`newProc` 必须早于引用它的 `callProc`；调试列表（`DbgM`）撤干净，否则构建报 `no list`。
* **验证**：`d159` 4/5 → **5/5**；新增 `d191.json` **8 条**（菱形 super 链 / 中间类不覆盖 / 三级链 / 菱形
  `__init__` / 菱形属性 / 单继承不变 / 各自属性 / super 到顶）2/8 → **6/8**；`d192.json`（super 出现在表达式里）
  3/6 → **6/6**；`cls` 12、`t144` 16、`func` 31、`t133` 60、`demos` 12 全绿；86 套快照 **83 套逐例相同**，
  3 处差异**全是既知噪声**（`t111h`/`t113` 的 CPython 集合哈希序 + featprobe3 地址）；featprobe **246/259**；
  `check41` **18,902** 块 errors=0；`frames` fib16 `interpSteps` **6388**；`rebuild-old.ps1`
  **v4.10…v4.62 共 53 版全 MATCH**。产物 `MiniPy_v4.62.sb3`：Interpreter 17,473 / 合计 **18,902** 块。
* **仍缺**：方法/属性表还是**拷贝**出来的（不区分"自己定义的"和"抄来的"），所以"中间类不覆盖"（D2）与
  菱形属性（D5）仍按旧路径解析——下一轮按 MRO 逆序只拷每个类**自己**的方法/属性（`ClsFn1`/`ClsAt1` 边界）。
* **补丁拆分**：v4.62 = **`p135.txt`**（仍在 `p68.txt` 之前）；`rebuild-old.ps1` 里 `$p62 = 'P135'`。

## v4.70 追加（v4.61 功能轮：P134，出货 v4.61）

* **P134 内建异常消息文案对齐 CPython 3.14**（12 组）。异常类一直都对，冒号后面那段文本却要么是空、
  要么是旧措辞，`except X as e: print(e)` 读出来就和 CPython 不一样。做法统一：找到那条 `fail %s`，
  把**消息输入**换成新文本（字面量或 `JOIN` 树两种形态都要认）；需要变量参与的先插几条语句把值算进
  `p6msg` 再拼。修的 12 组：`ZeroDivisionError` → `division by zero`（`rightside` 的算术分支 + P28 的
  divmod）、`NameError` → `name 'x' is not defined`（**10 处**：atom 查名字、`callfn` 的
  `NameError: function`、P28j 的未知调用、execute 的类父类、三处增广赋值、`builtin2b` 兜底）、
  `list.index/remove`、`max()/min()` 空序列（**并且补上 `ValueError:` 前缀——之前是裸消息，
  `except ValueError` 根本接不住**）、`len()` 的类型名（新过程 `tname`）、元组下标 `tuple index out of
  range`、`KeyError` 打印 key 的 repr（新过程 `keystr`，3 处）、`int()`/`float()` 的
  `invalid literal for int() with base 10: 'x'`（新过程 `castmsg`，值要在 P2 的 `trimsp` **之前**存）、
  `int(x, base)` 带基底、解包的 `(expected N, got M)`（字符串源时按 CPython 不写 got）、
  非可迭代解包的 `cannot unpack non-iterable int object`、算术类型不匹配的
  `unsupported operand type(s) for +: 'int' and 'str'`（3 处，`**` 走 `** or pow()`）。
* **三个新坑**：①**`setMsg` 把字面量消息包了两层**——`fail %s` 的字面量输入是 `[1,[10,'text']]`、
  块是 `[3,id,影子]`，一律按块写就变成 `[1,[1,[10,'text']]]`，**project.json 直接过不了 sb3 校验**
  （`Could not parse as a valid SB2 or SB3 project`，schema 精确指到某个 block——第一次栽在 schema 上）；
  ②**同文案站点光看条件分不开**——`list.index` 与 `list.remove` 都在同一个 `lmeth == "index"` 的
  if/else 里（else 的父块就是那个 IF），改用 `remove` 独有的 `lres == 0` 测试区分；③求值顺序——
  `tname`/`castmsg` 都通过 `p6msg` 回话、不碰 `ev`（P131 老教训），`int()` 的原文要在 `trimsp`
  之前存（CPython 保留空格）。另外 `newProc` 必须早于引用它的 `callProc`。
* **验证**：新增 `d190.json` **46 条**（除零 9、名字错误、索引/键、类型错、int/float、解包、len、
  元组越界…），v4.60 是 7/31 → v4.61 **43/46**；`t107b` 4/5 → **5/5**；84 套快照 **76 套逐例相同**，
  9 处差异 = 7 处**预期文案改进**（`t107b` U2 由 fail 翻 pass）+ `t113` F6 的 CPython 集合哈希序
  （同一份 CPython 两次跑就 `["a","b"]`/`["b","a"]`）+ `d176` S4 换了另一种错法（本来就 fail）；
  featprobe **246/259**；`check41` **18,662** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.61 共 52 版全 MATCH**。产物 `MiniPy_v4.61.sb3`：Interpreter 17,233 /
  合计 **18,662** 块（新增 5 个变量 + 3 个过程，列表数仍 97）。
* **补丁拆分**：v4.61 = **`p134.txt`**（在 `p68.txt` **之前**，这样 `callfn` 的改动会被 P68 一起克隆
  进 `callfnW`）；`rebuild-old.ps1` 里 `$p61 = 'P134'`、`v4.60 = "$p61"`。

## v4.69 追加（v4.60 功能轮：P133，出货 v4.60）

* **P133 `except (A, B)` 元组子句**：子句名字一直取自 `Tok[2]`，元组子句里那个 token 是 `(`，
  于是 `except (ValueError, IndexError):` 存下的"名字"是 `(`，永远匹配不上、直接往外抛。
* **做法**：新增两个无参过程 ①**`clnames`**（行号走全局 `c3line`）把子句行**当文本**读——
  `Code[c3line]` → `substr(1, sfind(' as '))` 切掉 `as e` → 切掉 `:` → `substr(sfind('except')+7, len)`
  **跳过**关键字本身 → 逐字符只保留标识符字符与逗号（`cs` 的下标 17..26/34..59/66..91/64 分别是
  数字/大写/小写/下划线），空格与元组括号自动消失；②**`excmatch`** 读 `c3nm`，按逗号切片逐个测
  （`Exception` 直接命中 / `sprefix` 前缀 / P129 的 `iscls`+`isanc` 沿 `ClsPar` 爬），答案进 `ev`。
  P51 的 try 分支与 P132 的 walk 都改成 `clnames` + 赋值；两个调用点各插一个"`tnm`/`t2n` 含逗号才走"
  的分支，**单名路径一字未动**。
* **三个坑**：①**`Tok` 会被重新切词污染**——第一版走 `Tok`，同一行代码两次运行得到
  `ValueError,,,IndexError` 与 `,,,,IndexError` 两个不同结果（walk、嵌套 eval 都会重写 `Tok`），
  第二个名字永远测不到；**改成读 `Code[行]` 文本**后免疫。②`IFELSE(cond,a,b)` 是三参，写内层时
  漏了外层的 else → `chain(undefined)` 构建期崩（本项目第三次踩 else 参数）。③**"切掉"≠"跳过"**：
  把 `except` 也当切点会让 `c3nm = ''`，而空名字等于裸 `except` → 全部错误被接住（探针 9/14 假绿），
  日志里的 `cn=`（空）才对上号；顺手修了名字切片的差一错误（`sfind` 是 0 基下标，`substr` 是闭区间）。
  `except (ValueError,)` 留下的空片段现在被跳过。
* **验证**：新增 `d189.json` **14/14**（第 1/2/3 项命中、不匹配则后续子句接住 / 抛出、元组内
  `Exception`、元组含用户异常基类、单元素元组、带空格 + `as`、元组后的裸 `except`、嵌套 try、
  循环里连中两次、多个用户异常）；`d187` 10/10、`t123` 29/29、`try` 12/12、`d165`/`d166` 全绿；
  84 套快照 **82 套逐例相同**（差异只有 CPython 集合哈希序与 `enumerate`/`zip` 地址）；featprobe
  **246/259**；`check41` **18,471** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.60 共 51 版全 MATCH**。产物 `MiniPy_v4.60.sb3`：Interpreter 17,042 /
  合计 **18,471** 块（新增 13 个变量，列表数仍 97）。
* **补丁拆分**：v4.60 = **`p133.txt`**；`rebuild-old.ps1` 里 `$p60 = 'P133'`、`v4.59 = "$p60"`。

## v4.68 追加（v4.59 功能轮：P132，出货 v4.59）

* **P132 多个 `except` 子句依次匹配**：P51 给每个 `try` 只压一个帧（TryHand/TryName 指向**第一个**
  子句），匹配不上就直接弹帧往外抛，所以 `try/except A/except B` 里 B 永远轮不到。P123 早就沿
  `Elses` 子句链找 `finally`，于是"下一个子句"只差一次 `Elses[子句行]`；新代码在 `tcl == 0`（没人接）时
  沿链往前走，对每个后继子句用同一套测试（裸 `except`、`Exception`、名字前缀、P129 的用户类沿
  `ClsPar` 爬），命中就跳进它的 body 并把 `error` 交给 `tlast`。
* **三个坑**（都靠 `DbgL` 日志定位）：①**`tokenize` 在 `error` 非空时会罢工**（它的循环"遇错即停"），
  读子句行前必须把 `error` 藏进 `t2err`、读完放回，否则候选行 token 数为 0；②**`TryEnd` 是"下一个
  子句"而不是"try 的结尾"**（P51 靠它逐子句跳过 body），拿它当边界会把第二个子句误判成越界——
  只用 `Elses[行] == 0`（链尽头）终止；③**`except X as e` 的绑定要再做一遍**（P112 的绑定只挂在
  "第一个子句命中"那条路径上），自己抽 `as` 后的名字、把 `:` 之后的文本 `assign` 给它。
* **验证**：新增 `d187.json` 10/10（二/三/四子句、裸 except、`Exception` 兜底、用户异常基类、
  第一个子句命中、嵌套 try、handler 里再抛由外层接住）；`t123` 29/29、`t108` 14/14、`t115b` 7/7、
  `d165`/`d166` 全绿；80 套快照**逐例相同**（差异只有 CPython 集合哈希序与 `enumerate`/`zip` 地址）；
  featprobe **246/259**；`check41` **18,328** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.59 共 50 版全 MATCH**。产物 `MiniPy_v4.59.sb3`：Interpreter 16,899 / 合计 **18,328** 块。
* **小提示**：探针别用 `KeyError` 比 `print(e)`——CPython 的 `str(KeyError('k'))` 是带引号的 `'k'`
  （KeyError 的 repr 习惯），用 `ValueError`/`IndexError` 更干净。
* **补丁拆分**：v4.59 = **`p132.txt`**；`rebuild-old.ps1` 里 `v4.58 = "$p59"` 就能精确复现上一版。

## v4.67 追加（v4.58 功能轮：P131，出货 v4.58）

* **P131 类型元组与 issubclass**：`isinstance(x, (int, str))`、`issubclass(A, B)`（含
  `issubclass(A, (B, C))`）。做法：把 P128 的"名字 → 类型标签"链抽成 `isname`（读 P128 的
  `p2v/p2t/p2n`），`issub` 负责两个**类名**之间的判断（同名、`object` 万能、`bool` ⊂ `int`、
  13 个内建异常名 ⊂ `Exception`，用户类走 `isanc` 爬 `ClsPar`）；两个钩子插在 P128 的
  `isinstance` 钩子**之前**并 stop，单名形式仍走老路。**名字在求值前先收集**（嵌套 eval 会重新切词，
  token 下标只有求值前可靠）。
* **逮到并修掉一个 v4.56 引入的退化**：P129 给 `atom` 加的类名判定调用了 P127 的 `iscls`，
  而 `iscls` 用 `ctmp` 当循环计数器——P127 的显式父类调用钩子恰好把"逗号位置"存在 `ctmp` 里并跨过
  "求值实例表达式"这一步，于是 `A.setv(self, v)` 在 v4.56/v4.57 报 `SyntaxError: parentheses`
  （v4.54/v4.55 正常）。修法：给那段 `atom` 插入套上 `ctmp`/`evtype` 的存/取（用 `ownerProc`
  区分 P129 在 `atom` 与 `strval` 两处的同形插入）。探针 `d181` 0/4 → **4/4**、`d160`/`d161` 全绿。
* **又挖出并修掉一个既存 bug（v4.54 起，影响面很大）**：P90 的类体 `name = value` 处理器只看
  "第 2 个 token 是 `=`"、**不看缩进**，于是方法体里的 `r = v` 会在**定义类的时候**被求值 →
  `NameError: v`（行号还报第 1 行，症状像"参数丢了"），而 `r = 5` 会静默变成类属性。
  修法：类体属性行必须**恰好缩进 4 个空格**（`Code[ck]` 第 4 个字符是空格、第 5 个不是）。
  证据：`d184` 4/6→**6/6**、`d185` 0/3→**3/3**、`d182` 1/4→**4/4**、`d186` 2/4→**4/4**；
  在 v4.53 上更差（2/6），v4.54–v4.57 都是 4/6。顺带把"子类 `__init__` 用局部变量给父类
  `__init__` 传参"也治好了（`d161` **6/6**、`d160` **6/6**）。
* **验证**：新增 `d179` 6/6、`d180` 5/5、`d181` 4/4、`d182` 4/4、`d183` 6/6、`d184` 6/6、
  `d185` 3/3、`d186` 4/4；`d159` 4/5（只剩菱形 C3）、`t144` 16/16、`d158` 8/8、`d156` 5/5、
  `d165` 5/5、`d166` 8/8、`d174` 8/8、`d178` 3/3；73 套快照**逐例相同**（差异只有 CPython 集合
  哈希序与 `enumerate`/`zip` 地址）；6 套 featprobe **246/259**；`check41` **18,216** 块 errors=0；
  `frames` fib16 `interpSteps` **6388**；`rebuild-old.ps1` **v4.10…v4.58 共 49 版全 MATCH**。
  产物 `MiniPy_v4.58.sb3`：Interpreter 16,787 / 合计 **18,216** 块。
* **补丁拆分**：v4.58 = **`p131.txt`**；`rebuild-old.ps1` 里 `v4.57 = "$p58"` 就能精确复现上一版。

## v4.66 追加（v4.57 功能轮：P130，出货 v4.57）

* **P130 `sorted(x, key=…)`**（featprobe3 最后一个功能项，本轮翻绿）：两件缺的东西——
  ①**"把一个值当函数调用"**：`calluser` 从 `UArgV`/`UArgT` 取实参，而那两个列表是它自己扫描
  token 区间填的，所以 `callval` 先 `reprval` 把元素变成**源码形式**、`tokenize` 换成 token、
  再 `calluser 函数名 1 len(Tok)`，最后用 `tokenize Code[pc]` 把当前行的 token 放回去（P112 同款）。
  ②**按 key 排序**：`lsort` 拒绝元组，于是 `srtkey` 排**键表**、再"按排好的键找第一个未使用的等键元素"
  ——顺带保住 CPython 的**稳定性**；回收元素时先 `lesc` 再嵌入（嵌套容器的分隔符不能漏进外层编码）。
* **三个关键认识**：函数值 `eval` 出来是 `FnName` 的**下标**（`evtype='F'`），`calluser` 要名字，
  得先 `FnName[ev]`；`key=len` 这类**内建名**根本不是值（`atom` 报 NameError），单 token 的 key
  在求值失败时改走 `callfn`；P114 曾把 P101 的 `not(evtype=='L')` 放宽成 `not(or(L,E))`，
  新钩子必须照抄，否则 `sorted(集合, reverse=True)` 退化（被 `t114` 抓到）。
* **本轮三个坑**：①`IF(cond, [then], [else])` 的第三个参数被丢掉（这套 `IF` 只吃两个参数，要 else
  必须 `IFELSE`）——"没有 key 就普通排序"整块消失，`sorted([3,1,2], reverse=True)` 变成 `[]`；
  ②函数值当名字用 → `NameError: function 1`；③嵌套容器键不转义 → `[[], 1, 2, …]`。
* **验证**：新增 `d174` 8/8、`d178` 3/3、`d173` 4/4、`d176` 5/6（唯一失败是嵌套"带关键字 sorted"，
  **P101 就有的形状**，v4.55 上同样报 `SyntaxError: parentheses`）；featprobe3 27→**28/33**，
  6 套 featprobe **246/259**；68 套快照**逐例相同**（差异只有 CPython 集合哈希序与
  `enumerate`/`zip` 内存地址）；`t114` 12/12、`t133` 60/60、`t139` 31/31、`t123` 29/29、`t141` 18/18、
  `t143` 7/7、`t144` 16/16、`t134` 9/9、`t115c` 32/33；`check41` **17,963** 块 errors=0；
  `frames` fib16 `interpSteps` **6388**；`rebuild-old.ps1` **v4.10…v4.57 共 48 版全 MATCH**。
  产物 `MiniPy_v4.57.sb3`：Interpreter 16,534 / 合计 **17,963** 块。
* **补丁拆分**：v4.57 = **`p130.txt`**；`rebuild-old.ps1` 里 `v4.56 = "$p57"` 就能精确复现上一版。

## v4.65 追加（v4.56 功能轮：P129，出货 v4.56）

* **P129 自定义异常类**（清单 §3 点名的那条）：`class MyErr(Exception)` / `raise MyErr('x')` /
  `except MyErr as e` / `except Base` 接住 `Sub` / `print(MyErr)` / `print(MyErr('z'))` → `z`。
  关键认识：`raise`/`except` **一直是按名字工作的**（P51 的 raise 把名字拼进错误串，`trycatch`
  用 `startswith(TryName)` 匹配，`''` 与 `Exception` 是两个万能子句）——唯一卡住的是类语句里
  P106 的父类检查要求父类在 `ClsName` 中，而内建异常名是 P16 注册的**类型 C 值**。放开这一关，
  整条线就通了。
* **五段改动**：(a) 父类检查放行 13 个内建异常名；(b) handler 也匹配子类（从错误串取第一个冒号
  前的类名，用户类则用 P128 的 `isanc` 爬 `ClsPar`）；(c) 类名当值——`atom` 里内建异常名那条测试
  前补大小写敏感的 `iscls`（`iscls` 用 `ev` 回话，所以要存/恢复），`strval` 对用户类加 `__main__.`
  前缀；(d) 异常实例的 `str`——构造时若是异常子类且无 `__init__`，把第一个实参存进隐藏属性
  `__msg__`，`printargs` 在 `__str__` 分支后接一层打印它；(e) `raise MyErr()` 无参不再报
  `SyntaxError: missing expression`——**而且必须同时守住后面那个 `if error == ''`**，否则 `ev`
  是上一条语句的残留值，消息会变成 `MyErr: 0`；(f) `except MyErr as e` 的空消息绑定——P112 的
  `substr(tlast, cp+2, len)` 守卫只要求 `cp+1 ≤ len`，而 raise 拼的串带尾空格，冒号在倒数第二位，
  于是 substr"起点 > 终点"、`ev` 残留成 `0`（这一条是**既存 bug**，只是以前没有能抛空消息的自定义类
  才没暴露）。
* **方法学**：本轮三次都靠"把中间量打进列表再 `dbgmulti`"定位——`tms=[0]` 一眼看出空消息变成了 `0`，
  `R cnt=4 tnm=MyErr` 说明 raise 分支确实进来了、问题在后面的守卫。
* **验证**：新增 `d165.json`（5 条）**5/5**、`d166.json`（8 条）**8/8**；featprobe 的
  「raise 自定义异常」与「自定义异常类」翻绿，6 套 featprobe **245/259**（243 → 245）；
  62 套快照**逐例相同**，差异只有 CPython 集合哈希序与 `enumerate`/`zip` 地址这类噪声；
  `t133` 60/60、`t139` 31/31、`t123` 29/29、`t141` 18/18、`t143` 7/7、`t144` 16/16、`t134` 9/9、
  `t115c` 32/33；`check41` **17,755** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.56 共 47 版全 MATCH**。产物 `MiniPy_v4.56.sb3`：Interpreter 16,326 / 合计 **17,755** 块。
* **已知边界**：多个 `except` 子句只匹配第一个（P51 的既有形状）；内建异常类不能构造
  （`IndexError('x')` 报 NameError）；`e.args` 没有实现（消息在隐藏属性里）；`ZeroDivisionError`
  的消息仍是裸类名；`isinstance(x, (int, str))`/`issubclass` 仍缺。
* **补丁拆分**：v4.56 = **`p129.txt`**；`rebuild-old.ps1` 里 `v4.55 = "$p56"` 就能精确复现上一版。

## v4.64 追加（v4.55 功能轮：P128，出货 v4.55）

* **P128 三件小缺口**（清单 §3 尾巴上的最后一批）：**`set()` 无参**（原来 `SyntaxError: missing
  expression`——P124 的 `set(x)` 处理器在 `callfn` 里读的是已求值实参，空实参区间到不了那里；
  现在 `eval` 在 narg 分派之前自己答 `set ( )`，并且要求 `hi == lo+2`，免得把 `set() + 1` 吞掉）、
  **`issubset`/`issuperset`**（进 P124 的 `setmeth`：`setfilter(a,b,1)` 的编码与接收者**串相等**即子集，
  规范序 `setnorm` 保证这一点）、**`isinstance(x, T)`**（两个实参的调用同样到不了 callfn：
  `hascomma` 切第一个实参，类型表复用 P76 的标签 `B/Z/L/T/D/S/O/F/E` + 数字看小数点分 int/float，
  实例则取 `InstCls[值]` 交给新的 `isanc` 沿 `ClsPar` 走父类链，最多 24 层）。
* **本轮三个坑（都是新代码自己的，记下来免得下轮重踩）**：
  1. `issubset` 第一版按"两侧元素个数相等"判断，第二个 `listlen` 读到的却是**实参**而不是接收者
     （p127.txt 记的那类"同一个块的值会串"），于是 `{1,2}.issubset({1})` 返回 True。改成
     **一次 `eval` + 一次 `setfilter` + 一次串比较**，不再用计数。
  2. `isanc` 把结果放进 `ev`，而 `clspar` 也用 `ev` 回话 ⇒ 第一次爬升后"还没命中"的守卫失效，
     循环空转到上限，`isinstance(C(), A)`（C→B→A）判 False。日志：`climb C->A ev=0` → `par=B` →
     `climb B->A ev=B`（之后 24 次空转）。结果改放独立变量 `p2r`。
  3. `Tok[tqcpz+1]` **不能在 `eval` 之后读**：`isinstance((1, 2), tuple)` 判 False，因为求值这个
     元组字面量会让解释器**重新切词**（p90.txt 早有这条警告），旧下标读到的是 `2`。
     类名 token 必须在求值**之前**存下来。
* **方法学**：三处都是"先加一行日志把中间量打出来"定位的——`dbgmulti.mjs` 打 `DbgL` 列表，
  一次就能看出是"参数串了"还是"下标失效了"，比反复读补丁源码快得多。
* **验证**：`t134.json` 7/9 → **9/9**；新增 `d162.json`（8 条）、`d163.json`（5 条）、`d164.json`
  （5 条，含内联元组）全绿；`t133` 60/60、`t139` 31/31、`t123` 29/29、`t141` 18/18、`t143` 7/7、
  `t144` 16/16、`t115c` 32/33；62 套快照 59 套逐例相同，3 套差异全是噪声或变好（`t134` +2 翻绿）；
  6 个 featprobe 243/259；`check41` **17,601** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.55 共 46 版全 MATCH**。产物 `MiniPy_v4.55.sb3`：Interpreter 16,172 / 合计 **17,601** 块。
* **已知边界**：`isinstance(x, (int, str))` 的元组类型表、`issubclass`、`frozenset` 仍缺；
  集合元素顺序按插入序（清单 §3 第 9 条的不保证项）。
* **补丁拆分**：v4.55 = **`p128.txt`**（新增变量统一 `p2` 前缀避免撞名）；`rebuild-old.ps1` 里
  `v4.54 = "$p55"`（只跳过 P128）就能精确复现上一版。

## v4.63 追加（v4.54 功能轮：P127，出货 v4.54）

* **P127 `super()` / 类属性继承 / 多重继承**（清单 §3 末尾那条）：`class B(A): pass` 之后 `B.n` 原来报
  `AttributeError: n`——`IAttr*`（类属性表）只有类体自己写过的行。修法照抄 P106 的方法技巧：类语句处
  把每个父类的 `IAttr*` 行复制到子类名下（**从左到右**，因为 `IAttr` 正序扫描，最左的父类优先命中），
  子类自己的 `n = ...` 行仍会覆盖。方法表按**从右到左**复制（`calluser` 从 `FnName` 末尾往前找，
  最左的父类必须最后复制）。新增 `ClsPar`（与 `ClsName` 平行，存每个类的父类串）、`CQ2`、
  `callcls`（带显式类的 `callmeth`）、`clssplit`/`clspar`/`clscopy`/`clscopyattr`/`iscls`，
  以及 `eval` 里的两个钩子：`super().m(args)`（用 `cmet` 反查父类）与 `类名.m(实例[, 参数])`。
  类形状守卫放宽到"任意个父类"，于是 `class C(A, B):` 也能过。
* **顺带修的三个既有 bug**（不修则继承走不通）：
  1. **自定义积木的实参在重复调用时不更新**。`super()` 的第一版单独跑全对、同一个 VM 里跑第二个
     用例就全错；`dbgmulti` 打出 `split-raw: QQ`（上一个个例的实参）而调用方的 `ctmp` 明明是 `'A,B'`，
     再往 `eval` 里加"条件值"日志还看到 **`cond=true` 却走 else 分支**。对着 scratch-vm 源码能逐行解释：
     `initParams()` 只在 `params === null` 时建对象、`_StackFrame.reset()/reuse()` **不清 `executed`**、
     `BlockCached._argValues` 是"每个块一个对象、所有执行共用"。**修法**：本轮所有内部过程改用
     **全局量传参**（`cspec`/`cpar2`/`cname`/`cinst`/`cmeth`/`clo`/`chi`），过程本身不带形参。
     这大概也是清单里若干用例"偶尔红偶尔绿"的根源。
  2. **`self.m()` 报 `AttributeError: only lists have methods`**。`self` 是 callmeth/callcls 写的
     Scratch 变量、不在 MiniPy 变量表里（`s = self` 报 `NameError: self`），所以 methodcall 求接收者
     得到 `0`/类型 `N`。而 methodcall 的顺序是**先求接收者 → D/E/"只认列表"三道守卫 → 才赋 `lmeth` → 分派**，
     事后改 `xa/xb` 已经晚了。修法：`eval` 提前把接收者 token 记进 `cselfr`（嵌套调用可能重排 `Tok`），
     methodcall 在三道守卫**之前**补"`cselfr == 'self'` ⇒ `xa = self`、`xb = 'O'`"。
  3. **P90 的类体 `name = value` 处理器踩 `ck`**：`ck` 同时是类体扫描的循环计数器，带属性的第二个类会
     死循环（`d145.json` V1/V4）。处理器前后用 `VStack` 存取 `ck` 即可。
* **方法学**：本轮三次"单独跑通过、连起来跑就错"都是**同一类问题**——共享的全局状态（VM 层或 MiniPy 层）。
  定位手段按性价比排序：①`dbgmulti.mjs` 打印中间量（列表里直接放原始值比拼串可靠）②`eval` 入口/守卫前
  加"条件值"日志③新写的 `chainof.cjs` 打印某个过程的语句链（这次靠它看清了 methodcall 的
  `接收者 → D/E/列表守卫 → lmeth → S/L/O 分派` 顺序，才知道 `self` 的修法必须放在守卫之前）。
* **验证**：`t144.json`（新写 16 条类探针）**16/16**、`d158.json` 8/8、`d156.json`（`self.m()`）5/5、
  `d160`/`d161`（显式父类调用 12 条）9/12、`d149`/`d154`/`d155`（跨用例串台）全绿；`t133` 60/60、
  `t139` 31/31、`t123` 29/29、`t141` 18/18、`t143` 7/7、`t134` 7/9；62 套快照 59 套逐例相同，3 套差异
  全是噪声或变好（`t115c` Y3 与 featprobe3「类里用其他方法」**变好**）；6 个 featprobe **243/259**
  （242 → 243）；`check41` **17,428** 块 errors=0；`frames` fib16 `interpSteps` **6388**；
  `rebuild-old.ps1` **v4.10…v4.54 共 45 版全 MATCH**。产物 `MiniPy_v4.54.sb3`：Interpreter 15,999 / 合计 **17,428** 块。
* **已知边界**（下轮候选）：菱形继承的 C3 顺序（`d159.json` E4）、子类 `__init__` 用局部变量给父类
  `__init__` 传参（`d161.json` G2/G3）、`isinstance`、`class MyErr(Exception)`、`sorted(x, key=lambda …)`、
  `set()` 无参 / `issubset`。
* **补丁拆分**：v4.54 的全部内容放进 **`p127.txt`**，`p126.txt` 保持 v4.53 出货时的样子——
  `rebuild-old.ps1` 里 `v4.53 = "$p54"`（只跳过 P127）就能精确复现上一版。

## v4.62 追加（v4.53 功能轮：P126，出货 v4.53）

* **P126 生成器表达式**：`f(x for x in xs)` 从来走不到推导式。给 `eval` 入口加一条日志（记 `pc/head/lo/hi`）
  之后看清了整条链路：`print(sum(x for x in range(3)))` 的实参整体（`eval(3,13)`）确实交给了 eval，
  实参也不是被切碎的——是 **eval 的运算符扫描先看到顶层的 `in`**，把 `x for x`（`eval(5,7)`）当左操作数
  求值，最后落在兜底 `SyntaxError: expression`。所以修法是在 **`eval` 最前面**（三元扫描与运算符扫描之前）
  加一段：span > 3 且存在**深度 0** 的 `for` ⇒ 整个 span 交给 `complist`（P125 已能处理任意条子句）。
  语义与 `enumerate`/`zip` 的"立即求值"扩展一致：**值是列表**（`len(g)`、二次遍历、`print(g)` 都能用；
  CPython 是惰性生成器对象）。`hi - lo > 3` 的守卫让 eval 的热路径保持廉价——`fib16` 的 `interpSteps`
  仍是 6388（这个指标数的是解释器层语句步数，不受 VM 块数影响）。
* **P126 生成器解包**：`for a, b in g()` 报 "TypeError: cannot unpack non-iterable object"——P89 的两道解包
  守卫（`for a, b in …` 与 `a, b = …`）只认 `L`/`T`，而 P97 早就把生成器的 `G` 并进同一条列表遍历路径了。
  两处都放行 `G` 即可（`for a, b in g()`、`a, b = g()` 都通；元素个数不对时抛 `ValueError: not enough
  values to unpack`，与 CPython 的错误类型一致）。
* **方法学**：本轮是"上一轮定位错误、这一轮先用日志证实再动手"的典型——上一轮以为问题在实参切分
  （`printargs`/`callfn` 之前那一步），加了入口日志才发现实参完好，真正的分叉在 eval 内部。
  **在入口处记录 `pc/head/lo/hi`**（`dbgmulti` 打印一个列表即可）比反复读补丁源码快得多。
* **验证**：`t141` 18/18、`t143` 7/7、`t139` 31/31、`t133` 60/60、`t123` 29/29、`t115c` 32/33（只剩
  `split('\n')` 的 ASCII 显示限制）；battery 23 套件与 v4.52 **逐字节相同**；28 套 `cmp47` + 28 套
  `_work/v41`（含 `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7）逐例 diff=0；6 个 featprobe 242/259；
  `check41` 17,017 块 errors=0；`frames` fib16 `interpSteps` 6388；
  `rebuild-old.ps1` **v4.10…v4.53 共 44 版全 MATCH**。产物 `MiniPy_v4.53.sb3`：Interpreter 15,588 / 合计 **17,017** 块。
* **补丁拆分**：v4.53 的两段（生成器表达式、生成器解包）单独放进 **`p126.txt`**，`p125.txt` 保持 v4.52 出货时的样子——
  这样 `rebuild-old.ps1` 里 `v4.52 = "$p53"`（只跳过 P126）就能精确复现上一版。
* **下一轮候选**：`super()` 与类属性继承 → 多重继承 → `sorted(x, key=lambda …)` → 集合元素顺序/`set()` 无参。

## v4.197 追加

* P481（`p481.txt`）：新建生成器值先作废 `GIt` 里同内容的旧游标 —— 修 v4.196 报的
  `generator return value stops iteration`/`yield inside condition and loop` 两例"回归"。
  真相是游标表按**值内容**寻址，被前序用例耗尽后污染；单跑不复现。
* P485（`p485.txt`）：摘掉 calluser 内部 10 处 `stop this script`。报错已经写进 `error`，
  函数体循环条件本就含 `error != ""`，会自然落到收尾段 ⇒ 帧栈/cdepth/pc 不再错位。
  这修的是 `builtin exception messages`（lambda 内 TypeError + 函数内 try 的死循环）。
* P486（`p486.txt`）：`x.copy()`/`x[:]` = 元素共享的浅拷贝。复用 P54 的 AliasN/AliasT 做传播，
  另加 `CpyN`/`CpyT` 标记"可被结构操作解除"；结构方法（直接在变量上调用）与槽位整体替换
  （`a[i]=v` 且元素不是容器、`del a[i]`）会先 `cpybreak`。
* `p480.txt`（基准栈）**未落地**：它把压栈插进了 calluser 的参数绑定循环（0 参函数不会执行），
  会让所有生成器返回 `[]`。当前不在 `assemble.cjs` 链里；改法见文件内注释。
* 教训：`head.txt` 的 `OUT`/`STAMP` 是默认输出，直接 `node build41.js` 会覆盖最新 sb3；
  本轮已把默认版本号提到 v4.197（之前一次对照实验误覆盖过 v4.196，已用
  `V41_SKIP='P480 generator base stack'` 原样重建并核对 32,237 块一致）。

## v4.199 追加（v4.198 语义轮：P487–P490，出货 v4.199）

* **P487**（`p487.txt`）：`sorted(dict, key=…)` / `sorted(dict, reverse=…)` 在 `dictkeys` 转换成功后
  仍执行 `fnlimit -= 1 ; stop this script`（P276 只把上面的 fail 变成了有条件），于是返回未排序的键表。
  把这两句也包进 `if evtype != "L"` → 字典照常排序。
* **P488**（`p488.txt`）：内建名当值。类型名 → `<class 'int'>`（字符串 S，正好等于 P76 的 `type()`
  输出，所以 `type(1) == int` / `is` 直接成立，**不动 `type()`**）；函数名 → `<built-in function len>`。
  调用侧：`eval` 的可调用判定认这两种拼写，分派前把拼写里的裸名还原进 `p8c` 交给 `callfn`；
  `x8nc` 排除这两种拼写。两个坑：①**单参数调用**走 `narg == 0` 分支，有自己的 `callfn` 且不看 `callable`，
  必须单独补解析；②`sorted/max/min(key=len)` 原来靠"求值失败才回退到内建名"，现在求值成功 ⇒
  `FnName['<built-in function len>']` 为空 ⇒ `NameError: name ''`，两个 key 解析点要补同样的还原。
* **P489**（`p489.txt`）：`map`/`filter` 第一参数不再要求单标识符；多记号片段正常 `eval`，
  `evtype == "F"` 时 `mpfn = FnName[ev]`、`mpbin = 0`，`mpset == 0` 时才走原来的 lookup 路径。
* **P490**（`p490.txt`）：生成器基准栈。calluser 入口把 `clear(GYield)` 换成
  `if FnKind[fi] == "G": GYBase += len(GYield)+1`；值构建从 `GYBase[末项]` 开始；
  构建完截断回起点之前再弹出。
  **教训**：截断用 `REPEATU(len(GYield) < base-1)` 会卡死整个 VM 线程（程序静默结束、`error` 仍为空），
  改成先算 `len - base + 1` 再 `REPEAT N` 才正常。`yield from` 原来靠共享表泄漏白拿内层项，
  截断后必须去掉 `execute` 里 `if not (evtype == "G")` 的守卫，显式复制。
* **webfix 搬家**：v4.198 的 `normalizeProject` 只写在生成的 `build41.js` 里，`assemble.cjs`
  会把它丢掉；本轮移入 `head.txt`（require）和 `tail.txt`（构建末尾调用）。
* **验证**：581 全套 **518 pass / 63 fail**（v4.197 为 508/73），`cmp131` **FIXED=10 / BROKE=0**；
  补充 82 例 **64/18**，`gdiff` **fixed=3 / broke=0**；`check41` **32,950 块 errors=0**；
  `validate_web` 悬空 0、多引用 0、shadow 误标 0。产物 `MiniPy_v4.199.sb3`：Interpreter 30,673 / 合计 **32,950** 块。
* **下一轮候选**：例外实例模型（`e` 拿真对象、`e.args`、自定义异常属性）→ 闭包返回/`nonlocal` →
  `__lt__` 重载 → 生成器对象标识。
  （注：webfix 进入构建链后，`rebuild-old.ps1` 重建 v4.197 及更早版本会比官方产物多出 webfix 的克隆块，
  块级比对不再 MATCH —— 语义一致，仅结构后处理不同。）

## v4.200 追加（例外实例模型：P491，出货 v4.200）

* **P491**（`p491.txt`）一次收掉旧清单 #1（581 修 8 例、补充修 3 例，回归 0）：
  1. **运行起点注册内建异常**：`clear(ClsPar)` 之后成对 append 29 个名字到 `ClsName`/`ClsPar`
     （`KeyError → LookupError → Exception` 等）。**`ClsMro` 必须同步补齐**——`clsmro` 是按
     `ClsName` 的下标读 `ClsMro` 的，只补两张表会让 `super()` 链整体错位（`diamond with super chain`）。
  2. **类名判断改精确匹配**：`callfn`/`callfnW` 用的是 `ClsName 的内容 包含 fn`（Scratch 的
     `contains` 是**子串**、忽略大小写）。`ClsName` 平时是空的所以从没暴露；一注册就出事：
     `FloatingPointError` 含 `int`、`...OverflowError ValueError` 含 `len`，`len()/int()/type()/float()`
     全被当成类构造、返回 `<len object>`。改成 `list contains item`。
  3. **`type(实例)` 返回类值本身**（`C` + `InstCls[ev]`）：原来给 S 拼写，而类名当值是 C 裸名，
     类型不同的 `==` 直接判不等 ⇒ `type(n) == Named` 永远 False。打印仍由 `strval` 的 C 分支给出拼写，
     `type(x).__name__` 正好回到裸名。`strval` 的 C 分支要给内建异常加 `ExcNames` 排除（`iscls` 现在为真）。
  4. **`raise X(...)` 现在真的调用构造函数**：原来 `tnm = Tok[2]`、只对参数区 `eval(4, count-1)`，
     构造函数一次都没执行 ⇒ `raise AppError(7)` 之后 `e.code` 永远 AttributeError。改成类名时
     `eval(2, count)`（`Tok[count]` 是右括号），与 `a = X(args)` 同一条路；求值后暂存 `ev/evtype`
     （`fail %s` 会先清 `ErrV/ErrT`），再写回去。
  5. **显示层**：无 `__msg__` 的异常实例 `str` 为空串；`repr(异常实例)` = `Cls(参数repr)`；
     `KeyError` 的 `__msg__` 构造时先 repr（`str(KeyError('k'))` == `"'k'"`）；多参数异常的 `__msg__`
     是元组编码，先过 `strval` 再存（否则 `raise Exception('e','f')` 会漏出 `\u001f`）。
* **教训**：构建器里的 `IF(cond, a, b)` **只有两个参数**，第三个（else 分支）会被静默丢弃 ——
  本轮 `reprval` 的非字符串分支整段消失，排查了半天。要 else 就用 `IFELSE`。
* **验证**：581 全套 **526 pass / 55 fail**（v4.199 为 518/63）；`cmp131` **FIXED=8 / BROKE=0**；
  补充 82 例 **67/15**（v4.199 64/18），`gdiff` **fixed=3 / broke=0**；
  `check41` **33,129 块 errors=0**；`validate_web` 悬空 0、多引用 0、shadow 误标 0。
  产物 `MiniPy_v4.200.sb3`：Interpreter 30,852 / 合计 **33,129** 块。
* **注意**：`_res199` 是 v4.198 代的结果目录（70 失败），不能当 v4.199 基线；本轮重跑的基线是 `_res199v`（63 失败）。
* **下一轮候选**：闭包返回/`nonlocal` → 生成器对象标识 → `__lt__` 重载 → 实例 `repr` 的 `__main__.`/地址。
