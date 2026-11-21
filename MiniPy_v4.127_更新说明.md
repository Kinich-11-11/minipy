# MiniPy v4.127 更新说明

本轮**补齐字符串接口**：`find` / `rfind` / `count` / `index` 的 **`end` 边界**（字符串、列表、元组都支持）、
**负数 `start`**、**`split(None, maxsplit)`**、以及全新的 **`rsplit`**。补丁 **P200**。

产物 `MiniPy_v4.127.sb3`：Interpreter 26,098 → **26,599** 块，全工程 **28,345**，`check41` errors=0。

## 1. 问题（v4.126 实测，`_work/cmp47/d280.json` 34 条）

| 写法 | v4.126 | **v4.127** | CPython |
|---|---|---|---|
| `'abcabc'.find('b', 2, 4)` | `TypeError: 'int' object cannot be interpreted as an integer` | **-1** | -1 |
| `'abcabc'.find('a', -3)` | **0** | **3** | 3 |
| `'abcabc'.count('a', 1, 4)` | 同上 TypeError | **1** | 1 |
| `'abcabc'.index('b', 2, 4)` | **1**（第二段被当成元组） | **`ValueError: substring not found`** | 同 |
| `[1,2,1,2].index(2, 0, 2)` | `TypeError: slice indices must be integers …` | **1** | 1 |
| `'a b  c'.split(None, 1)` | `ValueError: empty separator` | **`['a', 'b  c']`** | 同 |
| `'a,b,c'.rsplit(',')` | `AttributeError: 'str' object has no attribute 'rsplit'` | **`['a', 'b', 'c']`** | 同 |

套件总分 **9/34 → 34/34**（find 1/8→8/8、count 0/4→4/4、index 0/4→4/4、split 0/2→2/2、rsplit 0/7→7/7、
err 2/3→3/3、reg 6/6 不变）。

三条根因：

1. **字符串派发只切一刀**。P18 的参数切分只找**第一个**顶层逗号，`find('b', 2, 4)` 于是把 `2, 4` 当**一个元组**
   求值交给 `start` 内核；负数字面量更早一步就炸（`-3, -1` 求元组时报 `TypeError: numeric operand`）。
2. **列表/元组的 `index` 同样只有一刀**（P190 补的 `mcut`），`index(x, start, end)` 的第三段被当成元组的第二项。
3. `ssplitw` 根本没有上限概念，`rsplit` 这个方法名压根不在派发表里。

## 2. 做法

**① 参数切分：记住第二个顶层逗号（`mcut2`）**

* 原有的"第一个顶层逗号"扫描循环里再加一条赋值：`sd == 0 且 Tok[sk] == "," 且 mcut > 0 且 mcut2 == 0 ⇒ mcut2 = sk`
  （字符串派发与列表派发两处各一份，形状与 P190 给列表加的那份相同，跳过字符串字面量与括号组）。
* 后面的三段式求值把原来的 `if (mcut>0) A else B` 改成 `if (mcut2>0) 三段 else (if (mcut>0) 二段 else 一段)`，
  **每一段单独 `eval`**：`sma1`/`sma2`/`sma3` 与各自的类型 `smt1`/`smt2`/`smt3`。这样负数字面量不会再被凑成元组。

**② 三个内核（`s3find` / `s3rfind` / `s3count`）**

* 边界按 **Python 切片**规则夹取：`start < 0 → start += len`，再 `< 0 → 0`（**不**往上夹到 `len`）；
  `end < 0 → end += len`，`→ [0, len]`。`start` 不夹到 `len` 正是 `'abc'.find('', 5)` 为 -1 而
  `'abc'.find('', -1)` 为 2 的原因。
* 夹完若 `start > end` 直接给 -1（`count` 给 0）；否则在切片 `substr(rec, start+1, end)` 上调用**已有的**
  单参数内核，再把偏移加回去。空 needle 的 `count` 是 `len(slice)+1`（与单参数派发里那条特例一致）。
* 类型不对（`smt2`/`smt3` 不是 `N`）照旧报 `TypeError: '<type>' object cannot be interpreted as an integer`。

**③ 派发顺序（这一版最容易踩的地方）**

