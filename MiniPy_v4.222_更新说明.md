# MiniPy v4.222 更新说明

**构建**：`MiniPy_v4.222.sb3`（2026-11-08，41,554 块，check41 errors=0）
**主题**：**P710：RUN（warp）模式下 input() 不弹输入框**——用户报告 TurboWarp 里点 RUN
没有输入框、只有 STEP 才有。本轮定位 + 修复 + 全环境回归。

## 一、根因

input() 有两条路径：

| 路径 | 使用场景 | 行为 |
|---|---|---|
| `callfn`（非 warp） | STEP 模式 | `set status → sensing_askandwait(ev)` → **弹框** ✓ |
| `callfnW`（warp） | RUN 模式 | v4.216 发现 **warp 线程里 ask 的 promise resolve 后线程不恢复**，于是改成 `set status → repeat_until(stdin ≠ '')` 轮询，等外部写 `stdin` 变量（出口 `ev=stdin → stdin=''`） |

v4.216 的轮询协议只有 headless runner（run_iso/runall 的 `setG('stdin', answer)`）在喂；
**真实 UI 没有任何东西写 stdin** → RUN 模式 input() 死等，状态栏一直 "Waiting for input"、
永远不弹框。

## 二、P710 修法（p710.txt）

**Interpreter 里加一个非 warp 的看门线程**（非 warp 线程的 ask 正常恢复——Controller 的
editLine/click 一直这么用），由它代 warp 路径向用户要输入、写回 stdin：

```
绿旗 → 永远循环：
  若 status ≠ "Waiting for input" → askPending = 0        （自动重布防 / HALT 清理）
  若 status = "Waiting for input" 且 stdin = '' 且 askPending = 1：
      askandwait(askText)
      若 status 仍 Waiting 且 stdin 仍空 → stdin = answer
```

配套改动：
1. 新增 stage 级变量 `askPending`/`askText`（watcher 与解释器都可达）。
2. callfnW 的两个 `set status = 'Waiting for input'` 点（按结构查找，块 ID 每次构建随机，
   **不能按 ID 定位**）插入 `set askText = ev`（ev 是提示词寄存器，callfn 的 ask 也用它）
   + `set askPending = 1`。
3. STEP 路径（callfn）不置 askPending → watcher 不触发，**不会双弹框**。
4. headless 下 watcher 的 ask 会被 runner 的 ANSWER 补发事件放行；写入前有
   `stdin==''` 守卫，不污染轮询协议。

**验证关键点**（真实 turbowarp.org，RUN 模式，demo20）：
`QUESTION "Your name?"` → 答案 → `ANSWER "MiniPy"` → 输出 `Hello, MiniPy` →
`QUESTION "A number?"` → `ANSWER "6"` → 输出 `36 7` → Finished，两次交互全通。

## 三、验证矩阵

| 环境 | 套件 | 结果 |
|---|---|---|
| vanilla 5.0.300 | 主 168 + demo 20/20 | **全绿** |
| vanilla 5.0.300 | cov 681 + gap 82 + check41 | 全绿（见回归记录） |
| TurboWarp VM 2.1.46（本地 src） | 主 168 + gap 82 + demo 20/20 | 全绿 |
| turbowarp.org 真实站点 | demo20 两次 input 交互 | **通过** |

## 四、踩坑

1. **补丁定位不能按块 ID**：补丁创建的块 ID 每次构建随机（B.nid），v4.220 里记录的
   `bwr_p1bzzge2m` 前缀在新构建里不存在。必须按结构找（callfnW 内
   `set status = 'Waiting for input'` 恰好 2 处）。
2. **改 pNNN.txt 后必须重跑 assemble219.cjs**（build41.js 是组装产物）——本轮忘了两次。
3. 排查时按名字读变量会被 MiniPy 帧模型骗（读的是寄存器残留）；块级探针
   （分支头插 `add Dbg (变量)`）才是真值。
4. 浏览器自动化点 TurboWarp 的 ask 提交：Enter 键合成事件在页面卡顿时不可靠，
   页面内 `document.querySelector('button[class*=question-submit-button]').click()`
   （配合原生 value setter + input 事件）更稳。

## 五、复跑命令

```
cd _work/v41
node assemble219.cjs
V41_OUT=../../MiniPy_v4.222.sb3 V41_STAMP="MiniPy v4.222 - built 2026-11-08" node build41.js
node check41.cjs ../../MiniPy_v4.222.sb3
node runall.mjs ../../MiniPy_v4.222.sb3 _res222main _new*.txt
node run_iso.mjs ../../MiniPy_v4.222.sb3 demos_v4220.json _demos222.out.json d222
node _tw_cases.cjs ../../MiniPy_v4.222.sb3 demos_v4220.json          # TW demo
node _tw_cases.cjs ../../MiniPy_v4.222.sb3 _new_all.json             # TW 主套件
```

## 六、下一轮建议

沿 v4.219 §七不变。另：v4.220 的 20 个 demo + P709/P710 已构成完整的 TurboWarp
适配轮，可考虑把 TurboWarp 纳入常规回归（_tw_cases.cjs 已具备批量能力）。
