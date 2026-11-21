# MiniPy v4.132 更新说明：空容器为假、bool() 返回布尔、sort(reverse=True)（P204–P206）

## 0. 一句话

三个**静默算错**的语义 bug：空容器（`[]`/`{}`/`()`/`set()`）全部被当成真值、`bool(x)` 返回
`1/0` 而不是 `True/False`、`xs.sort(reverse=True)` 实际按升序排。三处都只动**语义**，
不动语法、不动报错文案；解释器积木 26,815 → **26,870**（+55），合计 29,092 → **29,147**。

## 1. 三个 bug 的机制

### P204 空容器为假（`truth %s %s`）

容器值是一条**记录串**：`listlit` 给每个元素追加 `lsep + 类型标记 + 值`（`lsep` = U+001F），
所以**空容器的值恰好是空字符串**。而 `truth` 的兜底判断是 `if vv == 0: truthv = 0`
——Scratch 的 `=` 出于 `Cast.isWhiteSpace` 的考虑**故意**不让 `""` 等于 `0`，这一支对容器
永远不触发，于是空容器一律为真。

`truth` 是唯一的值真值化入口（`conditional` 管 if/while、`anyall`/`cdo` 管 and/or、
`unary` 管 not、`pair`/`eval` 管三元、`callfn` 管 `bool()`），所以**一处插入**修好全部：
在原有 `if vv == 0` 之前插入
`if (vt ∈ {L,T,D,E,K,V,I}) and (vv == "") : truthv = 0`。
`B`（bool，值是 0/1）保留数值判断；`G`（函数对象）、`O`（实例）、`C/F/X` 在 CPython 里恒为真，
故意不动。

### P205 `bool()` 返回布尔

`callfn` 的 `bool` 分支把 `truthv` 写进 `ev` 后把 `evtype` 标成 `"N"`，所以 `bool([])` 打印
`0`。改成 `"B"`：`True`/`False` 字面量就是 `ev=1/0, evtype="B"`（见 `atom %s`），
所以打印、`type()`、参与算术全都跟着对了。

### P206 `xs.sort(reverse=True)`

`methodcall` 的 `sort` 分支**完全没看参数 token**：直接 `lsort(s=xa)` 再写回，所以
`reverse=True` 是静默的空操作（`sorted(xs, reverse=True)` 走 `eval`/`callfn`，一直是好的）。

`lsort %s` 只收一个记录串，而且被 `sorted()`、`sorted(key=)`、`srtkey` 共用，所以没有加参数，
而是加了一个**方向标志** `lsrev`：交换条件由 `cmp > 0` 变成
`(lsrev==0 and cmp>0) or (lsrev==1 and cmp<0)`；`methodcall` 在调用前扫描实参 token
（`reverse` 后面跟 `True`）置位，调用后立刻清零，其它调用者不受影响。

## 2. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.131 | **v4.132** | CPython |
|---|---|---|---|
| `if []: / if {}: / if (): / if set():` | 走真分支 | **假分支** | 假分支 |
| `not []` / `not {}` | `False` | **`True`** | `True` |
| `[] or 2` / `{} and 1` | `[]` / `{}` | **`2`** / **`{}`** | `2` / `{}` |
| `while []:` | 死循环 | **不进循环** | 不进循环 |
| `'a' if [] else 'b'` | `a` | **`b`** | `b` |
| `bool([])/bool({})/bool(())/bool(set())` | `1 1 1 1` | **`False False False False`** | 同 |
| `type(bool([]))` | `int` | **`bool`** | `bool` |
| `a.sort(reverse=True)`（`[3,1,2]`） | `[1,2,3]` | **`[3,2,1]`** | `[3,2,1]` |
| `a.sort(key=len, reverse=True)` | 升序 | **降序** | 降序 |
| `sorted(x, reverse=True)` | 正确 | **仍正确** | 正确 |

转正用例：**40 条**（专项套件 25 条 + 覆盖套件 15 条）。

## 3. 回归证据（0 破坏）

| 套件 | v4.131 | v4.132 |
|---|---|---|
| `_truth.json`（12 条真值化） | 1/12 | **12/12** |
| `_sort.json`（20 条排序） | 8/20 | **20/20** |
| cov1 数字 / cov2 字符串 / cov4 容器 / cov6 类异常 / cov7 生成器 / cov9 布局 / covY 根因 | — | **逐例不变** |
| cov3 列表 / cov5 函数 / cov8 控制流 / cov10 数值 / covX 最小复现 / covC 头条 | — | **0 broke，15 fixed** |
| 项目自带 `gaps433.json` | 61/63 | **61/63**（不变） |
| 项目自带 `func.json` | 31/31 | **31/31**（不变） |
| `fib(16)` 解释器步数 | 6388 | **6388**（不变，墙钟 ~9.35s 不变） |
| `check41.cjs` 结构体检 | errors=0 | **errors=0** |

