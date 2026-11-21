# MiniPy v4.217 更新说明

**构建**：`MiniPy_v4.217.sb3`（2026-11-07，40,699 块，check41 errors=0）
**依据**：`MiniPy_v4.216_更新说明.md` §六"下一轮建议"的两大类——**数值批次收尾**（§六.4）与
**P1-8 属性快照**（§六.1）。
本轮完成 **两大类 5 项**，新增补丁 **P610–P614**（5 个）。

## 一、结果总览

| 套件 | v4.216 | **v4.217** | 说明 |
|---|---|---|---|
| 主套件+探针（168 例） | 168 过 0 败 | **168 过 0 败** | 0 破坏 |
| `_cov*` 回归（681 例） | 681 过 0 败 | **681 过 0 败** | cov 全绿保持 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 覆盖报告 probe216a（31 例） | 29 过 2 败 | **29 过 2 败** | 余 B4（f-string 嵌套）、D7（无界 genexp）为声明项 |
| 覆盖报告 probe216b（49 例） | 47 过 2 败 | **48 过 1 败** | **K1（属性快照两写者）转绿**；余 E4（闭包计数器）为开放项 |
| 覆盖报告 iso216 系列（80 例） | 71 过 9 败 | **74 过 6 败** | **P1-8 族 3 例转绿**；余 6 例全部属于 P1-5/P1-6（闭包/帧容器身份）、P2-13（genexp 拉满） |
| 专项验证 `_verify217`（32 例） | — | **30 过 2 败** | 本轮五项修复的最小复现集；余 2 例为声明边界（见 §四） |

## 二、修掉的两大类

### 类一：数值批次收尾（§六.4）

| # | 症状 | 补丁 | 根因一句话 |
|---|---|---|---|
| 1 | **abs() 对大整数转浮点**（`abs(10**25)` → `1e+25`） | P610 | callfn/callfnW 的 abs 分支 `ev = abs(ev)` 走 Scratch abs 强转浮点。J 形态实参（evtype=='J' 或 N 型 15 位以上无 '.'/'e'/'n'，P600 同款判据）先存 p61a，absSet 与 `evtype='N'` 之后恢复：带 '-' 剥前缀（substr），evtype 置 'J'。只挂 callfn/callfnW——methodcall/eval 里的两处 abs 是 math.fabs（CPython 本就返回 float），不动 |
| 2 | **min/max/sorted 对大整数报 TypeError**（`min(10**25, 3)` → `'<' not supported`；`sorted([10**25, 3])` 同） | P611 | P138 起 min/max（callfn 单 iterable 与 minmax n-ary 两路）与 sorted 的比较统一走 lcmp，lcmp 只认 N/B 数值族。lcmp 根 IFELSE 整体包进 `IFELSE(bigCond, 大数比较, 原IFELSE)`：两侧均整型形态（N/J 且无 '.'）且至少一侧是大数（J 型或 N 型 len>15）时，符号先分、同号剥 '-' 后 bgcmp 比有效数字 → cmp。声明边界：J 与浮点混比（'2.5' 含 '.'）仍走原路 typeErr |
| 3 | **一元 ~ 对大整数转浮点**（`~(10**25)` → `-1e+25`） | P612 | P57 的 ~ 分支 `ev = 0-ev-1` 双精度。J 形态走「字符串取负（P609 同款 substr/前缀）→ bgops('-' neg '1')」，bgops 直接给精确 ev/evtype(J)。unary 尾部无条件 `evtype='N'` 会盖掉——过程入口复位 p61g、J 臂置 1、尾块后按 p61g 补回 'J' |
| 4a | **`r[0] += 10**25` → SyntaxError: expression** | P614(a) | P95 的下标/属性增强赋值把 rightside 结果**作为记号嵌回 Tok** 重跑赋值，重写守卫 RWTYPES=['N','S','L','T','D','B'] 不含 'J'——J 结果不重写，语句跌进表达式路径。两处 orChain(EVT, RWTYPES) 条件各 OR 上 EQ(evtype,'J')（嵌回的 Kind=J 记号由 P609 的 atom J 臂消化） |
| 4b | **`-99999999999999999999` → -1e+20**（字面量一元负号） | P614(b) | J 字面量经 atom 落成「Kind=J + evtype=N + 精确值串」（P609 的设计，算术靠 P600 值判据）——但 p609 的负号臂只认 evtype=='J'。条件扩成 AND(EQ(op,'-'), OR(EQ(evtype,'J'), 值判据)) |

