# MiniPy v4.75 更新说明

本轮让 **`dict` 支持关键字实参**：`dict(a=1, b=2)`、`dict({'x': 1}, y=2)`。补丁 **P148**。

产物 `MiniPy_v4.75.sb3`：Interpreter 19,639 块，合计 **21,068**，`check41` errors=0；
66 个历史版本全部可复现（v4.10…v4.75 MATCH）。

## 1. 问题

| 代码 | v4.74 | **v4.75**（= CPython） |
|---|---|---|
| `dict(a=1)` | `SyntaxError: expression`（整段 `a=1` 被交给 eval） | `{'a': 1}` |
| `dict(a=1, b=2)` | `NameError: name 'dict' is not defined` | `{'a': 1, 'b': 2}` |
| `dict(a=n * 2, b=[1, 2])` | 同上 | 值可以是任意表达式 |
| `dict({'a': 1}, b=2)` | 同上 | `{'a': 1, 'b': 2}` |
| `dict(1, a=2)` | 同上 | `TypeError: 'int' object is not iterable` |
| `dict(1, 2)` | 静默按位置路径报 `object is not iterable` | `TypeError: dict expected at most 1 argument, got 2` |
| `dict(a=1, a=2)` | 同上 | `SyntaxError: keyword argument repeated: a`（**注意**：CPython 在编译期报，MiniPy 在运行期报，所以 `try/except` 能接住） |
| `dict([(1, 2)])` / `dict()` / `dict(d)` | 正常 | **不变** |

## 2. 做法：两个挂点

1. **eval 的"最后兜底"**（P141 留下的那个 `x8nc` 分支）：`dict` 且**实参里有顶层逗号**时改走 `callfn`
   而不是报 NameError。只放行 `dict`——把所有未知名都送过去会把 `len(1, 2)` 从"报错"变成"算错"。
2. **`callfn` 的实参求值之前**（不是 `dict` 分支里——那时 `eval(lo, hi)` 已经把 `a=1` 当表达式求过了）：
   新增一段只对 `fn == 'dict'` 生效的处理：先扫一遍实参区间（顶层逗号数 `p18c`、是否有顶层 `=` `p18e`），
   有 `=` 就把区间按顶层逗号切成"片段"，每段必须是 `名字 = 值`（名字是字符串键、值走 `eval`）；重复名字报
   `SyntaxError: keyword argument repeated:`；不是 `名字 = 值` 的片段当作**映射实参**（不是字典就报
   `TypeError: '<类型>' object is not iterable`）。没有 `=` 但有多个片段时报
   `TypeError: dict expected at most 1 argument, got N`。

**三个坑**（都花了不少时间）：

1. **P142 的"空实参守卫"当初插错了位置**：它按"`lo > hi` 的 if/else"找锚点，实际命中的是类构造分支里的
   `if not(lo > hi)`，所以那半截守卫一直只对"类调用"生效（v4.69 的零参测试全走 eval 侧那一半，所以没暴露）。
   这一轮我改用"`if (fn in ClsName)` 分支之外的 `eval(lo, hi)`"来定位主实参求值点。
2. **片段起点差一**：切完片段后下一段起点应是"逗号位置 + 1"（照 `calluser` 的写法），我一开始直接用了逗号
   位置，于是第二段从 `,` 开始 ⇒ `dict(a=1, b=2)` 报 `SyntaxError`。
3. **`pctfmt` 的老毛病又见一次**：只看消息文本区分不了两个同名报错点——这里则是"多个位置参数"的判据我写成
   `p18c > 1`（应为 `> 0`，一个逗号就是两个参数）。

映射实参 + 关键字混合时，MiniPy 把映射的记录**追加在关键字之后**：值/键都正确、关键字优先，但打印顺序与
CPython（映射在前）不同——已记档。

## 3. 实测

| 套件 | v4.74 | **v4.75** |
|---|---|---|
| `d225.json`（本轮新写 10 条：单/多关键字、取值、值表达式、重复关键字、位置+关键字、多个位置参数、位置形式回归、与其它内建混用、关键字后遍历、映射+关键字） | — | **10/10** |
| `d224` 16 · `d223` 17 · `d221` 31 · `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `t107` 12 · `t133` 60 · `func` 31 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `demos` 12 · `tuple` 20 · `d204` 14 | — | **全绿** |
| 94 套快照 | — | **92 套逐例相同**，2 处差异全是既知噪声：`t111h` 是 **CPython 参考侧**的集合哈希序 + featprobe3 内存地址——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.74 相同） |
| `check41.cjs` | 20,632 块 errors=0 | **21,068 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.74 共 65 版全 MATCH | **v4.10…v4.75 共 66 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 8 个变量（`p18c` `p18e` `p18i` `p18d` `p18lo` `p18hi` `p18k` `p18h`）、2 个列表（`DKwC` `DKwN`）、
1 个过程（`kwhas`）。

## 4. 前后对比

```
print(dict(a=1), dict(a=1, b=2))
        v4.74: SyntaxError / NameError   => {'a': 1} {'a': 1, 'b': 2}

n = 3
print(dict(x=n * 2, y=[1, 2]))           v4.74: NameError  => {'x': 6, 'y': [1, 2]}

try:    dict(1, 2)
except TypeError as e: print(e)          => dict expected at most 1 argument, got 2
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'{a}'.format(a=3)`（`str.format` 的关键字形式） | 仍报 `SyntaxError: expression` |
| `'%g'`/`'%G'` | 仍按 `%s` 打印 |
| `list(d)`（用字典的键建表；`for k in d` 一直可用） | 报 `TypeError: 'dict' object is not iterable` |
| `dict(映射, 关键字)` 的**记录顺序** | 关键字在前（值与键都对，仅打印顺序不同） |
| `dict(a=1, a=2)` 的报错时机 | MiniPy 在运行期（可被 `except` 接住），CPython 在编译期 |
| `dict(**d)` 解包合并 | 不支持 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.75.sb3
node _work/v41/run.mjs MiniPy_v4.75.sb3 _work/cmp47/d225.json  # dict 关键字 10 条
node _work/v41/run.mjs MiniPy_v4.75.sb3 _work/cmp47/d224.json  # 映射形式等 16 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.75.sb3 -tag v475 -ref v474
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v475 -ref v474
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.75.sb3 -tag v475
node _work/v41/check41.cjs MiniPy_v4.75.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.74 还原： $env:V41_SKIP='P148'; $env:V41_OUT='…/MiniPy_v4.74.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.76）候选，按清单顺序

1. `'{a}'.format(a=3)`（`str.format` 的关键字形式，可复用本轮的片段切分）
2. `list(d)` 用字典的键建表（`dictkeys` 已有，接进 `list` 分支即可）
3. `%g`/`%G`
4. `dict(**d)` 解包合并
