# MiniPy v4.215 更新说明

**构建**：`MiniPy_v4.215.sb3`（2026-11-06，39,937 块，check41 errors=0）
**依据**：`MiniPy_v4.214_更新说明.md` §四"仍存在的问题" + §六"下一轮建议"。
本轮完成清单项 **12 项**（含上一轮遗留的 E3 真生成器），新增补丁 **P591–P598**（8 个）。

## 一、结果总览

| 套件 | v4.214 | **v4.215** | 说明 |
|---|---|---|---|
| 主套件+探针（164 例） | 162 过 2 败 | **164 过 0 败** | E3 两例转绿，0 破坏 |
| `_cov*` 回归（678 例） | 674 过 0 败 | **678 过 0 败** | 新增 4 个大整数用例全过 |
| `_cov7` 生成器套件（33 例） | 30 过 | **33 过** | 新增 3 个流式用例全过 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| **合计 927 例** | 918 过 2 败 | **927 过 0 败** | **历史首次全绿** |

E3（惰性生成器，`while True` 挂死）——自 v4.209 起连续四轮声明"重写级、单独一轮"的
最后大项——本轮完成。`generator fibonacci`、`probe generator while true swap`、
`generator yield squares` 及 `_cov7`/`_covC`/`_covY`/`_cov205d`/`_gap131` 的全部
生成器用例（隔离与串行）转绿。

## 二、修掉的 12 项

| # | 清单项 | 补丁 | 转绿用例 |
|---|---|---|---|
| 1 | **E3 真生成器（可恢复帧）**：yield 挂起 / next() 恢复 / 耗尽 StopIteration | P591+P592 | `_new5 generator fibonacci`、`_new7 probe generator while true swap` |
| 2 | 生成器基本消费：list()/next()/复用/耗尽/tuple yield | P593（ghg/ghf 寄存器）、P593b（lesc 前捕获） | `_cov7 generator basic`、`next and exhaustion`、`with tuple yield` 等 |
| 3 | 生成器消费生成器（嵌套拉取） | P594（gconv IFELSE + GStk 现场保存） | `_cov205d generator pipeline`、`_cov7 that consumes another`、`_covC/_covY nested generator yields` |
| 4 | 帧变量恢复走 assign（同名行复用模型） | P595 | `nested generator functions`、同名参数嵌套（d2/take3 的 gen） |
| 5 | yield squares 第二实例 StopIteration | P593+P595 | `_new5 generator yield squares` |
| 6 | **大整数：`/` 真除**（J 参与时走 bgops → mkfloat，符号感知） | P598 | `_cov1 big int true division`（10\*\*30/3 = 3.333333333333333e+29 逐字节对齐） |
| 7 | **大整数：`< >` 比较** | 无需改动（JS 数值比较对 J 串天然正确，本轮用例固化） | `_cov1 big int comparisons` |
| 8 | **大整数：J 作下标 / range 实参** | 无需改动（用例固化） | `_cov1 big int index and range` |
| 9 | **大整数：float(J)** | 无需改动（用例固化） | `_cov1 big int float conversion` |
| 10 | **P590 扩展：genexp 带 if 过滤的 any/all 流式**（含短路证据：side 仅对通过的元素求值） | P597 | `_cov7 probe any all genexp filter` |
| 11 | **P590 扩展：genexp 多 for 的 any/all 流式**（src2 每轮外层迭代现求值，支持引用外层变量） | P597 | `_cov7 probe any all genexp multi for` |
| 12 | **P590 扩展：range 三参源**（start,stop,step，物化成 L 后统一迭代） | P597 | `_cov7 probe any all range three args` |
| — | 槽链反方向（`bx.items.append(3)` → 配对名 xs 跟变） | P596 | 专项验证 `xs, bx.items` → `[1, 2, 3] [1, 2, 3]` |

## 三、补丁明细与根因

### P591+P592 —— 真生成器（可恢复帧）
FnKind=='G' 的调用不再预跑函数体：绑定实参后把帧局部行快照进按 gid 键控的状态表
（GHFn/GHpc/GHdead + GHLoc\* + GHLp\*），返回句柄 `'G#<gid>'`。yield 在恢复帧里执行时
挂起（GYval/GYtype 存值、gyldpc=pc+1、gyld=1 令 calluser 体循环退出），出口处把演化后
的局部行/循环栈/pc 回写状态表。next()/gconv 的句柄分支恢复帧继续体循环；耗尽置
GHdead → fail('StopIteration')（与 CPython 的 try/except 对齐）。yield from 逐元素挂起。

