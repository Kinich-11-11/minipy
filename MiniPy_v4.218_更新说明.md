# MiniPy v4.218 更新说明

**构建**：`MiniPy_v4.218.sb3`（2026-11-07，41,091 块，check41 errors=0）
**依据**：`MiniPy_v4.217_更新说明.md` §六"下一轮建议"——**比较语义批次**（§六.3 通用比较对 J
+ P1-3 边界收尾 + J 与浮点混比）与**套件自愈/声明边界校准**（P2-13 诊断深化）。
本轮完成 **两大类 4 项**，新增补丁 **P702/P703**（P611 扩展），修正测试用例 1 个。

## 一、结果总览

| 套件 | v4.217 | **v4.218** | 说明 |
|---|---|---|---|
| 主套件+探针（168 例） | 168 过 0 败 | **168 过 0 败** | 0 破坏 |
| `_cov*` 回归（681 例） | 681 过 0 败 | **681 过 0 败** | cov 全绿保持 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 覆盖报告 probe216a（31 例） | 29 过 2 败 | **30 过 1 败** | **B4 转绿**（用例自愈，原判"不算缺陷"）；余 D7（无界 genexp）为声明项 |
| 覆盖报告 probe216b（49 例） | 48 过 1 败 | **48 过 1 败** | 余 E4（闭包计数器）为开放项 |
| 专项验证 `_verify218`（12 例） | — | **12 过 0 败** | 本轮比较语义修复的最小复现集（J 六种比较/链式/inf/nan/-inf/混合浮点/min-max 混合） |
| 专项验证 `_verify217`（32 例） | 30 过 2 败 | **32 过 0 败** | **v4.217 的 2 项声明边界（J 浮点混比、通用比较对 J）随本轮转绿** |

## 二、修掉的两大类

### 类一：比较语义批次（§六.3 + P1-3 边界）

| # | 症状 | 补丁 | 根因一句话 |
|---|---|---|---|
| 1 | **通用比较运算符对大整数**：`10**25 > 3` → TypeError: incompatible comparison；`a == a`（J-J）靠 cmp=0 侥幸、`a != 3` 报错 | P702 | 两值比较统一走 rightside 的比较分派器（嵌在顶层 `IF(error=='')` 门控臂里），只认 N-N 数值/S-S compareText/同型容器，J 侧落类型不等 fail。门控臂**头部**插早退分支：op ∈ 比较六种且 OR(bigCond, infCond, mixedCond) 时走 signed-bgcmp（符号先分、同号剥 '-' 后 bgcmp → cmp ∈ {-1,0,1}，按 op 形状成 B）后 STOPTHIS（P29 pctfmt 同款早退模式）；判据不命中原样走原分派器。链式比较（P168 chain）逐段调 rightside 自然贯通 |
| 2 | **inf 比较按字符串序**：`-inf < -5` → False；**`-float('inf')` → 0** | P702/P703 | 'inf' 串落 N-N 数字比较（Scratch 强转 0/字符串序）。早退分支加 infCond 臂：两侧 N 且任一恰为 'inf'/'-inf' → -inf < 有限 < inf 全序；'nan' 不在此臂（原分派器 P605 的 nan 命中分支继续负责：全 False 除 !=）。P703：unary 的 N 路径 `ev = 0-ev` 对 'inf' 串强转 0——op=='-' 臂体首包 IFELSE(inf 形态)：'inf'→'-inf'、'-inf'→'inf'（nan 不动，-nan=nan） |
| 3 | **J 与浮点混比**：`min(10**25, 2.5)`、`a > 2.5` → TypeError | P702/P611 | 比较双方一侧大数、另一侧含 '.' 时 bgcmp 不适用。rightside 早退分支与 lcmp（min/max/sorted 路径）各加 mixedCond 臂：恰有一侧含 '.' 且至少一侧大数 → 双精度近似比较（J 串经 Scratch '+' 强转浮点）。声明边界：超出 2^53 的精度差比较不准 |

