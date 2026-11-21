> **【已回退】本版（v4.34 / P69）已按用户要求回退，当前出货版本仍为 `MiniPy_v4.33.sb3`。**
> 产物与说明留档在 `_work/v41/reverted/`；重新启用的步骤见该目录的 `README.md`。
> 以下内容保留原样，作为这一版做过什么的记录。

# MiniPy v4.34 更新说明

本轮实现你要的**断点调试**：在代码框左侧的**行号上单击**设/取消断点（原来的"双击行号改这一行"取消），
程序跑到断点就**停住**，顶栏**显示 CONTINUE 按钮**（平时不显示），按下后继续并隐藏。

产物 `MiniPy_v4.34.sb3`：Interpreter 9,787 → **9,901** 块，Controller 1,216 → **1,306** 块，
TextRenderer 189 → **228** 块，Stage 24，合计 11,240 → **11,459**，`check41` errors=0。
`MiniPy_v4.33.sb3` 保持原样（11,240 块），`MiniPy_v4.32.sb3` / `MiniPy_v4.31.sb3` 也都不动。

## 1. 怎么用

| 操作 | 结果 |
|---|---|
| **单击行号** | 设断点（该行出现一条淡红色条）；再点一下取消 |
| 设/取消时状态栏 | `BP on line N` / `BP off line N` |
| 点 RUN（或 STEP）跑到该行 | **停住**：状态栏 `BP hit line N`，行首 `>` 指着停住那行，顶栏出现 **CONTINUE** |
| 按 **CONTINUE** | 继续跑、按钮消失；跑到下一个断点再停 |
| 停在断点时按 **STEP** | 往下走一行（与平时单步一致，一行一点击） |
| 停在断点时按 **RUN** | 直接继续跑 |
| 停在断点时按 **STOP** | 结束运行（按钮也会消失） |

双击行号不再打开"编辑这一行"的输入框；改代码还是老办法：**点一行，直接敲字**（HELP 里那行说明也改成
`Click line no.: breakpoint`）。

## 2. 实现要点

* **数据**：Stage 上新增 **`Bps`**（与 `Code` 一一对应的 0/1 列表）、`bpOn`（当前是否有断点）、
  `bwait`（是否正停在断点上）。
* **闸门**：主 RUN 循环和 `calluser` 函数体循环本来就有 STEP 闸门（`if mode==1 → wait_until ticket>0`），
  现在条件改成 **`mode==1 或 本行有断点`**，暂停/继续**沿用 STEP 的 `ticket` 协议**（点一次 = 一个 token），
  所以 CONTINUE / STEP / RUN / STOP 四个键在"停住"状态下都自然可用。
  坑：`startRun` 起跑时会先给 `ticket=1`，所以 `mode==0` 撞上断点时要**先把 ticket 清零**，
  否则第一次停会被这个起跑 token 吃掉（本轮抓到的第一个 bug，靠真鼠标点击测试才暴露）。
* **一个如实记录的代价**：warp 帧里的 `wait_until` 会每帧空转 500ms（UI 掉到 ~2fps、点击半秒才响应），
  而 P68 的快跑路径正是走 warp 副本，所以把 P68 的分支条件从 `mode==0` 改成 **`mode==0 且 bpOn==0`**：
  **只要设了断点，这一次 RUN 就走 STEP 那条逐行（非 warp）路径**——慢一点，但真的能停、点得动。
  取消所有断点后行为与 v4.33 完全一致。
* **行号会动**：程序开跑时会被 `joinlines`/`expandlines` 重写（续行合并、`if x: y` 这类一行体拆成两行），
  打字回车/退格也会增删行号。这些地方 P69 都同步维护 `Bps`：
  * `expandlines`：拆出来的**第一行继承断点**，续行给 0；
  * `joinlines`：合并的那组取**或**（任一行有断点就算有）；
  * 回车 `newline`：在 `selected+1` 插 0；退格并入上一行 `backspace`：把被并入行的断点**或**到上一行再删；
  * 导入/示例/NEW（换程序）：清空断点；UNDO：连断点一起回滚（新增快照列表 `SnapB`）；
  * RUN 起跑时做一次长度对齐 + `bpOn` 重算，列表和代码永远同长。

