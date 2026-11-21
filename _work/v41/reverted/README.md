# reverted/ —— v4.34（断点调试）已按用户要求回退

这里的文件**不是当前出货内容**，只是留档，方便以后重新启用或查证。

## 回退了什么

v4.34 = v4.33 + **P69**（行号单击设/取消断点、跑到断点停住并显示 CONTINUE 按钮、
取消"双击行号改这一行"、断点表 `Bps` 与 `Code` 全程同步、`bpOn` 决定这一次 RUN 走 warp 还是逐行）。

用户要求"回退成上一版本"，于是：

* 默认产物回到 **v4.33**（`_work/v41/head.txt` 的 `OUT`/`STAMP`）；
* `_work/v41/assemble.cjs` 的 parts 里**去掉** `p69.txt`（补丁仍在盘上，只是不参与构建）；
* `_work/v41/help.json` 的帮助行改回 `Double-click line no.: edit`；
* `_work/v41/rebuild-old.ps1` 回到 24 个版本（v4.10…v4.33，不再有 v4.34 / P69）；
* `MiniPy_v4.34.sb3` 与它的更新说明从仓库根目录移到本目录。

## 证据

* 回退后用当前源码重建：**11,240 块**，与出货件 `MiniPy_v4.33.sb3` **结构 MATCH**
  （`node _work/v41/compare.cjs MiniPy_v4.33.sb3 _work/v41/revert_check/MiniPy_v4.33.sb3`）；
* `_work/v41/revert_check/` 就是那次重建的产物（`MiniPy_v4.33.sb3` + `project_v433.json`）。

## 本目录内容

| 文件 | 说明 |
|---|---|
| `MiniPy_v4.34.sb3` | 已回退的 v4.34 产物（11,459 块，check41 errors=0） |
| `MiniPy_v4.34_更新说明.md` | v4.34 的更新说明（顶部已注明已回退） |
| `decomp434.txt` | v4.34 的完整反编译（对照用） |
| `battery_v434.txt` | v4.34 的 23 套件 battery 结果（与 v4.33 逐条一致） |
| `bptest.mjs` | 断点专项测试，47 项（真鼠标事件驱动） |
| `bpcost.mjs` | 有/无断点时的 RUN 帧数对比 |

## 怎么重新启用

1. 把 `'p69.txt'` 加回 `_work/v41/assemble.cjs` 的 `parts`（放在 `'p68.txt'` 之后、`'tail.txt'` 之前）；
2. `_work/v41/head.txt`：`OUT` → `MiniPy_v4.34.sb3`（或按版本规矩 +1 取新号）、`STAMP` 同步；
3. `_work/v41/help.json` 的帮助行改成 `Click line no.: breakpoint`；
4. `_work/v41/rebuild-old.ps1`：加回 `'v4.34' = ''`，并给 v4.33 及更早的条目都加 `P69`；
5. `node _work/v41/assemble.cjs && node _work/v41/build41.js`，然后
   `node _work/v41/reverted/bptest.mjs MiniPy_v4.34.sb3`（注意 bptest 在本目录里）。
