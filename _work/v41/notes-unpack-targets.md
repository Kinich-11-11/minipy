# 第 46 轮：低风险版第 3 步也不行 —— 决定**暂停**下标目标这条线

## P249（低风险版第 3 步）实测

把控制流改动换成"先照原样 `assign`，若是下标/目标再用 `pathset` 覆盖一次"（`spliceAfter`，零控制流改动）：

| 套件 | v4.153 | P249 |
|---|---|---|
| `_star` | 7/12 | **7/12**（四条下标用例**毫无变化**） |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 | 同 | 不变 ✓ |
| `_swap` 17/17 · `_setflt` 15/15 · `_nest` 24/24 | 同 | 不变 ✓ |
| `_paren2` | 15/15 | **14/15** ✗（`aa = bb = (1, 2), (3, 4)` → `NameError: name 'aa'`） |

即：崩溃没了（比第 45 轮好），但**下标目标依旧没修好**，还多了一条链式赋值回归。

## 为什么"没修好"

`x, d["k"] = 10, 20` 仍然 `10 {}`、`d["a"], d["b"] = 1, 2` 仍然 `KeyError: 'a'` —— 说明
**下标左侧根本没走到我改写的那条简单路径**（或 `pathset` 调用没生效）。第 45 轮已经用探针证明
"扫描本身正确"，所以问题在**路由**（`augrp` 判定）或 `pathset(lo,hi,...)` 的调用前提上，
而这两者都需要再各打一轮点，收益与成本已明显不成比例（已经 5 轮）。

## 决定：暂停这条线，转去做其它更高价值的缺口

理由：下标目标属于"边缘但真实"的缺口，而这 5 轮里它已经吃掉了全部预算，
期间只产出分析（`_star`/`_doc2` 两个探针套件是真实资产，但修复为零）。
相比之下以下缺口更常见、更可能有"小而确定"的修法：

1. `_alias` 6 条（返回值别名/引用语义 —— 教学代码里 `b = a` 后改 `b` 很常见）；
2. `_slice` 3 条；
3. P226 的 `cdo` 括号比较（同 P234 的经验：**逐字符**换成 `operator_contains` 即可，风险低）；
4. `chr()` 范围（32..126）与 `round(2.55,1)` 等浮点十进制模型问题（各 1 条）。
5. `_upd`/`_unp2`/`_unp3` 各 1-2 条。

**保留资产**：`_work/v41/p248.txt`（三步方案）、`_work/v41/p249.txt`（低风险第 3 步）、
`pz41.txt`（列表探针）都留着，随时可以回来接着做；`notes-unpack-targets.md` 记录了全部线索。


## 探针结果：扫描（第 1、2 步）完全正确

对 `a, *rest = [1, 2, 3, 4]`，在绑定循环之前打印（PZ41）：

```
AName=a rest | AStar=01 | ATgtLo=1 4 | ATgtHi=1 4 | augrp=0 auexs=1 auk=2 mi=6
```

期望值全部命中：目标名 `a`/`rest`、星号标记 `0`/`1`、目标 token 区间 `1`/`4`、走的是简单路径（`augrp=0`）、
星号下标 `auk=2`。**新扫描没问题。**

## 二分结果：第 3 步是罪魁

把第 3 步（把 `aldrop`+`assign` 换成 `IFELSE(含 [,.] → pathset, else → 原 assign)`）用
`if (false)` 关掉后重建：

| 套件 | v4.153 | P248 全量 | **P248 仅第 1、2 步** |
|---|---|---|---|
| `_star` | 7/12 | 2/12 ✗ | **7/12** ✓ |
| `_unp` | 13/13 | 12/13 ✗ | **13/13** ✓ |
| `_paren2` | 15/15 | 14/15 ✗ | 14/15 ✗（第 1、2 步自身的 1 条小回归） |

即：`_star`/`_unp` 的崩溃**完全由第 3 步造成**；第 1、2 步只影响 `_paren2` 一条。

## 第 3 步到底坏在哪（已知线索）

* 探针显示绑定循环**只跑了一次**（`BUI aui=1 name=a vt=N v=1`，而守卫在 `aui == 2` 的探针**从未触发**）
  → 循环第二轮没发生，即绑定之后的 `aui += 1` 没生效。
