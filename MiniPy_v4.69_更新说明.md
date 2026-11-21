# MiniPy v4.69 更新说明

本轮补上**零实参调用**：`list()`、`str()`、`int()`、`dict()`、`nosuch()` 这一类以前一律报
`SyntaxError: missing expression`。补丁 **P142**。

产物 `MiniPy_v4.69.sb3`：Interpreter 18,415 块，合计 **19,844**，`check41` errors=0；
60 个历史版本全部可复现（v4.10…v4.69 MATCH）。

## 1. 问题：空实参区间被当成"缺表达式"

调用的实参区间是 `lo+2 .. hi-1`，没有实参时 `lo+2 > hi-1`，而两处调度都照样去求值这个空区间：

* `eval` 的 `名(...)` 分支在把区间交给 `callfn` **之前**，先跑自己的一串专用分支（`zip`、`sorted`、
  `math.*`、`set`、`divmod`、`max/min/pow/round/int`…），它们都要读实参；
* `callfn` 在类构造分支之后**无条件** `eval(lo, hi)`。

| 代码 | v4.68 | **v4.69**（= CPython） |
|---|---|---|
| `list()` | `SyntaxError: missing expression` | `[]` |
| `str()` / `int()` / `float()` | 同上 | `''` / `0` / `0.0` |
| `bool()` / `tuple()` / `dict()` | 同上 | `False` / `()` / `{}` |
| `zip()` | 同上 | `[]`（MiniPy 本来就把 zip 立即求值成列表） |
| `len()` / `abs()` / `sorted()` | 同上 | `TypeError: len() takes exactly one argument (0 given)` 等 CPython 文案 |
| `max()` / `min()` / `sum()` / `type()` | 同上 | `TypeError: max expected at least 1 argument, got 0` 等 |
| `nosuch()` | 同上 | `NameError: name 'nosuch' is not defined` |
| `set()` / `input()` | 正常 | **不变**（`set()` 仍是空集合） |
| `f()` / `A()` / `lambda: 1` 的零参调用 | 正常 | **不变** |

## 2. 做法：一个 `zeroarg` 统一回答"没有实参"

新过程 **`zeroarg`** 按被调用者的名字决定三件事之一（名字走全局 `x9fn`——P127 的规矩：自定义积木的
实参在重复调用时不可靠；`x9go` = 1 表示"已处理，就地收工"）：

1. **值**：`list`→`[]`、`str`→`''`、`int`→`0`、`float`→`0.0`、`bool`→`False`、`tuple`→`()`、
   `dict`→`{}`、`zip`→`[]`，直接写 `ev`/`evtype`；
2. **报错**：19 个"少参数"的内建名按 CPython 措辞 `fail`（`len`/`abs`/`ord`/`chr`/`repr`/`any`/`all`/
   `type`/`sorted`/`sum`/`max`/`min`/`enumerate`/`round`/`pow`/`divmod`/`issubclass`/`isinstance`/`range`）；
3. **让路**：`set`/`input`（`x9known = 1`，下面各自的实现还在），或者名字**能用**——查 `lookup`、
   `FnName`、`ClsName` 任一命中就说明是用户函数/类/变量，照旧走正常流程；三者都不命中的名字**就在
   `zeroarg` 里直接报 `NameError`**——因为空区间根本交不到 `callfn` 手上，`callfn` 末尾那句
   `if pending == 0: fail NameError` 永远轮不到。

挂点两处：`eval` 的调用分支**最前面**（先于它自己的专用分支），以及 `callfn` 的实参求值处——

```
IFELSE(lo > hi, [ ev='' ; evtype='X' ], [ 原来的 eval(lo, hi) ])
```

这样没被 `zeroarg` 接手的零参调用（比如 `input()`）也不会再炸，而是带着一个"谁都不认识"的 `evtype`
继续往下走（`input()` 正好把 `ev` 当提示串，空串即可）。

