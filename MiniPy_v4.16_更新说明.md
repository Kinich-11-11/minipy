# MiniPy v4.16 更新说明

本轮补上 **位运算（A16）** 与 **列表推导式（A14）**。产物 `MiniPy_v4.16.sb3`
（Interpreter 6,710 → 6,998 块，共 8,579 块）。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | v4.10 | v4.11 | v4.12 | v4.13 | v4.14 | v4.15 | **v4.16** |
|---|---|---|---|---|---|---|---|
| 缺口清单（39 条） | 16/39 | 18/39 | 22/39 | 23/39 | 24/39 | 27/39 | **28/39** |
| 位运算 `bit.json`（10 条） | — | — | — | — | — | 0/10 | **10/10** |
| 推导式 `comp.json`（10 条） | — | — | — | — | — | 0/10 | **10/10** |
| 布尔运算 `booljson.json`（4 条） | — | — | — | — | 3/4 | 3/4 | **4/4** |
| 其余专项（函数/字符串/链/f-string/%/math/回归） | — | — | — | — | — | 全绿 | 全绿 |
| 结构体检 | 0 err | 0 err | 0 err | 0 err | 0 err | 0 err | **0 err** |

## 1. 位运算（A16）

`6 & 3` → 2、`6 | 3` → 7、`6 ^ 3` → 5、`1 << 4` → 16、`16 >> 2` → 4，
变量与表达式右操作数都支持；`x & 1` 可以直接当条件用。要求非负整数（负数报
`ValueError: bitwise needs non-negative integers`，与 Python 的无限二补数语义不同，已在文档标注）。

实现：分词器把 `<<`/`>>` 合并成一个记号；`rank` 按 Python 优先级重建
（or < and < 比较 < `|` < `^` < `&` < 移位 < `+-` < `*/ // %` < `**`）；
`rightside` 增加位运算分支；`&`/`|`/`^` 由新过程 `bitop` 逐位算（Scratch 没有位运算块），
移位用 2 的幂循环。

## 2. 列表推导式（A14）

`[i for i in range(6) if i % 2 == 0]` → `[0, 2, 4]`；不带过滤、`range` 1/2/3 参数、
以**列表**或**字符串**为来源、嵌在 `sum()` / `len()` 里都可用。

实现：新过程 `complist` 在方括号内扫描顶层 `for` / `if`，把体、变量、可迭代对象、过滤条件切开；
`range(...)` 走数值循环，其它值先求值再按元素（列表）或字符（字符串）遍历，
每次都 `assign` 循环变量、求值过滤条件、再 `eval` 体并拼进编码串。
`listlit` 开头加一次扫描，发现顶层 `for` 就转交 `complist`。

## 3. 本轮踩坑

* **临时变量与既有过程撞名**：我的循环计数器用了 `ci`，而 `compareText`（每次变量查找都会调用）和
  `checkASCII` 也用 `ci` —— 结果循环体第一次迭代后计数器被改写，推导式只产出第一个元素
  （`[x for x in [1,2]]` → `[1]`）。改名后正常。**新补丁的临时变量名要先在反编译里搜一遍。**
* 位运算分派最初插错了位置（补丁替换字符串没匹配上，静默失效），表现为"运算符原样返回右操作数"；
  现在关键插入后会做一次可达性断言。
* `True and False` 打印成 `0` 是 v4.10 起就存在的老问题（P10 的 bool→number 归一化改了返回类型），
  本轮一并修好：`and`/`or` 返回前恢复原类型。

## 4. 仍未做（v4.17 候选）

* 单行复合语句（A20，p22 已写但禁用）、括号续行（A21）。
* `try/except/raise`（A5，异常类名就位）、`class`（A4）、`yield`（A8）。
* dict / tuple / set 与嵌套列表（A12/A12b/A13）——需要新的值类型编码。
* `float` 独立 repr（B2）、列表别名语义（B5）、`divmod`（A24，需要元组）。

## 5. 复现

```powershell
node _work/v41/assemble.cjs && node _work/v41/build41.js    # -> MiniPy_v4.16.sb3
$env:V41_SKIP='P26 comprehensions'; node _work/v41/build41.js   # 重建 v4.15

node _work/v41/check41.cjs MiniPy_v4.16.sb3
node _work/v41/run.mjs MiniPy_v4.16.sb3 _work/v41/bit.json    # 10/10
node _work/v41/run.mjs MiniPy_v4.16.sb3 _work/v41/comp.json   # 10/10
node _work/v41/run.mjs MiniPy_v4.16.sb3 _work/v41/gaps.json   # 28/39
```
