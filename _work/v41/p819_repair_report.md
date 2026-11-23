# P819 修复与回归报告

日期：2026-11-22
正式版：`MiniPy_v4.248.sb3`（未修改）
候选版：`MiniPy_v4.249-p819-genL401-candidate.sb3`

## 修复目标

修复 `gen-L4-01 delegated throw order` 在 delegated generator `throw()` 后丢失 `sub-caught` 事件的问题，同时不破坏后续 `throw-return`、`finally` 和外层完成事件。

## 实现摘要

- 基于已验证的 P801 handled-throw 快速路径。
- P819 仅在 `genExceptionMeth783(..., close=0)` 的 `throw()` 路径缓存列表编码；`close()` 不进入该路径。
- 在最终 `palwrite` 前合并缓存的列表前缀与当前列表编码，而不是用旧快照覆盖当前列表，因此保留后续追加的 `('throw-return', 2)` 与 finally 事件。
- 未修改正式版 SB3。

## 验证结果

### 目标项

- `gen-L3-02 throw catch finally`: PASS
- `gen-L3-03 close GeneratorExit finally`: PASS
- `gen-L4-01 delegated throw order`: PASS

### 原有 smoke

- 10/10 PASS：with、closure、object、iterator、finally、eval、sort、genexp 等。

### 全量收尾种子

- 12/16 PASS
- 4 项保持已知失败/限制：
  - `gen-L3-01`: 首次 `send(non-None)` 后缺少首次启动副作用 `entered`；本轮未修复。
  - `dict-L3-01`: 当前实现是快照，不是 CPython 动态 dict view；XFAIL。
  - `stress-L5-01`: 500 键压力在 20 秒预算内未完成；XFAIL/性能风险。
  - `stress-L5-02`: 10000 次循环在 20 秒预算内未完成；XFAIL/Scratch 运行时风险。

### 结构检查

- `check41.cjs`: `errors=0`
- 总块数：63,148

## 发布建议

候选版可作为 P819 验证版交给用户验收；建议不要直接覆盖正式版。若要晋级，下一轮应单独处理 `gen-L3-01`，并明确 dict view 与压力项是否属于目标兼容承诺。
