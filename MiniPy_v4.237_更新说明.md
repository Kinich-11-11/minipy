# MiniPy v4.237 更新说明（v4.236 待修复清单 MP-01 ~ MP-06）

本轮按 `Downloads/MiniPy_v4.236_Repair_Backlog.md` 修复 P0/P1 前六项（MP-01 ~ MP-06），**MP-07 及以后按用户指示暂缓**。管线 `assemble237.cjs → build237.js`，产物 `MiniPy_v4.236.sb3` 之后的新版 `MiniPy_v4.237.sb3`（53,511 块，check41 errors=0）。新补丁 p743–p748，调试插桩 p743dbg/p745dbg/p746dbg/p747dbg/p748dbg/p749dbg（仅进 dbg 组装 `assemble237dbg.cjs`）。

## 验收战果

| 套件 | 结果 | 对比基线 |
|---|---|---|
| 清单 33 例功能套件（`_v237_bl.txt`） | **11/33**（基线 0/33） | MP-01 七例 + R1_mro + R2_L08 + R2_M01 + R2_L12 全绿 |
| 全量回归（39 套，`_reg237_all.sh`，P743+744 时点） | 与 v4.236 基线逐项持平（r232 584/593、ev 11/12、raw3 11/12、gap 78/82、873 套 872/873、check41 errors=0） | 零回归 |
| P747/748 后抽测（reg232 / gap131 / real3_hof） | 584/593、78/82、16/16 | 与基线一致，零回归 |
| 定向新测 | MRO 六场景 6/6、yield-from 六形态 6/6、strftime 2/2、time/datetime 套件 40/40、可迭代六形态 6/6、比较+属性链 3/3、星号参数边界 6/6 | 全绿 |

清单 33 例中余下 22 例失败 = MP-05（**见下：隔离运行即过，属外部套件顺序性污染**）+ MP-07~MP-11、MP-12~16（本轮未做）。

## 各项修复

### P743｜MP-01 标识符大小写（P0，7 例）
- **根因（P743DBG 插桩追踪）**：`lookup %s` 名字扫描环里，THEN 分支的 compareText 调用带着一条**陈旧 `.next`** 指向环尾的公共推进块（`if cmp≠0: found++`）——基座工程原生就违反铁律 20。大小写不同但 Scratch-EQ 相等的行（`a` vs `A`）进 THEN 分支后，推进块在分支内跑一遍、VM 又顺 `ife.next` 再跑一遍：**found 双重前进跳过目标行**，扫出界 → found=0 → NameError。全小写程序因精确命中时 cmp=0、推进为双重空转而从未暴露。
- **修复**：断开 compareText 的陈旧 `.next`（THEN 臂在 compareText 后结束，推进只经 `ife.next` 跑一遍）。赋值/重绑/删除都走同一 lookup，一并变大小写敏感。赋值侧（新行 'A' 独立建行）本就正确，读侧修复后全线打通。
- 回归：与基线逐项持平。

### P744｜MP-02 多重继承 MRO（P0，1 例）
- **根因**：P136 早已按 C3（ClsMro）+ 属主过滤（clsfn1 边界 + ClsFn1）做方法表拷贝，但 **P491/P725 在运行起点向 ClsName 登记了 31 个内置异常类行，ClsFn1/ClsAt1 却只按用户类追加**——clsfn1 按 ClsName 下标读 ClsFn1 越界返回空串，`GT(cpk,'')` 把空串当 0，属主过滤全放行 → D(B,C) 把 A 的行、C 的行（两遍）、B 的行全拷进 D，尾部搜索让 B 的继承拷贝（=A.f）获胜 → `"A"`。
- **修复**：运行起点 ClsFn1/ClsAt1 清空之后，按当时 ClsName 行数补齐等量的 0 边界行（动态循环，自适应内置类数量）。此后 `ClsName[i] ↔ ClsFn1[i]` 对齐，父类边界切掉继承行，逆 MRO 拷贝的最后一份 = C3 最优先者。
- 新测：菱形 4 场景 + 单父 + 子类覆盖 6/6（含 B、C 都定义时 B 胜，C3 正确）。

### P745｜MP-03 yield from（P0，1 例）
- **根因（P746DBG 插桩追踪）**：P591 逐元素委托机器里两处伤——
  1. 字符串/列表分派条件的**括号笔误**：`NOT(LT(lenOf(...)), ADD(...))` 把 ADD 写成了 NOT 的第二个实参被丢弃，sb3 里 `operator_lt` 缺 OPERAND2，Scratch 对 `(len, undefined)` 走字符串比较 `'2' < 'undefined'` 恒真 → NOT 后恒假 → **一切非生成器源都走列表路径**；
  2. 列表路径的耗尽判据把 **`callProc('listlen')` 内联进了条件表达式**（铁律 19：procedures_call 进表达式槽线程静默失效），两个臂都不跑、什么都不产出。
