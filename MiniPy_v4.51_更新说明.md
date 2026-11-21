# MiniPy v4.51 更新说明

本轮清掉清单第 3 条 **集合方法**（`add`/`remove`/`discard`/`clear`/`update`/`union`/`intersection`/
`difference`/`symmetric_difference`/`copy`/`isdisjoint`）与 **集合运算符** `|` `&` `-` `^`（含集合比较
`==`/`!=`/`<`/`<=`/`>`/`>=`），一并补上 `set(x)` 内建与集合的别名语义（`t = s; s.add(1)` 通过 `t` 也看得见）。
一个补丁 **P124**，探针套件 **60/60**（`t126`/`t129`/`t130`/`t131`/`t132`，合并进 `t133.json`；
另 `t134.json` 9 条里 7 条通过，2 条是已记录缺口），缺口套件与全部既有回归**零退化**。

产物 `MiniPy_v4.51.sb3`：Interpreter 15,469 块，合计 **16,898**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P124a** 集合方法 | 3（方法部分） | 集合和列表是同一套编码（`lsep + 类型 + 转义文本` 平铺），所以在 `methodcall` 的类型守卫**前面**加一个入口：`xb == 'E'` → 新的 `setmeth`（与 P91 的 `dictmeth` 同形：`rec/nm/meth/lo/hi` 全用形参传，实参范围 `lo..hi` 由调用方算好）。`setmeth` 里 `add`/`discard`/`remove`/`clear`/`update` 走"重建整串 + `assign 名字 新串 E` 写回"（与列表原地方法同一条路，P54 的别名传播因此自动生效），`union`/`intersection`/`difference`/`symmetric_difference` 只算不改。新增成员判定 `lhas`（`listlen`/`listitem` + `compareText`），`|` 是两串相接后 `setnorm`，`&`/`-` 是 `setfilter` 过滤左串，`^` 是 `(a-b) \| (b-a)` |
| **P124b** 集合运算符 | 3（运算符部分） | 在 `rightside` 的数字分支前插入 `if 双方都是 E` 的处理；同时把**数字分支**（`- * / // %`）、**位运算分支**（`& \| ^`）与**三个浮点探针**（P74 的两个 + 数字分支自己的 `mkfloat`）的守卫都加上 `not(双方都是 E)`，否则 `a - b` 会先撞 "numeric operands"、`a \| b` 会先撞 "bitwise requires integers" |
| **P124c** 配套 | 3（配套） | `set(x)` 内建（插在 `list()` 分支前，`set('abc')` 按字符建集合）；`setfmt` 空集合印 `set()`（原来印 `{}`，那是字典字面量）；顺手补 `list.copy()`（原来报 `'list' object has no attribute 'copy'`）；把 P54 的别名登记与传播从 `L` 放宽到 `L/E` |
| **P124d** 集合比较 | 3（顺带） | 普通比较是逐字符比两串编码，于是 `{1, 2} == {2, 1}` 印 False。用一个交集就能定全部关系（`|a ∩ b| == |a|` 即 `a ⊆ b`），据此给出 `==`/`!=`/`<`/`<=`/`>`/`>=`。**守卫必须用 `evtsave`**（rightside 自己存的右操作数类型）而不是活的 `evtype`——本块算完会把 `evtype` 改成 `B`，守卫再看活变量就会把普通比较又放进来 |

## 2. 本轮踩实的五条（都写进 README 了）

* **处理完一个分支必须自己收尾**：`setmeth` 是一串 `if meth == ...`，最后一句是无条件的
  `fail "set has no method X"`。第一版每个分支里没写 `stop this script`，于是**分支跑完继续往下执行**，
  最后一定撞上那句兜底 fail——现象极具误导性：`x.add(2)` 报 "set has no method add"，
  但 `ARG:meth` 明明是 "add"（补丁逻辑全对，只是被兜底覆盖）。P91 的 `dictmeth` 每个分支末尾都有
  `STOPTHIS()`，照抄即可。
* **偏移只能用一次**：`methodcall` 把 `lo+4 / hi-1` 算好后传给 `dictmeth`/`setmeth`，接收方直接用；
  第一版在两边各算一次，`eval(lo+8, hi-2)` 得到空区间，报 `SyntaxError: missing expression`
  （这条信息的真实含义是"`eval` 收到的 token 区间是空的"）。
* **P93 的括号深度扫描加了 `{` 却漏了 `}`**：P20 的方法链切分器用它找"顶层 `)` 后面的 `.`"，
  于是 `s.union({3}).difference({1})` 里的 `{` 把深度加 1 却没人减回来，`)` 处深度不是 0，
  链就**没被切开**，整段被当成一次调用（参数范围里带着 `) . difference (`，报 `SyntaxError: parentheses`）。
  补法要小心：`}` 只能在**当前区间内**深度 > 0 时才算闭合——`methodcall2` 会把"接收者的最后一个 token"
  当作 lo 传进来，那里正好是一个字面量接收者的 `}`，无脑减一会让深度从 -1 起算、另一种链又坏掉。
