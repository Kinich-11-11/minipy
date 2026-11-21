# MiniPy v4.101 更新说明

本轮补齐字符串接口剩下的四个缺口：**`rfind`**、**`rindex`**、**`casefold`**、
以及 **`strip` / `lstrip` / `rstrip` 的字符集形式**（`'xxabcxx'.strip('x')`）。补丁 **P174**。

产物 `MiniPy_v4.101.sb3`：Interpreter 24,151 块，合计 **25,580**，`check41` errors=0。

## 1. 问题

| 代码 | v4.100（**错**） | **v4.101**（= CPython） |
|---|---|---|
| `'abcabc'.rfind('b')` | `AttributeError: str has no method rfind` | `4` |
| `'abc'.rfind('z')` / `'abc'.rfind('')` | AttributeError | `-1` / `3` |
| `'abcabc'.rindex('b')` | AttributeError | `4` |
| `'abc'.rindex('z')` | AttributeError | `ValueError: substring not found` |
| `'AbC'.casefold()` | AttributeError | `abc` |
| `'xxabcxx'.strip('x')` | `xxabcxx`（**没剥**，只认空白） | `abc` |
| `'xxabcxx'.lstrip('x')` / `rstrip('x')` | 同上 | `abcxx` / `xxabc` |
| `'ab.  '.strip(' .ab')` | `ab.`（按空白剥） | `''` |
| `'  a  '.strip()` | `a` ✓ | `a`（不变） |

## 2. 做法

字符串派发是 `methodcall` 的 S 段末尾那一串 `if smmeth == "名字"`，末尾跟一条
`if 不是已知名字 then AttributeError` 的守卫；**第一个实参已经在 `sma1` 里**，所以：

* **`srfind 记录 子串`**：从"能放下的最后一个位置"往回走，用 `substr` 切片 +
  **`compareText`** 判等（Scratch 的 `=` **不分大小写**，内容相等必须走 `compareText`），
  命中就把 1 基位置减一当答案；空子串按 CPython 返回**长度**。
* **`rindex`** = `srfind` + 结果为 `-1` 时报 `ValueError: substring not found`。
* **`casefold`**：ASCII 世界里与 `lower()` 相同，直接复用现成的 `scase(记录, 'lower')`。
* **`strim2 值 字符集 模式`**：从两端各剥一次，判"这个字符在字符集里吗"用新过程
  **`sinstr 字符 集合`**——逐字符 `compareText`，因为 `contains` 同样**不分大小写**
  （`'AaA'.strip('a')` 必须是 `AaA`）。**有实参才走这条**（判据是 `(` 与 `)` 之间的跨度非空，
  不是 `mcut`——只有一个实参时根本没有逗号），否则仍旧走 P167 的 `strim`（剥空白）。
* 守卫那棵条件树按 P75 的老办法再包一层 `AND(旧条件, NOT(新名字))`。

**两个坑**：①**守卫的顶层已经不是一个 `not` 了**——P75（以及后来的 P167）把条件包成了
`and(not(...), not(...))`，所以按"条件是 `operator_not`"去找锚点会命中 **0** 个；
要先在整棵树里找那个**含 `not(smmeth == "join")` 的 `not`**，再找包含它的 `if`。
②**"上一轮的结果"当循环条件是反的**：剥字符的循环写成
`repeat until (到头 or 上一轮没命中)`，而第一轮开始前这个标志还是上一轮**遗留**的值
（初值 0）⇒ 循环一次都不进（症状：`strip('x')` 一个字符都没剥）。要在循环前**先置 1** 打底。
另外 `rfind` 的起点是 `len(s) - len(p) + 1`（1 基），少加这个 1 会让 `'ab'.rfind('ab')` 直接是 `-1`、
`'abcabc'.rfind('c')` 变成**第一个**匹配的位置。

## 3. 实测

| 套件 | v4.100 | **v4.101** |
|---|---|---|
| `d254.json`（本轮新写 **20 条**：`rfind` 命中/未命中/空串/整串/变量参数/函数内、`find` 对比、`rindex` 命中与报错、`casefold` 与 `lower` 对比与相等、`strip`/`lstrip`/`rstrip` 的字符集/多字符集/全剥/未命中/大小写敏感、无参仍是空白、链式调用） | 4/20 | **20/20** |
| `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 · `d247` 45 · `d246` 64 · `d245` 30 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **123 套** | — | **121 套逐例相同**；3 处差异 = `d254` 的 17 条由错转对 + `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,422 块 errors=0 | **25,580 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.100 共 91 版全 MATCH | **v4.10…v4.101 共 92 版全 MATCH** |

新增 3 个过程（`sinstr` `strim2` `srfind`）、7 个变量（`r2*` `s8*`）。

## 4. 仍缺 / 下一轮（v4.102）候选

1. `enumerate(xs, start)`（P99 的 enumerate 构造器在产物里还没定位到：`xsp`/`xsi` 没出现在
   `callfn` 的任何赋值里，需先重新找那段代码）
2. `min/max(key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
3. 多访问器的路径别名（`b = a[0][1]`）与非名字基名（`b = f()[0]`）
4. 内建 `*` 展开（`max(*xs)`）与方法调用解包 `obj.m(*xs)`、字典 `|` 合并
5. 视图集合语义（`d.keys() == {'a'}`、`&`/`|`/`<`）、`find`/`rfind` 的 `start`/`end` 参数、非 ASCII

## 5. 前后对比

```
print('abcabc'.rfind('b'))      v4.100: AttributeError   v4.101: 4
print('abc'.rindex('z'))        v4.100: AttributeError   v4.101: ValueError: substring not found
print('AbC'.casefold())         v4.100: AttributeError   v4.101: abc
print('xxabcxx'.strip('x'))     v4.100: xxabcxx          v4.101: abc
print('ab.  '.strip(' .ab'))    v4.100: ab.              v4.101: （空串）
print('AaA'.strip('a'))         v4.100: AaA              v4.101: AaA（大小写敏感，不变）
print('  a  '.strip())          v4.100: a                v4.101: a（不变）
print('xxAbCxx'.strip('x').casefold())
                                v4.100: AttributeError   v4.101: abc
```

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.101.sb3
node _work/v41/run.mjs MiniPy_v4.101.sb3 _work/cmp47/d254.json   # 字符串接口 20 条
node _work/v41/run.mjs MiniPy_v4.101.sb3 _work/cmp47/d253.json   # 上一轮 15 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.101.sb3 -tag v4101 -ref v4100
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4101 -ref v4100
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.101.sb3 -tag v4101
node _work/v41/check41.cjs MiniPy_v4.101.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.100 还原： $env:V41_SKIP='P174'; $env:V41_OUT='…/MiniPy_v4.100.sb3'; $env:V41_STAMP='MiniPy v4.100 - built 2026-09-17'; node _work/v41/build41.js
```