- **修复**：重建分派条件（补回边界比较）；listlen 提为语句、结果存新寄存器 `yfln` 供条件读。
- 新测：`yield from` 列表/字符串/生成器/混合序列/next() 6/6。

### P746｜MP-04 time.strftime 忽略传入日期（P0，1 例）
- **根因**：time 模块的 strftime 分支只 eval 第 1 参（格式串），**永远 zcnow() 取当前时间**，第二参数（struct_time）被无视。
- **修复**：有第二参时（macnt0>1）求值 ma2v，把 zcmkst 记录 `"Y,M,D,H,Mi,S,w,yday,isdst"` 按逗号切分（**环上限读独立源变量 zspS，不得读会被冲掉的累加器 zspv**——P136 splitInto 用 m3s 的同款教训）种入 zcY/zcM/zcD/zcH/zcMi/zcS，分支尾部原有 zc2days/zcW/zcfmt 幂等复用；无第二参时 zcnow() 原样。
- 回归：_real_time 20/20、_real_datetime 20/20；1 参形式不受影响。

### MP-05｜星号/双星号参数（P1，1 例）——**结论：非真实缺陷**
- R2:L02 在清单的合并运行中报 `unexpected keyword argument z`，但**在 v4.236 上隔离运行本就通过**（P105 星号机制完好）。成因是外部 267 例顺序跑批里的共享寄存器残留（macnt/参数窗口一族，铁律 7 的跨用例版）。
- 隔离验收：`f(1,2,3,z=4)=10` ✓ + 未知关键字/重复关键字/空 args/kwargs/默认值混用 6/6。本轮不改代码。

### P747｜MP-06 前置：增强赋值扫描误伤比较符（**通用缺陷**）
- **根因**：P732/P742 族的 isAug 判据（两字符且第二字符 '=' 且首字符 ∈ `+-*/%&|^@<>`）把 **`>=`、`<=` 误判为增强赋值符**。任何 `X.Y >= Z.W`（两侧都是属性链的比较，含方法体里的 `if self.i >= self.n:`）都会触发 eval(1, k-1) 把 `[if, self, ., i]` 当表达式求值 → `SyntaxError: expression`。873 套恰好没有这个形态，从未暴露；它同时炸断了 MP-06 全部自定义可迭代路径（`__next__` 里的 `self.i >= self.n`）。
- **修复**：两处字符集字面量 `+-*/%&|^@<>` → `+-*/%&|^@`（2 字符增强符只有 += -= *= /= %= &= |= ^= @=；3 字符规则 **= //= <<= >>= 本就正确）。描述符按原结构改（primitive 换 shadow `[10,…]`，块引用改 data_text 的 TEXT 字段），**构建期 parent 链不可靠，不能上溯验证**。
- 新测：`if p.q >= r.q:` 顶层/方法体/while 3/3。

### P748｜MP-06 sum 支持自定义可迭代（P1，1 例）
- sum 分支类型门只认 L/T/G。沿用 P548 的 tryIt 模式：门前后备 `IF(evtype=='O')` → 存 ev/evtype → objiter（`__iter__`/`__next__` 协议物化，StopIteration 清尾）→ 成功则实参就是编码列表、原门直通；失败还原按原样报错。callfn/callfnW 双克隆都挂（sum 的 fail 位点各 2 个、去重宿主门）。
- 已知边界：**仅 `__getitem__` 的可迭代对象别喂给 sum**（objiter 该路径会重写 Tok[1]，本钩子的 tokenize 恢复只保证单层场景；for/list 走 P548 不受影响）。
- 新测：sum(Count)/for/sum(gen)/sum(list)/sum(tuple)/list(Count) 6/6。

## 本轮新坑（接 v4.236 坑册续编）

