# MiniPy v4.205 更新说明

## 本轮目标

按《已知问题清单_v4.204.md》§A 继续升级：修复多维度复杂用例暴露的 B1–B14
根因及两个既有问题新表现（对应 _cov205 的 18 个失败用例）。

结果：**_cov205 套件 18 → 8 失败（修复 10 例）；581 全套 28 → 28（回归 0、
broke 0）；补充 82 例 8 → 8（broke 0）；check41 35,172 块 errors=0。**

## 一、修好的根因（11 个完全修复 + 3 个部分修复）

| 编号 | 问题 | 修法（补丁） | 套件救回 |
|---|---|---|---|
| B1 | `is not` 恒偏 False（实际按 `X is (not Y)` 解析） | eval 调 pair 传的是原始 token `Tok[ecut]` 而非合并后的 `isnot`，pair 只对 `not in` 做了重查——pair 的 isnot 分支条件扩为 `op=='isnot' or (op=='is' and Tok[cut+1]=='not')`（P508） | linked list class、bst insert and inorder |
| B2 | `list.append` 实参求值污染接收者寄存器 xa/xb/lmeth（内层方法调用把 lmeth 改名后，append 分支无 stop 跌落进 `if lmeth=='pop'` 等分支**用外层接收者再跑一次**；兜底误报 `'list' object has no attribute 'upper'`） | methodcall 的 9 个 list 方法分支：末尾补 stop + 带 eval 的分支用 MCSav 栈在实参求值前后保存/恢复 xa（P513） | manual title case、josephus problem |
| B3 | `filter(谓词, …)` 返回谓词布尔 | filter 分支 `truth(vv=mpel)` 判的是**元素**真值（全保留），且 `set mpelt=evtype` 把元素类型污染成 B——truth 实参改 ev/evtype + mpelt 反转恢复（P509） | map filter composition |
| B4 | 内联多参 lambda 被逗号扫描拆散（`lambda a` / `b: a+b` 各成实参） | eval 调用分派/calluser/dictlit 三处逗号扫描加 lambda 头部跳过（深度 0 遇 `lambda` 置 lamq=1、遇 `:` 清 0，lamq 期间逗号不计）（P515） | manual fold reduce |
| B5 | lambda 闭包在嵌套调用里失效（`f(g(x))` 查不到 g） | lookup 的闭包回退用调用栈顶的 CloL——栈顶是 f 的帧而非 lambda 帧；改为从栈顶向下找最近 lambda 帧（FnKind=='L' 且 CloL>0）（P516） | （N17/C1 探针通过；decorator 案例另卡链式调用） |
| B8 | `__init__` 内构造实例且实参引用 self（`return W7(self.x+k, …)`） | 单参已有的 vmOn=1 预求值推广到多参：callfn/callfnW 先整段 eval（顶层逗号→tuplelit），vmOn=2；calluser 绑定点把元组拆进 UArgV；分派条件放宽 vmOn!=0（P517+P521） | operator overloading vector 部分（Z1–Z3、M8 探针通过） |
| B9 | 元组赋值 RHS 含 `%` 炸 ZeroDivisionError | assignlist 存在**两份**顺序执行的逐元素实现：第一份赋值后无 stop 跌入第二份用新值重算——stop 插入 augrp==0 分支末尾（P510；曾错插在第二份开头导致嵌套目标 `g,(h,i)=…` 整体被跳过，已修） | （gcd 另卡 UnboundLocal，见剩余） |
| B10 | dict 字面量作实参把外层列表拖进元素（`recs.append({'name': f[0]})` → recs 变 `['a','3',{…}]`） | 同 B2 根因：实参里的 indexget 用 xa/xb 作目标寄存器，xa 变成 f 的编码——B2 的 xa 守卫覆盖（P513） | csv parse |
| B11 | 括号字符串 dict SyntaxError（`{')': '('}`） | eval 的 dict 分派扫描、dictlit/dictpair 的深度计数只比文本不看 Kind——三处深度增减 AND 上 Kind != 'S'；dictpair 冒号改取**第一个**顶层冒号（lambda 体冒号也在深度 0）（P518+P520） | bracket matcher |
| B12 | `__contains__` 未接入 `in`、dict 的 in 报错 | rightside 的 in 分派前把 D 用 dictkeys 转键列表复用列表搜索；O 型且类有 `__contains__` 时左值存 __cin、右侧首 token 临时改写后 callmeth 求值（P518+P519） | container dunder protocol |
| B14 | hasattr 缺失 | callfn/callfnW 开头加 hasattr 分支（O 查实例 IAttr+类方法表+类属性，C 查方法表）+ eval 的 callable 门控放行（P519） | （M21 探针部分通过；e.args 未存导致 M7 仍差半步） |
| 新 | map/filter 嵌套组合共享 mp* 全局（`map(f, filter(...))` 内层把 mpisMap 清 0 → 外层误走 filter 分支） | 可迭代 eval 前后用 MPSav 栈保存/恢复 mpisMap/mpisId/mpfn/mpbin（P514） | map filter composition 第 3 行 |
| 新 | 通用链式调用 `expr(...)` 无分派路径（`compose(...)(5)`、`ops['add'](6,3)`） | eval 最终 fail 前：Tok[hi]==')' 时从右找配对 `(`，先 eval 前段，F 值存 __chain 后 callfn（P520） | （部分；dict 取出的 lambda 仍报 not callable） |
| B13 | `Exception.__init__` 不可调用 | callcls 的 fail 前：Exception 及其子类的 `__init__` 求第二实参 aset 到实例 __msg__（P519，部分——M19 探针仍差 str(e)） | — |