* 但构建产物里链条是**对的**：新的 `control_if_else`（带 `pathset` 分支）的 `next` 确实是
  `data_changevariableby/aui`（已核对）。所以不是 `replaceStmt` 的 `next` 丢失问题
  —— 我已经在构造 `IFELSE` **之前**把 `next` 抓下来、替换后再接回去（第 44 轮的修法），
  产物看起来完好，但运行时循环仍只走一轮。
* 下一步怀疑：`if_else` 的 **else 分支里只有 `bindId` 一个语句**，而 Scratch 的 `if_else`
  运行完后要回到 `next`；也许问题出在 `bindId` 原有的 `parent`/`next` 语义被 `chain` 改写后，
  运行时的"返回位置"错乱。可以改成**不用 if_else**：在 `aldrop` 之前先算出"是否下标目标"到一个变量，
  然后：
  ```
  if <是下标目标>: pathset(...) ; stop this script??   ← 不行，会跳出整个 loop
  ```
  更稳的做法：**把两件事都做**——先按普通名字 `assign`，若是下标目标再用 `pathset` 覆盖一次
  （对下标目标而言 `assign` 会建一个无用的隐藏变量，但不再有控制流改动，风险最低）。
  下一轮先试这个"低风险版第 3 步"。

## 另一个发现（构建流程注意）

`assemble.cjs` 的 `parts` 数组要小心重复：本轮我用两次字符串替换把 `p248` 换进来又换出去，
结果 `p246.txt` 出现了两次，构建出 30,592 块（应为 30,557）。**每次改链条后都要核对
`Interpreter blocks / vars / total` 三个数字**，本轮已修正并复验为 30,557 / errors=0。


## 本轮解决的（补丁从"构不出来"到"能构建 + 能运行"）

四个匹配器/机制问题全部解决：

1. `grpScan`、`simpleLoop`：改用**显式 for 循环**（DSL 的 `find` 复合谓词会假阴性）。
2. `bind` 定位：`assign %s %s %s` 的**输入名是哈希过的**（不是 `vn/vv/vt`），
   而且值有两种形态 —— 块引用 `[3,id,shadow]`，或内联描述符 `[3,[12,'ev',id],shadow]`
   （注意是**嵌一层**）。改成"第一个输入是 `AName[...]` 的 `data_itemoflist`、第二个是变量 `ev`"来认。
3. **`setStack(parentId, slot, ids)` 要的是 id 数组，不是 `chain(ids)` 的返回值**
   （`chain` 返回的是链表头 id）。我一开始写成 `setStack(loop, 'SUBSTACK', chain([...]))`，
   报 `TypeError: Cannot set properties of undefined (setting 'next')`。

构建日志：`[P248] multi-token targets installed in assignlist` ✓，补丁能完整执行。

## 但新扫描有回归（所以仍未挂链）

| 套件 | v4.153 | 挂 P248 |
|---|---|---|
| `_star` | 7/12 | **2/12** ✗✗ |
| `_unp` | 13/13 | 12/13 ✗ |
| `_unp2` | 11/13 | 10/13 ✗ |
| `_paren2` | 15/15 | 14/15 ✗ |
| `_swap` / `_setflt` / `_nest` | 全绿 | 全绿 ✓ |

`_star` 从 7 掉到 2 说明**连最基本的 `a, *rest = [...]` 都坏了**，问题一定在新扫描本身
（`tgt`/`tlo` 的取值、`mi` 的推进、或 `AName` 现在存的是"目标全文"而不是"单个 token"导致的后续错位）。

## 下一步（第 45 轮）

先用探针把新扫描的实际产物打出来：对 `a, *rest = [1, 2, 3]` 在 `assignlist` 末尾
`fail` 出 `AName` / `AStar` / `ATgtLo` / `ATgtHi` 四个列表的内容（`listcontents()` 可直接拼进消息），
对照期望值 `[a, rest]` / `[0, 1]` / `[1, 3]` / `[1, 5]` 之类，一眼就能看出是"多切了逗号"
还是"星号偏移算错"。修正后再跑 `_star`/`_unp*`/`_paren2` 全套。


## 本轮修好的

* `grpScan`（`aui2` 循环）能匹配到了 —— 办法是**不用 DSL 的 `find` 复合谓词**，改成显式 `for (const id of al) { ... }`。
* `simpleLoop` 也能匹配了 —— 原因是原来的谓词要求"循环体**第一条**就是 `AName` 追加"，
  而实际第一条是 `*name` 的 `if_else`；改成沿 `.next` 走的链式查找即可。

