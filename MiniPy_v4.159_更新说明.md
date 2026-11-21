# MiniPy v4.159 更新说明：不可哈希的键 / 集合元素（P270）

## 0. 一句话

以前 MiniPy **静默接受**下面四种写法（甚至把 `[1]` 当键存进字典），现在与 CPython 一致地抛 `TypeError`，
并且**能被 `except TypeError` 捕获**：

```python
try:
    d = {}
    d[[1]] = 2          # TypeError: cannot use 'list' as a dict key (unhashable type: 'list')
except TypeError as e:
    print('caught', str(e)[:20])      # caught cannot use 'list' a

try:
    s = {[1]}           # TypeError: cannot use 'list' as a set element (unhashable type: 'list')
except TypeError as e:
    print('caught2', str(e)[:20])

try:
    x = {{1: 2}: 3}     # TypeError: cannot use 'dict' as a dict key (unhashable type: 'dict')
except TypeError as e:
    print('caught3', str(e)[:20])
```

解释器积木 28,630 → **28,710**（+80），合计 30,907 → **30,987**。

## 1. 三处守卫（每处的文案都照 CPython 3.14 本机实测）

| 位置 | 管什么 | 键/元素类型在哪 |
|---|---|---|
| `dictpair %s %s (a,b)` | 字典**字面量**的键 | 求值键之后立刻有 `dgkt = evtype` |
| `indexset %s %s (lo,hi)` 的 **D 分支** | 下标赋值 `d[k] = v` | 键类型 `isKeyT`，字段串 `isKeyF = lsep & isKeyT & isKeyE` |
| `setnorm %s (s)` 的元素循环 | 集合元素（`{a, b}`、`set(x)`） | 逐元素在 `ev/evtype`（`listitem` 之后） |

> `d[k] = v` 的真实链路很绕：`pathset` → **`tokenize("__pw[__pi]=__pv")`** → `indexset`（P166 那套"合成源码行"手法）；
> 集合字面量则是 `eval` → `listlit` → `setnorm`（P111）。守卫放在这两处即可一次覆盖全部写法。

## 2. 关键教训（花了一轮才找到）

**异常消息必须带 `TypeError: ` 前缀。** `trycatch` 是靠 `"<name>: <message>"` 里的 `<name>` 去匹配
`except` 的异常类的（见 `p129.txt`）——第一版我写的消息没有前缀，于是"错抛了、但 `except` 抓不到"，
探针只看到裸消息。补上前缀后 `_uh` 立刻 1/1、`_covX` 56/63 → 58/63。

（判定只用 `L`/`D`/`E` 三种类型；`T` 元组在 CPython 里可哈希，保持不动。）

## 3. 回归证据

| 套件 | v4.158 | **v4.159** |
|---|---|---|
| `_uh`（不可哈希专项） | 3 条全静默 | **1/1（三条都按 CPython 抛错并可捕获）** |
| `_covX` | 56/63 | **58/63** |
| `_dictset` 30/30 · `_map` 8/8 · `_upd` 12/12 · `_pw` 4/5 · `_orig` 4/4 · `_doc2` 10/10 | 同 | 不变 |
| `_broad` 30/33 · `_paren2` 15/15 · func 31/31 · `_nest` 24/24 · `_setflt` 15/15 | 同 | 不变 |
| `_slice` 17/20 · `_cat` 3/8 · `_star` 7/12 · `_cov1` 34/40 · `_cov3` 40/42 · `_cov5` 30/47 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,987 块） |
| 历史复现 | — | **v4.159 … v4.155 全 MATCH** |

## 4. 落地与验证

* 新部件 `_work/v41/p270.txt`（P270），插在 `p268.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p159 = 'P270'`、`'v4.158' = "$p159"`，148 个旧版本条目全部前置 `$p159`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.159**；产物 **`MiniPy_v4.159.sb3`**。
* 块数：Interpreter 28,710 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,987**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.159.sb3
node _work/v41/check41.cjs MiniPy_v4.159.sb3                      # 30,987 块 errors=0
node _work/v41/run.mjs MiniPy_v4.159.sb3 _work/v41/_uh.json     # 1/1
node _work/v41/run.mjs MiniPy_v4.159.sb3 _work/v41/_covX.json   # 58/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.159…v4.10 MATCH
```
