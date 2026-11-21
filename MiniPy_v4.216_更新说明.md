# MiniPy v4.216 更新说明

**构建**：`MiniPy_v4.216.sb3`（2026-11-07，40,496 块，check41 errors=0）
**依据**：`MiniPy_v4.215_覆盖测试报告.md` §三"确认的问题"（13 项）+ §五"建议修复顺序"。
本轮完成清单项 **11 项**，新增补丁 **P599–P609**（11 个）。

## 一、结果总览

| 套件 | v4.215 | **v4.216** | 说明 |
|---|---|---|---|
| 主套件+探针（164 例） | 164 过 0 败 | **164 过 0 败** | 0 破坏 |
| `_cov*` 回归（681 例） | 674 过 7 败※ | **681 过 0 败** | **历史首次 cov 全绿**（浅拷贝共享内层 7 例曾短暂回归，P608 重构后转绿） |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 覆盖报告 probe216a（31 例） | 25 过 6 败 | **29 过 2 败** | A3/A4/A5/A6/B5/B6/B8/C3/D1–D6 十一例转绿；余 B4（f-string 嵌套）、D7（无界 genexp）为声明项 |
| 覆盖报告 probe216b（49 例） | 42 过 7 败 | **47 过 2 败** | 大整数族/下标增强/attr 别名基础转绿；余 E4（闭包计数器）、K1（属性快照两写者）为开放项 |
| 覆盖报告 iso216 系列（80 例） | 44 过 36 败 | **71 过 9 败** | 余 9 例全部属于 P1-5/P1-6（闭包/帧容器身份）、P1-8（属性快照）、P2-13（genexp 拉满）四个开放项 |
| 专项验证 `_verify216`（15 例） | — | **15 过 0 败** | 本轮十一个修复的最小复现集，逐项转绿 |

※ v4.215 的 cov 7 败为浅拷贝语义缺口（见 P608）。

## 二、修掉的 11 项

| # | 清单项 | 补丁 | 根因一句话 |
|---|---|---|---|
| 1 | **P0-2 大整数加法 2^53+ 全错**（`2**53 + 2**53` → 19115399519591984） | P599 | bgadd 的进位 `bgc2` 只置 1 从不复位——粘性进位；`if bgt>9` 改 IFELSE 补 `bgc2=0`。10^k+10^k 全程无进位所以"看起来对" |
| 2 | **P0-2 连带：fact/链式 N-N 长整数退化浮点**（22! 起 `r *= i` 变 1.124e+21） | P600 | bgops 钩子只在有 J 操作数时接管；纯 N 的 15 位以上整数走双精度，≥1e21 时 JS toString 转科学计数法。rightside 大钩子条件的 J 臂扩成 OR(J 臂, 两侧无 '.'/'e'/'n' 且任一长度>15) |
| 3 | **P0-2 连带：sum() 大整数累加**（sum([2\*\*60, 2\*\*60, 5]) 丢精度；J 元素直接 TypeError） | P601 | 元素守卫放行 J；J 元素改走 bgops('+') 精确累加；收尾 sj==1 时 ev=lsum、evtype 按 sflt 给 J/N。**callfn 与 callfnW 共享同一条累加循环链**（两个 repeat_until 包装指向同一 substack 头），只补一次 |
| 4 | **P1-4 pow(a,b,m) 大指数错误**（pow(3,100,7)=3）+ 2 参 pow(3,100) 浮点 + `**` 4096 上限 | P603 | powval 是浮点。三参整数情形改走 bgpow（平方-乘，log2 复杂度）+ bgops('%')；2 参同理；`**` 分支的 bgpow 4096 上限提到 2^53 |
| 5 | **P0-1 浮点字面量指数截断**（1.5e300→1500.0、2.5e10→25.0、1.25e-10→0.125） | P602 | tokenize 后处理剥带 '.' 记号的尾部 '0'——`2.5e10` 被剥成 `2.5e1`。剥尾条件加 NOT(contains 'e') AND NOT(contains 'E') |
| 6 | **P1-3 NaN 比较语义**（nan==nan→True、nan>1→True）+ inf/nan 算术全为 0 | P605 | 通用比较分支 nan 命中时 cmp=2、nanhit=1，终值条件 AND(非 nan 或 op=='!=')——六种比较恰好全 False、!=True。新过程 fltop：N-N 算术任一侧为 inf/-inf/nan 时按 CPython 语义给结果（nan 传染、inf±inf、inf\*0=nan、inf/x、x/inf、x%inf=x、inf%x=nan） |
| 7 | **P1-9 下标增强赋值 RHS 含内建调用静默失效**（`r[1] += int('3')` 不变） | P604 | callfn/callfnW 完成内建时置全局 `pending=1`，标准下标赋值分支要求 pending=="0" → indexset 被跳过。两处下标增强分支在 eval 目标前保存 pending、rightside 返回后恢复 |
| 8 | **P1-7 切片副本被纳入别名传播**（`b=a; c=a[:]; b.append(3)` → c=[1,2,3]） | P608 | cpyrec 让副本对进入 AliasN/AliasT，assign 的容器传播沿别名对整值复制。传播前内联查 CpyN/CpyT（icv）：是拷贝对且**传播起点不是这对端点**（经第三别名传递到达）时跳过——保留浅拷贝内层共享语义（b[0].append 同步源）与"写经副本 cpybreak 解绑"语义 |
| 9 | **P2-11 `__name__` / `__class__`** | P606 | eval 五处 AttributeError fail 点换 IFELSE dunder 特判：类→clsiid/iid、实例→`<class 'InstCls[iid]'>`、其他→`<class 'p6msg'>`（tname 已备好）；F 型（函数值=函数表索引）→ `__name__ = FnName[value]`、`#lambda*` 归一 `<lambda>`。链式 `x.__class__.__name__` 由 eval 顶部 `__name__` 特例消费 S 型 `<class …>` 自然贯通 |
| 10 | **P2-12 input() 零参 SyntaxError / 带参卡 Waiting** | P607 | 弃用 askandwait（其 promise 在 warp 线程 resolve 后线程不恢复）。新协议：stdin 变量轮询（wait 0 让出线程）——带参分支 pmbuf += 提示串（print 会前置 pmbuf → `n? 42` 对齐）；零参在 callfnW 顶部特判。run_iso 配套：Waiting 时 setG('stdin', answer)，sv 扫 Interpreter 变量 |
| 11 | **P1-10 两个症状：16 位以上字面量 SyntaxError + 单目负号对 J**（`-a+1` TypeError） | P609 | (a) P598 把 >15 位字面量标了 Kind=J 但 atom 不认：N 分支条件扩成 N or J、末尾 kind 兜底校验放行 J——`print(99999999999999999999)` 直出精确值；(b) 一元负号（unary proc）守卫放行 J，op=='-' 时 J 走字符串取负（'-' 前缀剥离/添加） |

