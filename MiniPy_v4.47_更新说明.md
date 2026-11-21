# MiniPy v4.47 更新说明

本轮清单第 3 节里挑了三件小而独立的：**`'a b'.split()` 按空白切**（第 6 条）、
**`yield a, b` 产出元组**（第 5 条）、**"方法不存在"的报错文案对齐 CPython**（第 8 条的一半）。
缺口套件仍是 **61/63**（套件里只剩 E50 与 G5），23 套既有回归**逐字节零退化**。

第 8 条的另一半 **`d.pop(k)` 重写**本轮**做了但没有出货**：新版 pop 单次调用全对，
但会让紧随其后的 `d.get(k)` 读到过期接收者（详见 §5，含复现文件）。为了不引入回归，
补丁已从链上撤下，留待下一轮专门处理。

产物 `MiniPy_v4.47.sb3`：Interpreter 14,348 块，合计 **15,777**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P115** | 6. `'hello'.split()` 无参按空白切 | 字符串方法分派器把第一个实参默认成空串，而 `ssplit` 的"空分隔符"分支被写成了**按字符切**——于是 `s.split()` 和 `s.split('')` 是同一件事，后者还不报错。CPython 里两者不同：**无参 = 按空白连续段切并丢掉空段**，显式空分隔符 = `ValueError`。修法：分派器多记一个"这次到底给没给实参"的标志 `smarg`，然后二选一——`smarg==0` 走新的 `ssplitw`（扫连续非空白段），`smarg==1` 且分隔符为空则报 `ValueError: empty separator`。空白集是空格、`\t`、`\n`、`\r` |
| **P116** | 5. `yield i, i + 1` | P83 早就教会 `eval` "裸逗号序列是元组"，但 yield 语句**不走那条路**：它把 `i , i + 1` 整个区间当**一个**表达式求值，于是死在 `TypeError: use str(number)`。照 P83 的做法在 yield 处补一刀：先 `hascomma` 探一下顶层逗号，有就 `tuplelit` 建元组，没有才走原来的 `eval`。锚点必须**限定在 yield 分支的子栈里**——`reach()` 会顺着 `next` 把 `execute` 后面所有语句都圈进来（第一版因此匹配到两个"count>1"守卫） |
| **P118** | 8（一半）"方法不存在"的文案 | MiniPy 说 `AttributeError: list has no method nope`，CPython 说 `AttributeError: 'list' object has no attribute 'nope'`。三个站点（str / list / dict）都是"文本字面量 + 方法名"的拼接，把两边的字面量改成 CPython 的形状，中间那个方法名变量原样复用 |

## 2. 本轮踩实的四条（都写进 README 了）

* **`reach()` 从链中间的语句出发会漏到整段程序**：`inDef('execute')` 那种"从过程定义出发"是安全的，
  但 `reach(某个 if 块)` 会顺着 `next` 一直走到本过程结尾。P116 第一版按 `prevhead=='count'` 找守卫，
  一下子匹配到两个（第二个是后面某条语句的 `count > 1`）。**要限定子栈就显式用 `SUBSTACK[1]` 当根。**
* **`...pushV(x)` 会把块 id 字符串摊成字符**：`pushV` 返回的是**一个**块 id（字符串），
  `[...pushV('spwi')]` 展开成 id 的每个字符，`chain()` 拿到一堆单字符当块 id，
  报的是 `Cannot set properties of undefined (setting 'next')`。要么 `pushV(x)` 不加展开，
  要么让它返回数组。
* **循环里的"游标"不要顺手存/取**：`ssplitw` 第一版把游标 `spwi` 压进 VStack、扫完再取回来，
  结果每轮都回到原处 → 死循环（run.mjs 里表现为 20 秒超时、输出为空）。这段里没有会重入 `eval`
  的调用，根本不需要保护。
* **`tokenize` 在 `error` 非空时立刻收手**（v4.46 的教训）本轮再次相关：凡是"读另一行源码"的补丁，
  都要先确认 `error == ''`。

## 3. 实测

| 套件 | v4.46 | **v4.47** |
|---|---|---|
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6，本轮不加分） |
| `t115c.json`（本轮 33 条探针） | — | 17 绿；本轮的 3 项全绿（split 6 条、yield 5 条、文案 3 条） |
| `t115b.json`（split 专项 7 条） | — | **7/7** |
| `t111.json` / `t114.json`（集合 15+12 条） | 14/15 · 12/12 | **同上（无退化）** |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 15,699 块 errors=0 | **15,777 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.46 共 37 版全 MATCH | **v4.10…v4.47 共 38 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
# split（v4.46 -> v4.47）
'hello world'.split()   -> ['h','e','l','l','o',' ','w','o','r','l','d']   => ['hello', 'world']
'  a   b  '.split()     -> [' ',' ','a', ...]                              => ['a', 'b']
'ab'.split('')          -> ['a', 'b']                                      => ValueError: empty separator

