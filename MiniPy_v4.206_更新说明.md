# MiniPy v4.206 更新说明

**构建**：`MiniPy_v4.206.sb3`（2026-10-30，35,313 块，check41 errors=0）
**依据**：《已知问题清单_v4.205.md》（v4.205 实测：581 套件 28 败 / 补充 82 例 8 败 /
`_cov205` 77 例 8 败，真实失败合计 ≈ 44）。

## 一、结果总览

| 项目 | v4.205 | **v4.206** |
|---|---|---|
| 581 全套 | 28 失败 | **20 失败（修复 8、回归 0）** |
| 补充 82 例 | 8 失败 | **5 失败（修复 3、回归 0）** |
| `_cov205`（77 例） | 8 失败 | **8 失败（无回归）** |
| 真实失败合计 | ≈44 | **≈33** |
| check41 | 35,222 块 errors 0 | **35,313 块 errors 0** |
| 结构/逐例对照 | — | **BROKE=0，new-only-fail=0** |

全绿 11 例：`float literal trailing zeros`、`float printing trailing zeros from
literal`、`float trailing zeros`、`float trailing zero print`、`builtin range forms`、
`sep empty with end empty`、`pow one arg`、`pow single arg`、`assert with message`
（后 3 例为用例标记修正）；另有 `operator overloading` 的 `__sub__`/`__mul__`
子形态与构造实参星号扫描两处机制修复（见下）。

## 二、修掉的问题（6 个补丁 + 1 项用例修正）

| # | 问题 | 根因 | 修法（补丁） |
|---|---|---|---|
| 1 | `float` 字面量尾零按源文本显示：`print(3.50)` → `3.50` | 分词器把数字原文原样存进 N 记号，显示层直接输出 | **P526** tokenize 收尾对每个 `Kind=='N'` 且含 `.` 的记号剥小数尾零（`3.50→3.5`、`12.00→12.0`；次末位是 `.` 时停）。内含 ev/evtype 保存恢复，防止 tokenize 内的 `substr` 污染调用方状态 | 
| 2 | `print('x','y',sep='',end='')` 完全无输出 | P7 的 emit 在 `end=''` 时把文本攒进 `pmbuf`，等下一次带换行的 print 才落盘；程序结束无兜底 | **P527** 两处 `set running=0`（正常结束/错误路径）之前插"pmbuf 非空 → `log(pmbuf+LF)` → 清空" | 
| 3 | `range(3) == r3` / `range(3) == range(3)` → `SyntaxError: parentheses` | P143 的 range 快路径只判 `Tok[lo]=='range'` 就把 `[lo+2, hi-1]` 当参数区；左操作数后还跟着 `== …` 时参数区被撑坏 | **P528** 守卫升级为"整段括号"：`Tok[lo+1]=='('` 且从 `lo+1` 起的深度**到 `hi` 才归零**（体首做深度扫描，结果存 `p28w`） | 
| 4 | `v2 - v1` / `v1 * 3` 报 `unsupported operand`（B6 残留） | P427 只给 `+` 装了 `__add__` 分派；`-` 走通用站点、`*` 走自己的站点，都没有分派 | **P522** 两处按 P427 模式装门：`lefttype=='O'` 且 `FnName` 含 `<类>.__sub__`/`.__mul__` → `callmeth` 后 `stop this script`。**加 stop 是关键**：`*` 站点在级联中段，后面还有第二个 binerr 会把结果再报一遍。同时给 P427 的 `+` 门补 `lefttype=='O'` 守卫（`1 + 'a'` 不再拿数值当实例号去查 `InstCls`） | 
| 5 | `Vec(self.x * k, …)` 的 `__init__` 拿不到属性（B6 真根因） | P517 的实参扫描把**任意**顶层 `*` 当成 `f(*args)` 的星号解包标记 → 多参预求值被跳过 → 退回"先重绑 self 再求参" | **P523** `*` 只有前一个 token 是 `(`/`,` 时才算星号解包（`f(*a, **kw)` 不受影响） | 
| 6 | 嵌套构造的实参表带着调用方残留 | `calluser` 入口 `UArgV` 可能是上一层留下的；P517 的 vmOn=2 元组拆参只追加不清空 | **P524** 拆参分支开头 `clearL(UArgV/UArgT)` | 
| 7 | `pow(x)` / `assert 1==2,'msg'` 等"用例不合法"项永久失败 | 这些用例没标 expectError，CPython 抛错而 mini 行为已一致 | **用例修正**：4 个 txt 用例改 `### !用例名`，82 套件 JSON 里 4 条加 `expectError: true`（其中 `next`/`type e` 仍失败，见 §四） | 

## 三、本轮的关键教训（已写入清单）

1. **expectError 标记格式是 `### !用例名`**，不是 `!### 用例名`。写错位会让该行被当成上一条
   用例的代码行——本轮一度出现 4 例"回归"、案例总数 581→577，全部由此而来。
2. **`JSON.stringify(块)` 只含引用 id**：匹配条件/子树必须把 `reach()` 的每个块分别
   stringify，或直接看**被引用块**的 opcode（P523/P528 两次踩坑）。
