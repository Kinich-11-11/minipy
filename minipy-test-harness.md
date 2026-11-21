---
name: minipy-test-harness
description: MiniPy 项目的测试方法：套件格式/expectError 写法、runall/run_iso/V41_SKIP 用法、补丁系列与块手术铁律（含 v4.208 新坑）
metadata:
  node_type: memory
  type: project
  originSessionId: session_1b02384929740ad2654eef27231b1820
---

MiniPy（Scratch 实现的 Python 解释器）测试与修复流程（2026-10-31 更新至 v4.209）：

**套件格式**：`### 用例名` + 代码行，存为 `_work/v41/_cov*.txt`；补充套件是 JSON
（`_gap131.json`，字段 `name/code/expectError`）。**expectError 标记是 `### !用例名`**
（`!` 在名字前）。JSON 里用 `"expectError": true`。

**运行**：`node _work/v41/runall.mjs <sb3> <outdir> <txt...>`（进程内串行、自动对比
CPython 3.14）；补充套件 `node _work/v41/run_iso.mjs <sb3> <cases.json> <out.json> <tag>`。
`_show.cjs <outdir>` 看失败。**串行失败必须隔离重跑再定性，且二分时被测用例必须固定在
套件尾部**。逐例对照：`cmp131.cjs`、`gdiff.cjs`。构建：**`node _work/v41/assemble219.cjs &&
V41_OUT=… V41_STAMP=… node _work/v41/build41.js`**（**注意：assemble.cjs 是 v4.209 旧清单，
每轮各有 assemble2NN.cjs，用错清单会静默产出少几千块的旧语义产物**；补丁在各 assemble 的
parts 列表里，新补丁建 pNNN.txt 后加在 tail.txt 前）；`check41.cjs` 结构体检；
`V41_SKIP='补丁名'` 跳过单个补丁二分。
**套件每例重灌 Code 并重播 RUN（行号从 1 重来）——prepare 里按行号索引的列表必须加进
每例清理序列**（P554 教训）。dbgrun.mjs 很慢且用例文件必须是字符串数组，优先用
run_iso+log 探针。

**v4.209 状态**：别名语义补全——P557 返回值别名（x = f() 单调用形态 + rrK==1 → alrec）+ P558 实参传引用（UArgN 源名 + PairPile/PairDep 帧栈）；新增 _covheap 别名套件 13 例；失败清单与 v4.208 一致（全不可修）。**P559**（第二轮）：可变默认参数跨语句身份——合成名 __dfv<fu>（P553 捕获记名、P557 配对放宽 rrK==2、P547 现值入 DfN/V/T 堆栈、calluser 出口 fpop 前（Names 重建后）统一 assign 落账、默认绑定处 __dfv 存在则改读它）。坑：同一 fpop 前插多个钩子时后面的不能依赖前面未消费的栈（P558 先弹空 PairDep，P559 守卫读它恒假）；JOIN 输入键是 STRING1/2；epilogue 内写调用者行会被 Names 重建冲掉——暂存堆栈+重建后落账。完整对象堆（P556）评估后归档：名字别名 P54 已支持，堆的增量只在值逃逸成返回值/实参的旅行，名字对表即可表达；可变默认参数跨语句身份留待 FnSlot 化。**v4.208 状态**：581 套 8 败、82 套 1 败（divmod big）、cov205 全过——**真实失败 14→9，
全部是声明不可修项（§1 双精度 ×5、§7 地址 ×2、§5 不修 ×2），可修项清零**。本轮修掉：
tuple-alias（P552 pathset T 分支）、default-mutable/global-list（P553 返回值行引用+print
两遍渲染）、RLE（P554 LoopElse 列表未清理）、iterator-protocol（P548 复活：stop 前补
tokenize(Code[pc])）。详见 MiniPy_v4.208_更新说明.md 与 _work/v41/已知问题清单_v4.208.md。

**How to apply（块手术铁律）**：
1. **replaceStmt 会覆盖 newId.next**：链先建好、replace 只挂头，或用 spliceAfter。
2. **IFELSE 分支替换会"吞链"**：substack 执行沿 `.next` 走，旧首块的 next 仍连原链——
   原链被吞进新 IFELSE 的分支里。取值 IFELSE 放分支头、原链接在后面共用（P553）。
3. **块树禁止跨实例共享**（单亲违规，webfix 丢弃多主块 → 条件静默变假）：工厂函数
   每次调用新建（mkStore/mkMaterialize/mkIsContainer 模式）。
4. **stop this script 跳过 calluser 出口再词法化**：成功即 stop 的钩子，stop 前必须
   `tokenize(Code[pc])`；克隆间标记（p48d 式）要在分支入口复位（P548 三版回退真因）。
5. **REPEATU 是先判后跑的 while**；压实"删基址以上"写 `NOT(GT(llen, base))`——写反恒真、
   循环体从不执行（P553 压实方向教训）。
6. **N 记号规范化必须跳过长度 1 的记号**（P536 的 161 例回归）。
7. **全局寄存器（narg/iid）在同帧嵌套 eval 里会被冲**：用 VStack 存或保存/恢复（P542/P544）。
8. **stale 寄存器做外层条件等于无条件**（P546）；守卫体内部自算判据。
9. **eval 钩子拦内建调用 = 非 O 实参双重求值**（list(map(int,input().split())) 读两行）——
   内建分派的新行为要挂 fail-site（P548 位置），不要挂 narg 分派前。
