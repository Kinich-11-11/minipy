# MiniPy v4.110 更新说明

本轮把**元组**在"序列运算"这条线上补成第一等公民：**切片**、**`+` 拼接**、**带步长的切片**。
补丁 **P183**。

产物 `MiniPy_v4.110.sb3`：Interpreter 24,673 块，合计 **26,102**，`check41` errors=0。

## 1. 问题

| 代码 | v4.109（**错**） | **v4.110**（= CPython） |
|---|---|---|
| `t = (1, 2, 3); t[0:2]` | 打出**内部记录串**（`\x1fN1\x1fN2`） | `(1, 2)` |
| `t[1:]` / `t[:2]` / `t[:]` / `t[-2:]` / `t[:-1]` | 同上（记录串的子串） | `(2, 3)` / `(1, 2)` / `(1, 2, 3)` / `(2, 3)` / `(1, 2)` |
| `t[::2]` / `t[::-1]` | 元素对，但结果是**列表** `[1, 3]` / `[3, 2, 1]` | `(1, 3)` / `(3, 2, 1)` |
| `type(t[0:2])` | `<class 'str'>`（记录串） | `<class 'tuple'>` |
| `n = (1, (2, 3)); n[1:]` | 记录串 | `((2, 3),)` |
| `('a',) + ('b',)` | `TypeError: can only concatenate tuple (not "tuple") to tuple` | `('a', 'b')` |
| `t + u`（两个元组变量）、`(1,)+(2,)+(3,)`、循环里 `acc = acc + (i,)` | 同上 | 正常拼接 |
| `[1] + (2,)` / `(1,) + [2]` / `'a' + (1,)` / `(1,) + 2` | 报错 ✓ | **不变**（`can only concatenate list (not "tuple") to list` 等） |

## 2. 做法（四处，都只是把现成的判据放宽）

元组的编码从 P140 起就和列表**完全一样**（区别只在类型标记 `T`），所以每一处"只认列表"的判断
改成"列表或元组"，再把结果标记从写死的 `'L'` 换成**接收者自己的标记**即可：

1. **切片的读**（`indexget`，P8/P9 那段）：`if xb == "L"` → `if xb == "L" or xb == "T"`，
   分支里重建元素记录后写回的标记 `evtype = "L"` → `evtype = xb`。
   （长度那半 P140 早就跟着 `len` 一起放宽了 —— 所以以前 `len(t[0:2])` 是对的、只有值不对。）
2. **`+` 的序列分支**（`rightside`）：`op == "+" and lt2 == "L" and evtype == "L"`
   → `op == "+" and (lt2 == "L" or lt2 == "T") and evtype == lt2`，结果标记 `lt2`。
   **要求两边标记相同**是故意的：混合的 `[1] + (2,)` 必须仍然报错。
3. **`+` 的兜底报错**：同一段代码里另有一句 `op == "+" and not (evtype == "L" and lt2 == "L")`
   负责报"不能拼接"，它对元组**恒真** —— 所以只放宽第 2 处时，元组会先被正确拼接、**再**被这句
   报错（现象一模一样，很容易以为自己的改动没生效）。把它改成与第 2 处同构：
   `not (evtype == lt2 and (lt2 == "L" or lt2 == "T"))`。
4. **带步长的切片**（`[::step]`）：元素一直是对的，只有结果标记写死成 `"L"` ⇒ 同样换成 `xb`。

## 3. 一个坑（本轮最贵的教训）

**改了条件之后，要确认"这个条件是不是唯一的判据"**：`+` 那条路上有两个判据（分支本身 + 兜底报错），
只改一个会出现"值算对了、然后又被报错"的假象。定位手法：给**报错点**（`beop = "+"` 那句）插一个
`fail`，把 `lt2`/`evtype`/`lt0` 打出来 —— 打出 `T/T` 就说明类型是对的、是**后面的判据**在拦。
另外顺手确认了 `parent` 链接在旧补丁插入过的链上**不可靠**（一串并列的 `if` 互相指成父子），
所以控制流要靠"报错点 + 逐层 `SUBSTACK`/`SUBSTACK2`"来读，不能只信 `parent`。

## 4. 本轮试过但**撤回**的部分

`(1, 2) * 2`（元组重复）也顺手试着一起修：把 `seq * int` / `int * seq` 两个分支的判据与结果标记
按同样办法放宽。结果**更糟**：`(1, 2) * 2` 从"报错"变成**打出空行**（静默给错答案），
`2 * (1, 2)` 打出未解码的记录串 —— 说明这条路上还有第三、第四个判据（字符串重复分支也会接住元组）。
**为避免带病出货整体撤回**，元组 `*` 仍是缺口，写进清单作下一轮候选。

## 5. 实测

| 套件 | v4.109 | **v4.110** |
|---|---|---|
| `d264.json`（本轮新写 **32 条**：元组切片 16 条（开/闭/负/空/步长/反向/嵌套/字面量/循环/相等/再取下标）、元组拼接 8 条、混合类型报错 4 条、列表与字符串回归 4 条） | 9/32 | **32/32** |
| `d263`（上一轮 join）24 · `d202`（序列运算符）24 | 全绿 | **全绿（不变）** |
| 快照 **133 套** | — | **130 套逐例相同**；3 处差异 = `d264` 的 23 条**由错转对**（ref false → new true）+ `t111h` M4（CPython 集合遍历顺序；MiniPy 两版输出都是 `{'a', 'b'}` / `{3, 1, 2}`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,096 块 errors=0 | **26,102 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.109 共 100 版全 MATCH | **v4.10…v4.110 共 101 版全 MATCH** |

本轮多 6 块积木（两个 `or` + 两个比较 + 两处条件替换），**没有**新过程、新变量、新列表。

## 6. 仍缺 / 下一轮（v4.111）候选

1. **元组重复** `(1, 2) * 2` / `2 * (1, 2)`（本轮撤回，见 §4；字符串重复分支也会接住元组，要先摸清那条链）
2. **嵌套调用实参里的字符串含逗号**：`len(','.join(x))` 报 `NameError: name 'len' is not defined`
   （`print(...)` 那一路不受影响 —— 实参扫描不数引号）
3. **`join` 收字符串**（`'-'.join('ab')`）
4. `[1, 2, 1].index(1, 1)` 的起始位置；`'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
5. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）、视图集合语义、非 ASCII

## 7. 前后对比

```
t=(1,2,3)
print(t[0:2])        v4.109:（内部记录串）   v4.110: (1, 2)
print(t[::2])        v4.109: [1, 3]          v4.110: (1, 3)
print(type(t[0:2]))  v4.109: <class 'str'>   v4.110: <class 'tuple'>
print(('a',)+('b',)) v4.109: TypeError: can only concatenate tuple (not "tuple") to tuple
                     v4.110: ('a', 'b')
print([1]+(2,))      v4.109: TypeError        v4.110: TypeError（不变）
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.110.sb3
node _work/v41/run.mjs MiniPy_v4.110.sb3 _work/cmp47/d264.json   # 元组切片/拼接 32 条
node _work/v41/run.mjs MiniPy_v4.110.sb3 _work/cmp47/d202.json   # 序列运算符 24 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.110.sb3 -tag v4110 -ref v4109
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4110 -ref v4109
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.110.sb3 -tag v4110
node _work/v41/check41.cjs MiniPy_v4.110.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.109 还原： $env:V41_SKIP='P183'; $env:V41_OUT='…/MiniPy_v4.109.sb3'; $env:V41_STAMP='MiniPy v4.109 - built 2026-09-17'; node _work/v41/build41.js
```
