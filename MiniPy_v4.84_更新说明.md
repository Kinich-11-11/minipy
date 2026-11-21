# MiniPy v4.84 更新说明

本轮补上 **`dict(**d)` 解包合并**，并让 **`sum(d)` 对字典求和它的键**（与 `list(d)`、`min(d)` 等一致）。
补丁 **P157**。

产物 `MiniPy_v4.84.sb3`：Interpreter 20,885 块，合计 **22,314**，`check41` errors=0；
75 个历史版本全部可复现（v4.10…v4.84 MATCH）。

## 1. 问题

| 代码 | v4.83 | **v4.84**（= CPython） |
|---|---|---|
| `dict(**d)` | `SyntaxError: missing expression` | `{'a': 1}` |
| `dict(b=2, **d)` | `SyntaxError` | `{'b': 2, 'a': 1}` |
| `dict(**d, b=2)` | `SyntaxError` | `{'a': 1, 'b': 2}` |
| `dict(**d, **e)` | `TypeError: dict expected at most 1 argument, got 2` | `{'a': 1, 'b': 2}` |
| `dict(**{})` | `SyntaxError` | `{}` |
| `dict(**5)` | `SyntaxError` | `TypeError: dict() argument after ** must be a mapping, not int` |
| `dict(a=1, **{'a': 2})` | `SyntaxError` | `TypeError: dict() got multiple values for keyword argument 'a'` |
| `sum({'a': 1})` | `TypeError: sum() requires a list` | `TypeError: unsupported operand type(s) for +: 'int' and 'str'` |
| `sum({1: 2})` | `TypeError: sum() requires a list` | `1`（对键求和） |

## 2. 做法

* **`dict(**d)`**：P148 教过 `dict` 的 `name = value` 形式，但 `**` 那片会掉进"映射实参"分支，被整片
  交给 `eval` ⇒ `SyntaxError: missing expression`。现在：
  * 片段识别多一个形态 `** expr`（**`**` 在 MiniPy 词法里是**一个** token**（幂运算符），
    所以判据就是 `Tok[片起点] == '**'`，表达式从下一个 token 开始）——先 `eval` 出来，必须是字典，
    否则报 CPython 的 `dict() argument after ** must be a mapping, not <类型>`（`tname`）；
  * 它的**键**逐个与已收集的关键字名比对（`kwhas`），撞名报
    `dict() got multiple values for keyword argument 'a'`，并把键登记进名字表（后面再撞也能抓住）；
  * 它的**记录**在**该片段的位置**就追加进累加串，于是 `dict(b=2, **d)` 保持 CPython 的顺序（b 在前）。
* **还有一个入口问题**：P148 的关键字处理只在"片段里有顶层 `=`"时才进（`if p18e == 1`），
  所以 `dict(**d)`（没有 `=`）压根到不了那里，而"无 `=` 但多片"那条错误又抢先报
  `dict expected at most 1 argument, got 2`。于是**扫描多学一个标志 `p18s`**（扫到顶层 `**` 就置 1），
  进入条件改成 `p18e == 1 或 p18s == 1`，"多片报错"那条再要求 `p18s == 0`。
* **`sum(d)`**：P149 的字典白名单（`list`/`tuple`/`set`/`enumerate`/`zip`/`sorted`/`min`/`max`/`any`/`all`）
  里没有 `sum`，于是 `sum(d)` 仍报 `sum() requires a list`。把 `sum` 加进去之后它自然对**键**求和：
  `sum({1: 2})` = `1`，字符串键则抛出与 CPython 一致的
  `unsupported operand type(s) for +: 'int' and 'str'`。

## 3. 三个坑

1. **`**` 是单个 token**：第一版按"两个 `*`"检测（还顺手写了"`*`+`*`"的兼容分支），词法器其实是
   把 `**` 当一个 token 发出来——所以判据永远不成立，行为一字未变（症状：build 通过、日志也打了，
   但 `dict(**d)` 还是老错误）。**教训：先确认词法，再写 token 判据。**
