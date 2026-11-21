# MiniPy v4.68 更新说明

本轮把三类**运行时才该报错**的情况从"解析期报错/静默算错"拉回 CPython 行为，并修掉一个"方法体里
调用方法必挂"的老 bug。补丁 **P141**。

产物 `MiniPy_v4.68.sb3`：Interpreter 18,211 块，合计 **19,640**，`check41` errors=0；
59 个历史版本全部可复现（v4.10…v4.68 MATCH）。

## 1. 问题：不能调用的值、不能取属性的值

| 代码 | v4.67 | **v4.68**（= CPython） |
|---|---|---|
| `1()` | `SyntaxError: missing expression` | `TypeError: 'int' object is not callable` |
| `'a'()` / `1.5()` / `True()` | 同上 | `TypeError: 'str' / 'float' / 'bool' object is not callable` |
| `x = 1; x()` | 同上 | `TypeError: 'int' object is not callable` |
| `[1]()` / `{'a': 1}()` | `SyntaxError: expression` | `TypeError: 'list' / 'dict' object is not callable` |
| `(1)()` | `TypeError: object is not callable` | `TypeError: 'int' object is not callable` |
| `(1).foo` / `'a'.foo` / `[].foo` / `None.foo` / `(1, 2).foo` | `SyntaxError: attribute access` | `AttributeError: '<类型>' object has no attribute 'foo'` |
| `A().foo`（实例无此属性） | `AttributeError: foo` | `AttributeError: 'A' object has no attribute 'foo'` |
| `A.zz`（类无此属性） | `AttributeError: zz` | `AttributeError: type object 'A' has no attribute 'zz'` |

## 2. 更严重的一个：方法体里调方法

```
class A:
    def hi(self):
        z = 'q'
        return z.upper()      v4.67: AttributeError: only lists have methods
                              v4.68: Q
```

不只是局部变量：方法体里 `'q'.upper()`、`[1].append(2)`、`self.s.upper()` 全都挂。根因是
`methodcall` 把"接收者来自上一段（链式调用）"的状态放在**全局量 `mcpre`** 里：`A().hi()` 这种链式
调用会把它置 1，而**方法体是在那次调用过程中执行的**，于是方法体里的普通方法调用走了"接收者用
`mcval`/`mctype`"那条路，拿到的是外层的接收者；紧接着那两行 `xa = ev; xb = evtype` 又把链式分支
刚取到的值覆盖成陈旧的 `ev`（`0`/`N`）⇒ 类型检查看到 `N` ⇒ "only lists have methods"。

修法：①进入 `methodcall` 立刻**消费**这个标志（`mcpv = mcpre; mcpre = 0`），链式调用只在它自己那一层
生效；②`xa = ev; xb = evtype` 只在"自己求接收者"那条分支里做（`if mcpv == 0`）。

## 3. 顺带修好的链式解析

`super().hi().upper()`（`d193` T6 的邻居）以前报 `SyntaxError: parentheses`：`eval` 找"深度 0 的第一个
`.`"来切链式调用，`super().hi().upper()` 于是在 `super()` 处切开、把裸 `super()` 当成一次调用。改成取
**最后一个**深度 0 的 `.` ⇒ 先求 `super().hi()`（递归走 super 钩子）再派发 `.upper()`。`self.s.upper()`、
`a.b().c()` 同理一起好了。

同时把 super 钩子收紧：它以前只检查"`super ( ) . 名` 且最后一个 token 是 `)`"，所以
`super().hi().upper()` 也会被它抢走、把 `) . upper (` 当参数表（`SyntaxError: parentheses`）。现在钩子
先扫出方法参数表的配对右括号，**必须正好是整段的末尾**才接手，否则原样交回 `eval` 的通用流程。

## 4. 四个坑

1. **`replaceStmt(old, newChain)` 会截断链**：`replaceStmt` 里 `new.next = old.next`，多语句链的
   第二句起就被摘掉（构建期 `pruneUnreachable` 直接把它们清掉，症状是"补丁跑了、运行期却像没打"）。
   本轮写了 `replaceChain`：把新链的**尾巴**接到 `old.next`。
2. **`narg` 数的是逗号**，所以 `narg == 0` 是"**一个**实参"而不是"零个实参"。我第一版用
   `callable == 0` 判"不可调用"，把 `len('abc')`、`int('4')` 全打成了 NameError。正确判据：
   **实参 token 是字面量**（Kind `N`/`S`、或关键字 `True`/`False`/`None`）**或已知变量且类型不是 `F`**；
   其余（内建名、未知名）一律仍走 `callfn`，让它自己报错。
