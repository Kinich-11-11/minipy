# MiniPy v4.212 更新说明

**构建**：`MiniPy_v4.212.sb3`（2026-11-04，37,852 块，check41 errors=0）
**依据**：v4.209 报告剩余项 + v4.211 说明 §四。本轮再修 **5 项**（A3'、print 首参快照、
map 内建回调、A2、A1 单向），另把 v4.211 的 E2 收敛成果留在原处。

## 一、结果总览

| 套件 | v4.211 | **v4.212** | 说明 |
|---|---|---|---|
| `_new1~6`（主套件 102 例） | 93 过 9 败 | **96 过 6 败** | 修掉 3 例 |
| `_new7~10_probe`（探针 62 例） | 53 过 9 败 | **56 过 6 败** | 修掉 3 例 |
| 主套件+探针合计 | 146 过 18 败 | **152 过 12 败** | **修 6 例，0 破坏** |
| `_iso209`（隔离复跑 26 例） | 13 败 | **8 败** | 修 5 例，0 反转 |
| cov 回归 756 例（`_cov*`+`_gap131`） | 743 过 13 败 | **743 过 13 败** | **逐例相同，0 破坏** |

## 二、修掉的 5 项

| 编号 | 症状 | 补丁 |
|---|---|---|
| **A3'** | `b = [2] if flag else a`（假分支是变量名）不建别名；`b = (a if c else d)` 括号形态同样不建 | **P573 扩展** |
| **print 首参快照** | `print(a, a.reverse(), a)` 首参显示翻转前内容 | **P578** |
| **map 内建回调** | `map(pow, [2,3], [3,2])` → `NameError: pow` | **P577** |
| **A2** | `[[0]]*3` 三行不共享（matrix trap） | **P576** |
| **A1（单向）** | `d['r'] = row; row.append(2)` / `d={'r':row}; row.append(3)` 槽里不反映 | **P575** |

修掉的测试用例（逐例）：
`matrix trap rows alias`、`probe list mult rows`、`probe list mult alias`、
`probe alias through dict slot`、`probe print arg eval timing`、`list methods battery`。

## 三、补丁明细与根因

### P573 扩展 —— 条件表达式 RHS 的通用识别（A3'）
v4.211 的守卫是 `Tok[4]=='if'`，只认"RHS 紧跟 if"的最简形态，于是
`b = [2] if flag else a`（假分支是变量名）不建别名。改成**深度 0 扫描**
`Tok[3..count]`：括号/方括号/花括号深度为 0 处出现 `if` 才算三元。
这样 `b = [2] if flag else a` 与 `b = a if flag else [2]` 两个方向都成立；
而 `f(a if c else b)`（三元在实参里、接收者不是名字）被 `contType`+`alsrc`
双重守卫挡住，不会误建别名。
**已知残留**：`b = (a if flag else [2])`（外层一对括号把整段三元包住）仍不建别名
——RHS 的 `Tok[3]` 是 `(`，深度 0 处没有 `if`。修法是先剥首尾括号再扫描，留作下轮。

### P578 —— print 裸名实参延迟渲染（print 首参快照）
printargs 本来就是两遍结构（prpass 1 求值入 SegV/SegT，pass 2 渲染），而且 pass 2
对 `SegK==1` 的段已有"按行重读"逻辑（P557 配对段在用）；缺的只是 pass 1 从不给
裸名实参打标。修法：pass 1 里实参 span 恰为单个标识符（`phi==plo` 且 `Tok[phi]`
是 I）时，`lookup` 后把 `SegK/SegR/SegN` 记成"可重读"，pass 2 走到既有分支就拿到
输出时刻的现值。对标量同样成立（CPython 也是输出时才取值）。

### P577 —— map/filter 的内建回调走 eval 同族分派
`map(pow, xs, ys)` 报 `NameError: pow`：callval 对内建名一律 `callfn(p4bin, …)`，
而 callfnW 只认 len/int/str 这类"函数型"内建；pow/round 在 eval 里走的是
`builtin2`、max/min 走 `minmax`，callfnW 根本不认识它们（普通 `pow(2,3)` 能跑是
因为没经过 callfnW）。修法：callval 的内建分支先分流——pow/round → `hascomma`
后调 `builtin2`，max/min → `minmax`，其余仍走 callfn（lambda/用户函数路径不动）。
`divmod` 的分派在 eval 里是内联分支，本轮不覆盖（保留 NameError 边界）。

### P576 —— 列表乘法共享组（A2）
`[[0]]*3` 的三行在文本模型里是三份独立文本。用**共享组**（`GNam`/`GNm`）模拟：
1. rightside 的两处 `列表 * N` 分支登记待注册组（`lmPend`/`lmN`/`lmOn`）；
2. execute 简单赋值：`gdrop(name)` 清旧组后，`lmOn=1 && evtype==L && ev==lmPend`
   才注册；`lmOn` 无条件清零（防跨语句误注册）；
3. indexset 列表基写后：把被改槽的文本 `lsetv` 进其余组槽，再直写 `Values`；
4. pathset 的合成 indexset 行改用**真名**（`a[__pi]=__pv` 而非 `__pw[__pi]=__pv`），
   否则元素方法写回（`a[0].append(1)`）在 `__pw` 上找不到组。
