# MiniPy v4.210 更新说明

**构建**：`MiniPy_v4.210.sb3`（2026-10-31，37,236 块，check41 errors=0）
**依据**：《MiniPy_v4.209_新套件测试报告.md》§三（22 个新问题）+ §四（修复优先级）。
本轮按报告给的优先级修掉 **11 项**（含报告点名的全部 P1–P5 家族），另附 2 项连带收益；
剩余 11 项仍是对象堆 / 递归状态 / 特性缺口三条既定路线的范围。

## 一、结果总览

| 套件 | v4.209 | **v4.210** | 说明 |
|---|---|---|---|
| `_new1~6`（主套件 102 例） | 76 过 26 败 | **89 过 13 败** | 修掉 13 例 |
| `_new7~10_probe`（探针 62 例） | 29 过 33 败 | **49 过 13 败** | 修掉 20 例 |
| cov 回归（`_cov1~10`/`_covheap`/`_cov205a~e`，474 例） | 468 过 6 败 | **468 过 6 败** | **回归 0** |
| 其余 cov（`_covC/D/X/Y/Z`，200 例） | 198 过 2 败 | **198 过 2 败** | **回归 0** |
| 补充套件 `_gap131`（82 例） | 80 过 2 败 | **81 过 1 败** | 修掉 1 例 |
| 隔离复跑 `_iso209`（26 例） | 26 败 | **14 败** | 12 例修复，0 例新增 |

三套回归的失败清单与 v4.209 **逐例同名同因**（脚本自校验：`NEW FAILS vs v4.209: 0`）。

## 二、修掉的 11 项

| 编号 | 症状 | 补丁 |
|---|---|---|
| **C1** | `def f(x, seen=[]): return x in seen`，第二次调用报 `TypeError: in requires strings`；`d.get(k)` 形报 `AttributeError: only lists have methods` | **P560** |
| **C2** | `a = acc(1); b = acc(2); a.append(9)` → b 不跟着变 | **P568** |
| **B1** | `def q(x): x.append(1); x = [7]; x.append(2)` 写穿调用方的 lst | **P561** |
| **B2** | `def swp(a): a[0],a[1] = a[1],a[0]` 不写回；heap sort / 冒泡 / 插入排序全错 | **P562 + P569** |
| **G1** | `dp[i-1][c-ws[i-1]]` → IndexError；`dp[1][ws[1]-1]` 取错值 | **P563** |
| **G2** | `romans[s[0]]` → KeyError: 'M'；anagram 分组失败 | **P563** |
| **D3** | `class Str:` 实例化变空字符串；`class Int` 同类问题 | **P564** |
| **F1** | `map(lambda a,b: a+b, xs, ys)` → SyntaxError；def 回调 → missing argument | **P567** |
| **F2** | `enumerate(xs, start=1)` → SyntaxError | **P565** |
| **F3** | `sorted(..., key=..., reverse=True)` 等键组被翻转 | **P566** |
| **F4** | `def conv(s): try: return int(s) except ValueError as e: return str(e)` → `ValueError` 而不是消息 | **P570** |

连带收益：**anagram grouping**（G2 同根）、**gap131 的 tuple element path alias**（B2 同根）。

## 三、补丁明细与根因

### P560 —— 可变默认参数写回读"活行"而非残留的返回值（C1）
P547 的帧尾写回用 `lookup(参数名)` 定位行，但**全库约定 lookup 只设 `found`，不设 `ev/evtype`**；
写回却把 `evtype+ev` 写进 `FnDef[fu]`——那是**函数返回值**（最后一次求值的残留）。
`return x in seen` 第一次返回 `False`，`FnDef[seen]` 就变成 `'\x1fB0'`，第二次调用 `seen`
绑定成数字 0 → `in` / `.get` 报类型错。只有 `return buf` 这种"返回值恰好等于参数现值"的形态
侥幸正确。修法：写回与 `DfV/DfT` 暂存全部改读 `Types[found] / Values[found]`。

