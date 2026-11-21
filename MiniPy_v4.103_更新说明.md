# MiniPy v4.103 更新说明

本轮补上三个**进制构造函数**：**`bin(x)`**、**`hex(x)`**、**`oct(x)`** ——
以前一律 `NameError: name 'bin' is not defined`（尽管 `'%x' % 255`、`int('ff', 16)` 早就能用）。
补丁 **P176**。

产物 `MiniPy_v4.103.sb3`：Interpreter 24,383 块，合计 **25,812**，`check41` errors=0。

## 1. 问题

| 代码 | v4.102（**错**） | **v4.103**（= CPython） |
|---|---|---|
| `bin(5)` | `NameError: name 'bin' is not defined` | `0b101` |
| `hex(255)` | NameError | `0xff` |
| `oct(8)` | NameError | `0o10` |
| `bin(0)` / `hex(0)` / `oct(0)` | NameError | `0b0` / `0x0` / `0o0` |
| `bin(-5)` / `hex(-255)` | NameError | `-0b101` / `-0xff` |
| `bin(1.5)` | NameError | `TypeError: 'float' object cannot be interpreted as an integer` |
| `hex('a')` | NameError | `TypeError: 'str' object cannot be interpreted as an integer` |

## 2. 做法

内建函数走 `callfn` 里那串 `if fn == "名字"`，单个实参这时已经在 `ev`/`evtype` 里，
分支末尾只要 `pending = 1`（P13 的 `sorted` 就在这个位置）。P176 在那儿加一个分支：

1. **类型检查**：`evtype` 不是 `N`（或文本里带 `.`）就报 CPython 的
   `TypeError: '<类型>' object cannot be interpreted as an integer`（类型名走现成的 `tname`）；
2. **符号**：负数把 `-` 摘到前面、值取绝对值（CPython 把 `-` 放在**前缀之前**：`-0b101`）；
3. **取位**：新过程 **`radix 值 基数 数字表`** 反复除以基数、用 `letter` 从数字表里取字符
   （`0-9a-f` 或 `01` 或 `01234567`），低位往高位拼；`0` 单独处理成 `'0'`；
4. **前缀**：`0b` / `0x` / `0o`，拼在符号之后。

## 3. 两个坑

1. **`REPEATU` 的条件写反了**（本轮唯一的 bug）：我想"一直除到商小于基数"，
   却写成 `REPEATU(NOT(LT(x, base)))` —— `repeat_until` 是**条件为真就停**，
   于是 `NOT(x < base)` 一开始就是真 ⇒ **循环体一次都没跑**，末尾又拿 `letter(x+1, 数字表)`
   取一个越界字符（空串）⇒ `bin(5)` 打出 `0b`（前缀有、数字没有，症状非常整齐）。
   正确写法是 `REPEATU(LT(x, base))`。
2. **过程实参不能当变量**（老坑，本轮又踩）：分支里写 `VAR('fn')` 直接报
   `no variable fn in Interpreter` —— `fn` 是 `callfn` 的**形参**，必须用 `argOf('fn')`，
   而且每次比较都要现造一个（reporter 积木只能坐一个输入）。

## 4. 实测

| 套件 | v4.102 | **v4.103** |
|---|---|---|
| `d257.json`（本轮新写 **9 条**：`bin`/`hex`/`oct` 正常值、零、负数、浮点与字符串报错、`'%x' % 255` 与 `'%o' % 8` 对照、`chr`/`ord` 对照） | 4/9 | **9/9** |
| `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **125 套** | — | **123 套逐例相同**；3 处差异 = `d257` 的 7 条由错转对 + `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,667 块 errors=0 | **25,812 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.102 共 93 版全 MATCH | **v4.10…v4.103 共 94 版全 MATCH** |

新增 1 个过程（`radix`）、6 个变量（`r3*`）。

## 5. 本轮没做成的事（记下来）

本轮先尝试的是**多访问器的路径别名**（`b = a[0][1]`，P173 只记单访问器）。
设计（`pget1`/`pset1`/`dgetv`/`aget` + `palwrite` 的两访问器分支）写完了，但跑出来
**把单访问器的老路径也弄坏了**（`b = a[0]` 变成走两访问器分支），最后**整体撤回**，
改出这个小而确定的特性。撤下的补丁留档 `_work/v41/_p176_twoaccessor.txt`。
已经查明的两件事：①`replaceExpr` 的 `build()` 必须返回**积木 id**，
直接给 `VAR('名字')`（输入描述符）会拼出 3 项的畸形 `ITEM`，`.sb3` 直接被加载器拒绝；
②`palwrite` 的"单/双访问器"判据要读 `PthK`，而 `PthS` 是"访问器表里的起点"——
撤回时定位到 `p10s` 拿到了 2（说明记录阶段的第二访问器扫描多记了一个），还没查到底。

## 6. 仍缺 / 下一轮（v4.104）候选

1. **多访问器路径别名**（`b = a[0][1]`；见 §5，补丁与两条结论都已留档）
2. `int('0b101', 2)`：带进制前缀的字符串 CPython 收，MiniPy 报 `ValueError`（本轮探针发现）
3. `min(xs, key=…)`/`max(xs, key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
4. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. `find`/`rfind`/`count` 的 `start`/`end` 参数、`split(sep, maxsplit)`、视图集合语义、非 ASCII

## 7. 前后对比

```
print(bin(5))            v4.102: NameError   v4.103: 0b101
print(hex(255))          v4.102: NameError   v4.103: 0xff
print(oct(8))            v4.102: NameError   v4.103: 0o10
print(bin(0), hex(0))    v4.102: NameError   v4.103: 0b0 0x0
print(bin(-5))           v4.102: NameError   v4.103: -0b101
print(bin(1.5))          v4.102: NameError   v4.103: TypeError: 'float' object cannot be interpreted as an integer
print('%x' % 255)        v4.102: ff          v4.103: ff（不变）
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.103.sb3
node _work/v41/run.mjs MiniPy_v4.103.sb3 _work/cmp47/d257.json   # bin/hex/oct 9 条
node _work/v41/run.mjs MiniPy_v4.103.sb3 _work/cmp47/d255.json   # 上一轮 15 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.103.sb3 -tag v4103 -ref v4102
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4103 -ref v4102
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.103.sb3 -tag v4103
node _work/v41/check41.cjs MiniPy_v4.103.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.102 还原： $env:V41_SKIP='P176'; $env:V41_OUT='…/MiniPy_v4.102.sb3'; $env:V41_STAMP='MiniPy v4.102 - built 2026-09-17'; node _work/v41/build41.js
```
