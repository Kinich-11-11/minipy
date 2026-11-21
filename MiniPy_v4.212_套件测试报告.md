# MiniPy v4.212 套件测试报告

**日期**：2026-11-04　**被测**：`MiniPy_v4.212.sb3`（37,852 块，check41 errors=0）
**oracle**：CPython 3.14.10　**方法**：`runall.mjs` 逐例对照；失败项用 `_iso209` 单例
文件隔离复跑（`iso` 列）复核，确认无串行污染。
**对照基线**：v4.210（本轮在迁移后的机器上由 `build41.js` 重建，37,236 块，与随包产物逐块一致）、
v4.211。

## 一、总量

| 套件 | 维度 | 用例 | v4.210 败 | v4.211 败 | **v4.212 败** |
|---|---|---|---|---|---|
| `_new1_alias` | 别名/可变性 | 19 | 5 | 4 | **3** |
| `_new2_algo` | 综合算法 | 17 | 3 | 3 | **3** |
| `_new3_str` | 字符串/格式化 | 17 | 0 | 0 | **0** |
| `_new4_oop` | 类/继承/运算符重载 | 13 | 1 | 1 | **1** |
| `_new5_func` | 高阶/闭包/生成器/装饰器 | 15 | 3 | 1 | **1** |
| `_new6_edge` | 异常/切片/大循环 | 21 | 1 | 1 | **0** |
| `_new7_probe` | 最小根因探针 | 26 | 6 | 5 | **2** |
| `_new8_probe2` | 探针二轮 | 25 | 4 | 2 | **1** |
| `_new9_probe3` | 探针三轮 | 5 | 2 | 1 | **1** |
| `_new10_probe4` | 探针四轮 | 6 | 1 | 0 | **0** |
| **主套件+探针** | | **164** | **26** | **18** | **12** |
| `_iso209` | 隔离单例复跑 | 26 | 13 | 10 | **8** |
| `_cov1~10`/`_covheap`/`_cov205a~e`/`_covC/D/X/Y/Z` | 功能回归 | 674 | 8 | 8 | **8** |
| `_gap131` | 补充套件 | 82 | 5 | 5 | **5** |
| **回归合计** | | **756** | **13** | **13** | **13** |

主套件通过率：**152/164 = 92.7%**（v4.210 为 84.1%）；剔除 1 例作废用例后 **152/163 = 93.3%**，真实失败 **11 例**。回归 756 例与 v4.210 **逐例同名同因**，
脚本比对 `fixed=0 / broke=0`（本轮新增功能未触碰任何既有路径）。

## 二、与 v4.209 报告的 22 项对账

| 编号 | 问题 | 状态 | 修于 |
|---|---|---|---|
| A1 | 容器槽是快照（`d['r']=row; row.append(2)`） | **部分**：源→槽已通；槽→源（`d['r'].append(4)`）仍缺 | v4.212 P575 |
| A2 | `[[0]]*3` 不共享内层对象 | **已修** | v4.212 P576 |
| A3 | `b = a if flag else [2]` 不建别名 | **已修**（两种分支方向都过）；**残留**：整体被括号包裹的 `b = (a if c else [2])` 仍不建别名（RHS 的 `Tok[3]` 是 `(`，深度 0 扫描失效） | v4.211 P573 / v4.212 扩展 |
| B1 | 参数重绑定后继续变异写穿调用方 | 已修 | v4.210 P561 |
| B2 | 配对参数的元组交换不写回 | 已修 | v4.210 P562+P569 |
| C1 | 空 list/dict 默认值首读类型退化 | 已修 | v4.210 P560 |
| C2 | 返回默认对象后变异不传播 | 已修 | v4.210 P568 |
| D1 | 递归方法丢兄弟分支字段（BST 3 节点） | 已修 | v4.211 P572 |
| D2 | 深递归 `LimitError: expression depth` | 已修（LimitError 消失，剩余为 E2'） | v4.211 P572 |
| D3 | 类名 `Str`/`Int` 与内部名冲突 | 已修 | v4.210 P564 |
| E1 | 闭包经 compose/lambda 间接调用丢失 | 已修（二级闭包） | v4.211 P574 |
| E2 | 嵌套函数/方法递归状态污染 | **未修**（最小复现已收敛，见 §四） | — |
| E3 | 生成器 `while True` 挂死 | **未修**（急切求值模型） | — |
| E4 | `@decorator` 语法 | 已修（单层装饰器；工厂形式仍受三级闭包限制） | v4.211 P571 |
| F1 | `map` 不支持多序列 | 已修 | v4.210 P567 |
| F2 | `enumerate(xs, start=…)` | 已修 | v4.210 P565 |
| F3 | `sorted` 不稳定 | 已修 | v4.210 P566 |
| F4 | 函数内 `except as e` 消息丢失 | 已修 | v4.210 P570 |
| G1 | 二级下标表达式里读列表元素 → IndexError | 已修 | v4.210 P563 |
| G2 | 字符串索引结果作 dict 键 → KeyError | 已修 | v4.210 P563 |
| — | `print(a, a.reverse(), a)` 首参快照 | **已修**（不再是声明边界） | v4.212 P578 |
| — | `map(pow, [2,3], [3,2])` 内建名作回调 | **已修**（`divmod` 作回调仍不支持） | v4.212 P577 |

