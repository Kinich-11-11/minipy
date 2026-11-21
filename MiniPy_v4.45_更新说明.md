# MiniPy v4.45 更新说明

本轮补最后三块拼图：**`try/finally`**（E49）、**字典推导式**（E43）、**集合 `{1, 2, 3}`**
（E44），另外**顺手修好两个既存 bug**（嵌套字典打印成乱码、整数键查字典查错行）。
套件 `gaps433.json` 从 **58/63** 推到 **61/63**（E 54/55、F 2/2、G 5/6），
23 套既有回归**逐字节零退化**。剩下两条是 E50（CPython 自己抛 `FileNotFoundError`，对不齐）
和 G5（默认参数共享需要真正的"对象"模型，见 §5）。

产物 `MiniPy_v4.45.sb3`：Interpreter 14,180 块，合计 **15,609**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P107** | **E49** `try/finally` | `finally` 早就被 P51 写进了 `Elses` 链（`try` 能找到它），但**没进"这一行开一个块"的 prevhead 链**，所以 `finally:` 后面那行必然 `IndentationError: unexpected indent`。修法：① 把 `finally` 加进 prevhead 链（**必须带 P51 那个 `notFree` 过滤**，否则会改到外层那个 `NOT(indent==prev+4) OR NOT(链)` 的整条件，凡是 `finally:` 行一律报错——本轮踩过这个坑）；② `execute` 里 `finally:` 行只 `pending=1`；③ `try` 的**子句是 `finally` 时不压 handler 帧**，改压 `FinStart/FinEnd/FinMsg/FinC`——不压帧就没有"catch-all"帧，异常原样留在 `error` 里；④ 挂一个**前置**在 `trycatch` 开头的钩子：异常路过 → 记进 `FinMsg`、清 `error`、跳到 `FinStart` 先跑尾巴，尾巴跑完（`pc >= FinEnd`）→ 弹帧并把 `FinMsg` 还回 `error`。钩子必须在 `trycatch` 自己的"找 handler"遍历**之前**，否则外层 `except` 接不到 |
| **P108** | **E43** 字典推导式 | `{k: k*2 for k in range(3)}` 直接进了 `dictlit`，把裸名字 `k` 当键表达式求值。修法：**克隆 `complist`**（P68 的 `cloneBody` 深拷贝手法）成 `complistD`，只改两处：① 扫出主体里第一个深度 0 的 `:`，累加时把"键段、值段"分两次 `eval + lesc + 拼接`；② 结尾 `evtype` 给 `'D'`。字典的编码本来就是 `lsep+类型+文本` 交替的平铺串（和累加器的形状一模一样），所以不需要新编码。`eval` 的 `{` 分支里插一段扫描：有深度 0 的 `for` **且有** `:` → `complistD` |
| **P109** | —（既存 bug：**嵌套字典打印成乱码**） | `print({'x': {'a': 1}})` 打出 `{'a': 1, 'a': {'a': 1}}`（v4.44 就是错的）。字典本身没问题（`len`/`items`/`d['x']['a']` 都对），错在 `dictfmt` **不可重入**：它对每个元素调 `reprval`，元素又是字典时 `reprval→strval→dictfmt`，内层把外层的累加器与游标（`d1acc/d1n/d1i/d1k/d1v`）冲掉了。和 P46/P98 同一类修法：在两个 `reprval` 调用前后用 VStack 存/取这 5 个变量 |
| **P110** | —（既存 bug：**整数键查字典查错行**） | `d = {0: 0, 1: 2, 2: 4}; print(d[2])` 打出 `2` 而不是 `4`。字典是"键在奇数位、值在偶数位"的平铺串，而 `indexget` 的查找**扫遍所有记录比文本**，于是命中了"键 1 的值 2"这一条，再返回它后面那条。修法：把比较限制在奇数位（`dgi % 2 == 1`），与 `dictkeys` 的约定一致。只有"某个值恰好等于在查的键"时才会暴露，所以字符串键一直没踩到 |
| **P111** | **E44** 集合 `{1, 2, 3}`（顺带集合推导式） | 集合的编码和列表**完全一样**，只是标签不同，所以字面量根本不用新机器：把 `{` 里的 token 区间交给 `listlit`，再把结果标成 `'E'`。新的是这个类型的"门面"：① `setnorm` 去重（`{1,1,2}` → `{1,2}`）；② `setfmt` 渲染 `{a, b, c}`（按 P109 的教训做成可重入）；③ `strval` 在 `'D'` 分支前面加 `'E'` 分支。`eval` 的分派规则收敛成一句话：**有 `for` 且有 `:` → 字典推导；有 `for` 无 `:` → 集合推导；只有 `:` → 字典字面量；都没有且非空 → 集合**（`{}` 仍是字典） |

