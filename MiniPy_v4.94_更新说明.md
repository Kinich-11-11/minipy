# MiniPy v4.94 更新说明

本轮**批量补齐常用方法**：字符串 17 个（`ljust` `rjust` `center` `lstrip` `rstrip` `swapcase`
`capitalize` `partition` `rpartition` `splitlines` `removeprefix` `removesuffix` `expandtabs`
`isupper` `islower` `isspace` `isalnum`）+ 字典 5 个（`update` `setdefault` `popitem` `copy` `clear`），
共 **22 个方法**。补丁 **P167**。

产物 `MiniPy_v4.94.sb3`：Interpreter 22,660 块，合计 **24,089**，`check41` errors=0；
85 个历史版本全部可复现（v4.10…v4.94 MATCH）。

## 1. 问题

这些方法以前一律 `AttributeError: ... object has no attribute '...'`（`d.clear()`、`'ab'.ljust(5)` 等）：

| 代码 | v4.93 | **v4.94**（= CPython） |
|---|---|---|
| `'ab'.ljust(5, '.')` / `rjust(5, '.')` | AttributeError | `ab...` / `...ab` |
| `'ab'.center(6, '*')` / `center(5, '*')` | AttributeError | `**ab**` / `**ab*`（奇偶规则见 §3.4） |
| `'  a '.lstrip()` / `' a  '.rstrip()` | AttributeError | 去一侧空白（含 TAB） |
| `'aBc'.swapcase()` / `'ab cd'.capitalize()` | AttributeError | `AbC` / `Ab cd` |
| `'a=b'.partition('=')` / `'a=b=c'.rpartition('=')` | AttributeError | `('a', '=', 'b')` / `('a', '=', 'c')` |
| `'a\nb'.splitlines()` | AttributeError | `['a', 'b']` |
| `'abc'.removeprefix('a')` / `removesuffix('c')` | AttributeError | `bc` / `ab` |
| `'a\tb'.expandtabs(4)` | AttributeError | `a   b` |
| `'AB'.isupper()` / `'1'.isupper()` / `''.isspace()` | AttributeError | `True` / `False` / `False` |
| `d.update({'b': 2})` | AttributeError | 合并（已有键保位置换值、新键追加） |
| `d.setdefault('b', 9)` / `d.popitem()` | AttributeError | 插入并返回默认值 / 弹出最后一对 |
| `d.copy()` / `d.clear()` | AttributeError | 复制 / 清空 |

## 2. 做法

字符串方法的派发是 `methodcall` 里一串 `if smmeth == "名字"` 加末尾一个"已知名字清单"的守卫
（P75 的 `index/title/zfill/isdigit/isalpha` 就是这么加的）；实参此时已经在 `sma1`/`smt1`（第二个在
`sma2`/`smt2`，逗号位置在 `mcut`）。所以每个方法 = 一行派发 + 一个小过程：

* **新过程 9 个**：`spad`（ljust/rjust/center，按 `l/r/c` 分模式）、`strim`（lstrip/rstrip）、
  `sfold`（swapcase/capitalize）、`spart`（partition/rpartition，返回三元组）、`saffix`
  （removeprefix/removesuffix）、`stabs`（expandtabs，按列对齐）、`sslines`（splitlines，切 `\n`、
  丢掉尾部空行）、`sclass2`（四个 `is*` 判定）、`dupd`（`dict.update` 的合并重建）。
* 字典方法加在 `dictmeth` 的末尾（`copy`/`clear`/`setdefault`/`popitem`/`update`），
  写回用 `assign(nm, 记录串, 'D')`（`nm` 就是接收者的名字 token，`pop` 早就是这么写的）。
* **大小写**：Scratch 的 `=` 和 `contains` **都不分大小写**，所以凡是判断"内容相等"的地方
  （`substr(v,1,len(p)) == p`、swapcase 的判定、键比较）都改用 `compareText`（它给出 `cmp`），
  判断"是不是大写字母"则是先 `scase` 求大写/小写形态再 `compareText`。

## 3. 五个坑

1. **顶层元组的 `ev` 只是元素记录串**，类型由 `evtype='T'` 表示；`lsep+'T'+记录串` 那种写法是
   **元组作为别的容器的元素**时才用（`dictitems` 就是这么造的）。第一版把两种混了，
   `partition` 打出 `(('a', '=', 'b'),)`（多一层）。
2. **`llen(名字)` 要的是"列表名"**，记录串的长度得用 `listlen %s` 过程 ⇒ 第一版报
   `no list rec in Interpreter`。
3. **`IFELSE` 是语句不是 reporter**，不能塞进 `ADD(...)` 里（构建报
   `Cannot set properties of undefined (setting 'parent')`）⇒ 先算进变量再拼。
4. **CPython 的 `center()` 有奇偶怪癖**：多余的那个填充字符**在左边**当且仅当"余量与宽度都是奇数"
   （`left = marg // 2 + (marg & width & 1)`）。所以 `'ab'.center(5,'*')` 是 `**ab*` 而不是 `*ab**`。
