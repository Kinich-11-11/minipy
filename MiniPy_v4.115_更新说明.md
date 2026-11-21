# MiniPy v4.115 更新说明

本轮把 **元组重复 `(1, 2) * 2`** 做出来 —— 这正是 v4.110 试过、当时只好撤回的那一条。
补丁 **P188**。

产物 `MiniPy_v4.115.sb3`：Interpreter 25,451 块，合计 **26,880**，`check41` errors=0。

## 1. 问题

| 代码 | v4.114（**错**） | **v4.115**（= CPython） |
|---|---|---|
| `(1, 2) * 2` | `TypeError: unsupported operand type(s) for *: 'tuple' and 'int'` | `(1, 2, 1, 2)` |
| `2 * (1, 2)` | 打出**未解码记录串**两遍（`\x1fN1\x1fN2\x1fN1\x1fN2`） | `(1, 2, 1, 2)` |
| `t = (1, 2); t * 3` | 同上报错 | `(1, 2, 1, 2, 1, 2)` |
| `(1, 2) * 0` / `* -1` | 报错 | `()` |
| `(1,) * 3` / `() * 3` | 报错 | `(1, 1, 1)` / `()` |
| `('a', 'b') * 2` / `(1, (2, 3)) * 2` | 报错 | 正常（含嵌套） |
| `len((1, 2) * 3)` / `(1, 2) * 2 == (1, 2, 1, 2)` | 报错 | `6` / `True` |
| `[1, 2] * 2` / `'ab' * 2` / `3 * 4` | 正常 ✓ | **不变** |
| `(1, 2) * 1.5` / `(1, 2) * 'a'` / `[1] * 'a'` / `'a' * 'b'` / `{'a': 1} * 2` | 报错 ✓ | **不变**（`can't multiply sequence by non-int of type ...`） |

## 2. 为什么 v4.110 那次会失败：两处都要改

1. `rightside` 里两个重复分支的顺序侧判据是 `lt2 == "L"` / `evtype == "L"`
   （v4.110 放宽的正是它们，结果标记也跟着顺序侧走）；
2. **紧跟其后的字符串重复分支**写成
   `op == "*" and (lt2 == "S" or evtype != "N") and not (lt2 == "L" or evtype == "L")`
   —— 列表分支把结果标成 `"T"` 之后，这个条件**又成立了**：字符串分支于是把那份"记录串"再重复一遍、
   还把 `evtype` 改回 `"S"`。**这就是 v4.110 打出空行 / 乱码的原因**，也是当时只改第一处不生效的原因。

## 3. 做法

* **收紧字符串分支**：`(lt2 == "S" or evtype != "N")` → `(lt2 == "S" or evtype == "S")`
  —— 重复字符串的前提是真有一侧是字符串。
* **放宽两个序列分支**：顺序侧判据由 `== "L"` 改成 `== "L" or == "T"`，结果标记取**顺序侧**（列表仍是 `"L"`、元组是 `"T"`）。

非法组合照旧报错：P139 的 `*` 合法性检查本来就把元组算作序列，
所以 `(1, 2) * 1.5`、`(1, 2) * "a"`、`[1] * "a"`、`"a" * "b"`、`{"a": 1} * 2` 都仍然是
`can't multiply sequence by non-int of type ...`。

## 4. 实测

| 套件 | v4.114 | **v4.115** |
|---|---|---|
| `d269.json`（本轮新写 **28 条**：元组×整数 / 整数×元组 / 0 / 1 / 负数 / 变量 ×2 / 单元素 / 空元组 / 字符串元素 / 嵌套元组 / 表达式因子 / `len` / 相等 / 循环 / 拼接 / `join` / `tuple()` / 布尔 / 取下标，加列表与字符串重复、数值乘法 3 条回归与 5 条非法组合） | 8/28 | **28/28** |
| `d268` 22（嵌套 max/min） · `d267` 29（max/min 实参） · `d266` 24（字符串 max/min/sorted） · `d265` 32（逗号） · `d264` 32（元组切片/拼接） · `d202` 24（序列运算符） | 全绿 | **全绿（不变）** |
| 快照 **138 套** | — | **135 套逐例相同**；3 处差异 = `d269` 的 20 条**由错转对** + `t113` F6（CPython 集合遍历顺序；MiniPy 两版输出都是 `a`/`b`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,877 块 errors=0 | **26,880 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.114 共 105 版全 MATCH | **v4.10…v4.115 共 106 版全 MATCH** |

本轮只多 3 块积木（一个新比较 + 两个 `or`），**没有**新过程、新变量、新列表。

## 5. 前后对比

```
print((1, 2) * 2)          v4.114: TypeError: unsupported operand type(s) for *: 'tuple' and 'int'
                           v4.115: (1, 2, 1, 2)
print(2 * (1, 2))          v4.114: （未解码记录串两遍）   v4.115: (1, 2, 1, 2)
print((1, 2) * 0)          v4.114: TypeError              v4.115: ()
print(len((1, 2) * 3))     v4.114: TypeError              v4.115: 6
print([1, 2] * 2)          v4.114: [1, 2, 1, 2]           v4.115: [1, 2, 1, 2]（不变）
print('ab' * 2)            v4.114: abab                   v4.115: abab（不变）
```

## 6. 仍缺 / 下一轮（v4.116）候选

1. `join` 收字符串（`'-'.join('ab')`）
2. 列表 `index(x, start)`（`[1, 2, 1].index(1, 1)`）
3. `'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
4. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`、视图集合语义、非 ASCII

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.115.sb3
node _work/v41/run.mjs MiniPy_v4.115.sb3 _work/cmp47/d269.json   # 元组重复 28 条
node _work/v41/run.mjs MiniPy_v4.115.sb3 _work/cmp47/d202.json   # 序列运算符 24 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.115.sb3 -tag v4115 -ref v4114
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4115 -ref v4114
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.115.sb3 -tag v4115
node _work/v41/check41.cjs MiniPy_v4.115.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.114 还原： $env:V41_SKIP='P188'; $env:V41_OUT='…/MiniPy_v4.114.sb3'; $env:V41_STAMP='MiniPy v4.114 - built 2026-09-17'; node _work/v41/build41.js
```