## 2. 本轮踩实的六条（都写进 README 了）

* **`argOf()` 也要"一次一个块"**：本轮最贵的一个坑。`const lo = argOf('lo')` 然后在 4 个输入槽里
  复用它，块图就被共用了——症状完全不像"共享块"：`{1,1,2,2,3}` 少一个元素、`{x for x in range(3)}`
  报 `NameError: range`、`[{1,2}]` 报 `LimitError: expression depth`，而且**只在多语句程序里出现**，
  单语句复现不出来。改成每个使用点各调一次 `argOf`，15 条集合用例立刻 14 绿。
  （P95/P102 踩的是变量 reporter 的同一件事，这次轮到实参 reporter。）
* **P34 的转义扫描是"构建期一次性"的**：它扫当时存在的、把求值结果塞进容器的语句，在前面插 `lesc(ev)`。
  P108 新写的拼接语句在那之后才出现，于是字典推导式的值只要是**容器**（`{k: [1,2]}`）就散架。
  新写这类语句时，`lesc(ev)` 得自己补。
* **克隆出来的过程要自己进"存档名单"**：`csave/crestore`（P98）保存的是它写补丁时的那批变量，
  P108 新加的 `dcsub/dcdep/dck/dcfor` 不在里面，嵌套推导式会互相冲。往 `csave` 尾部追加 push、
  往 `crestore` **开头**插对应 pop（LIFO 顺序别弄反）即可。
* **`trycatch` 的钩子必须插在它自己遍历之前**：先让"尾巴跑完并把异常还回去"，再让 P51 的
  "顺着帧找 handler"跑，外层 `except` 才接得住。插在后面时表现为"尾巴没跑、异常又冒到顶"。
* **`[drop()]` 与 `[...drop()]`**：JS 里差三个点，Scratch 里差一整棵子树。`REPEATU(cond, [drop()])`
  把"4 条语句的数组"当成一个块 id 传下去，报的是 `Cannot set properties of undefined`——
  和错误信息毫无关系的形状错误。本轮的调试时间大半花在这一个点上。
* **改 P51 留下的链要照抄它的过滤条件**：P107 第一版只按"链里出现过 `prevhead=='try'`"找锚点，
  结果把 P51 改造后的**外层整条件**也选了进去，变成"凡是 `finally:` 一律报错"。
  P51 的 `notFree(id)`（链里不能含 `NOT`）就是为这个写的，必须一并抄。

## 3. 实测

| 套件 | v4.44 | **v4.45** |
|---|---|---|
| `gaps433.json`（63 条） | 58/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| 局部套件 `t107.json`（try/finally 12 条） | — | **7/12**（余 5 条见 §5） |
| 局部套件 `t107b.json`（`as e` 与嵌套 finally 5 条） | — | 2/5（`as e` 是既存缺口，见 §5） |
| 局部套件 `t108*.json`（字典推导 6 组 53 条） | — | **53/53** |
| 局部套件 `t111*.json`（集合 4 组 40 条） | — | 只差"元素顺序"（CPython 按哈希序，MiniPy 按插入序） |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 14,887 块 errors=0 | **15,609 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.44 共 35 版全 MATCH | **v4.10…v4.45 共 36 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 两个既存 bug 的实证

