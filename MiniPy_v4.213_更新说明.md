# MiniPy v4.213 更新说明

**构建**：`MiniPy_v4.213.sb3`（2026-11-05，38,098 块，check41 errors=0）
**依据**：`MiniPy_v4.212_套件测试报告.md` §六 修复优先级 + §四/§五 剩余项。本轮完成清单项 **12 项**，
新增补丁 **P579–P586**（8 个）。报告 §二 对账表上，22 项中未修的只剩 E3（惰性生成器，重写级）。

## 一、结果总览

| 套件 | v4.212 | **v4.213** | 说明 |
|---|---|---|---|
| 主套件+探针（164 例） | 152 过 12 败 | **161 过 3 败** | 修 9 例，0 破坏 |
| `_iso209` 隔离单例（26 例） | 18 过 8 败 | **24 过 2 败** | 修 6 例，0 反转 |
| 回归 756 例（`_cov*`+`_gap131`） | 743 过 13 败 | **747 过 9 败** | 4 例为套件标注修复，0 破坏 |

剩余失败全部是**已声明边界**，逐例与 v4.212 相同、无新增：
主套件/隔离的 E3 生成器 ×2（`generator fibonacci`、`probe generator while true swap`）与
方法返回边界 ×1（`method return no pairing boundary`）；回归的精度类 ×4（`_cov1` 三例 +
`_cov10` 一例 + `_gap131 divmod big`）、对象地址 repr ×3（`_cov6`/`_covY`/`_covZ`，
CPython 输出含内存地址、原理不可对齐）、E3 家族 ×1（`_cov7 generator short circuit`）。

## 二、修掉的 12 项

| # | 清单项 | 补丁 | 转绿用例 |
|---|---|---|---|
| 1 | **E2 方法家族**：属性接收者方法调用后的属性读串扰 | P579 | `_new4 bst insert search inorder`、`_new9 probe bst 6 nodes single print` |
| 2 | **E2 函数家族**：递归函数 for 循环跨帧串扰 | P580 | `_new2 four queens`、`_new2 dfs all paths`、`_new2 permutations recursive`、`_new7 probe perm recursion minimal` |
| 3 | **A1 反向**：`d['r'].append(4)` 不同步到源 | P582 | `_new1 dict value alias mutate` |
| 4 | **A3 括号残留**：`b = (a if c else [2])` 不建别名 | P583 | `_iso209/_i07`（`conditional expression alias` 主用例本就过） |
| 5 | **return parameter alias**：`b = f(a)` 后 `a.append(3)` 不反映到 b | P584 | `_new1 return parameter alias` |
| 6 | **divmod 作回调**：`map(divmod, xs, ys)` NameError | P585+P586 | 专项探针 `_e2chk4`（同时修好一切返回容器的 map 回调） |
| 7 | **报错消息尾巴 `undefined`**：所有 fail 消息挂 `undefined` | P581 | 全部错误路径文本净化 |
| 8 | `_gap131 next builtin missing` | P581+套件标注 | 转绿 |
| 9 | `_gap131 pow one arg` | 套件标注 | 转绿 |
| 10 | `_gap131 assert with message` | 套件标注 | 转绿 |
| 11 | `_gap131 type e equals E` | 套件标注 | 转绿 |
| 12 | `_new8 probe builder chain via var` 作废用例 | 用例改自含 | 转绿 |

**关于 8–11 的诚实定性**：这 4 例与 `_covD`/`_covZ` 里的同名用例完全相同，那边带 `!`
（expectError）标注所以一直通过；`_gap131` 的副本漏标了 `!`。CPython 对这四种输入都是
未捕获异常（stdout 为空），套件标注按 `runall.mjs` 的既有语义补齐——**不是解释器行为变化**。
其中 next 一例的解释器侧缺陷（消息尾巴）由 P581 顺带修复。

## 三、补丁明细与根因

### P579 —— methodcall2 的 w8 接收者寄存器栈化（E2 方法家族）
插桩结论（`_dbge2.txt` 探针）：`methodcall2` 把"接收者快照"放在全局寄存器
`w8old/w8oldt/w8sv/w8svk` 里，且**横跨 methodcall 调用**才在尾部使用（比较 `__recv`
是否被重绑 + 恢复 Tok/Kind）。递归方法体里嵌套的 `self.x.m()` 会整组冲掉它们：
w8old 被内层改写，而 calluser 的 fpop 又把 `__recv` 行还原成外层进入值 →
`cur ≠ 被冲掉的 w8old` → pathset 误触发，把 `self.b` 写成 `self.a` 的值
（trace 实证：`MC2W old=2 … cur=3` + `PSET self.b vv=3`，此后 top.b 非 None 多跑一轮，
BST 输出 `[1,3,4,5,1,3,4]`）。修法沿用 P572 的手术：四个寄存器在调用前入栈 `W8Stk`、
调用后出栈还原。**注意**：`__recv` 的 fpop 复活效应使比较从此恒等——误触发分支对
用户方法不可达，对内建方法本就恒等，无行为差异。

