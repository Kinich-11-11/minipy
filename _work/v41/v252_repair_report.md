# MiniPy v4.252 修复验收报告

- 日期：2026-11-23
- 基线：主目录 MiniPy_v4.251.sb3；正式基线 MiniPy_v4.250.sb3 保持不变。
- 候选/正式新版本：_work/v41/MiniPy_v4.252-candidate.sb3、_work/v41/MiniPy_v4.252.sb3
- 新版本 SHA-256：$h

## 结果

| 项目 | 结果 |
|---|---:|
| 结构检查 | 65,049 blocks / 0 errors |
| 生成器与字典目标 | 5/5 |
| 收尾回归 | 14/14 |
| M26、M53 | 2/2 |
| 500-key pressure | XFAIL：与 v4.251 同条件均在 60 秒内未完成 |
| loop-10000 pressure | PASS |

## 未修复项

MP-34–MP-46、MP-48–MP-57 及报告中对应差分仍保持原状态；其中 Unicode 源码限制、扩展语法解析和若干协议属于既有未实现能力，不在本轮候选中宣称已修复。