**结论：20 个编号问题中 17 个全修、1 个半修（A1）、2 个未修（E2/E3）；两个"声明边界"都已消除。**

## 三、v4.212 修掉的 6 例（逐例）

| 用例 | 修复前 | 修复后 | 补丁 |
|---|---|---|---|
| `_new1 matrix trap rows alias` | `[[0,5,0],[0,0,0],[0,0,0]]` | `[[0,5,0],[0,5,0],[0,5,0]]` | P576 |
| `_new7 probe list mult rows` | 同上 | 同上 | P576 |
| `_new8 probe list mult alias` | `[[0,1],[0],[0]]` | `[[0,1],[0,1],[0,1]]` | P576 |
| `_new7 probe alias through dict slot` | `{'r': [1]} [1, 2]` | `{'r': [1, 2]} [1, 2]` | P575 |
| `_new7 probe print arg eval timing` | `[1,2,3] None [3,2,1]` | `[3,2,1] None [3,2,1]` | P578 |
| `_new6 list methods battery` | 首参未反映 `sort` 结果 | 与 CPython 一致 | P578（同根） |

## 四、剩余 12 例（11 条真失败 + 1 条作废用例，按家族）

### 1. E2：递归帧内"属性读→方法调用→再属性读"串扰（**5 例，最大块**）

