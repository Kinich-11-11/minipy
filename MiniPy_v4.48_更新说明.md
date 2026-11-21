# MiniPy v4.48 更新说明

本轮把上一轮**做了又撤回**的 `d.pop(k)` 重写修好并出货，同时揪出并修掉了它的**根因**：
**同一个实参 reporter 块被多个输入槽共用**时会读到过期的值（P120，项目全局只涉及 3 个块、补 15 个克隆）。
清单第 3 节第 1、8 条就此清掉。缺口套件仍是 **61/63**（套件里只剩 E50 与 G5），
23 套既有回归**逐字节零退化**。

产物 `MiniPy_v4.48.sb3`：Interpreter 14,349 块，合计 **15,778**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P117** | 8. `d.pop(k)`（v4.47 撤回的那个） | 原来的 pop 借用了 `get` 的查找结果（记录下标）再去"按分隔符位置打补丁"，四个毛病全在这一句上。重写版**自己**用 `listitem` 逐条解码：找到键记录 → 记住紧随其后的值记录 → 把**其余所有记录**重新 `lesc` 拼回 → `assign` 写回 → 把值作为返回值。缺键时按子句形状判断 `meth == 'pop'` 并抛 `KeyError: 'k'`（`get` 仍然返回 `None`/默认值） |
| **P120** | —（**根因**） | 一个 Scratch 实参 reporter 的值是按**当前栈帧**解析的，而 P91 的查找里 `listlen(rec)`、`listitem(rec, dmi)`、`listitem(rec, dmf+1)` **共用同一个** `argument_reporter_string_number "rec"` 块。用记录器量出来的现象：字典 pop 之后，同一个 reporter 在同一个调用里先给出**新**字典（入口处记的），紧接着 `listlen` 却按**旧**字典算数（返回 6 而不是 4）。修法是机械的：遍历全项目每一个输入槽，凡是一个块被用在两个以上槽里，就给多出来的槽各克隆一份。全项目只有 **3 个**这样的实参 reporter，共补 **15 个克隆**（P95/P102/P115 之前踩的是同一类问题，这次做了通用处理） |

## 2. 定位过程（值得记下来）

v4.47 撤下 P117 时只知道"pop 之后 `get` 读到旧字典"，本轮用**同一个 VM 连跑多程序 + 变量写入监视**
（`_work/v41/dbgmulti.mjs`）把它逼了出来：

1. 在 `dictmeth` 入口挂记录器 → 证明 `get` 收到的 `rec` **是对的**（新字典，4 条记录）；
2. 在查找循环前再挂一个 → `dmn`（记录数）却是 **6**；
3. 在 `listlen` 调用**之后**挂一个 → `ev = 6`，而紧挨着调用**之前**用另一个 reporter 读同一个名字
   得到的是 4 条记录的那份；
4. 把 `listlen` 的实参换成**新克隆的**同名额 reporter → `ev = 4` ✓（但查找仍然失败，因为
   `listitem` 的实参还是那个共用块）；
5. 于是写了 P120 做全局去重 → `t115g`/`t116a`/`t116b` 全绿。

顺带否掉了上一轮的猜测（"P20 没把 `ev` 发布到 `xa`/`xb`"）：实际 dump 表明 `xa = ev`、`xb = evtype`
就在接收者求值之后（`after[2]`/`after[3]`），所以那条 P119 没有出货。

## 3. 实测

| 套件 | v4.47 | **v4.48** |
|---|---|---|
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6；pop 不在 63 条里） |
| `t115c.json`（33 条探针） | 17 | **24**（`d.pop` 的 D1–D6、D13、D14 全绿） |
| `t115g.json`（连续 pop） | 1/3 | **3/3** |
| `t116a.json`（pop 后 get） | 4/5 | **5/5** |
| `t116b.json`（pop 后 print/len/get/下标） | 1/4 | **4/4** |
| `t115b` / `t107` / `t108` / `t111` / `t113` / `t114` | 7/7 · 8/12 · 14/14 · 14/15 · 14/14 · 12/12 | **同上（无退化）** |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 15,777 块 errors=0 | **15,778 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.47 共 38 版全 MATCH | **v4.10…v4.48 共 39 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
d = {'a': 1, 'b': 2}
d.pop('a')            v4.46: {}                => v4.48: {'b': 2}
d.pop('b')            v4.46: 原样不动           => v4.48: {'a': 1}
d = {'a': 7}
d.pop('a')            v4.46: 1（记录下标）      => v4.48: 7
d = {'a': 1}
d.pop('z')            v4.46: 'a'（不报错）      => v4.48: KeyError: 'z'
# 连续用也不再串台
d = {'a': 1, 'b': 2, 'c': 3}; d.pop('a'); d.pop('c'); print(d)   => {'b': 2}
d = {'a': 1, 'b': 2, 'c': 3}; d.pop('a'); print(d.get('c'))     => 3
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.48.sb3
node _work/v41/run.mjs MiniPy_v4.48.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps448_out.json
node _work/v41/run.mjs MiniPy_v4.48.sb3 _work/cmp47/t115g.json
node _work/v41/run.mjs MiniPy_v4.48.sb3 _work/cmp47/t116a.json
node _work/v41/run.mjs MiniPy_v4.48.sb3 _work/cmp47/t115c.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.48.sb3 -out _work/v41/battery_v448.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.48.sb3 -tag v448f
node _work/v41/check41.cjs MiniPy_v4.48.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.47 还原： $env:V41_SKIP='P117,P120'; $env:V41_OUT='…/MiniPy_v4.47.sb3'; node _work/v41/build41.js
```

## 6. 下一轮（v4.49）候选，按清单顺序

1. **`try` 里 `return` / `break` 也跑 `finally`**（第 2 条；`t115c` 的 R1/R2 是现成用例）
2. **浮点 repr**（第 7 条：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号、大浮点科学计数）
3. **双 `for` 推导式**（第 4 条）
4. **集合方法**：`add`/`remove`/`discard` / `|`/`&`/`-`（第 3 条）
5. `for a, b in <生成器>`：yield 出来的元组还不能解包（`t115c` 的 Y3）
6. `super()` 与类属性继承
7. 集合元素顺序（不保证项，可不修）
