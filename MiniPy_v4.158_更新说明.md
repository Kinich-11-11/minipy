# MiniPy v4.158 更新说明：内建 `pow()`（浮点指数 + 三参数取模）（P268）

## 0. 一句话

```python
print(pow(2, 0.5))        # 1.4142135623730951   ← 以前 ValueError: pow() needs an integer exponent
print(pow(2, 3, 5))       # 3                    ← 以前 NameError: name 'pow' is not defined
print(pow(2, 10, 1000))   # 24
```

解释器积木 28,579 → **28,630**（+51），变量 1,394 → **1,403**，合计 30,856 → **30,907**。

## 1. 两个缺陷（同一处入口）

**(a) `builtin2b %s %s %s %s %s (fn,a1v,a1t,lo2,hi)` 的 pow 分支**自己用"重复乘法"实现，
并强制要求整数指数（`if ev % 1 != 0 → ValueError: pow() needs an integer exponent`），
所以 `pow(2, 0.5)` 直接报错。

修法：整个分支体换成一句 **`powval(a1v, ev)`** —— 正是 `**` 用的那个过程，
它支持浮点与负指数，并自己写好 `ev`/`evK`/`evtype`（顺带也去掉了私有的大小上限）。

**(b) `eval` 的多实参分派只认 0/1/2 个实参**，3 个实参落到 else（当用户函数调用）
→ `NameError: name 'pow' is not defined`。

修法：在 else 前面插一支：先带深度数一遍顶层逗号，
若 `Tok[lo] == "pow"` 且恰好 3 个实参，则求值 a/b/m 三个实参（保留类型判断），
回答 `powval(a, b) % m`；模数为 0 时按 CPython 报 `ValueError: pow() 3rd argument cannot be 0`。

## 2. 已知未修

`pow(2)`（只给一个实参）MiniPy 报 `NameError`，CPython 报
`TypeError: pow() missing required argument 'exp' (pos 2)`（该文案在 P142 的 `zeroarg` 表里已有，
但一实参分派那条路还没接上）。`_pw` 的第 5 条即此，已记录。

## 3. 回归证据

| 套件 | v4.157 | **v4.158** |
|---|---|---|
| `_pw`（pow 五形状） | 2/5 | **4/5**（余下为第 2 节） |
| `_cov1` | 33/40 | **34/40** |
| `_cov5` | 29/47 | **30/47** |
| `_pow` 36/36 · `_bi` 2/2 · `_map` 8/8 · `_orig` 4/4 | 同 | 不变 |
| `_broad` 30/33 · `_covX` 56/63 · `_cov3` 40/42 · `_slice` 17/20 · `_star` 7/12 · `_cat` 3/8 | 同 | 不变 |
| `_paren2` 15/15 · `_dictset` 30/30 · func 31/31 · `_setflt` 15/15 · `_nest` 24/24 · `_unp` 13/13 · `_doc2` 10/10 · `_upd` 12/12 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,907 块） |
| 历史复现 | — | **v4.158 … v4.154 全 MATCH** |

## 4. 落地与验证

* 新部件 `_work/v41/p268.txt`（P268），插在 `p265.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p158 = 'P268'`、`'v4.157' = "$p158"`，147 个旧版本条目全部前置 `$p158`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.158**；产物 **`MiniPy_v4.158.sb3`**。
* 块数：Interpreter 28,630 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,907**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.158.sb3
node _work/v41/check41.cjs MiniPy_v4.158.sb3                      # 30,907 块 errors=0
node _work/v41/run.mjs MiniPy_v4.158.sb3 _work/v41/_pw.json     # 4/5
node _work/v41/run.mjs MiniPy_v4.158.sb3 _work/v41/_cov1.json   # 34/40
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.158…v4.10 MATCH
```
