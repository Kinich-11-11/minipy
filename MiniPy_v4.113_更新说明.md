# MiniPy v4.113 更新说明

本轮本来只想补 **两实参 `max`/`min` 收字符串**，结果挖出一条更糟的**静默给错答案**：
**多实参 `max`/`min` 从来不看最后一个实参**。两条都在补丁 **P186** 里修掉。

产物 `MiniPy_v4.113.sb3`：Interpreter 25,409 块，合计 **26,838**，`check41` errors=0。

## 1. 问题

### 1.1 多实参 `max`/`min` 少看最后一个实参（**静默给错答案**）

| 代码 | v4.112（**错**） | **v4.113**（= CPython） |
|---|---|---|
| `max(1, 2, 3)` | `2` | `3` |
| `min(3, 2, 1)` | `2` | `1` |
| `max(1, 2, 3, 4)` | `3` | `4` |
| `max('a', 'b', 'c')` | `b` | `c` |
| `min('c', 'b', 'a')` | `b` | `a` |
| `max(1, 3, 5)` | `3` | `5` |
| `max(1, 5, 3)` | `5` ✓ | `5`（**以前\"对\"只是因为最大值恰好在前面**） |

**根因**：`minmax`（P6）把顶层逗号收进 `MComma`，并在末尾追加 `hi + 1` 作哨兵 ⇒ k 个实参得到
**k 个元素**。第 1 个元素在循环前求值，第 i（i ≥ 2）个是 `eval(MComma[i-1]+1, MComma[i]-1)`，
由 `mpi = 1 … k-1` 驱动。而循环条件写成 `repeat until (mpi >= len(MComma) - 1)` —— **少跑一轮**
（两实参时一轮都不跑）。上界本就该是 `len(MComma)`，那个 `- 1` 是多余的。

### 1.2 两实参 `max`/`min` 只收数字

| 代码 | v4.112（**错**） | **v4.113**（= CPython） |
|---|---|---|
| `max('a', 'b')` / `min('b', 'a')` | `TypeError: max requires numbers` | `b` / `a` |
| `max(a, b)`（两个字符串变量） | 同上 | 正常 |
| `max([1], [2])` / `max((1,2), (1,3))` | 同上 | `[2]` / `(1, 3)` |
| `max(1, 2)` / `max(1, 'a')` | 正常 / 报错 ✓ | **不变** |

## 2. 做法

1. **两实参走 `minmax`**：`eval` 里那个 `if fn in (int, round, pow, min, max) and narg == 1` 的 **THEN**
   调用 `builtin2`（数值型二实参内建，`builtin2b` 直接 `fail('TypeError: max requires numbers')`），
   而 P6 当年只替换了它的 **ELSE**。本轮在 THEN 上照 P6 补一层：
   是 `max`/`min` 就调同一个 `minmax`（同样的 token 跨度 `lo+2 … hi-1`），
   `pow`/`round`/`int` 原样走老链。
2. **`minmax` 的循环上界**：把 `repeat until (mpi >= len(MComma) - 1)` 改成 `… >= len(MComma)`，
   即去掉那个 `SUB(..., 1)`。

两处合起来，单实参（v4.112 交付）、两实参与多实参三种形式现在都对。

## 3. 同一轮探针另发现（下轮候选）

**嵌套调用会被共享暂存冲掉**：

```
max(min(5, 2), 3)     -> 2   (CPython 3)
min(max(1, 4), 2)     -> 4   (CPython 2)
```

内层 min/max 会把 `MComma`/`mpi`/`mbest`/`mtype`（以及自定义积木的实参）都改掉，外层的循环状态随之失效 ——
与 P109 修的 `dictfmt` 可重入问题同类，修法要"每层一份暂存"（本轮没做，已写进清单）。

## 4. 实测

| 套件 | v4.112 | **v4.113** |
|---|---|---|
| `d267.json`（本轮新写 **29 条**：多实参 3/4/5 个、递增/递减/最大值居前、字符串与浮点、表达式与变量实参、两实参字符串/数字/列表/元组/join、混合类型报错、`pow`/`round`/`int`/`divmod` 与单实参回归） | 15/29 | **29/29** |
| `d266` 24（字符串 max/min/sorted） · `d265` 32（逗号） · `d264` 32（元组切片/拼接） · `d202` 24（序列运算符） | 全绿 | **全绿（不变）** |
| 快照 **136 套** | — | **134 套逐例相同**；2 处差异 = `d267` 的 15 条**由错转对**（`ref false` → `new true`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,824 块 errors=0 | **26,838 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.112 共 103 版全 MATCH | **v4.10…v4.113 共 104 版全 MATCH** |

本轮只多 14 块积木（一层 `if/else` + 一次 `minmax` 调用 + 一个新上界），
**没有**新过程、新变量、新列表。

## 5. 前后对比

```
print(max(1, 2, 3))        v4.112: 2    v4.113: 3
print(max(1, 2, 3, 4))     v4.112: 3    v4.113: 4
print(max('a', 'b', 'c'))  v4.112: b    v4.113: c
print(max('a', 'b'))       v4.112: TypeError: max requires numbers   v4.113: b
print(max([1], [2]))       v4.112: TypeError: max requires numbers   v4.113: [2]
print(max(1, 5, 3))        v4.112: 5    v4.113: 5（不变）
print(pow(2, 3))           v4.112: 8    v4.113: 8（不变）
print(max(min(5, 2), 3))   v4.112: 5    v4.113: 2（**仍未交付**，见 §3）
```

## 6. 仍缺 / 下一轮（v4.114）候选

1. **嵌套 `max(min(a, b), c)`**（共享暂存被内层冲掉，见 §3）
2. **元组重复** `(1, 2) * 2`（v4.110 试过撤回：只放宽 `seq * int`/`int * seq` 会让它打出空行）
3. `join` 收字符串（`'-'.join('ab')`）
4. 列表 `index(x, start)`；`'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
5. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`、视图集合语义、非 ASCII

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.113.sb3
node _work/v41/run.mjs MiniPy_v4.113.sb3 _work/cmp47/d267.json   # max/min 29 条
node _work/v41/run.mjs MiniPy_v4.113.sb3 _work/cmp47/d266.json   # 上一轮 24 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.113.sb3 -tag v4113 -ref v4112
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4113 -ref v4112
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.113.sb3 -tag v4113
node _work/v41/check41.cjs MiniPy_v4.113.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.112 还原： $env:V41_SKIP='P186'; $env:V41_OUT='…/MiniPy_v4.112.sb3'; $env:V41_STAMP='MiniPy v4.112 - built 2026-09-17'; node _work/v41/build41.js
```
