# MiniPy v4.131 更新说明：放宽六项硬上限（P203）

## 0. 一句话

把 v4.6x 定下的六项"防跑飞"上限按实测成本整体放宽（外加一项本来没写在文档里、
但**才是递归瓶颈**的 `fnlimit`）。数字变了，**报错文案与语义一个没改**，
解释器积木数一块没动（只改了常量字面量），所以语言行为与 v4.130 逐例一致。

| 限制 | v4.130 | **v4.131** | 倍数 |
|---|---|---|---|
| 程序总行数 | 200 | **1000** | 5× |
| 单行字符数 | 240 | **2000** | 8.3× |
| 单个值字符数 | 2048 | **16384** | 8× |
| 控制台保留行数 | 300 | **2000** | 6.7× |
| 递归深度 `cdepth` | 96 | **512** | 5.3× |
| 表达式深度 `fnlimit` | 64 | **768** | 12× |
| 步数（快速） | 100,000 | **500,000** | 5× |
| 步数（慢速） | 10,000 | **50,000** | 5× |
| 单次调用内步数 `csteps` | 20,000 | **100,000** | 5× |

报错文案跟着改（`LimitError: 1000 lines maximum`、`LimitError: 2000 chars per line`、
`LimitError: value exceeds 16384 chars`），`RecursionError: maximum recursion depth exceeded`
与两条 step 文案不变。

## 1. 为什么这六项都能放宽：它们都只是护栏

每一项的强制点都在**基础工程**里（不是某个补丁加的），而且都不带结构性依赖：

| 限制 | 强制点 | 性质 |
|---|---|---|
| 行数 | `prepare`：`if length of Code > 200` | `Code` 就是普通列表，没有别的代码假设它 ≤ 200 |
| 单行字符 | `prepare`：`if len(es) > 240` | 只影响分词循环长度；编辑器早就支持横向滚动 |
| 值长度 | `eval`：`if len(ev) > 2048` | 值就是字符串，成本只有内存与打印折行 |
| 控制台 | `log`：`if length of Output > 300: del Output[1]` | 纯保留量，渲染永远只画 9 行 |
| 递归深度 | `calluser`：`if cdepth > 96` | 调用栈是 MiniPy 自己的 `FN/FV/FT/FrRet/FrBase/FrLoop` 列表，**不是** Scratch/JS 递归 |
| 步数 | RUN 主循环 + `calluser` 体循环：`steps > 10000 + speed*90000` | 跑飞防护；解释器每 50 步 `wait 0` 让帧，STOP 随时可中断 |

## 2. 顺手挖出来的真瓶颈：递归其实卡在"表达式深度"

文档一直写"递归深度 96"，但实测 v4.130 **`f(63)` 就报 `LimitError: expression depth`**——
`cdepth` 离 96 还远。原因：Python 的调用是**在表达式求值里**发生的，每嵌套一层调用就
多留一个 `eval` 帧，而 `fnlimit`（表达式深度）上限只有 **64**。
所以只放宽 `cdepth` 毫无用处，两个必须一起动。

`p203.txt` 的做法是让 `fnlimit = 1.5 × cdepth`（768 对 512），这样深递归报的是
**`RecursionError`**（和 CPython 一致），`expression depth` 只用来挡病态表达式。

## 3. 实测（A/B：同一套探针跑 v4.130 与 v4.131）

探针脚本 `_work/v41/_limverify.mjs`（真实 scratch-vm 5.0.300，无头），用例在
`_work/v41/_limverify.json` / `_limbound.json`：

