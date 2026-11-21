# MiniPy v4.214 更新说明

**构建**：`MiniPy_v4.214.sb3`（2026-11-06，39,089 块，check41 errors=0）
**依据**：`MiniPy_v4.212_套件测试报告.md` §四/§五 剩余项 + `MiniPy_v4.213_更新说明.md` §四
"仍存在的问题"。本轮完成清单项 **10 项**，新增补丁 **P587–P590**（4 个）。
E3（惰性生成器）的 2 例仍按历轮报告声明，留待单独一轮（可恢复帧，重写级）。

## 一、结果总览

| 套件 | v4.213 | **v4.214** | 说明 |
|---|---|---|---|
| 主套件+探针（164 例） | 161 过 3 败 | **162 过 2 败** | 修 1 例（方法返回配对），0 破坏 |
| `_cov*` 回归（674 例） | 666 过 8 败 | **674 过 0 败** | 修 8 例（精度 4 + 地址 3 + 短路 1），0 破坏 |
| `_gap131` 补充（82 例） | 81 过 1 败 | **82 过 0 败** | 修 1 例（divmod big number），0 破坏 |
| **合计 920 例** | 908 过 12 败 | **918 过 2 败** | 剩余失败仅 E3 ×2（声明边界） |

剩余 2 例：`_new5 generator fibonacci`、`_new7 probe generator while true swap`——
`while True` 生成器挂死，根因是 P52 的"急切求值"模型（生成器体在建值时整体跑完）。
修它需要真生成器（可恢复帧：暂停函数体、跨 next() 保存 pc+局部变量+循环栈），
历轮报告（v4.212 §六.3、v4.213 §四）均定为单独一轮的重写级工作，本轮未动。

## 二、修掉的 10 项

| # | 清单项 | 补丁 | 转绿用例 |
|---|---|---|---|
| 1 | **大整数**：`**` 整数幂走大数（exp·log₂\|base\| ≥ 52.9 时） | P589 | `_cov1 big int precision`（2\*\*53、2\*\*63、2\*\*100 全部精确） |
| 2 | **大整数**：`+ - * // %` 任一操作数为 J 时走大数 | P589 | `_cov1 integer division precision`（10\*\*20//3、%7） |
| 3 | **大整数**：divmod 直调路径认 J | P589 | `_cov1 divmod big` → (999999993, 56) |
| 4 | **大整数**：str()/print/len(str()) 对 J 直通 | P589 | `_cov10 int to str of very large`（str(10\*\*30)、%7、len==31） |
| 5 | **大整数**：divmod 回调路径（builtin2b）认 J | P589 | `_gap131 divmod big number` |
| 6 | **默认 repr 格式**：`<__main__.X object at 0x…>` | P587 | `_covY repr fallback for print` |
| 7 | **容器内实例 repr**：列表元素走 reprval→strval 同一落底分支 | P587 | `_cov6 instance in dict and list` |
| 8 | **生成器 repr**：print(genexp) → `<generator object <genexpr> at 0x…>` | P587 | `_covZ genexp is a list` |
| 9 | **any/all 流式短路**：genexp 逐元素拉取、命中即停 | P590 | `_cov7 generator short circuit` |
| 10 | **方法返回配对**（v4.209 报告声明的方法返回边界）：`xs = bx.put()` 与 `self.items` 建链 | P588 | `_new1 method return no pairing boundary` |

### 关于 6–8 的诚实定性

CPython 的默认 repr / 生成器 repr 带 0x 内存地址，每次运行都不同，**逐字节对比在
原理上不可能**（历轮报告 §7 声明"不可修"的就是这一点）。本轮做的是两件事：
**解释器侧**把 repr 的**格式**对齐 CPython（`<__main__.类名 object at 0x…>`，地址取
`0x7f0000000000`+实例id，同一实例稳定、不同实例不同）；**跑器侧**（`runall.mjs` /
`run_iso.mjs`）在对比前把两侧的 `0x[0-9a-f]+` 统一归一化成 `0xADDR`。语义层
（类名、`__main__` 前缀、`<genexpr>` 名、格式骨架）现在是真对齐的；地址本身两侧
都不确定，归一化是唯一可行的对比口径。`_covZ` 的 G 值仍是急切物化的列表（P507
语义未变），只是显示形态对齐了 CPython 的生成器 repr。

## 三、补丁明细与根因