### 类二：P1-8 属性快照反向重物化（§六.1）

| # | 症状 | 补丁 | 根因一句话 |
|---|---|---|---|
| 5 | **`x = b.v` 是快照**：`b.v.append(1); x.append(2)` → `[2] [2]`（CPython `[1,2] [1,2]`）；方法/函数帧内更糟（帧内 [7] 帧外 []） | P613 | P173 给 `x = b.v` 记 PthN 路径别名且 palwrite 正向写回 ✓，但 aset 写 IAttr 后没有反向重物化——x 基于陈旧快照 palwrite 覆盖回属性。新过程 presync(iid, nm)：扫 PthN 中基名解析为同一实例、访问器恰为 nm 的记录，从 IAttr 读现值 assign 回去。挂点**只选突变写回**（methodcall2 写回与 pathset '[' 递归前置 p8mut=1；pathset '.' 分支两个 aset 臂尾常驻 presync），直接重绑定（`b.v = [9]`，p8mut=0）走**解绑**分支——删除记录行（paldrop 同款，只删 PthN/PthB/PthS/PthK，访问器池 PtM/PtT/PtY 不挪），保住 v4.216 实测已正确的重绑定语义 |

连带转绿：iso216 `attr alias writers`、probe216b K1（属性快照两写者）。

## 三、补丁明细与踩坑

### P610 —— abs 大整数
callfn 与 callfnW 各有一个 absSet（callfn/callfnW 不共享 abs 块）。入口 `p61f=0; IF(J判据(ev)) 保存 p61a`；
出口在 `evtype='N'` 之后 `IF(p61f) 恢复`。P218 的 sflt 判据（dotIn(ev)）对 J 恒假 → mkfloat 不会
把结果转浮点 ✓。

### P611 —— lcmp 大数比较
**首版两处大坑**：(1) bigCond 同一子树用在 IF 条件与 NOT 守卫两处——**单亲违规**，webfix 只保一份
（判据静默失效）；改工厂函数各建一份。(2) AND 守卫方案本身不成立——J 时 numFam 本来就假，AND 无济
于事，ELSE 臂照样 typeErr；必须把整棵 root IFELSE 包进 `IFELSE(bigCond, bigCmp, 原IFELSE)`。
前驱只在 `inDef('lcmp')` reach 内找（predecessorOf 会踩死块簇的假前驱，P612 同款教训）。
**实测收益**：min/max/sorted 全部大整数精确；探针确认 cmp=-1 正确后包裹生效。

### P612 —— ~ 大整数
unary 的结构比预想深：顶层链只有 [eval, IFELSE(not)]，减号/波浪分支全嵌在 ELSE 臂里。P57 的 ~ IF
用 replaceStmt 替换时，predecessorOf 选中了**死块簇里的假前驱**（unary 链被死块簇指着——next-shared），
真链上的 ~ IF 只被掏空没被替换 → 手动在 reach 内找前驱重链。尾部 `evtype='N'` 是 tilde IF 的直接
后继（在 ELSE 臂内）， corrective 挂它之后。

### P613 —— 属性快照反向重物化（本轮最重）
调研确认四件事：
1. **根因**：palwrite 正向 ✓、aset 反向 ✗（`[2] [2]` 精确复现）。
2. **不能挂 aset 通用出口**：aset 同样服务重绑定，`b.v = [9]` 时 CPython 的 x 保持旧对象
   （v4.216 实测语义正确，先验证再动手）。
3. **重绑定走的是 execute 内联 IAttr 写**（P55 的两处直写站点，不经 pathset/aset）——补丁第 4 节
   在这两处的新建/替换两臂尾各挂 presync（iid/nm 克隆自 IAttrId/IAttrName add 块的 ITEM）。
