# MiniPy v4.87 更新说明

本轮做**格式规格里的嵌套字段**：`'{:{w}}'.format(3, w=5)`、`'{:{}.{}f}'.format(3.14159, 8, 2)`。
补丁 **P160**。

产物 `MiniPy_v4.87.sb3`：Interpreter 21,018 块，合计 **22,447**，`check41` errors=0；
78 个历史版本全部可复现（v4.10…v4.87 MATCH）。

## 1. 问题

格式规格本身也是一段格式字符串（可以再放 `{...}`）。以前 `'{:{w}}'.format(3, w=5)` 打印 `3`
（宽度整个丢了），`'{:{}.{}f}'.format(3.14159, 8, 2)` 打印 ` 3.14159.2f`。**两个原因叠在一起**：

| 代码 | v4.86 | **v4.87**（= CPython） |
|---|---|---|
| `'{:{w}}'.format(3, w=5)` | `3` | `    3` |
| `'{:{}}'.format(3, 5)` | `    3`（**这条本来就对**） | `    3` |
| `'{0:{1}}'.format(3, 5)` | `3` | `    3` |
| `'{:{}.{}f}'.format(3.14159, 8, 2)` | ` 3.14159.2f` | `    3.14` |
| `'{:.{}f}'.format(3.14159, 3)` | `3.14159f` | `3.142` |
| `'{:*>{w}}'.format(7, w=6)` | `7` | `*****7` |
| `'{:0{w}d}'.format(42, w=6)` | `42d` | `000042` |
| `'{:{w}.{p}f}'.format(3.14159, w=8, p=3)` | `3.14159.3f` | `   3.142` |
| `'{:{}}'.format(3)`（少参数） | 静默 | `IndexError: Replacement index 1 out of range for positional args tuple` |
| `'{:{w}}'.format(3)`（缺名字） | 静默 | `KeyError: 'w'` |
| 无嵌套的规格 | 正常 | **不变** |

## 2. 做法

1. **字段扫描要数嵌套大括号**：`strfmt` 以前**遇到第一个 `}` 就收尾**，于是 `{:{w}}` 被读成
   `spec = ':{w'`（末尾那个 `}` 被当成字段结束符丢了）。现在扫描条件改成
   **"`}` 且嵌套深度为 0 才收尾"**，并在规格分支里维护深度（`{` 加一、`}` 减一，都照原样收进规格文本）。
2. **展开规格里的嵌套字段**：`flditem` 拿到规格文本后、交给 `fldspec` **之前**走一遍：
   每个 `{...}` 都按顶层字段的规则解析——**空名字**用"下一个自动位置参数"（与外面共用一个自动编号
   计数器，CPython 就是这样）、**全数字**是显式位置下标、**其它**当关键字名查 `FmtK`——
   值用 `strval` 转成字符串再拼回规格文本。越界与缺名字分别报
   `IndexError: Replacement index N out of range for positional args tuple` 与 `KeyError: 'w'`。

## 3. 两个坑

1. **`contains` 的参数顺序**：Scratch 的 `operator_contains` 是"**STRING1 里有没有 STRING2**"。
   我照 P155 的习惯写了 `contains(x, s) → STRING1 = s`，于是判"规格里有没有 `{`"时写反了——
   变成"`{` 里有没有整段规格"，恒为假。**症状很隐蔽**：`{:{}}`（纯自动编号）不依赖这个判断，
   照常工作；只有带 `{` 的规格悄悄不展开。现在这段改用"第一个参数是干草堆"的
   `hasNeedle(hay, needle)`，并把原来的 `isDigit` 也写成参数顺序明确的版本。
2. **`fwspec == '!'` 的锚点撞车**：字段扫描里还有一个 `fwspec == ''` 的 if/else，
   只按"条件是比较 `fwspec`"去找会命中两个 ⇒ 必须再要求第二个操作数是字面量 `'!'`。

## 4. 实测

| 套件 | v4.86 | **v4.87** |
|---|---|---|
| `d238.json`（本轮新写 **26 条**：关键字/自动/显式宽度、宽度+精度、精度、填充、左对齐、零填充、
名字与位置混用、两个字段两个宽度、字符串宽度、两个报错用例 + 10 条回归） | 12/26 | **26/26** |
| `d237` 18 · `d236` 20 · `d235` 19 · `d234` 30 · `d233` 32 · `d232` 30 · `d231` 36 · `d230` 59 ·
  `d229` 44 · `d228` 25 · `d227` 26 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **107 套：105 套逐例相同**；2 处差异 = `d238` 的 **14 条由红转绿** + `featprobe3`（地址）——`ref false` 14 / `ref true` **0** ⇒ **零回归** |
| 6 个 featprobe（259 条） | 248/259 | **248/259**（不变） |
| `check41.cjs` | 22,317 块 errors=0 | **22,447 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.86 共 77 版全 MATCH | **v4.10…v4.87 共 78 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 9 个变量（`fwn0` `fwn1` `fwn2` `fwn3` `fwn4` `fwn6` `fwv2` `fwt2` `fwspd`），没有新增过程。

## 5. 前后对比

```
print('{:{w}}'.format(3, w=5))              v4.86: 3            v4.87:     3
print('{:{}.{}f}'.format(3.14159, 8, 2))    v4.86:  3.14159.2f  v4.87:     3.14
print('{:*>{w}}'.format(7, w=6))            v4.86: 7            v4.87: *****7
print('{a:>5}'.format(a=1))                 不变：    1
print('{a:8.3f}'.format(a=3.14159))         不变：   3.142
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 嵌套字段与**自动/显式编号混用** | CPython 会报 `cannot switch from …`；MiniPy 的嵌套展开不参与那个模式判断（比 CPython 宽松） |
| 嵌套字段里的**属性/下标** `'{:{a.w}}'` | 不支持（嵌套名字只当关键字/下标查表，不做路径解析） |
| 嵌套字段里的转换符 `'{:{w!r}}'` | 不支持 |
| TAB 制表位宽度 / `TabError` | 同 v4.86 |
| 缩进一致性检查 | 比 CPython 宽松 |
| 非 ASCII | ASCII 字符串模型 |
| `dict(映射, 关键字)` 记录顺序 / `f(**d)` | 同 v4.84 |
| `%c` 的语义与文案 / `'{a!a}'` | 同 v4.83–v4.84 |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.87.sb3
node _work/v41/run.mjs MiniPy_v4.87.sb3 _work/cmp47/d238.json  # 嵌套规格 26 条
node _work/v41/run.mjs MiniPy_v4.87.sb3 _work/cmp47/d237.json  # TAB 18 条（v4.86）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.87.sb3 -tag v487 -ref v486
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v487 -ref v486
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.87.sb3 -tag v487
node _work/v41/check41.cjs MiniPy_v4.87.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.86 还原： $env:V41_SKIP='P160'; $env:V41_OUT='…/MiniPy_v4.86.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.88）候选

1. `dict(映射, 关键字)` 的记录顺序（要同时保持"关键字值优先"）
2. `f(**d)`（用户函数与内建的关键字解包）
3. `%c` 的语义与文案
4. 嵌套字段的属性/下标与转换符、与编号模式的互相校验
5. TAB 制表位宽度（8）与 `TabError`