### P568 —— 默认槽捕获优先于"继承行"测试（C2）
P547/P559 的帧尾落账会在**顶层**留下一个 `buf` 行（既有怪癖，本轮不动）。下一次调用的变量表
以调用者行为起点，`buf` 只是覆盖那份拷贝（行号 ≤ `FrRBase`），P553 的 FrRBase 测试于是把它
当成"继承行"（rrK=1），`rrN` 记成 `'buf'` 而不是 `'__dfv<fu>'`，b 配到一个无人写回的死行上。
修法：调整捕获次序——先跑 defWrScan（DefWr 命中 → rrK=2 + `__dfv<fu>`），没命中再落到
FrRBase 继承行测试。

### P561 —— 参数重绑定解除实参配对（B1）
写穿通道是 P169 的 `publish → wpub → wscan(ArO 名字)`，而 ArN/ArO 只在帧进出时增删——
重绑定 `x = [7]` 走 aldrop（只清 AliasN/T 与 PthN），ArO 里的 `'lst'` 原样保留，出口 Names
重建时把 x 的现值写进 lst（探针实证：函数内 `print(lst)` 一直是 `[0]`，返回后才是 `[7,2,3]`）。
修法：新过程 `pbreak <name>` 从表尾找最里层 `ArN==name` 的登记、把 `ArO` 置空；
挂在 execute / assignlist / strfmt / minkey 四处 `aldrop(AName[..])` 之后（`alrec` 内部的
aldrop 不能挂——那会掐断刚建的配对）。

### P562 + P569 —— 元组交换写回（B2）
两层根因：
1. indexset 的多目标分支（MCom）对每个目标做 lsetv/dsetv + assign，但与单目标路径不同，
   **结尾没有 publish**，P169 的写穿通道完全没触发（P562：补 lookup+w1v/w1t+wpub 三步；
   不用 `publish()` 本体，因为 `b = a[:]` 这类切片拷贝被既有机制记成了别名对，publish 的
   别名游走会把排序副本写回原列表——`bsort(data)` 的既有用例因此回归过）；
2. 写回到**中间帧的局部名**仍被 P539 的守卫挡住（`def outer(b): h=b[:]; touch(h)`）。
   P539 防的是"被调帧的同名局部污染父帧备份"，而 `wpub` 命中 ArO 后的 `wscan(实参名)`
   是**配对实参**的合法写穿。P569 加旗标 `wzok`：ArO 分支置 1、hit==0 分支清 0，
   P539 的跳过守卫改成 `wz1==0 OR wzok==1` 时放行。

### P563 —— indexget 的基址寄存器在求值期间入栈（G1/G2）
`romans[s[0]]` / `dp[xs[1]]` / `dp[i-1][c-ws[i-1]]` 全错。根因（铁律 7 的 indexget 版）：
indexget 先 eval 基址 → `xa/xb`，再 eval 下标；下标里的嵌套下标会**重入 indexget**，把全局
`xa/xb/igev` 冲成内层的值。P49 已用 VStack 保护过 `xbr`，本补丁把同样的保护套到 11 个
非基址 eval 点：求值前推栈、求值后弹栈恢复。

### P564 —— 零参内建快捷通道给已注册类让路（D3）
Scratch 等号**大小写不敏感**：zeroarg 的 `if x9fn == "str"` 把 `Str` 命中成 `str()` 的零参
分支（`ev=''` type S）直接 stop，`fn in ClsName` 的实例化分支没机会跑（`class Int` 同理）。
修法：zeroarg 之前用 iscls（compareText，大小写敏感）查一次类名表，是已注册类就跳过快捷通道。
带实参的 `Str('x')` 本来就好（走 narg>0 路径），不受影响。

### P565 —— `enumerate(xs, start=<expr>)`（F2）
P175 只支持位置形态；kw 形态里没有额外顶层逗号，钩子不触发。修法：start 的求值区间从
`e2p+1` 改为新寄存器 `e2s`，逗号扫描后判定 `start` `=` 三记号前缀再决定 `e2s`。

### P566 —— `sorted(key=..., reverse=True)` 稳定性（F3）
原实现是稳定升序拾取 + 整体 `lrev`，等键组被翻转。修法：`srtkey` 在 `lsort` 之后，若
`p4rev==1` 就把 `P4Key` **复制**到 `P4RevK` 上做稳定降序冒泡（"严格小于才交换"），
再用副本重建 `p4sk`；`P4Key` 本体必须保持原序（walk 靠它把排序键对回元素位置——第一版
直接冒泡 `P4Key`，结果所有键对不上、返回空列表）。eval 钩子在 `srtkey` 前先求 reverse
真值进 `p4rev`；`lrev` 只在无 key 路径执行。

