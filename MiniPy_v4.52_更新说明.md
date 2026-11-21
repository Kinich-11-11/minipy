# MiniPy v4.52 更新说明

本轮清掉清单第 4 条 **双 `for` 推导式**（顺带把**任意条子句**的推导式做通：列表/集合/字典三种都能写
`[e for a in A for b in B if c]`）。一个补丁 **P125**，探针 `t139.json` **31/31**（`t115c` 的 X1 也从红转绿），
缺口套件与全部既有回归**零退化**。

产物 `MiniPy_v4.52.sb3`：Interpreter 15,532 块，合计 **16,961**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P125a** 子句递归 | 4 | `complist` 原来只会找**第一个** `for`：`for` 之前是元素表达式、`in` 之后（到可选 `if`）是迭代源。于是第二个 `for` 落在"迭代源"里，`range(3) for y in range(2)` 被丢给 `eval`，深度扫描见了 `)` 就报 `SyntaxError: parentheses`。改成**一个子句一层递归**：新增 `cdo <lo> <be> <hi> <pos> <dict>`，每次找 `<pos>` 之后第一个**深度 0** 的 `for`/`if`，算出这条子句的结束位置（下一个子句的前一个 token），`for` 就迭代并递归、`if` 就求值后递归、都没有就把元素表达式（`lo..be`，即第一个 `for` 之前那段）算出来追加进累加器 |
| **P125b** 迭代源两种走法 | 4 | 每条 `for` 的迭代源分两条路：字面 `range(...)` 走算术循环（原来的快路径，抽成 `crng`，且因为它对每条子句都要重新求值，`for y in range(x)` 这种"内层依赖外层变量"自然就对了）；其余可迭代对象先 `eval` 一次，再按列表/元组/集合（同一套编码）逐元素走、按字符串逐字符走 |
| **P125c** 三种推导共用 | 4 | `complistD`（P108 是 `complist` 的**构建期克隆**，所以必须单独处理）与集合推导（`eval` 里借道 `complist` + `setnorm`）都指向同一个驱动；字典推导多一步 `dlast`：重复键**保留最后一条**（CPython 的 `{x: y for x in range(2) for y in range(2)}` 是 `{0: 1, 1: 1}`，不是四对） |
| **P125d** 状态保护 | 4 | 递归调用会跑一整个内层推导，把外层循环正在用的全局（`cv/cstop/cstep/clist/cn/cqidx/...`）全部覆盖；而 **`cacc` 必须共享**（整条推导共用同一个累加器），所以不能直接用 P98 的 `csave/crestore`（那会把 `cacc` 一起还原）。新增 `csp`/`crp` 只压/弹"循环状态"那 17 个变量，递归调用前后各一次 |
| **P125e** 配套 | 4（顺带） | ① 重新施加 P60 的**循环变量作用域**（`x = 99; b = [x for x in range(3)]` 之后 `x` 还是 99，没定义过的名字用完就删行）——P125 把 `complist` 的整段函数体换掉了，P60 当时注入在那段里的保存/恢复一并消失，必须补回；② `x in (1, 2)`：元组和列表同编码，但 `in` 的类型链只认 `L/S/D/E`，报 "in requires strings" —— 放行 `T` |

## 2. 本轮踩实的四条（都写进 README 了）

* **递归必须自己护住外层循环状态**：`cdo` 的递归是整个推导的核心，但它同时把 `cqq`（当前子句位置）
  和 `cv/cstop/cstep`（外层 range 的计数器）写在全局变量上。第一次实现只给 `eval` 套了 P98 的
  `csave/crestore`，于是**内层递归一返回，外层循环就拿着内层的边界**：`[x * y for x in range(3) for y in range(2)]`
  只出 `[0, 0]`，而单 `for` 的 `[x for x in range(3)]` 直接退化成 `[0, 0, 0]`（`cqq` 被内层置 0，
  `Tok[cqq+1]` 变成了 `Tok[1]`，把值赋给了别的名字）。
* **"整段替换函数体"会丢掉后面补丁注入的东西**：`attachBody` 换掉 `complist` 的函数体，P60 注入的
  作用域保存/恢复（`c1n/c1s/c1v/c1t`）随之消失——现象是循环变量泄漏（`x` 留在 2 而不是恢复 99）。
  克隆型补丁（P108 的 `complistD`）同理：**改了 `complist` 就要把 `complistD` 一起指向新驱动**。