### P587 —— 默认 repr 格式 + 生成器 repr
strval 的 O 落底分支（P59 建的 `<Cls object>` 文本）改成 `<__main__.Cls object at
0x7f0000000000<id>>`；异常实例的 `Cls(msg)` 路径（reprval 自己的分支 + P491 的
`__msg__` 守卫）不动。strval 头部加 G 早退分支：`<generator object <genexpr> at
0x7f0000000000>`。`list()`/for/next 等消费方不走 strval，不受影响；全库没有用例
依赖旧的"print(genexp) 打印元素"形态（CPython 里那本来就是 repr）。

### P588 —— 方法返回的属性配对（P557/P575 的合龙）
P553 的返回捕获只认裸名（count==2 且 Kind=='I' → rrK=1/2/3），`return self.items`
是三记号属性链，rrK 落 0 → P557 不记对。修法三段：
① 返回捕获加第四类：count==4、Tok[3]=='.'、两端 Kind=='I'，且接收者行 Types=='O'
→ rrK=4、rrI=属性名、rrX=实例 id；② P557 记录点旁加方法形态分支：`xs = bx.put()`
（Kind[3]=='I'、Tok[4]=='.'、Kind[5]=='I'、Tok[6]=='('、Tok[count]==')'）且 rrK==4
→ 查 Tok[3] 的行，Types=='O' 且 Values==rrX（同一实例）→ 注册 P575 槽链接表
(SAN=xs, SHN=bx, SKV=items, **SKT='A'**——新槽型"实例属性")；③ assign 的 pubSync
（P575(c)）加 'A' 分支：xs 的任何 assign（append 的写回走 `assign(Tok[lo],…)`）→
lookup(SHN) → **aset**(实例id, 属性, pst, psv)。contT 分支加 NOT(SKT=='A') 守卫。
重绑定解链复用 P575 的 sdrop。**边界**：反方向（`bx.items.append` 后 xs 跟着变）
不走 indexset/pathset，本轮不建链（测试未覆盖，声明）；`self.a.b` 多级属性、
非方法形态调用不捕获。

### P589 —— 大整数（类型码 'J'，值=十进制数字串）
'I' 已被 dict_items 占用，取 'J'。只走大数路径的情形（小数值照旧浮点，
range/下标等消费方不受影响）：
* `**`：整数底数、非负整数指数、|exp|≤4096 且 exp·log₂|base| ≥ 52.9（浮点重复乘
  必失真的精确判据；52.9 的余量把估计误差和"刚好 2^53"都吸进去）→ **bgpow**
  （模平方乘，~log₂exp 次大数乘）；
* rightside 的 `+ - * // %`：任一操作数 evtype=='J' 且另一侧 N/J、无小数点 →
  **bgops**（符号感知分派）；
* divmod 两条路径（eval 直调 P28i/P218 链 + builtin2b 回调 P585 分支）的类型守卫
  放宽到 N|J，J 时走 **bgdm2**（Python floor 语义：异号且余数非零时商 =-(uq+1)、
  余数 = |b|-|ur| 且符号随除数）。
* 过程族：**bgcmp**（非负比较：先比长度、再逐位）、**bgadd/bgsub**（非竖式加减，
  结果前插拼串）、**bgmul**（非负乘，BGR 位积表，位置 i+j）、**bgdv**（非负长除：
  逐位落remainder、试商 0..9 反复减）。
* 消费方天然兼容：strval 落底分支原样打印 J、str()→strval、truth 的 vv=='0'、
  容器编码的 lesc 幂等。**声明边界**：J 的 `/`、比较（< >，Scratch 对纯数字串走
  JS 数值比较）、>2^53 的整数字面量、sum/min/max、J 作下标/range 实参、float(J)
  仍走浮点或报错（与 v4.213 一致，无用例覆盖）。

### P590 —— any/all 对 genexp 流式短路
any/all 的实参恰为 genexp 形态时（实参 span 深度 0 处有 `for 名字 in`，其后无顶层
`if`/第二个 `for`），在 **callfn/callfnW 入口**（实参求值之前）拦截走 **gstream**：
逐元素绑定循环变量（assign，P60 口径保存/恢复）→ eval 元素表达式（Tok[lo..gsF-1]）
→ truth 判定 → any 命中真 / all 命中假即停。源支持 L/T/G/S 与 `range(...)`（0/1 个
顶层逗号）；其余形态（带 if 过滤、多 for、range 多段、非可迭代）gsok=0 落回原
急切路径，行为与 v4.213 完全一致。循环变量恢复按 P60：无旧绑定则删
Names/Values/Types/Show 行。