## 三个真实的 DSL 陷阱（写进以后所有补丁的注意事项）

1. **`find([singleId], pred)` 不生效** —— 传"单元素数组"时总是返回空。凡是要判断某个具体块的
   子结构，直接取属性判断，或沿 `.next` 走链，不要用 `find([id], ...)`。
2. **`find` 配复合谓词会"假阴性"** —— 同一个循环，手工 `for...of` 循环四条子条件全 true、
   计数为 1；换成 `find(al, <同样的谓词>)` 却返回 0。**结论：定位一律用显式循环**。
   （怀疑与 `find` 的求值顺序／谓词内再调 `find` 有关，未深究。）
3. **`assign %s %s %s` 的输入名不固定** —— 直接 `.inputs.vn` 在一处拿到 `undefined`（说明该调用点的
   形参 id 不是 `vn`）。定位这类调用要先 `Object.keys(b.inputs)` 看实际名字，或按"某个输入是
   `data_itemoflist` 且 LIST 为 `AName`"来匹配。

## 还差最后一步

`bind` 定位改成"显式循环 + 检查 `Object.keys(b.inputs)` 里哪个输入是 `AName[aui]`"即可，
然后就能跑 `_star`/`_unp*` 三个套件看效果（P248 的另外两处改动已经能匹配）。

## 本轮的其他产出

* `_doc2.json`（字符串/docstring 边界 10 条）**全绿**（v4.153）；
* 用户两个原始程序 `_orig.json` **4/4**（v4.153）；
* `_star.json` 仍是 7/12（下标目标四条未修）。


## 完整实现方案已经写完（`_work/v41/p248.txt`，未挂链）

三处改动：

1. **左侧扫描**（`assignlist` 的简单路径，现在硬编码 `mi += 2`）：换成"按顶层逗号切、带括号深度"，
   目标**全文**存进 `AName`，token 区间存进新列表 `ATgtLo`/`ATgtHi`（`B.addList(IT, ...)` 创建，
   与 `AName`/`AStar` 逐项对齐）：
   ```python
   auex = 0
   if Kind[mi]=="O" and Tok[mi]=="*" and Kind[mi+1]=="I": auex = 1; auexs = 1; mi += 1
   if NOT(Kind[mi]=="I"): fail "SyntaxError: invalid assignment target"
   tlo = mi ; tgt = Tok[mi] ; tdep = 0 ; mi += 1
   repeat until mi > eqi-1 or (tdep == 0 and Tok[mi] == ","):
       if Tok[mi] in "([{" : tdep += 1
       if Tok[mi] in ")]}" : tdep -= 1
       tgt = tgt & Tok[mi] ; mi += 1
   AName += tgt ; AStar += auex ; ATgtLo += tlo ; ATgtHi += mi-1
   mi += 1
   ```
2. **"左侧含分组括号"的判定**：原来只要 LHS 里出现任何 `(`/`[`/`{` 就视为"括号分组"（于是
   `d["a"], d["b"] = …` 被误送进分组路径）。改成**只看每个目标的起始 token**：
   `aus`（目标起点标记）+ `aud`（深度）维护，`augrp = 1` 只在 `aus == 1` 且当前 token 是括号时置位。
3. **绑定**：`assignlist` 里唯一的绑定点是
   `aldrop(vn=AName[aui])` + `assign(vn=AName[aui], vv=ev, vt=evtype)`，
   改成"目标含 `[` 或 `.` → `pathset(ATgtLo[aui], ATgtHi[aui], evtype, ev)`，否则走原来的 assign"。
   （顺带：`*d["r"] = …` 也能因此正确 —— 星号分支产出的本来就是列表值。）

## 卡在哪

第 1、3 步的匹配器都通过了；**第 2 步的匹配器返回 0**，但手工核对显示那个循环明明符合条件：

```
loop bcontro_mgfzsfdv2  condOp=operator_gt  operand1Name=aui2
   body[0]=control_if  (condition opcode = operator_contains, STRING1 litOf = "([{")
```