10. **REPEATU 方向坑连犯两次**：删"基址/栈底以上"写 `NOT(GT(上,下))`；正 GT 在空转时恒假→死循环。且 `GT(n, 空串)` 是字符串比较恒真——栈深比较先守栈非空。出口路径可能比入口推栈跑得多（双克隆），入口/出口各带不平衡兜底。
11. **克隆 INDEX 表达式按形态包装**：块 id 用 B.REP(id,shadow)、内联原语 [3,prim,shadow]，裸塞产出非法 sb3。**UArgN 是现成的实参源名表**（裸名记名/''/kw 记 '#'）。
12. **"继承行"判据自建 FrRBase**（calluser 入口推 llen(Names)）：FrBase/FrBnd 语义都不是
   入帧行数。IEEE 缩放会再舍入（P550 伪平局探测要从 a1v 直接乘多尺度）。
**v4.215 增补（接铁律 12）**：
13. **VM 的 call 原语按 define 的 argumentids 取实参**——新建 proc 后手改旧 call 的
    proccode 会让实参全空；换过程体用 attachBody 替换原 def 的 body。
14. **MiniPy 变量模型 = 同名行复用 + FN 快照恢复（bottom-up 首匹配）**——跨帧恢复
    变量用 assign（首匹配重绑定），不要 addTo 追加新行（追加行永远排在调用方同名行
    之后，lookup 命中调用方的行 → 帧串扰/自递归）。
15. 共享暂存寄存器（ghc/gsa/ghg 类）在嵌套调用下必须压栈（GStk 模式）或消费侧专用。
16. 条件树原位替换在父槽位做；克隆两份新 equals，不回指原块（reach 成环 → webfix 爆栈）。
17. 字面量匹配用 reach() 逐块 stringify 或直接读 [1,[10,x]] 描述符；JSON.stringify
    单块只见描述符 id。
18. run_iso 的 cases.json 的 code 必须是字符串（数组被 String() 逗号连接 → 对比全废）。
**v4.216 增补（接铁律 18）**：
19. **procedures_call 不能进表达式槽**：线程静默出错。过程只在语句位调用、值走全局变量；
    条件里查表用内联 REPEATU 语句（p608 icv 首版教训，8 例假回归）。
20. **IF/IFELSE 只串 substack 不串顶层 next**：新语句数组必须 chain(ids) 手工串链；
    把原链挂进 substack 后必须断开尾块旧 .next（否则 VM 顺旧指针双跑）；THEN 臂接管
    循环体时计数自增（lpi 类）留在 IFELSE 外作公共尾。
21. **callfn 与 callfnW 的对应分支共享块**（sum 累加循环两个 repeat_until 包装指向同一
    substack 头）：改造共享链一次，两个包装各插入口重置/出口收尾，幂等判据看前驱。
22. **全局标志变量（nanhit/sj 类）必须每次使用点复位**——一个 nan 用例曾污染其后全部
    用例的 ==（probe216a 16 例假回归）。
23. **sensing askandwait 的 promise 在 warp 线程 resolve 后线程不恢复**：input 类阻塞
    改"状态变量+轮询"协议（stdin 变量；run_iso Waiting 时 setG('stdin',answer)，
    sv/sl 要 concat Interpreter 目标的变量）。
24. **F 型变量值 = FnName 索引**（__name__ = FnName[value]，lambda 项 '#' 前缀）；
    fail 宿主 if 取"SUBSTACK 顶层链直接包含 fail"的最内层；Set 迭代序不定，
    分类依赖顺序时必须 ordered-walk 排序。
**v4.235 增补（接铁律 24）**：
25. **谓词必须逐块 stringify**：`JSON.stringify([...reach(id)])` 只 stringify id 数组；
    用 `reach().map(x => JSON.stringify(BL()[x])).join(' ')`（deep 式）。
26. **letterOf(位数, 串)**——参数装反静默返回空串，条件恒假。
27. **裸字符串进 B.REP = 悬空块 id**（JOIN('lit',…) 之类）→ webfix
    "already has dangling block references" → **构建不写 sb3 且 exit=0**，旧 sb3
    残留 → 跑批结果全部来自旧文件；每次构建后必须确认 `total=` 行存在。
28. **replaceStmt 式重定向要同时接出链**（fresh.next = 旧.next）——只接入链会把
    后续 gate-IF 整体孤立。
29. **insertBeforeStmt 收数组**；传 chain() 的返回 id 会被 slice() 按字符拆开。
30. **全局寄存器会被函数体执行冲掉**（铁律 7 实例）：语句级钩子里 eval 之后读的
    寄存器（如 P732 的 z7augk/z7augop）要在 eval 前后快照/恢复——调用根目标会
    calluser→execute→函数体语句重跑同一扫描。
31. **itemnum/contains/EQ 全部不分大小写**（v4.223 坑的字符表形态）：é 命中 É、
    %A 折进 'a'。需要精确匹配用 compareText（真大小写敏感）；字符表按"同一折叠类
    不共表"拆分（CharLo/CharUp）。
32. **tokenize 冲掉 ev**——callmeth 的接收者先 stash 到专用变量再 tokenize。
33. **"臂存在"≠"臂可达"**：图上 find 到的分支未必在运行时路径上（循环门/旗标门），
    改行为前先插桩确认；调试通道 = Dbg 列表 + run_dbg235.mjs（run_iso 变体多 dump
    一列），addTo 的 JOIN 实参必须 txt()（见 27）。