2. **键表不能借用 `p18d`**：`p18d` 是"映射实参的记录"，片段循环结束时会把 `p18d` 追加进结果；
   我把 `dictkeys` 的**键表**也存进 `p18d`，于是键表被当成记录追加，输出多出一对
   `'a': ''`（`dict(**d)` 打出 `{'a': 1, 'a': ''}`）。改用独立的 `p18w`。
3. **`eqVar` 要收"输入描述符"而不是"积木 id"**：`b.inputs.CONDITION` 是 `[2, id]`，传 `[1]`
   就等于传了个字符串，谓词恒假（症状 `[P157] entry if = 0`）。另外 `p18e` 的初始化语句在
   `if fn == 'dict'` 那一层、**不在** `if p18e == 1` 里面，锚点得往上一层找。

## 4. 实测

| 套件 | v4.83 | **v4.84** |
|---|---|---|
| `d235.json`（本轮新写 **19 条**：解包 5 条含空字典与两个 `**`、报错 4 条、`sum` 3 条、`min/max`/`list`/`dict`/遍历/值类型等 7 条回归） | 9/19 | **19/19** |
| `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 · `d230` 59 · `d229` 44 · `d227` 26 · `d228` 25 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **104 套：101 套逐例相同**；3 处差异 = `d235` 的 **15 处**（10 条由红转绿 + 4 条报错文案变准 + 1 条 `expectError` 用例由"另一条错误"变成"对的那条"，两边原本都已报错）+ `t111h`（CPython 集合哈希序）+ `featprobe3`（地址）——`ref false` 10 / `ref true` **0** ⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 22,214 块 errors=0 | **22,314 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.83 共 74 版全 MATCH | **v4.10…v4.84 共 75 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 5 个变量（`p18n` `p18j` `p18v` `p18s` `p18w`），没有新增过程。

## 5. 前后对比

```
d = {'a': 1}
print(dict(**d))            v4.83: SyntaxError   v4.84: {'a': 1}
print(dict(b=2, **d))       v4.83: SyntaxError   v4.84: {'b': 2, 'a': 1}
print(dict(**d, **{'b': 2})) v4.83: TypeError    v4.84: {'a': 1, 'b': 2}
print(sum({1: 2}))          v4.83: requires a list   v4.84: 1
print(sum({'a': 1}))        v4.83: requires a list   v4.84: TypeError: unsupported operand type(s) for +: 'int' and 'str'
print(list(d), min(d))       不变：['a'] a
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `dict(映射, 关键字)` 的**记录顺序** | 具体值都对，但 `dict({'a': 1}, b=2)` 打印/遍历顺序是 `{'b': 2, 'a': 1}`（CPython 是 `{'a': 1, 'b': 2}`）——记录串是"关键字在前、映射在后"拼的，且查找是"首条命中"（这条差异 P148 起就记着；本轮**没有**动它，因为改成映射在前会让映射的值盖住关键字，语义反而错） |
| `f(**d)`（用户函数/内建的关键字解包） | 不支持（只做了 `dict`） |
| `%c` 的语义与文案 | 同 v4.83（`'%c' % 'a'`、范围上限、`not float` 措辞） |
| 嵌套规格 `'{:{w}}'` | 不支持 |
| `'{a!a}'` 的真 ascii 语义 | 按 `repr` 处理 |
| 带路径字段的 `__fmt` 临时名 | 同 v4.82 |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.84.sb3
node _work/v41/run.mjs MiniPy_v4.84.sb3 _work/cmp47/d235.json  # 解包与 sum 19 条
node _work/v41/run.mjs MiniPy_v4.84.sb3 _work/cmp47/d234.json  # 报错措辞 30 条（v4.83）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.84.sb3 -tag v484 -ref v483
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v484 -ref v483
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.84.sb3 -tag v484
node _work/v41/check41.cjs MiniPy_v4.84.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.83 还原： $env:V41_SKIP='P157'; $env:V41_OUT='…/MiniPy_v4.83.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.85）候选

1. `dict(映射, 关键字)` 的记录顺序（要同时保持"关键字值优先"——得在映射记录里按键原位替换）
2. `f(**d)`（用户函数与内建的关键字解包）
3. 嵌套规格 `'{:{w}}'`
4. `%c` 的语义与文案
5. `'{a!a}'` 的真 ascii 语义
