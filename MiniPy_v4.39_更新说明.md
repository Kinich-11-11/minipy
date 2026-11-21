# MiniPy v4.39 更新说明

本轮攻"表达式后缀"和"括号深度"两处结构性缺口，外加浮点幂精度。三个补丁（**P93、P92、P94**，按补丁链顺序），
`gaps433.json` 从 **41/63** 推到 **46/63**（E 41/55、F 0/2、G 5/6），23 套既有回归 + 259 条特性探针**零退化**。

产物 `MiniPy_v4.39.sb3`：Interpreter 11,949 → **12,268** 块，合计 **13,697**，`check41` errors=0。
`MiniPy_v4.38.sb3`（13,378 块）按规则重建还原；`rebuild-old.ps1` 的 v4.10…v4.39 **共 30 版全 MATCH**。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P93** | E12（`print({'a': 1, 'b': 2})`、`len({'a':1,'b':2})`）——顺带治好一整族"字典值里带逗号/运算符"的静默错 | 给**可证明是深度计数**的扫描补上 `{`/`}` 判断。判据必须严格：条件树里只比较**同一个表达式**（结构相同，用"块 id 归一化"后比较）与同一族字符（`(`/`[` 或 `)`/`]`）；体内只有一条 `change <var> by ±1`；表达式是 `Tok[...]` 或纯变量（`or` 两个操作数都会被求值，带调用的表达式会跑两遍）。共 37 个开括号 + 33 个闭括号扫描 |
| **P92** | E54（`C().v`、`c.inc().v`、`xs[1].v`）、E11（`{'k': 7}['k']`、`[1,2][0]`、`f()[1]`） | 在 `eval` 最后那条 else 链的**链首**（methodcall 判定之前）插两条分支：**(A)** 末尾是 `.名字`（`Kind[hi]=='I'`）→ 先 `eval(lo, hi-2)` 求出根，再按实例属性表（查不到回落到类表，与 P90 同款）取值；**(B)** 末尾是 `]` → 只数 `[`/`]` 的深度扫描找出**与末尾 `]` 配对的那个 `[`**，只要它不是第一个 token（`x[0]` 走原路）就把整段交给 `indexget`——它本来就用 `eval(lo, xbr-1)` 求容器，天然支持任意表达式。两条分支都 `stop this script`，故都补了 `fnlimit -1` |
| **P94** | G2（`math.pow(2.0, 3.0)` → `8.0`）、G3（`2 ** 0.5` 末位） | 新增 `powval base exp`：整数指数（\|exp\|≤1024）用**精确连乘**（负指数取倒数），±0.5 用正确舍入的 `sqrt`，其余才退回 `e^(exp*ln base)`；任一操作数带小数点就用 `mkfloat` 保浮点。`rightside` 的 `**` 非整数分支和 P23 的 `math.pow` 都改走它，`math.pow` 额外补一次 `mkfloat`（CPython 的 `math.pow(2, 3)` 也是 `8.0`） |

## 2. 本轮踩实的五条（都写进 README 了）

* **`p50.txt` 一直在 parts 列表外面**：P50（"27+27 处扫描补 `{`/`}`"）当年因为"修不好还回退 tuple/str/b2"被撤下，
  这次查"为什么 `print({'a':1,'b':2})` 还坏"时发现它**根本没被装配进 `build41.js`**（`assemble.cjs` 的列表是 `p49 → p51`）。
  P50 的判据太宽（凡是 `x=='(' or x=='['` 的 OR 都包，其中很多是"判断这是不是开括号"的语义分支，不是深度计数），
  这正是它回退的原因；P93 换成"体内只有一条 ±1"的严格判据后零回退。
* **补丁顺序：新插的扫描会被后跑的"扫描修补补丁"误伤**。P92 的 `[`/`]` 配对循环里那条
  `if Tok[pxj]==']' → pxd -= 1` 长得就像深度计数，被后跑的 P93 包成 `… or Tok[pxj]=='}'`，
  于是 `{`/`}` 把 `pxd` 带成负数、`pxbr` 找不到，E11 反而坏了（`print({'k':7}['k'])` → SyntaxError: expression）。
  修法是把 **P93 排到 P92 前面**（`p91 → p93 → p92 → p94 → p68`）：让扫描修补只看"原始"代码。
