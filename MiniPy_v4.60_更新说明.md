# MiniPy v4.60 更新说明

本轮补上 **`except (A, B)` 元组子句**——`try` 的子句名字一直取自 `Tok[2]`，元组子句里那个 token 是
`(`，于是 `except (ValueError, IndexError):` 存下来的"名字"是 `(`，永远匹配不上、立刻往外抛。
补丁 **P133**。

产物 `MiniPy_v4.60.sb3`：Interpreter 17,042 块，合计 **18,471**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；51 个历史版本全部可复现（v4.10…v4.60 MATCH）。

## 1. 为什么元组子句接不住

`try` 压帧时只记一个名字（P51 的 `tnm = Tok[2]`，P132 的 walk 里 `t2n = Tok[2]`），而
`except (ValueError, IndexError):` 的 token 是 `['except','(','ValueError',',','IndexError',')']`，
`Tok[2]` 正好是 `(`：

```
try:    raise IndexError('k')
except (ValueError, IndexError) as e: print('K', e)
# v4.59：error 前缀不是 "(" → 没人接 → IndexError: k 逃出去
```

## 2. 做法：`clnames` 读文本，`excmatch` 逐个测

* **`clnames`**（无参，用全局 `c3line` 收行号）把子句行**当文本**读：`Code[c3line]` → 切掉 ` as e`
  → 切掉 `:` → 跳过 `except` 关键字本身 → 逐字符保留"标识符字符和逗号"，于是空格、制表符、
  元组括号全都自动消失，`except A as e:` 和 `except (A, B) as e:` 都得到 `A` / `A,B`。
  两个取名字的地方（P51 的 try 分支、P132 的 walk）都改成 `clnames` + 赋值。
* **`excmatch`**（无参，读 `c3nm`）把错误文本按逗号切成名字逐个测：`Exception` 直接命中，
  否则 `sprefix(错误, 名字, startswith)` 前缀测试，再否则走 P129 的"用户异常类沿 `ClsPar` 爬"
  （复用 `iscls`+`isanc`）。答案放在 `ev`。
* 两个调用点在**原来的单名前缀测试之前**各插一个"含逗号才走"的分支（`tnm` / `t2n`），
  命中就置 `tcl` / `t2hit`。单名子句的路径一个字都没动，所以 `except ValueError:` 行为完全不变
  （P129 的类内联测试也照旧）。

## 3. 三个坑（都靠 `DbgL` 日志定位）

1. **`Tok` 会被重新切词污染**：第一版 `clnames` 是走 `Tok` 的，同一行代码两次运行竟然得到
   `ValueError,,,IndexError` 和 `,,,,IndexError` 两个不同的结果（`tokenize` 在 walk、嵌套 eval 里都
   会重写 `Tok`），于是"第二个名字永远测不到"。**改成读 `Code[行]` 文本**后彻底免疫。
2. **`IFELSE` 少写 else 分支会在构建期炸**：`IF(cond,[...])` 是两个参数、`IFELSE(cond,a,b)` 是三个，
   内层 `IFELSE` 写完忘了外层的 else → `chain(undefined)` → `TypeError`。这是本项目第三次踩
   "else 参数"（前两次是 `IF` 的第三参被静默丢掉）。
3. **"切掉"和"跳过"是两回事**：切掉 ` as ` 和 `:` 用的是 `substr(1, sfind(...))`，而 `except` 关键字
   本身得用 `substr(sfind+7, len)` **跳过**。第一版把 `except` 也当"切点"，于是 `c3nm = ''`——
   空名字在旧语义里等于裸 `except`，所有错误都被接住，探针 9/14 假绿；日志里
   `cn=`（空）才对上号。
   顺带修了名字切片的**差一错误**（`sfind` 给的是 0 基下标，`substr` 的区间是闭区间）。

另：`except (ValueError,)` 这种单元素元组会留下一个空片段，`excmatch` 现在**跳过空名**
（空名只在"整串为空"时才等于裸 `except`，而那条路径根本不会调用 `excmatch`）。

