# MiniPy v4.156 更新说明：`d.update(b=2)`（dict.update 的关键字参数）（P263）

## 0. 一句话

`d.update(b=2)` 以前报 `SyntaxError: expression`，现在与 CPython 一致：

```python
d = {'a': 1}
d.update(b=2)
print(d)        # {'a': 1, 'b': 2}
```

解释器积木 28,453 → **28,553**（+100），变量 1,386 → **1,394**，合计 30,730 → **30,830**。

## 1. 病根（上一轮已定位，本轮落实）

`dictmeth %s %s %s %s %s` 的 `update` 分支把**整个实参区间**丢给 `eval`：

```python
callProc('eval %s %s', [argOf('lo'), argOf('hi')])
```

而 `b=2` 不是表达式 → `SyntaxError: expression`。
（上一轮我在错误的块上插探针，所以"探针没触发"——真正的分支是 `dictmeth` 里那个，
定位时要用 `deepHas` 沿块树找 `meth == 'update'`，并用 owner 校验是 `dictmeth`。）

## 2. 修法

在那个 `eval` **之前**插一段关键字处理（只在区间里出现**顶层 `=`**、且不是 `==`/`<=`/`>=`/`!=` 时生效）：

1. 逐对解析 `名字 = 值`：键名取标识符 token；值从 `=` 之后到**下一个顶层逗号**为止（带括号深度）；
2. 只对**值**调 `eval`；
3. 自己拼 dict 记录（照 P167 第 533 行的编码：`lsep + 类型 + 值`，键一律按字符串键、值经 `lesc` 转义）；
4. 走既有路径收尾：`dupd(rec, acc)` 合并 → 用**合并结果**刷新变量 → `ev=''`、`evtype='Z'` → 结束本次 `methodcall`。

## 3. 两个踩坑（都是本轮实测踩出来的）

* **`lesc %s` 会把结果写回 `ev`**：我原来先 `lesc(键)` 再取值，于是值变成了键
  （输出 `{'b': b}`）。必须先 `kvv = ev` 保存值，再转义键。
* **`dupd(rec, m)` 返回的是"合并后的字典"（在 `ev` 里）**，不是把 `rec` 就地改掉；
  所以要 `assign(nm, ev, 'D')`（用 `ev`），不能用自己拼的那半部分，
  否则原来的键会丢（第一版输出 `{'b': 2}` 而不是 `{'a': 1, 'b': 2}`）。

## 4. 回归证据

| 套件 | v4.155 | **v4.156** |
|---|---|---|
| `_upd`（12 条） | 11/12 | **12/12** |
| `_map` 8/8 · `_dictset` 30/30 · `_orig` 4/4 · `_paren2` 15/15 · func 31/31 | 同 | 不变 |
| `_broad` 30/33 · `_slice` 17/20 · `_cat` 3/8 · `_star` 7/12 | 同 | 不变 |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 · `_setflt` 15/15 · `_nest` 24/24 · `_doc2` 10/10 | 同 | 不变 |
| covX 56/63 · cov3 40/42 · `_fstring` 17/18 · `_floatarith` 34/35 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,830 块） |
| 历史复现 | — | **v4.156 … v4.150 全 MATCH** |

## 5. 落地与验证

* 新部件 `_work/v41/p263.txt`（P263），插在 `p262.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p156 = 'P263'`、`'v4.155' = "$p156"`，145 个旧版本条目全部前置 `$p156`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.156**；产物 **`MiniPy_v4.156.sb3`**。
* 块数：Interpreter 28,553 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,830**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.156.sb3
node _work/v41/check41.cjs MiniPy_v4.156.sb3                      # 30,830 块 errors=0
node _work/v41/run.mjs MiniPy_v4.156.sb3 _work/v41/_upd.json    # 12/12
node _work/v41/run.mjs MiniPy_v4.156.sb3 _work/v41/_map.json    # 8/8
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.156…v4.10 MATCH
```
