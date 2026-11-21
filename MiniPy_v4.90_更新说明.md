# MiniPy v4.90 更新说明

本轮做**字典视图**：`d.keys()` / `d.values()` / `d.items()` 变成**真值**（能 `list()`、`len()`、
`for`、`in`、`sorted()`、`sum()`、`tuple()`、`set()`、`enumerate()`、`zip()`），
而 `print` 仍然是 CPython 的样子（`dict_keys(['a', 'b'])`）。顺带修掉 `type({1})` 报
`<class 'int'>`（应为 `<class 'set'>`）的老 bug。补丁 **P163**。

产物 `MiniPy_v4.90.sb3`：Interpreter 21,525 块，合计 **22,954**，`check41` errors=0；
81 个历史版本全部可复现（v4.10…v4.90 MATCH）。

## 1. 问题

`.keys()` 以前回答的是**显示字符串** `dict_keys(['a'])`：`print` 看着对，但

| 代码 | v4.89 | **v4.90**（= CPython） |
|---|---|---|
| `print({'a': 1}.keys())` | `dict_keys(['a'])`（对） | `dict_keys(['a'])` |
| `list({'a': 1, 'b': 2}.keys())` | 把这句话拆成**字符**列表 | `['a', 'b']` |
| `len({'a': 1}.keys())` | `19` | `1` |
| `for k in {'a': 1}.keys():` | 逐个打印字母 | 打印 `a` |
| `for k, v in {'a': 1}.items():` | `TypeError: cannot unpack non-iterable object` | `a 1` |
| `1 in {'a': 1}.values()` | `TypeError: in requires strings` | `True` |
| `sorted({'b': 2, 'a': 1}.keys())` | `TypeError: sorted() requires a list` | `['a', 'b']` |
| `sum({'a': 1, 'b': 2}.values())` | `TypeError: sum() requires a list` | `3` |
| `{'a': 1}.keys()[0]` | `d`（第一个字符） | `TypeError: 'dict_keys' object is not subscriptable` |
| `type({'a': 1}.keys())` | `<class 'str'>` | `<class 'dict_keys'>` |
| `type({1, 2})` | `<class 'int'>`（**老 bug**） | `<class 'set'>` |

## 2. 做法

新增**三个类型标记**承载"载荷"，而不是那句话：

| 标记 | 视图 | 值（载荷） |
|---|---|---|
| `K` | `dict_keys` | 键的平铺列表编码（与 `dictkeys %s` 的输出一致） |
| `V` | `dict_values` | 值的平铺列表编码 |
| `I` | `dict_items` | 元组的平铺列表编码 |

载荷就是普通的 `L` 编码，所以**迭代类的地方只要把标记换成 `L` 就行**，唯一知道包装的是 `strval`
（它按标记拼 `dict_keys(` + `listfmt(载荷)` + `)`）——`print`/`str`/f-string/赋值面板因此都不变。

改动的 9 处：

1. **`dictmeth`**：`keys`/`values`/`items` 三个分支改成"建载荷 + 置 `evtype` 为 `K`/`V`/`I`"。
2. **`strval`**：在函数体最前面包一层 `IFELSE(是视图, [listfmt + 按标记加包装], [原函数体])`。
3. **`tname`**：补 `K`/`V`/`I` → `dict_keys`/`dict_values`/`dict_items`。
4. **`type()`**：在它的分支末尾（结果标记为字符串之前）补四个 `IF`：`K`/`V`/`I` → `<class 'dict_keys'>` 等，
   `E` → `<class 'set'>`（这个 `E` 是顺手修的老 bug：集合的标记是 `E`，而那条链没有它，
   于是 `type({1})` 掉到数字兜底、报 `<class 'int'>`）。
5. **`callfn` 的迭代白名单**（`list/tuple/set/enumerate/zip/sorted/min/max/any/all/sum`）：
   条件里加 `K`/`V`/`I`，分支体改成 `if D then dictkeys else evtype = 'L'`。
6. **`callfn` 的 `len` 分支**：把"是 L/T/G"那条条件加上 `K`/`V`/`I`（载荷的长度就是元素个数）。
7. **`forloop`**：两处"`D` → `dictkeys`"之前插一句"是视图就 `evtype = 'L'`"（第二处是
   `for k, v in ...` 的解包路径）。
8. **`rightside` 的 `in` 分支**：同样的归一化，`in` 就能在视图里查。
9. **`indexget`**：视图不可下标，报 CPython 的
   `TypeError: 'dict_keys' object is not subscriptable`（名字走 `tname`）；
   另外 **`zip()`**（P99）自己有一套 `isIter` 检查（只认 L/T/G/S），给它补上 `K`/`V`/`I`
   ——它的载荷本来就是列表，接受标记即可。

## 3. 三个坑

1. **一个 reporter 积木只能坐一个输入**（老坑，这次最贵）。`isView(expr)` 我写成
   `(expr=='K' or expr=='V') or expr=='I'`，调用时**只建了一个 `argOf('vt')` 积木、塞进三个比较**。
   症状极隐蔽：**dump 出来的条件完全正确**（`(((vt = "K") | (vt = "V")) | (vt = "I"))`），
   运行时却恒假——那块积木的 `parent` 被最后一次链接改成了别的比较，Scratch 顺序执行时它回到错误的父节点，
   另外两个比较读到的就是输入的**影子** `''`。于是包装分支整段不执行，`ev` 还是原始载荷，
   而 `type()`（每次比较都新建 reporter）却正常。定位靠临时补丁：在 `strval` 入口打 `vt`（=K ✓）、
   在包装分支的 SUBSTACK 里打点（**一条都没打出来**）。修法：`isView` 收 **thunk**，
   每次比较新建一个 reporter。
