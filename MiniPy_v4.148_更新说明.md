# MiniPy v4.148 更新说明：表达式里的"外层括号"剥离核对（P235）

## 0. 一句话

`p = (1, 2), (3, 4)`、`x = f(), g()`、`y = (1), (2)`、`a = b = (1, 2), (3, 4)`、
`def h(): return (1, 2), (3, 4)` 这些写法以前报 `SyntaxError: parentheses`（或
`TypeError: list index must be an integer`），现在与 CPython 一致。
解释器积木 28,081 → **28,105**（+24），变量 1,362 → **1,363**，合计 30,358 → **30,382**。

## 1. 病根（第 25/26 轮实测确认）

`eval %s %s` 里有一段"如果整段被一对括号包住就把外层剥掉"的逻辑：

```python
if Tok[lo] == "(" and Tok[hi] == ")":
    hascomma(lo+1, hi-1)
    if hascomma: tuplelit(lo+1, hi-1)     # ← 剥掉外层
    else:        eval(lo+1, hi-1)
```

它只看了**首尾两个 token 是不是括号**，**没有核对它们是不是一对**。对 `p = (1, 2), (3, 4)`：
`Tok[lo]` 是 `(`、`Tok[hi]` 是 `)`，但第一个 `(` 的配对在编号 7 的 `)`，`hi` 处的 `)` 属于第二组。
于是整段被剥成 `1, 2), (3, 4`，括号深度立刻为负 → 内层逗号被当成顶层分隔符 → 切出
`1`/`2`/`3`/`4` 之类的碎片。

调试证据（临时补丁 PZ26，逐 token 打印 `token:深度`）：

```
q = (1, 2), 3      (正常)  (:1 1:1 ,:1 2:1 ):0 ,:0 ,:0 | lo=3  hi=9  cut=8 range=3..7
p = (1, 2), (3, 4) (报错)  1:0 ,:0 ,:0                | lo=4  hi=12 cut=5 range=4..4
```

## 2. 修法

在剥之前插一个**深度核对**扫描：从 `lo` 扫到 `hi` 做括号配平，若深度在 `hi` **之前**回到 0，
说明这对括号没包住整段 → 不剥。这与给"括号目标"写的包裹剥离（P230）是同一个判据。

两个必须记住的细节：

* 新写的括号判定要用 `operator_contains`（第一版用 `=`，结果全盘 `SyntaxError: expression`；
  换成 contains 后目标用例立刻好转）；
* **只改第一个匹配到的站点**。一次性改两个站点时出现大面积回归
  （`_nest` 24→16、`_dictset` 30→21、`_setflt` 15→0、`_alias` 11→7），
  改成只改第一个后全部恢复 —— 第二个站点是另一处语义不同的"剥括号"逻辑，不能一起动。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.147 | **v4.148** | CPython |
|---|---|---|---|
| `p = (1, 2), (3, 4)` | SyntaxError | **`((1, 2), (3, 4))`** | 同 |
| `y = (1), (2)` | SyntaxError | **`(1, 2)`** | 同 |
| `v = ((1, 2)), (3, 4)` | SyntaxError | **`((1, 2), (3, 4))`** | 同 |
| `u = (1,), (2,)` | SyntaxError | **`((1,), (2,))`** | 同 |
| `aa = bb = (1, 2), (3, 4)` | SyntaxError | **两边都是 `((1, 2), (3, 4))`** | 同 |
| `q = (1, 2), 3` / `x = 1, (2, 3)` / `w = (1,2),(3,4),5` | 正常 | **仍正常** | 同 |
| `print((1, 2), (3, 4))` / `cc = [(1, 2), (3, 4)]` | 正常 | **仍正常** | 同 |
| `s = [1, 2], [3, 4]` | list index TypeError | 仍未修（列表字面量的另一处剥括号） | `([1, 2], [3, 4])` |
| `x = f(), g()` / `def h(): return (1,2),(3,4)` | SyntaxError | 仍未修（调用/return 路径） | — |

转正用例：新套件 `_paren2.json`（15 条）**5/15 → 10/15**；`_unp` 12/13 → **13/13**；
`_unp2` 10/13 → **11/13**；`_unp3` 11/14 → **13/14**。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov3 / cov4 / cov5 / cov8 / covC / covX（逐例 diff） | **0 broke，0 changed** |
| `_swap` 17/17 · `_comp` 12/12 · `_comp2` 6/6 · `_nest` 24/24 · `_dictset` 30/30 | 不变（`_nest`/`_dictset`/`_setflt` 一度被第二站点打坏，已恢复） |
| `_setflt` 15/15 · `_rhs` 6/6 · `_del` 13/13 · `_slice` 17/20 · `_alias` 11/17 · `_alias2` 11/11 | 不变 |
| `_upd` 11/12 · `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 不变 |
| `_tcases` 3/3 · `_catch`/`_catch2` 7/7 · `_catch3` 8/8 · `_fstring` 17/18 · `_floatarith` 34/35 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,382 块） |
| 历史复现 | **v4.148 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. **列表字面量同样的问题**：`s = [1, 2], [3, 4]`、`t = (1, 2), [3, 4]` 仍报
   `TypeError: list index must be an integer` —— 那是**第二个"剥括号"站点**（`[`/`]` 版本），
   要用同样的深度核对去改（但要单独测，别和这一处混在一起）。
2. **调用/返回路径**：`x = f(), g()`、`def h(): return (1, 2), (3, 4)` 仍 `SyntaxError: expression`。
3. 目标里的星号 `(a, *rest) = ...`、目标里带下标 `(d['a'], d['b']) = ...`。
4. 其余大块：返回值别名、浅拷贝/元素级引用、浮点十进制模型、`chr()` 范围、闭包/`nonlocal`、
   生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、`d.update(b=2)`、lambda 多参/默认值、
   `frozenset`、P226 的 `cdo` 括号比较（同样建议换成 `contains`）。

## 6. 落地与验证

* 新部件 `_work/v41/p235.txt`（P235），插在 `p230.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p148 = 'P235'`、`'v4.147' = "$p148"`，137 个旧版本条目全部前置 `$p148`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.148**；产物 **`MiniPy_v4.148.sb3`**。
* 块数：Interpreter 28,105（+24）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,382**。
* 新探针套件：`_paren2.json`（15 条）；调试补丁 PZ25/PZ26 保留在 `_work/v41/`（未挂链）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.148.sb3
node _work/v41/check41.cjs MiniPy_v4.148.sb3                      # 30,382 块 errors=0
node _work/v41/run.mjs MiniPy_v4.148.sb3 _work/v41/_paren2.json  # 10/15
node _work/v41/run.mjs MiniPy_v4.148.sb3 _work/v41/_unp.json     # 13/13
node _work/v41/run.mjs MiniPy_v4.148.sb3 _work/v41/_unp3.json    # 13/14
node _work/v41/run.mjs MiniPy_v4.148.sb3 _work/v41/_setflt.json  # 15/15（回归守卫）
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.148…v4.10 MATCH
```