**本轮修掉的四个坑**（全部实测）：
1. **共享暂存寄存器被 stash 过程族冲掉**：gconv/next 钩子用 `ghc` 存 gid，而
   ghstash/ghlstash 把 `ghc` 当行数计数器复用——恢复循环第二轮 `gcur=0` →
   `calluser('')` → `NameError: name ''`（8 例回归的根因）。修法：消费侧改用专用
   寄存器 ghg/ghf。
2. **双重转义**：P591 的 GYval 在 lesc 之后捕获，gconv 收集时再 lesc 一次 →
   容器值（元组）`yield 1,2` 变 `[(),()]`。修法：GYval 捕获移到 lesc 之前
   （捕获块接成 yield 分支 SUBSTACK 新头）。
3. **嵌套拉取的现场丢失**：生成器体内 `for v in <生成器>` 触发嵌套 gconv——
   内层钩子冲掉外层的 gsa/ghg 且 STOPTHIS 连外层拉取循环一起杀。修法：钩子改
   IFELSE（不再跌入旧体）+ GStk 压栈/恢复 gsa/ghg + STOPTHIS 加 `gmy==0` 守卫。
4. **恢复走 assign 而非 addTo**：MiniPy 的变量模型是"同名行复用 + FN 快照恢复"
   （bottom-up 首匹配）——ghrestore 用 addTo 追加的新行永远排在调用方同名行之后，
   lookup 首匹配命中调用方的行（d2/take3 都有 `gen`：resumed 帧读到 take3 的
   G#2，for 重拉自己 → 无限自递归 → RecursionError）。修法：ghrestore 改
   `assign %s %s %s`。

### P593 —— P592 钩子的寄存器与转义修正
见上 1/2。

### P594/P595 —— 嵌套与帧模型
见上 3/4。P594 的 gconv 钩子同时改为 IFELSE——句柄路径不再跌入旧体（旧体会把
拉取结果登记进 ItSrc 污染游标）。

### P596 —— 槽链反方向（P588 的反向）
aset 出口扫描 SAN/SHN/SKV/SKT：SKT=='A' 且 SHN 解析到同一实例且 SKV==nm →
assign(SAN, vv, vt)。dsyn 保存/恢复包裹（外层 pubSync 在途时不清标志，防成环）。
边界：反方向 assign 期间不触发其他槽配对（值来自宿主属性，权威）；abs(J) 类
强转路径未动。

### P597 —— gstream2：any/all 流式全量版
整替换 gstream 过程体（**保留原 proto/call 的 argumentids**——VM 的 call 原语按
define 的 ids 取实参，新建 proc 会导致实参全空，这是本轮最大的坑）。支持：
顶层 if 过滤（每层至多一个）、两层 for（src2 每轮外层迭代现求值，可引用外层
循环变量）、range 0/1/2 逗号（start,stop,step，物化成 L 统一迭代）。命中即停。
其余形态 gsok=0 落回急切路径，与 v4.214 一致。
细节坑：range 的顶层逗号在**括号内**（深度 1，不是 0）；列表字面量源的逗号也是
深度 1——逗号扫描必须只在 range 分支内做；过滤-only 结构的 gse1 要设 hi+1；
gsE2 的二层判定用 gsnm2 而非 llen(gsM)（过滤-only 的 gsM 也有条目）。

### P598 —— 大整数边界（P589 余项）
1. rightside 的 bigHook：`equals(op,'//')` 原位扩成 `OR(clone('//'), clone('/'))`
   （自顶向下 walk 在父槽位替换——在 equals 内嵌 OR 语义错，回指原块会让 webfix
   爆栈）。
2. bgops 的 `/` 分支（插在 mkSplit 之后）：ZeroDivision 检查 → operator_divide
   （强转数字）→ mkfloat → 异号结果补 '-'，evtype='N'。
3. **未完成**：tokenize 字面量 >15 位 → Kind 'J' 的改造引发了 atom/indexdel 链的
   `SyntaxError: unexpected token`（eval 对 Kind 'J' 的字面量没有直通道），本轮
   回退，留待对象堆批次。
