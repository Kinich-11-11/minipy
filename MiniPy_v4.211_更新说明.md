# MiniPy v4.211 更新说明

**构建**：`MiniPy_v4.211.sb3`（2026-11-04，37,442 块，check41 errors=0）
**依据**：《MiniPy_v4.209_新套件测试报告.md》§三/§四 + 《MiniPy_v4.210_更新说明.md》§四（剩余 11 项）。
本轮修掉剩余项里的 **5 项**（E4、A3、D1、D2、E1），另带 1 项工程性收益（跨用例栈残留清理）；
A1/A2/E2/E3 及两个声明边界仍是对象堆 / 帧快照 / 惰性生成器三条既定路线的范围，
其中 E2 本轮已收敛出**新的最小复现**（见 §五），下一轮可直接动手。

## 一、结果总览

| 套件 | v4.210 | **v4.211** | 说明 |
|---|---|---|---|
| `_new1~6`（主套件 102 例） | 89 过 13 败 | **93 过 9 败** | 修掉 4 例 |
| `_new7~10_probe`（探针 62 例） | 49 过 13 败 | **53 过 9 败** | 修掉 4 例 |
| `_iso209`（隔离复跑 26 例） | 13 败 | **10 败** | 修掉 3 例，0 新增 |
| cov 回归（`_cov1~10`/`_covheap`/`_cov205a~e`/`_covC/D/X/Y/Z`，674 例） | 661 过 13 败 | **661 过 13 败** | **回归 0**（逐例同名同因，脚本比对 fixed=0 / broke=0） |
| `_gap131`（82 例） | 77 过 5 败 | **77 过 5 败** | **回归 0** |

主套件+探针合计 **164 例 138→146 过**。v4.210 基线由本轮在本机重建
（`_v4210check.sb3`，37,236 块，与随包产物一致）并复跑确认。

## 二、修掉的 5 项

| 编号 | 症状 | 补丁 |
|---|---|---|
| **E4** | `@dec` + `def f` 报 SyntaxError | **P571** |
| **A3** | `b = a if flag else [2]` 不建别名 | **P573** |
| **D1** | 递归方法丢兄弟分支字段（BST 3 节点 `root.r` 被冲掉） | **P572** |
| **D2** | 深递归方法 `LimitError: expression depth`（6 节点 BST inorder） | **P572**（同根，LimitError 消失，剩余错误见 §五 E2'） |
| **E1** | 闭包经 compose/lambda 间接调用丢变量（`NameError: k`） | **P574** |

连带收益（不在清单上）：**跨用例栈残留清理**（P572 内）——RUN 起点补清
`CloB/CloL/CloN/CloV/CloT/FnStack/PairPile/PairDep/ArN/ArO/DefWr/DefWrC/FrAr/UleC/DfN/DfV/DfT/GYBase/SvStk`。
此前出错用例中途停机后这些帧栈列表整体残留，同一 VM 里后续用例被污染
（同一份代码单跑过、套件里跑就挂的假性失败都源于此）；RUN hat 原有的
clear 清单漏掉了这批"只进不出"的栈列表。

## 三、补丁明细与根因

### P571 —— `@decorator` 语法（E4）
两条挂点：
1. execute 新增 `head=='@'` 分支：把 Code[pc] 去掉首字符存进 `DecExp`、行号存进
   `DecLn`，`pending=1` 正常推进（不再落到兜底 eval 报 SyntaxError）。
2. def 分支 regdef 之后：`DecExp` 非空时拼出 `dec ( f )` 经 tokenize+eval 真调用
   装饰器；返回 F 值（=FnName 下标 widx）就在全部 14 张并行表上**追加**一个同名
   条目、各槽复制 widx 现值（FnPO/CloB/FnLocB/FnXcB 别名共享源函数的变长段）。
   **不能原地改写原 def 条目**：装饰器闭包捕获的正是原条目的下标，原地改会让
   wrapper 的 `f` 自指成 wrapper → 无穷递归；追加后 calluser/裸名求值都取"最后
   一个同名条目"（与 regdef 重定义同一机制），闭包里的旧下标仍指原函数。
   **调用期 Tok 保护**：calluser 退出会 `tokenize(Code[pc])` 把 Tok 冲成"当前行"，
   eval 的链式调用重扫读到被冲的 Tok 会误判出第二跳（探针实证
   `DBG-CU[echo,3,3]` 之后紧跟 `DBG-CU[g,4,3]`）→ 求值期间先把 '@' 行**临时改写
   成 dcx**、pc 指向它，让重扫看到的正是本次求值的原始记号，求值完恢复。
   另外**必须先清 DecExp 再求值**：装饰器体内还有 def 语句（def wrapper），不先
   清会在嵌套 def 分支里二次套用 → 无穷递归。
   边界：装饰器须返回函数；`@` 链（多行装饰器）与方法/类装饰器不支持；
   `@addn(10)` 这类"装饰器工厂"仍会撞上三级闭包捕获的边界
   （`NameError: k`，与 compose 同族但深一层，P574 的逐帧扫描能找到帧内
   闭包段，但这里 k 在"上上级"帧的闭包段里——见 §五同族问题，未计入清单）。

