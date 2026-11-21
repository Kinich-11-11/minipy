# MiniPy v4.100 更新说明

本轮补上**清单里最后一块"容器写回"**：把元素**读进变量**再改，也要写回原来的路径。
`b = a[0]; b.append(2)` 以前只改到副本，`a` 不变（**静默给错答案**）。补丁 **P173**。

产物 `MiniPy_v4.100.sb3`：Interpreter 23,993 块，合计 **25,422**，`check41` errors=0。

## 1. 问题

| 代码 | v4.99（**错**） | **v4.100**（= CPython） |
|---|---|---|
| `a = [[1]]` / `b = a[0]` / `b.append(2)` | `a` 仍是 `[[1]]` | `[[1, 2]]` |
| `d = {'k': [1]}` / `b = d['k']` / `b.append(2)` | `d` 不变 | `{'k': [1, 2]}` |
| `b = a[0]` / `b[0] = 9` / `b.extend([…])` / `b.pop()` / `b.clear()` | 同上 | 写回 `a[0]` |
| `d = {'k': {}}` / `b = d['k']` / `b['a'] = 1` | `d` 不变 | `{'k': {'a': 1}}` |
| `k.xs` 读出后 `append` | 属性不变 | 属性更新 |
| `b = a[-1]` 负下标读出再改 | 同上 | 写回最后一个元素 |
| 函数里 `b = a[0]; b.append(2)` | 同上 | 写回（含跨帧，P169） |
| `c = b`（P54 的名字别名）再改 | 同上 | 一路写回到路径 |

## 2. 做法

容器是**记录串**、没有对象标识：`a[0]` 被求值成一份副本存进 `b`，两者之间没有任何联系，
P54 的 `AliasN`/`AliasT` 也只能记**名字**。P173 加了一张**路径别名表**，但**一个 token 都不存**：

* `execute` 看到 `名字 = <路径>` 且路径是"基名 + **恰好一个**访问器"时，**当场**把访问器求值成值存下来：
  `[...]` 存下标的值与类型，`.名字` 存属性名。（当场求值也更贴近 Python：别名指向**读到的那一格**，
  而不是"以后那个下标表达式算出来是什么"。）
* 别名表：`PthN`/`PthB`（名字/基名）+ `PthS`/`PthK`（在访问器表里的位置与个数），
  访问器表是三条平行列表 `PtM`/`PtT`/`PtY`（模式 / 文本 / 类型）。
* 写回是**纯粹的记录串手术**：新过程 **`lsetv`**（列表记录换一个元素：找 `lsep` 边界、`lesc` 转义、
  负数下标归一化、越界报 `IndexError: list assignment index out of range`）、
  **`dsetv`**（字典记录换一个键：逐对 `listitem` 读出来、键相等用 `compareText`、命中就换值、
  没命中就追加，整串重建）、属性交给 P171 的 `aset`（`IAttr*` 是堆）。之后
  `assign(基名, …)` + `publish(基名)`，于是函数帧里也看得见（P169）；名字别名（`c = b`）也走一遍。
* 重新绑定会丢掉别名（钩在 `aldrop` 上），RUN 时清空整张表，递归有深度上限（4）。

**只记"单访问器"路径**：`b = a[0][1]`（两个访问器）与 `b = f()[0]`（基名不是普通名字）
**故意不记**——保持原行为，不去冒写错的风险。

## 3. 上一版撤下来的教训（这次全部用上了）

v4.99 我试过一版"把路径存成 **token** 再交给 `pathset` 重放"的实现，最后一版仍会把值写错，
整体撤掉。这轮的结论直接决定了新设计：

1. **路径不能存成文本**：分词器会把字符串字面量的引号剥掉，`d['k']` 还原出来是 `d[k]`，
   于是 `k` 被当变量查。存 token 可以绕开，但……
2. **往解释器的全局 `Tok`/`Kind` 里装 token 太脆**：`pathset` 认为"恢复现场 = `tokenize(Code[pc])`"，
   可在飞的 token 属于**录制的路径**而不是当前行；一装一还原之间还有嵌套的 `publish`/`eval`，
   稍有不慎写回就落到别的名字上（当时 `b` 变成了 `[[1], 2]`）。⇒ **改成"一个 token 都不存"**，
   只存**下标的值**与**基名**，写回用 `lsetv`/`dsetv`/`aset`。
