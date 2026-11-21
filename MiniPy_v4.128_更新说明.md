# MiniPy v4.128 更新说明

本轮**补齐字符串方法的实参处理**：`replace(old, new, count)` 与空模式、`startswith` / `endswith` 的
`start`/`end` 区间、`None` 当作"没给"、以及非整数位置实参的拒绝（报错文案照 CPython 逐字抄）。
它是 v4.127（P200 给了派发器第三个实参槽位）的收尾：同一个新槽位还暴露出四处**静默给错答案**。
补丁 **P201**。

产物 `MiniPy_v4.128.sb3`：Interpreter 26,599 → **26,815** 块，全工程 **28,561**，`check41` errors=0。

## 1. 问题（v4.127 实测）

| 写法 | v4.127 | **v4.128** | CPython |
|---|---|---|---|
| `'abcabc'.replace('a', 'X', 1)` | `XbcXbc`（count 被丢掉） | **`Xbcabc`** | 同 |
| `'abcabc'.replace('a', 'X', 0)` | `XbcXbc` | **`abcabc`** | 同 |
| `'abc'.replace('', 'X')` | **`abc`** | **`XaXbXcX`** | 同 |
| `'abc'.replace('', 'X', 2)` | `abc` | **`XaXbc`** | 同 |
| `'abc'.replace('a')` | **`bc`**（少给实参不报错） | **`TypeError: replace() takes at least 2 positional arguments (1 given)`** | 同 |
| `'abc'.startswith('b', 1)` | **`False`** | **`True`** | 同 |
| `'abc'.endswith('c', -1)` | `False` | **`True`** | 同 |
| `'abc'.startswith('', 5)` | `True` | **`False`** | 同 |
| `'abcabc'.find('a', 1.5)` | **`3.5`** | `TypeError: slice indices must be integers or None or have an __index__ method` | 同 |
| `'abcabc'.find('a', None)` | `TypeError` | **`0`** | 同 |
| `'abcabc'.find('a', True)` | `TypeError` | **`3`** | 同 |
| `'abc'.find('b', 'x')` | `TypeError: 'int' object cannot be interpreted as an integer`（类型名还是错的） | `TypeError: slice indices must be integers or None or have an __index__ method` | 同 |

## 2. 做法

**① `replace(old, new, count)` —— 新过程 `srepn %s %s %s %s`**

* `srepn` 就是 `srep` 加一个计数器 `sqrep`：命中且**还没到上限**才替换（`cnt < 0` = 不限），
  空模式那半按下面的规则走。派发块插在 P18 那条普通 `srep` 分支**之后**（那条每次调用都会跑，
  写在前面会被它覆盖）、P200 三实参块之前。
* 少给实参不再静默：`replace` 且**没有顶层逗号**（0 个或 1 个实参）报 CPython 的
  `TypeError: replace() takes at least 2 positional arguments (N given)`。
* count 的类型照 CPython：只收整数与布尔，别的（含浮点，靠文本里的 `.` 认）报
  `TypeError: '<真实类型>' object cannot be interpreted as an integer`。

**② 空模式不是"原样返回" —— 改 `srep` 的 `smlen == 0` 那一臂**

CPython 在 `len(s) + 1` 个位置插替换串：`'abc'.replace('', 'X')` → **`XaXbXcX`**（**末尾也有一处**）、
`''.replace('', 'X')` → `'X'`；count 从**左**数着限（`'abc'.replace('', 'X', 2)` → `'XaXbc'`）。
原来那一臂是"`smacc = 接收者`"，于是空模式等于什么都没做。改成"逐个字符前插 + 末尾再插一次"，
`srepn` 的空模式分支同理（受 count 限制）。2 实参与 3 实参两条路因此给同一个答案。

**③ `startswith` / `endswith` 的区间 —— 新过程 `sprefix2 %s %s %s %s %s`**

派发原来只把**前缀**交给 `sprefix`，`start`/`end` 直接丢掉。现在先切出 `s[start:end]` 再交给 `sprefix`
（`sprefix` 一字未动）。区间规则是 CPython 的 `tailmatch`，**与 `find` 的规则不同**：
start/end 先按长度归一（负数加 `len`、下限 0），end 上限夹到 `len`，**start 不夹**；
然后 **`end < start` 直接答 `False`** —— 所以 `'abc'.startswith('', 5)` 是 `False` 而 `...('', 3)` 是 `True`。
（`find` 那边 `start > end` 也是 -1，但空 needle 的怪癖不同，两套判据没有合并。）

**④ 位置实参的类型与 `None` —— 一个块，紧跟在读出 `smmeth` 之后**

`find`/`rfind`/`index`/`rindex`/`count`/`startswith`/`endswith` 的**第二个/第三个实参**：

* `None` 当作"没给"（CPython 收）：`smt == "Z"` 就换成 `start = 0` / `end = 一个大哨兵`（后面按长度夹）；
* 整数与布尔放行；别的（浮点、字符串、列表……）报
  `TypeError: slice indices must be integers or None or have an __index__ method`。
  这条顺带修掉了 P177/P179/P200 那几句**类型名报错的**旧文案（`'abc'.find('b','x')` 以前说 `'int' object`）；
* 块只在这 7 个方法上生效（`replace` 的第二个实参是**替换串**、`split` 的是分隔符，都不碰），
  并且只在实参**确实给了**（`mcut > 0` / `mcut2 > 0`）时检查，所以 `find('a')` 那种单实参调用不受影响。
