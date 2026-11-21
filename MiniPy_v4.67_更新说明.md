# MiniPy v4.67 更新说明

本轮补两个"同一套编码被当成两种东西"的漏子：**元组的 `index`/`count`** 和**`except` 子句里的未定义名字**。
补丁 **P140**。

产物 `MiniPy_v4.67.sb3`：Interpreter 18,027 块，合计 **19,456**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；58 个历史版本全部可复现（v4.10…v4.67 MATCH）。

## 1. 元组的方法

元组与列表在 MiniPy 里是**同一套编码**（`lcmp`/`sorted` 正是靠这一点比字典序），可 `methodcall` 只放行
类型标签 L/S/O：

| 代码 | v4.66 | **v4.67**（= CPython） |
|---|---|---|
| `(1, 2).index(2)` | `AttributeError: only lists have methods` | `1` |
| `(1, 2, 1).count(1)` | 同上 | `2` |
| `(1, 2).index(9)` | 同上 | `ValueError: tuple.index(x): x not in tuple` |
| `(1, 2).append(3)` | 同上 | `AttributeError: 'tuple' object has no attribute 'append'` |

做法：在接收者检查**之前**加一段——标签是 `T` 时，方法名是 `index`/`count` 就把 `xb` 临时改成 `L`
（复用列表方法那套实现），并用新变量 `x7tup` 记住"真实类型是元组"，好让 `list.index` 找不到时报的是
`tuple.index(x)` 的文案；其余方法直接抛 `'tuple' object has no attribute 'X'`。**坑**：同一个报告块
（`item('Tok', lo+2)`）不能同时放进两个比较里（Scratch 的一个块只能挂在一个输入上，第二次引用会把它
**搬走**，于是第一个比较永远为假）——每次现造一个。

## 2. 子句里的未定义名字

`except NoSuchError:` / `except (ValueError, NoSuchError):` 以前把未定义名**静默当成"不匹配"**
（元组子句里更会照常捕获错误）。CPython 在**匹配时**才去构造子句表达式，所以未定义的名字是 `NameError`，
哪怕元组里前一个名字本该命中：

```
try:    raise ValueError('v')
except (ValueError, NoSuchError) as e:   v4.66: 接住 → 'caught v'
    ...                                  v4.67: NameError: name 'NoSuchError' is not defined
```

做法：新过程 **`cknames`** 逐个校验 `clnames` 读出的名字（13 个内建异常名扫新列表 `ExcNames`，
否则交给 `iscls` 判用户类），校验点在**匹配路径**上——`trycatch` 的首个子句测试、以及 P132 那个
"往后走子句"的 walk 的每个候选子句。因为 `try:` 不抛异常时根本不会进匹配，所以

```
try:  x = 1
except NoSuchError:  pass      # 不报错（= CPython：子句表达式没被求值）
```

### 四个坑

1. **`fail %s` 在 `error` 非空时是空操作**（`if error == "": error = message`）。而这个校验**恰恰**
   发生在"已有异常正在传播"时 ⇒ `FAILB(...)` 什么都没做。调试日志里检测全对（`ev=1`/`ev=0` 都对），
   程序却照常打印 `caught`，就是这个原因。
2. **walk 每轮都会把 `error` 从 `t2err` 恢复回来**（`error = ''` → 重新切词 → `error = t2err`），
   所以新的消息不能直接写在 `error` 上。最终方案：消息先停在新变量 **`x7bad`** 里，等**帧真被弹掉那一刻**
   再搬进 `error` ⇒ 本 try 的子句永远接不住这个 `NameError`，外层 `except NameError` 才能接住。
   walk 里另外把 `t2hit` 清零、`t2x` 归零，保证"名字坏掉的那个子句"不会被跳进去执行。
3. **`c3nm` 是共享的草稿全局量**：`clnames` 给每个 `try` 读子句时都写它，而 `try/finally` 的
   `finally` 那一行**也要**用它读（P123）——于是嵌套 `try/finally` 之后，外层匹配时 `c3nm` 里躺着
   关键字 `finally`，检查就会报 `NameError: name 'finally' is not defined`（`t107` T6 / `t107b` U3/U4
   当场翻红）。改成从**本帧自己的 `tnm`**（`tnm = last(TryName)`）取名字。