3. **`replaceStmt` 只重接一条语句**：用 `chain([...])` 去替换时只有第一条被接上，链的其余部分被丢掉。
4. **`VR('名字')` 是描述符不是积木 id**、`chgV` 收的是**名字字符串**（写成 `chgV(F('x'), …)` 会挂）——
   这轮构建期就踩了一次。

**本轮自己的两个坑**：①搜索"路径末尾的 `]` 之后"时把下标跨度算成了 `[+1 .. ]的位置+1`，
多带了一个 `]`，`eval` 直接报 `SyntaxError: parentheses`（改完还顺手把探测失败的 `error` 清掉，
免得记录失败连累整条赋值语句）；②访问器表是**三条平行列表**，所以 `PthS` 应该是
`llen('PtM')`（一个访问器一条），我却按"一个访问器三条"写成 `llen('PtM') - 2`，
于是 `PthS` 成了 `-1`、写回时读到空记录。

## 4. 实测

| 套件 | v4.99 | **v4.100** |
|---|---|---|
| `d253.json`（本轮新写 **15 条**：列表/字典元素读出后 `append`/`extend`/`insert`/`pop`/`clear`/`reverse`/下标赋值、字典元素读出后加键、属性读出后改、负下标、函数内、名字别名 `c = b`、重新绑定后不再写回） | 1/15 | **15/15** |
| d252 9 · d250 26 · d249 42 · d248 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **122 套** | — | **120 套逐例相同**；3 处差异 = `d253` 的 14 条由错转对 + `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,080 块 errors=0 | **25,422 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.99 共 90 版全 MATCH | **v4.10…v4.100 共 91 版全 MATCH** |

新增 3 个过程（`lsetv` `dsetv` `palwrite` `paldrop` 共 4 个）、7 条列表
（`PthN` `PthB` `PthS` `PthK` `PtM` `PtT` `PtY`）、32 个变量（`p10*`/`p11*`）。

## 5. 前后对比

```
a = [[1]]
b = a[0]
b.append(2)
print(a, b)          v4.99: [[1]] [1, 2]        v4.100: [[1, 2]] [1, 2]

d = {'k': [1]}
b = d['k']
b.append(2)
print(d)             v4.99: {'k': [1]}          v4.100: {'k': [1, 2]}

class K:
    pass
k = K()
k.xs = [1]
b = k.xs
b.append(2)
print(k.xs)          v4.99: [1]                 v4.100: [1, 2]

a = [[1]]
b = a[0]
b = [5]              # 重新绑定：别名作废
print(a, b)          v4.99: [[1]] [5]           v4.100: [[1]] [5]（不变）
```

## 6. 仍缺 / 下一轮（v4.101）候选

1. `b = a[0][1]`（两个以上访问器的别名）与 `b = f()[0]` —— 本轮故意不记
2. `enumerate(xs, start)`（P99 的 enumerate 构造器在产物里还没定位到：`xsp`/`xsi` 没出现在
   `callfn` 的任何赋值里，需先重新找那段代码）
3. `min/max(key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
4. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. 剩余字符串方法（`rfind` `rindex` `casefold` `strip(字符集)` `splitlines(keepends)`）、视图集合语义、非 ASCII

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.100.sb3
node _work/v41/run.mjs MiniPy_v4.100.sb3 _work/cmp47/d253.json # 读出元素再改 15 条
node _work/v41/run.mjs MiniPy_v4.100.sb3 _work/cmp47/d252.json # 上一轮 9 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.100.sb3 -tag v4100 -ref v499
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4100 -ref v499
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.100.sb3 -tag v4100
node _work/v41/check41.cjs MiniPy_v4.100.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.99 还原： $env:V41_SKIP='P173'; $env:V41_OUT='…/MiniPy_v4.99.sb3'; $env:V41_STAMP='MiniPy v4.99 - built 2026-09-17'; node _work/v41/build41.js
```