三参数派发块放在**单参数处理器之后**：`sfind`/`scount` 那两条 `if smmeth == "find"/"count"` 每次调用都会跑，
放在前面写的 `ev` 会被它们覆盖（第一版就是这样，`find('b',2,4)` 答的是全串 find 的结果）。
同时给**双参数**的四个分支（`index` 的 `gt(mcut,0)`、`rfind`/`rindex`、`sfind2`/`srfind2`、`scount2`）
的条件都加上 `mcut2 == 0`，让它们在三参数调用时让位。

**④ 负数 `start`（P177/P179 的既有缺口，顺带补）**

`sfind2`/`srfind2`/`scount2` 把位置**照字面**用，`'abcabc'.find('a', -3)` 因此答 0（CPython 3）。
四个双参数分支入口各加两条：`sma2 < 0 ⇒ sma2 += len(smrec)`、仍 `< 0 ⇒ 0`。

**⑤ `list`/`tuple` 的 `index(value, start, end)`**

切分拿到 `mcut2` 后多求一段 `lsend`（缺省用一个大于任何长度的哨兵），算出 `lsn` 之后再夹
`lsend`（`<0 ⇒ += lsn`、`<0 ⇒ 0`、`> lsn ⇒ lsn`），最后把扫描循环的终止条件从 `lsix > lsn` 改成 `lsix > lsend`。

**⑥ `split(None, maxsplit)`**

`ssplitw` 增加计数 `smcnt` 与上限判断 `smmax > -1 且 smcnt >= smmax`：到限就把**剩余整段**（`substr(s, spwi, spwn)`，
保留尾部空白）当最后一个字段，然后收工。`smmax == 0` 于是等于"去掉前导空白、整段留下"（`'a b  c'.split(None,0)`
→ `['a b  c']`）。派发侧只要把 P193 那条 `(smt1=="Z") and (smmax<0)` 放宽成 `smt1=="Z"` 即可 —— 上限已经有人管了。

**⑦ `rsplit`（新方法）**

* `srsplit <rec> <sep> <maxsplit>`：从右往左走，`compareText` 比分隔符，命中就把字段**前插**进编码累加器
  （`\x1f` + 类型 + `lesc` 转义值），所以字段顺序仍是原来的；空分隔符报 `ValueError: empty separator`。
* `srsplitw <rec> <maxsplit>`：先剥尾部空白，再反向读一个字段、跳过左边的空白串；到限时把剩下的头部
  （`substr(1, hi)`，**保留前导空白**）当第一个字段 —— 于是 `'  a   b  '.rsplit(None, 1)` 是 `['  a', 'b']`。
* 派发插在"未知方法"守卫**之前**；那条守卫是"名字**不在**表里才报错"，所以要把 `rsplit` 从它的条件里
  **排除**（`and(旧条件, not(smmeth=="rsplit"))`），而不是加进去。

## 3. 踩过的坑（可复用）

* **一个 block id 不能同时喂给两个输入**。`isWs` 把同一个 `letter of` 的接收者报告器用了 4 次 ⇒ 恒为 false
  （空白永远认不出来，`rsplit()` 答整串）；`limitHit` 把同一个 `maxsplit` 报告器用了 2 次 ⇒ 上限判断恒为真
  （`rsplit(',')` 一个字段都不切）。改成**每次现取**（传 thunk）就对了。变量描述符 `F('x')` 是普通数据、可以复用。
  定位手段：把可疑表达式塞进临时 `fail %s` 打印 —— `COND=true lt=false lim=true` 一眼看出是 `AND` 的两半打架。
* **`insertBeforeStmt` 的目标要选对**：三参数块最初插在 `smmeth` 赋值之后，看起来"就在派发里"，
  实际被更早的单参数处理器覆盖。判断依据只能是**执行顺序**，不是缩进。
* **顺手把负数 `start` 一起修**：它不属于 `end` 那一族，但同一批用例（F3/C2/I2）里一半是它，不修就只到 21/34。

## 4. 实测（无头、真实 scratch-vm 5.300）

