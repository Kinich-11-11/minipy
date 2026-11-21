# MiniPy v4.95 更新说明

本轮修掉一个**给错答案**的老 bug：**链式比较** `1 < 2 < 3`。以前 MiniPy 把它读成
`1 < (2 < 3)`（左结合），于是 `1 < 3 < 2` 回答 `True`（CPython 是 `False`）、
`'a' < 'b' < 'c'` 报 `TypeError: incompatible comparison`、`while 0 <= n < 3:` 的函数体
一次都不执行。补丁 **P168**。

产物 `MiniPy_v4.95.sb3`：Interpreter 22,903 块，合计 **24,332**，`check41` errors=0。

## 1. 问题

CPython 的 `a op1 b op2 c` 等价于 `(a op1 b) and (b op2 c)`：**每个操作数只求值一次**，
第一个为假的比较就短路，整条链的值就是那个"第一次为假的比较"的值（全真时是最后一个比较的值）。

MiniPy 以前的左结合读法带来三种症状：

| 代码 | v4.94 | **v4.95**（= CPython） |
|---|---|---|
| `1 < 3 < 2` | `True`（**错答案**） | `False` |
| `1 < 2 < 3` | `True`（碰巧对） | `True` |
| `'a' < 'b' < 'c'` | `TypeError: incompatible comparison` | `True` |
| `while 0 <= n < 3:` | 函数体一次都不执行 | 正常迭代 |
| `f() < g() < h()` | `g()` 求值两次 | 每个各一次 |
| `1 < 2 < 3 or 9 < 1` | 报错 / 错答案 | `True` |
| `[] == [] == []` / `1 in [1, 2] in [[1, 2]]` | 错答案 | `True` |

## 2. 做法

`eval` 扫出一个运算符、把它的 token 下标存进 `ecut`，然后调
`pair(lo, hi, cut, Tok[cut])`；`pair` 求值**左**片段，把**剩下的**（`cut+1 .. hi`）交给
`rightside` —— 这正是"剩下的链变成右操作数"的来源。所以修法是**在 `pair` 的入口挂一个钩子**：

* 跨度里（**深度 0**）有 **2 个以上**比较运算符时，交给新过程 **`chain %s %s %s %s`**
  （`lo`、`hi`、第一个运算符的下标、运算符本身），然后 `STOPTHIS()` 让 `pair` 的原逻辑不再跑。
* `chain` 从左往右走：每步**求值一次**下一个操作数，把值用 `assign` 停进临时变量 `__chain`，
  再把那个操作数的**第一个 token 改写成** `__chain`（文本 `__chain`、类型 `I` = 变量引用），
  于是 `rightside(q8v1, q8t1, op, k, k)` 比的就是**两个值**；比完立刻把 token 与 Kind 还原。
* `truth` 判第一个比较，为假就把它的值当链的结果返回（**短路**）；为真则把"中间操作数"
  提升为新的左操作数、继续下一个运算符。循环结束后把 `__chain` 从
  `Names`/`Values`/`Types`/`Show` 四条并行列表里删掉（P155 的 `__fmt` 就是这么收尾的）。
* 参与链的运算符：`<` `>` `<=` `>=` `==` `!=` `in` `is`（`is not` 在 P12 里已被并成一个 token，
  故不在表内，但仍会经由 `in`/`is` 的相邻分支自然处理）。

## 3. 两个坑

1. **钩子必须先看"切点本身是不是比较运算符"**。`eval` 是按**优先级最低**的运算符切分的，
   所以 `1 < 2 < 3 or 9 < 1` 会先按 `or` 切、交给 `pair` 的跨度里有 **4 个**比较运算符 ——
   第一版照"数够 2 个就串链"处理，把 `9 < 1` 也串进了左链，`P38` 用例直接红。
   修法是把"数一遍 + 串链"整段包进 `IF(isOpTok(argOf('op')), …)`。
2. **变量名撞车**（老坑）：第一版用 `c1v`/`c1t`/`cdep`/`ci` 等短名，构建直接报
   `no variable c1v in Interpreter` —— 与推导式辅助变量重名。另外**过程实参不能用变量名代替**
   （`F('cut')` 会报 `no variable cut`），循环状态一律落到自己的 `q8*` 上，
   只在过程开头从 `argOf` 拷一份。

## 4. 实测