2. **`Array.isArray(v[1]) && typeof v[1] === 'string'` 是自相矛盾**——`mentionsArg` 里的这个写法让锚点
   永远找不到（`[Pn] ... = 0`）。参数 reporter 永远是**积木**（`v[1]` 是 id 字符串），
   数组形态是**内联变量**描述符；两种情况要分开写。**写完谓词先在一个已知为真的例子上验一遍。**
3. **`zip()` 的两个检查**：①它要搜的字符串是**整句** `TypeError: zip() needs iterables`
   （`FAIL` 里带了前缀，`mentionsLit` 是精确匹配）；②那句 `fail` 在 **SUBSTACK** 里、
   不在条件子树里——按条件找会命中 0 个。

## 4. 实测

| 套件 | v4.89 | **v4.90** |
|---|---|---|
| `d242.json`（本轮新写 **40 条**：三种视图的打印/`str`/`list`/`len`/`for`（含 `for k, v in items()`）/`in`/
  `sorted`/`min`/`max`/`sum`/`tuple`/`set`/`enumerate`/`zip`/`any`/`all`、空字典视图、下标报错、
  `type()` 三种视图与集合、视图当参数、赋值后再用、与列表拼接） | 9/40 | **40/40** |
| `d241` 30（容器相等） | 29/30 | **29/30**（同前，`L29` 是既有的 `if [` 解析限制） |
| `d240` 49（字典规范形式与相等） | 49/49 | **49/49** |
| `d239` 31 · `d238` 26 · `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 ·
  `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **111 套：108 套逐例相同**；3 处差异 = `d242` 的 **31 条**由红转绿 +
  `t111h` 与 `featprobe3` 两处 CPython 侧噪声 ⇒ **`ref true` 0，零回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 22,833 块 errors=0 | **22,954 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.89 共 80 版全 MATCH | **v4.10…v4.90 共 81 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

**没有新增变量、没有新增过程**，只改了 9 处既有代码。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 视图的**集合语义** | CPython 的 `d.keys()` 支持集合运算与"和集合比较"（`{'a':1}.keys() == {'a'}` 是 `True`）；MiniPy 只把视图当列表用，`==` 仍是按载荷串比（同序为真） |
| `d.keys() < d.keys()` 之类 | 未实现（CPython 按集合包含） |
| `zip(d.keys(), d.values())` 的**第二个源** | 现在可以（本轮补的 `isIter`），但 `zip` 仍是**立即求值**（与 `zip()`/`enumerate()` 同类） |
| 字典的大小比较 `d1 < d2` | CPython 报 `TypeError`；MiniPy 仍按原始记录串比 |
| `{'a': 1} == {'a': 1.0}` | 类型标记不同 ⇒ `False`（CPython `True`） |
| `if` 的条件直接以 `[` 开头 | 既有的解析限制（`d241` 的 `L29`） |
| 嵌套字段的属性/下标与转换符 | 同 v4.87 |
| TAB 制表位宽度 / `TabError` / 缩进一致性 | 同 v4.86–v4.85 |
| 非 ASCII | ASCII 字符串模型 |

## 6. 前后对比

```
print({'a': 1, 'b': 2}.keys())             不变：dict_keys(['a', 'b'])
print({'a': 1}.items())                    不变：dict_items([('a', 1)])
print(list({'a': 1, 'b': 2}.keys()))       v4.89: ['d','i','c','t','_' …]  v4.90: ['a', 'b']
print(len({'a': 1}.keys()))                v4.89: 19                        v4.90: 1
for k, v in {'a': 1}.items(): print(k, v)  v4.89: TypeError                 v4.90: a 1
print(sum({'a': 1, 'b': 2}.values()))      v4.89: TypeError                 v4.90: 3
print({'a': 1}.keys()[0])                  v4.89: d                         v4.90: TypeError: 'dict_keys' object is not subscriptable
print(type({'a': 1}.keys()))               v4.89: <class 'str'>             v4.90: <class 'dict_keys'>
print(type({1, 2}))                        v4.89: <class 'int'>             v4.90: <class 'set'>
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.90.sb3
node _work/v41/run.mjs MiniPy_v4.90.sb3 _work/cmp47/d242.json  # 字典视图 40 条
node _work/v41/run.mjs MiniPy_v4.90.sb3 _work/cmp47/d240.json  # 字典规范形式 49 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.90.sb3 -tag v490 -ref v489
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v490 -ref v489
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.90.sb3 -tag v490
node _work/v41/check41.cjs MiniPy_v4.90.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.89 还原： $env:V41_SKIP='P163'; $env:V41_OUT='…/MiniPy_v4.89.sb3'; $env:V41_STAMP='MiniPy v4.89 - built 2026-09-17'; node _work/v41/build41.js
```

## 8. 下一轮（v4.91）候选

1. 视图的集合语义（`d.keys() == {'a'}`、`d.keys() & s`、`d.keys() < d.keys()`）
2. `f(**d)`（用户函数与内建的关键字解包）
3. `if` 的条件以 `[` 开头（`L29`）
4. 字典的大小比较报 `TypeError`
5. 嵌套字段的属性/下标与转换符、与编号模式的互相校验
