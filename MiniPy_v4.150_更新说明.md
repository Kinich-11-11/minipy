# MiniPy v4.150 更新说明：列表元组的"外层方括号"剥离核对（P236）

## 0. 一句话

`s = [1, 2], [3, 4]`、`z = [[1], [2]], [[3]]` 以前报 `TypeError: list index must be an integer` /
`SyntaxError: parentheses`，现在与 CPython 一致（`([1, 2], [3, 4])` / `([[1], [2]], [[3]])`）。
解释器积木 28,133 → **28,157**（+24），合计 30,410 → **30,434**。

## 1. 病根

与 v4.148 修好的那处同款，但作用于**方括号**：

```python
if Tok[lo] == "[" and Tok[hi] == "]":
    listlit(lo+1, hi-1)      # ← 又把"首尾是 [ ]"当成"整段被方括号包住"
else: ...
```

对 `s = [1, 2], [3, 4]`（token 3..13），首 token 是 `[`、尾 token 是 `]`，但它们不是一对。
**探针 PZ32** 直接打出它实际收到/切出的区间：

```
LL lo=4 hi=12 | el=4..4 cut=13 dep=0 tok=4
LL lo=4 hi=16 | el=4..6 cut=17 dep=0 tok=]     （z = [[1], [2]], [[3]]）
```

即整段被剥成 `1 , 2 ] , [ 3 , 4`，元素切分随即在第一个内层逗号处断开。

## 2. 修法

与 P235 完全同构：剥之前扫 `lo..hi` 做括号配平，深度若在 `hi` 之前回到 0 就说明外层方括号
没包住整段 → 不当作单个列表字面量，走 else 分支。

> **时间线值得记一笔**：这个补丁（P236）其实在第 28 轮就写好了，但当时是**无操作**
> —— 因为那时失败发生在更早的"下标/路径"层（`[1, 2], ` 被当成路径前缀），这条分支根本走不到。
> v4.149 的 P237 修好那一层之后，P236 立刻生效（`_paren2` 11→12、`_paren3` 2→3）。
> 教训：**多层同源缺陷要按"错误首先出现在哪一层"的顺序修**，上一层没修好时，下层的补丁看起来会像无效。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.149 | **v4.150** | CPython |
|---|---|---|---|
| `s = [1, 2], [3, 4]` | list index / SyntaxError | **`([1, 2], [3, 4])`** | 同 |
| `z = [[1], [2]], [[3]]` | list index TypeError | **`([[1], [2]], [[3]])`** | 同 |
| `t = (1, 2), [3, 4]` | 正常 | **仍正常** | 同 |
| `p = (1, 2), (3, 4)`（v4.148 修好） | 正常 | **仍正常** | 同 |
| `[1, 2]` / `[[1], [2]]` / `[]` / `[1, 2, 3]`（普通列表字面量） | 正常 | **仍正常** | 同 |
| `d = {'a': [1, 2]}` / 列表推导式（`complist` 路径） | 正常 | **仍正常** | 同 |
| `x = f(), g()` / `y = p(), (3, 4)` | SyntaxError | SyntaxError（**下一层**：第二个元素是括号/调用时的解析） | — |
| `v = ((1, 2)), (3, 4)` | NameError `'('` | 仍未修 | `((1, 2), (3, 4))` |

转正用例：`_paren2.json` 11/15 → **12/15**；新套件 `_paren3.json` 2/7 → **3/7**。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov3 / cov4 / cov5 / cov8 / covC / covX | **0 broke**（与 v4.149 逐例一致） |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 · `_comp` 12/12 · `_comp2` 6/6 | 不变 |
| `_swap` 17/17 · `_slice` 17/20 · `_del` 13/13 · `_alias` 11/17 · `_alias2` 11/11 · `_upd` 11/12 | 不变 |
| `_setflt` 15/15 · `_nest` 24/24 · `_dictset` 30/30 · `_rhs` 6/6 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_tcases` 3/3 | 不变 |
| `_catch`/`_catch2` 7/7 · `_catch3` 8/8 · `_fstring` 17/18 · `_floatarith` 34/35 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,434 块） |
| 历史复现 | **v4.150 / v4.149 / v4.148 / v4.147 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. **第二个元素以括号/调用开头**：`x = f(), g()`、`y = p(), (3, 4)`、`def h(): return (1,2),(3,4)`
   仍是 `SyntaxError: parentheses`（探针 PZ24 显示失败发生在 `calluser` 的实参求值 / `listlit`
   的元素求值子区间上）。这一类是当前最后的同源层。
2. `v = ((1, 2)), (3, 4)` 报 `NameError: name '('`。
3. 目标里的星号 `(a, *rest) = ...`、目标里带下标 `(d['a'], d['b']) = ...`。
4. 其余大块：返回值别名、浅拷贝/元素级引用、浮点十进制模型、`chr()` 范围、闭包/`nonlocal`、
   生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、`d.update(b=2)`、lambda 多参/默认值、
   `frozenset`、P226 的 `cdo` 括号比较（建议换 `contains`）。

## 6. 落地与验证

* 新部件 `_work/v41/p236.txt`（P236），插在 `p237.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p150 = 'P236'`、`'v4.149' = "$p150"`，139 个旧版本条目全部前置 `$p150`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.150**；产物 **`MiniPy_v4.150.sb3`**。
* 块数：Interpreter 28,157（+24）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,434**。
* 新探针套件：`_paren3.json`（7 条）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.150.sb3
node _work/v41/check41.cjs MiniPy_v4.150.sb3                      # 30,434 块 errors=0
node _work/v41/run.mjs MiniPy_v4.150.sb3 _work/v41/_paren2.json  # 12/15
node _work/v41/run.mjs MiniPy_v4.150.sb3 _work/v41/_paren3.json  # 3/7
node _work/v41/run.mjs MiniPy_v4.150.sb3 _work/v41/_unp.json     # 13/13
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.150…v4.10 MATCH
```
