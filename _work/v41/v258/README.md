# MiniPy v4.258：初始化 `__name__`

从 GitHub `main` 的正式 v4.257 增量构建。基线提交 `768dce19d6ee2fc02c114ace4516730c9b4387c7`，SHA-256 `dafb0f0089087c03febeaae0bb80462db450ca4e4b62486a8620caef8f7d5173`；构建器会核对基线哈希，不匹配即停止。MiniPy 作品本身不需要 Node、Python 或修改过的 Scratch VM。

## 构建与验证

从仓库根目录运行。验证环境：Node 22.19.0、stock `scratch-vm` 5.0.300、CPython 3.12.16。

```powershell
node _work/v41/v258/build.cjs
node _work/v41/check41.cjs MiniPy_v4.258.sb3

$env:MINIPY_PYTHON = 'C:\path\to\python.exe' # CPython 3.12
node _work/v41/v258/verify.cjs
```

完整验证会独立重建并逐字节比较作品，校验 ZIP 资源哈希 / 引用、积木结构、非解释器角色和造型；通过 `RUN` 广播在 stock Scratch VM 上执行测试。CPython 仅负责独立核对测试预期。机器可读的最终发布证据保存在 `verification.json`，逐项日志保存在被忽略的 `local/` 目录。

## 结果摘要

| 检查 | v4.257 | v4.258 |
|---|---:|---:|
| 新增 `__name__` 用例 | 1/9 | **9/9** |
| 同一 VM 连续独立运行并验证名称重置 | — | **通过** |
| v4.257 的报告全集 | 586/586 | **586/586** |
| v4.253～v4.257 既有定向回归 | — | **284/284** |
| 历史归档 | 547/557 | 547/557，失败项与前版相同 |

归档保留的 10 项旧差异为 `os` 导入 1 项、日期时间格式化 5 项和函数表示 4 项，不属于本次变更。`MiniPy_v4.258.sb3` 为 2,370,362 字节，SHA-256 `537e49cde6499ba2fb3b5d5035c50905adb8588b940bb4f6827a8c610b08fb33`，共 75,278 个积木，结构错误为零。