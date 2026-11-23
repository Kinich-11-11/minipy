# MiniPy v4.249 修复尝试记录

日期：2026-11-22
基线：MiniPy_v4.248.sb3 / commit 9c317e0e
候选：MiniPy_v4.249g-candidate.sb3
状态：**未发布，不替换 v4.248**

## 本次改动

- `p790base.patch.txt`：尝试修复首次非法 `send(non-None)` 后首次 `next()` 的生成器入口恢复点。
- `p790g.patch.txt`：在异常注入后重新 tokenize 当前生成器恢复行，使 `throw()` 的 `except`/`yield` 分支能够继续执行。
- `p791_yf_throw.cjs`：尝试将 `yield from` 的 `throw()` 转发给委托生成器。
- `build249gdelta.cjs`：从 v4.247 重建 v4.248 补丁链，再叠加上述候选修复。

## 结构验证

`check41.cjs MiniPy_v4.249g-candidate.sb3`：通过，`total blocks=63120 errors=0`。

## 最小回归结果

| 用例 | v4.248 | v4.249g 候选 | 结论 |
|---|---:|---:|---|
| gen-L3-01 首次非法 send 后 next | FAIL | FAIL | 未修复 |
| gen-L3-02 挂起生成器 throw/catch/finally | FAIL | FAIL（分离式 throw 可运行，但原组合 Oracle 仍失败） | 未修复 |
| gen-L4-01 yield-from delegated throw | FAIL | FAIL | 未修复 |

候选在原 13 个非目标种子上得到 `10/13`：既有 dict view 快照差异与压力用例超时，也有 loop 压力超时；未发现本次生成器补丁导致的已知 PASS 回归，但由于 3 个目标用例仍失败，不能晋级为最新版。

## 关键诊断

1. `p790g` 证明：异常注入后重新 tokenize 可以让 handler 的 `yield recovered` 路径运行；但当调用方在同一表达式中继续对共享列表做 `append` 时，生成器 handler 的副作用仍会丢失，说明剩余问题在调用帧/对象别名或 fpop 恢复，而不是单纯 pc。
2. `p791` 依赖 P783 的异常恢复闭环；P783 仍无法稳定完成委托生成器的 throw 透传，因此不能单独合并。
3. 所有候选均保持 SB3 结构无 dangling block；候选文件是未发布实验产物。

## 发布决策

不覆盖 `MiniPy_v4.248.sb3`，不把候选标为 v4.249 正式版。下一修复轮次应优先追踪：

- `genResumeException783 -> calluser -> fpop` 的调用者帧恢复；
- 生成器恢复期间共享 list/object 的别名一致性；
- handler 选中后 `head/Tok/Kind/pc` 的同步；
- 修复后再次单独验证 `gen-L3-01`、`gen-L3-02`，再验证 `gen-L4-01`。
