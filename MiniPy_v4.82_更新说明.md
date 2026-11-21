# MiniPy v4.82 更新说明

本轮补上格式字段的**属性与下标路径**：`'{a.n}'.format(a=obj)`、`'{a[1]}'`、`'{0[1]}'`、`'{a[k]}'`、
`'{a.xs[1]}'`。补丁 **P155**。顺带修掉一个把**字典字面量当参数**时的老 bug（参数扫描不认 `{}`）。

产物 `MiniPy_v4.82.sb3`：Interpreter 20,638 块，合计 **22,067**，`check41` errors=0；
73 个历史版本全部可复现（v4.10…v4.82 MATCH）。

## 1. 问题

| 代码 | v4.81 | **v4.82**（= CPython） |
|---|---|---|
| `'{a.n}'.format(a=p)`（p 的 n = 7） | `KeyError: 'a.n'` | `7` |
| `'{a.n:>4}\|'.format(a=p)` | `KeyError: 'a.n'` | `   7\|` |
| `'{a.s!r}'.format(a=p)` | `KeyError: 'a.s'` | `'ab'` |
| `'{a.q.v}'.format(a=p)`（两层属性） | `KeyError: 'a.q.v'` | `5` |
| `'{a[1]}'.format(a=[7, 8])` | 空行（`1` 被当成显式位置索引） | `8` |
| `'{0[1]}'.format([7, 8])` | `[7, 8]` | `8` |
| `'{a[k]}'.format(a={'k': 9})` | `KeyError: 'a]'` | `9` |
| `'{a[1][0]}'` / `'{a.xs[1]}'` | 空行 / `KeyError` | `3` / `6` |
| `'{a[-1]}'.format(a=[7, 8, 9])` | 空行 | `TypeError: list indices must be integers or slices, not str` |
| `'{a[i]}'.format(a=[1, 2, 3])` | 空行 | 同上（**方括号里不是表达式**） |

**顺带修的老 bug**：`'{a[k]} {a[j]}'.format(a={'k': 1, 'j': 2})` 以前报
`SyntaxError: parentheses`——P82 的实参扫描只把 `(`/`[` 算作括号，**字典字面量里的逗号**被当成了
实参分隔符（把 `a={'k': 1` 切成一个实参）。

## 2. 做法

CPython 的替换字段文法是 `名字或序号 ( "." 属性 | "[" 下标 "]" )* [ "!" 转换 ] [ ":" 规格 ]`，
而且**方括号里的内容是字面量**：`str.isdigit()` 决定它是整数下标还是字符串键
（`'{a[i]}'` 不是"用变量 i"，而是键 `'i'`，对列表就是 TypeError）。

* **字段扫描**把字段拆成"基准名"与**路径**（从第一个顶层 `.` 或 `[` 开始），并把每个 `[...]`
  改写成解释器能直接求值的形式：**全是数字就原样，否则加引号**（所以 `[k]` → `['k']`、
  `[-1]` → `['-1']`、`[1:2]` → `['1:2']`，与 CPython 的 `isdigit` 规则一致）。
  `!`/`:` 只在方括号外才是分隔符（`'{a[1]:>5}'` 的规格照旧）。
* **新过程 `fpath %s %s %s`**（值、类型、路径）**把活交回解释器**：
  `assign("__fmt", 值, 类型)` → `tokenize("__fmt" + 路径)` → `eval(1, len(Tok))`。
  于是嵌套（`{a.b[0]}`）、字典键、负下标的 TypeError、字符串下标、切片文本、以及**所有报错文案**
  都和普通代码里同一个表达式的行为完全一致——不必再写第二套索引实现。
  求值后立刻把临时变量从 `Names`/`Values`/`Types`/`Show` 四条并行列表里删掉（MiniPy 没有 `del`），
  变量面板保持干净；若程序自己用了 `__fmt` 这个名字会被覆盖（已在文档里注明）。
* **`{}` 计入括号**：参数扫描（P82 的逗号切分）与 P150 的 `fmtarg`（关键字 `=` 探测）原来只跟踪
  `(`/`[`，现在也跟踪 `{`/`}`，字典字面量当参数不再被误切。

## 3. 实测

| 套件 | v4.81 | **v4.82** |
|---|---|---|
| `d233.json`（本轮新写 **32 条**：属性/下标路径 19 条含嵌套、两层属性、字典整数键、`!r` 组合、
  CPython 报错的三种"方括号是字面量"反例，13 条既有能力回归） | 12/32 | **32/32** |