### 类二：套件自愈与声明边界校准

| # | 内容 | 说明 |
|---|---|---|
| 4 | **probe216a B4 用例自愈**（P705） | `f'{d[k]}!'` 里 `d[k]`=d['val'] 在 **CPython 同样 KeyError**——v4.215 报告原判"本测试用例自身写错，不算缺陷"。用例改为 `f'{d["k"]}!'`（单双引号嵌套，两端一致），套件恢复 31 例有效覆盖；MiniPy 输出与 CPython 逐字节一致 |
| 5 | **P2-13（genexp 惰性）诊断深化，维持声明** | 本轮深入调研后确认：genexp 源为 G# 句柄时的惰性拉取**必须合成 def**——MiniPy 的语句执行以 pending/STOPTHIS 为完成单位（P592 的 next() 钩子拉完即 STOPTHIS），帧外的"逐元素变换"（元素表达式求值）无法在源拉取与消费之间存活；gsE2 式的记号级求值只在创建行存活（g=(...) 消费在别的行/帧）。合成隐藏 def（FnKind='G'）需要 prepare 之外的行注册机制，属编译层重写，单独立轮 |

## 三、补丁明细与踩坑

### P702 —— rightside 早退分支（比较六种 × 大数/inf/浮点混合）
结构调研（本轮关键前置）：两值比较统一走 rightside（P168 链式、min/max 之外的 `< > <= >= == !=`）；
分派器嵌在顶层 `IF(error=='')` 门控臂里（特征：臂 reach 含 set evtsave）；早退插**臂头**——
此处右操作数已 eval 完（语句 2）、error==''。body：`nanhit=0 → IFELSE(bigCond, bigArm,
IFELSE(mixedCond, mixedArm, infArm)) → STOPTHIS`。判据/形状全部工厂构建。

### P703 —— 一元负号对 inf
unary 的 N 减号路径（p609 IFELSE ELSE 臂里带 set unv 的 IF）体首包 IFELSE(inf 形态)。

### P611 扩展 —— lcmp 混合臂
v4.217 的包裹结构 `IFELSE(bigCond, bigCmp, [rootIf])` 扩成
`IFELSE(bigCond, bigCmp, [IFELSE(mixedCond, mixedCmp, [rootIf])])`——min/max/sorted 的
大数 vs 浮点混比随之转绿（`min(10**25, 2.5)` → 2.5）。

**踩坑六则**（全部本轮实测，下轮写补丁前先读，接 v4.217 踩坑八则）：
1. **助手元数违反全部静默**：`AND(a,b,c)` 三参静默丢 c（mkInfCond 首版 infCond 恒真 → 所有
   N-N 比较误入 inf 臂）；`IF(c, then, else)` 无第三参（v4.217 已踩，本轮 `IF(c,t,e)` 又犯一次）。
   判据三层嵌套一律显式 `AND(a, AND(b, c))`。
2. **IFELSE 臂必须是数组**：裸块 id 会被 B.chain 逐字符迭代；**已层数组的臂不能再包 `[...]`**
   （`[infArm]` → chain 返回内层数组当 firstId → sub 崩）。判别口诀：臂=数组，块=id。
3. **输入描述符三层形态**（`[3,[12,name,id],shadow]` / `[1,[10,lit]]` / 块引用 id）——谓词一律
   `prim(d)` 解包后再判类型；字面量匹配对块引用要子树 reach 后 stringify（P612 同款）。
4. **predecessorOf 死块簇假前驱**（v4.217 坑 1 复发于 p611）：替换/前驱查找一律 reach 集内找。
5. **rightside 比较分派器的定位特征**：顶层 `IF(EQ(error,''))` 门控 + 臂 reach 含 `set evtsave`；
   早退插臂头而非门控前——门控前右操作数还没 eval。
