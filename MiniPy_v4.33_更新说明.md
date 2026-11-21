# MiniPy v4.33 更新说明

本轮实现你要的那个折中：**RUN 用 warp，STEP 用非 warp** —— 快跑和快单步终于不再互相牺牲。

产物 `MiniPy_v4.33.sb3`：Interpreter 9,426 → **9,787** 块（多了两个 warp 副本），合计 **11,240**，`check41` errors=0。
`MiniPy_v4.32.sb3` 保持原样（10,855 块），`MiniPy_v4.31.sb3` 也不动。

## 1. 为什么能做出来

关键事实（P66/P67 已经摸清）：**warp 只向下继承，而且只有"过程自己"能把它打开**——
`Thread.pushStack` 复制父帧的 `warpMode`，被调过程自己的 `warp=false` 只能置 true、不能清 false。
反过来说：**只要在调用链的某一层进入一个 warp 过程，它下面的一切（eval → calluser → 嵌套调用 → 函数体内逐行的 execute）都会继承成 warp**。

所以不需要复制整条链，只需要给"进入用户调用的那一层"做一份 warp 副本：

* 自由运行（`mode == 0`）：`callfn` → **`callfnW`**（warp 副本），`callmeth` → **`callmethW`** → 整棵子树 warp → 回到 v4.30 那种"一口气跑完"的快。
* 单步（`mode != 0`）：走原来的**非 warp** 过程体 → 函数体里的 `wait_until` 真正让出 → 一步 1 帧、约 50ms。

分支写在 `callfn` / `callmeth` **内部**（原过程体整体挪进 `else` 分支），
这样**调用点不用复制参数表达式**（一个积木只能有一个 parent，复制参数表达式很容易出错）。

## 2. 实测

| 场景 | v4.30（全 warp） | v4.31/v4.32（全非 warp） | **v4.33（本轮）** |
|---|---|---|---|
| RUN `print(fib(16))` | 14 帧 / ~5.5s | **799 帧**（GUI 约 26s） | **15 帧 / 5.2s** ✓ |
| RUN `a = fib(16)`（无 print） | 14 帧 | 776 帧 | **14 帧 / 5.1s** ✓ |
| RUN demo2（fib(7)） | 6 帧 | 29 帧 | **11 帧 / 0.32s** ✓ |
| STEP demo1 函数体内一步 | 501ms | 45ms | **51ms** ✓ |
| STEP 顶层一步 | 13–20ms | 13–30ms | 13–30ms ✓ |

再把两种模式接起来也不会退化：`modeloss.mjs`（先 RUN 跑起来，中途点 STEP）：

```
mid-run: cdepth=0 mode=0            <-- 正在快跑（warp）
pause1: cdepth=1 pc=2 mode=1        <-- 点 STEP：在调用里停住
pause2: cdepth=1 pc=4 mode=1        <-- 之后一次一行
pause3: cdepth=2 pc=2 mode=1
pause4: cdepth=2 pc=4 mode=1
```

**一个要如实说明的边界**：如果调用是在"快跑"期间进入的（已经是 warp 帧），按下 STEP 后**这一次调用**里的第一次暂停仍要走完 500ms 的 warp 预算（之后该调用返回、下一个调用就走非 warp 路径，恢复 ~50ms）。
也就是"中途切到单步"时最多有一下约 0.5 秒的延迟，之后正常。

## 3. 代价

* 多出 361 个积木（`callfnW` 316 + `callmethW` 45），文件体积 +约 1.5%；`check41` 仍 errors=0。
* **维护约定**：P68 在补丁链里克隆的是"当时最终的 `callfn`/`callmeth` 体"。
  以后如果哪个补丁要改这两个过程，要么放在 P68 **之前**，要么在 P68 里追加对应的克隆步骤（`p68.txt` 顶部注释已写明）。
  构建日志会打印克隆了多少块，便于核对。

## 4. 验证

* `check41.cjs MiniPy_v4.33.sb3`：total **11,240**，errors=0。
* 全量 23 套件 battery（`_work/v41/battery_v433.txt`）无回退：`gaps` **39/39**、cls/alias/gen/try/tuple/comp/regress/func/str/fstr/pct/bit/booljson/float 全绿；
  仍是那 3 条既有失败（one2 1 条、math 3 条、dict 3 条）。
* `demos.json` 12/12、`scope.json` 4/4、`d1.json` 4/4、`pan.json` 7/7。
* `rebuild-old.ps1`：**v4.10…v4.33 共 24 个版本全部 MATCH**（结构比对口径，见 v4.32 说明第 5 节）。
* 两版行为对照（同一条命令即可复跑）：
  `node _work/v41/frames.mjs MiniPy_v4.32.sb3 _work/v41/fib16.json` → 769 帧；
  `node _work/v41/frames.mjs MiniPy_v4.33.sb3 _work/v41/fib16.json` → 15 帧。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.33.sb3
$env:V41_SKIP='P68'; $env:V41_OUT='.../MiniPy_v4.32.sb3'; node _work/v41/build41.js   # 还原上一版
node _work/v41/stepcost.mjs MiniPy_v4.33.sb3 _work/v41/demo1.json   # 单步成本
node _work/v41/frames.mjs   MiniPy_v4.33.sb3 _work/v41/fib16.json   # 快跑帧数
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
```
