# MiniPy v4.114 更新说明

本轮修掉 **嵌套 `max`/`min` 互相冲掉暂存**：`max(min(5, 2), 3)` 以前给 `2`、`min(max(1, 4), 2)` 给 `4`
（CPython 是 `3` / `2`）。补丁 **P187**。

产物 `MiniPy_v4.114.sb3`：Interpreter 25,448 块，合计 **26,877**，`check41` errors=0。

## 1. 问题

| 代码 | v4.113（**错**） | **v4.114**（= CPython） |
|---|---|---|
| `max(min(5, 2), 3)` | `2` | `3` |
| `min(max(1, 4), 2)` | `4` | `2` |
| `max(0, min(5, 10))`（夹取） | 错 | `5` |
| `min(10, max(0, 5))` | 错 | `5` |
| `max(min(max(1, 5), 3), 2)`（三层） | 错 | `3` |
| `max(min(1, 2), 5, 3)` | 错 | `5` |
| `max(1, min(2, 3), 4)`（实参中间嵌套） | 错 | `4` |
| `max(min('b', 'c'), 'a')` | 错 | `b` |
| `max(min(5, 2), 3) + max(1, 2)` | 错 | `5` |

**根因**：`minmax`（P6）把状态放在 `mpi`/`mbest`/`mtype` 三个**全局量**和列表 `MComma`（进入时 `clearL`）里，
而参数是**逐个用 `eval` 求值**的 —— `eval` 当然可能再调用 `min`/`max`，内层于是把外层的暂存全冲掉。
（`fn`/`lo`/`hi` 反而是安全的：真过程参数，各自一帧。）

## 2. 做法：每次调用给自己的那一份

1. **`MComma` 改成只追加**：调用在扫描前把"自己这片会从哪个下标开始"记进标量 **`mcb`**
   （扫描期间不会有嵌套调用），扫描完把 `mcb` 压进**栈列表 `MCnt`**；读界一律写成
   `MComma[base + i - 1]`（`base` = `MCnt` 栈顶）。返回前把自己的那一片裁掉、并弹 `MCnt` ⇒
   内层追加在外层之后、只删自己的 ⇒ 外层那片完好。
2. **`mpi`/`mbest`/`mtype` 在参数 `eval` 前压进栈列表 `MS1`/`MS2`/`MS3`、后恢复** ⇒ 外层循环继续用自己的值。
3. 循环条件与末尾结果也改读"自己那片"（`len(MComma) - base + 1` 个界），不再看整表长度。

参数 `eval` 是唯一会发生嵌套调用的地方，所以一对"压栈/恢复"就够了。

## 3. 一个坑

`item(list, x)` 的第二个参数是**下标表达式**，不是"另一个 item 读取"。
第一版我把整个 `boundAt(0)`（本身就是一个 `MComma[...]` 读取）塞进现成 item 块的 `INDEX`，
于是变成 `MComma[MComma[base]]`（**双重取值**）—— 所有 `max`/`min` 立刻报 `SyntaxError: missing expression`
或 `SyntaxError: parentheses`。把补丁产物 dump 成树状一眼就看到嵌套的 `data_itemoflist`，
改成"只替换下标表达式"后一次通过。

## 4. 实测

| 套件 | v4.113 | **v4.114** |
|---|---|---|
| `d268.json`（本轮新写 **22 条**：嵌套 max/min、夹取、三四层嵌套、实参中间嵌套、循环/推导式/函数体里的嵌套、字符串与容器嵌套、浮点嵌套、累加器） | 4/22 | **22/22** |
| `d267` 29（max/min 实参形式） · `d266` 24（字符串 max/min/sorted） · `d265` 32（逗号） · `d264` 32（元组切片/拼接） | 全绿 | **全绿（不变）** |
| 快照 **137 套** | — | **133 套逐例相同**；4 处差异 = `d268` 的 18 条**由错转对**（`ref false` → `new true`）+ `t111h` M4 / `t113` F6（CPython 集合遍历顺序，两版 MiniPy 输出逐字相同）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,838 块 errors=0 | **26,877 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.113 共 104 版全 MATCH | **v4.10…v4.114 共 105 版全 MATCH** |

本轮多 39 块积木、1 个变量（`mcb`）、4 个列表（`MCnt`/`MS1`/`MS2`/`MS3`），**没有**新过程。

## 5. 前后对比

```
print(max(min(5, 2), 3))          v4.113: 2       v4.114: 3
print(min(max(1, 4), 2))          v4.113: 4       v4.114: 2
print(max(0, min(5, 10)))         v4.113: 错      v4.114: 5
print(max(min(max(1, 5), 3), 2))  v4.113: 错      v4.114: 3
print(max(1, min(2, 3), 4))       v4.113: 错      v4.114: 4
print(max(1, 2, 3))               v4.113: 3       v4.114: 3（不变）
print(max('a', 'b'))              v4.113: b       v4.114: b（不变）
```

## 6. 仍缺 / 下一轮（v4.115）候选

1. **元组重复** `(1, 2) * 2`（v4.110 试过撤回：只放宽 `seq * int`/`int * seq` 会让它打出空行）
2. `join` 收字符串（`'-'.join('ab')`）
3. 列表 `index(x, start)`；`'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
4. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`、视图集合语义、非 ASCII

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.114.sb3
node _work/v41/run.mjs MiniPy_v4.114.sb3 _work/cmp47/d268.json   # 嵌套 max/min 22 条
node _work/v41/run.mjs MiniPy_v4.114.sb3 _work/cmp47/d267.json   # 上一轮 29 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.114.sb3 -tag v4114 -ref v4113
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4114 -ref v4113
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.114.sb3 -tag v4114
node _work/v41/check41.cjs MiniPy_v4.114.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.113 还原： $env:V41_SKIP='P187'; $env:V41_OUT='…/MiniPy_v4.113.sb3'; $env:V41_STAMP='MiniPy v4.113 - built 2026-09-17'; node _work/v41/build41.js
```