**一个关键的形状检查**：只判"区间不足 3 个 token"是不够的——`self.n = 5` 也是 3 个 token。所以要同时
要求 `Tok[lo+1] == '('`、`Tok[hi] == ')'`；另外**字面量被调用者**（`1()`、`'a'()`、`1.5()`、`True()`）
必须留给 P141 的 `TypeError: '<类型>' object is not callable`，不能被当成"未定义名字"。

## 3. 实测

| 套件 | v4.68 | **v4.69** |
|---|---|---|
| `d217.json`（本轮新写 24 条：8 条零参取值、9 条零参报错、`nosuch()`、`set()`/用户类/用户函数/lambda 的零参、字面量调用仍 TypeError、以及 `self.n = 5` 这种"三令牌但不是调用"的反向用例） | — | **24/24** |
| `d206`（上一轮的调用/属性 37 条） | 37/37 | **37/37** |
| `d190`（异常文案 46 条） | 46/46 | **46/46** |
| `d204` 14 · `d202` 24 · `t133` 60 · `func` 31 · `str` 12 · `cont` 12 · `one` 10 · `pan` 7 · `b2` 13 · `demos` 12 · `t123` 29 · `d187` 10 · `d189` 14 · `d159` 5 · `d191` 8 · `d192` 6 · `d200` 8 · `d201` 15 · `d193` 5/6（探针缺 `expectError` 的假红） | — | **全绿/不变** |
| 94 套快照 | — | **91 套逐例相同**，3 处差异全是既知噪声/改进：`t113` F6 与 `t111h` M4 是 **CPython 参考侧**的集合哈希序（换一次运行就变，其中 t113 这次反而与 MiniPy 一致）+ featprobe3 内存地址——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.68 相同） |
| `check41.cjs` | 19,640 块 errors=0 | **19,844 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.68 共 59 版全 MATCH | **v4.10…v4.69 共 60 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 4 个变量（`x9go` `x9fn` `x9known` `x9user`）、1 个过程（`zeroarg`）。

## 4. 前后对比

```
print(list(), str(), int(), float(), bool(), tuple(), dict())
        v4.68: 八个 SyntaxError   => []  0 0.0 False () {}

try:    len()
except TypeError as e: print(e)     v4.68: SyntaxError: missing expression
                                    => len() takes exactly one argument (0 given)

try:    nosuch()
except NameError as e: print(e)     v4.68: SyntaxError: missing expression
                                    => name 'nosuch' is not defined

print(set(), len('ab'), max(3, 1))  不变：set() 5 3
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `tuple(x)` / `dict(x)`（**带**实参的构造） | 仍报 `NameError`（`tuple()`/`dict()` 的零参形式本轮已可用） |
| `range(n)` 当**表达式**（`list(range(3))`） | 仍报 `NameError`；`for i in range(n)` 一直可用 |
| `zip()` 打印 `[]` 而不是 `<zip object at 0x…>` | MiniPy 主动的"立即求值"扩展（与 `enumerate`/`zip` 单独打印同一项，不进套件） |
| `try/finally` 的三项既存问题（`t107` T3/T7/T11） | 仍缺 |
| `%` 的字符串格式化边界、`except (NameError, NoSuchError)` 的子句优先级 | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.69.sb3
node _work/v41/run.mjs MiniPy_v4.69.sb3 _work/cmp47/d217.json  # 零实参调用 24 条
node _work/v41/run.mjs MiniPy_v4.69.sb3 _work/cmp47/d206.json  # 调用/属性 37 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.69.sb3 -tag v469 -ref v468
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v469 -ref v468
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.69.sb3 -tag v469
node _work/v41/check41.cjs MiniPy_v4.69.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.68 还原： $env:V41_SKIP='P142'; $env:V41_OUT='…/MiniPy_v4.68.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.70）候选，按清单顺序

1. `tuple(x)` / `dict(x)` 的带实参构造（`tuple` 只差换个类型标签；`dict` 要解析键值对）
2. `range(n)` 当表达式（`list(range(3))`，可复用推导式的 `crng` 算术循环）
3. `try/finally` 的 T3/T7/T11（异常路径要重抛、`finally` 里再抛、`finally` 空块报错）
4. `%` 的字符串格式化边界