## 3. 已知边界（如实记）

* 断点打在**空行/纯注释行**上不会触发（这类行不产生 token，闸门不经过）。
* **设了断点的那次 RUN 是逐行路径**：VM 帧数明显变多（`fib(16)` 16 → 767 帧；解释器自身 CPU 不变，
  但 GUI 每帧还要重画，所以体感慢；这与 v4.32 的 799 帧是同一个原因）。
  取消断点即恢复 warp 快路。
* 同一个行号上 **0.35 秒内**的第二次点击按"双击抖动"处理、只算一次（所以"点一下设、马上再点"不会取消；
  等 0.35s 再点即可）。
* 断点打在**循环体内**时每次迭代都会停（标准行为），要继续就再按 CONTINUE。
* 本轮顺带测到一条**既有**限制（v4.33 也一样，与断点无关）：**生成器体内有循环但没写结尾 `return` 时只 yield 第一项**
  （`def squares(n): for i in range(n): yield i*i` → `list(squares(3))` 得 `[0]`，CPython 是 `[0, 1, 4]`；补一句 `return` 即正常）。
  本轮未修，已记在这里；完整支持范围见 `_work/v41/支持范围与限制.md`。
* CONTINUE 按钮只在**自由跑（RUN）撞上断点**时出现；STEP 模式下停在断点行只显示 `BP hit line N`（不显示按钮）。

## 4. 验证

* **新测试 `_work/v41/bptest.mjs`（真鼠标事件驱动，47 项全过）**：行号单击开关断点、0.35s 防抖、
  顶层断点停住（`pc`/`status`/`Output` 都验）、CONTINUE 继续并跑完、函数体内断点（`cdepth>0`，
  且**没有 500ms warp 空转**：<300ms 就停住）、STOP 清掉按钮、STEP+断点仍是一行一点击、
  点在代码文本上仍选中行、点行号不再弹编辑框、回车/退格后断点与代码仍然对齐、
  一行体 `if a > 0: print('hi')` 被拆行后断点落在前半行且跑完输出正确、
  **类方法体内**与**生成器体内**的断点也能停住并继续。
* **全量 battery（23 套件）**：与 v4.33 **逐条一致**——`gaps` 39/39、`cls/alias/gen/try/nested2/nested/tuple/comp/b2/cont/func/str/fstr/pct/bit/booljson/float` 全过，
  仍是既有的 3 条失败（`one2` 1、`math` 3、`dict` 3）。结果存 `_work/v41/battery_v434.txt`。
  （跑 battery 时**不要同时跑第二份 `run.mjs`**：两者共用 `_work/v41/_tmp.py`，会互相踩出假失败。）
* `demos` 12/12、`scope` 4/4、`d1` 4/4、`pan` 7/7。
* **性能不回退**：`fib(16)` 无断点 RUN v4.33 = 23 步 / v4.34 = 24 步（同量级）；demo1 函数内单步 13–74ms。
* `rebuild-old.ps1`：**v4.10…v4.34 共 25 个版本全 MATCH**（结构口径；v4.34 也在其中，说明本补丁可复现）。
* `check41`（并新增"next/parent 必须是字符串或 null"检查）：errors=0。

## 5. 维护约定（沿用）

* 每出货一版**版本号 +1**；**已出货的补丁不再改动，只追加新补丁**。本版 = **v4.34 = 追加 P69**。
* 版本→补丁：v4.32 = +P67、v4.33 = +P68、**v4.34 = +P69**（`rebuild-old.ps1` 顶部注释同步维护）。
* 复跑对照：
  ```
  node _work/v41/bptest.mjs MiniPy_v4.34.sb3          # 断点 41 项
  node _work/v41/bpcost.mjs MiniPy_v4.34.sb3          # 有/无断点的 RUN 帧数对比
  pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.34.sb3 -out _work/v41/battery_v434.txt
  pwsh -NoProfile -File _work/v41/rebuild-old.ps1     # 25 个版本结构比对
  ```
