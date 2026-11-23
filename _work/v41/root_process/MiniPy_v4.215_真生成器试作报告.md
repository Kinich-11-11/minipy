# MiniPy v4.215 真·生成器试作报告（未入库轮）

**结论先行**：本轮完成了 E3（真·惰性生成器）的可恢复帧核心实装（p591/p592，未加入
assemble parts），`while True` 生成器、`next()` 逐值拉取、StopIteration、`yield from`
单层场景全部跑通——**两个 E3 目标用例（`generator fibonacci`、`probe generator while
true swap`）转绿**——但 `_cov7`/`_covC`/`_covY`/`_cov205d` 的 **15 个既有生成器用例
回归**（净收益 +2/−15），剩余 NameError 族根因未在本轮定位完成，按 P22/p33 先例
**补丁保留在 `_work/v41/`、不进发布版**。发布版维持 v4.214（已验证与 v4.214 逐例
一致：回归 674/0、主套件 162/2、补充 82/0，39089 块 check41 errors=0）。

## 一、实装了什么（p591 + p592，已写完并单测通过的部分）

**架构**：calluser 加"恢复模式"。生成器函数调用（FnKind=='G'）不再预跑函数体：
绑定实参后把帧局部行快照进按 gid 键控的状态表，返回句柄 `'G#<gid>'`（急切 G 串
以 lsep 开头，无歧义）。`next()/gconv` 认句柄后走 `gcur=gid + calluser('',1,0)`：
入口用 GHFn 修正 fi、fpush 后 ghrestore/ghlrestore 把局部行与循环条目推回
Names/LoopHead、pc=GHpc 继续体循环；`yield` 在恢复帧里置 GYval/GYtype/gyld，
体循环 until 条件追加 `or gyld==1` 挂起退出，出口把演化后的局部行/循环栈/pc
回写状态表（ghstash/ghlstash 先于 popLoop）。`gmy/glz` 入 fpush/fpop（帧作用域）；
`yield from` 改造成逐元素挂起（GHyf\* 状态按 gid 键控，跨挂起存活）。

**实测通过**：`next()` 逐值（含副作用交错顺序与 CPython 一致）、`while True` 无限
生成器、耗尽 → StopIteration（可被 try/except 捕获）、`list()/sum()/len()` 消费
有界生成器、`yield from inner()` 单层、两个 E3 目标用例。

## 二、未解决的核心缺口（下轮的起点）

`_cov7` 等 15 例的失败集中在 **经 gconv/gslice/for 消费生成器** 的形态，症状高度
一致：`NameError: name ''`——即 `calluser('')` 进入时 `gcur` 为假，恢复模式没有
生效、按普通函数走了 NameError。已排除的方向：包裹落点（体循环/绑定循环的
IF(gnew==0)/IF(grez==0) 均已验证落位正确）、fpush/fpop 槽位（gmy=137/glz=138/
grez=139 已核对）、句柄文本（ItSrc 注册正确）、Tok 复原（按 P52/P548 惯例补了
`tokenize(Code[pc])`，无效）。**已确认**：`next()` 直拉路径完全正常，同一段
resume 机制在 gconv 路径下失效——差异在"resume 发生在 callfn/gconv 栈内"这一
上下文（怀疑点：gconv 被调用两次的旧结构、`pending`/`fnlimit` 在 eval 栈内的
状态、或 fpush 名单里某个共享临时量在 resume 体循环中被冲掉）。

## 三、本轮新踩的坑（全部实测，接 README 铁律）

1. **沿 .next 前向找循环，不要沿 parent 爬**：构建期 parent 链是上一轮 relink
   的旧账，沿 parent 找"体循环"会包住参数绑定循环（症状：恢复帧重跑绑定 →
   missing argument；新调用跳过绑定被无参用例掩盖成"重放语义"）。
2. **JSON.stringify(Set) 是 '{}'**：reach() 返回 Set，做特征匹配必须
   `[...reach(x)]` 甚至 `[...reach(x)].map(id=>BL()[id])`（内联描述符不进 reach）。
3. **`item(list, idx)` 参数序**：item(列表名, 下标)——写成 item(llen(x), '表名')
   会把块 id 当表名（`no list bdatale_…`）。
4. **新建块必须立刻接链**：`const blk = IFELSE(...)` 之后忘了 spliceAfter，块就是
   孤儿，构建尾部 pruneUnreachable 静默剪掉（本轮 glz 插入改写时丢过整个
   新鲜分支，症状是"句柄变空串"）。
5. **IFELSE 补丁改写头部时，尾部的 `]));` 括号数要同步改**（const 赋值与函数
   调用的闭合差一个括号）。
6. **调试 trace 的 JOIN 字面量必须包 txt()**：裸字符串会被 B.REP 当块 id，
   运行时得到空串——本轮据此虚耗了两轮排查。
7. **构建失败后跑测试 = 测旧产物**：build exit=1 时 project.json/sb3 不更新，
   dbg 现象会"忽好忽坏"。每次构建先看 exit code。

## 四、产物与复现

- 补丁：`_work/v41/p591.txt`（挂起/恢复核心）、`p592.txt`（next/gconv 句柄消费）；
  加入方式：assemble214.cjs 的 parts 里在 `p590.txt` 后补回
  `'p591.txt','p592.txt',`。
- 试作构建：`_work/v41/MiniPy_v4.215test.sb3`（39529 块，含 p591/p592）。
- 验证：`node _work/v41/dbg214.mjs <sb3> '<code>' [vars] [lists]`（单例调试器，
  新增）；回归目录 `_reg215/`（15 败）、`_reg215r/`（回退后 0 败）。
- 下轮建议：先做"gconv 路径 vs next 路径"的最小对分探针（同一生成器、同一句柄，
  分别走两条消费路径，dump gcur/gmy/fpush 名单里的每个共享临时量），定位
  resume 在 callfn 栈内失效的那一个状态量；然后把 15 例分家族逐个清。
