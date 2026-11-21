# MiniPy v4.59 更新说明

本轮补上**多个 `except` 子句依次匹配**——`try/except A/except B` 以前只有**第一个**子句能接住，补丁 **P132**。

产物 `MiniPy_v4.59.sb3`：Interpreter 16,899 块，合计 **18,328**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；50 个历史版本全部可复现（v4.10…v4.59 MATCH）。

## 1. 为什么以前只有第一个子句有用

P51 给每个 `try` 只压一个帧：`TryHand` = 第一个子句的 body、`TryName` = 那个子句的名字。
`trycatch` 匹配不上时**直接弹帧并把错误继续往外抛**，所以后面的子句永远轮不到：

```
try:    raise ValueError('v')
except TypeError: print('T')
except ValueError as e: print('V', e)     # v4.58：ValueError 逃出去
```

P123 早就沿着同一条 `Elses` 子句链（`except → … → finally`）去找尾巴，所以"下一个子句"只差一次
列表查询：`Elses[子句行]`。**做法**：当前子句没匹配上时，沿着链往前走，对每个后继子句用同一套测试
（裸 `except`、`Exception`、名字前缀，以及 P129 加的"用户异常类沿 `ClsPar` 爬"），命中就跳进它的 body
并把 `error` 交给 `tlast`——和第一个子句的路径完全一致 ✓。

## 2. 三个坑（都靠日志定位）

1. **`tokenize` 在 `error` 非空时会直接罢工**：它的循环条件是"遇到错误就停"，所以读子句行之前必须
   把 `error` 藏起来（`t2err`），读完再放回去——否则每个候选行的 token 数都是 0
   （日志 `n=0 t1= t2=`）。
2. **`TryEnd` 不是"整个 try 的结尾"，而是"下一个子句"**：P51 的普通完成路径靠它逐个子句跳过 body，
   所以 `GT(t2x, last(TryEnd))` 这种边界会把第二个子句当成越过末尾。**做法**：只用
   `Elses[行] == 0`（链的尽头）做终止条件——`Elses` 只连子句头，返回 0 就表示没有下一个子句。
3. **`except X as e` 的绑定要自己再做一遍**：P112 的绑定只挂在"第一个子句命中"那条路径上，所以
   我的命中路径得自己抽 `as` 后面的名字、把 `:` 之后的文本 `assign` 给它（含 P129 修过的
   `substr` 起点/终点守卫）。

顺带一提：探针里别用 `KeyError` 比 `print(e)`——CPython 的 `str(KeyError('k'))` 是带引号的 `'k'`
（KeyError 自己的 repr 习惯），用 `ValueError`/`IndexError` 更干净。

## 3. 实测

| 套件 | v4.58 | **v4.59** |
|---|---|---|
| `d187.json`（本轮新写 10 条：二/三/四子句、裸 except、`Exception` 兜底、用户异常基类、第一个子句命中、嵌套 try、handler 里再抛由外层接住） | 3/10 | **10/10** |
| `t123.json`（`finally` 与跳转 29 条） | 29/29 | **29/29** |
| `t108` 14/14 · `t115b` 7/7 · `t115g` 3/3 · `t107` 9/12（既有） · `t115c` 32/33 · `gaps433` 61/63 | — | **不变** |
| `d165` 5/5 · `d166` 8/8（自定义异常） | 8/8 | **全绿** |
| 80 套快照（`demos`/`scope`/`d1`/`pan`/battery + 全部 `t*`/`gaps*`） | — | **80 套逐例相同**；差异只有 `t111h`/`t113` 的 CPython 集合哈希序与 featprobe3 的 `enumerate`/`zip` 内存地址 |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 18,216 块 errors=0 | **18,328 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.58 共 49 版全 MATCH | **v4.10…v4.59 共 50 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
try:  raise ValueError('v')
except TypeError: print('T')
except ValueError as e: print('V', e)      v4.58: ValueError: v（逃出去）  => V v

try:  raise IndexError('k')
except TypeError: print('T')
except ValueError: print('V')
except IndexError as e: print('K', e)                                       => K k

try:  raise IndexError('k')
except TypeError: print('T')
except: print('bare')                                                       => bare

try:  raise IndexError('i')
except ValueError: print('V')
except Exception as e: print('E', e)                                        => E i

class Base(Exception): pass
class Sub(Base): pass
try:  raise Sub('s')
except ValueError: print('V')
except Base as e: print('B', e)                                             => B s

try:
    try: raise IndexError('a')
    except ValueError: print('V')
    except IndexError: raise ValueError('b')
except ValueError as e: print('outer', e)                                   => outer b

# 全部子句都不匹配 → 照旧往外抛（不再被第一个子句"吞掉"）
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `except (A, B)` 元组子句 | 还没做（`Tok[2]` 是 `(`，名字取不到） |
| `except X as e` 的 `e` 对 `KeyError` | MiniPy 给的是 `k`，CPython 是 `'k'`（`str(KeyError)` 带引号） |
| `ZeroDivisionError` 等内建异常的消息 | 仍是裸类名（CPython 是 `division by zero`） |
| 菱形继承的 C3 顺序 | `class D(B, C)` 里 `super().hi()` 仍只走一个父类（`d159` E4） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.59.sb3
node _work/v41/run.mjs MiniPy_v4.59.sb3 _work/cmp47/d187.json  # 多子句 10 条
node _work/v41/run.mjs MiniPy_v4.59.sb3 _work/cmp47/t123.json  # finally 与跳转 29 条
node _work/v41/run.mjs MiniPy_v4.59.sb3 _work/cmp47/d166.json  # 自定义异常 8 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.59.sb3 -tag v460 -ref v459
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.59.sb3 -tag v459
node _work/v41/check41.cjs MiniPy_v4.59.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.58 还原： $env:V41_SKIP='P132'; $env:V41_OUT='…/MiniPy_v4.58.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.60）候选，按清单顺序

1. `except (A, B)` 元组子句（把子句的名字串成 `A,B` 再逐个测，和 P132 的 walk 天然配套）
2. `ZeroDivisionError` 等内建异常的消息文案（`division by zero` / `integer division or modulo by zero`）
3. 菱形继承的 C3 顺序（`d159` E4 是现成反例）
4. 嵌套"带关键字 sorted"的状态栈（P101 遗留）