5. **`FAILB` 的消息是 JOIN 拼出来的**，按文字找锚点会命中 0 个（这轮又踩一次）⇒ 改用"函数体链条的
   末句"作锚点，并检查它确实是 `fail %s`。另外字典方法分支末尾必须 `STOPTHIS()`，否则会掉进
   "dict has no method" 的兜底。**变量名撞车**也很多（`sfacc`/`sfi`/`spi`/`stacc`/`sti`/`swacc` 都被占了），
   最后统一用 `s7*` / `d9*` 前缀。

## 4. 实测

| 套件 | v4.93 | **v4.94** |
|---|---|---|
| `d246.json`（本轮新写 **64 条**：17 个字符串方法 × 正常/边界（够宽、空串、无分隔、不匹配、大小写敏感、
多行、制表位、四类字符判定）+ 5 个字典方法（覆盖、顺序、返回值、空字典报错）+ 8 条老方法回归
（upper/lower/strip/find/zfill/title/isdigit/isalpha/split/join/replace/get/pop/keys）+ 链式调用 +
两个"未知方法报错"） | 9/64 | **64/64** |
| `d245` 30（`print(*xs)`） | 30/30 | **30/30** |
| `d244` 30 · `d243` 40 · `d242` 40 · `d241` 30 · `d240` 49 · `d239` 31 | — | **全绿（`d244` 仍只剩内建 `max(*xs)`）** |
| `d238` 26 · `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 ·
  `d230` 59 · `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **115 套：113 套逐例相同**；2 处差异 = `d246` 的 55 条由红转绿 + `featprobe3`（地址）
  ⇒ **`ref true` 0，零回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 23,238 块 errors=0 | **24,089 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.93 共 84 版全 MATCH | **v4.10…v4.94 共 85 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 9 个过程（`spad` `strim` `sfold` `spart` `saffix` `stabs` `sslines` `sclass2` `dupd`）、
1 个列表（`SSLine`）、若干变量（统一 `s7*`/`d9*` 前缀）。

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 字符串方法还缺 | `rfind` `rindex` `ljust` 以外还有 `casefold` `encode` `format_map` `maketrans` `translate` `zfill` 以外还有 `splitlines(keepends)`；`strip(字符集)` 只支持空白 |
| `isdigit`/`isalpha`/四个新判定 | 只认 ASCII 字母数字（非 ASCII 是既有限制）；`isspace`/`strip` 认空格/TAB/`\n`/`\r` |
| `splitlines` | 只按 `\n` 切（`\r` 丢弃，不支持 `\v`/`\f`/`\x1c` 等分隔符，也没有 `keepends`） |
| `dict.update` | 只收字典（CPython 还收"键值对的可迭代"） |
| `min/max(key=…)`、`enumerate(start)`、`sum(start)`、链式比较、扩展解包 `a, *rest = …`、字典 `\|` 合并、海象运算符、三引号字符串、复数 | 都还不支持（本轮探针发现，见下轮候选） |
| 内建的 `*` 展开（`max(*xs)` 等） | 不支持 |
| 视图的集合语义、字典大小比较、TAB 制表位宽度、非 ASCII | 同前几版 |

## 6. 前后对比

```
'  a  '.strip()            不变：a
print('ab'.ljust(5, '.'))   v4.93: AttributeError   v4.94: ab...
print('ab'.center(5, '*'))  v4.93: AttributeError   v4.94: **ab*
print('a=b'.partition('='))  v4.93: AttributeError  v4.94: ('a', '=', 'b')
print('a\tb'.expandtabs(4)) v4.93: AttributeError   v4.94: a   b
print('AB'.isupper())       v4.93: AttributeError   v4.94: True
d = {'a': 1}; d.update({'a': 9, 'b': 2}); print(d)
                            v4.93: AttributeError   v4.94: {'a': 9, 'b': 2}
print({'a': 1}.copy())      v4.93: AttributeError   v4.94: {'a': 1}
print('  Ab  '.strip().lower().center(7, '='))
                            v4.93: SyntaxError      v4.94: ===ab==
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.94.sb3
node _work/v41/run.mjs MiniPy_v4.94.sb3 _work/cmp47/d246.json  # 字符串/字典方法 64 条
node _work/v41/run.mjs MiniPy_v4.94.sb3 _work/cmp47/d245.json  # print(*xs) 30 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.94.sb3 -tag v494 -ref v493
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v494 -ref v493
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.94.sb3 -tag v494
node _work/v41/check41.cjs MiniPy_v4.94.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.93 还原： $env:V41_SKIP='P167'; $env:V41_OUT='…/MiniPy_v4.93.sb3'; $env:V41_STAMP='MiniPy v4.93 - built 2026-09-17'; node _work/v41/build41.js
```

## 8. 下一轮（v4.95）候选

1. **链式比较** `1 < 2 < 3`（现在是左结合，`1 < 3 < 2` 给错答案）
2. **扩展解包赋值** `a, *rest = [1, 2, 3]`
3. `min/max(key=…)`、`enumerate(xs, start)`、`sum(xs, start)`
4. 字典 `|` / `|=` 合并运算符
5. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）