* **`indexget` 早就是"容器可以是任意表达式"**：它先反向扫描找出与末尾 `]` 配对的 `[`，再 `eval(lo, xbr-1)`
  求容器——`print(([1, 2])[0])` 在 v4.38 就能跑（走的是 `Tok[lo+1]=='['` 那条路）。所以 E11 只需要"多一条
  入口条件"，不需要重写取下标逻辑。
* **`eval` 提前退出必须自己补 `fnlimit -1`**：`eval` 进门 `fnlimit +1`、末尾 `-1`；任何 `stop this script`
  都会漏掉末尾那次。P90/P92 的分支都显式补了（`fnlimit > 64` 会报 `LimitError: expression depth`）。
* **"字面量直接接后缀"和"表达式接后缀"是同一个洞**：`[1,2][0]` 之所以报 `SyntaxError: parentheses` 而不是 `SyntaxError: expression`，
  是因为它先命中了 `Tok[lo]=='[' && Tok[hi]==']'` 的 listlit 分支（把 `1, 2][0` 当成元素表）。
  判据必须带上"与末尾配对的 `[` 不是第一个 token"，否则纯列表字面量会被抢走。

## 3. 实测

| 套件 | v4.38 | **v4.39** |
|---|---|---|
| `gaps433.json`（63 条） | 41/63 | **46/63**（E 41/55、F 0/2、G 5/6） |
| 23 套 battery | one2 1 / math 3 / dict 3 | **one2 1 / math 3 / dict 1**（无退化，`dict` 多过 2 条） |
| 6 个 `featprobe`（259 条） | 211/259（按 v4.39 重记基线） | **211/259**，失败的仍是未实现项（enumerate/zip、关键字参数、`*args`、`global`、生成器 for、继承、`try/finally`、集合/字典推导式、`from math import`、非 ASCII） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 13,378 块 errors=0 | **13,697 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.38 MATCH | **v4.10…v4.39 共 30 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增/复用临时用例集：`t92.json`（属性链 15 条）、`t92b.json`（内联容器 12 条）、`t92c.json`（浮点/幂 15 条）、
`t92d.json`（括号容器下标 10 条）、`t92e.json`（方法结果后缀 5 条）、`t92f.json`（窄化定位 14 条）、
`t92g.json`（增广赋值 8 条）。

## 4. 本轮新发现（下一版候选，尚未修）

* **增广赋值到属性/下标**：`c.v += 1`、`self.v -= 1`、`self.s += 'b'` → `SyntaxError: expression`；
  `a[0] += 5` → `SyntaxError: expected = after ]`。（`insertBeforeStmt` 那条 `attrSetBranch` 只看 `Tok[4]=='='`。）
  这一条直接卡住 3 个 `featprobe` 用例（"类方法链式调用"、"实例方法链（变量根）"、"c.inc().v 一次链"）。
* **`'hello'.split()`（无参）按字符切**，CPython 是按空白切（`featprobe`/临时用例 S1、S2）。
* **浮点 repr 的三处**（`t92c` Q6/Q7/Q8/Q10）：`1e16` 要印 `1e+16`、`1e-5` 要印 `1e-05`、`-0.0` 要保留符号、
  `123456789012345678.0` 要印 `1.2345678901234568e+17`。
* `d.pop(k)` 目前把整个字典删空、`d.nope()` 的报错文案与 CPython 不同（P91 余项）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.39.sb3
node _work/v41/run.mjs MiniPy_v4.39.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps439_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.39.sb3 -out _work/v41/battery_v439.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.39.sb3 -tag check
node _work/v41/check41.cjs MiniPy_v4.39.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.38 还原： $env:V41_SKIP='P92,P93,P94'; node _work/v41/build41.js
```

## 6. 下一版（v4.40）建议

1. **增广赋值到属性/下标**（`c.v += 1`、`self.v -= 1`、`a[0] += 5`、`d['k'] += 1`）——3 个探针用例 + 日常写法
2. **F1+F2** 两条静默错（嵌套推导式得 `[[]]`；生成器体内循环没写结尾 `return` 只 yield 一项）
3. **E49** `try/finally`（P88 的正常完成路径可以复用）
4. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）
5. **E23+E24** `enumerate` / `zip`（解包已就绪，预先求值成 `[[i, v], ...]` 即可）
6. **E46** 继承 `class B(A)` + `super()`
7. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）
8. **E28+E29** `*args` / `**kwargs`
9. **E32** `global`
10. **浮点 repr**（`1e16`/`1e-5`/`-0.0`/大浮点，见 §4）