34. **THEN 分支陈旧 `.next` 指向环尾公共块 = 双跑**（铁律 20 的基座存量形态）：症状只在"分支内结果影响公共块判据"时可见（cmp=0 与否），精确命中场景全被双重空转掩盖。排查手法：P743DBG 在环体头/尾各插 trace，按"每次 body 运行应恰好一对 ENT/IT"对账。
35. **clsfn1/ClsFn1 这类"按下标对表"的新表，必须跟 P491 的内置类登记同步补齐**——P491 当年只同步了 ClsMro；给 ClsName 加行的补丁要同时盘点全部平行表（ClsPar/ClsMro/ClsFn1/ClsAt1）。
36. **P591 的分派条件里 LT 缺操作数是括号笔误**：`NOT(LT(a), b)` —— b 落进 NOT 的第二个实参被静默丢弃；Scratch 对缺槽比较走 `(len,'undefined')` 字符串比较恒真。**构建器若能对 operator_lt/gt 缺 OPERAND2 报警，可当场抓住**（候选工具改进）。
37. **isAug 这类"文本判据"不能把比较符收进字符集**——`>=`/`<=`/`==` 一旦命中即把控制流行当表达式求值。审查 P732/P742 族扫描时先跑一条 `if x.y >= z.w:` 冒烟。
38. **struct_time 记录的逗号切分环：上限必须读独立源变量**，累加器在 flush 时清空会让环提前退出（P136 splitInto 的 m3s 是正确范式）。
39. **dbg 组装清单要跟着正式补丁走**：assemble237dbg.cjs 忘了带 p743~p746，导致一轮"插桩正常但行为对不上"的空转排查。
40. **构建期块 parent 链不可靠（webfix 之后才完整）**：补丁里沿 .parent 上溯定位宿主 IF 会中途断链，改用全工程唯一字面量直接匹配（P747 最终形态）。
41. **runall 多例共 VM 的顺序性污染会伪装成真实缺陷**（MP-05）：清单类报告的失败先隔离重跑再定性，套件顺序也要记录。

## 调试基建（本轮新增，_work/v41/）

- `_dump_proc237.cjs <sb3> <过程名片段> [目标序号]`：完整过程体 dump（表达式树内联展开、THEN/ELSE 标注）——本轮主力工具。
- `probe237.mjs` / `callproc237.mjs`：跑小段代码后 dump Names/Values/Types 与关键寄存器；后者直接合成 procedures_call 调 `lookup %s`（注意 scratch-vm 运行时块表在 `interp.blocks._blocks`，注入块会触发 BlockCached 崩溃，仅适合只读观测）。
- p743dbg（lookup）/ p745dbg（MRO）/ p746dbg（yield from）/ p747dbg（strftime）/ p748dbg（forloop objiter）/ p749dbg（eval 兜底 + execute 入口 + callmeth 入口）。

## 已知限制 / 遗留

- **MP-07（with）、MP-08（对象列表 sort key）、MP-09（嵌套推导式作用域）、MP-10（del 深层下标）、MP-11（综合销售程序）、MP-12~16（complex/math 扩充/json）、MP-17/18（性能）按用户指示暂缓**，清单与复现代码保留在 `Downloads/MiniPy_v4.236_Repair_Backlog.md` 与 `_work/v41/_v237_bl.txt`、`_v237_perf.txt`。
- perf 基线（v4.236）：Tloop10000 超时；Tdict150 **已能在 20s 内完成**、Tdict500 超时。
- MP-05 的顺序性污染未修复（本轮未定位到具体残留寄存器；隔离运行全过）。
- sum 的 `__getitem__`-only 可迭代不支持（见 P748 已知边界）。
- P747 只修了 2 处字符集（P732 深层增强 + 一处门控扫描）；若后续新增同款扫描，注意字符集不要再收 `<>`。
- 第二处字符集块（P742 族门控扫描）的宿主上下文未逐一核对语义，仅按"同一 isAug 语义"处理；回归全绿背书。

## 复现命令

```bash
node _work/v41/assemble237.cjs
V41_OUT="C:/Personal/个人/编程/scratch/ai/minipython/MiniPy_v4.237.sb3" V41_STAMP="MiniPy v4.237" node _work/v41/build237.js
node _work/v41/runall.mjs MiniPy_v4.237.sb3 _work/v41/out237final _work/v41/_v237_bl.txt
bash _work/v41/_reg237_all.sh        # 全量回归（注意脚本里 S=MiniPy_v4.237.sb3 为 P743+744 时点产物，重跑前先重建）
node _work/v41/check41.cjs MiniPy_v4.237.sb3
```

| 文件 | 说明 |
|---|---|
| `MiniPy_v4.237.sb3` | 本轮产物（P743–P748，53,511 块） |
| `_work/v41/_v237_bl.txt` | 清单 33 例功能套件（含 R1_mro） |
| `_work/v41/_v237_perf.txt` | 3 例性能用例 |
| `_work/v41/out237final/` | 终态对比 JSON |
| `_work/v41/p743~748.txt` | 本轮正式补丁 |
