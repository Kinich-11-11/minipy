# MiniPy v4.53 更新说明

本轮清掉上一轮定位到的**生成器表达式**缺口（`sum(x for x in xs)` / `f(x for x in xs)` / `g = (x for x in xs)`），
并顺手把 **`for a, b in <生成器>`** 的解包做通。补丁 **P126**：探针 `t141.json` **18/18**、`t143.json` **7/7**，
`t115c` 的 Y3 也从红转绿；缺口套件与全部既有回归**零退化**。

产物 `MiniPy_v4.53.sb3`：Interpreter 15,588 块，合计 **17,017**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 上一轮的定位结论（本轮直接照它下手）

给 `eval` 入口加一条日志（记录 `pc/head/lo/hi`）后，`print(sum(x for x in range(3)))` 的实际调用是：

```
EV pc=1 h=print 3,13      实参整体：sum(x for x in range(3))
EV pc=1 h=print 5,12      进 sum 之后：x for x in range(3)      ← 生成器表达式本体，确实交给了 eval
EV pc=1 h=print 5,7       ✗ 被当成二元运算符 in 的左操作数：x for x
EV pc=1 h=print 9,12      in 的右操作数：range(3)
```

所以问题不在实参切分（上一轮的猜测错了），而是 **`eval` 的运算符扫描先看到顶层的 `in`**，把 `x for x` 当左操作数
去求值，最后落在兜底 `SyntaxError: expression`。`for` 对运算符扫描来说不是一个 token。

## 2. 补丁清单

| 补丁 | 做法 |
|---|---|
| **P126a** 生成器表达式 | 在 **`eval` 最前面**（三元扫描与运算符扫描之前）加一段：span 超过 3 个 token 时扫一遍是否有**深度 0** 的 `for`，有就把整个 span 交给 `complist`（P125 已经让它可以处理任意条子句）并 `stop this script` 直接返回。语义与 `enumerate`/`zip` 的"立即求值"扩展一致：值是**列表**，所以 `len(g)`、第二次遍历、`print(g)` 都能用（CPython 是惰性生成器对象，打印成 `<generator object at 0x…>`） |
| **P126b** 生成器解包 | P89 的 `for a, b in <container>` / `a, b = <container>` 两道守卫只认 `L`/`T`，而 P97 早把 `G`（生成器）并进同一条列表遍历路径了——于是 `for a, b in g()` 报 "TypeError: cannot unpack non-iterable object"。把两处都放行 `G` |

## 3. 实测

| 套件 | v4.52 | **v4.53** |
|---|---|---|
| `t141.json`（生成器表达式 18 条） | 全红 | **18/18** |
| `t143.json`（生成器解包 7 条） | 2/4（`t142` 基线） | **7/7** |
| `t115c.json`（v4.47 探针 33 条） | 31/33 | **32/33**（Y3「yield 元组 for 解包」翻绿；只剩 S8 的 `split('\n')`，属 ASCII 显示限制） |
| `t139` / `t133` / `t123`（推导式 31 / 集合 60 / finally 29） | 全绿 | **全绿** |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| 其余 26 套 `cmp47` + 28 套 `_work/v41`（含 `demos`/`scope`/`d1`/`pan`） | — | **逐条相同**（`cmpout.cjs` 两侧对比 diff=0；只有 `t115c` Y3 变好） |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| 6 个 featprobe（259 条） | 242/259 | **242/259** |
| `check41.cjs` | 16,961 块 errors=0 | **17,017 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.52 共 43 版全 MATCH | **v4.10…v4.53 共 44 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
sum(x for x in range(3))                              v4.52: SyntaxError: expression => 3
sum(x * y for x in range(3) for y in range(3))        v4.52: NameError: x          => 9
list(x * 2 for x in range(3))                         v4.52: NameError: x          => [0, 2, 4]
max(x * x for x in range(4)) / any(x > 1 for x in range(3))                        => 9 / True
sorted(c for c in 'bca')                                                           => ['a', 'b', 'c']
g = (x + 1 for x in range(4)); print(list(g))                                      => [1, 2, 3, 4]
for a, b in g():  （g 里 yield i, i*10）               v4.52: TypeError: cannot unpack non-iterable object
                                                                                   => 0 0 / 1 10
a, b = g()  （同理，赋值侧的解包也放行了生成器）
# 主动的偏差（与 enumerate/zip 一致）：生成器表达式在 MiniPy 里是"立即求值成列表"
#   print(x for x in range(3))     MiniPy: [0, 1, 2]        CPython: <generator object at 0x…>
#   g = (x for x in xs); len(g)    MiniPy: 长度可用        CPython: TypeError
#   list(g) 两次                   MiniPy: 两次都是全部    CPython: 第二次是空的
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.53.sb3
node _work/v41/run.mjs MiniPy_v4.53.sb3 _work/cmp47/t141.json  # 生成器表达式 18 条
node _work/v41/run.mjs MiniPy_v4.53.sb3 _work/cmp47/t143.json  # 生成器解包 7 条
node _work/v41/run.mjs MiniPy_v4.53.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps453_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.53.sb3 -out _work/v41/battery_v453.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.53.sb3 -tag v453
node _work/v41/check41.cjs MiniPy_v4.53.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.52 还原： $env:V41_SKIP='P126'; $env:V41_OUT='…/MiniPy_v4.52.sb3'; node _work/v41/build41.js
```

## 6. 下一轮（v4.54）候选，按清单顺序

1. `super()` 与类属性继承（清单 §3 第 4 条；`t106c`/`t106d` 是现成探针）
2. 多重继承 `class C(A, B)`
3. `sorted(x, key=lambda …)`（featprobe3 的既有缺口）
4. 集合元素顺序 / `set()` 无参 / `issubset`（不保证项与次要缺口）
5. `split('\n')` 这类含控制字符的字符串（环境层 ASCII 显示限制，优先级最低）