| `d232` 30 · `d231` 36 · `d230` 59 · `d229` 44 · `d227` 26 · `d228` 25 · `d226` 8 · `pct` 8 ·
  `fstr` 8 · `str` 12 · `cls` 12 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **102 套：98 套逐例相同**；4 处差异 = `d233` 的 **20 条由红转绿**（另有 1 条 `expectError` 用例由"静默"变成"报错"，两边都算通过）+ `t111h`、`t113`（都是 `for x in {'a','b'}` 的 CPython 集合哈希序，差异在参考侧 `py:` 上）+ `featprobe3`（地址）——`ref true` 只有 `t113` 那一处噪声 ⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 21,962 块 errors=0 | **22,067 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.81 共 72 版全 MATCH | **v4.10…v4.82 共 73 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 5 个变量（`fwpath` `fwcon` `fwbr` `fwok` `fwj2`）、1 个过程（`fpath %s %s %s`）。

**三个坑**（都在本轮）：
1. **"括号内"标记和"内容缓冲"共用一个变量**：我用 `fwcon = '~'` 当进入方括号的标记，随后又把内容
   追加进同一个变量，于是第一个内容字符就把标记冲掉，`]` 落到了外层分支 ⇒ 关键字名变成 `a]`
   （症状：`KeyError: 'a]'`）。改成独立的 `fwbr` 标记即可。
2. **`.` 分支漏了**：重构扫描时只写了 `[` 分支，`.` 被当成普通字符进了关键字名 ⇒
   `KeyError: 'a.n'`。
3. **锚点太松**：给 `(`/`[` 加深探测时按"条件里含这两个字面量"找，methodcall 里有 5 处命中 ⇒
   改成精确匹配"同一个变量分别与 `(`、`[` 比较的两条 `EQ` 组成的 `or`"。
   另外 `rebuild-old.ps1` 的批量前缀正则写成 `7[0-9]` 漏掉了 `80`（`v4.80` 没带 `$p82`）——自检没报错，
   但会**让 v4.80 的复现带上 P155**，靠列印 map 发现的，已修。

## 4. 前后对比

```
class P:
    def __init__(self):
        self.n = 7
        self.xs = [5, 6]
p = P()
print('{a.n}'.format(a=p))        v4.81: KeyError   v4.82: 7
print('{a.xs[1]}'.format(a=p))    v4.81: KeyError   v4.82: 6
print('{a[1]}'.format(a=[7, 8]))  v4.81: （空行）   v4.82: 8
print('{a[k]}'.format(a={'k': 9})) v4.81: KeyError  v4.82: 9
print('{a:,}'.format(a=1234567))   不变：1,234,567
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 临时变量名 `__fmt` | 求值期间会用这个全局名；程序自己用同名变量会被覆盖（用完即删） |
| 类型不匹配的**文案** | `'{a:b}'.format(1.5)` 报 `TypeError: %x format: an integer is required`（CPython 是 `ValueError: Unknown format code 'b' for object of type 'float'`）——不再给错答案 |
| 嵌套规格 `'{:{w}}'` | 不支持 |
| 少参数、显式索引越界、自动/显式编号混用 | 仍静默（为不动既有快照而保留） |
| `'{a!a}'` 的 ascii 语义 | 按 `repr` 处理（MiniPy 没有 `ascii()`） |
| 属性路径的**性能** | 每个带路径的字段要 `assign`+`tokenize`+`eval` 一次（换来与普通代码完全一致的语义） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.82.sb3
node _work/v41/run.mjs MiniPy_v4.82.sb3 _work/cmp47/d233.json  # 属性/下标路径 32 条
node _work/v41/run.mjs MiniPy_v4.82.sb3 _work/cmp47/d232.json  # # 前缀 + f-string 转换 30 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.82.sb3 -tag v482 -ref v481
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v482 -ref v481
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.82.sb3 -tag v482
node _work/v41/check41.cjs MiniPy_v4.82.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.81 还原： $env:V41_SKIP='P155'; $env:V41_OUT='…/MiniPy_v4.81.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.83）候选

1. 类型不匹配的 `ValueError: Unknown format code …` 文案（让 `pctitem` 知道调用来自 `%` 还是 `.format`）
2. 少参数 / 显式索引越界 / 自动-显式混用的报错文案
3. 嵌套规格 `'{:{w}}'`
4. `'{a!a}'` 的真 ascii 语义
5. 别再让格式字段依赖 `__fmt` 这个全局临时名（改用不占用户命名空间的手段）