### P572 —— s1s/s1v/s1t 寄存器栈化（D1/D2）
`callmeth` / `callfn`（类实例化）/ `callmethW` / `callfnW` 四处保存"旧 self 行"
用的是**同一组全局寄存器 s1s/s1v/s1t**，且不随嵌套入栈。方法体内一旦再发生
①嵌套方法调用（callmeth 重入）或②`self.x = Ctor(...)` 右侧实例化（callfn 类分支
重入），先期保存的 s1v 就被冲掉；返回时恢复把 self 写成内层对象 → 递归方法的
兄弟分支字段被冲掉。这是铁律 7（全局临时寄存器被嵌套调用冲掉）的方法版，
也是 v4.209 报告"疑与铁律 7 同型"的实锤。修法：四处保存点改为
"旧值入栈 SvStk（s1s,s1v,s1t）→ … → `self = clf` 恢复后出栈还原"
（s1s/s1v/s1t 全库仅这四处使用，栈化无副作用）。
实测：BST 三节点 `[5,3,1,8]` 恢复正确；6 节点 `LimitError: expression depth`
消失（D2 的深度累积正是被腐蚀的递归形态造成的）。
附带：RUN 起点补清帧栈列表（见 §二连带收益）。

### P573 —— 条件表达式建别名（A3）
P54 只认 `b = a`（count==3）、P557 只认 `b = f(...)` 单调用形态，三元求值后
来源名信息丢失。修法：eval 入口的三元分支求值完被取分支后，若**被取分支恰为
单个标识符**就记进 `alsrc`；execute 赋值分支里 RHS 形如 `X if C else Y`
（`Tok[4]=='if'` 守卫）且 alsrc 非空、evtype 是容器时补 `alrec(name, alsrc)`。
条件为假且 else 分支是字面量时 alsrc 为空 → 不建别名（与 CPython 一致）；
`Tok[4]` 守卫挡住 `f(a) if c else d` 等非三元顶层形态，不与 P557 冲突。
实测：真/假两个方向、else 分支也是变量名、`b = a` 既有别名回归全过。

### P574 —— 闭包回退逐帧扫描（E1）
lookup 的闭包回退：FnStack 从栈顶向下找**第一个 FnKind=='L' 的帧**，然后只
用它的闭包段。D 类嵌套函数（闭包）从另一个函数/lambda 帧内被调用时
（compose/工厂返回的函数正是这样被调用的），栈顶帧就是那个 D 帧、它的闭包段
里就有 k——旧逻辑跳过它继续向下找 lambda，用了错误的闭包段 →
`def mk(k): def ap(x): return x*k; return ap` 经 compose 间接调用报 NameError。
修法：候选帧**逐帧扫描其闭包段**（CloB[c]..CloB[c]+CloL[c]-1 中真含有 vn 才选
它），从栈顶向下，第一个含名的帧获胜——lambda 行为是本修法的子集。
实测：`function factory compose`、`probe closure param through compose`、
iso209 `function factory compose` 三例转绿；lambda/闭包既有用例无回归。

## 四、仍存在的问题（6 项，按路线归档）

| 编号 | 症状 | 归档路线 |
|---|---|---|
| A1 | 容器槽是快照（`d['r']=row; row.append(2)` 不反映；matrix trap 三行不共享） | 对象堆 |
| A2 | `[[0]]*3` 不共享内层对象 | 对象堆 |
| A3' | `b = [2] if c else a`（假分支是变量名、真分支是字面量）不建别名——P573 只记"被取分支为单标识符"的形态，此形态的被取分支在 else 侧且需按求值结果区分，留待下轮补 | 别名形态扩展 |
| E2 | 嵌套函数/方法递归状态污染（four queens / dfs / permutations / BST 6 节点） | 帧快照（见 §五新复现） |
| E3 | 生成器 `while True` 挂死（急切求值模型无法构造无限生成器） | 惰性生成器重写 |
| — | `print(a, a.reverse(), a)` 首参快照 | 报告 §二 声明边界 |
| — | `map(pow, [2,3], [3,2])` 内建名作双序列回调 | P488 边界延伸（无既有用例，未动） |

