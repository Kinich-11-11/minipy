# MiniPy v4.32 更新说明

本轮只做一件事：**修掉"第一个 demo 里函数内单步还是慢"**（v4.31 的 P66 没覆盖到 `print(...)` 这条路径）。
另外按你的要求确立版本规矩：**每出货一版，版本号 +1；已出货的补丁不再改动，只追加新补丁**。

产物 `MiniPy_v4.32.sb3`：Interpreter 9,426 / Controller 1,216 / TextRenderer 189 / Stage 24，合计 **10,855**，`check41` errors=0。
（块数与 v4.31 相同——P67 只改"哪些过程是 warp"，不增删积木。）
`MiniPy_v4.31.sb3` 已按你的要求**恢复成上一版内容**（只含 P58–P62 + P65 + P66），不再被后续改动覆盖。

## 1. 现象与根因

v4.31 的 P66 让"普通调用"的单步从 501ms 降到 ~50ms，但你自己拿 **demo1** 一试还是 501ms。原因不在 P66 本身，而在**漏了一个祖先**：

demo1 是 `print(area(3, 4))` —— 参数的求值发生在 **`printargs`** 里，而它当时还是 warp，并且正好卡在 `eval` 上面。
warp 是**向下继承**的（`Thread.pushStack` 复制父帧 `warpMode`，被调过程自己的 `warp=false` 只能置 true、不能清 false），
所以 `printargs` 下面的 `eval` → `callfn` → `calluser` 又全被继承成 warp → 函数体里的 `wait_until` 每帧烧满 `Sequencer.WARP_TIME`(500ms)。

## 2. 怎么找出来的 + 修法（P67）

不靠猜：`_work/v41/callgraph.cjs` 直接从积木里构造调用图，算出**所有能（传递地）到达 `calluser` 的过程**。
当时这个闭包里只剩 3 个还是 warp：

| 还是 warp 的过程 | 管什么 | 漏了会怎样 |
|---|---|---|
| `printargs` | `print(...)` 的参数求值 | **demo1 / 一切 `print(f(x))`** |
| `minmax` | `min/max` 一类内建 | `print(max(f(1), 2))` |
| `regdef` | `def` 的默认参数求值 | `def g(a=f(1))` |

P67 把这 3 个也改成非 warp，并且**在构建期跑同一套可达性检查**：只要闭包里还有 warp 的过程，构建直接失败并列出名字。
这样以后再加语法路径，不会又悄悄退化成"一步半秒"。

## 3. 实测

`_work/v41/stepcost.mjs`（逐步暂停，统计"一次点击 → 下一次暂停"的帧数与毫秒），同一份 demo1：

| 版本 | 顶层一行 | **函数体里一行** |
|---|---|---|
| v4.30 | 13–20ms | 501ms |
| v4.31（P66，无 print 路径） | 13–20ms | **501ms**（demo1 实测） |
| **v4.32**（P66+P67） | 13–30ms | **13–45ms** |

```
v4.32:
 step 2 pc  4-> 6  frames=3  ms=30   top  "print(area(3, 4))"
 step 3 pc  6-> 3  frames=5  ms=45   IN   "    return w * h"          <-- 之前 501ms
 step 5 pc  7-> 5  frames=1  ms=13   IN   "    return hi + ', ' + name"
```

### 代价（如实记录）

调用链不再是 warp 之后，引擎编译出的代码会在每次调用处让出，所以**跑得久**的程序在 GUI 里帧数变多（CPU 时间几乎不变）：

| 程序（解释器步数） | 帧数 v4.30 → v4.32 | GUI 大致墙钟 |
|---|---|---|
| demo1（8 步） | 6 → 13 帧 | 忽略不计 |
| demo2 递归 fib(7)（153 步） | 6 → 29 帧 | 约 1 秒 |
| demo4 列表（9 步） | 8 → 14 帧 | 忽略不计 |
| 压力用例 fib(16)（6388 步） | 14 → **799 帧** | 约 7 秒 → 约 26 秒 |

一句话：**小步调试变爽，重计算约慢 4 倍**——这是"函数内能停得住"的必然代价（要能停下就不能让引擎一口气跑满 500ms）。
**v4.33 已经把这个代价消掉了**：RUN 走 warp 副本、STEP 走非 warp（见 `MiniPy_v4.33_更新说明.md`），本版保留原样以便回溯。

## 4. 版本规矩（本轮起生效）

* 每出货一版，版本号 +1：v4.31 → v4.32 → v4.33 …
* **已出货的补丁不再改动**（v4.31 的 `p66.txt` 已冻结），要改就**追加新补丁**（本次是 `p67.txt`）。
  这样任何一版都能用 `rebuild-old.ps1` 重建出来。
* 版本→补丁表（顶部注释与 `_work/v41/README.md` 同步维护）：
  v4.31 = P58–P62 + P65 + P66；v4.32 = +P67。

## 5. 验证

* `check41.cjs MiniPy_v4.32.sb3`：total 10,855，errors=0。
* 全量 23 套件 battery（`_work/v41/battery_v432.txt`）**无回退**：`gaps` 39/39、cls 12/12、alias 12/12、gen 11/11、
  try 12/12、nested/nested2 8/8+10/10、tuple 20/20、comp 10/10、regress 15/15、func 31/31、str/fstr/pct 12+8+8、
  bit/booljson/float 10+4+10、one 10/10、b2 13/13、cont 12/12；仍是那 3 条既有失败（one2 1 条、math 3 条、dict 3 条）。
* `demos.json` 12/12、`scope.json` 4/4、`d1.json` 4/4、`pan.json` 7/7。
* `rebuild-old.ps1`：**v4.10…v4.32 共 23 个版本全部 MATCH**。
  注意口径：`compare.cjs` 比的是**结构**（块数 / 每个 opcode 的数量 / 过程名 / 变量与列表名），
  不是字节——构造器给新块 id 带随机后缀，所以同一份补丁重建出来字节不会完全相同（之前文档里写"结构 MATCH（块 id 有随机后缀，字节不同）"是我说错了，已全部改正）。
* `MiniPy_v4.31.sb3` 已恢复为上一版内容并复测：demo1 函数内一步 501ms（与当时一致）、gaps 39/39、10,855 块 errors=0。

## 6. 复现

```
node _work/v41/assemble.cjs                 # ... + p66 + p67 + tail.txt
node _work/v41/build41.js                   # -> MiniPy_v4.32.sb3
$env:V41_SKIP='P67'; node _work/v41/build41.js   # -> MiniPy_v4.31.sb3（当前默认 OUT，可用 V41_OUT 指定）

node _work/v41/check41.cjs MiniPy_v4.32.sb3
node _work/v41/stepcost.mjs MiniPy_v4.32.sb3 _work/v41/demo1.json   # 函数内一步多少帧/毫秒
node _work/v41/callgraph.cjs                                        # 打印"能到达 calluser"的闭包与其中仍是 warp 的过程
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.32.sb3 -out _work/v41/battery_v432.txt
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                     # v4.10…v4.32 全部重建并比对
```
