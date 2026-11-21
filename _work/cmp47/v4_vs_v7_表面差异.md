# MiniPy v4 vs v7 —— 表面差异核对

方法：分别解包 `MiniPy_v4.sb3` / `MiniPy_v7.sb3`，按 target、按积木 ID 逐项比对
（脚本：`_work/cmp47/surface*.cjs`，中间结果：`_work/cmp47/surface*.txt`）。

## 1. 完全一致的部分（表面无差异）

| 项目 | v4 | v7 |
|---|---|---|
| 角色数量/名称/顺序 | Stage, Controller, TextRenderer, Interpreter | 同 |
| 位置/大小/方向/可见性/layerOrder | 全部 0,0 / 100 / 隐藏 | 同 |
| 资源文件（99 个） | — | **99 个 md5 全部相同** |
| 造型 | desk 背景；TextRenderer 95 字符造型；Interpreter 95 个 `_` 前缀造型；Controller costume1 | 同 |
| 按键帽子 | 48 个键，键名集合 | **完全一致（0 差异）** |
| 扩展 | `["pen"]` | 同 |
| 监视器 | 1 个（Export 列表，隐藏，x=307 y=62 h=236） | 同 |
| meta | semver 3.0.0 / vm 4.6.0 / agent "MiniPy v4 (review pass) - built 2026-09-13 04:53" | **字符串一字未改** |
| Stage 的 23 个积木 | — | 逐 ID 比对 **0 差异** |
| TextRenderer 的 176 个积木 | — | 逐 ID 比对 **0 差异** |
| Controller 本地变量 | ui,ut,ub,ux,uy,uc,upal,caps,lastclick（9） | 同 |
| TextRenderer 本地变量 | ri,rj,rc,rx,rline（5） | 同 |
| Controller 自定义积木 | 19 个，全部在 Controller 内定义、无跨角色调用 | 同 |

结论：**编辑器外壳（UI 壳）在 v4→v7 之间基本原样搬运**，连积木 ID 都一样。

## 2. 外壳里唯一的代码改动：`startRun`

Controller → 自定义积木 `startRun %s`（根积木 ID `UZgqNYWokB,]AN-8*7w{`）。
只有「已在运行中再次请求运行」这一分支被改写：

```
if busy = 0:
  if running = 0:                       # v4、v7 相同
     mode = sm; ticket = 1; stopreq = 0; running = 1; broadcast RUN
  else:
     v4: mode = sm; ticket += 1                        # 只记一次请求票据
     v7: mode = sm
         stopreq = 1
         broadcast and wait HALT                        # 新增：等旧运行真正停下
         stopreq = 0
         running = 1
         broadcast RUN                                  # 新增：再启动
```

积木级差异：新增 4 个（3× setvariableto、1× broadcastandwait、1× broadcast），删除 1 个（ticket += 1），另 1 个 `mode = 0` 的 next 指针被重接。**这是整个外壳唯一的改动。**

## 3. 可见的变量/列表面板差异

| 容器 | v4 | v7 |
|---|---|---|
| Stage 全局变量 | 24 | 20（去掉 dq, slash, branchjump, lsep） |
| Stage 全局列表 | 17 | 7（去掉 Indents, Ends, Elses, LoopHead, LoopEnd, LoopKind, LoopName, LoopValue, LoopStop, LoopStep） |
| Interpreter 局部变量 | 87 | **180**（v5regP0…v5regP152、FrTop、NdK、TokT…） |
| Interpreter 局部列表 | 10 | **93**（Iop, Stk, FnName, NdK, PcT…） |

外壳从不引用被删掉的那些名字（Stage/Controller/TextRenderer 引用检查均为 NONE），无悬空引用。

## 4. 外壳 ↔ 引擎的状态契约变化

共享状态：v4 = 20 个 → v7 = 17 个。v7 引擎不再读写 `ticket`、`page`、`stopreq`：

| 变量 | v4 引用方 | v7 引用方 |
|---|---|---|
| ticket | Stage 1 / Controller 2 / **Interpreter 2** | Stage 1 / Controller 1 |
| stopreq | Stage 1 / Controller 2 / **Interpreter 1** | Stage 1 / Controller **4** |
| page | Stage 1 / Controller 14 / TextRenderer 5 / **Interpreter 3** | Stage 1 / Controller 14 / TextRenderer 5 |

其余契约不变：Code, Output, Names, Values, Types, status, error, pc, steps, busy, speed, running, mode, dirty, selected, outpage, varpage。

## 5. 用户能看到的文字差异

- v7 新增 5 条 `#!` 调试指令（v4 一条都没有）：`#!bp`、`#!tok`、`#!dump`、`#!code`、`#!trace`。
- 状态提示：v4 有 `Paused / STEP to advance`；v7 换成 `Step / line `、`Breakpoint at `、`Breakpoint armed at `。
- 报错措辞：v4 是自造的 MiniPy 文案（`LimitError: 200 lines maximum`、`SyntaxError: else:`、`IndentationError: use 4 spaces`、`TypeError: numeric operands`…）；v7 改为贴近 CPython 的文案（`invalid literal for int() with base 10: '`、`division by zero`、`list index out of range`、`TypeError: range() integer argument expected`、`IndentationError: expected an indented block`…）。

## 6. 体量/积木用量

| | v4 | v7 |
|---|---|---|
| .sb3 文件 | 204 KB | 1.28 MB（≈6.3×） |
| Interpreter 积木数 | 3 247 | 92 090 |
| Interpreter 自定义积木 | 36 | 10 |
| 新增用到的积木类型 | — | control_while(8), sensing_dayssince2000(4), event_broadcastandwait(1) |
| 不再使用 | control_wait_until(1) | — |

即：表面（角色、造型、按键、监视器、外壳脚本）几乎完全没动，v4→v7 的差别集中在 Interpreter 角色内部，
外加一处 `startRun` 的运行控制改写，以及编辑器变量面板里成倍增长的引擎私有状态。