```
# v4.44：嵌套字典打印
print({'x': {'a': 1}})        ->  {'a': 1, 'a': {'a': 1}}      # 应为 {'x': {'a': 1}}
# v4.44：整数键查字典
d = {0: 0, 1: 2, 2: 4}; print(d[2])   ->  2                     # 应为 4
```

两条在 v4.45 都对了；`t108f.json`（8 条）与 `t108b.json`（10 条）覆盖这两个形状。

## 5. 本轮明确不支持

* **`except X as e`**：绑不上名字（`NameError: e`）——**v4.44 就是坏的**，与 try/finally 无关，
  本轮没修（`tlast` 只在裸 `raise` 里被用过一次，`as` 的绑定从来没实现）。下一轮候选。
* **`try` 里 `return` / 跳出**：尾巴不会跑（CPython 会）。正常路径、异常路径、循环里的 try、
  函数里正常走完的 try 都可以（`t107` T1/T2/T5/T8/T9/T10/T12 绿）。
* **`try/except/finally` 三子句**：正常路径能跑（T9 绿），异常从 handler 里逃出去时 finally 不保证执行。
* **集合的其它门面**：`len(s)` / `x in s` / `for x in s` / 集合方法都还没有；`s[0]` 报的是
  `TypeError: string index required`（文案与 CPython 不同）；`{[1]}` 不会报 `unhashable type`。
* **集合元素顺序**：CPython 按哈希序（`{3,1,2}` 打印 `{1, 2, 3}`），MiniPy 按插入序
  （打印 `{3, 1, 2}`）。小整数之外本来也不保证，故不视为缺陷。
* **G5 默认参数共享**：`def f(b=[])` 现在是"每次调用拿到同样内容的**副本**"，CPython 是"同一份
  默认值对象"。`print(f(), f())` 要打出 `[1, 1] [1, 1]`，需要"返回值本身是引用"——
  而 MiniPy 的列表是"串 + 别名表"（P54），返回的是串的拷贝，别名表救不了 print 的实参。
  这是**模型层面**的差距，不是补丁能补的，除非改成真正的对象模型。

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.45.sb3
node _work/v41/run.mjs MiniPy_v4.45.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps445_out.json
node _work/v41/run.mjs MiniPy_v4.45.sb3 _work/cmp47/t107.json
node _work/v41/run.mjs MiniPy_v4.45.sb3 _work/cmp47/t108.json
node _work/v41/run.mjs MiniPy_v4.45.sb3 _work/cmp47/t111.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.45.sb3 -out _work/v41/battery_v445.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.45.sb3 -tag v445f
node _work/v41/check41.cjs MiniPy_v4.45.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.44 还原： $env:V41_SKIP='P107,P108,P109,P110,P111'; $env:V41_OUT='…/MiniPy_v4.44.sb3'; node _work/v41/build41.js
```

## 7. 下一版（v4.46）建议

套件里只剩 2 条（E50 不可对齐、G5 需换模型），所以下一轮的价值在于**补类型门面**而不是刷分：

1. **`except X as e`**（既存 bug，`tlast` 已经有了，只需在 `trycatch` 命中时按子句行绑名字）
2. 集合门面：`len(s)` / `x in s` / `for x in s` / `add`·`remove`·`discard` / `|`·`&`·`-`
3. `try` 里的 `return` / `break` 也跑尾巴
4. 双 `for` 推导式（`[x*y for x in range(3) for y in range(2)]`）
5. `yield i, i + 1`（裸逗号元组没走到 yield 分支）
6. 浮点 repr（`1e+16` / `1e-05` / `-0.0` / 大浮点）
7. `'hello'.split()` 无参按空白切
8. P91 余项：`d.pop(k)` 会把整个字典删空、`d.nope()` 的报错文案
