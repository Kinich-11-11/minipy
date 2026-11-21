# MiniPy v4.36 更新说明

本轮关掉"函数"和"解包"这两块：**函数可以当值传**、**`(lambda…)(…)` 能直接调用**、
**`a, b = (1, 2)` / `q, r = divmod(9, 4)` 能解包**、**裸逗号自动成元组**。
四个补丁（P83–P86），`gaps433.json` 从 **28/63** 推到 **34/63**（E 31/55、F 0/2、G 3/6），
既有 23 套回归**逐条零退化**。

产物 `MiniPy_v4.36.sb3`：Interpreter 11,253 → **11,399** 块，合计 **12,828**，`check41` errors=0。
`MiniPy_v4.35.sb3`（12,682 块）按规则重建还原，未受本轮影响。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P83** | E36 `x = 1, 2`、E37 `return 1, 2` | `eval` 只在"整段被圆括号包住"时才建元组，其余带顶层逗号的表达式最后都掉进 `SyntaxError: expression`。在那句失败**之前**加一次 `hascomma`（和括号路径用的是同一个助手），是顶层逗号就 `tuplelit` |
| **P84** | E33 `a, b = (1, 2)`、E34 `q, r = divmod(9, 4)` | `assignlist` 要求右边的逗号段数正好等于名字个数，所以单个容器值必然报 `unpack count mismatch`。在"数量不符"的那个失败分支里改成：整体求值一次 → 是 L/T/S 且长度正好 → 逐元素绑定并在这里完成赋值（列表/元组用 `listitem`，字符串用 `letter of`），然后 `stop this script`；正常路径一行没动。长度不符时按 CPython 分别报 not enough / too many |
| **P85** | E30 `g = f`、E31 `print((lambda x: x * 2)(4))` | 函数值**本来就有**表示法：`ev` = FnName 的下标、`evtype = "F"`（`strval` 就是这么打印的，`calluser` 也是这么从变量里读回来的）。所以 ① `atom` 在名字既不是变量也不是关键字时，去 `FnName` 里找一遍，找到就交出下标当 F 值；② `eval` 新增"`( … ) ( 实参 )`"：先找与开头 `(` 配对的 `)`（要求它后面还有内容且整段以 `)` 结尾），求值被调用者，是 F 就用 `callfn(item ev of FnName, …)` 调用 |
| **P86** | （不在清单里，见下）`f(h())` | `calluser` 先把自己的 `fi` 算好、压帧，再求值实参；实参里的用户调用会把 `fi` 覆盖成它自己的，而它的 `fpop` 只会恢复"它压帧时"的值——于是外层函数拿着**别人的** `FnPar/FnStart/FnLine` 继续跑 |

## 2. 本轮最值得记的一条：P86 是 P85 撞出来的既存 bug

写 P85 的嵌套测试时发现 `print((lambda x: x + 1)((lambda y: y * 2)(5)))` 得 20（应为 11），
顺着查下去发现**这不是新问题**：`def f(x): return x+1` + `def h(): return 5` + `print(f(h()))`
在 **v4.35 上就报 `TypeError: too many arguments`**（v4.33/v4.34 同）。

原因就是上面那条：`calluser` 里 `fi` 的活命区间跨过了实参求值。修法是把 `fi` 压进 `VStack`
（解释器自己用来做嵌套暂存的列表，`listfmt`/`tuplelit`/`dictpair` 都是这个套路），实参跑完再弹回来，
放在读 `fpn`/`fpo` 之前。递归（`fib`）之所以一直正常，是因为递归调用的 `fi` 恰好还是同一个函数，
所以这个 bug 只在"实参里调用**别的**用户函数"时露出来。

其他几条经验：

* **别在 `eval` 里加第二条求值路径而不减 `fnlimit`**：`eval` 结尾的 `fnlimit += -1` 在 `stop this script`
  时不会执行。P85 最初忘了补，加上当时"内层括号也被误判成调用"（条件少写了 `cpe+1 < hi`）导致无限递归，
  表现是 `LimitError: expression depth`。
* 找块时的两个小坑（都写进 README 了）：`item lo of Tok` 里的下标是**块内的 `data_itemoflist`**，
  不能直接拿 `argName(OPERAND2)` 判；`if (x==…)` 形式的守卫可能是 `control_if_else`，也可能被
  P75 包成 `operator_and`，谓词要放宽。

## 3. 实测

| 套件 | v4.35 | **v4.36** |
|---|---|---|
| `gaps433.json`（63 条） | 28/63 | **34/63**（E 31/55、F 0/2、G 3/6） |
| 23 套 battery | one2 1 / math 3 / dict 3 | **完全相同**（无退化） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 12,682 块 errors=0 | **12,828 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.35 MATCH | **v4.10…v4.36 共 27 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |
| `stepcost.mjs demo1` | 15 ms/步 | **14 ms/步** |

新增临时用例集：`tv.json`（裸元组 10 条）、`tu.json`（解包 10 条）、`tfv.json`（函数值 10 条）、
`tn.json`（嵌套调用 3 条）。其中已知边界：`(lambda a, b: a + b)(3, 4)` 报
`SyntaxError: lambda needs a colon`（多参数 lambda 是 `reglam` 的既有边界，不在缺口清单里）。

## 4. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.36.sb3
node _work/v41/run.mjs MiniPy_v4.36.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps436_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.36.sb3 -out _work/v41/battery_v436.txt
node _work/v41/check41.cjs MiniPy_v4.36.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.35 还原： $env:V41_SKIP='P83,P84,P85,P86'; node _work/v41/build41.js
```

## 5. 下一版（v4.36 → v4.37）建议

剩下的 29 条里性价比最高的十条：

1. **E54** 属性/方法的根可以是任意表达式（`C().v`、`c.inc().v`）——类已经能用，卡在"链式入口必须是标识符"；
2. **E42** 字典方法 `keys/values/items/get/pop`（`dictkeys` 已就绪，注意 `print(d.keys())` 要印成 `dict_keys([...])`）；
3. **E35** `for a, b in [(1, 2)]`（P84 的绑定逻辑可以直接复用到 `boundary` 的循环变量上）；
4. **F1+F2** 两条静默错（嵌套推导式得 `[[]]`；生成器体内循环没写结尾 `return` 只 yield 一项）；
5. **E45+E47** 类属性 `class C: n = 1`、`__str__`；
6. **E48+E49** `try/else`、`try/finally`；
7. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）；
8. **E23+E24** `enumerate` / `zip`（预先求值成 `[[i, v], ...]`，解包已就绪）；
9. **E46** 继承 `class B(A)` + `super()`；
10. **E51–E53** `from math import sqrt`、`import math as m`、`math.pi`。
