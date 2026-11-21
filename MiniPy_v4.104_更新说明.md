# MiniPy v4.104 更新说明

本轮补上 **`find` / `rfind` 的起始位置参数**：`'abcabc'.find('b', 2)`、`'abcabc'.rfind('b', 2)`。
以前两实参形式报 `TypeError: find() takes exactly one argument`（单实参形式 P18/P75/P174 早就有了）。
补丁 **P177**。

产物 `MiniPy_v4.104.sb3`：Interpreter 24,496 块，合计 **25,925**，`check41` errors=0。

## 1. 问题

| 代码 | v4.103（**错**） | **v4.104**（= CPython） |
|---|---|---|
| `'abcabc'.find('b')` / `.rfind('b')` | `1` / `4` ✓ | 不变 |
| `'abcabc'.find('b', 2)` | `TypeError: find() takes exactly one argument` | `4` |
| `'abcabc'.find('b', 5)` | 同上 | `-1` |
| `'abcabc'.rfind('b', 2)` | 同上 | `4` |
| `'abcabc'.rfind('b', 4)` | 同上 | `4` |
| `'abc'.find('', 1)` / `'abc'.rfind('', 1)` | 同上 | `1` / `3` |
| `'abc'.find('', 5)` / `.rfind('', 5)` | 同上 | `-1` / `-1` |
| `'abc'.find('b', 'x')` | 同上 | `TypeError: 'str' object cannot be interpreted as an integer` |

## 2. 做法

字符串派发在开始处就把**第一个实参求值进 `sma1`、第二个进 `sma2`**，第一个逗号的位置在 `mcut`，
所以"两实参形式"用 `mcut > 0` 就能认出来。两个新过程：

* **`sfind2 记录 子串 起点`**：从 1 基的 `起点 + 1` 往后走，用 `substr` 切片 +
  **`compareText`** 判等（Scratch 的 `=` 不分大小写），命中就把 1 基位置减一当答案，否则 `-1`；
* **`srfind2 记录 子串 起点`**：从"还能放下的最后一个位置"**往回**走到 `起点 + 1`，取最后一次命中。

**空子串**按 CPython 的怪癖单独处理：`find` 给 `起点`（起点超过长度则 `-1`），
**`rfind` 给长度**（起点超过长度则 `-1`）—— 第一版照 `find` 的写法两边都给起点，
`'abc'.rfind('', 1)` 就错成了 `1`（CPython 是 `3`）。

## 3. 实测

| 套件 | v4.103 | **v4.104** |
|---|---|---|
| `d258.json`（本轮新写 **14 条**：两实参 `find`/`rfind` 的命中/未命中/起点在末尾/起点越过/变量起点/起点 0/空子串（含越界与末位）/子串比剩余长/起点类型错/单实参回归） | 6/14 | **14/14** |
| `d257` 9 · `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **126 套** | — | **125 套逐例相同**；2 处差异 = `d258` 的 8 条由错转对 + `featprobe3`（地址噪声）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,812 块 errors=0 | **25,925 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.103 共 94 版全 MATCH | **v4.10…v4.104 共 95 版全 MATCH** |

新增 2 个过程（`sfind2` `srfind2`）、7 个变量（`p13*`）。

## 4. 仍缺 / 下一轮（v4.105）候选

1. **多访问器路径别名**（`b = a[0][1]`；补丁与两条结论留档 `_work/v41/_p176_twoaccessor.txt`）
2. `int('0b101', 2)`：带进制前缀的字符串 CPython 收，MiniPy 报 `ValueError`
3. `find`/`rfind`/`count` 的第三个参数 `end`（本轮只做了 `start`）、`split(sep, maxsplit)`
4. `min(xs, key=…)`/`max(xs, key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
5. 内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、视图集合语义、非 ASCII

## 5. 前后对比

```
print('abcabc'.find('b'))         v4.103: 1        v4.104: 1（不变）
print('abcabc'.find('b', 2))      v4.103: TypeError   v4.104: 4
print('abcabc'.rfind('b', 2))     v4.103: TypeError   v4.104: 4
print('abcabc'.find('b', 5))      v4.103: TypeError   v4.104: -1
print('abc'.find('', 1), 'abc'.rfind('', 1))
                                  v4.103: TypeError   v4.104: 1 3
print('abc'.rfind('', 5))         v4.103: TypeError   v4.104: -1
```

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.104.sb3
node _work/v41/run.mjs MiniPy_v4.104.sb3 _work/cmp47/d258.json   # find/rfind 起点 14 条
node _work/v41/run.mjs MiniPy_v4.104.sb3 _work/cmp47/d257.json   # 上一轮 9 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.104.sb3 -tag v4104 -ref v4103
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4104 -ref v4103
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.104.sb3 -tag v4104
node _work/v41/check41.cjs MiniPy_v4.104.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.103 还原： $env:V41_SKIP='P177'; $env:V41_OUT='…/MiniPy_v4.103.sb3'; $env:V41_STAMP='MiniPy v4.103 - built 2026-09-17'; node _work/v41/build41.js
```