| 检查 | 结果 |
|---|---|
| `_work/cmp47/d280.json`（新写的 34 条字符串接口套件） | **34/34**（v4.126 是 9/34） |
| 123 套快照逐例 diff（v4.126 vs v4.127，`_work/v41/_regcheck2.ps1`） | **0 回归**；26 条由红转绿；2 条报错文案纠正 |
| 其中 `d274` | S7「split(None, 1) 仍是错误」转正 |
| 其中 `d280` | 25 条转正；**2 条 CHG**：I6 由 `TypeError: slice indices…` 变成 CPython 的 `ValueError: list.index(x): x not in list`；R7 由 `AttributeError` 变成 `ValueError: empty separator` |
| battery 23 套（cls/alias/gen/try/nested/nested2/tuple/comp/gaps/regress/one/one2/b2/cont/func/str/fstr/pct/math/bit/booljson/float/dict） | 与 v4.126 **逐例相同**（`one2` O2、`math` 3 条、`dict` D 是既有差异） |
| `gaps433.json`（63 条） | **61/63（不变）**，只余 E50 与 G5 |
| featprobe 6 套 259 例 | **248/259（不变）** |
| `frames` fib16 | `interpSteps` **6388**（不变） |
| `check41.cjs` | **28,345 块 errors=0** |
| `rebuild-old.ps1` | v4.10 … **v4.127 共 118 版全 MATCH** |

新增 **5 个过程**（`s3find` / `s3rfind` / `s3count` / `srsplit` / `srsplitw`）、**14 个变量**
（`mcut2` `sma3` `smt3` `lsend` `pqn` `pqa` `pqb` `pqm` `pqs` `pqacc` `pqc` `pqhi` `pqlo` `p2i`）；
Interpreter 26,098 → **26,599** 块，全工程 27,767 → **28,345**（Controller 1,533 / TextRenderer 189 / Stage 24）。
> 注：按当前补丁链重建的 v4.126，Controller 是 **1,532** 块而 v4.126 文档写的是 1,456 —— 这是既有出入、与本轮无关
> （Interpreter 一字不差，`compare.cjs` 报 MATCH；`rebuild-old` 只比对 Interpreter）。所以 v4.127 的 Controller 是
> 1,533 而不是 1,456+1。

## 5. 前后对比

```
'abcabc'.find('b', 2, 4)     v4.126: TypeError      v4.127: -1
'abcabc'.find('a', -3)       v4.126: 0              v4.127: 3
'abcabc'.count('a', 1, 4)    v4.126: TypeError      v4.127: 1
'abcabc'.index('b', 2, 4)    v4.126: 1              v4.127: ValueError: substring not found
[1,2,1,2].index(2, 0, 2)     v4.126: TypeError      v4.127: 1
'a b  c'.split(None, 1)      v4.126: ValueError     v4.127: ['a', 'b  c']
'a,b,c'.rsplit(',')          v4.126: AttributeError v4.127: ['a', 'b', 'c']
'a,b,c'.rsplit(',', 1)       v4.126: AttributeError v4.127: ['a,b', 'c']
'  a   b  '.rsplit(None, 1)  v4.126: AttributeError v4.127: ['  a', 'b']
'abc'.rsplit('')             v4.126: AttributeError v4.127: ValueError: empty separator
```

## 6. 仍缺 / 下一轮候选

* **`replace(old, new, count)` 的 `count` 会被忽略**。三段切分已经把它切出来了（`sma3`），但 `srep` 还没有计数参数，
  `'aaa'.replace('a', 'b', 1)` 答 `'bbb'`（CPython `'baa'`）。注意 v4.126 这里更糟：`count` 与 `new` 被凑成元组，
  输出的是编码串 `\x1fSb\x1fN1bc`。`_work/v41/_q3.json` 的 Q5 用的 `'abc'.replace('a','b',1)` 恰好两版同解。
* 其余顺延项：`for a, *r in …`（for 头部星号目标）、内建 `*` 展开（`max(*xs)` / `zip(*m)`）、
  多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）、
  `d.pop(k, default, extra)`、视图集合语义、非 ASCII。
* 界面小项（v4.126 顺延）：`help.json` 第 3 行仍写 `ENT=new line BK=del TAB=4sp`；
  ZIP 里有一张未被引用的旧背景。

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.127.sb3
node _work/v41/check41.cjs MiniPy_v4.127.sb3                    # errors=0
node _work/v41/run.mjs MiniPy_v4.127.sb3 _work/cmp47/d280.json  # 34/34
node _work/v41/run.mjs MiniPy_v4.127.sb3 _work/cmp47/gaps433.json   # 61/63
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                 # v4.10…v4.127
# v4.126 还原： $env:V41_SKIP='P200'; $env:V41_OUT='…/MiniPy_v4.126.sb3'; $env:V41_STAMP='MiniPy v4.126'; node _work/v41/build41.js
```