3. **`FAIL('文本')` 会把块 id 当字符串包成文本**：写 `FAIL(JOIN(...))` 时消息变成了块 id（`Line 2:
   boperat_…`）。要用 `callProc('fail %s', [表达式])`。
4. **区分两个 `AttributeError: Tok[lo+2]` 站点不能靠父指针**（补丁期 `.parent` 还没重建）：最后用
   "`eval` 语句序"（同一 DFS 里先出现的是 `A.zz` 的类属性分支、后出现的是实例分支）。

## 5. 实测

| 套件 | v4.67 | **v4.68** |
|---|---|---|
| `d206.json`（本轮新写 37 条：14 条方法/super/链式 + 23 条调用与属性报错，含反向用例——函数值、lambda、`len`/`max`/`min`/`round`/`int(x, base)`、用户多参函数都不能被误伤） | — | **36/37** |
| `d190`（异常文案 46 条） | 44/46 | **46/46** |
| `d193`（super 6 条） | 5/6 | **5/6**（仍只有 T3 那条**探针缺 `expectError`** 的假红） |
| `d202` 24 · `d204` 14 · `t133` 60 · `func` 31 · `str` 12 · `cont` 12 · `one` 10 · `pan` 7 · `b2` 13 · `demos` 12 · `t123` 29 · `d187` 10 · `d189` 14 · `d159` 5 · `d191` 8 · `d192` 6 · `d200` 8 · `d201` 15 | — | **全绿** |
| 93 套快照 | — | **92 套逐例相同**，2 处差异 = `d190` 的 D3/F1 **变正确** + featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.67 相同） |
| `check41.cjs` | 19,456 块 errors=0 | **19,640 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.67 共 58 版全 MATCH | **v4.10…v4.68 共 59 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

`d206` 唯一未过的是 `nosuch()`（**零实参**调用一个未定义名）——它和 `list()`/`str()` 这类**零实参内建
调用**同属一个既存缺口（空实参区间被当成"缺表达式"），v4.67 也一样，不是本轮回归。

新增 5 个变量（`mcpv` `x8i` `x8d` `x8e` `x8nc`），没有新增过程（复用 P134 的 `tname`）。

## 6. 前后对比

```
class A:
    def __init__(self):
        self.s = 'q'
    def hi(self):
        return self.s.upper() + 'q'.upper()
print(A().hi())            v4.67: AttributeError: only lists have methods   => QQ

try:    (1).foo
except AttributeError as e: print(e)     v4.67: SyntaxError（解析期）  => 'int' object has no attribute 'foo'

try:    1()
except TypeError as e: print(e)          v4.67: SyntaxError（解析期）  => 'int' object is not callable

print(len('abc'), max(3, 1), int('101', 2))   仍然正常：3 3 5
```

## 7. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 零实参的**未知名/部分内建**调用：`nosuch()`、`list()`、`str()`、`int()`、`dict()` | 报 `SyntaxError: missing expression`（空实参区间）；`nosuch(1)` 已正确报 `NameError` |
| `try/finally` 的三项既存问题（`t107` T3/T7/T11） | 仍缺（v4.66 记录） |
| `%` 的字符串格式化边界 | 仍缺 |
| `except (NameError, NoSuchError)` 这种"坏名字与 `NameError` 同列"的子句 | 仍缺（v4.67 记录） |

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.68.sb3
node _work/v41/run.mjs MiniPy_v4.68.sb3 _work/cmp47/d206.json  # 调用/属性/super/链式 37 条
node _work/v41/run.mjs MiniPy_v4.68.sb3 _work/cmp47/d190.json  # 异常文案 46 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.68.sb3 -tag v468 -ref v467
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v468 -ref v467
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.68.sb3 -tag v468
node _work/v41/check41.cjs MiniPy_v4.68.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.67 还原： $env:V41_SKIP='P141'; $env:V41_OUT='…/MiniPy_v4.67.sb3'; node _work/v41/build41.js
```

## 9. 下一轮（v4.69）候选，按清单顺序

1. 零实参调用：`list()` / `str()` / `int()` / `dict()` / `nosuch()`（空实参区间不再当"缺表达式"）
2. `try/finally` 的 T3/T7/T11（异常路径要重抛、`finally` 里再抛、`finally` 空块报错）
3. `%` 的字符串格式化边界
4. `except (NameError, NoSuchError)` 这类子句的 NameError 优先级