A5（大整数除法与比较，覆盖报告 was-fail）随 #1/#11 转绿；A4（大整数阶乘）随 #2 转绿。

## 三、补丁明细与踩坑

### P599 —— bgadd 进位复位
`bgadd` 的 `if bgt>9` 只有置位没有复位。改 IFELSE（then 臂复用原两块、else 臂 `bgc2=0`）。
模拟器先行：粘性进位精确复现 `19115399519591984` 与 `13535311311557559913993517511752`。

### P600 —— bgops 钩子 N-N 守卫扩展
在 rightside 大钩子的巨型 AND 里定位 `OR(equals(lt2,'J'), equals(evtype,'J'))` 臂，
父槽位原位换 `OR(原臂, 新NN臂)`。NN 臂：两侧 `NOT contains '.'/'e'/'n'` 且任一侧
`len>15`（'n' 排除 inf/nan/Infinity 字符串形态；'e' 排除科学计数法）。J 路径的
`'.' in` 反守卫保持不变。

### P601 —— sum() 大整数
**关键发现：callfn 与 callfnW 的 sum 累加循环是共享块**（两个 repeat_until 包装指向
同一 substack 头，reach 交集 30 块）。补丁只改造共享链一次，两个包装各自插入
入口重置（sj/lsum 清零）与出口收尾（sj==1 → ev=lsum、evtype 按 sflt 给 J/N）。
循环体改 IFELSE：THEN=bgops('+') 精确累加，ELSE=原生 dotIf/Kahan/sall 链整体；
**lpi 自增必须留在 IFELSE 外**（THEN 臂不增 lpi → 死循环），**ELSE 臂末块必须断开
旧 .next**（否则 VM 顺旧链双跑 lpi → 跳元素）。J 判据与 P600 同款（J 型 / 无点无
e n 且 len>15 / sj 已置）。

### P603 —— pow 整数路径
eval 三参 pow 分支（pwv1/pwv2/pwm）与 builtin2b/callfn 的两参分支（a1v/ev，共两处）
插整数快路：无 '.' 且指数 ≥0 → bgpow + bgops('%')，结果 ≤15 位回落 N。
`**` 分支的 `gt(ev, 4096)` 上限字面量改 2^53（bgpow 是 log2 复杂度，旧上限无意义）。

