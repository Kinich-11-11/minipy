# MiniPy v4.37 更新说明

本轮关掉 `try/else`、`for a, b in ...`、`import math as m`、`math.pi`，
另外把"`replaceStmt` 只能换一条语句"这个坑正式记进文档。
三个补丁（P87–P89），`gaps433.json` 从 **34/63** 推到 **38/63**（E 35/55、F 0/2、G 3/6），
既有 23 套回归**逐条零退化**。

产物 `MiniPy_v4.37.sb3`：Interpreter 11,399 → **11,587** 块，合计 **13,016**，`check41` errors=0。
`MiniPy_v4.36.sb3`（12,828 块）按规则重建还原，未受本轮影响。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P87** | E52 `import math as m`、E53 `math.pi` | 模块名进了新变量 `mthname`（默认 `"math"`，`import` 分支遇到 `as NAME` 就改写它）。① `methodcall` 的 math 分派条件原来写死 `Tok[lo] == "math"`，改成 `… or Tok[lo] == mthname`；② `math.pi` 根本走不到方法分派——`eval` 的属性分支要求根是实例，`math` 又不是变量。于是在属性分支**之前**加一条：`Tok[lo] == mthname` 且 `Tok[lo+1] == "."` 且 `hi == lo+2` 时直接给出 `pi`/`e` 的浮点值 |
| **P88** | E48 `try/else` | 两个障碍：① `prepare` 直接拒收 `else` 跟在 `except` 后面（`SyntaxError: elif/else without if`），所以先把 `except`/`try` 加进合法前驱；② `else` 只能在 try 体**正常跑完**时执行——解释器恰好知道这个时刻：走到 `except` 行时 try 帧还在栈上（`pc+1 == TryHand[last]`）就是正常完成，而原本这里直接跳到 `TryEnd`，把 `else` 整段跳过了。现在先看 `Elses[pc]`（下一行同缩进行）：是 `else` 就带着 `branchjump=1` 跳过去（普通 `else` 处理分支于是会执行它的函数体），否则保持原来的 `TryEnd` 跳转 |
| **P89** | E35 `for a, b in [(1, 2)]` | `forloop` 要求 `Tok[3] == "in"`，多目标在守卫处就死了。新分支（插在守卫**之前**）：把目标名收成 `a,b` 这样的串，求值可迭代对象，然后起一个普通的 "list" 循环——`LoopName` 就是用逗号连起来的名字串。解包本身是 `boundary` 列表分支里的一处改动：新过程 `unpackto` 按名字串把元素拆开绑定 |

## 2. 本轮的两条经验（都已写进 README）

* **`replaceStmt(oldId, newId)` 只接受一条语句**：P88 一开始把 4 条语句的链当成 `newId` 传进去，
  它会把**第一条**的 `next` 覆盖成旧语句的下一条，链里剩下的语句直接变成不可达——
  表现是 `try/except` 正常完成时 `dest` 没被赋值、`except` 体被误执行（e4.36 上好好的
  `try: x = 2 / except: print('bad')` 在 v4.37 初版里印出了 `bad`）。
  正解：`replaceStmt(old, stmts[0])` 然后 `spliceAfter(stmts[0], chain(stmts.slice(1)))`。
* **别用 `contains(LoopName, ",")` 当哨兵**：P89 初版用"名字串里有逗号"区分单目标/多目标，
  结果普通循环（`LoopName = "i"`）也被判成多目标、第二次迭代就报
  `not enough values to unpack`；按名字串查逗号这条路在这里不可靠。改成**用 `LoopStep == 0` 当标记**
  （真循环不会有 0 步长，而列表分支只看 `LoopValue + 1`，根本不读 `LoopStep`）之后就稳了。
* 附带一条：`argOf(name)` 造的是**过程参数**报告器。`forloop` 没有参数，`count` 是全局变量，
  P89 初版写成 `argOf('count')` 于是条件恒假——要找全局量必须用 `B.VAR(name)`。

## 3. 实测

| 套件 | v4.36 | **v4.37** |
|---|---|---|
| `gaps433.json`（63 条） | 34/63 | **38/63**（E 35/55、F 0/2、G 3/6） |
| 23 套 battery | one2 1 / math 3 / dict 3 | **完全相同**（无退化；`try` 仍 12/12） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 12,828 块 errors=0 | **13,016 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.36 MATCH | **v4.10…v4.37 共 28 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |
| `stepcost.mjs demo1` | 14 ms/步 | **15 ms/步** |

新增临时用例集：`tm.json`（math 别名/常量 8 条）、`tt.json`（try 7 条）、`tp.json`（for 解包 10 条）、
`tx.json`（嵌套容器 5 条）。已知边界（都不是本轮目标）：
`(lambda a, b: a + b)(3, 4)` 多参数 lambda 报 `SyntaxError: lambda needs a colon`；
`try/except A/except B` 多 except 分支只认第一个（v4.36 起就如此）。

## 4. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.37.sb3
node _work/v41/run.mjs MiniPy_v4.37.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps437_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.37.sb3 -out _work/v41/battery_v437.txt
node _work/v41/check41.cjs MiniPy_v4.37.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.36 还原： $env:V41_SKIP='P87,P88,P89'; node _work/v41/build41.js
```

## 5. 下一版（v4.38）建议

剩下的 25 条里性价比最高的十条：

1. **E54** 属性/方法的根可以是任意表达式（`C().v`、`c.inc().v`）——类已经能用，卡在"链式入口必须是标识符"；
2. **E42** 字典方法 `keys/values/items/get/pop`（`dictkeys` 已就绪；`print(d.keys())` 要印成 `dict_keys([...])`）；
3. **F1+F2** 两条静默错（嵌套推导式得 `[[]]`；生成器体内循环没写结尾 `return` 只 yield 一项）；
4. **E45+E47** 类属性 `class C: n = 1`、`__str__`；
5. **E49** `try/finally`（P88 的正常完成路径可以复用）；
6. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）；
7. **E23+E24** `enumerate` / `zip`（解包已就绪，预先求值成 `[[i, v], ...]` 即可）；
8. **E46** 继承 `class B(A)` + `super()`；
9. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）；
10. **E28+E29** `*args` / `**kwargs`。
