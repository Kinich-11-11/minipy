# MiniPy v4.66 更新说明

本轮把**序列运算符的报错**对齐 CPython——顺带修掉一串"悄悄算错"的乘法。补丁 **P139**。

产物 `MiniPy_v4.66.sb3`：Interpreter 17,943 块，合计 **19,372**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；57 个历史版本全部可复现（v4.10…v4.66 MATCH）。

## 1. 问题：两个序列运算符都走错了

P134 把**通用**的操作数类型报错对齐了，但 CPython 对序列运算符有专门文案；更要命的是 `*` 这条路上
MiniPy 不是报错而是**算出垃圾**：

| 代码 | v4.65 | **v4.66**（= CPython） |
|---|---|---|
| `'a' + 1` | `unsupported operand type(s) for +: 'str' and 'int'` | `can only concatenate str (not "int") to str` |
| `[1] + (2,)` | 同上通用文案 | `can only concatenate list (not "tuple") to list` |
| `'a' + True` | `… 'str' and 'int'` | `… str (not "bool") to str` |
| `'a' * 'b'` | **`''`** | `can't multiply sequence by non-int of type 'str'` |
| `'a' * 1.5` | **`'aa'`** | `can't multiply sequence by non-int of type 'float'` |
| `[1] * 'a'` | **`'a'`** | `can't multiply sequence by non-int of type 'str'` |
| `1.5 * 'a'` | **`0.0`** | `can't multiply sequence by non-int of type 'float'` |
| `None * 'a'` / `'a' * None` | **`''`** | `can't multiply sequence by non-int of type 'NoneType'` |
| `1.5 * None` | **`0.0`** | `unsupported operand type(s) for *: 'float' and 'NoneType'` |

## 2. 做法：一个 `binerr` 统一造消息

新增过程 **`binerr`**：两个操作数通过全局量 `binL`/`binLT`/`binR`/`binRT` 传（`rightside` 的形参在别的
过程里读不到——P127 定下的规矩），按 `beop` 造出消息再 `fail`：

* `+` 且**左边是序列** → `can only concatenate <L> (not "<R>") to <L>`；
* `*` 且一边是序列、另一边**不是索引**（索引 = `int`/`bool`，即类型 N 且值里没有 `.`）→
  `can't multiply sequence by non-int of type '<X>'`（X 取"不是索引"的那一边：左边是序列就取右边，
  否则取左边；两边都是序列就取右边）；
* 其余 → 通用文案 `unsupported operand type(s) for <op>: '<L>' and '<R>'`。

三处 P134 留下的报错点（`+` 的 else、共享的算术分支、`**` 分支）现在都是"填全局量 + 调 `binerr`"，
`**` 的 op 名仍带 ` or pow()` ✓。

**乘法那条还有独立的坑**：`*` 在 `rightside` 里被拆成好几个分支（字符串重复、列表重复、算术），
哪条会接手取决于类型组合，`[1] * 'a'` 这种组合**每条都不接**、于是直接漏过去留下右边操作数的值。
所以这一轮的乘法检查放在 **P10 归一化之后**（那时 `lt2`/`evtype`/`ev` 都齐了）、所有分支之前：
"要么是合法的序列重复，要么是两个数字，否则 `binerr`" ✓。

**类型名**来自 P134 的 `tname`，但标签必须是**原始**类型：P10 会把两边的 `bool` 改写成数字
（`lt2`/`evtype`），所以本轮先把它们存进 `lt0`/`evt0`，否则 `'a' + True` 会说 `int` 而 CPython 说 `bool`。

## 3. 三个自找的坑

1. **`REPLACE` 一段连续语句时留了"尾巴指针"**：我先把旧的消息前缀从链上摘掉、再 `insertBeforeStmt`，
   可旧前缀的**最后一条**仍指着失败块，于是 `insertBeforeStmt` 走"插在它后面"这条路，把新代码接到了
   **已经不可达的旧前缀**后面（运行期直接跳到失败块，全局量全是 0）。改成"先插在旧前缀之前、再把插入段
   的尾巴直接接到失败块"。
2. **`argOf('leftval')` 被当变量名用**：`idxOf(t, val)` 一开始写成 `strHas(VAR(val), '.')`，
   传进去的是参数报告块 id ⇒ `no variable bargume_…`。改成接受**表达式**。
3. **`*` 的守卫要放在归一化之后、所有分支之前**：一开始插在字符串重复分支前面，`[1] * 'a'` 这种
   走不到那里的组合照样漏过去。

## 4. 实测

| 套件 | v4.65 | **v4.66** |
|---|---|---|
| `d202.json`（本轮新写 24 条：`+` 的 6 种拼接组合、`*` 的 7 种非法组合、两种合法重复、通用报错 4 条、布尔/浮点、`**`） | 7/24 | **24/24** |
| `d190`（异常文案 46 条） · `d201`（容器排序 15 条） · `d168` · `d174` · `d176` | — | **不变/全绿** |
| `t133` 60 · `comp` 10 · `func` 31 · `str` 12 · `cont` 12 · `one` 10 · `pan` 7 · `b2` 13 | — | **全绿** |
| 92 套快照 | — | **90 套逐例相同**，2 处差异 = `d193` T3 的文案**变正确**（两边都抛错，仅文本变化）+ featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 19,274 块 errors=0 | **19,372 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.65 共 56 版全 MATCH | **v4.10…v4.66 共 57 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 9 个变量、1 个过程（`binerr`）。

## 5. 前后对比

```
try:  'a' + 1
except TypeError as e: print(e)     v4.65: unsupported operand type(s) for +: 'str' and 'int'
                                    => can only concatenate str (not "int") to str

try:  'a' * 'b'
except TypeError as e: print(e)     v4.65: （静默得到空串）  => can't multiply sequence by non-int of type 'str'

try:  [1] * 'a'
except TypeError as e: print(e)     v4.65: （静默得到 'a'）   => can't multiply sequence by non-int of type 'str'

print([1] * 2, 2 * [3], 'ab' * 2, 1 * 'a')   => [1, 1] [3, 3] abab a   （合法重复不受影响）
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'a' % 1` 之类的取模/格式化组合 | 不在本轮范围（`%` 走字符串格式化那条路） |
| key 函数里再调用带关键字的 sorted · `super()` 钩子只认整段 · 元组 `index`/`count` · `1()` / `(1).foo` | 仍缺（v4.60/v4.61/v4.64 记录） |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.66.sb3
node _work/v41/run.mjs MiniPy_v4.66.sb3 _work/cmp47/d202.json  # 序列运算符 24 条
node _work/v41/run.mjs MiniPy_v4.66.sb3 _work/cmp47/d190.json  # 异常文案 46 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.66.sb3 -tag v466 -ref v465
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v466 -ref v465
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.66.sb3 -tag v466
node _work/v41/check41.cjs MiniPy_v4.66.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.65 还原： $env:V41_SKIP='P139'; $env:V41_OUT='…/MiniPy_v4.65.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.67）候选，按清单顺序

1. `super()` 钩子只认"整段就是 `super().m(...)`"（两个 super 连用、`super().m().n()`，`d193` T6）
2. 元组子句里写未定义名字应报 `NameError`（v4.60 发现）
3. 元组的 `index`/`count`（v4.61 发现）
4. 任意值当函数调用 / 属性访问（`1()`、`(1).foo`）与 `%` 的字符串格式化边界