### P605 —— NaN/inf
比较：cmp=0 之后插 nanhit 清零 + nan 命中置 cmp=2；终值大 IF 条件 AND 上
`OR(NOT(nanhit==1), op=='!=')`。**nanhit 是全局，必须每次比较复位**——否则一个
nan 用例污染其后所有用例的 `==`（本轮 probe216a 曾因此 16 例回归）。
算术：bigHook 之后插 fltop 守卫（op ∈ +-*/ //% 且两侧 N 且任一侧 inf/nan 形态），
fltop 按符号位表驱动；单目负号对 inf（0-0=0）与负 inf 大小比较为声明边界。

### P604 —— pending 保存恢复
execute 的两处下标增强 `eval("1", auglsp)`（首参字面量 [1,[4,"1"]]、次参内联变量
[3,[12,"auglsp",..]]）：目标 eval 前 `pnd=pending`，rightside 返回后 `pending=pnd`。
**max/min（minmax 路径）、用户函数、纯算术不置 pending**，所以只有 int/len/abs/
round/pow 这批走 callfn/callfnW 的内建触发。

### P608 —— 切片副本别名
assign 的传播循环体 [append ali, append aln, 递归 assign, set aln, del, set ali, del]
包进 `IF(NOT(icv), …)`，icv 由内联 REPEATU 查 CpyN/CpyT 双向得出；守卫放宽为
`OR(NOT(icv==1), cpyo∈{vn, alT})`——cpyo 在 assign 入口（ald==0）记录传播起点，
使"写经副本自身/其直接对端"仍传播（浅拷贝内层共享），"经第三别名传递到达副本"被剪断。

### P609 —— 字面量 J + 一元负号
atom 的 N 分支条件与末尾 kind 兜底校验各加 J 臂；unary proc 的守卫追加
`and NOT(evtype=='J')`，`op=='-'` 分支改 IFELSE：J 走字符串取负（'-' 剥离/添加），
N/B 原样；**ELSE 臂也必须带 `op=='-'` 守卫**（否则 '+'/'~' 也被取负——`~~5`、
`+-5` 曾因此回归）。lambda 的 FnName 项带 `#` 前缀，归一 `<lambda>`。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| P1-5/P1-6 闭包/帧容器身份 | 闭包捕获的局部容器跨外层调用共享（counter 1 2 3 4）；局部名与调用方同名时复用容器（同名行复用模型的可观测缺陷） | 行模型批次；需"每次调用帧的容器身份独立"，牵动 Names/FN 快照/别名三套表 |
| P1-8 属性快照 | `x = b.v` 后两个写者互吞（单写者同步 P596 正常） | 缺"IAttr 变更后按 Pth 反向重物化"钩子，挂点在方法调用写回处 |
| P2-13 genexp 拉满 | genexp（含 next()）对无界生成器源拉满——创建即 complist 全量物化 | 需把 genexp 编译成真生成器（E3 机制已备），属编译层重写 |
| 无界消费 | `for x in <无界生成器>` 与 CPython 同样不终止（仅步数上限差异） | 声明 |
| abs(J)/min/max 对 J | Scratch abs 强转丢精度；min/max 对 J 报 `<` not supported | 数值批次 |
| ~ 对 J | 按位非未走大数（`~(10**25)` 仍双精度） | 数值批次 |
| 函数 repr | `<function f>` 无 0x 地址（与 CPython repr 差异，地址已归一化比较） | 声明 |
| inf 的负号/比较 | `-float('inf')` → 0；负 inf 与负数比较按字符串序 | P1-3 边界 |

## 五、工程记录

- 补丁：`p599 … p609` 加在 `p598` 之后、`tail.txt` 前（assemble216.cjs，
  由 assemble214.cjs 复制改 parts）。