4. **帧内同步必须 publish**：calluser 出口把 Names/Values/Types 整体重建回 FN/FV/FT 入口快照，
   不经 publish 的 assign 全部丢弃（P169 的 wscan 才是落账通道）——B2 实测帧内 [7]、帧外 []。

三个真坑（全部实测）：
- **访问器池错位**：Pth 体系是 PthN/PthB/PthS/PthK + 访问器池 PtM/PtT/PtY，记录 i 的模式/属性在
  `PtM[PthS[i]]`——直接读 `PtM[i]` 全错；解绑删池条目会挪动其他记录的 PthS 偏移 → palwrite 写错
  属性 → linked list 用例死循环。
- **扫描死循环**：记录匹配但基名解析不到该实例（帧退出后 PthB 名失效是常态）时既不删也不自增 →
  原地打转（bst 用例挂死）。
- **IF 助手没有第三参**：`IF(c, then, else)` 的 else 被静默丢弃——增量逻辑必须用 IFELSE。

### P614 —— 增强赋值 J 记号 + 字面量负号
P95 的重写守卫特征：条件 reach 同时含 EQ(evtype,'B')/EQ(evtype,'D') + SUBSTACK 有 Tok 重写 +
用到 aug* 寄存器（第三处同形条件属别的补丁，靠 aug 变量过滤）；变量原语是 [12,…] 描述符不是
data_variable 块。p609 负号臂条件重组：从 AND 里挖出 EQ(op,'-')，重组为 AND(op=='-', OR(evtype=='J', 值判据))。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| P1-5/P1-6 闭包/帧容器身份 | 闭包捕获的局部容器跨外层调用共享；局部名与调用方同名时复用容器（iso216 余 5 例） | 行模型批次；需"每次调用帧的容器身份独立"，牵动 Names/FN 快照/别名三套表 |
| P2-13 genexp 拉满 | genexp（含 next()）对无界生成器源拉满（iso216 余 1 例） | 需把 genexp 编译成真生成器（E3 机制已备），属编译层重写 |
| 通用比较对 J | `10**25 > 3` → TypeError: incompatible comparison（lcmp 只服务 min/max/sorted；运算符比较是另一条路径） | 大数批次 |
| J 与浮点混比 | `min(10**25, 2.5)` → TypeError（'2.5' 含 '.'，bigCond 不放行） | 大数批次 |
| probe216a 余项 | B4（f-string 嵌套）、D7（无界 genexp） | 声明 |
| probe216b 余项 | E4（闭包计数器）= P1-5 | 行模型批次 |
| 无界消费 | `for x in <无界生成器>` 与 CPython 同样不终止 | 声明 |
| 函数 repr | `<function f>` 无 0x 地址 | 声明 |
| inf 的负号/比较 | `-float('inf')` → 0；负 inf 与负数比较按字符串序 | P1-3 边界 |

## 五、工程记录

