# MiniPy v4.76 更新说明

本轮让**字典能被当序列遍历**（`list(d)`、`tuple(d)`、`set(d)`、`sorted(d)` 等）。补丁 **P149**。
（原计划同轮做的 `'{a}'.format(a=1)` 关键字形式在做完接线后**打坏了原本正常的位置形式**，已撤回、
留待下一轮——见 §5。）

产物 `MiniPy_v4.76.sb3`：Interpreter 19,711 块，合计 **21,140**，`check41` errors=0；
67 个历史版本全部可复现（v4.10…v4.76 MATCH）。

## 1. 问题：字典不能当可迭代对象

| 代码 | v4.75 | **v4.76**（= CPython） |
|---|---|---|
| `list({'a': 1, 'b': 2})` | `TypeError: 'dict' object is not iterable` | `['a', 'b']` |
| `tuple(d)` | 同上 | `('a', 'b')` |
| `set(d)` | 同上 | 键的集合 |
| `sorted(d)` | `TypeError: sorted() requires a list` | `['a', 'b']` |
| `enumerate(d)` / `zip(d, x)` / `min(d)` / `max(d)` / `any(d)` / `all(d)` | 同上 | 键 |
| `len(d)` / `for k in d` / `d.keys()` / `str(d)` / `print(d)` | 正常 | **不变** |
| `list([1, 2])` / `list('ab')` / `list((1, 2))` / `list({1, 2})` | 正常 | **不变** |

`callfn` 的各个分支（以及 eval 里 `sorted` 自己那条分支）只认 `L/T/G/E`，`D` 掉到末尾兜底，于是报
`TypeError: 'dict' object is not iterable`（`list`/`tuple`/`set`，措辞来自 `tname`）或
`TypeError: sorted() requires a list`。

## 2. 做法

`dictkeys`（P91）本来就把字典转成"键的列表编码"，所以只要在**两个**地方放一次白名单转换：

* `callfn` 的分支链**之前**（实参刚求完、`ev`/`evtype` 里就是实参值）：`evtype == 'D'` 且函数名属于
  `list/tuple/set/enumerate/zip/sorted/min/max/any/all` ⇒ 调 `dictkeys`，此后各分支看到的就是列表；
* `eval` 的 `sorted` 分支（它在 callfn 之前自己跑，够不到上面那次转换）——同一段判断，两个站点都插。

`len`/`str`/`print`/字典方法都没碰，所以它们的 D 语义不变。

**坑（老熟人）**：白名单那条 `OR` 链最初把**同一个** `argOf('fn')` 报告块塞进了 11 个比较里——Scratch
的一个报告块只能挂在一个输入上，第二次引用会把它**搬走**，于是整条链形同虚设（日志里 `fn=list evt=D`
明明都对，转换却不发生）。改成每次比较现造一个报告块（`isIterator(() => argOf('fn'))`）即可。

## 3. 实测

| 套件 | v4.75 | **v4.76** |
|---|---|---|
| `d226.json`（本轮新写 8 条：`list`/`tuple`/`set`/`sorted` 吃字典、`len`+遍历回归、四种列表源回归、`format` 位置形式回归） | — | **8/8** |
| `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 · `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `t107` 12 · `t133` 60 · `func` 31 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `demos` 12 · `tuple` 20 · `d204` 14 · `d202` 24 | — | **全绿** |
| 94 套快照 | — | **92 套逐例相同**，2 处差异全是既知噪声（`t113` 的 `for x in {'a','b'}` 是 CPython 集合哈希序、`featprobe3` 是内存地址）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,068 块 errors=0 | **21,140 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.75 共 66 版全 MATCH | **v4.10…v4.76 共 67 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

没有新增变量 / 列表 / 自定义积木（关键字格式化那半截本来建的 `sfname` `sfnidx` `sfnf` `FmtN`
随撤回一并删掉了，所以 v4.76 的变量表与 v4.75 完全一致）。

## 4. 前后对比

```
d = {'a': 1, 'b': 2}
print(list(d), tuple(d), sorted(d))
        v4.75: TypeError ×3        => ['a', 'b'] ('a', 'b') ['a', 'b']

print(len(d), d['a'])              不变：2 1
for k in d: print(k)               不变
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'{a}'.format(a=1)`（`str.format` 的关键字形式） | 仍报 `SyntaxError: expression`；本轮已写好接线（`FmtN` 记录关键字名、`strfmt` 里查名），但**打坏了位置形式**（`'{} {}'.format(1, 2)` 输出为空），已整体撤回，下一轮重做 |
| `sum(d)` | 报 `TypeError: sum() requires a list`（CPython 是 `unsupported operand …`） |
| `%g`/`%G` | 仍按 `%s` 打印：`'%g' % 100000000` → `100000000`（CPython `1e+08`）、`'%g' % 0.00001` → `0.00001`（CPython `1e-05`）、`'%G' % 100000000` → `100000000`（CPython `1E+08`） |
| `dict(**d)` 解包合并 | 不支持：`dict(**d)` 报 `SyntaxError: missing expression`（CPython 得到 `{'a': 1}`） |
| `list(d)` 的结果顺序 | 与字典的插入序一致（字典本身按插入序存 ✓） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.76.sb3
node _work/v41/run.mjs MiniPy_v4.76.sb3 _work/cmp47/d226.json  # 字典遍历 8 条
node _work/v41/run.mjs MiniPy_v4.76.sb3 _work/cmp47/d225.json  # dict 关键字 10 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.76.sb3 -tag v476 -ref v475
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v476 -ref v475
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.76.sb3 -tag v476
node _work/v41/check41.cjs MiniPy_v4.76.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.75 还原： $env:V41_SKIP='P149'; $env:V41_OUT='…/MiniPy_v4.75.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.77）候选，按清单顺序

1. `'{a}'.format(a=1)`（重做；这轮已经摸清 `format` 的实参收集在 `methodcall` 里、占位符解析在
   `strfmt` 里，`FmtN` 的接线点也已定位——**做法**：不要动原有的那条 `eval`，改为在它**之前**插一段
   "若是 `名字 = 值` 就记名 + 求值，并让原 eval 跳过"的写法，避免破坏位置形式）
2. `%g`/`%G`
3. `dict(**d)` 解包合并
4. `sum(d)` 的报错文案