**两个关键守门**（都已实测踩过）：
- **元素必须本身是容器**才成组：`letter 2 of ev ∈ {L,D,E,O}`。`[True]*(n+1)` 这种
  标量元素列表若成组，`flags[0]=False` 会把整列写成 False（sieve 首版直接输出 `[]`）。
- pathset 合成写要打 `rid=1` 旗标，indexset 的三处 `cpybreak` 改为
  `if rid==0` 才执行。否则合成写命中真名 → `cpybreak` 切断 `b = a[:]` 的拷贝别名
  （_covC/_covX/_gap131 共 8 例"copy is deep"系列回归，实测定位）。
- `GNam`/`GNm` 在 RUN 起点清空（跨用例防污染）。
边界：嵌套乘法（`[[[0]]*2]*2` 内层组）、乘法结果经容器中转、`x = [[0]]+[[0]]`
（CPython 也不共享，文本不匹配自然不注册）不覆盖。

### P575 —— dict 槽链接（A1 单向）
`d['r'] = row` / `d = {'r': row}` 之后 `row` 变异要反映到槽里。用**槽链接表**
`SAN`/`SHN`/`SKV`/`SKT`（源名/宿主名/键值/键类型）：
- 注册两处：indexset 的 dict 分支（RHS 是单标识符且是容器：`hi==isSp+2` 且
  `Tok[isSp+1]=='='`）、dict 字面量（dictpair 的值是单标识符 → `dlPend` 与
  execute 赋值结果比对）。
- 同步挂在 **assign 本体**末尾（不是 publish：publish 的同步体在 `cdepth>0` 守卫
  里、且嵌在别名循环内，顶层代码根本走不到——实测第一次挂在 publish 上毫无效果）。
  `dsyn` 防递归；`lookup` 取源现值 → 宿主为 D 走 `dsetv`、为 L 走 `lsetv` →
  直写 `Values[found]`（`found` 是**宿主的行号**，写成"最后一行"会把临时变量行
  覆盖掉——这是当时的第二个坑）。
- 重绑定先清链再赋值：`sdrop` 前插到 `if error=='':` 子栈首（`insertBeforeStmt`
  对子栈首句不可靠，改手工前插），并在这**一次** assign 期间置 `dsyn=1` 压住同步，
  否则 `row = [9]` 会先把 [9] 推进旧槽（实测）。
- `SAN`/`SHN`/`SKV`/`SKT` 在 RUN 起点清空。
**未完成（下一轮）**：反向同步（`d['r'].append(4)` 要反映到 `row`）。indexset 既承载
"槽变异"也承载"槽重绑定"（`d['r'] = 另一个列表`），两者在 `isVal` 上无法区分，贸然
`assign` 会把源写坏（实测 `d['r']=[9]` 之后 row 与 d 都变成 `[]`）。需要 pathset
把"本次是元素方法写回"沿合成写传下来（加一个 `pwr` 旗标即可），留作下轮第一件事。

## 四、仍存在的问题

| 编号 | 症状 | 归档 |
|---|---|---|
| E2 | 方法体内"属性读→方法调用→再属性读"交错时第二次属性读拿到第一次的值（v4.211 §五 最小复现仍成立） | 帧快照 |
| A1 反向 | `d['r'].append(4)` 不同步到源 | 需要 pathset 传"方法写回"旗标 |
| E3 | 生成器 `while True` 挂死 | 惰性生成器重写 |
| E4'' | `@addn(10)`（装饰器工厂）仍 `NameError: k` | 三级闭包捕获 |
| — | `map(pow, …)` 之外的 `divmod` 作回调 | 未覆盖，保持 NameError |

## 五、工程记录

- 本轮新补丁顺序：`p573(扩展) p578 p577 p576 p575`（都在 `p574` 之后、`tail.txt` 前）。
- **踩坑三则**（全部本轮实测）：
  1. `find(set, pred)` 的 pred 收到的是**块对象**；需要 id（如沿 parent 链走）时
     必须用第二参数 `(b, id)`。传对象给"按 id 查 parent"的函数会静默返回 false，
     表现成"锚点找 0 个"。
  2. 块输入描述符里的块引用**有时是字符串 id、有时是 `[3, id, …]`**，变量还可能
     是内联 `[12,'name',id]`。写锚点谓词要么统一展开（递归 walk），要么直接用
     `JSON.stringify(inputs).includes(...)` 这类粗匹配。
  3. `replaceStmt(oldId, 链)` 只挂链头；多块内容必须 `spliceAfter`。子栈**首句**
     前插一律手工接（`predecessorOf` 在该位置不可靠）。
- 结构校验：`node check41.cjs MiniPy_v4.212.sb3` → 37,852 块，errors=0。
- 结果目录：`_final212/`（主套件）、`_reg212b/`（回归 756）、`_iso212/`（隔离 26）、
  `_a1res/_a2res/_cpres/_m1res/_p578res/_a3pres/`（本轮专项探针）。