## 4. 已知副作用（1 条，符合既有设计）

`bool(x for x in [])` 由真变假。生成器表达式在 MiniPy 里**本来就被立即求值成列表**
（`type()` 也返回 `<class 'list'>`，见《支持范围与限制》），所以"空生成器表达式为假"
与既有的"genexp 即 list"约定一致；`G` 标记的是**函数对象**（恒真）所以不受影响。

## 5. 落地与验证

* 新部件 `_work/v41/p204.txt`，插在 `assemble.cjs` 部件表的 **p203.txt 之后、p68.txt 之前**
  —— 必须早于 P68，否则 `callfnW` 的 warp 克隆会拿到未打补丁的 `callfn`。
* `rebuild-old.ps1`：新增 `$p132 = 'P204,P205,P206'`，**122 个历史版本的跳表全部前置了它**，
  并新增 `'v4.132' = "$p132"`，历史产物仍可复现。
* `head.txt` 输出版本 → **v4.132**；产物 **`MiniPy_v4.132.sb3`**。
* 块数：Interpreter 26,870（+55）/ Controller 2,019 / TextRenderer 234 / Stage 24，合计 **29,147**。
* 三个补丁都**按报错文案或结构定位**（`lsort` 里唯一的 `cmp > 0`、`callfn` 里唯一的
  `fn == "bool"` 分支、`truth` 里唯一的 `vv == 0`），数量不对就抛错。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js      # -> MiniPy_v4.132.sb3
node _work/v41/check41.cjs MiniPy_v4.132.sb3                   # 29,147 块 errors=0
node _work/v41/run.mjs MiniPy_v4.132.sb3 _work/v41/_sort.json   # 20/20
node _work/v41/run.mjs MiniPy_v4.132.sb3 _work/v41/_truth.json  # 12/12
node _work/v41/run.mjs MiniPy_v4.132.sb3 _work/cmp47/gaps433.json  # 61/63
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                # 123 个历史版本复现
```

## 6. 顺带查出：仓库里的 `MiniPy_v4.131.sb3` 是"手工另存"的副本

用 `rebuild-old.ps1` 的跳表重跑 v4.131（只跳过 P204–P206）得到 **29,092 块**
（Interpreter 26,815 / Controller 2,019 / TextRenderer 234 / Stage 24）——与 v4.131 文档
写的数字**完全一致**；而仓库里那个 `MiniPy_v4.131.sb3` 只有 **28,980 块**
（Interpreter 26,802 / Controller 1,939 / TextRenderer 215），而且 `meta.agent` 为空。

差的 112 块全是 **`data_variable` / `data_listcontents` 的 topLevel 监控块**
（Controller 80 + TextRenderer 19 + Interpreter 13）：这正是 Scratch/TurboWarp **在编辑器里
"打开再保存"**时会丢掉的东西（它按 `project.monitors` 重建，并清掉 `meta.agent`）。
对照：`v4.130`、`v4.100`、`v4.10` 的产物重建后都是 **MATCH**，所以流水线本身没问题，
**只有 v4.131 那一个是手工另存的**（大概就是这轮手工试用它、从而撞出这批 bug 的时候存的）。

这些监控块不参与执行，所以两边跑出来的结果一样：同一套探针在**忠实重建的 v4.131** 上也是
`_truth` 1/12、`_sort` 8/20，与另存副本逐例相同。想让 `rebuild-old.ps1` 恢复 122 版全 MATCH，
把 v4.131 重新导出一次（或在编辑器里另存）即可。

## 7. 下一批（来自 `v4131_覆盖测试报告.md`，按值/工作量排序）

1. **`d[k] = v` 覆盖已有键会摧毁后面的条目**（`{'a':1,'b':2}` 写 `d['a']` 后 `d['b']` 抛 KeyError）
   —— 与 `t = a[i]` 槽位别名、嵌套函数修改对返回值不可见同源，是"累积/记账"类程序全灭的根因。
2. **`in` 遇到含 `.` 的值就报 `in requires strings`**（`'a' in {'a': 1.5}`）。
3. **`**` 左结合**（`2**3**2` → 64）与**一元负号优先级**（`-2**2` → 4）。
4. `strip()` 不处理 `\t`/`\n`、f-string `{{` 多一个 `}`、`zfill` 符号位置、`startswith(元组)`、
   `%.2s` 忽略精度、`print(sep=…, end=…)` 组合坏掉。