4. **部分完成**：sum() 的数值守卫（callfn/callfnW 里 `NOT(OR(equals(v,'N'),…))`
   形态，共 6+ 处）加了 J 臂——守卫不再拒 J；但 sum 的**累加**走内联 operator_add
   （数字语义），J 元素经双精度舍入（+5 被吞）——留待 bgadd 直挂。min/max 的
   `'<' not supported between 'object' and 'int'` 未动。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| 字面量精度 | >15 位十进制字面量仍走双精度（tokenize→J 的改造牵动 atom/indexdel 链） | 对象堆/数值批次 |
| sum 累加精度 | 守卫已放宽，累加仍走数字语义；min/max 对 J 报 `<` not supported | bgadd 直挂 / 比较分流 |
| 单目负号对 J | `-(10**30)` → TypeError: numeric operand | 同上 |
| abs(J) | 守卫未放宽（Scratch abs 强转丢精度） | 同上 |
| 生成器边界 | 无界生成器被 for/list 消费仍会拉满（CPython 同样不终止，仅步数上限差异）；PairPile 配对不跨挂起 | 声明 |
| P588 反向边界 | 反方向 assign 期间不触发其他槽配对 | 测试未覆盖 |

## 五、工程记录

- 补丁顺序：`p591 p592 p596 p597 p598` 排在 `p590` 之后、`tail.txt` 前
  （assemble214.cjs 的加段副本，dup-check 沿用）。
- **踩坑八则**（全部本轮实测，下轮写补丁前先读，接 minipy-test-harness 铁律）：
  1. **VM 的 call 原语按 define 的 argumentids 取实参**：新建 proc + 手改旧 call 的
     proccode 会让实参全空（defaults）。要换过程体就用 attachBody 替换原 def 的
     body，不要新建 proc 再重接。
  2. **REPEATU 退出条件**再次连坑：ghrestore/gstream2 的循环条件方向写反即空转或
     死循环。
  3. **JSON.stringify 只见描述符不见子树文本**（铁律 4 变体）：字面量匹配必须
     `reach()` 整棵子树逐块 stringify，或直接读描述符 `[1,[10,x]]`。
  4. **parent 链构建期不可靠**（p591 自注 + 本轮 gconv/守卫两次踩）：找宿主一律
     substack-reach，不要 parent 上溯。
  5. **条件树原位替换要在父槽位做**：在 equals 的 operand 里嵌 OR 语义错；回指
     原块则 reach 成环（webfix 爆栈）。克隆两份新 equals + 父槽位替换。
  6. ** MiniPy 变量模型 = 同名行复用 + FN 快照恢复**（bottom-up 首匹配）：跨帧
     恢复变量用 assign，不要 addTo 追加新行。
  7. **共享暂存寄存器（ghc/gsa/ghg）在嵌套调用下必须压栈**，或者消费侧专用寄存器。
  8. **lesh 幂等仅对标量**：容器值在 lesc 前捕获、收集处只 lesc 一次，否则双重
     转义（元组变空）。
- 调试基建：`dbg215.mjs`（串行跑器，每例 dump 指定变量/列表）；`p593dbg.txt`
  插桩补丁（组装时手工加进 parts、构建后移除）。gstream2 的根因全部由埋点定位。
- 隔离复跑：`_iso215.json`（10 个生成器用例）；**注意 run_iso 的 cases.json 的
  code 必须是字符串**（数组会被 String() 逗号连接，对比无效——本轮早期被此坑误导）。
- 结果目录：`_v215final/`（主套件 164）、`_v215finalreg/`（回归 763）、
  `_big8*.out.json`（大整数专项）、`_new7add*.out.json`（流式专项）；
  过程性产物 `_t597*`、`_t7fix*`、`_base215*`、`_t215*`。
- 结构校验：`node check41.cjs MiniPy_v4.215.sb3` → 39,937 块，errors=0。

## 六、下一轮建议

1. **对象堆/数值批次**：字面量精度（tokenize→J）+ sum 累加 bgadd 直挂 + min/max
   比较分流 + 单目负号/abs 对 J——大整数全闭环。
2. **生成器收尾**：PairPile 配对跨挂起（生成器帧的别名在 yield 期间存活）；
   gstream2 的二层 range 源。
3. **P588 反向边界**：反方向 assign 触发其他槽配对。