最小复现（v4.211 起即为此形态，P572 之后仍成立）：

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
print(top.vals())      # CPython [5,1,0,2]；MiniPy [5,1,0,2,1,0,2]
```

插桩 trace：第二个 `if` 里 `self.b.vals()` **实际调用了 l1.vals()**——即这次属性读拿到了
`self.a` 的值。**排除性实验**（全部实测）：纯递归+extend ✅；递归方法 receiver 是 `self` ✅；
`c.child.vals()` 单层属性链 ✅；方法内两次数值属性读 ✅。坏的形态限定为"同一方法体内、
第一个属性接收者方法调用之后的属性读/方法调用"。

影响用例：`_new4 bst insert search inorder`、`_new9 probe bst 6 nodes single print`、
`_new2 four queens`、`_new2 dfs all paths`、`_new2 permutations recursive`（后三者为本复现
的容器/递归变体）。

### 2. E3：生成器惰性（2 例）

```python
def fibgen():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
fg = fibgen()
out = [next(fg) for _ in range(10)]   # MiniPy 无输出（步数耗尽）
```

P52 的"急切求值"边界：生成器体在建值时整体跑完，`while True` 无法终止。需要真生成器
（可恢复帧），属重写级工作量。用例：`_new5 generator fibonacci`、`_new7 probe generator while true swap`。

### 3. A1 反向：槽变异不回写源（1 例）

```python
row = [1, 2]
d = {'r': row}
row.append(3)        # ✅ 已同步 → d['r'] == [1,2,3]
d['r'].append(4)     # ❌ 不同步 → row 仍是 [1,2,3]
print(d, row)        # CPython {'r':[1,2,3,4]} [1,2,3,4]；MiniPy {'r':[1,2,3,4]} [1,2,3]
```

根因：反向同步必须挂在 indexset 的写回上，但 indexset 同时承载"槽变异"与"槽重绑定"
（`d['r'] = 另一个列表`），二者在 `isVal` 上不可区分；实测强行 `assign` 会把源与槽都写空。
解法已定：pathset 在合成写时置 `pwr=1`（"本次是元素方法写回"），indexset 只在 `pwr==1`
时反向同步。用例：`_new1 dict value alias mutate`。

### 4. 其余三例（1 真失败 + 1 声明边界 + 1 作废用例）

| 用例 | 症状 | 性质 |
|---|---|---|
| `_new1 return parameter alias` | `b = f(a)` 之后 `a.append(3)` 不反映到 `b` | **真失败**：返回值别名（P557）只覆盖"实参侧"，返回后新建的接收名没进配对表 |
| `_new1 method return no pairing boundary` | `xs = bx.put(); xs.append(1)` 不影响 `bx.items` | v4.209 报告 §二 已声明的方法返回边界（设计边界，不计划修） |
| `_new8 probe builder chain via var` | `s = S(); s.add('a').add('b')` → 两侧都 `NameError: S` | **用例作废**：依赖上一例的 `class S`（v4.209 报告已标"跨用例引用"），单例运行 CPython 同样报错 |
| `_new10 probe …`（0 例） | — | 本轮已全绿 |

## 五、回归 756 例中的 13 个既有失败（与 v4.210/v4.211 完全相同）

| 套件 | 用例 | 原因 |
|---|---|---|
| `_cov1` | big int precision / integer division precision / divmod big | 数值走 Scratch 浮点，>2^53 精度丢失（声明边界） |
| `_cov10` | int to str of very large | 同上（`1e+30` 格式化） |
| `_cov6` | instance in dict and list | 容器内实例的 `repr` 显示（对象堆路线） |
| `_cov7` | generator short circuit | `any/all` 对生成器不短路（E3 家族） |
| `_covY` | repr fallback for print | 无 `__str__`/`__repr__` 时的默认显示 |
| `_covZ` | genexp is a list | 生成器表达式回落为列表（P126 声明） |
| `_gap131` | next builtin missing / pow one arg / assert with message / divmod big / type e equals E | 均为补充套件记录的边界，非回归 |

## 六、修复优先级（下一轮）

1. **A1 反向**（`pwr` 旗标，1 个新变量 + indexset 一处守卫）——改动最小、收益直接；顺带修
   **A3 括号残留**（RHS 外层是单个括号包住整段三元时，先把首尾括号剥掉再走深度 0 扫描）。
2. **E2'**（属性接收者方法调用后的属性读串扰）——沿用 P572 的寄存器栈手术，先审计
   methodcall 的 `cselfr`/`xa`/`iid` 在"属性接收者"路径上的保存/恢复；修好后
   BST/four queens/dfs/permutations 共 5 例应一次转绿。
3. **E3**（惰性生成器）——重写级，建议单独一轮，改动集中在 `GYield`/`GIt` 与 calluser 的
   可恢复帧。
4. 精度类（`_cov1`/`_cov10`/`_gap131 divmod big`）——需大整数编码，属对象堆路线的子项，
   不建议短期动。

## 七、测试方法与本轮工程记录

- **跨用例污染已根治**（v4.211 P572）：RUN 起点补清 `CloB/CloL/CloN/CloV/CloT/FnStack/
  PairPile/PairDep/ArN/ArO/DefWr/DefWrC/FrAr/UleC/DfN/DfV/DfT/GYBase/SvStk`，本轮又补清
  `GNam/GNm`（P576）与 `SAN/SHN/SKV/SKT`（P575）。此前"单跑过、套件里跑就挂"的假性失败
  即源于这些只进不出的栈表残留。
- **失败定性流程**：主套件失败 → 取用例文本落到 `_iso209/_i*.txt` 单例 → 单例复跑确认
  → 才计入"真失败"。本轮 11 条真失败中 8 例在 `_iso209` 单例集内（`_i01/_i04/_i08/_i10/
  _i11/_i13/_i16/_i23`）逐条复现，其余 3 例（E3 两例由 `_i23` 代表、BST 由 `_i16` 代表、
  A1 反向由 `_i01` 代表）与单例同因；`builder chain via var` 为作废用例，不进单例。
- **本轮新踩的三个坑**（已写进更新说明 §五）：`find()` 回调第二参数才是 id；块输入描述符
  有"字符串 id / `[3,id,…]` / 内联 `[12,'name',id]`"三种形态；`replaceStmt` 只接链头、
  子栈首句前插要手工接。
- **回归纪律**：每加一个补丁就在 756 例回归上做 `fixed/broke` 比对。本轮据此拦下两处
  真实回归——`[True]*(n+1)` 被误判为共享组（sieve 输出 `[]`）与合成写触发 `cpybreak`
  切断 `b = a[:]` 的拷贝别名（8 例 copy-depth 系列）。

## 八、产物

- 主套件：`_work/v41/_new1_alias.txt` … `_new10_probe4.txt`（164 例）
- 回归：`_cov1~10/_covheap/_cov205a~e/_covC/D/X/Y/Z/_gap131`（756 例）
- 隔离：`_work/v41/_iso209/_i*.txt`（26 例单例）
- 结果：`_final212/`（主）、`_reg212b/`（回归）、`_iso212/`（隔离）、
  `_base210/`、`_finalMain/`（v4.211 基线）
- 探针：`_a1res*/`、`_a2res/`、`_a3res*/`、`_cpres/`、`_m1res/`、`_p578res/`、`_e2res*/`
- 构建与校验：`assemble.cjs` → `build41.js` → `check41.cjs`（errors=0）
