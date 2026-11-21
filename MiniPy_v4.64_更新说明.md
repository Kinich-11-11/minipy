# MiniPy v4.64 更新说明

本轮收掉清单里"P101 遗留"的那条：**嵌套的带关键字 `sorted`**。补丁 **P137**。

产物 `MiniPy_v4.64.sb3`：Interpreter 17,723 块，合计 **19,152**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；55 个历史版本全部可复现（v4.10…v4.64 MATCH）。

## 1. 为什么嵌套就炸

`sorted(…)` 的关键字形式由 **P130 的 eval 钩子**处理（P101 的关键字钩子已被它接管）。这个钩子把解析状态
放在一堆全局量里（`p4c` 逗号位置、`p4klo/p4khi` 关键字范围、`p4rlo/p4rhi`、`p4list`…）。而**求值"被排序的
那个表达式"本身就是一次 eval**，所以

```python
print(sorted(sorted(xs, key=lambda p: -p), reverse=True))
#            └── 内层先跑，把 p4c 冲掉了
```

内层调用跑的是同一个钩子、把这些全局量全部覆盖；外层回来时 `p4pos = p4c + 1` 已经是垃圾位置，
接着按垃圾位置去 `hascomma`/`eval`，就在 token 深度检查里报 `SyntaxError: parentheses`
（探针 `d176` S2，清单里挂了很久的"P101 遗留"）。

## 2. 做法：给钩子加状态栈

和 P127 处理 `cmet`/`self`、P125 处理推导式循环变量一样：**钩子接管时把整套全局标量压进 `P4Stk`，
结束前按相反顺序弹回**（`p137.txt`）。嵌套调用在入口压的是"外层此刻的值"，于是它退出时的弹出
**正好把外层恢复到进入它之前的状态**：

```
外层: push → p4c = 逗号位置 → eval(内层)
内层:                     push(存下外层的 p4c…) → …自己的解析… → pop(外层 p4c 回来了)
外层: 继续用 p4c ✓
```

压的是 `p130.txt` 里那 29 个标量（钩子 + `srtkey` 用到的全部临时量）。**三个 `srtkey` 工作列表
（`P4Key`/`P4KeyT`/`P4Used`）没有压**——只有"在 key 函数里再调用一次**带关键字**的 sorted"才会踩到它们；
实测那种写法现在也通过（探针 N5），但时序上是靠运气，仍算已知边界。

## 3. 实测

| 套件 | v4.63 | **v4.64** |
|---|---|---|
| `d176.json`（sorted 关键字 6 条，S2 是清单里那条） | 5/6 | **6/6** |
| `d200.json`（本轮新写 8 条：两层/三层嵌套、`reverse=` 值是嵌套调用、key 函数里再 sorted（带关键字/不带）、推导式里、两个关键字任意顺序、参数里嵌套） | —— | **8/8** |
| `d173` 4 · `d174` 8 · `d178` 3 · `d168` 5/6（既有：元组排序） | — | **不变** |
| `comp` 10 · `func` 31 · `str` 12 · `t133` 60 | — | **全绿** |
| 90 套快照 | — | **87 套逐例相同**；3 处差异 = `d176` S2 **由 fail 翻 pass** + `t113` 的 CPython 集合哈希序 + featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 19,006 块 errors=0 | **19,152 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.63 共 54 版全 MATCH | **v4.10…v4.64 共 55 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 1 个列表（`P4Stk`），变量数不变（780）。

## 4. 前后对比

```
xs = [3, 1, 2]
print(sorted(sorted(xs, key=lambda p: -p), reverse=True))
#   v4.63: SyntaxError: parentheses        => [3, 2, 1]

print(sorted(sorted(sorted(xs, reverse=True), key=lambda p: -p), reverse=True))    => [1, 2, 3]
print(sorted([3, 1, 2], reverse=sorted([1, 0])[0] == 1))                            => [3, 2, 1]
print(sorted([[2, 1], [1, 5]], key=lambda p: sorted(p, reverse=True)[0]))           => [[2, 1], [1, 5]]
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| key 函数里再调用**带关键字**的 sorted 且外层列表很大 | 三个 `srtkey` 工作列表不在栈里，时序上靠运气（`d200` N5 现在通过，但没被证明） |
| `sorted([(2,'b'),(1,'a')])`（元组排序） | `TypeError: sort requires all numbers or all strings`（`d168` K3） |
| `super()` 钩子只认"整段就是 `super().m(...)`" | 两个 super 连用、`super().m().n()` 仍报 `SyntaxError: parentheses`（`d193` T6） |
| 元组子句里写未定义名字 · 元组的 `index`/`count` · `1()` / `(1).foo` | 仍缺（v4.60/v4.61 记录） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.64.sb3
node _work/v41/run.mjs MiniPy_v4.64.sb3 _work/cmp47/d176.json  # sorted 关键字 6 条
node _work/v41/run.mjs MiniPy_v4.64.sb3 _work/cmp47/d200.json  # 嵌套 sorted 8 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.64.sb3 -tag v464 -ref v463
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v464 -ref v463
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.64.sb3 -tag v464
node _work/v41/check41.cjs MiniPy_v4.64.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.63 还原： $env:V41_SKIP='P137'; $env:V41_OUT='…/MiniPy_v4.63.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.65）候选，按清单顺序

1. `sorted` 的元组排序（`sorted([(2,'b'),(1,'a')])`，`d168` K3）
2. `super()` 钩子只认整段：两个 super 连用 / `super().m().n()`（`d193` T6）
3. 元组子句里写未定义名字应报 `NameError`（v4.60 发现）
4. 元组的 `index`/`count`（v4.61 发现）；任意值当函数调用 / 属性访问（`1()`、`(1).foo`）
