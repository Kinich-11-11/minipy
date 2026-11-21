# MiniPy v4.73 更新说明

本轮收尾 `%` 格式化：补上 `%e`/`%E` 与 `*` 宽度/精度；顺带把"缺少缩进块"的报错文案对齐 CPython，
并把 `t107` 三条长期假红判成"探针缺 `expectError`"。补丁 **P146**。

产物 `MiniPy_v4.73.sb3`：Interpreter 19,144 块，合计 **20,573**，`check41` errors=0；
64 个历史版本全部可复现（v4.10…v4.73 MATCH）。

## 1. 问题

| 代码 | v4.72 | **v4.73**（= CPython） |
|---|---|---|
| `'%e' % 1234.5` | `1234.5`（掉到 `%s`） | `1.234500e+03` |
| `'%E' % 1234.5` | `1234.5` | `1.234500E+03` |
| `'%e' % 0.000123` | `0.000123` | `1.230000e-04` |
| `'%.2e' % -1234.5` / `'%+e' % 2.5` | `-1234.5` / `+2.5` | `-1.23e+03` / `+2.500000e+00` |
| `'%.2e' % 9.999` / `'%.0e' % 9.5` | `9.999` / `9.5` | `1.00e+01` / `1e+01`（进位要翻指数） |
| `'%*d' % (5, 3)` | `ValueError: unsupported format character '*'` | `    3` |
| `'%-*d' % (5, 3)` / `'%.*f' % (2, 3.14159)` | 同上 | `3    ` / `3.14` |
| `try:`…`finally:` 后不缩进 | `IndentationError: expected block` | `IndentationError: expected an indented block after 'finally' statement on line 3` |
| `if` / `for` / `def` / `class` 同理 | 同上 | `… after 'if' statement on line 1` / `… after function definition on line 1` / `… after class definition on line 1` |

`t107` 的 T3（`try/finally` 里异常要重抛）、T7（`finally` 里再抛）、T11（缺块报错）一直"红"：T3/T7 其实是
**探针缺 `expectError`**——MiniPy 会把未捕获错误同时写进自己的控制台（这是它的设计），而 CPython 只写
stderr，harness 逐字符比 `out` 就永远不等；T11 则是上面的文案问题。两条一起处理 ⇒ `t107` **9/12 → 12/12**。

## 2. 做法

* **`%e`/`%E`**：把绝对值规整到 `[1, 10)` 求指数（`0` 直接是 `0.000000e+00`），尾数用与 `%f` 相同的
  定点舍入，指数带符号且至少两位；舍入进到 `10.000` 时指数加一。`%E` 只是把字母换成大写——这里必须用
  MiniPy 的 `compareText` 而不是补丁里的 `EQ()`（后者是 Scratch 的 `=`，对字符串大小写不敏感）。
* **`*` 宽度/精度**：让 `pctfmt` 的规格扫描接受 `*`，然后在**读实参之前**把每个 `*` 换成"下一个实参"
  （`sfind` 找位置 + `substr` 拼接）。**坑**：一开始插在 `pctitem` 调用之前，可那时 `pvv` 已经取走了
  实参 ⇒ 宽度吃掉数值、`pctitem` 反而去格式化宽度（`'%*d' % (5, 3)` 打出 `[  5]`）。必须插在
  "读 `pvv`"那条之前。
* **缺块报错**：两个站点都在 `prepare`（不是 `execute`）；用 `prevhead` + `backline` 拼出
  `after '<头>' statement on line <行>`，`def`/`class` 换成 `function definition`/`class definition`。
  **坑**：`backline` 本身已是控制台打印的那个 1 基行号，我第一版又 `+1` ⇒ 行号多 1。

## 3. 实测

| 套件 | v4.72 | **v4.73** |
|---|---|---|
| `d223.json`（本轮新写 17 条：`%e`/`%E`/小数/负数/进位/宽度与 `%f` 对照、`%*d`/`%-*d`/`%.*f`/混用、`%05d` 等回归，五条缺块报错文案） | — | **17/17** |
| `t107`（`try/finally` 12 条） | 9/12 | **12/12**（T3/T7 补 `expectError`、T11 文案对齐） |
| `d221` 31 · `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `d202` 24 · `d204` 14 · `t133` 60 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `func` 31 · `demos` 12 · `tuple` 20 | — | **全绿** |
| 94 套快照 | — | **92 套逐例相同**，2 处差异都是**改进**：`t107` 的 T3/T7/T11 由假红变真绿 + featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.72 相同） |
| `check41.cjs` | 20,417 块 errors=0 | **20,573 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.72 共 63 版全 MATCH | **v4.10…v4.73 共 64 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 9 个变量，没有新增过程。

## 4. 前后对比

```
print('%e %E %.2e' % (1234.5, 1234.5, 9.999))
        v4.72: 1234.5 1234.5 9.999      => 1.234500e+03 1.234500E+03 1.00e+01

print('[%*d][%-*d][%.*f]' % (5, 3, 5, 3, 2, 3.14159))
        v4.72: ValueError              => [    3][3    ][3.14]

try:
    x = 1
finally:
print(1)                               v4.72: IndentationError: expected block
                                       => IndentationError: expected an indented block after 'finally' statement on line 3
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'%g'`/`'%G'` | 仍按 `%s` 打印（应取 `%e`/`%f` 中较短者） |
| `'%(a)s' % {'a': 1}`（映射键形式） | 报 `ValueError: unsupported format character '(' …`（以前是乱码） |
| `except (NameError, NoSuchError)` 这类子句的 NameError 优先级 | 仍缺（v4.67 记录） |
| 其它 `IndentationError` 文案（`unexpected indent`、`use 4 spaces`） | 仍是 MiniPy 自己的措辞 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.73.sb3
node _work/v41/run.mjs MiniPy_v4.73.sb3 _work/cmp47/d223.json  # %e/星号/缩进 17 条
node _work/v41/run.mjs MiniPy_v4.73.sb3 _work/cmp47/t107.json  # try/finally 12 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.73.sb3 -tag v473 -ref v472
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v473 -ref v472
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.73.sb3 -tag v473
node _work/v41/check41.cjs MiniPy_v4.73.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.72 还原： $env:V41_SKIP='P146'; $env:V41_OUT='…/MiniPy_v4.72.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.74）候选，按清单顺序

1. `%g`/`%G` 与 `'%(name)s'` 映射形式
2. `except (NameError, NoSuchError)` 这类子句的 NameError 优先级
3. 其余 `IndentationError` 文案（`unexpected indent` / `use 4 spaces`）
4. 清单 §F/§G 里剩下的项（F1/F2、G1–G6 已在近期验证全绿，G5 默认参数共享需要对象模型）
