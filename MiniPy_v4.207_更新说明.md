# MiniPy v4.207 更新说明

**构建**：`MiniPy_v4.207.sb3`（2026-10-31，36,242 块，check41 errors=0）
**依据**：《已知问题清单_v4.205.md》（v4.206 实测：581 套件 20 败 / 补充 82 例 5 败 /
`_cov205` 77 例 8 败，真实失败合计 ≈33，其中 9 例为双精度/地址类不可修项）。

## 一、结果总览

| 项目 | v4.206 | **v4.207** |
|---|---|---|
| 581 全套 | 20 失败 | **12 失败（修复 8、回归 0）** |
| 补充 82 例 | 5 失败 | **2 失败（修复 3、回归 0）** |
| `_cov205`（77 例） | 8 失败 | **0 失败（修复 8、回归 0）** |
| 真实失败合计 | ≈33 | **14** |
| check41 | 35,313 块 errors 0 | **36,242 块 errors 0** |

全绿 19 例：`float conversions`、`negative zero variants`、`large and small floats`、
`sum of floats`、`format negative and sign`、`frozenset if supported`（581）；
`next builtin missing`、`negative zero float`、`type e equals E`（82）；
`quicksort recursive`、`gcd lcm euclid`（205a）、`operator overloading vector`、
`class variable counter`（205b）、`recursive flatten`、`decorator manual wrap`（205d）、
`exception with attributes`、`dispatch table with lambdas`（205e）。
另有两处行为对齐（见 §二.13、§二.14）与一项防回归卫生（P551）。

## 二、修掉的问题（16 个补丁）

