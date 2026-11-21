# MiniPy v4.105 更新说明

本轮修掉 `int(x, base)` 的一个**既有 bug**：**带进制前缀的字符串**。
`int('0b101', 2)`、`int('0o17', 8)`、`int('0x1f', 16)` 以前一律报
`ValueError: invalid literal for int() with base 2: '0b101'`。补丁 **P178**。

产物 `MiniPy_v4.105.sb3`：Interpreter 24,522 块，合计 **25,951**，`check41` errors=0。

## 1. 问题

CPython 在**前缀与基数匹配**时会剥掉前缀，否则那些字母就是普通数字：

| 代码 | v4.104（**错**） | **v4.105**（= CPython） |
|---|---|---|
| `int('0b101', 2)` | `ValueError: invalid literal … '0b101'` | `5` |
| `int('0o17', 8)` | ValueError | `15` |
| `int('0x1f', 16)` | ValueError | `31` |
| `int('0B101', 2)` / `int('0X1F', 16)` | ValueError | `5` / `31` |
| `int('-0b11', 2)` / `int('-0xff', 16)` | ValueError | `-3` / `-255` |
| `int('0b101', 16)` | ValueError | `45313`（`0b101` 当十六进制：`b` 是数字） |
| `int('0x', 16)` / `int('0b12', 2)` | ValueError ✓ | ValueError（不变） |
| `int('101', 2)` / `int('42')` / `int(' 7 ')` | 正常 ✓ | 不变 |

## 2. 做法

`basenum`（P71）把字符串逐字符对照数字表取位。P178 只加**一步**：在它处理完正负号之后，
如果基数是 `2`/`8`/`16`、且文本是 `0` 后面跟着**与基数匹配**的 `b`/`o`/`x`，
就把 `bi` 前进两位（跳过前缀）。

* **"与基数匹配"才跳**：`int('0b101', 16)` 里 `0b` 不该被剥，`b` 本来就是十六进制数字
  （CPython 也是这个结果：`45313`）。
* **"后面还有字符"才跳**：这样 `int('0x', 16)` 不会被跳成空串而静默返回 `0`，
  而是照旧让数字循环遇到 `x` 报 `ValueError` ✓（与 CPython 的措辞一致）。

## 3. 实测

| 套件 | v4.104 | **v4.105** |
|---|---|---|
| `d259.json`（本轮新写 **12 条**：三种前缀、大写前缀、前缀不匹配基数、负数带前缀、无前缀回归、只有前缀报错、前缀后非法数字、零、十进制单参与空白、`bin`/`hex`/`oct` 回转） | 5/12 | **12/12** |
| `d258` 14 · `d257` 9 · `d255` 15 · `d254` 20 · `d253` 15 · `d252` 9 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）**（featprobe 248/259、`gaps433` 61/63、`frames` fib16 6388 均不变） |
| 快照 **127 套** | — | **125 套逐例相同**；3 处差异 = `d259` 的 7 条由错转对 + `t111h` M4（CPython 集合遍历顺序，MiniPy 两版输出一致）+ `featprobe3`（地址）⇒ **`ref true` 0，零回归** |
| `check41.cjs` | 25,925 块 errors=0 | **25,951 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.104 共 95 版全 MATCH | **v4.10…v4.105 共 96 版全 MATCH** |

新增 1 个变量（`bp2`），**没有**新过程、新列表。

## 4. 仍缺 / 下一轮（v4.106）候选

1. **多访问器路径别名**（`b = a[0][1]`；补丁与两条结论留档 `_work/v41/_p176_twoaccessor.txt`）
2. `find`/`rfind`/`count` 的第三个参数 `end`（`find`/`rfind` 的 `start` 已在 v4.104 交付）
3. `split(sep, maxsplit)`
4. `min(xs, key=…)`/`max(xs, key=…)`、扩展解包 `a, *rest = …`、`t = ([1],)` 后 `t[0].append(2)`
5. 内建 `*` 展开（`max(*xs)`）、`obj.m(*xs)`、字典 `|` 合并、视图集合语义、非 ASCII

## 5. 前后对比

```
print(int('0b101', 2))     v4.104: ValueError   v4.105: 5
print(int('0o17', 8))      v4.104: ValueError   v4.105: 15
print(int('0x1f', 16))     v4.104: ValueError   v4.105: 31
print(int('-0xff', 16))    v4.104: ValueError   v4.105: -255
print(int('0b101', 16))    v4.104: ValueError   v4.105: 45313
print(int('0x', 16))       v4.104: ValueError   v4.105: ValueError（不变）
print(int(bin(5), 2))      v4.104: ValueError   v4.105: 5
```

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.105.sb3
node _work/v41/run.mjs MiniPy_v4.105.sb3 _work/cmp47/d259.json   # int 进制前缀 12 条
node _work/v41/run.mjs MiniPy_v4.105.sb3 _work/cmp47/d258.json   # 上一轮 14 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.105.sb3 -tag v4105 -ref v4104
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4105 -ref v4104
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.105.sb3 -tag v4105
node _work/v41/check41.cjs MiniPy_v4.105.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.104 还原： $env:V41_SKIP='P178'; $env:V41_OUT='…/MiniPy_v4.104.sb3'; $env:V41_STAMP='MiniPy v4.104 - built 2026-09-17'; node _work/v41/build41.js
```