* 另外把 P177/P179 那两处"不是 `N` 就报错"放宽成"不是 `N` 也不是 `B`"：布尔是合法下标，
  `'abcabc'.find('a', True)` 应该是 `3`。

## 3. 实测（无头、真实 scratch-vm 5.300）

| 检查 | 结果 |
|---|---|
| `d280.json`（v4.127 的字符串接口套件，34 条） | **34/34（不变）** |
| `d281.json`（本轮新写：replace 家族 + 参数校验，30 条） | **30/30**（v4.127 上 **9/30**） |
| `d282.json`（本轮新写：位置实参取值与报错，12 条） | **12/12**（v4.127 上 **5/12**） |
| `d283.json`（本轮新写：startswith/endswith 区间，10 条） | **10/10**（v4.127 上 **1/10**） |
| 126 套快照逐例 diff（v4.127 vs v4.128） | **0 回归**；121 套逐例相同，5 套差异全是转正/文案（见下） |
| ↳ `d281` / `d282` / `d283` | 21 + 7 + 9 条由红转绿 |
| ↳ `d258` G10、`d260` K11、`d282` Q1/Q2/Q4/Q9/Q12 | 报错文案从 `'<类型>' object cannot be interpreted…` 改成 CPython 的 `slice indices must be integers or None or have an __index__ method`（两版都算过，是**逐字对齐**的改善） |
| 22 条 `expectError` 用例的报错文本 | 与 CPython **逐字相同**（本轮专门核过） |
| battery 23 套 | 与 v4.127 **逐例相同**（`one2` O2、`math` 3 条、`dict` D 是既有差异） |
| `gaps433.json`（63 条） | **61/63（不变）**，只余 E50 与 G5 |
| featprobe 6 套 259 例 | **248/259（不变）** |
| `frames` fib16 | `interpSteps` **6388**（不变） |
| `check41.cjs` | **28,561 块 errors=0** |
| `rebuild-old.ps1` | v4.10 … **v4.128 共 119 版全 MATCH** |

新增 **2 个过程**（`srepn %s %s %s %s`、`sprefix2 %s %s %s %s %s`）与 **4 个变量**
（`sqn` `sqa` `sqb` `sqrep`）；Interpreter 26,599 → **26,815** 块。
> `srep` 的空模式臂、`startswith/endswith` 的派发臂、P177/P179 的类型检查是**改写既有积木**——
> 新补丁可以改老补丁建出来的图（改的是产物，不是老补丁文件）。

## 4. 前后对比

```
'abcabc'.replace('a','X',1)   v4.127: XbcXbc      v4.128: Xbcabc
'abc'.replace('', 'X')        v4.127: abc        v4.128: XaXbXcX
'abc'.replace('a')            v4.127: bc         v4.128: TypeError: replace() takes at least 2 positional arguments (1 given)
'abc'.startswith('b', 1)      v4.127: False      v4.128: True
'abc'.startswith('', 5)       v4.127: True       v4.128: False
'abc'.endswith('c', -1)       v4.127: False      v4.128: True
'abcabc'.find('a', 1.5)       v4.127: 3.5        v4.128: TypeError: slice indices must be integers or None or have an __index__ method
'abcabc'.find('a', None)      v4.127: TypeError  v4.128: 0
'abcabc'.find('a', True)      v4.127: TypeError  v4.128: 3
```

## 5. 仍缺 / 下一轮候选

* **字符串接口本身到这里收口**：v4.127 交付了 `find`/`rfind`/`count`/`index` 的 `end`、
  `index(x, start, end)`（str/list/tuple）、`split(None, maxsplit)`、`rsplit`；v4.128 收掉了
  `replace` 的 count、空模式、`startswith`/`endswith` 的区间与全部位置实参的取值/报错。
  CPython `str` 上**还没有**的方法只剩 `encode` / `translate` / `maketrans` / `format_map` /
  `isascii` / `isdecimal` / `isidentifier` / `isnumeric` / `isprintable` / `istitle` 这一类**新增方法**
  （不是"参数没做全"），清单里从未列过，留作候选。
* 其余顺延项：`for a, *r in …`（for 头部星号目标）、内建 `*` 展开（`max(*xs)` / `zip(*m)`）、
  `obj.m(*xs)`、多访问器路径别名（`b = a[0][1]`，留档 `_work/v41/_p176_twoaccessor.txt`）、
  `d.pop(k, default, extra)`、视图集合语义、非 ASCII。
* 界面小项（v4.126 顺延）：`help.json` 第 3 行仍写 `ENT=new line BK=del TAB=4sp`；
  ZIP 里有一张未被引用的旧背景。

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.128.sb3
node _work/v41/check41.cjs MiniPy_v4.128.sb3                    # errors=0
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/d281.json  # 30/30（字符串方法实参）
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/d283.json  # 10/10（startswith 区间）
node _work/v41/run.mjs MiniPy_v4.128.sb3 _work/cmp47/d280.json  # 34/34（v4.127 那批，回归）
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                 # v4.10…v4.128
# v4.127 还原： $env:V41_SKIP='P201'; $env:V41_OUT='…/MiniPy_v4.127.sb3'; $env:V41_STAMP='MiniPy v4.127'; node _work/v41/build41.js
```