4. 一个小的实现坑：`0 = ''` 在 Scratch 的 `=` 里是**假**，所以 `x7bad` 用数值 0 初始化时，
   `not (x7bad == '')` 守卫会放行、把 `error` 写成数字 `0`（探针报 `Line 2: 0`）。改成
   **`length(x7bad) != 0`** 判断。

## 3. 实测

| 套件 | v4.66 | **v4.67** |
|---|---|---|
| `d204.json`（本轮新写 14 条：元组 `index`/`count`/找不到/负下标/重复元素/字符串元组、元组上的其它方法报错、列表方法不受影响；子句 NameError 7 条） | — | **14/14** |
| `d190`（异常文案 46 条） | 43/46 | **44/46**（C4 元组 index 变正确） |
| `t107b`（finally 后外层接住） | 5/5 | **5/5** |
| `t107` | 9/12（T3/T7/T11 既存） | **9/12**（同上，T6 保持正确） |
| `t123` 29 · `d187` 10 · `d189` 14 · `t133` 60 · `tuple` 20 | — | **全绿** |
| 93 套快照 | — | **91 套逐例相同**，2 处差异 = `d190` C4 **变正确** + featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 19,372 块 errors=0 | **19,456 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.66 共 57 版全 MATCH | **v4.10…v4.67 共 58 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 5 个变量（`x7tup` `x7k` `x7name` `x7i` `x7bad`）、1 个列表（`ExcNames`）、2 个过程（`isknown`、`cknames`）。

## 4. 前后对比

```
print((1, 2).index(2), (1, 2, 1).count(1))      v4.66: AttributeError: only lists have methods
                                                => 1 2

try:    print((1, 2).index(9))
except ValueError as e: print(e)                v4.66: AttributeError …  => tuple.index(x): x not in tuple

try:    (1, 2).append(3)
except AttributeError as e: print(e)            => 'tuple' object has no attribute 'append'

try:
    try:    raise ValueError('v')
    except (ValueError, NoSuchError) as e: print('caught', e)
except NameError as e: print('E:', e)           v4.66: caught v   => E: name 'NoSuchError' is not defined
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `except (NameError, NoSuchError)` 这种"坏名字与 `NameError` 同列"的子句 | 匹配时会先被 `NameError` 前缀命中而进 handler（CPython 直接抛 NameError）；极边缘 |
| `super()` 钩子只认"整段就是 `super().m(...)`"（两个 super 连用、`super().m().n()`） | 仍缺（v4.62 记录） |
| 任意值当函数调用 / 属性访问（`1()`、`(1).foo`）现在报 `SyntaxError`，应是 `TypeError`/`AttributeError` | 仍缺 |
| `%` 的字符串格式化边界 | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.67.sb3
node _work/v41/run.mjs MiniPy_v4.67.sb3 _work/cmp47/d204.json  # 元组方法 + 子句 NameError 14 条
node _work/v41/run.mjs MiniPy_v4.67.sb3 _work/cmp47/d190.json  # 异常文案 46 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.67.sb3 -tag v467 -ref v466
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v467 -ref v466
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.67.sb3 -tag v467
node _work/v41/check41.cjs MiniPy_v4.67.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.66 还原： $env:V41_SKIP='P140'; $env:V41_OUT='…/MiniPy_v4.66.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.68）候选，按清单顺序

1. `super()` 钩子只认"整段就是 `super().m(...)`"（两个 super 连用、`super().m().n()`，`d193` T6）
2. 任意值当函数调用 / 属性访问（`1()`、`(1).foo`）：现在报 `SyntaxError`，应是 `TypeError`/`AttributeError`
3. `%` 的字符串格式化边界
4. `try/finally` 的既存三项（`t107` T3 异常路径要重抛、T7 finally 里再抛、T11 finally 空块报错）
