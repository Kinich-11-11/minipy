# MiniPy v4.155 更新说明：`map()` / `filter()`（P262）

## 0. 一句话

`map` 与 `filter` 以前直接 `NameError: name 'map' is not defined`，现在可用：

```python
print(list(map(str, [1, 2, 3])))        # ['1', '2', '3']
print(list(map(int, ['1', '2'])))       # [1, 2]
print(list(filter(len, ['a', '', 'bb'])))   # ['a', 'bb']
print(sum(map(int, ['1', '2', '3'])))   # 6
def dbl(x): return x * 2
print(list(map(dbl, [1, 2, 3])))        # [2, 4, 6]
```

解释器积木 28,307 → **28,453**（+146），变量 1,373 → **1,386**，合计 30,584 → **30,730**。

## 1. 实现方式（复用 v4.57 P130 为 `sorted(key=…)` 造的机器）

P130 已经解决了"**逐个元素调用一个函数**"这件事，用的是：

* 全局 `p4v` / `p4vt`：要传给回调的元素（值 / 类型）；
* 全局 `p4bi`：1 = 内建函数；`p4bin` = 内建函数**名字**，`p4fn` = 用户函数**名字**；
* `callval` 过程：把元素用 `reprval` 渲染成**源码字面量** → `tokenize` → `callfn`/`calluser` 调用 →
  最后 `tokenize(Code[pc])` **恢复当前行的 token 流**。

P262 在 `eval` 的**第一条语句之后**插入一个新分支：`Tok[lo]` 是 `map`/`filter` 时

1. 检查形状 `名字 ( … )`；
2. 用带深度的逗号扫描在 `lo+2 .. hi-1` 里找**第一个顶层逗号**，切出两个实参；
3. 第一个实参要求是**单个标识符** token（内建名或用户函数名）；
4. `eval` 第二个实参得到可迭代 → `listlen` → 逐项 `listitem` → 设好 `p4v/p4vt/p4bi/p4bin/p4fn` → `callval`；
5. `map` 收集回调**返回值**，`filter` 收集**原元素**（真值判定：`False`/`0`/`''`/`None`/空容器为假）；
6. 结果用 `enc()` 编成列表记录，`evtype = 'L'`，结束本次 `eval`。

## 2. 两个踩坑（值得记）

* **`IF(cond, then, else)` 不是 DSL 的写法** —— DSL 里是 `IF(cond, [...])` 与 `IFELSE(cond, [...], [...])`；
  我一开始写成三参 `IF`，构建直接抛 `TypeError: Cannot set properties of undefined (setting 'next')`。
* **不要用 `insertBeforeStmt` 往函数体最前面插**（`eval` 的 body head）—— 会踩到 `predecessorOf` 的老问题；
  改用 `spliceAfter(head, chain([...]))` 挂在第一条语句之后即可。
* 语义上的一处修正：`filter` 必须收集**原元素**（第一版收了回调返回值，`filter(len, ['a','','bb'])` 给出 `[1, 2]`）。

## 3. 已知限制

第一个实参必须是**单个标识符**；`lambda` 还不支持，因此 `_broad` 里
`list(map(lambda x: x + 1, [1, 2]))` 那条仍然失败（`_broad` 维持 30/33）。

## 4. 回归证据

| 套件 | v4.154 | **v4.155** |
|---|---|---|
| 新探针 `_map`（8 条） | — | **8/8** |
| `_broad` 30/33 · `_slice` 17/20 · `_cat` 3/8 · `_star` 7/12 | 同 | 不变 |
| covX 56/63 · cov3 40/42 · cov5 29/47 · cov1 33/40 · func 31/31 | 同 | 不变 |
| `_paren2` 15/15 · `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 | 同 | 不变 |
| `_comp` 12/12 · `_comp2` 6/6 · `_rhs` 6/6 · `_swap` 17/17 · `_del` 13/13 | 同 | 不变 |
| `_setflt` 15/15 · `_nest` 24/24 · `_dictset` 30/30 · `_alias` 11/17 · `_alias2` 11/11 • `_upd` 11/12 | 同 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_tcases` 3/3 | 同 | 不变 |
| `_fstring` 17/18 · `_floatarith` 34/35 · `_doc2` 10/10 · `_orig` 4/4 · `_orig2` 7/8 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,730 块） |
| 历史复现 | — | **v4.155 … v4.148 全 MATCH** |

另外：`assemble.cjs` 现在自带**链条去重检查**（本轮打印 `assemble: 203 parts, no duplicates`），
重复部件或缺文件会直接 `exit(1)`，杜绝了之前踩过三次的"手滑改链条"事故。

## 5. 落地与验证

* 新部件 `_work/v41/p262.txt`（P262），插在 `p261.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p155 = 'P262'`、`'v4.154' = "$p155"`，144 个旧版本条目全部前置 `$p155`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.155**；产物 **`MiniPy_v4.155.sb3`**。
* 块数：Interpreter 28,453 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,730**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.155.sb3
node _work/v41/check41.cjs MiniPy_v4.155.sb3                      # 30,730 块 errors=0
node _work/v41/run.mjs MiniPy_v4.155.sb3 _work/v41/_map.json    # 8/8
node _work/v41/run.mjs MiniPy_v4.155.sb3 _work/v41/_broad.json   # 30/33
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.155…v4.10 MATCH
```