P512（属性赋值 RHS 求值污染 iid，`self.e = E()` 把属性挂到 E 实例名下）改为
重推导方案：RHS 求值后重新 `lookup(Tok[1])` 恢复 iid。

## 二、未完成（剩余 8 例）

| 用例 | 现状 | 归属 |
|---|---|---|
| quicksort recursive / gcd lcm euclid | UnboundLocalError（递归帧局部变量为全局槽位，跨帧覆盖） | 帧语义（N4，动面大） |
| operator overloading vector | `__mul__` 报 unsupported operand | B6 残留 |
| class variable counter | `__init__` 写类属性后 `.bump` 失效——读路径已改 clsiid，但增强赋值重派发后的**写路径**回退仍把类名写进 iid 并泄漏回构造器 | B7 残留 |
| recursive flatten | 递归帧局部列表跨帧共享身份 | 返回值别名（Q22） |
| decorator manual wrap | `compose(...)(5)` 链式调用 | P520 残留 |
| exception with attributes | `Exception.__init__` 消息存储不完整 + e.args 未存 | B13 残留 |
| dispatch table with lambdas | dict 取出的 lambda 链式调用 | P520 残留 |

**重要教训（下轮注意）**：
- `predecessorOf`/`refOf` 在共享 `.next`/多所有主块上会撒谎——插入语句一律先在
  目标分支的链上行走确认前驱（P510/P512/P513 三次踩坑）。
- `JSON.stringify(条件块)` 只含块引用，文本字面量在嵌套子块里——匹配条件必须
  遍历条件子树（P515/P518/P520 三次踩坑）。
- 给过程体**首句**插入语句要么用 refOf 重写 SUBSTACK 输入、要么链上行走；
  `insertBeforeStmt` 对体首句安全但对中间语句依赖前驱唯一性。
- 构造器收尾 `set ev = iid` 的污染（B7/B8）：栈式保存/恢复的 pop 会破坏方法帧内
  构造器（Z3），clsiid 方案只覆盖读路径——写路径回退的泄漏未解。
- 串行套件里前一用例超时/中断会污染后续用例（mixed data shuffling 的假失败），
  定性前必须隔离重跑。

## 三、验证

| 项目 | v4.204 | **v4.205** |
|---|---|---|
| _cov205（77 例） | 18 失败 | **8 失败（修复 10）** |
| 581 全套 | 28 失败 | **28 失败（回归 0、broke 0）** |
| 补充 82 例 | 8 失败 | **8 失败（broke 0）** |
| check41 | 34,493 块 errors 0 | **35,172 块 errors 0** |

复现命令：

```bash
cd D:/编程/scratch/ai/minipython
node _work/v41/assemble.cjs && node _work/v41/build41.js   # -> MiniPy_v4.205.sb3
node _work/v41/check41.cjs MiniPy_v4.205.sb3
node _work/v41/runall.mjs MiniPy_v4.205.sb3 _work/v41/_res205fin _work/v41/_cov205{a,b,c,d,e}.txt
node _work/v41/runall.mjs MiniPy_v4.205.sb3 _work/v41/_res205fin _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt
node _work/v41/run_iso.mjs MiniPy_v4.205.sb3 _work/v41/_gap131.json _work/v41/_gap131_205.out.json g205
node _work/v41/cmp131.cjs _work/v41/_res205fin _work/v41/_res204
```

补丁清单：p508（B1 is not）、p509（B3 filter）、p510（B9 assignlist）、
p511（B7 类属性读路径 clsiid）、p512（属性赋值 iid 重推导）、p513（B2/B10
methodcall 守卫）、p514（map/filter 嵌套）、p515（B4 lambda 逗号）、p516（B5
闭包链）、p517+p521（B6 多参构造预求值）、p518（B11 Kind 守卫+dict in）、
p519（B12/B13/B14）、p520（dictpair 首冒号+链式调用）。

## 四、下一步建议

1. **帧语义**（quicksort/gcd/flatten，3 例）：局部变量改帧槽位或给容器引入
   引用语义——动面大但一劳永逸。
2. **B7 写路径**：属性赋值分支 found==0 回退改用 clsiid，cX 扫描/写入按
   found 分流 attrkey——注意 P512 重推导需同步。
3. **B13 收尾**：raise 路径存 `args` 元组（callfn 异常分支在 strval 前保存
   原始 ev），hasattr 即可全绿。
4. **链式调用收尾**：dict/索引取出的 F 值走 __chain 时 indexget 的返回类型
   需核查（dispatch table 1 例）。
