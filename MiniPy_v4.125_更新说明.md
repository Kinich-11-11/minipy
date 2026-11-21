# MiniPy v4.125 更新说明

本轮修 **`for <名字> in <元素是容器的列表>` 只迭代一次**（静默错）。补丁 **P198**。

产物 `MiniPy_v4.125.sb3`：Interpreter 26,098 块，合计 **27,527**，`check41` errors=0（**零新积木** —— 本轮只重排语句）。

## 1. 问题（静默给错答案）

| 代码 | v4.124（**错**） | **v4.125**（= CPython） |
|---|---|---|
| `for x in [[9], [8], [7]]:` | **只跑 1 次** | 3 次 |
| `for x in [[1, 2, 3], [4, 5]]:` | **跑 3 次**（第 3 次元素是空串） | 2 次 |
| `x = [[9], [8], [7]]` 后 `for v in x:` | 只出第一个元素 | 3 个都出 |
| `x = []; x.append([9]); x.append([8])` 后遍历 | 只出第一个 | 两个都出 |
| `for row in [[1, 2], [3]]:`（嵌套循环） | 内层跑不对 | 对 |
| `for x in [9, 8, 7]:`（平铺） | 3 次 ✓ | 不变 |
| `len(x)` / `x[0]` / `print(x)` | 都对 ✓ | 不变 |

**两类入口都受影响**：字面量列表、以及变量/`append` 出来的列表；元素是**容器**（list/tuple/dict/set）才出错，
元素是数字/字符串/元组时正常。

## 2. 根因

`forloop` 里其实有**两条**列表循环路径：

* `for a, b in …`（元组目标，P89 加的）——顺序是 `pushLoop(… flen …)` → 写 `LoopText` → `listitem` → `unpackto`；
* `for 名字 in …`（基座原有的）——顺序是 `listitem` → `assign` → `pushLoop(… ln …)` → 写 `LoopText`。

P89 的注释早就写了第一条为什么安全：**"pushLoop 先调，它的实参在被调用前读取，之后绑定第一个元素就不会干扰它们"**。
基座那条恰好相反：先绑定再 push。用调试构建插桩后看得很清楚（`_work/v41` 的两个临时调试补丁）：

```
ln = ev  之后：  ln = 3   （listlen 数对了，ltmp 也是完整的 \x1fL\x1e1N9\x1fL\x1e1N8\x1fL\x1e1N7）
pushLoop 之后：  ln = 1   ← 被第一个元素的绑定搅掉了
```

于是 `LoopStop` 被推成 1 ⇒ 只迭代一次（元素是容器时还会出现"次数比正确值多"的情形，因为第一次绑定的值不同）。
平铺列表的元素是数字/字符串，`listitem` 走的是短路径，不会碰到那个被搅掉的槽位 —— 这就是为什么这个 bug
只在"**元素是容器的列表**"上显形，而且从 v4.44（P89/P97 那批）起就潜伏着。

## 3. 修法

**照 P89 的形状重排基座那条路径**：把已有的 `pushLoop("list", name, 1, ln, 1)` 与写 `LoopText` 两条语句
挪到 `listitem`/`assign` **之前**（四条第语句原地重接，不新建任何积木、不加变量、不动列表）：

```
ltmp = ev ; listlen(ltmp) → ev ; ln = ev
if ln > 0:
    pushLoop("list", name, 1, ln, 1)     ← 先推
    LoopText[len(LoopText)] = ltmp       ← 再记
    listitem(ltmp, 1) → ev               ← 之后才绑定第一个元素
    assign(name, ev, evtype)
else: dest = Ends[pc]
```

`pushLoop` 用的是基座自己的 `LoopStop`/`LoopText`（在 **Stage** 上），重排只动顺序、不动引用，所以循环驱动
（`boundary`）不需要任何改动。**零新积木**：`check41` 块数与 v4.124 完全相同（27,527），`rebuild-old` 里
`P198` 跳过后就是 v4.124。

## 4. 实测

