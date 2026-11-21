# MiniPy v4.163 更新说明：`filter(None, xs)`（P281）

## 0. 一句话

```python
print(list(filter(None, [0, 1, '', 'a'])))   # [1, 'a']   ← 以前 NameError: name 'None' is not defined
print(list(filter(len, ['a', ''])))          # ['a']      （本来就正常）
print(list(map(abs, [-5])))                  # [5]        （本来就正常）
```

解释器积木 28,779 → **28,800**（+21），变量 1,404 → **1,405**（`mpisId`），合计 31,056 → **31,077**。

## 1. 语义与实现

CPython 里 `filter(None, xs)` 表示"**用元素自身的真假**筛选"。P262 的 map/filter 分支要求第一个实参是
"单个标识符"，`None` 不是，于是被当名字求值 → `NameError`。

修法（只影响 filter）：分支里新增 `mpisId` 标志 —— 当 `Tok[lo+2] == "None"`、是 filter、
且第一个实参只有一个 token 时置 1；把"第一个实参必须是函数名"的检查放行；并把逐元素的
`callval` 包成 `if mpisId == 0`，identity 情形直接用元素本身去走后面那段现成的真值判定。
（`map(None, …)` 在 CPython 里本来就报 TypeError，仍然走原检查。）

## 2. 走到这里踩掉的三个坑（都写进 P281 注释）

1. **`reach(branch)` 会顺着 `next` 跑出分支** → 抓到了 P130（sorted）的 `callval`，把 map 的回调整个跳过
   （`_map` 1/8）。应使用 `reach(BL()[branch].inputs.SUBSTACK[1])`。
2. **包装条件写反**：`IF(NOT(EQ(mpisId,0)))` → 非 identity 时反而不调用回调。
3. **标志复位写成了游离积木**：`setV('mpisId', 0)` 写在 `insertBeforeStmt(...)` 之前，
   于是它只是一块"从不执行"的积木 → `mpisId` 从一次调用泄到下一次，
   导致「先 filter(None) 再 map(abs)」时 map 跳过回调（`print(list(map(abs,[-5])))` 单独跑对、
   跟在 filter 后面就错）。复位必须放进插入的代码里。

第 3 条是靠"单独跑对比 + 前后两行对比"两分钟定位的 —— **状态泄漏类 bug 用这种对照法很快**。

## 3. 回归证据

| 套件 | v4.162 | **v4.163** |
|---|---|---|
| `_fn`（filter(None) 对照 5 条） | 4/5 | **5/5** |
| `_be`（27 条内置边界） | 25/27 | **26/27** |
| `_q`（map abs / filter None 4 条） | 3/4 | **4/4** |
| `_map` 8/8 · `_it` 5/6 · `_bk` 2/4 · `_sdk2` 3/4 · `_kw` 0/4 · `_ch` 2/5 | 同 | 不变 |
| `_uh` 1/1 · `_upd` 12/12 · `_orig` 4/4 · `_dictset` 30/30 · func 31/31 · `_broad` 30/33 | 同 | 不变 |
| `_paren2` 15/15 · `_covX` 58/63 · `_cov1` 34/40 · `_cov3` 40/42 · `_cov5` 30/47 | 同 | 不变 |
| `_nest` 24/24 · `_setflt` 15/15 · `_doc2` 10/10 · `_slice` 17/20 · `_star` 7/12 · `_cat` 3/8 | 同 | 不变 |
| `_pw` 4/5 · `_catch2` 7/7 · `_catch3` 8/8 · `_del` 13/13 · `_swap` 17/17 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,077 块） |
| 历史复现 | — | **v4.163 … v4.160 全 MATCH** |

## 4. 落地与验证

* 新部件 `_work/v41/p281.txt`（P281），插在 `p280.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p163 = 'P281'`、`'v4.162' = "$p163"`，152 个旧版本条目全部前置 `$p163`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.163**；产物 **`MiniPy_v4.163.sb3`**。
* 块数：Interpreter 28,800 / Controller 2,019 / TextRenderer 234 / Stage 24 = **31,077**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.163.sb3
node _work/v41/check41.cjs MiniPy_v4.163.sb3                      # 31,077 块 errors=0
node _work/v41/run.mjs MiniPy_v4.163.sb3 _work/v41/_fn.json     # 5/5
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.163…v4.10 MATCH
```

## 5. 待办

1. `iter(<不可迭代>)` 的类型检查（注意别触发 p68 的 `copyBlock` 崩溃）；
2. `min/max default=`（结构已定位：门 `bcontro_jqknkpwgy`、内层 `bcontro_jkx36thdu`）；
3. `sorted(d, key=<内建名>)`（走的是第三条入口）；
4. `round(2.675, 2)` 等浮点显示（设计层差异，存档）。