### P580 —— boundary 只推进当前帧的循环（E2 函数家族）
递归的每一层都挂在**同一行源码**上（函数体只有一句），各层帧的 for 循环条目
LoopEnd 相同。boundary 的推进循环 `until lc==0 or not(pc==LoopEnd[lc])` 在最内层
返回后把**祖先帧**的循环也一路推进：trace 实证 `POP POP ADV lc=1 lv=2 txt=[b,c]`，
pc 直接跳进 a 帧的循环体——而执行的还是最内层的 calluser 循环（dfs 第 2 条路径
因此变成 `['a','b','d','c',…]`）。修法：推进条件加 `lc > FrLoop 栈顶`（当前帧循环基）
守卫；祖先帧的条目由它自己的 calluser 恢复后自己推进。非递归程序里同一帧一行至多
结束一个循环，LoopEnd 碰撞原本不可能，行为不变。

### P582 —— dict 槽反向同步（A1 反向，P575 的既定方案）
pathset 的合成 indexset 写（元素方法写回）是"槽变异"的唯一来源，给它打 `pwr=1`
（沿 P576 的 rid 先例），indexset 的 dict 分支只在 pwr==1 时执行 P575 留任的
syncBack（键匹配 → `assign(源名, isValR, isValT)`）；重绑定（`d['r'] = 另一列表`）
走 execute 直接 indexset、pwr==0，只触发 P575(a) 的重新登记。
**本轮踩的坑**：dict 分支在基写前把 isVal `lesc` 转义（嵌入 dict 文本），syncBack
拿到的是转义文本，赋回源后又触发 P575 正向同步**二次转义** → 源与槽双双显示为空
（即 v4.212 实测的"两栏都变空"）。修法：在 RHS eval 之后、lesc 之前捕获未转义原文
`isValR`，syncBack 一律用它。

### P583 —— 三元 RHS 外层括号（A3 残留）
`b = (a if flag else [2])` 的 `if` 落在深度 1，P573 的深度 0 扫描永远不命中。
修法：Tok[3]=='(' 且 Tok[count]==')' 时对 Tok[4..count-1] 再做一次**相对深度**扫描：
`if` 命中相对深度 0 记 a3r=1；任何闭括号把相对深度压到负值记 a3b=1（扫描后
`a3b=1 → a3r=0`）。负值守卫是必须的——`(a) + (b if c else d)`、`(a if c else d) + e`、
`(a if c else d)[0]` 三种形态都实测核过，均不得建别名（CPython 语义：RHS 顶层不是
三元/赋值目标是新对象）。`(a) if c else d` 的真分支带括号形态：alsrc 本来就空，
行为与 v4.212 一致。别名条件改为"绝对扫描命中 or 相对扫描命中"，其余守卫不变。

### P584 —— 返回参数别名（P557 的洞）
`def f(x): x.append(2); return x` 之后 `b = f(a)`，`a.append(3)` 不反映到 b。
机理：第一行靠参数写穿（pmap 的 ArN/ArO：x→a）；P557 记的别名对是 `alrec('b', rrN)`
而 rrN='x' 是 f 的**已消亡局部名**，顶层 `a.append(3)` 的 assign 别名钩子里没有 'a'。
修法：return 捕获加第三类 rrK=3——返回的是帧局部参数且 ArO 里有实参根名
（pmap 已做传递解析；P561 的 pbreak 天然排除 `x = [9]; return x`）→ rrN=实参根名，
P557 守卫放宽到 rrK∈{1,2,3} → `alrec('b','a')`，两个都是顶层活名，append 经
assign 的别名钩子双向传播（与 `b = a` 同一通道）。
**两个连带修**：① printargs 的 mkStore 对 rrK>0 走 `IFELSE(rrK==1 → 行引用, else →
FnDef substr)`，rrK==3 的陈旧值落 else 会拿 rrI=0 去 substr——else 分支套 rrK==2
守卫；② 探针实证 P584 初版把 `tokAt` 定义成 `item('Tok', num(i))`，传 `VAR('count')`
时被 num() 字符串化成垃圾字面量（`Tok[count]` 条件永假、alrec 从不执行）——改回
`item('Tok', i)`，字面量位置显式 `num()`。

### P585+P586 —— divmod 作回调 + map 收集器 lesc（既有缺口）
callval 的内建分支（P577 的分流结构，callval 里有**两条兄弟分支**：值上下文/实参
上下文，两条都扩）把 divmod 送进 builtin2；builtin2b 新增 divmod 分支（计算与 eval
的内联分支逐块一致：floor 除 + mkfloat + 模 + mkfloat，结果编码 lsep+N+lsep+N，
evtype=T）。
**P586 是被 divmod 元组暴露的既有 bug**：P262/P567 的 map 收集器
`mpout = enc(mpout, evtype, ev)` **没过 lesc**——回调结果（eval 产物）是未转义文本，
元组/列表/字典的编码自带 lsep，直接拼进 mpout 后结果列表自身的 lsep 结构被撑爆
（实测每个元组拆成 `()`、`0`、`1` 三段）。filter 不受影响（listitem 的产物本来就是
转义形态）。修法：两处 map enc 前先 `lesc(ev)`（就地改 ev，标量结果幂等）。