* **`SyntaxError: parentheses` 的真实来源**是 `eval` 的括号深度扫描见到 `ed < 0`；
  `SyntaxError: missing expression` 是 `lo > hi`；`SyntaxError: attribute access` 是属性读的类型分支——
  这三条定位比报错文案本身有用得多。
* **"块数组"必须每次新建**（v4.50 的教训在这里又验证了一次）：探针里所有 `addTo/if` 都写成工厂函数或
  内联新建，没有复用同一批块。

## 3. 实测

| 套件 | v4.50 | **v4.51** |
|---|---|---|
| `t133.json`（集合方法与运算符 60 条） | 1/20（`t126` 基线） | **60/60** |
| `t134.json`（集合边界与比较 9 条） | — | **7/9**（余 `set()` 无参、`issubset` 两个已记录缺口） |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6；集合方法不在 63 条里） |
| `t111b` / `t111c` / `t111h` / `t113`（集合相关） | 8/10 · 6/8 · 0/9 · 14/14 | **逐条相同** |
| `t123`（finally 29 条） | 29/29 | **29/29** |
| 其余 19 套 `cmp47` + 28 套 `_work/v41`（含 `demos`/`scope`/`d1`/`pan`） | — | **与 v4.50 逐条相同**（`cmpout.cjs` 逐例对比 python 侧与解释器侧，diff=0） |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| 6 个 featprobe（259 条） | 242/259 | **242/259** |
| `check41.cjs` | 16,353 块 errors=0 | **16,898 块 errors=0**（Interpreter 15,469） |
| `rebuild-old.ps1` | v4.10…v4.50 共 41 版全 MATCH | **v4.10…v4.51 共 42 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
s = {1, 2}                 v4.50: AttributeError: only lists have methods
s.add(3)                   v4.51: 3 / [1, 2, 3]
print(len(s)) / print(sorted(s))

s = {1, 2, 3}; s.remove(2) v4.50: AttributeError     => v4.51: 2 / [1, 3]
s.discard(9)               v4.50: AttributeError     => v4.51: 静默（len 不变）
s.remove(9)                v4.50: AttributeError     => v4.51: KeyError: 9

a = {1,2,3}; b = {2,3,4}
print(sorted(a | b))       v4.50: TypeError: bitwise requires integers => [1,2,3,4]
print(sorted(a & b))       v4.50: TypeError: bitwise requires integers => [2, 3]
print(sorted(a - b))       v4.50: TypeError: numeric operands          => [1]
print(sorted(a ^ b))       v4.50: TypeError: bitwise requires integers => [1, 4]
print(sorted(a.union(b)))  v4.50: AttributeError                       => [1,2,3,4]
print(sorted(a.difference(b)))                                         => [1]

s = {1}; t = s; s.add(2)   v4.50: —（集合还不能 add）=> v4.51: len(t) == 2（同一对象）
print(set([3, 1, 3]))      v4.50: NameError: function set => v4.51: len == 2
s = {1, 2}; s.union({3}).difference({1})   两段链（v4.51 顺带修好 P93 漏算 `}` 的切分）
print({1, 2} == {2, 1})    v4.50: False（逐字符比编码）=> v4.51: True
print({1} <= {1, 2})       v4.50: TypeError: incompatible comparison => v4.51: True
print(set([]))             v4.50: set()  => v4.51: set()（空集合不再印成 `{}`）
print(x.copy())  （列表）   v4.50: AttributeError: 'list' object has no attribute 'copy' => v4.51: 副本
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.51.sb3
node _work/v41/run.mjs MiniPy_v4.51.sb3 _work/cmp47/t133.json  # 集合 60 条
node _work/v41/run.mjs MiniPy_v4.51.sb3 _work/cmp47/t134.json  # 集合边界/比较 9 条（7 绿）
node _work/v41/run.mjs MiniPy_v4.51.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps451_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.51.sb3 -out _work/v41/battery_v451.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.51.sb3 -tag v451
node _work/v41/check41.cjs MiniPy_v4.51.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.50 还原： $env:V41_SKIP='P124'; $env:V41_OUT='…/MiniPy_v4.50.sb3'; node _work/v41/build41.js
# 逐例对比两版（python 侧 + 解释器侧）： node _work/v41/cmpout.cjs <旧.json> <新.json>
```

## 6. 下一轮（v4.52）候选，按清单顺序

1. **双 `for` 推导式**（第 4 条；`t115c` 的 X1）
2. `for a, b in <生成器>`：yield 出来的元组还不能解包（Y3）
3. `super()` 与类属性继承；多重继承
4. 集合元素顺序（不保证项，可不修）
5. `sorted(x, key=lambda …)`（featprobe3 的既有缺口）

