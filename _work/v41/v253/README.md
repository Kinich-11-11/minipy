# v4.253：构建与复测

所有修复都在生成的 Scratch 积木与项目资源内，不依赖修改 Scratch VM、浏览器扩展或桌面 Python。`build.cjs` 核对正式 v4.252 的 SHA-256，使用固定种子生成 block ID；默认输出仓库根目录下的 `MiniPy_v4.253.sb3`。`helpers.js` 使用项目原有的积木生成器；其余 `*.js` 是按主题组织的运行时增量。

从仓库根目录运行（Node.js 22；默认使用仓库自带 scratch-vm 5.0.300）：

```powershell
node _work/v41/v253/build.cjs
node _work/v41/check41.cjs MiniPy_v4.253.sb3
node _work/v41/v253/replay.cjs MiniPy_v4.253.sb3
node _work/v41/v253/replay.cjs MiniPy_v4.253.sb3 _work/v41/v253/edge-cases.json
```

- `report-cases.json`：来自附件的 41 条失败复现、完整 N 组和仓库的完整 M 组；按 ID 去重后是 L 组 3 项、M 组 64 项、N 组 12 项。每条都带冻结的预期输出。同一条命令把文件名换为 `MiniPy_v4.252.sb3` 即可对比基线。
- `edge-cases.json`：26 条额外对照，包括 distinct/equal 与 shared/identical 容器、重绑定、继承后类参数、异常绑定清理、推导式隔离、懒迭代和严格 zip 的长度不一致。预期输出由 CPython 独立生成。
- `replay.cjs`：正式 RUN 入口，每项恢复初始标量、列表与造型索引；输出按照 26 字符一行严格比较，不把本应分行的输出直接拼接。默认每项 12 秒软预算。这是解释器输出验证，不是舞台截图测试。
- `archive-suite.cjs`：从已入库的 593 程序旧档案筛选历史通过、有冻结 stdout、无交互的 557 项。在根目录执行以下命令即可生成临时套件并对比两版（旧档案存在既有差异，因此两个运行都可能返回非零）：

```powershell
New-Item -ItemType Directory -Force _work/v41/v253/local | Out-Null
node _work/v41/v253/archive-suite.cjs _work/v41/v253/local/archive.json
node _work/v41/v253/replay.cjs MiniPy_v4.252.sb3 _work/v41/v253/local/archive.json
node _work/v41/v253/replay.cjs MiniPy_v4.253.sb3 _work/v41/v253/local/archive.json
```

仓库的 14 项收尾与 2 项压力用例也可以用既有运行器复核：

```powershell
$env:MINIPY_VM = (Resolve-Path _work/vm5300/node_modules/scratch-vm).Path
$env:PYEXE = (Get-Command python).Source
$env:PYTHONUTF8 = '1'
$env:MINIPY_MAX_MS = '60000'
$env:MINIPY_MAX_STEPS = '50000'
node _work/v41/runrepair.mjs MiniPy_v4.253.sb3 _work/v41/_closeout_v248_seed.json --shared
```

`verification.json` 保存版本摘要、每条附件复现的新旧结果、扩展用例结果、历史差异清单和压力项实测；不同套件有重叠，不相加计算通过率。
