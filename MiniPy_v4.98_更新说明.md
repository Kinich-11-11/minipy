# MiniPy v4.98 更新说明

本轮修掉**改"路径里的容器"整族失效**——`a[0].append(2)`、`d['k'].append(2)`、`a[0].sort()`、
`k.xs.append(2)`、`a[0][1] = 9` 以前都是**静默无效**（或报 `SyntaxError: expression`）。补丁 **P171**。

产物 `MiniPy_v4.98.sb3`：Interpreter 23,586 块，合计 **25,015**，`check41` errors=0。

## 1. 问题

| 代码 | v4.97（**错**） | **v4.98**（= CPython） |
|---|---|---|
| `a = [[1]]` / `a[0].append(2)` | 无变化 | `[[1, 2]]` |
| `d = {}` / `d['k'] = [1]` / `d['k'].append(2)` | 无变化 | `{'k': [1, 2]}` |
| `a = [[2, 1]]` / `a[0].sort()` | 无变化 | `[[1, 2]]` |
| `a = [[1, 2]]` / `a[0][1] = 9` | `SyntaxError: expression` | `[[1, 9]]` |
| `k = K()` / `k.xs = [1]` / `k.xs.append(2)` | 无变化 | `[1, 2]` |
| `a = [{'k': [1]}]` / `a[0]['k'].append(2)` | 无变化 | `[{'k': [1, 2]}]` |

## 2. 根因

容器是**记录串**、没有对象标识：改的只能是求值出来的那份**副本**，所以必须知道"从哪条路径读的"并把副本写回去。

`eval` 早就认得这种形态：`X . name ( ... )` 的 `.` 不在 `lo+1` 时调用
`methodcall2(lo, mdot, hi)` —— 它先把接收者表达式求值成 `mcval`/`mctype`，置 `mcpre = 1`
（"接收者是这个预算好的值"）再进 `methodcall`。做法派发**照常执行**，但写回时用的是
`Tok[mdot-1]`（接收者表达式的**最后一个 token**，通常是 `]`）—— 于是改动落进了一个叫 `]` 的变量，
外面什么都看不见。

## 3. 做法

给那个"写回"一个真正的目的地，四个新过程：

* **`pvok lo hi`** —— 这段 token 是不是一个左值路径（`名字` + 若干 `[...]` / `.名字`）？
  给出 `w6ok`（合法）与 `w6cap`（访问器个数）。
* **`pathset lo hi vt vv`** —— 把值写进这条路径，**递归**：末尾是 `[...]` 就求值下标、读出头部容器、
  改写那一段、再递归写回头部；末尾是 `.名字` 就写实例属性（`IAttr*` 是**堆**，按 id 存，不用回写）；
  只剩一个名字就是 `assign`。**元素改写本身交给现成的 `indexset`**：把合成语句
  `__pw[__pi]=__pv` 喂给 `tokenize`，于是转义、字典键、切片和所有报错文案都还在一处，
  写完再把当前行重新 `tokenize` 回来。
* **`aset iid name vt vv`** —— 实例属性的堆写入（照 P55 的 `attrSetEntry` 分支）。
* **`pdrop`** —— 路径写完（递归深度回到 0）后把 `__recv`/`__pi`/`__pw`/`__pv` 从
  `Names`/`Values`/`Types`/`Show` 里删掉，面板上不留临时名。

接线两处：

1. **`methodcall2`**：接收者路径合法时，把 `mcval` 存进 `__recv`、把 `Tok[mdot-1]` **改写成** `__recv`、
   正常跑派发（写回自然落到 `__recv`）、还原 token，然后**只在值真的变了**的时候
   `pathset(lo, mdot-1, …)` 写回路径（只读方法因此完全不改动原容器，也不会给元组/字符串元素招来新错误）。
2. **`execute`**：新增一个分支处理"左值有两个以上访问器"的语句（`a[0][1] = 9`、`k.xs[0] = 9`、`k.a.b = 9`）：
   扫出深度 0 的 `=`、`pvok` 验形状、`eval` 右边、`pathset`。

**函数内的路径写回**沿用 P169：`pathset` 的基本情形 `assign(名字, …)` 后面补一句 `publish`，
所以 `def f(): a[0].append(2)` 与 `def f(x): x[0].append(2)` 都能改到调用者（P21/P22）。

## 4. 三个坑

1. **一个 reporter 积木只能坐一个输入**（老坑，本轮最贵）。`OPEN(x)`/`CLOSE(x)` 把**同一个**
   `Tok[i]` 报告块塞进三个比较里 —— dump 出来的条件完全正确，运行时**恒假**：
   `pvok` 数到 `[` 之后，内层深度循环在 `]` 上既不认 open 也不认 close，于是 `w6d` 停在 1、
   `pvok` 答"不合法"，整条路静默失效。改法是让 `OPEN`/`CLOSE` 收 **thunk**（`() => tokAt(...)`），
   每次比较现造一个。