即：谓词里"循环条件是 `aui2 > …`"、"体首是 `control_if`"、"`contains` 的 `STRING1` 是 `([{`"
三条单独都能对上，合起来却匹配不到。下一轮第一件事就是**在补丁里打印谓词各分支的结果**
（把四条子条件分别计数），定位到底哪一条在 `find` 的求值环境里不成立。
猜测方向：`reach` 集合里的块在补丁执行到第 2 步时已经因为第 1 步的 `setStack`/`spliceAfter`
被替换过（我第 1 步恰好改的是**同一个 `assignlist`**，且清空列表的插入点在它最前面）——
需要把第 2 步的匹配放到第 1 步之前，或基于 `allIds()` 而不是 `reach` 来匹配。

## 本轮的其他产出

* `_doc2.json`（字符串/docstring 边界 10 条）**全绿**，作为常驻回归套件；
* 用户两个原始程序在 `_orig.json` 里 **4/4**（v4.153 起）。


## 1. 新回归套件 `_doc2.json`（10 条，v4.153 全绿）

| 用例 | 结果 |
|---|---|
| `'''doc'''` 单行 / 多行 | ✓ |
| `"""it's fine"""`、`"""has "" inside"""` | ✓ |
| `"a\"b"`、`"a\\b"` | ✓ |
| `"""a = [1, 2] (x) {y}"""`（内容里有括号/等号） | ✓ |
| `"" + ""` | ✓ |
| docstring 后面还有代码 | ✓ |
| **表达式里的三引号**：`len("""abc""")` | ✓ |

即 P245/P246（三引号 + 跨行续行）在单引号/双引号、单行/多行、嵌套、转义、表达式位置上都没有漏，
值得作为常驻回归套件保留。

## 2. 下标目标的真正根因（比上一轮更精确）

上一轮定位到 `unpackto` 用 `assign(vn=<目标文本>)`（按**变量名**绑定）。这一轮继续往里看
`assignlist %s`（它负责把左侧目标切成"名字列表"）：

```
deletealloflist AName / AStar / AVal / AType
mi = 1
repeat until mi > eqi-1:
    auex = 1
    if Kind[mi] == "I":  auex = 0      # 不是标识符就不是合法目标
    if NOT(Kind[mi] == "I"): fail "SyntaxError: invalid assignment target"
    addtolist AName  Tok[mi]           # ← 只记**一个 token**当名字
    addtolist AStar  auex
    mi += 2                            # ← 每 2 个 token 一个目标（"名字," 的硬编码假设）
```

**`mi += 2` 是硬编码**：它假设左侧形如 `name, name, name`（名字 + 逗号，各占 1 个 token）。
所以：

* `x, d["k"] = 10, 20` → 目标被切成 `x` 和 `d`（`["k"]` 被当成"下一个目标的前缀"跳过）→
  `d["k"]` 静默丢失；
* `d["a"], d["b"] = 1, 2` → 目标扫描错位，走到另一条分支把 `d["a"]` 当表达式求值 → `KeyError: 'a'`；
* `(d["a"], d["b"]) = (3, 4)` → 进了 P228/P230 的括号目标分支，最终仍以"奇怪的名字"建了隐藏变量。

**要真正修好，必须把 `assignlist` 的左侧扫描从"每 2 个 token 一个目标"换成"按顶层逗号切、
支持多 token 目标（下标 `a[k]`、属性 `a.b`、括号组、星号）"，并让 `unpackto` 拿到每个目标的
token 区间**（`indexset(lo,hi)` / `pathset(lo,hi,vt,vv)` 这两个底层过程本来就是按区间工作的，
`pathset` 还是 `d[k] = v` / `o.a = v` 的实现）。

设计（下一轮实施）：

1. `assignlist` 用带深度的逗号扫描切目标，新增两个列表 `ATgtLo` / `ATgtHi`
   （用 `B.addList(IT, 'ATgtLo', [])` 创建；`IT` 在补丁作用域里可用，见 P150 的写法），
   与 `AName`/`AStar` 逐项对齐；
2. `unpackto` 绑定目标 k 时：若 `AName[k]` 含 `[` 或 `.` → 用 `ATgtLo/Hi[k]` 调
   `pathset(lo, hi, vt, vv)`（值/类型就是当前元素的值 ✓，**不要**像 P247 那样重新 tokenize，
   那会冲掉当前语句的 `Tok`/`Kind`，上一轮就是这样把 `_unp` 13→9、`_unp2` 11→7 的）；
3. 否则维持原 `assign` 路径不变（保证零回归），逐套件回归。
