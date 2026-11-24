# v4.256 构建与回归

此目录的构建器将增量转换成原生 Scratch 积木，写入基于 v4.255 的新 SB3。运行作品不需要 Node、Python 或扩展。本次固定基线提交为 `422aa404638ca45b2011b91db8d8e98b166646ec`，基线 SHA-256 为 `bedebd5a3acef2be2f7d285af826c60ed035ec21f825988d9e6242572992c2b8`，不匹配即停止构建。

## 快速复测

从仓库根目录运行。验证环境为 Node 22.19.0、stock `scratch-vm` 5.0.300 和 CPython 3.12.16。初次设置且尚无 VM 依赖时，可使用 `npm ci --prefix _work/vm5300` 安装仓库锁定的依赖。构建本身离线。

```powershell
# 重建根目录作品；第二条命令可单独检查 SB3 的积木结构。
node _work/v41/v256/build.cjs
node _work/v41/check41.cjs MiniPy_v4.256.sb3

# 只复测本次报告（旧版预期为 20/60，因存在差异，退出码为 1）。
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v256/report-r.json
node _work/v41/v253/replay.cjs MiniPy_v4.256.sb3 _work/v41/v256/report-r.json
node _work/v41/v253/replay.cjs MiniPy_v4.256.sb3 _work/v41/v256/edge-cases.json

# 完整发布校验。若 python 不指向 CPython 3.12，先将 MINIPY_PYTHON
# 设为所用 python.exe 的完整路径；不会覆盖根目录作品。
node _work/v41/v256/verify.cjs
```

`verify.cjs` 在 `local/` 独立重建、逐字节比较 SB3、检查资源内容和引用、非解释器角色、造型及积木图，然后复测以下程序。每个程序恢复相同的初始 VM 状态，由 `RUN` 广播执行；按作品每行 26 字符的显示约定比较完整输出。CPython 只用于独立核对预期输出，不是作品执行后端。输出逐项保存到 `local/*.log`，最后生成 `local/verification.json`；入库的 `verification.json` 是本次发布校验的结果。

| 套件 | 本次通过 / 总数 |
|---|---:|
| `report-r.json`：报告 R101～R160 | 60/60（原版 20/60） |
| `edge-cases.json`：新增边界 | 59/59 |
| v4.253 报告 / 边界 | 79/79、26/26 |
| v4.254 报告 / 边界 / Unicode 折叠程序 | 23/23、25/25、16/16 |
| v4.255 报告及隔离诊断 / Unicode 边界 | 4/4、52/52 |
| 历史归档（`v253/archive-suite.cjs`） | 547/557，10 项已知差异与 v4.255 完全相同 |

`make-edges.py` 使用 CPython 3.12 重新冻结边界测试；`check-oracles.py` 不改任何文件，核对这两组共 119 个程序的预期输出。旧版回归中的孤立代理码元以 JSON 转义保存；不要经可能把它们替换成 U+FFFD 的文本工具转换套件。

## 如何定位实现

- `runtime.js`、`protocols.js`：保留大整数低位的混合比较，复数与乘方；特殊方法分派、`NotImplemented`、属性异常及绑定方法。
- `sequences.js`、`lazy.js`：索引、键视图、切片与解包、闭包删除、上下文栈；为惰性迭代器保存子迭代器及回调，推导式在每次取值后立即执行本轮表达式。
- `hashing.js`、`frozen.js`：对象哈希与等值比较、不可哈希键、无序不可变集合。字符串等内置对象的具体哈希数值不承诺与 CPython 的进程随机哈希相同。
- `stdlib.js`、`modules.js`：数学参数、统计异常类型，以及逐项运行的 `accumulate`、`chain`、`reduce`。`heap.js` 通过比较及上浮、下沉维护最小堆，并写回原列表；`counter.js` 为计数器保存共享字典并实现报告中的多重集加法。

验收口径是报告和列明的回归用例，不代表完整的 CPython 兼容性，也不代表新模块中未列出的接口都已实现。
