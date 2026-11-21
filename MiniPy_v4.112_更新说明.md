# MiniPy v4.112 更新说明

本轮让 **`max` / `min` / `sorted` 收字符串**（CPython 把字符串按**字符**迭代）。
补丁 **P185**。

产物 `MiniPy_v4.112.sb3`：Interpreter 25,395 块，合计 **26,824**，`check41` errors=0。

## 1. 问题

| 代码 | v4.111（**错**） | **v4.112**（= CPython） |
|---|---|---|
| `max('ba')` | `TypeError: 'max' object is not iterable` | `b` |
| `min('ba')` | `TypeError: 'min' object is not iterable` | `a` |
| `x = 'ba'; max(x)` | 同上 | `b` |
| `max('-'.join(['ab', 'cd']))` | 同上 | `d` |
| `sorted('ba')` | `TypeError: sorted() requires a list` | `['a', 'b']` |
| `sorted('ba', reverse=True)` | 同上 | `['b', 'a']` |
| `max(5)` | `TypeError: 'max' object is not iterable` | `TypeError: 'int' object is not iterable` |
| `max({'a': 1, 'b': 2})` / `max([1, 2])` / `max(1, 2)` / `max(1, 5, 3)` | 正常 ✓ | **不变** |
| `max('a', 'b')`（**两个实参**） | `TypeError: max requires numbers` | 仍报同样错误（**未交付**，见 §5） |

## 2. 做法

两处原因都只是**少了一个 `S`**：

1. `callfn` 里的**单实参** min/max（P78 装的）把可迭代白名单写成 `L/T/G`；
   而且报错文案拿 `argOf('fn')` 当类型名 —— 所以类型错误说出了 `'max' object is not iterable`。
2. `eval` 的 `sorted` 分支（以及 P101/P130 的 `reverse=`/`key=` 变体）只认 `evtype == "L"`。

P143 的 `charsplit` 本来就把字符串变成**字符列表**（P180 用它做 `reversed`），所以照 P149 处理字典的办法补一句：

* **min/max**：在可迭代检查的**正前方**插 `if evtype == "S" then charsplit`；
* **sorted**：在每个 `sorted() requires a list` 检查的**正前方**插同样一句；
* **文案**：not-iterable 改走 `tname` ⇒ `max(5)` 现在说 `TypeError: 'int' object is not iterable`。

## 3. 两个坑

1. **插在哪里非常关键**。`callfn` 收到的是**token 跨度**、不是值 —— 实测 `max('ba')` 进入 `callfn` 时 `evtype` 还是
   **`N`**（上一个操作的残留），所以"在 `callfn` 开头统一归一化"完全不生效；而 `sorted` 的那句 `fail` 位于
   **类型检查自己的 `SUBSTACK` 里**，插在 `fail` 前面已经太晚（检查早就决定失败了），必须插在**检查之前**。
2. **`parent` 链接在旧补丁拼出来的语句链上不可靠**。先用 `reach(SUBSTACK).has(fail)` 找"外层 if"，
   会把**链条后面的邻居**也算成包含关系（按大小挑"最内层"时会挑错，`max(dict)` 一度被弄坏）；
   最后改成**直接语句链**判据 —— "这个 `if` **自己的** `SUBSTACK` 链上就有那个 `fail`"，命中恰好 1 个。

## 4. 一处按测试回调（重要）

顺手把空序列文案改成记忆里的 CPython 说法 `max() arg is an empty sequence`，
结果 `d190` 的 B9/B17 立刻报 **`ref true`（= 回归）**：**本地 CPython（套件的裁判）实际说的是
`max() iterable argument is empty`**。于是把这一条**整段撤回**，保留 P134 的原文案。
教训：**文案以本机 CPython 为准，不以记忆或文档为准**。

## 5. 仍缺 / 下一轮（v4.113）候选

1. **两实参 `max('a', 'b')` / `min('a', 'b')`**：两个实参的调用被 `eval` 分派给 `builtin2`
   （数值型二实参内建），那里直接 `fail('TypeError: max requires numbers')`，没走 `minmax`。
   （多实参 `max(1, 5, 3)` 与三实参字符串都走 `minmax`，已经正常。）
2. **元组重复** `(1, 2) * 2`（v4.110 试过撤回：只放宽 `seq * int`/`int * seq` 会让它打出空行）
3. `join` 收字符串（`'-'.join('ab')`）
4. 列表 `index(x, start)`；`'a,b,c'.split(',', 1)` 的 `maxsplit`；`d.pop('x', 9)` 的默认值
5. `min/max(key=…)`、扩展解包 `a, *rest = …`、多访问器路径别名（`b = a[0][1]`，留档
   `_work/v41/_p176_twoaccessor.txt`）、内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、
   `find`/`rfind`/`count` 的 `end`、视图集合语义、非 ASCII

## 6. 实测

| 套件 | v4.111 | **v4.112** |
|---|---|---|
| `d266.json`（本轮新写 **24 条**：字符串的 max/min/sorted（含 `reverse=`、切片、join、f-string、循环）、空序列/非可迭代报错、dict/range/tuple/set/浮点与多实参回归） | 11/24 | **24/24** |
| `d190`（内建异常文案 46 条） | 46/46 | **46/46（不变）** |
| `d265` 32（逗号） · `d264` 32（元组切片/拼接） · `d263` 24（join） · `d202` 24（序列运算符） | 全绿 | **全绿（不变）** |
| 快照 **135 套** | — | **132 套逐例相同**；3 处差异 = `d266` 的 15 条**由错转对**（`ref false` → `new true`）+ `t111h` M4（CPython 集合遍历顺序；MiniPy 两版输出都是 `{'a', 'b'}` / `{3, 1, 2}`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,802 块 errors=0 | **26,824 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.111 共 102 版全 MATCH | **v4.10…v4.112 共 103 版全 MATCH** |

本轮只多 22 块积木（3 条 `if evtype == "S"` + 3 次 `charsplit` + 文案替换），
**没有**新过程、新变量、新列表。

## 7. 前后对比

```
print(max('ba'))            v4.111: TypeError: 'max' object is not iterable   v4.112: b
print(min('ba'))            v4.111: TypeError: 'min' object is not iterable   v4.112: a
print(sorted('ba'))         v4.111: TypeError: sorted() requires a list       v4.112: ['a', 'b']
print(sorted('ba', reverse=True))  v4.111: 同上                               v4.112: ['b', 'a']
print(max(5))               v4.111: TypeError: 'max' object is not iterable   v4.112: TypeError: 'int' object is not iterable
print(max([1, 2]))          v4.111: 2                                         v4.112: 2（不变）
print(max({'a': 1}))        v4.111: a                                         v4.112: a（不变）
print(max('a', 'b'))        v4.111: TypeError: max requires numbers           v4.112: 同样报错（未交付，见 §5）
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.112.sb3
node _work/v41/run.mjs MiniPy_v4.112.sb3 _work/cmp47/d266.json   # 字符串 max/min/sorted 24 条
node _work/v41/run.mjs MiniPy_v4.112.sb3 _work/cmp47/d190.json   # 内建异常文案 46 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.112.sb3 -tag v4112 -ref v4111
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4112 -ref v4111
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.112.sb3 -tag v4112
node _work/v41/check41.cjs MiniPy_v4.112.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.111 还原： $env:V41_SKIP='P185'; $env:V41_OUT='…/MiniPy_v4.111.sb3'; $env:V41_STAMP='MiniPy v4.111 - built 2026-09-17'; node _work/v41/build41.js
```
