# MiniPy v4.83 更新说明

本轮把 `format` 这一族的**报错**补齐：类型错的措辞按调用来源分成两套（`.format`/f-string 与 `%`），
并且**字段不够/越界/编号混用不再静默**。补丁 **P156**。

产物 `MiniPy_v4.83.sb3`：Interpreter 20,785 块，合计 **22,214**，`check41` errors=0；
74 个历史版本全部可复现（v4.10…v4.83 MATCH）。

## 1. 问题

`pctitem` 是 `%`、f-string、`.format` 三条路共用的，于是 `.format` 的类型错一直借用 `%` 的措辞；
而字段不足/越界/编号混用则是**什么都不说**（少打一段、或整段替换消失）。

| 代码 | v4.82 | **v4.83**（= CPython，逐字一致） |
|---|---|---|
| `'{a:d}'.format(a='x')` | `TypeError: %d format: a number is required` | `ValueError: Unknown format code 'd' for object of type 'str'` |
| `'{a:f}'.format(a='x')` | `TypeError: must be real number, not str` | `ValueError: Unknown format code 'f' for object of type 'str'` |
| `'{a:b}'.format(a=1.5)` | `TypeError: %x format: an integer is required` | `ValueError: Unknown format code 'b' for object of type 'float'` |
| `'{a:x}'.format(a='a')` / `'{a:c}'` / `'{a:g}'` / `'{a:%}'` | 借用 `%` 措辞 | `ValueError: Unknown format code '<转换符>' for object of type 'str'` |
| `f'{x:d}'`（x 是字符串） | 借用 `%` 措辞 | 同上 |
| `'{} {}'.format(1)` | 打印 `1 `（静默少一段） | `IndexError: Replacement index 1 out of range for positional args tuple` |
| `'{0}'.format(a=1)` | 空行 | `IndexError: Replacement index 0 out of range for positional args tuple` |
| `'{} {0}'.format(1, 2)` | 打印 `1 1` | `ValueError: cannot switch from automatic field numbering to manual field specification` |
| `'{0} {}'.format(1, 2)` | 打印 `1 2` | `ValueError: cannot switch from manual field specification to automatic field numbering` |
| `'%d' % 'x'` | `TypeError: %d format: a number is required` | `TypeError: %d format: a real number is required, not str` |
| `'%x' % 'a'` / `'%o' % 'a'` | `TypeError: %x format: an integer is required`（`%o` 也说 `%x`） | `TypeError: %x format: an integer is required, not str`（`%o` 说 `%o`） |
| 具名字段与自动/显式编号混用 | 正常 | **不变**（`'{a} {}'`、`'{a} {0}'` 都合法） |

## 2. 做法

* **两个入口各自报身份**：新变量 `pcsrc`（1 = `.format`/f-string，0 = `%`），由 `flditem` 与 `pctfmt`
  在调用 `pctitem` 前设置。
* `pctitem` 里**7 处类型检查**（`d/i`、`f`、`e`、`x/X/o/b`、`c`、`%`、`g`）都改成
  `IFELSE(pcsrc == 1, [格式侧措辞], [百分号侧措辞])`：格式侧用现成的 `tname`（P144）取类型名拼出
  `ValueError: Unknown format code '<conv>' for object of type '<类型>'`；百分号侧也顺手对齐 CPython
  （`%d`/`%i` 是 "a real number is required, not <类型>"、`%x`/`%o` 是 "an integer is required, not <类型>"、
  且**用实际转换符**而不是写死 `%x`）。`%f`/`%e`/`%g` 的 "must be real number, not <类型>" 也改成
  带类型名（原来写死 `not str`）。
* **字段错误**（`strfmt`）：新变量 `fwm` 记录编号模式（`''`/`'A'`/`'M'`）——自动编号遇到 `'M'`、
  显式编号遇到 `'A'` 就按 CPython 报 `cannot switch from …`（**具名字段不参与**，所以
  `'{a} {}'`、`'{a} {0}'` 都合法）；取不到值时不再什么都不做，而是报
  `IndexError: Replacement index <n> out of range for positional args tuple`。
  实现上是把原来那个 `if sfhas == 0 …` 与"越界就什么都不做"的 `if` **就地变成 if/else**
  （改 `opcode` 并补 `SUBSTACK2`），这样原有的 SUBSTACK 链一字不动。

## 3. 实测