## 4. 实测

| 套件 | v4.59 | **v4.60** |
|---|---|---|
| `d189.json`（本轮新写 14 条：第 1/2/3 项命中、不匹配则后续子句接住、不匹配则抛出、元组内 `Exception`、元组含用户异常基类、单元素元组、带空格的元组 + `as`、元组后的裸 `except`、嵌套 try、循环里连中两次、多个用户异常） | —— | **14/14** |
| `d187.json`（v4.59 的多子句 10 条） | 10/10 | **10/10** |
| `t123`（`finally` 与跳转 29 条） · `try` 12 条 · `d165`/`d166`（自定义异常） | 全绿 | **不变** |
| 84 套快照（`demos`/`scope`/`d1`/`pan`/battery + 全部 `t*`/`gaps*`/`d*`） | — | **82 套逐例相同**；差异只有 `t111h` 的 CPython 集合哈希序与 featprobe3 的 `enumerate`/`zip` 内存地址（既有噪声） |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 18,328 块 errors=0 | **18,471 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.59 共 50 版全 MATCH | **v4.10…v4.60 共 51 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 13 个变量（`c3nm c3i c3n c3p c3off c3one c3hit c3this c3line c3s c3c c3k c3pc`），
列表数不变（97）。

## 5. 前后对比

```
try:  raise IndexError('k')
except (ValueError, IndexError) as e: print('K', e)      v4.59: IndexError: k（逃出去）  => K k

try:  raise TypeError('t')
except (ValueError, TypeError, IndexError) as e: print('T', e)                      => T t

try:  raise IndexError('k')
except (ValueError, TypeError) as e: print('A', e)
except IndexError as e: print('K', e)                                               => K k

try:  raise IndexError('k')
except (ValueError, TypeError): print('A')                                          => 照旧抛出 IndexError

try:  raise IndexError('i')
except (ValueError, Exception) as e: print('E', e)                                  => E i

class Base(Exception): pass
class Sub(Base): pass
try:  raise Sub('s')
except (ValueError, Base) as e: print('B', e)                                       => B s

try:  raise IndexError('k')
except ( ValueError , IndexError ) as e: print('K', e)                              => K k（空格随意）

try:  raise ValueError('v')
except (ValueError,): print('one')                                                  => one
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `except X as e` 的 `e` 对 `KeyError` | MiniPy 给的是 `k`，CPython 是 `'k'`（`str(KeyError)` 带引号） |
| `ZeroDivisionError` 等内建异常的消息 | 仍是裸类名（CPython 是 `division by zero`） |
| 菱形继承的 C3 顺序 | `class D(B, C)` 里 `super().hi()` 仍只走一个父类（`d159` E4） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留） |
| `except (A, B)` 里写未定义的名字 | CPython 求值元组时抛 `NameError`，MiniPy 只当普通不匹配（未对齐） |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.60.sb3
node _work/v41/run.mjs MiniPy_v4.60.sb3 _work/cmp47/d189.json  # 元组子句 14 条
node _work/v41/run.mjs MiniPy_v4.60.sb3 _work/cmp47/d187.json  # 多子句 10 条
node _work/v41/run.mjs MiniPy_v4.60.sb3 _work/cmp47/t123.json  # finally 与跳转 29 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.60.sb3 -tag v460 -ref v459
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v460 -ref v459
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.60.sb3 -tag v460
node _work/v41/check41.cjs MiniPy_v4.60.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.59 还原： $env:V41_SKIP='P133'; $env:V41_OUT='…/MiniPy_v4.59.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.61）候选，按清单顺序

1. `ZeroDivisionError` 等内建异常的消息文案（`division by zero` / `integer division or modulo by zero`）
2. 菱形继承的 C3 顺序（`d159` E4 是现成反例）
3. 嵌套"带关键字 sorted"的状态栈（P101 遗留）
4. 元组子句里的未定义名字应报 `NameError`（本轮新发现的边界）