| 用例 | v4.130 | v4.131 |
|---|---|---|
| 恰好 1000 行 | `LimitError: 200 lines maximum` | **正常跑完**（输出 `999`，准备阶段 ~0.7s） |
| 1001 行 | `LimitError: 200 lines maximum` | `LimitError: 1000 lines maximum` |
| 恰好 2000 字符一行 | `LimitError: 240 chars per line` | **正常跑完** |
| 2001 字符一行 | `LimitError: 240 chars per line` | `LimitError: 2000 chars per line` |
| 值 16384 字符 | `LimitError: value exceeds 2048 chars` | **正常跑完** |
| 值 16385 字符 | `LimitError: value exceeds 2048 chars` | `LimitError: value exceeds 16384 chars` |
| 递归 500 层 | `LimitError: expression depth`（126 步） | **正常跑完**（1004 步，~1.7s） |
| 递归 520 层 | `LimitError: expression depth` | **`RecursionError: maximum recursion depth exceeded`** |
| 函数体内 25000 步 | `LimitError: step limit inside function`（20002 步） | **正常跑完**（输出 `312487500`） |
| 打印 2100 行 | 控制台留 300 行（首行 `1800`） | 控制台留 **2000 行**（首行 `100`） |
| 12 万步的 while | `LimitError: step limit reached`（100001 步） | **正常跑完**（`120003` 步，~151s） |

构件本体里 9 个强制点的常量（`_work/v41/_limdump2.cjs` 从产物 `project.json` 读出来）：

```
prepare    length of Code   > 1000        prepare    operator_length(es) > 2000
eval       operator_length(ev) > 16384    eval       fnlimit            > 768
calluser   cdepth           > 512         calluser   csteps             > 100000
RUN 主循环  steps > 50000 + speed*450000  calluser   steps > 50000 + speed*450000
log        length of Output > 2000
```

## 4. 代价（都量过）

* **1000 行的准备阶段 ≈ 0.7s**：`prepare` 是 `warp` 过程，整份程序在**一个 VM 帧**里分词
  （实测 51 行 27ms / 101 行 47ms / 151 行 97ms，约 0.7ms 每行），而且每次 RUN 都重来一遍。
  再往上加（2000 行 ≈ 1.5s）浏览器里会明显卡一下，所以停在 1000。
* **步数 = 墙钟**：解释器约 **1300 步/秒**，500k 步最坏 ≈ 6 分钟。跑飞的程序要等更久才报错，
  但 `Steps` 状态栏一直在走、`STOP` 随时能停。
* **状态栏宽度**：`Steps 500000` 12 个字符（≈70px，起点 x=83）仍在代码面板（到 156）之内，
  再大就会压到面板边。
* **HELP 的 LIMITS 模块**同步改成六行（顺带修掉早已过时的 `4-space blocks`——v4.85/v4.86 起
  任意缩进宽度与 TAB 都行），HELP 总行数 121 → **123**，`mp_font` 按 `help.json` 动态核对。

## 5. 落地与验证

* 新部件 `_work/v41/p203.txt`，加进 `assemble.cjs` 的部件表（`p202.txt` 之后、`p68.txt` 之前）。
* `rebuild-old.ps1`：`$p131 = 'P203'`，**所有更早版本的跳表都加上了它**，并新增 `'v4.131' = ''`。
* `head.txt` 输出版本 → **v4.131**；产物 **`MiniPy_v4.131.sb3`**。
* 块数：Interpreter 26,815（**未动**）/ Controller 2,017 → **2,019**（HELP 多两行）/
  TextRenderer 234 / Stage 24，合计 29,090 → **29,092**；`check41` errors=0。
* `p203.txt` 里所有目标都是**按报错文案定位**的（不是硬编码生成块 ID），数量不对就**抛错**，
  将来再加补丁也不会悄悄改错对象。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js      # -> MiniPy_v4.131.sb3
node _work/v41/check41.cjs MiniPy_v4.131.sb3                  # 29,092 块 errors=0
node _work/v41/_limverify.mjs MiniPy_v4.131.sb3 _work/v41/_limbound.json   # 边界用例
node _work/v41/run.mjs MiniPy_v4.131.sb3 _work/cmp47/gaps433.json          # 63 条缺口
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.131.sb3 -tag v4131
pwsh -NoProfile -File _work/v41/rebuild-old.ps1               # 122 个历史版本复现
```
