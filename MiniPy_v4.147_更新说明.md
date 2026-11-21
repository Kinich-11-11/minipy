# MiniPy v4.147 更新说明：括号开头的元组解包赋值（P230）

## 0. 一句话

`(a, b), c = (1, 2), 3`、`(a, b) = (1, 2)`、`[a, b] = (1, 2)`、`(x, y) = f()` 这类**以括号开头**的
元组解包赋值以前完全不生效（静默不绑定，或 `SyntaxError`），现在与 CPython 一致。
解释器积木 27,993 → **28,081**（+88），变量 1,356 → **1,362**，合计 30,270 → **30,358**。

## 1. 为什么前面几轮绕不出来

`execute` 的"多目标赋值"分支（扫出等号位置 `eqi` → 调 `assignlist`）守卫只认两种开头：
`Kind[1]=="I" and Tok[2]==","`（`a, b = ...`）或 `Tok[1]=="*" and ...`（`*rest, b = ...`）。
`(`/`[` 开头的语句根本进不来，而**扩展那个分支的守卫**（v4.146 之后的试验）会陷进它内部纠缠的状态：
即使把 `assignlist` 的捷径条件改成恒真、把 `error` 清空，也依然是"进了 `assignlist`、右侧也求值成功，
但 `unpackto` 一次都没被调用"（详见 `_work/v41/notes-unpack.md` 第 18–20 轮的插桩记录）。

## 2. P230 的做法：另起一个完全独立的分支

在那个多目标分支**之前**插入一个新的 `control_if`，只做四件事：

1. **守卫**：`contains("([{", Tok[1])`（首个 token 是括号）；
2. **自己扫深度 0 的等号**（`beqi`）：进出栈用 `operator_contains`（补丁里 `=` 比括号字形不可靠，
   见 v4.146 说明 §2），并且要求**等号前后不能还是等号** —— 这样 `(a, b) == (1, 2)`、`>=` 这类
   比较语句不会被误当成赋值；没扫到等号（如 `(1 + 2)` 这种表达式语句）就整支跳过，
   控制流照旧往下走，不会被判成语法错误；
3. **拼目标名字串**：把 `Tok[1..beqi-1]` 原样拼接（保留括号），然后
   **剥掉一层"整串被一对括号包住"的外壳** —— `(a, b) = ...` 里的那对括号只是**分组**而不是嵌套目标，
   不剥的话 `unpackto` 会把整串当成 1 个目标，报 `ValueError: too many values to unpack (expected 1, got 2)`。
   剥离前会验证"内部的深度从未回到 0"（这样 `(a,b),c` 不会被误剥）；
4. `eval(beqi+1, count)` 求右侧 → 成功就 `unpackto(名字串, ev)` → `pending = 1`。
   全程**不调用 `assignlist`**。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.146 | **v4.147** | CPython |
|---|---|---|---|
| `(a, b), c = (1, 2), 3; print(a, b, c)` | NameError | **`1 2 3`** | 同 |
| `(a, b) = (1, 2)` | NameError | **`1 2`** | 同 |
| `[a, b] = (1, 2)` | NameError | **`1 2`** | 同 |
| `(x, y, z) = (1, 2, 3)` | NameError | **`1 2 3`** | 同 |
| `(a, b) = [4, 5]` | NameError | **`4 5`** | 同 |
| `(x, y) = f()`（`f` 返回二元组） | NameError | **`7 8`** | 同 |
| `[(a, b), c] = [(1, 2), 3]` | NameError | **`1 2 3`** | 同 |
| `(a, b) = (1, 2, 3)`（数量不符） | NameError | **`ValueError: too many values to unpack (expected 2, got 3)`** | 同 |
| `(a, *rest) = (1, 2, 3)` | NameError | ValueError（**未支持星号**） | `1 [2, 3]` |
| `(a, b) == (1, 2)`（比较语句） | 正常 | **仍正常** | 同 |
| `(1 + 2)`（表达式语句） | 正常 | **仍正常** | 同 |
| `a, b = 1, 2` / `a, (b, c) = ...` | 正常 | **仍正常** | 同 |
| `p = (1, 2), (3, 4)`（右侧两个括号元组） | SyntaxError | SyntaxError（**另一个既有解析缺口**） | `((1, 2), (3, 4))` |

转正用例：`_unp` 11/13 → **12/13**；`_unp2` 5/13 → **10/13**；新套件 `_unp3`（14 条）5/14 → **11/14**；
覆盖套件 covX +1（`nested unpack assignment parens`）。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov8 / covC / covX（逐例 diff） | **0 broke**（covX +1） |
| `_swap` 17/17 · `_comp` 12/12 · `_comp2` 6/6 · `_nest` 24/24 · `_dictset` 30/30 | 不变 |
| `_del` 13/13 · `_slice` 17/20 · `_alias` 11/17 · `_alias2` 11/11 · `_upd` 11/12 | 不变 |
| `_setflt` 15/15 · `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 | 不变 |
| `_cr` 17/17 · `_tcases` 3/3 · `_catch`/`_catch2` 7/7 · `_catch3` 8/8 · `_rhs` 6/6 | 不变 |
| `_fstring` 17/18 · `_floatarith` 34/35 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,358 块） |
| 历史复现 | **v4.147 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. **右侧两个括号元组的解析**：`p = (1, 2), (3, 4)` 与 `(a, b), (c, d) = (1, 2), (3, 4)` 仍报
   `SyntaxError: parentheses`（第二个元素是括号元组时被当成"调用字面量"）。这是**独立的既有缺口**，
   与本次改动无关，但修掉它能让"嵌套两侧"也通。
2. **目标里的星号**：`(a, *rest) = ...` 未支持（扁平形式 `a, *rest = ...` 是好的）。
3. **目标里带下标**：`(d['a'], d['b']) = ...` 静默不生效（`assign` 只认名字，需要路径赋值）。
4. 其余大块：返回值别名（设计留档在 v4.143 说明）、浅拷贝/元素级引用（6 条）、浮点十进制模型、
   `chr()` 范围、闭包/`nonlocal`、生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、
   `d.update(b=2)`、lambda 多参/默认值、`frozenset`、P226 的 `cdo` 括号比较（建议同样换 `contains`）。

## 6. 落地与验证

* 新部件 `_work/v41/p230.txt`（P230），插在 `p228.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p147 = 'P230'`、`'v4.146' = "$p147"`，136 个旧版本条目全部前置 `$p147`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.147**；产物 **`MiniPy_v4.147.sb3`**。
* 块数：Interpreter 28,081（+88）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,358**。
* 新探针套件：`_unp3.json`（14 条）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.147.sb3
node _work/v41/check41.cjs MiniPy_v4.147.sb3                      # 30,358 块 errors=0
node _work/v41/run.mjs MiniPy_v4.147.sb3 _work/v41/_unp.json     # 12/13
node _work/v41/run.mjs MiniPy_v4.147.sb3 _work/v41/_unp2.json    # 10/13
node _work/v41/run.mjs MiniPy_v4.147.sb3 _work/v41/_unp3.json    # 11/14
node _work/v41/run.mjs MiniPy_v4.147.sb3 _work/v41/_swap.json    # 17/17
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.147…v4.10 MATCH
```