| # | 问题 | 根因 | 修法（补丁） |
|---|---|---|---|
| 1 | `next([1,2])` 返回首元素 | `next` 分支的 else 兜底把一切剩余类型当列表游标 | **P531** else 入口拒绝 L/T/D/S/E：`TypeError: '<type>' object is not an iterator`（消息走 tname）。G/Y/O 路径不变 |
| 2 | `f'{3.0:+d}'` 静默输出 `3` | pctitem 的 d 分支只挡 `vt != 'N'`，float 也是 N | **P532** `set pnn=floor` 前：pcsrc==1（f-string 路径）且 vv 含 `.` → `ValueError: Unknown format code 'd' for object of type 'float'`。`%d %3.7` 的 %-运算符路径不受影响 |
| 3 | `float('-0.0')` 丢符号 | 字符串分支 `ev = ev+0` 把 -0 规范化成正 0 | **P533** callfn/callfnW 的 `mkfloat` 调用后：ev==0 且原始实参文本（p6v）含 `-` → 置回 `'-0.0'` |
| 4 | `sum([0.1,0.2,0.3])` → `0.6000000000000001` | 普通累加；CPython 3.12+ 对全 float 序列用 Neumaier 补偿 | **P534** 全 float 时走 Neumaier（total/comp），遇非 float 项先把补偿折回 total 再退普通累加（与 CPython 切换语义一致）；`sum([1,2.5])` 等混合序列结果不变 |
| 5 | `frozenset([1,2])` NameError | callfn/callfnW 只认 `fn=='set'` | **P535** 两处分支条件放宽为 set 或 frozenset（同走 setnorm） |
| 6 | `print(123456789.123456789)` 回显源文本 | numlit 只对 e 记号做数值化，普通小数字面量 ev=源文本 | **P536** tokenize 收尾对含 `.` 且**长度>1** 的 N 记号：`v=记号+0` → `floatfmt`（CPython repr 仿真）→ 写回。**长度守卫是关键**：方法调用的 `.` 也被分词器产成 Kind=N 的裸点记号（v4.207 首版漏了它，161 例回归） |
| 7 | 递归调用实参抛 UnboundLocal（quicksort/gcd） | calluser 先推帧再求实参：实参里的 `left`/`a` 在被调帧里被判"未绑定严格局部名"（P501 的 ubR=1） | **P537** 帧作用域开关 UleC：实参求值段置 1，lookup 的 ubScan 跳过（实参回落到继承槽=调用方的值，正是 CPython 语义）；参数绑定前置回 0；帧尾随 FrBndC 弹出 |
| 8 | 递归帧局部列表互踩（flatten 输出 ×4） | P285 的 MName 是全局的：被调帧对**同名局部**的变异也在帧尾写回调用方 | **P538** MSave 捕获前判属主：名字 ∈ FnLoc[FnStack顶]（当前函数静态本地）不捕获；global/闭包/外层变量照旧 |
| 9 | 列表变异跨帧穿透（callee 里 `left.append(9)` 后 caller 的 left 变 `[9]`） | publish→wpub→**wscan** 把 FN 备份栈里**所有**同名行改成当前帧新值——递归时父帧备份被污染 | **P539** wscan 改写行之前判区域属主：FN 区域 i 是"帧 i-1 的视图备份"，名字 ∈ FnLoc[FnStack[i-1]] 的行跳过。P285 的嵌套变异（out ∉ build2b 的 FnLoc）照旧存活 |
| 10 | `ops['add'](6,3)` 报不可调用 | P141 按名字绑定算 callable（Types['ops']='D'），被调表达式求值成 F 仍按 callable=0 报错 | **P540** 把 P520 的链式调用 handler 铺到 eval 全部 not-callable / parentheses / expression 抛点之前（handler 自带条件门：Tok[hi]==')'、配对成功、被调为 F） |
| 11 | `compose(double, inc)(5)` 报括号错误 | 名字调用门只查 `Tok[lo+1]=='(' 且 Tok[hi]==')'`，不验证 hi 是配对右括号 → 实参区错成 `inc)(5` | **P541** 门之前做配对扫描（m9m=首次深度归零位），门加 `m9m==hi`；不匹配时落给 P540 的 handler 链式调用。`f(1,2)` 配对位恰是 hi，行为不变 |
| 12 | 方法帧内构造实例身份错乱（vector：`v1+v2` 返回 v2 的行） | callfn 构造器路径 `set iid=len+1` 后，P517 实参预求值的**属性读取**把全局 iid 冲成接收者号（self→1、other→2），`set self=iid` 与 `set ev=iid` 拿到旧实例 | **P542** cmet 压栈后把 `len(InstCls)`（=新实例号）压入 VStack，随即重载 iid 并重赋 self；cmet 弹栈前弹回。push/pop 与 calluser 同分支平衡。**顺带治好 B7**：`Counter.count += 1` 的写路径不再拿到错实例号 |
| 13 | `Exception.__init__(self, msg)` 报 missing argument | **两个叠加 bug**：(a) 构造器实参预求值 A 变体（narg==0 整段单参）没有 vmOn==0 门——B 变体求值时实参里的 `str(v)` 调用扫描把全局 narg 冲成 0，A 变体把 vmOn 从 2 覆盖回 1，整个元组成了单个实参；(b) 异常分支预存 `__msg__` 的 eval 同样冲 narg | **P543** A 变体门补 `vmOn==0`；**P544** 异常分支预存 eval 前后用 VStack 保存/恢复 narg |
| 14 | `str(e)` 显示完整实参元组 | P519 的 B13 分支自 v4.204 起就是死代码：安装用 `replaceStmt(fail, chain([...]))`，而 replaceStmt 把 newId.next 覆盖成旧 fail 的 next，刚建好的链被冲断，孤儿块被 pruneUnreachable 删除 | **P545** 在 callcls 的 `set p19a=0` 后**重建**整条分支：p19a==1（ccls 是 Exception 或其后代）∧ cmeth=='__init__' → eval(clo..chi) → `aset(cinst,'__msg__',类型,值)` → 返回 None；否则照旧 fail |
| 15 | `raise E('m')`（E 非异常类）放行 | raise 分支只查 ClsName | **P546** 类构造形态入口加 isanc 校验：不是 Exception 后代 → `TypeError: exceptions must derive from BaseException`。**注意**：守卫不能用陈旧的 p2r 做外层条件（首版因此漏检） |
| 16 | `round(2.675, 2)` → 2.68（CPython 2.67） | mrt=2.675*100 被 IEEE 舍成**恰好平局** 267.5，roundpy 半偶进位 | **P550** 伪平局探测：mrt 恰为 k+0.5 时，从 a1v 直接乘 10^(n+1..n+9) 扫描（不能从 mrt 续乘——只会复制舍入结果），任一尺度出现非整数 → 真值不在平局上 → 向零取整；全整数才是真平局，保持半偶。`round(2.5)=2`、`round(3.5)=4` 等真平局不受影响 |

另：**P547** 可变默认参数持久化（`def acc(x, box=[])` 的 box 默认对象跨调用共享——
帧尾把参数现值写回 FnDef[fu]，保留首字符标记与类型位）。它让默认值的**对象身份**
对齐了 CPython，但 `print(acc(1), acc(2))` 要逐字节匹配还需"返回值即对象引用"
（渲染期快照 vs 对象），与本轮 `function modifying global list` 同一根因，均未修。

## 三、本轮的关键教训（已写入清单）

1. **P536 的长度守卫**：分词器把方法调用的 `.` 也产成 Kind=='N' 的裸点记号——
   任何"N 记号规范化"必须跳过长度 1 的记号，否则所有方法调用全军覆没
   （首版 161 例回归的元凶）。