2. **`eval` 会冲掉解释器的公用暂存**（`xa`/`ln`/`ev`/`evtype`…），所以路径写入必须把头部容器、
   下标、待写值分别落进 `__pw`/`__pi`/`__pv` 再交给 `indexset` —— 而且合成语句要用
   `tokenize` 造，不能手摆 `Tok`（`Kind` 与 `count` 会被一起摆错）。
3. **合成 `tokenize` 之后必须把当前行 tokenize 回来**（`setV('w7pc', pc)` 先存行号，写完
   `tokenize(Code[w7pc])`），否则递归里的 `Tok[lo]`/`Tok[hi]` 全是合成语句的 token。

## 5. 实测

| 套件 | v4.97 | **v4.98** |
|---|---|---|
| `d250.json`（本轮新写 **26 条**：路径上调用改方法 7 种（`append`/`extend`/`insert`/`remove`/`pop`/`sort`/`reverse`）、字典值方法 3 种（`clear`/`update`/`setdefault`）、两层/三层下标赋值、属性路径（`k.xs.append`/`k.xs[0] = 9`）、列表里字典里的列表、字典里字典里的列表、路径表达式赋值、函数内与参数上的路径写回、只读方法不改动、越界与非容器报错） | 6/26 | **26/26** |
| `_path.json`（10 条探针） | 2/10 | **8/10**（余下两条是"读出元素再改"的**别名**问题，见 §6） |
| `_mutation_probe`（8 条）· `_mut2`（16 条） | 7/8 · 15/16 | **8/8 · 16/16**（`c[0][0] = 5` 这条随之转绿） |
| `d249` 42 · `d248` 61 · `d247` 45 · `d246` 64 · `d245` 30 · `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 · `d238` 26 · `d237` 18 | 全绿 | **全绿（不变，`d244` 仍只剩内建 `max(*xs)`）** |
| 快照 **120 套** | — | **116 套逐例相同**；4 处差异 = `_mut2` Q15 与 `_mutation_probe` O8（`c[0][0] = 5` 由错转对）+ `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出都是 `{'a','b'}`）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 24,664 块 errors=0 | **25,015 块 errors=0** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |
| `rebuild-old.ps1` | v4.10…v4.97 共 88 版全 MATCH | **v4.10…v4.98 共 89 版全 MATCH** |

新增 4 个过程（`pvok` `pathset` `aset` `pdrop`）、24 个变量（`w5*`~`w8*`）。

## 6. 仍缺：把元素**读进变量**再改（别名）

```
a = [[1]]
b = a[0]
b.append(2)      # CPython: a 变 [[1, 2]]；MiniPy: a 不变（只有 b 变了）
d = {'k': [1]}
b = d['k']
b.append(2)      # 同上
```
`a[0]` 被求值成一份**副本**存进 `b`，`b` 与路径之间没有任何联系。修法要在
"普通赋值且右边是路径"时登记一条"`b` 等价于路径 `a[0]`"的关系（P54 的 `AliasN`/`AliasT` 只能记名字），
改 `b` 时再按路径写回。**下一轮首选**（也是这一族最后一块）。探针 `_work/cmp47/_path.json` 的 V5/V6。

## 7. 前后对比

```
a = [[1]]
a[0].append(2)
print(a)                 v4.97: [[1]]           v4.98: [[1, 2]]

a = [[1, 2]]
a[0][1] = 9
print(a)                 v4.97: SyntaxError     v4.98: [[1, 9]]

d = {'a': {'b': [1]}}
d['a']['b'].append(2)
print(d)                 v4.97: {'a': {'b': [1]}}   v4.98: {'a': {'b': [1, 2]}}

class K:
    pass
k = K()
k.xs = [1]
def f():
    k.xs.append(2)
f()
print(k.xs)              v4.97: [1]             v4.98: [1, 2]
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.98.sb3
node _work/v41/run.mjs MiniPy_v4.98.sb3 _work/cmp47/d250.json  # 路径改动 26 条
node _work/v41/run.mjs MiniPy_v4.98.sb3 _work/cmp47/d249.json  # 上一轮 42 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.98.sb3 -tag v498 -ref v497
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v498 -ref v497
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.98.sb3 -tag v498
node _work/v41/check41.cjs MiniPy_v4.98.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.97 还原： $env:V41_SKIP='P171'; $env:V41_OUT='…/MiniPy_v4.97.sb3'; $env:V41_STAMP='MiniPy v4.97 - built 2026-09-17'; node _work/v41/build41.js
```

## 9. 下一轮（v4.99）候选

1. **读出元素再改的别名**（`b = a[0]` / `b = d['k']` 后改 `b` 要回写路径）——见 §6，**静默给错答案，最高优先级**
2. `t = ([1],)` 后 `t[0].append(2)`：元素写不回去（值语义），现在静默丢失
3. `min/max(key=…)`、`enumerate(xs, start)`、`sum(xs, start)`、扩展解包 `a, *rest = …`
4. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. 剩余字符串方法（`rfind` `rindex` `casefold` `strip(字符集)` `splitlines(keepends)` `translate`）
6. 全局数字 `n += 1` 在函数里当作局部读改写（CPython 是 `UnboundLocalError`）
