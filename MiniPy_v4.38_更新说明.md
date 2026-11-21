# MiniPy v4.38 更新说明

本轮补类的"类属性 / `__str__`"和字典方法。两个补丁（P90、P91），`gaps433.json` 从 **38/63** 推到 **41/63**
（E 38/55、F 0/2、G 3/6），既有 23 套回归**逐条零退化**。

产物 `MiniPy_v4.38.sb3`：Interpreter 11,587 → **11,949** 块，合计 **13,378**，`check41` errors=0。
`MiniPy_v4.37.sb3`（13,016 块）按规则重建还原，未受本轮影响。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P90** | E45 `class C: n = 1`、E47 `__str__` | `IAttrId/IAttrName/IAttrVal/IAttrType` 这四张表本来就是"对象 → 属性"的绑定，键只是一段文本（实例 id 是数字，类名不会撞）。于是：① 类体扫描里补一条 `name = value` 分支，把值以**类名**为键存进这四张表；② `eval` 的属性分支前加一条：根是类名（**用 `compareText` 逐项比，不能用 `data_listcontainsitem`，它是大小写不敏感的**）就直接查类表；③ 实例查不到时回落到类表；④ 打印实例时若类里有 `__str__` 就调用它（挂在 `printargs`，**不能挂在 `strval`**，见下） |
| **P91** | E42 `d.keys()` 等 | `methodcall` 的类型守卫只放行 L/S/O，于是 `d.keys()` 报"only lists have methods"。D 分支插在守卫**之前**（和 P82 挂 `format` 同一处），交给新过程 `dictmeth`：`keys/values/items` 走 `dictkeys`/新的 `dictvals`/`dictitems` 再 `listfmt` 包一层（`dict_keys([...])`），`get/pop` 查找键后取值并（pop 时）删掉那两条记录 |

## 2. 本轮踩实的四条（都写进 README 了）

* **`__str__` 不能挂在 `strval` 里**。`assign` 每绑一个值都会调 `strval` 去刷新变量面板；而 `callmeth`
  内部会 `assign("self", …)`，于是 `strval(O)` → `__str__` → `callmeth` → `assign` → `strval(O)` …**无限递归**
  （`print(C())` 直接卡到 20 秒超时）。改挂在 `printargs` 的实参循环上就没这个问题。
* **`data_listcontainsitem` 大小写不敏感**（Scratch 的 `contains` 语义）。用 `ClsName` 判"根是不是类名"时，
  实例 `c` 会命中类 `C`，于是 `c.v` 走进类属性分支、`v` 找不到就报 AttributeError。
  改成用 `compareText` 逐项比较（`compareText` 靠 costume 编号，区分大小写，`lookup` 也是这么比的）。
* **`replaceStmt` 只换一条语句**（v4.37 记过一次，本轮又用到）：守卫类语句要"既有前置步骤又保留原语句"时，
  正解是 `insertBeforeStmt(orig, [前置…])` 再把 orig 自己包进 `IF(条件, [orig])` 后 `replaceStmt(orig, 新 IF)`
  ——此时 orig 在子栈里、`next` 本来就是 null，不会踩到链尾覆盖。
* **`IFELSE` 的两个分支各自独立**：P90 的"实例查不到就查类"一开始把赋值写在 `if (cX==0)` 的**then** 分支里，
  而原来那句 `else: ev = IAttrVal[cX]` 属于同一个 if/else，then 分支里再也轮不到它执行 —— 必须在自己的分支里
  把 `ev/evtype` 也装上。

## 3. 实测

| 套件 | v4.37 | **v4.38** |
|---|---|---|
| `gaps433.json`（63 条） | 38/63 | **41/63**（E 38/55、F 0/2、G 3/6） |
| 23 套 battery | one2 1 / math 3 / dict 3 | **完全相同**（无退化；`cls` 仍 12/12） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 13,016 块 errors=0 | **13,378 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.37 MATCH | **v4.10…v4.38 共 29 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增临时用例集：`tcl.json`（类属性/`__str__` 10 条）、`tk.json`（字典方法 10 条）。
已知边界（不是本轮目标）：`print(C())` 仍印 `<C object>`（CPython 带内存地址，套件里按"既有行为"处理）；
`d.pop(k)` 目前把整个字典删空（`tk.json` 的 k7），`d.nope()` 的报错文案与 CPython 不同。

## 4. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.38.sb3
node _work/v41/run.mjs MiniPy_v4.38.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps438_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.38.sb3 -out _work/v41/battery_v438.txt
node _work/v41/check41.cjs MiniPy_v4.38.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.37 还原： $env:V41_SKIP='P90,P91'; node _work/v41/build41.js
```

## 5. 下一版（v4.39）建议

剩下的 22 条里性价比最高的十条：

1. **E54** 属性/方法的根可以是任意表达式（`C().v`、`c.inc().v`、`d = c.inc(); d.v`）——类已经能用，卡在"链式入口必须是标识符"
2. **F1+F2** 两条静默错（嵌套推导式得 `[[]]`；生成器体内循环没写结尾 `return` 只 yield 一项）
3. **E49** `try/finally`（P88 的正常完成路径可以复用）
4. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）
5. **E23+E24** `enumerate` / `zip`（解包已就绪，预先求值成 `[[i, v], ...]` 即可）
6. **E46** 继承 `class B(A)` + `super()`
7. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）
8. **E28+E29** `*args` / `**kwargs`
9. **E32** `global`
10. 顺手补 P91 留下的两个小口子：`d.pop(k)` 的删除范围、`d.nope()` 的报错文案