- 补丁：`p610 … p614` 加在 `p609` 之后、`tail.txt` 前（assemble217.cjs，由 assemble216.cjs 复制改 parts）。
- **踩坑八则**（全部本轮实测，下轮写补丁前先读，接 v4.216 踩坑十二则）：
  1. **predecessorOf/replaceStmt 会踩死块簇的假前驱**：一个 live 块可能被死块簇的 .next 指着，
     predecessorOf 按 Object.keys 序返回错的那个——replaceStmt 的重链落到死簇（P612 首版真链上的
     tilde IF 只被掏空没被替换）。凡"替换/前驱查找"一律在 `inDef(...)` reach 集内找前驱。
  2. **同一判据子树用两处 = 单亲违规**（老坑新犯）：webfix 只保一份，另一处判据静默失效
     （P611 首版 bigCond）——工厂函数每处各建一份。
  3. **AND 守卫救不了 ELSE 臂的 typeErr**：J 时 numFam 本来就假，AND(origCond, NOT(bigCond)) 与
     原条件同真假——必须包整棵 IFELSE（P611 二版）。
  4. **Pth 是"记录表 + 访问器池"**：记录 i 的访问器在 `PtM[PthS[i]]`，不是 `PtM[i]`；解绑只删
     PthN/PthB/PthS/PthK 四行，**池条目不能删**（删了挪偏移，palwrite 写错属性，linked list 死循环）。
  5. **扫描循环的每条路径都要前进**：匹配但实例不匹配（lookup miss，帧退出后 PthB 失效是常态）时
     既不删也不自增 = 原地打转（bst 挂死）。
  6. **`IF(c, then, else)` 的第三参被静默丢弃**：head 的 IF 只有 THEN 臂——else 用 IFELSE
     （P613 首版增量逻辑丢失，构建块数不变毫无报错）。
  7. **帧内 assign 必须跟 publish**：calluser 出口按 FN/FV/FT 入口快照重建调用者变量表，
     publish→wscan 才把新值落进快照（P169）——presync 的 assign 不 publish 则帧外全部回吐。
  8. **重绑定与突变的分流**：aset/pathset '.' 分支同时服务"属性重绑定"（x 应保持旧对象）与
     "方法/元素突变写回"（x 应跟随）——p8mut 标志只在突变包装（methodcall2 写回、pathset '['
     递归）内置 1；重绑定路径触发**解绑**（删 Pth 记录）而不是同步。
- 调试基建：`_probe_iso.mjs`（run_iso 变体，PROBE_VARS/PROBE_LISTS 环境变量 dump 任意变量/列表，
  本轮属性与 lcmp 调试的主力）；`_probe216.mjs` 在 40k 块项目上会卡死（原因未查，勿用）。
- 结果目录：`_v217main/`（168）、`_v217reg/`（681）、`_verify217.out.json`（32 例最小集）、
  `_probe216a/b.v217.json`、`_iso216*.v217.json`、`_gap131.v217.json`、
  `_probe61x/62x.json`（各专项复现）。
- 复现命令：

```bash
cd _work/v41
node assemble217.cjs
V41_OUT="../../MiniPy_v4.217.sb3" V41_STAMP="MiniPy v4.217 - built 2026-11-07" node build41.js
node check41.cjs ../../MiniPy_v4.217.sb3
node runall.mjs ../../MiniPy_v4.217.sb3 _v217main _new1_alias.txt … _new10_probe4.txt
node runall.mjs ../../MiniPy_v4.217.sb3 _v217reg _cov1.txt … _covheap.txt
node run_iso.mjs ../../MiniPy_v4.217.sb3 _gap131.json _gap131.v217.json g217
node run_iso.mjs ../../MiniPy_v4.217.sb3 _verify217.json _verify217.out.json v217
node run_iso.mjs ../../MiniPy_v4.217.sb3 _probe216a.json _probe216a.v217.json pa
node run_iso.mjs ../../MiniPy_v4.217.sb3 _probe216b.json _probe216b.v217.json pb
```

## 六、下一轮建议

1. **P1-5/P1-6 帧容器身份**（iso216 余 5 例 + probe216b E4）：v4.216 §六.2 的方向仍成立——
   calluser 入口为"本帧新建容器"打帧代次戳，alrec 的 fn-name 配对跨代次即解绑；本轮 P613 的
   presync 模式（记录表 + 常驻扫查 + publish 落账）可直接复用。
2. **P2-13 genexp 编译成真生成器**（E3 机制已备）：合成隐藏 def（FnKind='G'），genexp 求值返回
   G# 句柄；D7（无限源 take）随它转绿。
3. **通用比较运算符对 J**：`<`/`>`/`<=`/`>=` 的 eval 比较分支接 P611 同款 signed-bgcmp
   （bigCond 工厂可复用），修掉后 J 与浮点混比也可顺路收（J→浮点比较或浮点→J 提升需单独设计）。
4. **Pth 记录的帧清理**：帧退出时清理 PthB 指向帧内名字的记录（本轮 presync 靠 lookup miss +
   前进兜底，池条目随用例增长只增不减——长程序会缓慢膨胀）。
