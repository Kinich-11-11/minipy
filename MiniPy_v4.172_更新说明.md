# MiniPy v4.172 更新说明：`iter()`/`next()` 真正有状态（Tier-3 #9 **完成**）

## 0. 一句话

```python
it = iter([1, 2, 3])
print(next(it), next(it), next(it))   # 1 2 3   ← 以前是 1 1 1（静默算错）
print(next(it))                        # StopIteration（以前会一直返回 3）
```

解释器积木 29,179 → **29,243**（+64），列表 141 → **143**（`ItSrc`/`ItPos`），变量 1,411 → **1,413**（`nxid`/`nxlen`），
合计 31,456 → **31,520**。

## 1. 实现（四处）

| 位置 | 做什么 |
|---|---|
| `callfn` 的 `iter` 分支 | `ItSrc[id] = 源列表`、`ItPos[id] = 1`；返回**新类型标签 `"Y"`**，值就是那个 id |
| `callfn` 的 `next` 分支 | `evtype == "Y"` 时取 `ItSrc[id][ItPos[id]]`、位置 +1；越界 → `StopIteration` |
| `callfn` 的 `list` 分支 | `"Y"` → `ev = ItSrc[ev]`、`evtype = "L"` |
| `forloop` 的外层 `IFELSE(evtype in (L,T,G))` 之前 | 同样把 `"Y"` 换回源列表 |

`forloop` 那处的位置很关键：它的结构是
`148 dictkeys(D) → 149 IFELSE(type in L/T/G) 列表路 … ELSE → 163 IF(NOT type=="S") → 165 fail "for expects a string"`，
所以必须插在 **149 那个外层 IFELSE 之前**；插在 163 的内层 if 前**太晚**（这一点花了两轮才确认）。

## 2. 走过的弯路（写下来避免重犯）

* 第一版把值换成新标签 `'Y'`，只改 `iter`/`next` → `next` 立刻正确（n1/n2/n5 全对），
  但 `list(it)`、`for x in it` 全崩 → 必须同时补两个消费者；
* 第二版想省事：值仍然是列表、游标 id 放 `evK` → **完全无效**，
  因为 `it = iter(...)` 这条**赋值会清空 `evK`**，游标活不过赋值；
* `forloop` 的参数表是混淆的、调用它的 `procedures_call` 的 `inputs` 是空的
  （所有状态都走全局变量），所以"在函数体最前面转换"无效 —— 必须等到它内部求值完可迭代对象之后。

## 3. 验收与回归

| 套件 | v4.171 | **v4.172** |
|---|---|---|
| `_nx`（迭代器状态 6 条） | 3/6 | **6/6** |
| `_it`（iter/next 6 条） | 6/6 | 6/6 |
| `_oo` 22/30 · `_be` 26/27 · `_ex` 6/8 · `_catch2` 7/7 · `_catch3` 8/8 · func 31/31 | 同 | 不变 |
| `_sd` 5/6 · `_sm` 31/33 · `_broad` 31/33 · `_dictset` 30/30 · `_map` 8/8 | 同 | 不变 |
| `_covX` 58/63 · `_cov5` 30/47 · `_nest` 24/24 · `_setflt` 15/15 · `_doc2` 10/10 · `_orig` 4/4 · `_al` 6/6 | 同 | 不变 |
| `_na` 4/5 · `_fstring` 17/18 · `_pw` 4/5 · `_ch` 2/5 · `_kw` 0/4 · `_bk` 2/4 · `_sdk2` 3/4 | 同 | 不变 |
| `_paren2` 15/15 · `_cov1` 34/40 · `_cov3` 40/42 · `_slice` 17/20 · `_star` 7/12 · `_cat` 3/8 | 同 | 不变 |
| `_del` 13/13 · `_swap` 17/17 · `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 同 | 不变 |
| `_tcases` 3/3 · `_rhs` 6/6 · `_comp` 12/12 · `_comp2` 6/6 · `_calls2` 4/4 · `_unp` 13/13 | 同 | 不变 |
| `_unp2` 11/13 · `_unp3` 13/14 · `_orig2` 7/8 · `_floatarith` 34/35 · `_uh` 1/1 · `_upd` 12/12 · `_fn` 5/5 · `_q` 4/4 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,520 块） |

## 4. 落地与验证

* 新部件 `_work/v41/p298.txt`（P298），插在 `p295.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p172 = 'P298'`（**单补丁**，仍是列表形式）、`'v4.171' = "$p172"`，`bumpskip.cjs` 累加。
* `head.txt` 输出版本 → **v4.172**；产物 **`MiniPy_v4.172.sb3`**。
* 块数：Interpreter 29,243 / Controller 2,019 / TextRenderer 234 / Stage 24 = **31,520**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.172.sb3
node _work/v41/check41.cjs MiniPy_v4.172.sb3                      # 31,520 块 errors=0
node _work/v41/run.mjs MiniPy_v4.172.sb3 _work/v41/_nx.json     # 6/6
```

## 5. 清单进度

| # | 项 | 状态 |
|---|---|---|
| 1 | 返回的容器别名 | ✅ v4.166 |
| 2 | `__str__`/`__repr__` 分派 | ✅ v4.167–169 |
| 3 | 异常实例模型 | 🟡 v4.170/171（x3 为设计差异；x4 有锚点） |
| 4 | 闭包捕获表 | ⬜ **下一步**（Tier-1 最后一项） |
| 5–8 | 浅拷贝 / `pow(2)` / 隐式拼接 / lambda 内联 | ⬜ |
| 9 | `next()` 迭代器状态 | ✅ **v4.172** |
| 10–13 | 类属性共享 / 运算符重载 / 多继承 / 生成器 | ⬜ |
