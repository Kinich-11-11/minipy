# MiniPy v4.72 更新说明

本轮把 **`%` 格式化**补厚：标志位（`0`/`+`/空格）、`%x`/`%X`/`%o`/`%r`/`%c`，以及两条一直缺的报错
（非法转换符、多余参数）。补丁 **P145**。

产物 `MiniPy_v4.72.sb3`：Interpreter 18,988 块，合计 **20,417**，`check41` errors=0；
63 个历史版本全部可复现（v4.10…v4.72 MATCH）。

## 1. 问题：只认 `%d`/`%f`/`%s`，其余静默算错

P77 的 `pctfmt`/`pctitem` 只会 `-` 标志、宽度、`.` 精度与 `d`/`f`/`s` 三种转换，别的都"悄悄按 `%s` 处理"
或干脆跳过：

| 代码 | v4.71 | **v4.72**（= CPython） |
|---|---|---|
| `'%05d' % 42` | `[   42]` | `[00042]` |
| `'%05d' % -42` | `[  -42]` | `[-0042]`（符号在零前面） |
| `'%+d' % 5` / `'% d' % 5` | `5` / `5` | `+5` / ` 5` |
| `'%x' % 255` / `'%o' % 8` | `255` / `8` | `ff` / `10` |
| `'%X' % 255` / `'%x' % -255` | `255` / `-255` | `FF` / `-ff` |
| `'%r' % 'a'` | `a` | `'a'` |
| `'%c' % 65` | `65` | `A` |
| `'%q' % 1` | 打印 `1`（不报错） | `ValueError: unsupported format character 'q' (0x71) at index 1` |
| `'%d' % (1, 2)` | 静默丢掉第二个参数 | `TypeError: not all arguments converted during string formatting` |
| `'a' % 1` | 打印 `a` | 同上 TypeError |
| `'%d'`/`'%5.2f'`/`'%-5d'`/`'%%'`/f-string | 正常 | **不变** |

## 2. 做法

* **`pctitem` 重写**：真正的标志位解析（`-`、`0`、`+`、空格，任意顺序、可重复），再解析宽度与精度；
  转换符增加 `i`、`x`/`X`/`o`（按基数循环取位，数字表 `0123456789abcdef`）、`r`（走 P10 的 `reprval`）、
  `c`（走 `cs` 字母表：`letter (code-31) of cs`）。`+`/空格标志在数值转换后补符号；零填充**插在符号之后**。
* **`pctfmt` 补两条检查**：①转换符不在 `diouxXeEfFgGrcs` 里 → 按 CPython 报
  `ValueError: unsupported format character '<c>' (0x<hex>) at index <i>`（hex 由 `ord`（在 `cs` 里找位置
  +31）再除 16 取位拼出）；②循环结束后还有没被消耗的参数 → `TypeError: not all arguments converted
  during string formatting`。
* **又一个必须记住的坑**：补丁里的 `EQ()` 是 Scratch 的 `=`，对字符串是**大小写不敏感**的
  （MiniPy 语言里的 `==` 才区分大小写，它走 `compareText`）。我写 `IF(EQ(conv,'X'), 用大写数字表)`
  时，`'%x'` 也被判成 `X` ⇒ 输出 `FF`。要区分大小写必须用 `compareText`（`EQ(VAR('cmp'), num(0))`）。
  另外十六进制取位那条我一开始写成**追加**（`ptx + 数字`），得到 `01` 而不是 `10`——最高位要先出。

## 3. 实测

| 套件 | v4.71 | **v4.72** |
|---|---|---|
| `d221.json`（本轮新写 31 条：`%d`/`%5d`/`%-5d`/`%05d`/`%+d`/`% d`/`%.2f`/`%8.3f`/`%x`/`%X`/`%o`/`%s`/`%r`/`%c`/`%%`/元组与单值参数/宽度精度组合/f-string，三条报错，外加"字符串与字典键区分大小写"两条反向用例） | — | **31/31** |
| `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `d202` 24 · `t133` 60 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `func` 31 · `demos` 12 | — | **全绿** |
| 94 套快照 | — | **93 套逐例相同**，唯一差异是 featprobe3 的内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.71 相同） |
| `check41.cjs` | 20,237 块 errors=0 | **20,417 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.71 共 62 版全 MATCH | **v4.10…v4.72 共 63 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 10 个变量，没有新增过程（`pctitem` 整体重写）。

## 4. 前后对比

```
print('[%05d] [%+d] [% d]' % (42, 5, 5))
        v4.71: [   42] [5] [5]      => [00042] [+5] [ 5]

print('%x %X %o' % (255, 255, 8))   v4.71: 255 255 8   => ff FF 10
print('%r %c' % ('a', 65))          v4.71: a 65        => 'a' A

try:    '%d' % (1, 2)
except TypeError as e: print(e)     v4.71: （打印 1）  => not all arguments converted during string formatting
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'%e' % 1234.5` | 仍按 `%s` 打印（应 `1.234500e+03`）；`%g` 同理 |
| `'%(a)s' % {'a': 1}`（映射键形式） | 现在报 `ValueError: unsupported format character '(' …`（以前是乱码） |
| `'%*d' % (5, 3)`（星号宽度/精度） | 同上，报非法转换符 |
| `try/finally` 的三项既存问题（`t107` T3/T7 是"探针缺 `expectError`"的假红、T11 是报错文案） | 仍缺 |
| `except (NameError, NoSuchError)` 这类子句的 NameError 优先级 | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.72.sb3
node _work/v41/run.mjs MiniPy_v4.72.sb3 _work/cmp47/d221.json  # % 格式化 31 条
node _work/v41/run.mjs MiniPy_v4.72.sb3 _work/cmp47/d220.json  # dict(x) 20 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.72.sb3 -tag v472 -ref v471
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v472 -ref v471
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.72.sb3 -tag v472
node _work/v41/check41.cjs MiniPy_v4.72.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.71 还原： $env:V41_SKIP='P145'; $env:V41_OUT='…/MiniPy_v4.71.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.73）候选，按清单顺序

1. `%e`/`%E`/`%g`（科学计数法/通用格式）
2. `'%(name)s'` 映射形式与 `'%*d'` 星号宽度（都要 `pctfmt` 能拿到"下一个参数"）
3. `try/finally` 的 T11 报错文案（`IndentationError: expected an indented block after 'finally' statement on line N`）+ 给 T3/T7 补 `expectError`
4. `except (NameError, NoSuchError)` 这类子句的 NameError 优先级
