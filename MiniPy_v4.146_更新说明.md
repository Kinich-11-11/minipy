# MiniPy v4.146 更新说明：嵌套解包目标（P228）

## 0. 一句话

`for (a, b), c in ...`、`a, (b, c) = ...`、`def f(): for (a, b), c in ...` 这类**嵌套解包**以前
直接 `SyntaxError`（或静默绑错），现在与 CPython 一致；顺带挖出并固化了一条补丁工具规则：
**补丁里不能用 `=` 比较括号字形**。
解释器积木 27,842 → **27,993**（+151），变量 1,339 → **1,356**，合计 30,119 → **30,270**。

## 1. 三处根因与修法

| 位置 | 以前 | 现在 |
|---|---|---|
| `unpackto %s %s (names, enc)` | 按**任意**逗号切名字 | 按**深度 0** 逗号切段；段以 `(`/`[` 开头时，把该元素记录再按内层名字表拆一次（内层用独立变量 `un2*`，不做递归，避免全局变量被自己覆盖）。错误消息（not enough / too many values to unpack）与扁平路径完全照旧 |
| `forloop`（语句 `for`） | 多目标分支要求 `Tok[3] == ","`，按"每 2 个 token 取一个名字"收集，且自带一个不认括号的 `in` 扫描 | 前置扫描：在括号深度 0 处找 `in`（`fin2`），并且**只统计出现在 `in` 之前**的深度 0 逗号（`fcomma`）；实际扫描移到守卫之前；名字串改成把 `Tok[2..fin2-1]` 原样拼接（保留括号） |
| `assignlist %s (eqi)`（赋值形式） | 目标每个 token 都必须是 `Kind=="I"`，遇到 `(` 直接 `SyntaxError: invalid assignment target` | 目标里出现括号时跳过扁平名字表，改成一次 `unpackto(名字串, 右侧记录)`（挂在 `auenc = ev` 之后、类型检查之后） |

## 2. 本轮最大的发现：补丁里 `=` 比较**括号字形**不可靠

调试最久的一个坑。症状：`unpackto` 里 `letter(1, "(a,b)") == "("` 判为 **false**，
于是 `(a, b)` 这段被当成普通名字、`unpackto` 悄悄 `assign("(a,b)", ...)`，
外面 `print(a, b, c)` 报 `NameError: name 'a'`。

用调试补丁打印证实：`GC first=[(] seg=[(a,b)] open=[false]` —— 左边确实是 `(`，比较结果却是 false。

原因：MiniPy 自己的字符串比较走 `compareText`/字形表（`compareText` 就是为字形/大小写而生的），
而补丁里直接造的 `operator_equals` 对**括号类字形**会失配（`「(」「[」「{」` 等；
字母/数字/单词如 `L`、`N`、`inf`、`for` 的比较是正常的）。

**规则**：补丁里判断括号一律用 `operator_contains`（纯 JS 子串判断，对字形可靠）：

```js
const CONTAINS = (hay, needle) => I('operator_contains',
  { inputs: { STRING1: B.REP(txt(hay), [10, '']), STRING2: B.REP(needle, [10, '']) } });
const isOpen  = (v) => CONTAINS('([{', v);
const isClose = (v) => CONTAINS(')]}', v);
```

> 同一个坑也解释了 P226（v4.144）里 `cdo` 前置扫描的括号深度计数为什么形同虚设：
> 它用的是 `EQ(Tok[i], txt('('))`。那处扫描目前只影响"`in` 是否被括号内的 `in` 抢先匹配"
> （例如 `for x in [i for i in y]`），已记录为待修项。

## 3. 次要坑

* `forloop` 的多目标分支是 `control_if` 而不是 `control_if_else`（`dis.cjs` 会渲染成 `if_else`，误导过一次）。
* 逗号 token 的 `Kind` 不是 `"O"`；原代码判据是 `Tok == "," and Kind != "S"`。
* 前置扫描必须放在守卫**之前**（守卫要判断扫描算出的 `fcomma`），但不能塞进守卫的 fail 分支里。
* DSL 造出的一串积木**彼此没有 `next` 链接**，手工接线时必须自己 `chain(...)`，否则只有第一个可达、其余被剪掉。
* `find()` 返回的匹配**不保证程序顺序**，而 `assignlist` 里同形语句不止一处；要用"沿 `next` 走链"的
  `chainFind` 或对全部匹配都插入（本轮对两处 `auenc = ev` 各挂一次，幂等）。