# yield（v4.46 -> v4.47）
def g():
    for i in range(3):
        yield i, i + 1
list(g())               -> TypeError: use str(number)                      => [(0, 1), (1, 2), (2, 3)]

# 报错文案（v4.46 -> v4.47）
[1].nope()              -> AttributeError: list has no method nope
                        => AttributeError: 'list' object has no attribute 'nope'
```

## 5. `d.pop(k)`：本轮做了、测了、**撤了**（附复现）

v4.46 的 `pop` 有四个毛病（都在本轮实测过）：

```
d = {'a': 1, 'b': 2}; d.pop('a')   -> {}            （把整个字典清空）
d = {'a': 1, 'b': 2}; d.pop('b')   -> 原样不动        （什么都没删）
d = {'a': 7};         d.pop('a')   -> 1             （返回的是记录下标，不是值 7）
d = {'a': 1};         d.pop('z')   -> 'a'           （缺键不报 KeyError，吐出上一次的 ev）
```

重写版（P117：用 `listitem` 逐条解码、保留除"键 + 紧随其后的值"之外的所有记录、重新 `lesc` 拼回、
再 `assign`）把上面四条**全部修对了**（`t115d3`/`t115d14`/`t116b` 单程序运行全绿）。但多程序/多语句
连用时暴露了新问题：

```
d = {'a': 1, 'b': 2, 'c': 3}
d.pop('a')          # 字典确实变成 {'b': 2, 'c': 3}，print/len/下标全都对
print(d.get('c'))   # 却查不到 —— get 的查找用的是"上一次调用留下的记录数"
```

用打点（`dbgmulti.mjs` 监视变量写入）量出来的现象是：`get` 那次 `keyLookup` 里
`listlen(rec)` 得到的是**旧字典**的记录数（6），而不是新字典的 4；同一时刻我用另一个
reporter 调 `listlen(rec)` 得到的是 4。也就是说 **`dictmeth` 这次拿到的接收者是过期的**。
顺着这条线查到 P20 改写的接收者求值：

```js
if mcpre == 1 then xa = mcval; xb = mctype else eval(lo, lo)     // 没有把 ev 抄进 xa
```

——普通方法调用的接收者**没有**被发布到 `xa`/`xb`，消费者（list/str/dict 方法、属性访问）
读的都是**上一次**留下的值。补了 P119 把 `xa = ev` 补上之后，上面这个用例**仍然失败**，
说明还有第二个同源问题（很可能是链式调用 `mcpre`/`mcval` 的清理），本轮时间不够，
**两个补丁都已从链上撤下**，v4.47 的 `pop` 行为与 v4.46 完全相同（不引入新回归）。

下一轮从这里接手，现成的复现文件：

```
_work/cmp47/t115g.json   三个程序：两种 pop 连用
_work/cmp47/t116a.json   M1 pop 之后 get（v4.46 绿、重写版红）
_work/cmp47/t116b.json   pop 之后 print / len / get（同上）
_work/v41/dbgmulti.mjs   同一个 VM 连跑多个程序 + 变量写入监视（定位这次问题的关键工具）
```

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.47.sb3
node _work/v41/run.mjs MiniPy_v4.47.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps447_out.json
node _work/v41/run.mjs MiniPy_v4.47.sb3 _work/cmp47/t115b.json
node _work/v41/run.mjs MiniPy_v4.47.sb3 _work/cmp47/t115c.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.47.sb3 -out _work/v41/battery_v447.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.47.sb3 -tag v447f
node _work/v41/check41.cjs MiniPy_v4.47.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.46 还原： $env:V41_SKIP='P115,P116,P118'; $env:V41_OUT='…/MiniPy_v4.46.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.48）候选，按清单顺序

1. **`d.pop(k)` + `methodcall` 接收者**（第 8 条，复现文件已备好；先查 `mcpre`/`mcval` 的清理）
2. **`try` 里 `return` / `break` 也要跑 `finally`**（第 1 条；`t115c` 的 R1/R2 是现成用例）
3. **浮点 repr**（第 7 条：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号）
4. **双 `for` 推导式**（第 4 条）
5. **集合方法**：`add`/`remove`/`discard` / `|`/`&`/`-`（第 2 条）
6. `yield` 出来的元组用于 `for a, b in g()`（`t115c` 的 Y3，属第 5 条的延伸）
7. `super()` 与类属性继承
