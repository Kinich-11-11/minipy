# MiniPy v4.119 更新说明

本轮补 **`dict.pop(key, default)`**。补丁 **P192**。

产物 `MiniPy_v4.119.sb3`：Interpreter 25,572 块，合计 **27,001**，`check41` errors=0。

## 1. 问题

| 代码 | v4.118（**错**） | **v4.119**（= CPython） |
|---|---|---|
| `d = {'a': 1}; d.pop('x', 9)` | `KeyError: 'x'` | `9`（且 `d` 不变） |
| `{}.pop('x', None)` | `KeyError: 'x'` | `None` |
| `d.pop('z', f)` / `d.pop('z', 3 + 4)` | `KeyError: 'z'` | 默认值（表达式求值） |
| `d.pop('q', [])` / `(1, 2)` / `{'k': 1}` | `KeyError: 'q'` | 默认值原样返回 |
| `d.pop('a', 9)`（键存在） | `1` ✓ | 不变 |
| `d.pop('x')`（无默认值） | `KeyError: 'x'` ✓ | 不变 |

## 2. 做法

`dictmeth` 的 get/pop 分支（P91）先查键：

* 查到 → 返回它的值（`pop` 还要重写记录串、去掉那一对）；
* 查不到 → 走 **`get`** 那条臂 —— P117 正是在那里插了
  `if meth == "pop" then fail(KeyError: '<键>')`。

所以缺的只是"第二个实参＝默认值"这一支，而 `get` 早就用**同一个判据**实现了它：

```
if tqhcm == 1 then eval(tqcpz + 1, hi) else (ev = ""; evtype = "Z")
```

本轮把那句 KeyError 包进同样的测试：有默认值就求值默认表达式（`eval` 会把值与类型都留在 `ev`/`evtype`），
没有就照旧抛错。**默认值里的逗号**（`d.pop('q', (1, 2))`、`d.pop('q', [1, 2])`）不受影响 ——
顶层逗号判据找的是第一个逗号，默认值的跨度是"逗号之后到 `hi`" ✓。

## 3. 实测

| 套件 | v4.118 | **v4.119** |
|---|---|---|
| `d273.json`（本轮新写 **27 条**：命中/未命中、`None`、变量、表达式、列表/元组/字典默认值、变量键、未命中后字典不变、命中后变短、表达式里用、循环里用、空字典、字符串与布尔默认值、嵌套调用与 f-string 默认值；缺键报错 3 条；`pop`/`get`/`popitem`/`setdefault`/`del`/推导式回归 6 条） | 10/27 | **27/27** |
| `d272` 29（split） · `d271` 31（index） · `d263` 24（join） · `d265` 32 · `d264` 32 · `d250` 26（路径写回） · `d249` 42 · `d248` 61（容器内容） | 全绿 | **全绿（不变）** |
| 快照 **142 套** | — | **138 套逐例相同**；4 处差异 = `d273` 的 17 条**由错转对** + `t111h` M4 / `t113` F6（CPython 集合遍历顺序；两版 MiniPy 输出逐字相同）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,996 块 errors=0 | **27,001 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.118 共 109 版全 MATCH | **v4.10…v4.119 共 110 版全 MATCH** |

本轮只多 5 块积木，**没有**新过程、新变量、新列表。

## 4. 前后对比

```
print({'a': 1}.pop('a', 9))        v4.118: 1                             v4.119: 1（不变）
print({'a': 1}.pop('x', 9))        v4.118: KeyError: 'x'                 v4.119: 9
print({}.pop('x', None))           v4.118: KeyError: 'x'                 v4.119: None
print({'a': 1}.pop('z', 3 + 4))    v4.118: KeyError: 'z'                 v4.119: 7
print({'a': 1}.pop('q', (1, 2)))   v4.118: KeyError: 'q'                 v4.119: (1, 2)
print({'a': 1}.pop('x'))           v4.118: KeyError: 'x'                 v4.119: KeyError: 'x'（不变）
```

## 5. 仍缺 / 下一轮（v4.120）候选

1. `min(xs, key=…)` / `max(xs, key=…)`
2. 扩展解包 `a, *rest = [1, 2, 3]`；内建 `*` 展开（`max(*xs)`）；`obj.m(*xs)`；字典 `|` 合并
3. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）
4. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`
5. `split(None)` / `split(None, maxsplit)`；`rsplit`；`d.pop('x', 9, 8)`（CPython 报太多实参）
6. 视图集合语义、非 ASCII

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.119.sb3
node _work/v41/run.mjs MiniPy_v4.119.sb3 _work/cmp47/d273.json   # dict.pop(k, default) 27 条
node _work/v41/run.mjs MiniPy_v4.119.sb3 _work/cmp47/d248.json   # 容器内容 61 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.119.sb3 -tag v4119 -ref v4118
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4119 -ref v4118
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.119.sb3 -tag v4119
node _work/v41/check41.cjs MiniPy_v4.119.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.118 还原： $env:V41_SKIP='P192'; $env:V41_OUT='…/MiniPy_v4.118.sb3'; $env:V41_STAMP='MiniPy v4.118 - built 2026-09-17'; node _work/v41/build41.js
```