| 套件 | v4.94 | **v4.95** |
|---|---|---|
| `d247.json`（本轮新写 **45 条**：`< > <= >= == != in is` 八种运算符的两段链、三段/四段链、括号、算术操作数、`if`/`while` 条件、短路、**中间操作数只求值一次**、元组/列表/长度比较、与 `and`/`or` 混排、推导式、结果类型） | 28/45 | **45/45** |
| `d246` 64 · `d245` 30 · `d244` 30 · `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 | 全绿（`d244` 只剩内建 `max(*xs)`） | **全绿（不变）** |
| 快照 **116 套** | — | **113 套逐例相同**；3 处差异 = `d247` 的 17 条由错转对 + `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出都是 `a\|b`）+ `featprobe3`（`enumerate`/`zip` 地址）⇒ **`ref true` 0，零回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 24,089 块 errors=0 | **24,332 块 errors=0** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |
| `gaps433`（63 条缺口复核） | 61/63 | **61/63**（仍只 fail E50/G5） |
| `rebuild-old.ps1` | v4.10…v4.94 共 85 版全 MATCH | **v4.10…v4.95 共 86 版全 MATCH** |

新增 1 个过程（`chain`）、19 个变量（统一 `q8*` 前缀）。

## 5. 本轮探针发现的**另一个真 bug**（留给下一轮）

写 `d247` 的探针时顺手验证了"函数里改容器"，发现一个**静默给错答案**的既有 bug：

```
def f():
    c[0] = 5          # 改不动（函数外看不到）
    c.append(1)       # 同上
    d['a'] = 5        # 同上
    c[0][0] = 5       # SyntaxError: expression
```

`c = [5]`（重新绑定）在函数里**正确地**保持局部，但**改容器的内容**会丢 ——
根因应当是 `fpush`/`fpop` 存档/恢复时把容器的记录串当**值**复制，
函数内的原地修改没有写回外层变量。**这是"给错答案"，优先级高于本清单其余项**，
已写进 `_work/cmp47/v4_缺失清单.md` 的"再往后"首位。

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| **函数内改容器内容**（`c[0]=5`、`c.append(1)`、`d['a']=5`） | **静默丢弃**（见 §5，下轮首选）；`c[0][0]=5` 报 `SyntaxError: expression` |
| 链式比较的边界 | 只处理**深度 0** 的运算符（括号内的链由内层 `eval` 自然处理）；`is not` 走 P12 的合并路径 |
| 扩展解包赋值 `a, *rest = [1, 2, 3]` | 不支持 |
| `min/max(key=…)`、`enumerate(xs, start)`、`sum(xs, start)` | 不支持 |
| 字典 `\|` / `\|=` 合并运算符 | 不支持 |
| 内建的 `*` 展开（`max(*xs)`、`zip(*m)`）、方法调用解包 `obj.m(*xs)` | 不支持 |
| 剩余字符串方法（`rfind` `rindex` `casefold` `strip(字符集)` `splitlines(keepends)` `translate`） | 不支持 |
| 海象运算符 `:=`、三引号字符串、复数 | 不支持 |
| 视图的集合语义、字典大小比较、`{'a': 1} == {'a': 1.0}`、TAB 制表位宽度、非 ASCII | 同前几版 |

## 7. 前后对比

```
print(1 < 3 < 2)              v4.94: True（错）    v4.95: False
print(1 < 2 < 3)              v4.94: True          v4.95: True
print('a' < 'b' < 'c')        v4.94: TypeError     v4.95: True
print(3 > 2 > 1 > 0)          v4.94: 错答案        v4.95: True
n = 0
while 0 <= n < 3: n += 1      v4.94: 死循环/不进    v4.95: n = 3
print(1 < 2 < 3 or 9 < 1)     v4.94: 报错/错答案    v4.95: True
print(1 in [1, 2] in [[1, 2]]) v4.94: 错答案       v4.95: True
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.95.sb3
node _work/v41/run.mjs MiniPy_v4.95.sb3 _work/cmp47/d247.json  # 链式比较 45 条
node _work/v41/run.mjs MiniPy_v4.95.sb3 _work/cmp47/d246.json  # 上一轮 64 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.95.sb3 -tag v495 -ref v494
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v495 -ref v494
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.95.sb3 -tag v495
node _work/v41/check41.cjs MiniPy_v4.95.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.94 还原： $env:V41_SKIP='P168'; $env:V41_OUT='…/MiniPy_v4.94.sb3'; $env:V41_STAMP='MiniPy v4.94 - built 2026-09-17'; node _work/v41/build41.js
```

## 9. 下一轮（v4.96）候选

1. **函数内改容器内容会丢**（`c[0] = 5`、`c.append(1)`、`d['a'] = 5`，见 §5）——**给错答案，最高优先级**
2. `c[0][0] = 5` 的两层下标赋值报 `SyntaxError: expression`
3. 扩展解包赋值 `a, *rest = [1, 2, 3]`
4. `min/max(key=…)`、`enumerate(xs, start)`、`sum(xs, start)`
5. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）与方法调用解包 `obj.m(*xs)`
6. 字典 `|` / `|=` 合并运算符