### P581 —— 报错消息尾巴 `undefined`
项目里有 3 个 operator_join 块**缺 STRING2 输入**（历史补丁包 JOIN(x) 只给了一个
操作数；构建期全库扫描确认），Scratch VM 对缺失输入渲染成字面 "undefined"——
所有经 fail 显示的错误消息全部带尾巴（`…not an iteratorundefined`）。构建期补空串
字面量（实际修了 6 处，含 webfix 克隆）。`_gap131 next builtin missing` 的消息文本
随之对齐 CPython。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| E3 | 生成器 `while True` 挂死（`generator fibonacci`、`probe generator while true swap`、`_cov7 generator short circuit`） | 惰性生成器重写（P52 急切求值边界），单独一轮 |
| 精度 | `_cov1` 三例 + `_cov10` + `_gap131 divmod big`：>2^53 走 Scratch 浮点 | 大整数编码（对象堆路线子项） |
| 对象地址 | `_cov6`/`_covY`/`_covZ`：默认 repr/生成器 repr 含 CPython 内存地址 | 原理不可对齐（oracle 每次运行地址不同） |
| — | 方法返回边界（`bx.put()` 返回值不与 `self.items` 配对） | v4.209 报告 §二 声明的设计边界 |

## 五、工程记录

- 本轮新补丁顺序：`p579 p580` 在 `p578` 之后；`p581–p586` 在 `p575` 之后、`tail.txt` 前
  （**p582 依赖 p575 的 SAN/SHN 表、p585 依赖 p577 的分流结构，必须排在其宿主补丁之后**
  ——首轮assemble 排在 p580 后面，直接 `no variable sdi` 报错）。
- **踩坑五则**（全部本轮实测）：
  1. `insertBeforeStmt` 传**链**要传数组、传单个块 id 会把字符串当数组逐字符 chain
     （P579/P583 各踩一次，报 `Cannot set properties of undefined (setting 'next')`）。
  2. `insertBeforeStmt`/探针挂**过程体第一句**时，`predecessorOf` 全库扫 `.next`，
     构建中期有陈旧链会插到错误的宿主上——过程体首句前插一律手工接
     （`def.next = 探针头; 探针尾.next = 原首句`），README 铁律 3 的强化版。
  3. 输入描述符的第四种形态：变量作 reporter 实参时是 `[3, [12,"name","bvar_…"], shadow]`
     （内联变量字面量），而 `B.REP(变量id字符串)` 生成 `[3, varId, shadow]`——按 id 查
     `BL()` 会落空。判"这个输入是不是变量 X"要同时认三种形态。
  4. `find` 的锚点谓词里 `JSON.stringify(b.inputs)` **仍然**不含被引用块的文本
     （README 踩坑 3），但描述符里的内联字面量（`[12,"evtype",…]`）会出现在 JSON 里
     ——两者混用时极易写出"本地能匹配、真项目匹配不到"的谓词，一律沿树解析。
  5. Scratch 的 `operator_contains` 操作数序是 `STRING1 contains STRING2`
     （`"." in tqdiv` 的块是 STRING1=tqdiv、STRING2="."）——照反了条件恒假。
- **构建纪律**：`build41.js` 默认 OUT 是 `MiniPy_v4.210.sb3`，本轮一度把它覆盖，
  已从 `_work/v41/_v4210check.sb3`（v4.211 轮验证过的逐块一致副本）恢复并经 check41
  复核（37,236 块 errors=0）。此后每次构建显式 `V41_OUT=…V41_STAMP=…`。
- 探针基建：`_dbge2/_dbge5/_dbge6/_dbge7/_dbge8.txt` 五个 PDEBUG 补丁（组装时手工插进
  parts 列表、构建后移除）；`dbgrun213.mjs` 单例跑器（VM 路径与 `runall.mjs` 一致，
  dump 指定列表/变量）。E2 两族、A1 反向、RPA、divmod 的根因全部由插桩定位。
- 结果目录：`_final213/`（主套件）、`_reg213/`（回归 756）、`_iso213/`（隔离 26）、
  `_base213a/`+`_base213reg/`（v4.212 基线）。
- 套件侧改动（与解释器无关，已在 §二 定性）：`_gap131.txt` 4 例补 `!` 标注；
  `_new8_probe2.txt` 的 `probe builder chain via var` 改为自含（原用例引用前一用例的
  `class S`，单例运行 CPython 同样 NameError，属 v4.209 报告已标注的跨用例引用问题）。
- 结构校验：`node check41.cjs MiniPy_v4.213.sb3` → 38,098 块，errors=0。
