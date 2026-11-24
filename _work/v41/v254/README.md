# v4.254 构建与复测

在仓库根目录执行。构建使用 Node.js 和已入库的折叠表；作品运行时只用 Scratch 积木和项目数据，不依赖桌面 Python 或修改过的 VM。构建入口只接受 SHA-256 匹配的正式 v4.253 基线，且使用固定种子生成积木 ID。

```powershell
node _work/v41/v254/build.cjs
node _work/v41/check41.cjs MiniPy_v4.254.sb3
python _work/v41/v254/check-package.py MiniPy_v4.253.sb3 MiniPy_v4.254.sb3
```

`runtime.js` 区分需要操作数和只需要真假的求值场景；布尔表达式不会把谓词的结果当作左操作数。Unicode 折叠数据由 CPython 3.12 的 `str.casefold()` 遍历生成（Unicode Character Database 15.0.0）。`fold-15.0.txt` 每行是十六进制输入码点和完整目标序列；文件未列出的码点原样保留。为避免 Scratch 字符串比较忽略大小写，解释器使用精确造型名查询。这些私有名称共享一个已有资源，不替换原有造型或舞台字形。

## 发布回归

```powershell
node _work/v41/v253/replay.cjs MiniPy_v4.253.sb3 _work/v41/v254/report-o.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v254/report-o.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v254/edge-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v253/report-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v253/edge-cases.json
```

`report-o.json` 保存附件的全部 23 个 O 组程序及预期输出；第一条命令在原版理应报 5 项失败。`edge-cases.json` 的预期输出亦经 CPython 3.12 独立核对，覆盖身份、短路副作用与异常、条件和值的区别、容器别名以及不同文字系统的折叠。运行器是仓库原有的 scratch-vm 5.0.300 `RUN` 广播路径，每个用例恢复初始状态后比对输出。

## 字符全集与历史归档

以下 `python` 请指向 **CPython 3.12 / UCD 15.0.0**。`make-fold.py` 可选，用于重新生成入库的映射表；`fold-suite.py` 不读取映射表，独立生成测试程序和期望结果。

```powershell
New-Item -ItemType Directory -Force _work/v41/v254/local | Out-Null
python _work/v41/v254/make-fold.py
python _work/v41/v254/fold-suite.py _work/v41/v254/local/fold-suite.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v254/local/fold-suite.json
node _work/v41/v253/archive-suite.cjs _work/v41/v254/local/archive.json
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v254/local/archive.json
```

历史归档不是附件的 491 项套件。它有 10 项既有输出差异（未识别模块、时间、函数表示），因此退出码非零；`verification.json` 列出具体名称，可与 v4.253 的同名文件核对。`local/` 下的日志、探针与重建副本不入库。
