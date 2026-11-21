# MiniPy v4.144 更新说明：推导式的元组目标 + 字典可迭代（P226）

## 0. 一句话

推导式以前只认**单个**循环变量（`cdo` 的守卫要求 `Kind[cqq+1]=="I" and Tok[cqq+2]=="in"`，
可迭代对象也从 `Tok[cqq+3]` 起算），于是 `{k: v for k, v in ...}` 直接是 SyntaxError；
同时字典/字典视图不能当可迭代对象（`[k for k in d]`、`d.items()` 都报
`TypeError: comprehension needs an iterable`）。两处都修好了。
解释器积木 27,645 → **27,741**（+96），变量 1,327 → **1,335**，合计 29,922 → **30,018**。

## 1. P226：推导式的元组目标

```
print({k: v for k, v in [('a', 1)]})      ->  SyntaxError: for <name> in ...   ✗
print([k for k, v in [('a',1), ('b',2)]]) ->  SyntaxError: for <name> in ...   ✗
print([a + b for (a, b) in [(1,2),(3,4)]])->  SyntaxError: for <name> in ...   ✗
print({v for k, v in [('a',1), ('b',1)]}) ->  SyntaxError: for <name> in ...   ✗
print({k: v for k, v in d.items()})       ->  SyntaxError: for <name> in ...   ✗
```

修法（都在 `cdo` 里）：

1. **守卫之前**新增扫描：从 `cqq+1` 起在**括号深度 0** 处找 `in` 关键字 → 记到 `cin`；
   深度用 `(...)`/`[...]`/`{...}` 计数（这样 `for (a, b) in ...`、`for x in (1,2)` 都不会认错）。
2. 由 `cqq+1 .. cin-1` 之间所有 `Kind=="I"` 的 token 拼出逗号分隔的**目标名串** `ctgt`，
   并算出 `csingle`（恰好一个名字时走原路径）。
3. 三处绑定点（`range` 路径 / 列表路径 / 字符串路径）改成
   `if csingle: assign(Tok[cqq+1], vv, vt) else: unpackto(ctgt, vv)`；
   为了不让同一个积木被两个分支共享，先把 `vv`/`vt` 存进 `cvv`/`cvt` 再分发。
4. `Tok[cqq+3]`（可迭代对象的起点）全局改成 `Tok[cin+1]`（恰好 2 处，用"`cqq + 3` 的加法积木"
   定位并断言数量）。

## 2. P226：字典与字典视图作为可迭代对象

```
d = {'a': 1, 'b': 2}
print([k for k in d])                      ->  TypeError: comprehension needs an iterable  ✗
print([k for k, v in d.items()])           ->  同上                                  ✗
print({k: v * 2 for k, v in d.items()})    ->  同上                                  ✗
```

守卫只接受 `L/S/E/T`，而 `d.items()` 的类型标签是 `I`（`d.keys()` 是 `K`，`d.values()` 是 `V`），
字典本身是 `D`。修法：

* 在守卫**之前**插入：`if cltyp == "D": dictkeys(clist) → clist, cltyp = "L"`（字典先取键列表）；
* 守卫与后面的「列表/字符串」分支选择都加上 `K`/`V`/`I`（视图的记录结构与列表一致，直接按列表遍历）。

## 3. 本轮踩的两个坑（都已修正）

1. **插入位置搞反了**：第一版把扫描 `spliceAfter(failCall, …)`（插进守卫的 fail 分支里 ✗ 永远不执行），
   然后改成 `spliceAfter(guardIf, …)`（插在守卫**之后** ✗ 鸡生蛋问题：守卫要判断扫描算出来的 `cf`/`cin`）。
   正确位置是守卫**之前**（`insertBeforeStmt(guardIf, [...])`）。
   症状也很有辨识度：先是所有用例报 `SyntaxError: for <name> in ...`，再是连原本能过的单变量推导式
   都报 `SyntaxError: parentheses`。
2. **`spliceAfter` → `insertBeforeStmt` 的括号收尾**：前者收 `chain([...]))`，后者收 `[...]);`，
   我漏改收尾导致扫描数组多了一个 `)`。

## 4. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.143 | **v4.144** | CPython |
|---|---|---|---|
| `{k: v for k, v in [('a',1)]}` | SyntaxError | **`{'a': 1}`** | 同 |
| `[k for k, v in [('a',1),('b',2)]]` | SyntaxError | **`['a', 'b']`** | 同 |
| `{v for k, v in [('a',1),('b',1)]}` | SyntaxError | **`{1}`** | 同 |
| `[a + b for (a, b) in [(1,2),(3,4)]]` | SyntaxError | **`[3, 7]`** | 同 |
| `[k for k in d]` | TypeError | **`['a', 'b']`** | 同 |
| `[k for k, v in d.items()]` | SyntaxError | **`['x', 'y']`** | 同 |
| `{k: v * 2 for k, v in d.items()}` | TypeError | **`{'a': 2, 'b': 4}`** | 同 |
| `{k: v for k, v in d.items() if v > 1}` | TypeError | **`{'b': 2}`** | 同 |
| 单变量/嵌套/双 `for` 推导式 | 正常 | **仍正常** | 同 |

转正用例：新套件 `_comp.json`（12 条）**3/12 → 12/12**；覆盖套件 covX +4、cov4 +1、covC +2。

## 5. 回归证据

| 套件 | 结果 |
|---|---|
| cov3 / cov4 / covC / covX（逐例 diff） | **0 broke**（cov4 +1、covC +2、covX +4） |
| `_dictset` 30/30 · `_nest` 24/24 · `_alias` 11/17 · `_alias2` 11/11 | 不变 |
| `_del` 13/13 · `_slice` 17/20 · `_swap` 17/17 · `_upd` 11/12 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_comp` 12/12（新套件） | 本轮 |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,018 块 —— 首次越过 3 万） |
| 历史复现 | **v4.143 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 6. 残留（下一批）

1. **嵌套解包目标**：`for (a, b), c in ...`、`a, (b, c) = 1, (2, 3)`、`(a, b), c = ...`
   —— `unpackto` 只做**扁平**解包（按逗号切名字），要支持嵌套得让它递归处理 `<名字>` 与 `<元组>`。
2. `repr` 的通用 `\xhh`（需要 `ord` + `radix` 路径）；`\xhh`/`\ooo` 转义。
3. 返回值别名（设计已在 v4.143 说明里留档，要动调用机制）。
4. 别名/浅拷贝的其余 6 条（`[:]`/`.copy()` 深拷贝需元素级引用）。
5. 浮点十进制 vs 二进制；`chr()` 只支持 32..126；闭包/`nonlocal`；生成器耗尽；`__str__` 分派；
   类属性共享；多继承 `isinstance`；`d.update(b=2)` 方法关键字实参。

## 7. 落地与验证

* 新部件 `_work/v41/p226.txt`（P226），插在 `p225.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p144 = 'P226'`、`'v4.143' = "$p144"`，133 个旧版本条目全部前置 `$p144`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.144**；产物 **`MiniPy_v4.144.sb3`**。
* 块数：Interpreter 27,741（+96）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,018**。
* 新探针套件：`_comp.json`（12 条）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.144.sb3
node _work/v41/check41.cjs MiniPy_v4.144.sb3                      # 30,018 块 errors=0
node _work/v41/run.mjs MiniPy_v4.144.sb3 _work/v41/_comp.json    # 12/12
node _work/v41/run.mjs MiniPy_v4.144.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.143…v4.10 MATCH
```