| 套件 | v4.82 | **v4.83** |
|---|---|---|
| `d234.json`（本轮新写 **30 条**：8 条格式侧类型错含 f-string、3 条越界、2 条编号混用、2 条百分号
  类型错、4 条"具名与编号混用应当合法"、11 条回归） | 24/30 | **30/30** |
| 逐字比对（本轮把 `d234` 的 `mini.err` 与 CPython 的 `pyerr` 打印出来核对） | — | **E1–E17 全部逐字一致** |
| `d233` 32 · `d232` 30 · `d231` 36 · `d230` 59 · `d229` 44 · `d227` 26（K25 改标 `expectError`）·
  `d228` 25 · `d226` 8 · `d225` 10 · `d224` 16 · `d223` 17 · `d221` 31 | — | **全绿** |
| 63 条缺口复核（`gaps433`） | 61/63 | **61/63**（仍只 fail E50/G5） |
| 快照 | — | **103 套：98 套逐例相同**；5 处差异 = `d234` 的 **16 处**（6 条由红转绿 + 10 条只是措辞变准，两边原本都已报错）+ `d232` 的 1 处（`'{a:b}'.format(1.5)` 的措辞由 `%x …` 变成 `Unknown format code 'b' …`）+ `d227` 的 1 处**改名**（K25 由"静默"改标 `expectError`，added=1/removed=1）+ `t111h`（CPython 集合哈希序）+ `featprobe3`（地址）——`ref false` 6 / `ref true` **0** ⇒ **零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（不变） |
| `check41.cjs` | 22,067 块 errors=0 | **22,214 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.82 共 73 版全 MATCH | **v4.10…v4.83 共 74 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388**（不变） |

新增 2 个变量（`pcsrc` `fwm`），没有新增过程。

**一个坑**：`OPERAND1` 是**输入描述符**（`[3,[12,'sfhas',id],…]`），不是积木 id——第一版把描述符
丢给 `BL()` 去找积木，锚点全落空（报 `strfmt sfhas if = 0`）。查变量引用要直接看描述符里的 `[12, 名字]`。

## 4. 前后对比

```
print('{a:d}'.format(a='x'))
    v4.82: TypeError: %d format: a number is required
    v4.83: ValueError: Unknown format code 'd' for object of type 'str'
print('{} {}'.format(1))
    v4.82: 1            v4.83: IndexError: Replacement index 1 out of range for positional args tuple
print('{} {0}'.format(1, 2))
    v4.82: 1 1          v4.83: ValueError: cannot switch from automatic field numbering to manual field specification
print('{a} {0}'.format(1, a=2))      不变：2 1（具名字段不参与编号）
print('%d' % 'x')
    v4.82: TypeError: %d format: a number is required
    v4.83: TypeError: %d format: a real number is required, not str
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'%c' % 'a'`（单字符串） | CPython 返回 `'a'`，MiniPy 报 `TypeError: %c requires int or char`（**语义**差异，不只是措辞） |
| `'%c' % 1.5` | MiniPy `%c requires int or char`，CPython `%c requires an int or a unicode character, not float` |
| `'%c' % 300` 的范围 | MiniPy 按 `range(32, 127)` 报错，CPython 接受（上限是 `0x110000`） |
| 嵌套规格 `'{:{w}}'` | 不支持 |
| `'{a!a}'` 的 ascii 语义 | 按 `repr` 处理 |
| 带路径字段的 `__fmt` 临时名与一次 `assign`+`tokenize`+`eval` | 同 v4.82 |
| `dict(**d)` / `sum(d)` 报错文案 | 仍未做 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.83.sb3
node _work/v41/run.mjs MiniPy_v4.83.sb3 _work/cmp47/d234.json  # 报错措辞与字段错误 30 条
node _work/v41/run.mjs MiniPy_v4.83.sb3 _work/cmp47/d233.json  # 属性/下标路径 32 条（v4.82）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.83.sb3 -tag v483 -ref v482
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v483 -ref v482
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.83.sb3 -tag v483
node _work/v41/check41.cjs MiniPy_v4.83.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.82 还原： $env:V41_SKIP='P156'; $env:V41_OUT='…/MiniPy_v4.82.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.84）候选

1. `%c` 的语义与文案（接受单字符串、范围改成 `0x110000`、`not float` 等）
2. 嵌套规格 `'{:{w}}'`
3. `'{a!a}'` 的真 ascii 语义
4. `dict(**d)` 解包合并 / `sum(d)` 的报错文案
5. 去掉格式字段对 `__fmt` 全局临时名的依赖