- **踩坑十二则**（全部本轮实测，下轮写补丁前先读，接 minipy-test-harness 铁律）：
  1. **procedures_call 不能进表达式槽**（iscpy 首版放进 operator_not → 线程静默
     出错 → assign 传播全灭、8 例回归）。过程只能在语句位调用，值经全局变量带回；
     条件里要"查表"就内联 REPEATU 语句。
  2. **IF/IFELSE 只串 substack，不串顶层 next**：新建语句数组必须 `chain(ids)`
     手工串链（p608 首版漏了 → 循环体只剩一块）。
  3. **ELSE 臂末块必须断开旧 .next**：把原链挂进 substack 后旧指针还指着链外
     块，VM 顺 .next 双跑（p601 的 lpi 双增 → 跳元素；s6=4）。
  4. **THEN 臂接管循环体时，循环计数自增留在 IFELSE 外**（p601 首版死循环）。
  5. **JSON.stringify(条件根) 只见 id 不见子树**（老坑新犯三次）：子树匹配一律
     `reach()` 或按根 opcode 判别后逐 operand reach。
  6. **Set 迭代序不定**：find/candidates 的"第一个"不可作分类依据——p606 的
     atnm 组 c/d/e 必须按语句序（ordered walk + pos sort）稳定排序。
  7. **最内层 if 才是守卫宿主**：fail 的 reach 祖先链可能套多层 if，取
     "SUBSTACK 顶层链直接包含 fail"的那层（p609 的 utIf/unary guard）。
  8. **callfn 与 callfnW 的对应分支共享块**（sum 累加循环两个包装指向同一链）：
     改造共享链一次即可，两个包装各自插入口重置/出口收尾；幂等判据用
     "tailSet 前驱是否已是控制变量 IF"。
  9. **全局标志变量必须每次使用点复位**（p605 nanhit 首版不复位 → 一个 nan
     用例污染其后全部用例的 `==`，probe216a 16 例假回归）。
  10. **REPEATU 极性**：repeat-until 是"直到条件为真"，轮询"等待 stdin 非空"
      要写 `NOT(EQ(stdin,''))`（p607 首版写反 → 立即空读）。
  11. **sensing askandwait 的 promise 在 warp 线程 resolve 后线程不恢复**：
      input 类阻塞一律改"状态变量 + 轮询"协议（stdin 变量），harness 在
      status==Waiting 时直接写变量。
  12. **一元负号分支改造要同时保住两道守卫**：外层 IFELSE 的 J 判据 AND
      `op=='-'`，ELSE 臂再套一层 `op=='-'` if——'+'/'~' 两次跌进取负臂
      （`~~5`、`+-5` 假回归）。
- 调试基建：`_probe216.mjs`（run_iso 变体，支持 dump Interpreter+Stage 的任意
  变量/列表）；`_dump.cjs`（按 id 文本化块子树）；`_bal.cjs`/`_finderr.cjs`
  （补丁括号平衡/语法错误定位）；`_showfails.cjs`（结果目录失败汇总）。
- 结果目录：`_v216main/`（164）、`_v216reg/`（681+82）、`_verify216.out.json`
  （11 项修复最小集）、`_probe216a/b.v216.json`、`_iso216*.v216.json`、
  `_psum*.json`（sum 专项 7 例）、`_plit*.json`（字面量/一元专项 4 例）。
- 复现命令：

```bash
cd _work/v41
node assemble216.cjs
V41_OUT="../../MiniPy_v4.216.sb3" V41_STAMP="MiniPy v4.216 - built 2026-11-07" node build41.js
node check41.cjs ../../MiniPy_v4.216.sb3
node runall.mjs ../../MiniPy_v4.216.sb3 _v216main _new1_alias.txt … _new10_probe4.txt
node runall.mjs ../../MiniPy_v4.216.sb3 _v216reg _cov1.txt … _covheap.txt
node run_iso.mjs ../../MiniPy_v4.216.sb3 _gap131.json _gap131.v216.json g216
node run_iso.mjs ../../MiniPy_v4.216.sb3 _verify216.json _verify216.out.json v216
node run_iso.mjs ../../MiniPy_v4.216.sb3 _probe216a.json _probe216a.v216.json pa
node run_iso.mjs ../../MiniPy_v4.216.sb3 _probe216b.json _probe216b.v216.json pb
```

## 六、下一轮建议

1. **P1-8 属性快照**：在方法调用写回点（methodcall2 尾部或 IAttrVal 更新处）加
   "按 PthN/PthB/PthS 反向重物化"钩子——p608 的 cpyo 模式（传播起点判定）可复用。
2. **P1-5/P1-6 帧容器身份**：调研方向——calluser 入口为"本帧新建容器"打
   帧代次戳，alrec 的 fn-name 配对（rrK==1/3）跨代次即解绑；全局返回值
   （`return G`）不戳代次以保留共享语义。
3. **P2-13 genexp 编译**：把 `(expr for x in src)` 编译成 E3 真生成器
   （P591 机制已备）：合成隐藏 def（FnKind='G'），genexp 求值改为返回 G# 句柄。
4. **数值批次收尾**：abs(J)（J 字符串去 '-' 即可，勿走 Scratch abs）、min/max
   对 J（比较分流到 bgcmp）、`~` 对 J（取负再减 1，复用 p609 字符串取负）。
5. **sum 与 min/max 的浮点混合**：大数与浮点混用的声明边界可在 bgops 结果
   阶段统一 mkfloat 收敛。