3. **补丁执行期 `parent` 指针不可靠**（只有 tail 的 `relinkParents` 才重建）：定位宿主
   IF/分支首句一律按 SUBSTACK 链行走（P522/P525/P530 三次踩坑）。
4. **IEEE 缩放会再舍入**：`2.675*100 === 267.5`（真值 267.4999…982 被乘法舍入抬到
   恰好平局点）——"乘 10^n 再四舍五入"救不了这类值，必须精确十进制展开。
5. **补丁新引入的全局变量不在 fpush 保存集**（保存集在 P14 构建期固定）：`p31nid`
   这类新全局跨帧不会被还原，嵌套调用互相覆盖。
6. **`chain()` 只收数组**；`REPEATU(cond)` 是"直到 cond 为真"（循环条件要写停止条件）；
   探针日志用专用列表 + `addTo`（`log %s` 按 LF 攒行，调试输出会被吞）。

## 四、已定位、本轮未修（清单里带完整证据）

| 问题 | 状态 | 定位结论 |
|---|---|---|
| 嵌套构造身份（`operator overloading vector`） | 深挖后回退 | 方法帧内构造：`CTORIID` 已分配、`__init__` 体却完全不执行（无 IAttr 写入），`vmOn==2` 的绑定/体执行在这一路径失效；顶层同形构造正常。最终 `IAttrVal=[9,12,4,6]`——v1/v2 的行被后续结果覆盖 |
| B7 `class variable counter` | 回退 | 类属性增强赋值的**写**路径 `set iid = Tok[1]` 把类名写进全局 `iid`。P529（构造器收尾改用开局保存的 `p31nid`）能修此例，但**搞坏 cov6 的 `V(1)+V(2)`**——因为 `p31nid` 不在 fpush 保存集。两者需一并解决（把新变量登记进保存集） |
| `round(x, n)` 精度 | 回退 | 见 §三.4；正解需双精度精确十进制展开 |
| `float('-0.0')` | 回退 | 应在 `mkfloat` **之后**置 `ev='-0.0'`（mkfloat 会把 -0 规范化掉）；callfn/callfnW 两份克隆里 float 分支形态不一，插入点未唯一定位 |
| 链式调用（`decorator manual wrap` / `dispatch table with lambdas`） | 只做了隔离 | `f = ops['add']; f(6,3)` ✅、`(lambda x: x*2)(5)` ✅；`ops['add'](6,3)` ✗ `'object' object is not callable`、`compose(dbl,inc)(5)` ✗ `SyntaxError: parentheses` ⇒ 集中在 P520 的"任意表达式后跟调用"回退（配对扫描 / `evtype=='F'` 判定 / lastFail 插入点） |
| 帧语义（`quicksort` / `gcd` / `recursive flatten`） | 未动 | 递归帧里 `left`/`a` 已赋值仍抛 UnboundLocal——怀疑 v4.203 的"局部标记"是全局的、跨帧残留 |
| `next(list)` 应 TypeError | 未动 | `next` 分支不是 `Tok[lo]=='next'` 的显式 IF，需探针定位 |
| RLE 串行污染 | 未动 | 循环/else 状态机的跨用例残留 |

## 五、验证与复现

```bash
cd D:/编程/scratch/ai/minipython
node _work/v41/assemble.cjs && node _work/v41/build41.js      # -> MiniPy_v4.206.sb3
node _work/v41/check41.cjs MiniPy_v4.206.sb3                  # 35,313 块 errors=0

# 581 全套
node _work/v41/runall.mjs MiniPy_v4.206.sb3 _work/v41/_res206h \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt
# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.206.sb3 _work/v41/_gap131.json \
  _work/v41/_gap131_206b.out.json g206b
# 多维度 77 例
node _work/v41/runall.mjs MiniPy_v4.206.sb3 _work/v41/_res206g \
  _work/v41/_cov205{a,b,c,d,e}.txt
# 逐例对照
node _work/v41/cmp131.cjs _work/v41/_res206h _work/v41/_res205fin
node _work/v41/gdiff.cjs _work/v41/_gap131_206b.out.json _work/v41/_gap131_205.out.json
```

**补丁清单**：p522（`__sub__`/`__mul__` 分派 + P427 O 守卫 + stop）、p523（构造实参星号
扫描）、p524（vmOn=2 拆参前清 UArgV）、p526（N 记号尾零 + ev 保护）、p527（程序结束刷
行缓冲）、p528（range 快路径整段括号守卫）。
**停放实验**：`_parked_p525_round.txt`（rounddigits）、`_parked_p529_ctor_nid.txt`
（构造器收尾 p31nid）、`_parked_p530_negzero.txt`（负零）——根因与回退原因见上表。

## 六、下一步建议（按性价比）

1. **fpush 保存集**：把补丁新全局（`p31nid` 等）登记进帧保存集，或用"已有被保存的临时量"
   ——这是同时修 B7 与 nested-ctor 身份的前提；
2. **`vmOn==2` 在方法帧内的绑定失效**（附 dbg 探针脚本 `_dbg522.js` 可直接复用）；
3. **P520 链式调用**：在 lastFail 前打点，定位配对扫描/evtype 判定；
4. **帧语义**：先 dump UnboundLocal 标记的生命周期；
5. `next` 类型守卫、`float('-0.0')`、round 精确十进制、RLE 串行污染。