## 五、E2 的新最小复现（本轮收敛，下一轮入口）

P572 之后 BST 3~5 节点已正确，剩余失败全部指向**同一新形态**：
"方法体内**属性读→方法调用→再属性读**交错时，第二次属性读返回第一次的值"：

```python
class N:
    def __init__(self, v, a, b):
        self.v = v; self.a = a; self.b = b
    def vals(self):
        out = [self.v]
        if self.a is not None: out.extend(self.a.vals())
        if self.b is not None: out.extend(self.b.vals())
        return out
l0 = N(0, None, None); r2 = N(2, None, None); l1 = N(1, l0, r2)
top = N(5, l1, None)
print(top.vals())   # CPython [5, 1, 0, 2]；MiniPy [5, 1, 0, 2, 1, 0, 2]
```

插桩 trace 显示第二个 if 里 `self.b.vals()` **实际调用了 l1.vals()**（把 self.a
的值当成了 self.b）——即 `self.b` 这次属性读拿到了 `self.a` 的值。
关键事实（全部实测，供下轮定位）：
- 纯递归 + extend（无类）✅；递归方法 + extend（receiver 是 `self`）✅；
  属性链 + 单个 extend（`c.child.vals()`）✅；方法内两次属性读（数值属性）✅。
- 坏的形态限定为：**同一方法体内、第一个"属性接收者方法调用"之后**的
  属性读/方法调用。疑点集中在 methodcall 的接收者寄存器（`cselfr`/`xa`/`iid`）
  在"属性接收者"路径上未被保存恢复——是铁律 7 的又一形态，与 P49/P563/P572
  同族，可用同样的 VStack 手术处理。
- four queens / dfs / permutations 的剩余失败与本复现同族（递归帧内第二次
  属性读/容器方法交错）。

## 六、工程记录（给下一轮）

- **本机迁移**：工程从 `D:\编程\...` 迁到 `C:\Personal\个人\编程\...`，已把
  `assemble.cjs`/`head.txt`/`p56.txt`/`runall.mjs`/`dbgrun2.mjs` 里的硬编码路径
  改到新机器（scratch-vm 在
  `C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm`，
  python 用 PATH 上的 `python` 3.14.10）。
- **dbgrun2 在本机会挂**（项目加载阶段卡死，两次实证）。新写了
  `dbgrun3.mjs`（基于 runall 的加载/运行路径 + 单例 dump，`node dbgrun3.mjs
  <sb3> <txt> [vars] [lists]`），本轮全程用它。
- **calluser 退出时 `tokenize(Code[pc])` 会冲掉 Tok**：eval 里 callfn 之后的
  一切 Tok 读取（如 P375 的链式调用重扫）都暴露在这个坑上。本次用
  "'@' 行临时改写为求值源 + pc 指过去"绕开；下一轮若再造"eval 中段调函数
  后继续用 Tok"的挂点，优先考虑把重扫需要的记号先另存。
- **补丁坑三则**（老坑新踩）：
  1. 全局寄存器 vs 过程参数：`tifs/tels/truthv` 是全局变量，插在 eval 里必须用
     `VAR(...)`，用 `argOf(...)`（参数报告器）会静默求值成空串（P573 第一版因此
     不生效）。
  2. `replaceStmt` 本轮用法安全（newId 是无后续链的单块）；老坑仍是"newId 带
     next 链时先记 rest 再 replace"。
  3. 查找锚点要防 webfix 的 inline：控制块可能是 `control_if_else`（三元分支、
     实例化分支都是），锚点谓词要同时接受两种 opcode；定位歧义时以
     "子栈里能找到特征块"为准（P573 的 ternIf 二选一）。
- **补丁顺序**：`p571 p572 p573 p574`，全部在 `tail.txt` 前；
  `node assemble.cjs && node build41.js`（V41_OUT/V41_STAMP 覆盖目标）。
- 结构校验：`node check41.cjs MiniPy_v4.211.sb3` → 37,442 块，errors=0。
- 结果目录：`_res211w2/`（P573 后主套件）、`_finalMain/`（最终主套件）、
  `_reg211a/`+`_reg210base/`（回归对照）、`_iso211/`+`_iso210b/`（隔离对照）、
  `_e2res*/`（E2 新复现探针）、`_bs1~7.txt`（BST 逐级收敛用例）。
