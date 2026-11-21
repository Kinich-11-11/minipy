# MiniPy v4.99 更新说明

本轮补上**内建 `sum` 的起始值**：`sum(xs, 10)`（以及 `sum([], 5)`、`sum({1,2}, 3)` 等）
以前报 `NameError: name 'sum' is not defined`。补丁 **P172**。

产物 `MiniPy_v4.99.sb3`：Interpreter 23,651 块，合计 **25,080**，`check41` errors=0。

## 1. 问题

| 代码 | v4.98（**错**） | **v4.99**（= CPython） |
|---|---|---|
| `sum([1, 2, 3])` | `6` ✓ | `6` |
| `sum([1, 2, 3], 10)` | `NameError: name 'sum' is not defined` | `16` |
| `sum([], 5)` | `NameError` | `5` |
| `sum([1.5, 2], 0.5)` | `NameError` | `4.0` |
| `sum({1, 2}, 3)` | `NameError` | `6` |
| `sum(xs, n)`（表达式/变量做起始值） | `NameError` | 正确相加 |
| `sum([1], 'a')` | `NameError` | `TypeError: unsupported operand type(s) for +: 'int' and 'str'` |

## 2. 根因与做法

`sum(xs)` 的分支在 `callfn` 的内建派发里，而**只有"没有顶层逗号"的调用**才会走到那里
（`eval` 的 `narg == 0` 分支负责把唯一一个实参求值好、再把函数名交给 `callfn`）。
`sum(xs, 10)` 有逗号 ⇒ 落进"多实参内建"那条路 ⇒ `NameError`。P99 给 `zip` 解决过同一形态：
在 `eval` 的 `narg` 派发**之前**挂一个钩子。P172 就照这个位置再挂一个：

1. 钩子只认 `Tok[lo] == 'sum'` 且顶层逗号恰好一个（`hascomma`）；
2. **先求值起始值**（`ev` 落在它上面），不是数字就报 CPython 的
   `TypeError: unsupported operand type(s) for +: 'int' and '<类型>'`（类型名走现成的 `tname`），
   存进 `sstart`；
3. 再求值序列（`ev` 落在它上面），**在序列的跨度上重入 `callfn`** —— 求和本身还是原来那段代码，
   于是集合/生成器/报错文案全都一字不变；
4. 回到钩子里把起始值加上。`sum([], 5)`（求和结果是 0）直接给起始值本身，与 CPython 一致。

**一个坑**：Scratch 的 `+` 会把 `4.0` 变成 `4`（浮点形态靠**文本里有没有 `.`** 承载），
所以 `sum([1.5, 2], 0.5)` 会打印 `4` 而不是 `4.0` ⇒ 相加后若结果文本没有 `.`、而两个操作数里
至少有一个有 `.`，就补一个 `.0`（P121/P122 用的同一招）。

## 3. 实测

| 套件 | v4.98 | **v4.99** |
|---|---|---|
| `d252.json`（本轮新写 **9 条**：单参、起始值、空表起始、浮点起始、集合、变量做起始、表达式做起始、字符串起始报错、列表起始报错） | 3/9 | **9/9** |
| d250 26 · d249 42 · d248 61 · d247 45 · d246 64 | 全绿 | **全绿（不变）**；（featprobe 248/259、gaps433 61/63、rames fib16 6388 均不变） |
| 快照 **120 套** | — | **118 套逐例相同**；4 处差异 = `d252` 的 8 条由错转对 + `t111h` M4 / `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,015 块 errors=0 | **25,080 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.98 共 89 版全 MATCH | **v4.10…v4.99 共 90 版全 MATCH** |

新增 4 个变量（`ssum` `ssum2` `sstart` `sstartt`），**没有**新过程、新列表。

## 4. 本轮走过的一段弯路（记下来，下轮接着做）

本轮先尝试了清单里的"**读出元素再改的别名**"（`b = a[0]; b.append(2)` 要让 `a` 也变），
机制已经摸清并实现了大半，但最后一版跑出来仍会把值写错，**为避免带病出货，这一版整体撤掉了**
（补丁留档在 `_work/v41/_p172_attempt.txt`，未进构建）。已经确认的结论：

* `a[0]` 被求值成**副本**存进 `b`，两者之间没有任何联系；P54 的 `AliasN`/`AliasT` 只能记**名字**，
  表达不了"等价于某条路径"⇒ 需要一张**路径别名表**。
* 路径**不能存成文本**：分词器会把字符串字面量的引号剥掉，`d['k']` 还原出来是 `d[k]`，
  于是 `k` 被当成变量查（第一版就是这么整片错的）。**要存 token 与 Kind**（`PtTok`/`PtKnd` + 下标区间）。
* 写回复用 P171 的 `pathset` 时，`pathset` **不能**用 `tokenize(Code[pc])` 恢复现场 ——
  那时在飞的 token 属于**录制下来的路径**而不是当前行；它必须先把 `Tok`/`Kind` 快照下来再还原。
* **`replaceStmt` 只重接一条语句**：用 `chain([...])`（多条）去替换时，只有第一条被接上，
  链的其余部分被丢掉（症状：恢复 token 的循环不见了 ⇒ `Tok` 只剩一条 `clearL`，`Tok[1]` 变空）。
  要整条链插入就把链 `insertBeforeStmt` 再手工摘掉被替换的那条。
* 撤掉前的状态：`d251`（20 条别名用例）只有 2 条过，且**值会被写坏**（`b` 变成 `[[1], 2]`），
  所以必须继续查；探针 `_work/cmp47/_path.json` 的 V5/V6 仍是这一族的代表。

## 5. 仍缺 / 下一轮（v4.100）候选

1. **读出元素再改的别名**（`b = a[0]` / `b = d['k']` 后改 `b` 要回写路径；见 §4，**静默给错答案**，
   最高优先级 —— 机制与四个坑都已记录，接着做即可）
2. `enumerate(xs, start)`（本轮的钩子位置已经验证可用，但 P99 的 enumerate 构造器在产物里
   没找到（`xsp`/`xsi` 未出现在 `callfn` 的任何赋值里），需要先重新定位那段代码）
3. `min/max(key=…)`、扩展解包 `a, *rest = …`
4. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. 剩余字符串方法、视图集合语义、非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.99.sb3
node _work/v41/run.mjs MiniPy_v4.99.sb3 _work/cmp47/d252.json  # sum 起始值 9 条
node _work/v41/run.mjs MiniPy_v4.99.sb3 _work/cmp47/d250.json  # 上一轮 26 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.99.sb3 -tag v499 -ref v498
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v499 -ref v498
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.99.sb3 -tag v499
node _work/v41/check41.cjs MiniPy_v4.99.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.98 还原： $env:V41_SKIP='P172'; $env:V41_OUT='…/MiniPy_v4.98.sb3'; $env:V41_STAMP='MiniPy v4.98 - built 2026-09-17'; node _work/v41/build41.js
```
