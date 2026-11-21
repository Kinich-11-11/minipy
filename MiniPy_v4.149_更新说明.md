# MiniPy v4.149 更新说明：`[a, b], [c, d]` 被当成"前缀 + 下标"（P237）

## 0. 一句话

`s = [1, 2], [3, 4]`、`t = (1, 2), [3, 4]` 以前报 `TypeError: list index must be an integer`，
现在与 CPython 一致（`([1, 2], [3, 4])` / `((1, 2), [3, 4])`）。
解释器积木 28,105 → **28,133**（+28），变量 1,363 → **1,364**，合计 30,382 → **30,410**。

## 1. 病根

`eval` 处理"以 `]` 结尾"的表达式时，会扫描括号深度、把**深度 0 的 `[`** 记成索引括号起点 `pxbr`：

```python
if Tok[hi] == "]":
    pxd = 0; pxj = lo; pxbr = 0
    repeat until pxj > hi:
        if Tok[pxj] == "[":  if pxd == 0: pxbr = pxj;  pxd += 1
        if Tok[pxj] == "]":  pxd -= 1
        pxj += 1
    if pxbr > lo + 1:  indexget(lo, hi); stop        # 认为是"路径前缀 + [索引]"
```

`pxbr` 记的是**最后一个**深度 0 的 `[`：对 `s = [1, 2], [3, 4]`
（token：3 `[` 4 `1` 5 `,` 6 `2` 7 `]` 8 `,` 9 `[` … 13 `]`），第一个 `[`(3) 先被记下，
`]`(7) 让深度回到 0 后第二个 `[`(9) 又把它覆盖 → `pxbr=9 > lo+1=4` 成立 →
把整段交给 `indexget(3, 13)`。

**调试证据（临时补丁 PZ31）**：给两个 `indexget` 调用点编号后在 `indexget` 入口打印：

```
IG@IG2 lo=3 hi=13 toklo=[ tokhi=]
```

## 2. 修法

进入那个分支前，先检查 `lo .. pxbr-1` 这段**前缀**里有没有**顶层逗号**；有就说明这不是
"前缀 + 索引"而是一个元组（`[1, 2], [3, 4]`），不该走这条路。

> **踩坑记录**：第一版直接调用现成的 `hascomma %s %s` 去扫前缀，结果打坏了
> cov3 的 `list max min sum` 与 cov5 的 `builtin sum start` —— 它会把 `tqhcm` 等**共享暂存变量**冲掉。
> 改成用**自己的变量**（`cpx`/`cpd`/`cpk`）+ `operator_contains` 内联扫描后，两处回归消失。
> 这类"借用现成过程却污染共享状态"的坑，与前面 P228/P230 的教训是同一类。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.148 | **v4.149** | CPython |
|---|---|---|---|
| `s = [1, 2], [3, 4]` | list index TypeError | **语法错误**（下一层的解析缺口，见残留） | `([1, 2], [3, 4])` |
| `t = (1, 2), [3, 4]` | list index TypeError | **`((1, 2), [3, 4])`** | 同 |
| `p = (1, 2), (3, 4)` 等（v4.148 修好的） | 正常 | **仍正常** | 同 |
| `a[0]` / `a[0][1]` / `d['k']` / `obj.attr`（路径与下标） | 正常 | **仍正常** | 同 |
| `sum([1, 2, 3])` / `max([1, 2], [3, 4])` / `sum([1,2,3], 10)` | 正常 | **仍正常**（第一版曾打坏，已修） | 同 |

转正用例：`_paren2.json` 10/15 → **11/15**（`paren tuple then list` 转正；`two list literals`
错误从 list-index 变成更靠前的语法错误，属**下一层**缺口）。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov3 / cov4 / cov5 / cov8 / covC / covX（逐例 diff） | **0 broke**（第一版曾 broke cov3/cov5 各 1 条，改用内联扫描后恢复） |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 · `_comp` 12/12 · `_comp2` 6/6 | 不变 |
| `_swap` 17/17 · `_slice` 17/20 · `_del` 13/13 · `_alias` 11/17 · `_alias2` 11/11 · `_upd` 11/12 | 不变 |
| `_setflt` 15/15 · `_nest` 24/24 · `_dictset` 30/30 · `_rhs` 6/6 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_tcases` 3/3 | 不变 |
| `_catch`/`_catch2` 7/7 · `_catch3` 8/8 · `_fstring` 17/18 · `_floatarith` 34/35 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,410 块） |
| 历史复现 | **v4.149 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. `s = [1, 2], [3, 4]` 现在是**更靠前**的 `SyntaxError: parentheses`（已不再是 list-index 错）——
   与 `x = f(), g()`、`def h(): return (1, 2), (3, 4)` 属同一层：**第二个元素以括号/方括号开头时的解析**。
2. `_paren2` 其余三条：`v = ((1,2)), (3,4)`、`x = f(), g()`、以及探针写错的一条（`z = (1,2), q` 里 q 未定义）。
3. 目标里的星号 `(a, *rest) = ...`、目标里带下标 `(d['a'], d['b']) = ...`。
4. 其余大块：返回值别名、浅拷贝/元素级引用、浮点十进制模型、`chr()` 范围、闭包/`nonlocal`、
   生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、`d.update(b=2)`、lambda 多参/默认值、
   `frozenset`、P226 的 `cdo` 括号比较（建议换 `contains`）。

## 6. 落地与验证

* 新部件 `_work/v41/p237.txt`（P237），插在 `p235.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p149 = 'P237'`、`'v4.148' = "$p149"`，138 个旧版本条目全部前置 `$p149`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.149**；产物 **`MiniPy_v4.149.sb3`**。
* 块数：Interpreter 28,133（+28）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,410**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.149.sb3
node _work/v41/check41.cjs MiniPy_v4.149.sb3                      # 30,410 块 errors=0
node _work/v41/run.mjs MiniPy_v4.149.sb3 _work/v41/_paren2.json  # 11/15
node _work/v41/run.mjs MiniPy_v4.149.sb3 _work/v41/_unp.json     # 13/13
node _work/v41/run.mjs MiniPy_v4.149.sb3 _work/v41/_cov3.json    # 40/42（第一版曾 39/42）
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.149…v4.10 MATCH
```