* **`find(set, pred)` 会在整棵子树里找**：判断"哪一条是 rightside 的比较分支"时，比较分支**自己**
  用来合成六个 op 测试的嵌套块形状完全相同，于是命中两个；正确做法是先定位 `error == ""` 守卫，
  再只遍历它那一层的链。
* **`SyntaxError: missing expression` = eval 收到空区间；`SyntaxError: parentheses` = 深度扫描见负**；
  本轮排查"生成器表达式支持不了"时还确认了另一件事：`f(x for x in xs)` 的实参**根本没走到 `eval`**
  （在 `printargs`/实参切分那一步就被按 3 个 token 的区间求值了），所以生成器表达式是**另一个缺口**
  （本轮不做，见 §6）。

## 3. 实测

| 套件 | v4.51 | **v4.52** |
|---|---|---|
| `t139.json`（多子句推导 31 条） | 0/14（`t135` 基线） | **31/31** |
| `t115c.json`（v4.47 探针 33 条） | 30/33 | **31/33**（X1「双 for 推导式」翻绿） |
| `t133.json`（集合 60 条） | 60/60 | **60/60** |
| `t123.json`（finally 29 条） | 29/29 | **29/29** |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6；推导式不在 63 条里） |
| `t137` / `t140`（推导作用域 5 条 / `in` 元组 3 条） | H4、M1 红 | **5/5 · 3/3** |
| 其余 22 套 `cmp47` + 28 套 `_work/v41`（含 `demos`/`scope`/`d1`/`pan`） | — | **与 v4.51 逐条相同**（`cmpout.cjs` 逐例对比两侧输出，diff=0；只有 `t115c` X1 变好） |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| 6 个 featprobe（259 条） | 242/259 | **242/259** |
| `check41.cjs` | 16,898 块 errors=0 | **16,961 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.51 共 42 版全 MATCH | **v4.10…v4.52 共 43 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
[x * y for x in range(3) for y in range(2)]     v4.51: SyntaxError: parentheses => [0,0,0,1,0,2]
[y for x in range(3) for y in range(x)]          v4.51: SyntaxError: parentheses => [0,0,1]
[x*y*z for x in range(1,3) for y in range(1,3) for z in range(1,3)]                => 8 个元素
[x*y for x in range(3) if x > 0 for y in range(2) if y > 0]                        => [1, 2]
[n for row in [[1,2],[3]] for n in row]                                            => [1, 2, 3]
[a+b for a in 'ab' for b in '12'] / for a in {1,2} / for a in (1,2)                => 都能迭代
{v for v in ...}  集合推导、{k: v for ...}  字典推导：一样支持多子句
{x: y for x in range(2) for y in range(2)}   v4.51: 报错 => v4.52: {0: 1, 1: 1}（重复键保留最后一条）
x = 99; b = [x for x in range(3)]; print(x)  两者都是 99（P60 作用域已补回）
print(2 in (1, 2))                           v4.51: TypeError: in requires strings => v4.52: True
# 仍未支持：生成器表达式 —— sum(x for x in range(3)) / list(x*2 for x in xs)
#           （实参切分阶段就不把 `x for x in …` 当一个区间交给 eval，属另一个缺口，用 [x for x in …] 代替）
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.52.sb3
node _work/v41/run.mjs MiniPy_v4.52.sb3 _work/cmp47/t139.json  # 多子句推导 31 条
node _work/v41/run.mjs MiniPy_v4.52.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps452_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.52.sb3 -out _work/v41/battery_v452.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.52.sb3 -tag v452
node _work/v41/check41.cjs MiniPy_v4.52.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.51 还原： $env:V41_SKIP='P125'; $env:V41_OUT='…/MiniPy_v4.51.sb3'; node _work/v41/build41.js
# 逐例对比两版（python 侧 + 解释器侧）： node _work/v41/cmpout.cjs <旧.json> <新.json>
```

## 6. 下一轮（v4.53）候选，按清单顺序

1. **生成器表达式** `f(x for x in xs)` / `sum(x * y for ...)`：先查实参切分（`printargs`/`callfn` 之前那一步）
   为什么把 `x for x in …` 切成 3 个 token 的区间；做通后 `eval` 里加一个"顶层 `for` ⇒ 按推导式求值"的入口即可
2. `for a, b in <生成器>`：yield 出来的元组还不能解包（Y3）
3. `super()` 与类属性继承；多重继承
4. `sorted(x, key=lambda …)`（featprobe3 的既有缺口）
5. 集合元素顺序 / `set()` 无参 / `issubset`（不保证项与次要缺口）