6. **调试基建**：`_probe_iso.mjs`（run_iso 变体，PROBE_VARS/PROBE_LISTS 环境变量 dump 变量/列表）
   是块级手术的首选探针；`_probe216.mjs` 在 40k 块项目上卡死勿用。可疑时先查"助手元数/臂形态/
   描述符层级"三件套，再看运行时变量。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| P1-5/P1-6 闭包/帧容器身份 | 闭包捕获的局部容器跨外层调用共享；局部名与调用方同名时复用容器（iso216 余 5 例 + probe216b E4） | 行模型批次；P613 的 presync 模式（记录表+常驻扫查+publish 落账）可复用 |
| P2-13 genexp 拉满 | genexp（含 next()/list()）对无界生成器源拉满（iso216 余 1 例 + probe216a D7） | **本轮确认必须合成 def**（pending/STOPTHIS 架构使帧外元素变换不可能），编译层重写单独立轮 |
| J 与浮点比较精度 | mixed 臂按双精度近似：超出 2^53 的精度差比较不准（如 `10**25 == 10**25 + 1.0`） | 声明（Python 的 int/float 比较是精确语义，需 J↔float 精确提升，成本高） |
| 函数 repr | `<function f>` 无 0x 地址 | 声明 |
| 无界消费 | `for x in <无界生成器>` 与 CPython 同样不终止 | 声明 |

## 五、工程记录

- 补丁：`p702/p703` 加在 `p614` 之后、`tail.txt` 前（assemble218.cjs，由 assemble217.cjs 复制改
  parts）；p611 原地扩展（lcmp 混合臂）。测试集修正：`_probe216a.json` B4 用例（P705）。
- 专项验证：`_verify218.json`（12 例：J 六种比较/链式/inf 全序/nan/-inf/浮点混合/min-max 混合）
  + `_verify218b2.json`（3 例混合）全绿；`_verify217.v218.out.json` 32 例全绿（v4.217 的 2 项
  声明边界转绿）。
- 结果目录：`_v218main/`（168）、`_v218reg/`（681）、`_probe216a/b.v218.json`、
  `_iso216*.v218.json`、`_gap131.v218.json`、`_verify218*.out.json`、`_probe70*.json`（各专项复现）。
- 复现命令：

```bash
cd _work/v41
node assemble218.cjs
V41_OUT="../../MiniPy_v4.218.sb3" V41_STAMP="MiniPy v4.218 - built 2026-11-07" node build41.js
node check41.cjs ../../MiniPy_v4.218.sb3
node runall.mjs ../../MiniPy_v4.218.sb3 _v218main _new1_alias.txt … _new10_probe4.txt
node runall.mjs ../../MiniPy_v4.218.sb3 _v218reg _cov1.txt … _covheap.txt
node run_iso.mjs ../../MiniPy_v4.218.sb3 _gap131.json _gap131.v218.json g218
node run_iso.mjs ../../MiniPy_v4.218.sb3 _verify218.json _verify218.final.out.json v218
node run_iso.mjs ../../MiniPy_v4.218.sb3 _probe216a.json _probe216a.v218.json pa
node run_iso.mjs ../../MiniPy_v4.218.sb3 _probe216b.json _probe216b.v218.json pb
```

## 六、下一轮建议

1. **P2-13 genexp 编译（合成 def）**：本轮已把方案收敛——(a) 语句执行以 pending/STOPTHIS 为
   完成单位，genexp 元素表达式必须活在 Code 行里；(b) 合成隐藏 def（FnKind='G'）+ 运行时注册
   （regdef 在 execute 遇 def 行时触发，可复用其解析）；(c) 闭包捕获（外层局部名）按 E3 的
   FN 快照模型自然存活。单独立轮，先做"模块级 genexp"再扩展。
2. **P1-5/P1-6 帧容器身份**：方向不变（帧代次戳 + alrec 跨代解绑 + presync 模式复用）。
3. **mixed 臂精确化**（低优先）：J 与浮点比较的精确语义需要 J↔float 精确提升，仅在与浮点
   差小于双精度间隔时才有可观测差异，当前近似已覆盖全部现有用例。