2. **replaceStmt 会覆盖 newId.next**：`replaceStmt(old, chain([a,b,c]))` 之后
   a→b 的链接被冲掉，b/c 成孤儿，构建收尾的 pruneUnreachable 静默删除
   （P519 的 B13 分支就这样死了两个版本）。链要先建好、replace 只挂头，
   或改用 spliceAfter。
3. **双克隆（callfn/callfnW）的分支在 mode=0 下只跑 callfnW**，但 callfn 的
   分支代码在 callfnW 返回后**仍会顺序执行**——任何"成功即收尾"的路径必须
   `stop this script`（stopThisScript 弹到最近的 procedures_call 帧），
   并配 p48d 式标记防止另一克隆重复处理。
4. **全局寄存器（narg/iid 等）在同帧的嵌套 eval 里会被冲掉**：fpush 只保护
   跨帧边界。凡"先求值 A 再用之前算好的 B"的序列，要么用 VStack 存（P542），
   要么给破坏者加保存/恢复（P544）。
5. **用 stale 寄存器做外层条件等于没有条件**（P546 首版 `IF(p2r==1)` 跳过了
   自己的 isanc）；守卫体内部自算判据。
6. **`item('X', ...)` 的 ITEM/操作数可能是内联 [12,var] 描述符而非块引用**，
   匹配器两种形态都要接（P546/P535 连续踩坑）；`JSON.stringify(inputs)` 含
   内联原语但不含子树——子树要 reach 展开。
7. **IFELSE/IF 的分支参数必须是数组**，单个块 id 会被 chain 当字符串逐字符
   迭代（P548 尾期踩坑）。
8. **二分串行污染时，被测用例必须固定在套件尾部**：把污染用例放前面重跑
   会得到假阴性（RLE 排查绕了远路）。

## 四、已定位、本轮未修

| 问题 | 状态 | 说明 |
|---|---|---|
| `default mutable argument` / `function modifying global list` | 半修 | P547 让默认对象跨调用持久（对象身份已对齐）；剩余差距是**返回值快照**——`print(acc(1), acc(2))` 要 [1,2] [1,2] 需要打印渲染引用同一对象，需引入对象堆，工程量大 |
| `iterator protocol on custom class` | 回退 | P548 三版：objiter 在 list 分支调用后，双克隆 flow/StopIteration 清理与错误消息仍有未解交互（`''` p6msg / SyntaxError 变体），需要独立的调试周期 |
| `realistic: run length encoding` | 定位 | 串行污染锁定为 cov8 的 "for else with break"+"while else" 两例组合；P551 重置 prepare 状态机（prevhead 等）未能消除，泄漏点在循环-else 机制更深处 |
| `tuple element path alias` | 回退 | P549 给 palwrite 加了 T 容器写回分支，但路径注册本身（PthN）对 `t = ([1],)` 的 `(` 形态不生效，需先扩路径扫描 |
| round 更深精度 / big-int 家族 | 文档声明 | 2^53 与对象地址类，不可修 |

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython
node _work/v41/assemble.cjs && node _work/v41/build41.js
node _work/v41/check41.cjs MiniPy_v4.207.sb3
node _work/v41/runall.mjs MiniPy_v4.207.sb3 _work/v41/_out \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt
node _work/v41/run_iso.mjs MiniPy_v4.207.sb3 _work/v41/_gap131.json _work/v41/_gap.out.json g
node _work/v41/runall.mjs MiniPy_v4.207.sb3 _work/v41/_outg \
  _work/v41/_cov205{a,b,c,d,e}.txt
```

## 六、版本演进小结

| 版本 | 真实失败 | 关键变化 |
|---|---|---|
| v4.205 | ≈44 | B1–B14 多维度根因批量修复 + 链式调用 |
| v4.206 | ≈33 | float 字面量尾零、print 行缓冲、range 快路径、`__sub__`/`__mul__` |
| **v4.207** | **14** | **帧语义三重修（实参作用域/MSave/wscan）、链式调用双修、构造器身份（iid 走 VStack）、异常构造与 `Exception.__init__` 重建、raise 校验、round 伪平局探测、sum 补偿、负零、frozenset、next 守卫、format 'd' 校验、float 字面量最短表示（共 16 补丁，回归 0）** |

**下一步建议**：① 对象堆（一次解决 default-mutable/global-list 的返回别名）；
② 循环-else 泄漏（RLE：用 Trace 列表对 {for-else-break, while-else}+RLE 组合
做逐行对照）；③ P548 迭代器（objiter 与 list 分支双克隆交互需独立调试周期）；
④ 路径扫描支持 `(` 形态（tuple-alias）。