### P567 —— `map(callback, seq1, seq2)`（F1）
两个洞：首实参是 lambda 时，第一个"顶层逗号"切进了 lambda 形参表；两个序列被当成一个
元组实参。修法：首实参是 `lambda` 时先找 depth-0 冒号、从冒号后重扫首个顶层逗号；再记
第二个顶层逗号 `mp2`，走双序列循环（zip 最短语义），`p4v/p4v2` 经 `callval` 拼成
`repr1, repr2` 两个实参。filter 带多余实参按 CPython 报 TypeError。

### P570 —— `return <抛异常的表达式>` 不再跳过同帧处理器（F4）
execute 的 return 分支里 `retflag = 1` 是**无条件**的；eval 抛异常时 error 已置位，
trycatch 把 error 清掉、pc 指到处理器时 retflag 仍是 1 → calluser 的函数体循环立刻退出，
处理器一行都没跑，帧返回残留的 ev（实例绑定前奏留下的类名字符串）。修法：`retflag = 1`
包一层 `if error == ''`。对照：`try: x = int(s) except ...: return e` 一直是好的
（普通赋值不置 retflag）。

## 四、仍存在的 11 项（按路线归档）

| 编号 | 症状 | 归档路线 |
|---|---|---|
| A1 | 容器槽是快照（`d['r']=row; row.append(2)` 不反映；matrix trap 三行不共享） | 对象堆 |
| A2 | `[[0]]*3` 不共享内层对象 | 对象堆 |
| A3 | `b = a if flag else [2]` 不建别名 | 对象堆 / 别名形态扩展 |
| D1 | 递归方法丢兄弟分支字段（BST 3 节点） | 方法版铁律 7（iid/self 寄存器保存） |
| D2 | 深递归 `LimitError: expression depth` | 同 D1（状态被递归调用累积腐蚀） |
| E1 | 闭包变量经 compose/lambda 间接调用丢失 | FnSlot 化 |
| E2 | 嵌套函数递归状态污染（four queens / dfs / permutations） | FnSlot 化 |
| E3 | 生成器 `while True` 挂死 | P52 声明的"急切求值"边界 |
| E4 | `@decorator` 语法不支持 | 特性缺口 |
| — | `print(a, a.reverse(), a)` 首参快照 | 报告 §二 声明边界 |
| — | `map(pow, [2,3], [3,2])` 内建名作双序列回调 | 内建名作值（P488 边界）的延伸 |

**D1/D2/E2 是同一族**：递归调用覆盖全局临时寄存器（铁律 7）＋ 帧局部快照在嵌套递归里
被交叉改写。修它需要 FnSlot 化（把帧局部从"全局表 + 快照栈"改成真正的槽），是本轮
评估后主动放弃的大改——与本轮所有补丁的挂点都不冲突，可作为下一轮的主线。

## 五、工程记录（给下一轮）

- 补丁顺序：`p560 p561 p562 p563 p564 p565 p566 p567 p568 p569 p570`，全部在 `tail.txt` 前。
- 块手术踩到的两个坑，已写进补丁注释：
  1. **`replaceStmt` 会覆盖 `newId.next`**（铁律 1）：P568 第一版先接链再 replace，把
     defWrScan 的链尾整个丢掉，`rrK=2` 变成不可达块、静默失效。正确顺序是"先记
     `rest = BL()[newId].next` → replace → 再手工接回"。
  2. **`insertBeforeStmt` 对"子栈首句"会踩 `predecessorOf` 的坑**：P569 第一版把复位语句
     插到 wpub 首句前，wpub 的 ArO 分支整体失效（`call by ref append/dict/两个函数` 三例回归）。
     子栈首句一律用 `prependStack`。
- 结构校验：`node _work/v41/check41.cjs MiniPy_v4.210.sb3` → 37,236 块，errors=0。
- 新调试器：`_work/v41/dbgrun2.mjs <sb3> <txt> <vars> <lists>`（基于 runall 的进程内 VM，
  比 `dbgrun.mjs` 快一个数量级；`dbgrun.mjs` 会挂死）。
