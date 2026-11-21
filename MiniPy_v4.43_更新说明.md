# MiniPy v4.43 更新说明

本轮补"模块名直呼"和"作用域声明"两件事：**`from math import name`**（E51）和 **`global` 语句**（E32）。
两个补丁（P103、P104），`gaps433.json` 从 **53/63** 推到 **55/63**（E 48/55、F 2/2、G 5/6），
23 套既有回归**逐条零退化**。

产物 `MiniPy_v4.43.sb3`：Interpreter 13,278 块，合计 **14,707**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P103** | **E51** `from math import sqrt` | `import math` 只把模块名记进 `mthname`，`math.f(x)` 由 P23 在 `methodcall` 里分派；裸名字 `sqrt(16.0)` 直接死在"unsupported statement"。修法：新增 `MFrom` 列表记下导入的函数名，`execute` 放行 `from math import a, b`（`pi`/`e` 按**值**导入，复用 P87 的字面量），然后在 eval 的 narg 分派**之前**拦下裸名字：求值单个实参 → 按名字选 `operator_mathop` → 结果按 CPython 规则排版（`floor/ceil/trunc` 给整数，其余**总是**带小数点，`sqrt(4)` 也是 `2.0`）。`pow`/`fmod` 需要两个实参，这里明确报错（`math.pow` 仍可用） |
| **P104** | **E32** `global n` | 解释器的帧模型把调用者的变量表快照进 `FN/FV/FT`，返回时**重建**——所以函数内的普通赋值改不了全局（`n = 2` 之后打印 `2 1`）。`global` 只需要让这次重建**保留新值**：① `global a, b` 把名字记进 `GName`；② `calluser` 在重建变量表**之前**把每个名字的当前值/类型/面板文本抓进 `GSave*`（同名只抓一次）；③ 重建之后写回（原表里没有这个名字就追加，与 CPython 一致）。读全局本来就能读到（`lookup` 能看到调用者的条目），不用改 |

## 2. 本轮踩实的四条（都写进 README 了）

* **"每帧一份"和"全局一份"要分清**：P104 第一版把全局声明按 `cdepth` 记成每帧一份，结果
  `outer()` 里两次调 `inner()`（`inner` 里 `global n`）打印 `0`——中间那层 `outer` 返回时按自己的快照重建，
  又把 `inner` 的改动冲掉了。`GName` 改成**全局一份**（不进帧）后 10/10。这条是"作用域"类修改最容易踩的坑。
* **新列表/新变量都不会自动进帧存档**：P14 的 `fpush`/`fpop` 保存的是**它写补丁时**存在的全局
  （P100 的 `UArgN` 踩过一次）。本轮刻意用"不进帧"的设计避开：`MFrom`/`GName`/`GSave*` 都只在
  RUN 开始清空一次（挂到 `LoopText` 那个 run-init 锚点上）。
* **裸名字导入的排版规则**：`math.floor` 返回 int、`math.sqrt` 返回 float——`floor(3.7)` 打 `3` 而
  `floor` 的实参却带小数点，所以不能"按实参有没有小数点"决定（P103 第一版就是这样，`floor(2.7)` 印成 `2.0`）。
  正确做法是给"总是返回浮点的函数"打标记，最后统一 `mkfloat`。
* **`data_listcontainsitem` 在 case-sensitive 场景要小心**（P90 的老坑）：`MFrom` 里都是小写数学名，
  这里用它做成员判断是安全的；但同样的形状若出现在类名/变量名上就会大小写误判。

## 3. 实测

| 套件 | v4.42 | **v4.43** |
|---|---|---|
| `gaps433.json`（63 条） | 53/63 | **55/63**（E 48/55、F 2/2、G 5/6） |
| 23 套 battery | one2 1 / math 3 / dict 1 | **逐字节相同**（无退化；`math` 仍 7/10，失败的都是报错文案） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 14,471 块 errors=0 | **14,707 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.42 MATCH | **v4.10…v4.43 共 34 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增临时用例集：`t103c.json`（`from math import` 15 条，**12/15**）、`t104b.json`（`global` 10 条，**10/10**）。
`t103c` 余下的失败：`sqrt(-1)` 的报错文案（CPython 3.14 改成 "expected a nonnegative input, got -1.0"）、
`from os import path`（MiniPy 明确不支持 os）、未导入时 `sqrt` 的 NameError 文案——都不是本轮目标。

## 4. 本轮新发现（下一版候选，尚未修）

* **`yield i, i + 1`** 报 `TypeError: use str(number)`（裸逗号元组没走到 yield 分支的求值区间）。
* **双 for 推导式** `[x * y for x in range(3) for y in range(2)]` 报 `SyntaxError: parentheses`。
* **`'hello'.split()`（无参）** 按字符切，CPython 按空白切。
* **浮点 repr**：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号、大浮点用科学计数（`t92c` Q6/Q7/Q8/Q10）。
* **`global` 的边角**：若某个函数声明了 `global n`，另一个函数里对 `n` 的**局部**赋值也会跟着"不能回滚"
  （见 P104 的注释）。`math` 函数只支持单实参的裸名字形式（`pow`/`fmod` 请用 `math.pow`）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.43.sb3
node _work/v41/run.mjs MiniPy_v4.43.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps443_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.43.sb3 -out _work/v41/battery_v443.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.43.sb3 -tag check
node _work/v41/check41.cjs MiniPy_v4.43.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.42 还原： $env:V41_SKIP='P103,P104'; $env:V41_OUT='…/MiniPy_v4.42.sb3'; node _work/v41/build41.js
```

## 6. 下一版（v4.44）建议

1. **E49** `try/finally`（P88 的正常完成路径可以复用）
2. **E46** 继承 `class B(A)` + `super()`
3. **E43** 字典推导式（`{k: k*2 for k in range(3)}`）
4. **E44** 集合 `{1, 2, 3}`（需要一个新类型标记 + repr/len/in 的最小支持）
5. **E28+E29** `*args` / `**kwargs`
6. **G5** 默认参数只求值一次（需要让形参**别名**到那份默认值）
7. **双 for 推导式**
8. **`yield i, i + 1`**
9. **浮点 repr**（`1e+16`/`1e-05`/`-0.0`/大浮点）
10. **`'hello'.split()`** 无参按空白切