* `replaceStmt` 会把旧积木的 `next` 留在原地（P223 同款死链坑）。

## 4. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.145 | **v4.146** | CPython |
|---|---|---|---|
| `for (a, b), c in [((1, 2), 3)]: print(a, b, c)` | SyntaxError | **`1 2 3`** | 同 |
| `a, (b, c) = 1, (2, 3)` | SyntaxError | **`1 2 3`** | 同 |
| `[a + b for a, b in [(1, 2), (3, 4)]]` 等扁平形式 | 对 | **仍对** | 同 |
| `a, b = 1, 2` / `a, *rest = [1,2,3]` / `a, b = b, a` | 对 | **仍对** | 同 |
| `for a, b in [(1,2),(3,4)]` | 对 | **仍对** | 同 |
| 解包数量不匹配时的两条 ValueError 文案 | 对 | **仍对** | 同 |
| `(a, b), c = (1, 2), 3`（**首个目标**是括号组） | NameError | NameError（未修） | `1 2 3` |
| `(a, b), (c, d) = ...` 同上 | NameError | NameError（未修） | — |

转正用例：`_unp.json`（13 条）**9/13 → 11/13**；覆盖套件 covX +2（`nested for target parens`、
`multi assignment nested parens`）、cov3 +1（`nested unpacking in for`）。

## 5. 回归证据

| 套件 | 结果 |
|---|---|
| cov3 / cov4 / cov5 / covX（逐例 diff） | **0 broke**（cov3 +1、covX +2） |
| `_nest` 24/24 · `_swap` 17/17 · `_comp` 12/12 · `_setflt` 15/15 | 不变 |
| `_dictset` 30/30 · `_del` 13/13 · `_slice` 17/20 · `_alias` 11/17 · `_alias2` 11/11 | 不变 |
| `_upd` 11/12 · `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 | 不变 |
| `_cr` 17/17 · `_tcases` 3/3 · `_catch`/`_catch2` 7/7 · `_catch3` 8/8 | 不变 |
| `_fstring` 17/18 · `_floatarith` 34/35 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（30,270 块） |
| 历史复现 | **v4.145 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 6. 残留（下一批）

1. **首个目标是括号组**（2 条）：`(a, b), c = ...`、`(a, b), (c, d) = ...`
   —— 语句以 `(` 开头，`execute` 的语句分类没把它交给 `assignlist`；需要在 `execute` 里允许
   "以 `(` 开头且存在深度 0 的 `=`" 的赋值语句路由过去。
2. **P226 的 `cdo` 括号深度计数**用的是 `=` 比较括号（见 §2 规则）→ 换成 `contains`。
3. `repr` 的通用 `\xhh`（要先实现 `\xhh`/`\ooo` 转义解码，否则没有可观测用例）。
4. 其余大块：返回值别名（设计留档在 v4.143 说明）、浅拷贝/元素级引用（6 条）、浮点十进制模型、
   `chr()` 范围、闭包/`nonlocal`、生成器、`__str__` 分派、类属性共享、多继承 `isinstance`、
   `d.update(b=2)`、lambda 多参/默认值、`frozenset`。

## 7. 落地与验证

* 新部件 `_work/v41/p228.txt`（P228），插在 `p227.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p146 = 'P228'`、`'v4.145' = "$p146"`，135 个旧版本条目全部前置 `$p146`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.146**；产物 **`MiniPy_v4.146.sb3`**。
* 块数：Interpreter 27,993（+151）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **30,270**。
* 工作笔记（含调试过程）保留在 `_work/v41/notes-unpack.md`。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.146.sb3
node _work/v41/check41.cjs MiniPy_v4.146.sb3                      # 30,270 块 errors=0
node _work/v41/run.mjs MiniPy_v4.146.sb3 _work/v41/_unp.json     # 11/13
node _work/v41/run.mjs MiniPy_v4.146.sb3 _work/v41/_swap.json    # 17/17（曾坏过，回归守卫）
node _work/v41/run.mjs MiniPy_v4.146.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.145…v4.10 MATCH
```
