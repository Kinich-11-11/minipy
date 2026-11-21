# MiniPy v4.151 更新说明：`eval` 入口的"顶层逗号即元组"前置分流（P244）

## 0. 一句话

拖了 8 轮的那一族写法**全部修通**：

| 写法 | v4.150 | **v4.151** | CPython |
|---|---|---|---|
| `x = f(), g()` | `SyntaxError: parentheses` | **`(1, 2)` 形式的元组** | 同 |
| `y = p(), (3, 4)` | `SyntaxError: parentheses` | **正确** | 同 |
| `def h(): return (1, 2), (3, 4)` | 部分 | **正确** | 同 |
| `s = [1, 2], [3, 4]` | list index / SyntaxError | **`([1, 2], [3, 4])`** | 同 |
| `z = [[1], [2]], [[3]]` | TypeError | **`([[1], [2]], [[3]])`** | 同 |
| `v = ((1, 2)), (3, 4)` | NameError `'('` | **正确** | 同 |

解释器积木 28,157 → **28,194**（+37），变量 1,364 → **1,367**，合计 30,434 → **30,471**。

## 1. 病根与修法

前几轮已经把失败链钉死：整段右侧（如 `x = f(), g()` 的 3..9）被当成**一次调用**，
实参区间按 `lo+2 .. hi-1` 算成 5..8（`), g(`）→ 子区间不平衡 → 报错。
但收紧那层 `narg == 0` 门控的两版补丁都会误伤大批合法 0 参调用
（`_setflt` 15→1、covX 56→31），说明那是被复用在各种子区间上的通用分支。

**P244 换到入口处解决**：在 `eval` 的最前面扫一遍 `lo..hi`，只要有**深度 0 的逗号**
（不在 `()`/`[]`/`{}` 内、也不是字符串字面量的一部分），整段就是**元组** →
直接交给 `tuplelit(lo, hi)` 并结束本次 `eval`；否则照原路走。

```python
# eval 入口
tc2c = 0; tc2d = 0; tc2i = lo
repeat until tc2i > hi:
    if Tok[tc2i] in "([{" : tc2d += 1
    if Tok[tc2i] in ")]}" : tc2d -= 1
    if tc2d == 0 and Kind[tc2i] != "S" and Tok[tc2i] == "," : tc2c = 1
    tc2i += 1
if tc2c == 1 and Tok[lo] != "lambda":
    tuplelit(lo, hi); stop this script
```

判据与 v4.149 给"以 `]` 结尾"分支加的"前缀无顶层逗号"（P237）同源，只是提前到入口，
于是所有下游分支（调用 / 路径 / 下标 / 括号剥离）都不再看到"其实是个元组"的区间。

**踩坑记录**：第一版没有 `Tok[lo] != "lambda"` 这个守卫，`add = lambda a, b: a + b` 直接坏掉
（lambda 的参数逗号不是元组分隔符）—— 一次回归、一处修正。这也说明**入口级改动的爆炸半径大，
必须全量回归**。

## 2. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 套件 | v4.150 | **v4.151** |
|---|---|---|
| `_paren2`（15 条） | 12/15 | **15/15** |
| `_paren3`（7 条） | 3/7 | **7/7** |
| `_calls2`（4 条） | 4/4 | 4/4 |
| `func.json`（31 条） | 31/31 | **31/31**（第一版曾 30/31，lambda 守卫修回） |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 | 同 | 不变 |
| `_setflt` 15/15 · `_nest` 24/24 · `_dictset` 30/30 · `_rhs` 6/6 | 同 | 不变 |
| `_comp` 12/12 · `_comp2` 6/6 · `_swap` 17/17 · `_del` 13/13 | 同 | 不变 |
| `_slice` 17/20 · `_alias` 11/17 · `_alias2` 11/11 · `_upd` 11/12 | 同 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_tcases` 3/3 | 同 | 不变 |
| `_catch`/`_catch2` 7/7 · `_catch3` 8/8 · `_fstring` 17/18 · `_floatarith` 34/35 | 同 | 不变 |
| cov1 33/40 · cov3 40/42 · cov4 34/40 · cov5 29/47 · cov8 30/33 · covC 21/39 · covX 56/63 | 同 | **0 broke** |
| 项目自带 `gaps433.json` | 61/63 | 61/63 |
| `check41.cjs` | — | **errors=0**（30,471 块） |
| 历史复现 | — | **v4.151 … v4.147 / v4.132 / v4.100 / v4.10 全 MATCH** |

顺带把探针套件里一条自相矛盾的用例（`z = (1, 2), q` 未定义 `q`）改成先定义 `q`，
`_paren2` 因此可以稳定跑出 15/15。

## 3. 残留（下一批）

1. `_paren2`/`_paren3` 之外的既有缺口：`_slice` 3 条、`_alias` 6 条、`_upd` 1 条、
   `_unp2` 2 条、`_unp3` 1 条、`_fstring` 1 条、`_floatarith` 1 条、cov5 18 条、covC 18 条。
2. 目标里的星号 `(a, *rest) = ...`、目标里带下标 `(d['a'], d['b']) = ...`。
3. 大块：返回值别名、浅拷贝/元素级引用、浮点十进制模型、`chr()` 范围、闭包/`nonlocal`、
   生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、`d.update(b=2)`、lambda 多参/默认值、
   `frozenset`、P226 的 `cdo` 括号比较（建议换 `contains`）。

## 4. 落地与验证

* 新部件 `_work/v41/p244.txt`（P244），插在 `p236.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p151 = 'P244'`、`'v4.150' = "$p151"`，140 个旧版本条目全部前置 `$p151`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.151**；产物 **`MiniPy_v4.151.sb3`**。
* 块数：Interpreter 28,194（+37）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,471**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.151.sb3
node _work/v41/check41.cjs MiniPy_v4.151.sb3                      # 30,471 块 errors=0
node _work/v41/run.mjs MiniPy_v4.151.sb3 _work/v41/_paren2.json  # 15/15
node _work/v41/run.mjs MiniPy_v4.151.sb3 _work/v41/_paren3.json  # 7/7
node _work/v41/run.mjs MiniPy_v4.151.sb3 _work/v41/func.json     # 31/31（lambda 守卫）
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.151…v4.10 MATCH
```