## 四、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| E3 | 生成器 `while True` 挂死（`generator fibonacci`、`probe generator while true swap`） | 真生成器（可恢复帧）单独一轮：GYield 挂起、跨 next() 保存 pc/局部变量/LoopHead 栈 |
| 大整数边界 | J 的 `/`、< > 比较、>2^53 字面量、sum/min/max、J 下标/range、float(J) | 对象堆/数值批次后续 |
| 槽链反方向 | `bx.items.append(…)` 后配对名不跟变（P588 只建了 alias→host 方向） | 测试未覆盖；需要属性写路径挂 syncBack |
| P590 覆盖面 | genexp 带 `if` 过滤 / 多 for / range(a,b,c) 时 any/all 落回急切路径 | 按需扩 gstream |

## 五、工程记录

- 本轮补丁顺序：`p587 p588` 在 `p586` 之后、`p589 p590` 在其后、`tail.txt` 前
  （assemble214.cjs 是 assemble213.cjs 的加段副本）。
- **踩坑七则**（全部本轮实测，下轮写补丁前先读）：
  1. **REPEATU 的参数是退出条件**（先判后跑，条件真即停）——本轮把全部循环写成了
     "继续条件"，第一次构建后 bgpow 整体空转。正确写法如 `REPEATU(LT(i,1))` 表达
     "i 从 n 递减到 1"。
  2. **substr(s, a, b) 是闭区间 [a,b]**，不是 (start, count)——`substr(v, 2, len(v))`
     才是去首字符；按 count 写会吞掉最后一个字符（bgmul 结果因此全体错位）。
  3. **过程参数要用 argOf 读，不能用 VAR**——`newProc` 的参数是 argument reporter，
     VAR(x) 查的是全局变量（`no variable a in Interpreter` 报错即此）。
  4. **IF 只有两参**；三参调用静默丢弃 else 分支（mkSplit 的负数分支因此从未执行，
     bgma 落 0）。
  5. **被调过程会冲掉主调过程的循环游标**（铁律 7 的过程间版本）：bgdv 用 bgi 做
     数字位游标，被调的 bgcmp/bgsub 也用 bgi——游标被冲、bgr 永远取到空字母。
     嵌套调用链上的每个过程必须用各自的游标名（bgdv→bgdi）。
  6. **输入描述符第七种形态**：原语被 `[1, [10,"divmod"]]`/`[1,[4,"1"]]` 再包一层，
     变量被 `[3,[12,"narg",id]]` 包裹——谓词必须先解包再比（litOfD/nmOf 递归解包）。
  7. **修守卫时整条件替换**（`BL()[g].inputs.CONDITION = B.BOOL(新块)`）比在
     not/equals 块里原地改 OPERAND 稳——原地改要自己处理 parent 重挂，且共享块的
     单亲约束容易踩。
  8. （重复踩）**对块对象再包一层 BL()**：`BL()[notBlk].inputs` 当 notBlk 已是块
     对象时得到 undefined——赋值前先想清楚手里是 id 还是对象。
- 调试基建：`dbg214.mjs`（单例跑器，基于 runall.mjs 的 VM 路径，dump 指定变量/列表；
  旧 dbgrun.mjs 的 D: 盘路径已失效）。bgdv 的根因两次都靠"非 warp 化 + 变量 dump"
  定位（第一次 bgq 变 3000 位零串 → 游标被冲；第二次 GDMP 转储 → letterOf 用错游标）。
- 跑器侧改动（与解释器无关，已在 §二 定性）：`runall.mjs`/`run_iso.mjs` 加
  `0x[0-9a-f]+` → `0xADDR` 地址归一化；`run_iso.mjs` 的 VM/python 路径从旧机器
  （D:/编程/…）迁到当前路径。
- 结构校验：`node check41.cjs MiniPy_v4.214.sb3` → 39,089 块，errors=0。
- 结果目录：`_final214/`（主套件 164）、`_reg214/`（回归 674）、`_gap214/`（补充 82）；
  过程性产物 `_t214a~f/`（分补丁验证）、`_v4214recon_*.md`（侦察笔记）。

## 六、下一轮建议

1. **E3 真生成器**（最后一个可动的大项）：P580 的 FrLoop 守卫和 P52 的 GYield
   收集点都在，calluser 的体循环是行级 pc 驱动——可恢复帧的主要缺口是
   "yield 时把帧局部行 + 循环栈 + pc 存进按生成器 id 键控的表，next() 时恢复"。
2. 大整数边界（比较/J 字面量/sum）可与对象堆路线合并做。
3. P588 的反方向同步（属性写 → 配对名）照 P582 的 pwr 旗标模式挂在 aset 上即可。