| 套件 | v4.124 | **v4.125** |
|---|---|---|
| `d279.json`（本轮新写 **15 条**：嵌套列表 7 条——字面量/变量/`append`/嵌套循环/星号目标在循环体里/元素长度不等的两种；回归 8 条——平铺列表、字符串、元组、`for a, b in`、字典、`range`、空列表、`continue`） | 9/15 | **15/15** |
| `d278` 27（星号目标，其中 U9 正是被这个 bug 卡住的） | 25/27 | **26/27**（只剩 U16 那个 for 头部星号） |
| `d277` 38 · `d276` 38 · `d275` 38 · `d274` 42 · `d273` 27 · `d272` 29 · `d271` 31 · `d265` 32 · `d264` 32 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **148 套** | — | **144 套逐例相同**；差异 = `d279` 6 条 + `d278` 1 条 + `d242` T15（**都由错转对**：`d242` 的 `for p in {'a': 1}.items()` 以前会多打一个空行）+ `featureprobe3` 的两条地址 ⇒ **MiniPy 侧零回归（`ref true` 0）** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,527 块 errors=0 | **27,527 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.124 共 115 版全 MATCH | **v4.10…v4.125 共 116 版全 MATCH** |

> 顺带记录一个"为什么这个 bug 一直没被发现"的细节：**判分器会忽略输出末尾的空行**，所以
> `for p in {'a': 1}.items(): print(p)` 那种"多跑一次空迭代"的表现在套件里是 `same: true`（看不出来）。
> 本轮 d279 用 `n = n + 1` 计数、并且**在循环外**打印，才把它变成可判定的差异。

## 5. 前后对比

```
for x in [[9], [8], [7]]: print(x)      v4.124: [9]                      v4.125: [9] [8] [7]
for x in [[1,2,3],[4,5]]: n = n + 1      v4.124: 3                        v4.125: 2
x = []; x.append([9]); x.append([8])     v4.124: 只出 [9]                 v4.125: 出两个
for x in [9, 8, 7]: print(x)             v4.124: 9 8 7                    v4.125: 9 8 7（不变）
for a, b in [[1,2],[3,4]]: print(a)      v4.124: 1 3                      v4.125: 1 3（不变）
```

## 6. 复现与调试留档

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.125.sb3
node _work/v41/run.mjs MiniPy_v4.125.sb3 _work/cmp47/d279.json   # 嵌套列表循环 15 条
node _work/v41/run.mjs MiniPy_v4.125.sb3 _work/cmp47/d278.json   # 星号目标 27 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.125.sb3 -tag v4125 -ref v4124
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4125 -ref v4124
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.125.sb3 -tag v4125
node _work/v41/check41.cjs MiniPy_v4.125.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.124 还原： $env:V41_SKIP='P198'; $env:V41_OUT='…/MiniPy_v4.124.sb3'; $env:V41_STAMP='MiniPy v4.124 - built 2026-09-18'; node _work/v41/build41.js
```

**怎么定位的（下一轮遇到同类问题可复用）**：①用 `_dumpnest.mjs` 把 **Stage 的 `Names`/`Values`/`Types`**
（用户变量其实存在这里）连同字符码打出来，确认编码本身是对的、`lunesc` 用的是 `\x1e`+数字；②用「在
`forloop` 的 `ln = ev` 之后插一条 `fail`」的临时调试补丁把 `ln`、`len(ltmp)`、`ltmp` 打进错误消息，
对比 `pushLoop` 前后的 `ln` 就锁定了"绑定第一个元素把长度搅了"这一步；③`_pdump.cjs` 打印任意过程的语句树
（含分支头）用来确认两条路径的顺序差异。

## 7. 仍缺 / 下一轮（v4.126）候选

1. `for a, *r in …`（for 头部的星号目标，要接到 `unpackto` 上；`d278` 的 U16 已就位）。
2. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）；方法调用 `obj.m(*xs)`。
3. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）。
4. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`。
5. `split(None, maxsplit)`；`rsplit`；视图集合语义；非 ASCII。（小候选：`sorted` 未知关键字文案补引号。）
