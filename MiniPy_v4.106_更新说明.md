# MiniPy v4.106 更新说明

本轮补上 **`count(sub, start)`**（起始位置形式）：`'abcabc'.count('b', 2)`。
以前两实参形式报 `TypeError: count() takes exactly one argument`。补丁 **P179**。

产物 `MiniPy_v4.106.sb3`：Interpreter 24,567 块，合计 **25,996**，`check41` errors=0。

## 1. 问题

| 代码 | v4.105（**错**） | **v4.106**（= CPython） |
|---|---|---|
| `'abcabc'.count('b')` | `2` ✓ | 不变 |
| `'abcabc'.count('b', 2)` | `TypeError: count() takes exactly one argument` | `1` |
| `'aaa'.count('a', 1)` | 同上 | `2` |
| `'abcabc'.count('bc', 1)` | 同上 | `2` |
| `'abcabc'.count('ab', 2)` | 同上 | `1` |
| `'abcabc'.count('z', 1)` | 同上 | `0` |
| `'abc'.count('a', 3)` / `'abcabc'.count('c', 5)` | 同上 | `0` / `1` |
| `'abc'.count('', 1)` | 同上 | `3` |
| `'abc'.count('a', 'x')` | 同上 | `TypeError: 'str' object cannot be interpreted as an integer` |

## 2. 做法

字符串派发在开始处就把第一个实参求值进 `sma1`、第二个进 `sma2`（第一个逗号位置在 `mcut`），
所以"两实参"用 `mcut > 0` 就能认出来（与 v4.104 的 `find`/`rfind` 同一套路）。
新过程 **`scount2 记录 子串 起点`** 把活交给现成的 `scount`：**切出 `起点` 之后的尾巴再数一遍**
（不重叠的计数对切片是可加的 ⇒ `count(sub, start)` 就等于 `count(sub)` 作用在 `s[起点:]` 上），
起点为负按 0 处理、起点超过长度直接给 0。**空子串**单独处理：切片的每个位置都算一次命中，
所以是 `len(切片) + 1`（`'abc'.count('', 1)` = 3）。

## 3. 一个坑（这一版的首个实现把解释器挂死了）

第一版自己写了扫描循环：`repeat until (i-1+len) > n`，命中就把 `i` 前进 `len`、否则前进 1 ——
**跑起来是死循环**（`status: Running`、20 秒超时后无输出、没有任何报错，只有 `d260` 里
`mini.out` 为空 + `ms≈20000` 这个症状）。与其继续查那个循环，**改成"切尾巴 + 复用 `scount`"** ——
代码更短，而且复用的是已经验证过的过程（这也是本项目一贯的做法：新功能尽量落在既有验证过的代码上）。

**顺带记录一个既有小 bug**：单实参的 `'abc'.count('')` 给 `0`（CPython 给 `4`）。
本轮先想顺手修掉，但 `scount` 那两个形参的引用方式没在一轮内确认清楚（改完 K6 仍红），
**为避免带病出货就把那处改动撤掉了**，留在清单里作为下轮候选。

## 4. 实测

| 套件 | v4.105 | **v4.106** |
|---|---|---|
| `d260.json`（本轮新写 **12 条**：两实参 `count` 的命中/多字符不重叠/子串跨边界/未命中/起点 0/起点在末尾/起点越过/空子串带起点/变量起点/起点类型错/单实参回归） | 3/12 | **12/12** |
| `d259` 12 · `d258` 14 · `d257` 9 · `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **128 套** | — | **125 套逐例相同**；4 处差异 = `d260` 的 9 条由错转对 + `t111h` M4 / `t113` F6（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,951 块 errors=0 | **25,996 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.105 共 96 版全 MATCH | **v4.10…v4.106 共 97 版全 MATCH** |

新增 1 个过程（`scount2`）、4 个变量（`p14*`）。

## 5. 仍缺 / 下一轮（v4.107）候选

1. **单实参 `count('')` 该给 `len+1`**（本轮发现的既有小 bug，改动撤掉了，见 §3）
2. **多访问器路径别名**（`b = a[0][1]`；补丁与两条结论留档 `_work/v41/_p176_twoaccessor.txt`）
3. `find`/`rfind`/`count` 的第三个参数 `end`（**当前字符串派发只求值两个实参**，
   没有 `sma3`/`smt3` ⇒ 要先给实参扫描加一段，属结构性改动）
4. `split(sep, maxsplit)`
5. `min(xs, key=…)`/`max(xs, key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`、
   内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、视图集合语义、非 ASCII

## 6. 前后对比

```
print('abcabc'.count('b'))      v4.105: 2            v4.106: 2（不变）
print('abcabc'.count('b', 2))   v4.105: TypeError    v4.106: 1
print('aaa'.count('a', 1))      v4.105: TypeError    v4.106: 2
print('abcabc'.count('bc', 1))  v4.105: TypeError    v4.106: 2
print('abc'.count('', 1))       v4.105: TypeError    v4.106: 3
print('abc'.count('a', 3))      v4.105: TypeError    v4.106: 0
```

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.106.sb3
node _work/v41/run.mjs MiniPy_v4.106.sb3 _work/cmp47/d260.json   # count 起点 12 条
node _work/v41/run.mjs MiniPy_v4.106.sb3 _work/cmp47/d259.json   # 上一轮 12 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.106.sb3 -tag v4106 -ref v4105
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4106 -ref v4105
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.106.sb3 -tag v4106
node _work/v41/check41.cjs MiniPy_v4.106.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.105 还原： $env:V41_SKIP='P179'; $env:V41_OUT='…/MiniPy_v4.105.sb3'; $env:V41_STAMP='MiniPy v4.105 - built 2026-09-17'; node _work/v41/build41.js
```
