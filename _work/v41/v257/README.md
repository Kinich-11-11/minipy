# MiniPy v4.257：比较分派与切片索引协议

本目录提供 v4.257 的可重建差分补丁、冻结测试和发布验证。基线是 GitHub `main` 上正式发布的 `MiniPy_v4.256.sb3`，提交 `0f8a3a13d43e3d01b3907a00036022fbfee5c570`，SHA-256 `1103f5dbcc6f58052f968815cc9e1f5a87e2a692ca60b140f37a8bdba74d8cb9`。`build.cjs` 在基线哈希不符时拒绝构建；作品本身不需要 Node、Python 或修改过的 Scratch VM。

## 重建与验证

从仓库根目录运行。验证环境：Node 22.19.0、stock `scratch-vm` 5.0.300、CPython 3.12.16。

```powershell
node _work/v41/v257/build.cjs
node _work/v41/check41.cjs MiniPy_v4.257.sb3

$env:MINIPY_PYTHON = 'C:\path\to\python.exe' # 指向 CPython 3.12
node _work/v41/v257/verify.cjs
```

完整验证会在 `local/` 中重建并逐字节比较 SB3，校验 ZIP 资源哈希 / 引用、非解释器角色、造型与积木结构，并在同一 Scratch VM 状态恢复机制下回放所有测试。CPython 仅用于独立核验测试预期，不是 MiniPy 的执行后端。日志和机器可读最终证据写入 `local/`；版本控制中的 `verification.json` 是本次发布记录。

## 结果摘要

| 检查 | 结果 |
|---|---:|
| 报告完整集合 | 基线 581/586；v4.257 **586/586** |
| MP-92 / MP-93 专项 S 套件 | 基线 25/30；v4.257 **30/30** |
| 新增边界（反向比较、`NotImplemented`、身份回退、异常、`__index__` 顺序、负向切片、嵌套及补充平面字符） | **76/76** |
| v4.253～v4.256 既有定向回归（含旧 Unicode 回归） | **284/284** |
| 历史归档 | 547/557；10 项差异与 v4.256 的失败名称完全相同 |

报告的 20 个计时压力程序也在完整 586 项中回放并核对输出；本轮不声明严格的时限性能基准。归档未实现/环境相关差异为 `os` 导入 1 项、日期时间格式化 5 项和函数表示 4 项。

## 文件

- `build.cjs`：从固定基线构建 v4.257。
- `compare.js`：MP-92 比较操作正向/反向分派及回退。
- `slices.js`：MP-93 切片边界转换、索引协议与切片引用语义。
- `report.json`：按报告附录源码对应的 586 个冻结输出；保留 Unicode / 代理项转义。
- `make-edges.py`、`edge-cases.json`：独立 CPython 3.12.16 边界预期的生成器与 76 个冻结用例。
- `verify.cjs`、`verification.json`：发布复现与证据。